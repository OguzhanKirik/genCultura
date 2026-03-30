import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Text, Boolean, DateTime, SmallInteger, Numeric, Integer, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from pgvector.sqlalchemy import Vector
from app.database import Base
from app.config import get_settings

settings = get_settings()


class Observation(Base):
    __tablename__ = "observations"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    author_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)

    # Core content
    body: Mapped[str] = mapped_column(Text, nullable=False)
    body_enriched: Mapped[str | None] = mapped_column(Text, nullable=True)
    embedding: Mapped[list[float] | None] = mapped_column(
        Vector(settings.embedding_dimensions), nullable=True
    )
    needs_embedding: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    # Structured context tags
    crop_type: Mapped[str | None] = mapped_column(String(64), nullable=True)
    growth_stage: Mapped[str | None] = mapped_column(String(64), nullable=True)
    zone_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    category: Mapped[str | None] = mapped_column(String(64), nullable=True)
    severity: Mapped[int | None] = mapped_column(SmallInteger, nullable=True)

    # Environmental snapshot at time of observation
    temp_c: Mapped[float | None] = mapped_column(Numeric(5, 2), nullable=True)
    humidity_pct: Mapped[float | None] = mapped_column(Numeric(5, 2), nullable=True)
    co2_ppm: Mapped[int | None] = mapped_column(Integer, nullable=True)
    light_klux: Mapped[float | None] = mapped_column(Numeric(6, 2), nullable=True)

    # Lifecycle
    observed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
    is_deleted: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    author: Mapped["User"] = relationship(back_populates="observations")
    media_attachments: Mapped[list["MediaAttachment"]] = relationship(
        back_populates="observation", cascade="all, delete-orphan"
    )
