import uuid
from datetime import datetime
from pydantic import BaseModel


class MediaAttachmentSchema(BaseModel):
    id: uuid.UUID
    observation_id: uuid.UUID
    media_type: str
    storage_path: str
    original_name: str | None
    size_bytes: int | None
    transcription: str | None
    created_at: datetime

    model_config = {"from_attributes": True}
