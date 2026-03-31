import uuid
import math
from datetime import datetime, timezone
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, UploadFile, File, Form
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.dependencies import get_current_user
from app.models.observation import Observation
from app.models.media import MediaAttachment
from app.models.user import User
from app.schemas.observation import (
    ObservationCreate, ObservationUpdate, ObservationDetail,
    ObservationSummary, PaginatedObservations,
)
from app.schemas.media import MediaAttachmentSchema
from app.schemas.search import SearchResponse
from app.services.embedding_service import embedding_service
from app.services.llm_service import llm_service
from app.services.search_service import search_service
from app.services.storage_service import storage_service
from app.config import get_settings

settings = get_settings()

_ENRICH_SYSTEM = """You are an expert agronomist and crop protection specialist for greenhouse operations.
Analyze the observation from a field worker and respond with a concise assessment using this structure:

**Diagnosis:** What is most likely happening and why.
**Confidence:** High / Medium / Low — and why.
**Immediate actions:** Specific steps to take right now.
**Watch for:** Signs that would change the diagnosis.

If photos are provided, describe what you see in them. Be practical and specific."""

router = APIRouter()


async def _generate_embedding(observation_id: uuid.UUID, body: str) -> None:
    """Background task: embed observation body and persist."""
    from app.database import AsyncSessionLocal
    async with AsyncSessionLocal() as db:
        obs = await db.get(Observation, observation_id)
        if obs is None:
            return
        try:
            vector = await embedding_service.embed(body)
            obs.embedding = vector
            obs.needs_embedding = False
            await db.commit()
        except Exception:
            # Fail silently — observation is still usable; embedding retried by sweep
            pass


