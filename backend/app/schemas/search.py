from pydantic import BaseModel
from .observation import ObservationSummary


class SearchHit(BaseModel):
    observation: ObservationSummary
    similarity: float


class SearchResponse(BaseModel):
    results: list[SearchHit]
    query: str
    total: int
    query_embedding_ms: int
    search_ms: int
