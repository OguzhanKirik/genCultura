from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.search import SearchResponse
from app.services.search_service import search_service

router = APIRouter()


@router.get("", response_model=SearchResponse)
async def semantic_search(
    q: str,
    limit: int = 10,
    min_similarity: float = 0.70,
    crop_type: str | None = None,
    category: str | None = None,
    zone_id: str | None = None,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return await search_service.semantic_search(
        db=db,
        query=q,
        limit=min(limit, 50),
        min_similarity=min_similarity,
        crop_type=crop_type,
        category=category,
        zone_id=zone_id,
    )