@router.get("", response_model=PaginatedObservations)
async def list_observations(
    page: int = 1,
    page_size: int = 20,
    crop_type: str | None = None,
    category: str | None = None,
    zone_id: str | None = None,
    author_id: uuid.UUID | None = None,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    stmt = select(Observation).where(Observation.is_deleted.is_(False))

    if crop_type:
        stmt = stmt.where(Observation.crop_type == crop_type)
    if category:
        stmt = stmt.where(Observation.category == category)
    if zone_id:
        stmt = stmt.where(Observation.zone_id == zone_id)
    if author_id:
        stmt = stmt.where(Observation.author_id == author_id)
    if date_from:
        stmt = stmt.where(Observation.observed_at >= date_from)
    if date_to:
        stmt = stmt.where(Observation.observed_at <= date_to)

    total_result = await db.execute(select(func.count()).select_from(stmt.subquery()))
    total = total_result.scalar_one()

    stmt = stmt.order_by(Observation.observed_at.desc())
    stmt = stmt.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(stmt)
    items = [ObservationSummary.model_validate(o) for o in result.scalars()]

    return PaginatedObservations(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        pages=math.ceil(total / page_size) if total else 0,
    )


@router.post("", response_model=ObservationDetail, status_code=status.HTTP_201_CREATED)
async def create_observation(
    body: ObservationCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    obs = Observation(
        author_id=current_user.id,
        body=body.body,
        crop_type=body.crop_type,
        growth_stage=body.growth_stage,
        zone_id=body.zone_id,
        category=body.category,
        severity=body.severity,
        temp_c=body.temp_c,
        humidity_pct=body.humidity_pct,
        co2_ppm=body.co2_ppm,
        light_klux=body.light_klux,
        observed_at=body.observed_at or datetime.now(timezone.utc),
    )
    db.add(obs)
    await db.flush()  # get obs.id before commit

    # Non-blocking: observation is immediately visible; embedding arrives shortly after
    background_tasks.add_task(_generate_embedding, obs.id, obs.body)

    await db.commit()
    await db.refresh(obs, ["author", "media_attachments"])
    return ObservationDetail.model_validate(obs)


@router.get("/{observation_id}", response_model=ObservationDetail)
async def get_observation(
    observation_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    stmt = (
        select(Observation)
        .where(Observation.id == observation_id, Observation.is_deleted.is_(False))
        .options(selectinload(Observation.author), selectinload(Observation.media_attachments))
    )
    result = await db.execute(stmt)
    obs = result.scalar_one_or_none()
    if obs is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Observation not found")
    return ObservationDetail.model_validate(obs)


@router.patch("/{observation_id}", response_model=ObservationDetail)
async def update_observation(
    observation_id: uuid.UUID,
    body: ObservationUpdate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    obs = await db.get(Observation, observation_id)
    if obs is None or obs.is_deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Observation not found")
    if obs.author_id != current_user.id and current_user.role not in ("manager", "admin"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot edit others' observations")

    body_changed = False
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(obs, field, value)
        if field == "body":
            body_changed = True

    if body_changed:
        obs.needs_embedding = True
        background_tasks.add_task(_generate_embedding, obs.id, obs.body)

    await db.commit()
    await db.refresh(obs, ["author", "media_attachments"])
    return ObservationDetail.model_validate(obs)


@router.delete("/{observation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_observation(
    observation_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    obs = await db.get(Observation, observation_id)
    if obs is None or obs.is_deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Observation not found")
    if obs.author_id != current_user.id and current_user.role not in ("manager", "admin"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot delete others' observations")
    obs.is_deleted = True
    await db.commit()


@router.get("/{observation_id}/similar", response_model=list[ObservationSummary])
async def similar_observations(
    observation_id: uuid.UUID,
    limit: int = 5,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return await search_service.find_similar(db, observation_id, limit=limit)


@router.post("/{observation_id}/enrich", response_model=ObservationDetail)
async def enrich_observation(
    observation_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Run VLM analysis on an observation (text + any attached images) and save the result."""
    stmt = (
        select(Observation)
        .where(Observation.id == observation_id, Observation.is_deleted.is_(False))
        .options(selectinload(Observation.author), selectinload(Observation.media_attachments))
    )
    obs = (await db.execute(stmt)).scalar_one_or_none()
    if obs is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Observation not found")

    # Build user prompt from structured fields
    parts = [f"Observation: {obs.body}"]
    if obs.crop_type:    parts.append(f"Crop: {obs.crop_type}")
    if obs.growth_stage: parts.append(f"Growth stage: {obs.growth_stage}")
    if obs.category:     parts.append(f"Category: {obs.category}")
    if obs.severity:     parts.append(f"Severity reported by worker: {obs.severity}/5")
    if obs.temp_c:       parts.append(f"Temperature: {obs.temp_c}°C")
    if obs.humidity_pct: parts.append(f"Humidity: {obs.humidity_pct}%")
    user_text = "\n".join(parts)

    # Collect image paths from local storage
    image_paths = [
        Path(settings.media_dir) / m.storage_path
        for m in obs.media_attachments
        if m.media_type == "image"
    ]

    try:
        if image_paths:
            enriched = await llm_service.complete_with_images(_ENRICH_SYSTEM, user_text, image_paths)
        else:
            enriched = await llm_service.complete(_ENRICH_SYSTEM, user_text)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"LLM unavailable — is the Colab notebook running? ({exc})",
        )

    obs.body_enriched = enriched
    await db.commit()
    await db.refresh(obs, ["author", "media_attachments"])
    return ObservationDetail.model_validate(obs)


@router.post(
    "/{observation_id}/media",
    response_model=MediaAttachmentSchema,
    status_code=status.HTTP_201_CREATED,
)
async def upload_media(
    observation_id: uuid.UUID,
    file: UploadFile = File(...),
    media_type: str = Form(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    obs = await db.get(Observation, observation_id)
    if obs is None or obs.is_deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Observation not found")
    if obs.author_id != current_user.id and current_user.role not in ("manager", "admin"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    path, size = await storage_service.save(file, subfolder=str(observation_id))
    attachment = MediaAttachment(
        observation_id=observation_id,
        media_type=media_type,
        storage_path=path,
        original_name=file.filename,
        size_bytes=size,
    )
    db.add(attachment)
    await db.commit()
    await db.refresh(attachment)
    return MediaAttachmentSchema.model_validate(attachment)


@router.delete(
    "/{observation_id}/media/{media_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_media(
    observation_id: uuid.UUID,
    media_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    attachment = await db.get(MediaAttachment, media_id)
    if attachment is None or attachment.observation_id != observation_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Media not found")

    obs = await db.get(Observation, observation_id)
    if obs.author_id != current_user.id and current_user.role not in ("manager", "admin"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    await storage_service.delete(attachment.storage_path)
    await db.delete(attachment)
    await db.commit()
