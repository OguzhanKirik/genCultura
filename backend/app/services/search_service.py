import time
import uuid
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.observation import Observation
from app.schemas.search import SearchHit, SearchResponse
from app.schemas.observation import ObservationSummary
from .embedding_service import embedding_service


class SearchService:
    async def semantic_search(
        self,
        db: AsyncSession,
        query: str,
        limit: int = 10,
        min_similarity: float = 0.70,
        crop_type: str | None = None,
        category: str | None = None,
        zone_id: str | None = None,
    ) -> SearchResponse:
        t0 = time.monotonic()
        query_vector = await embedding_service.embed(query)
        embed_ms = int((time.monotonic() - t0) * 1000)

        t1 = time.monotonic()
        # cosine_distance = 1 - cosine_similarity; filter by max distance
        max_distance = 1.0 - min_similarity

        stmt = (
            select(
                Observation,
                (1 - Observation.embedding.cosine_distance(query_vector)).label("similarity"),
            )
            .where(
                Observation.is_deleted.is_(False),
                Observation.embedding.is_not(None),
                Observation.embedding.cosine_distance(query_vector) <= max_distance,
            )
            .order_by(Observation.embedding.cosine_distance(query_vector))
            .limit(limit)
        )

        if crop_type:
            stmt = stmt.where(Observation.crop_type == crop_type)
        if category:
            stmt = stmt.where(Observation.category == category)
        if zone_id:
            stmt = stmt.where(Observation.zone_id == zone_id)

        result = await db.execute(stmt)
        rows = result.all()
        search_ms = int((time.monotonic() - t1) * 1000)

        hits = [
            SearchHit(
                observation=ObservationSummary.model_validate(row.Observation),
                similarity=float(row.similarity),
            )
            for row in rows
        ]

        return SearchResponse(
            results=hits,
            query=query,
            total=len(hits),
            query_embedding_ms=embed_ms,
            search_ms=search_ms,
        )

    async def find_similar(
        self,
        db: AsyncSession,
        observation_id: uuid.UUID,
        limit: int = 5,
    ) -> list[ObservationSummary]:
        obs = await db.get(Observation, observation_id)
        if obs is None or obs.embedding is None:
            return []

        stmt = (
            select(Observation)
            .where(
                Observation.is_deleted.is_(False),
                Observation.embedding.is_not(None),
                Observation.id != observation_id,
            )
            .order_by(Observation.embedding.cosine_distance(obs.embedding))
            .limit(limit)
        )
        result = await db.execute(stmt)
        return [ObservationSummary.model_validate(o) for o in result.scalars()]


search_service = SearchService()
