import uuid
from datetime import datetime
from typing import Literal
from pydantic import BaseModel, Field
from .user import UserSchema
from .media import MediaAttachmentSchema

Category = Literal["pest", "disease", "nutrition", "environment", "general"]
GrowthStage = Literal["seedling", "vegetative", "flowering", "fruiting", "harvest"]


class ObservationCreate(BaseModel):
    body: str = Field(..., min_length=1)
    crop_type: str | None = None
    growth_stage: GrowthStage | None = None
    zone_id: str | None = None
    category: Category | None = None
    severity: int | None = Field(None, ge=1, le=5)
    # Environmental snapshot
    temp_c: float | None = None
    humidity_pct: float | None = Field(None, ge=0, le=100)
    co2_ppm: int | None = None
    light_klux: float | None = None
    observed_at: datetime | None = None


class ObservationUpdate(BaseModel):
    body: str | None = Field(None, min_length=1)
    crop_type: str | None = None
    growth_stage: GrowthStage | None = None
    zone_id: str | None = None
    category: Category | None = None
    severity: int | None = Field(None, ge=1, le=5)
    temp_c: float | None = None
    humidity_pct: float | None = Field(None, ge=0, le=100)
    co2_ppm: int | None = None
    light_klux: float | None = None


class ObservationSummary(BaseModel):
    id: uuid.UUID
    author_id: uuid.UUID
    body: str
    crop_type: str | None
    growth_stage: str | None
    zone_id: str | None
    category: str | None
    severity: int | None
    observed_at: datetime
    needs_embedding: bool

    model_config = {"from_attributes": True}


class ObservationDetail(ObservationSummary):
    body_enriched: str | None
    temp_c: float | None
    humidity_pct: float | None
    co2_ppm: int | None
    light_klux: float | None
    created_at: datetime
    updated_at: datetime
    author: UserSchema
    media_attachments: list[MediaAttachmentSchema]

    model_config = {"from_attributes": True}


class PaginatedObservations(BaseModel):
    items: list[ObservationSummary]
    total: int
    page: int
    page_size: int
    pages: int
