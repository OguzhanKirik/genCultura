"""initial schema

Revision ID: 0001
Revises:
Create Date: 2026-03-30
"""
from alembic import op
import sqlalchemy as sa
from pgvector.sqlalchemy import Vector

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None

# ── IMPORTANT: if you change the embedding model, update this constant, ──────
# ── set EMBEDDING_DIMENSIONS in .env to match, then:                    ──────
# ──   alembic downgrade base && alembic upgrade head                    ──────
# ──
# ── Common dims:  OpenAI text-embedding-3-small → 1536                  ──────
# ──               nomic-ai/nomic-embed-text-v1.5 → 768                  ──────
# ──               BAAI/bge-small-en-v1.5         → 384                  ──────
EMBEDDING_DIMS = 1536


def upgrade() -> None:
    # Enable pgvector extension
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    # ── users ────────────────────────────────────────────────────────────────
    op.create_table(
        "users",
        sa.Column("id", sa.UUID(), nullable=False, server_default=sa.text("gen_random_uuid()")),
        sa.Column("email", sa.String(), nullable=False),
        sa.Column("full_name", sa.String(), nullable=False),
        sa.Column("role", sa.String(), nullable=False, server_default="grower"),
        sa.Column("hashed_pw", sa.String(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email"),
    )

    # ── observations ─────────────────────────────────────────────────────────
    op.create_table(
        "observations",
        sa.Column("id", sa.UUID(), nullable=False, server_default=sa.text("gen_random_uuid()")),
        sa.Column("author_id", sa.UUID(), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("body_enriched", sa.Text(), nullable=True),
        sa.Column("embedding", Vector(EMBEDDING_DIMS), nullable=True),
        sa.Column("needs_embedding", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("crop_type", sa.String(64), nullable=True),
        sa.Column("growth_stage", sa.String(64), nullable=True),
        sa.Column("zone_id", sa.String(64), nullable=True),
        sa.Column("category", sa.String(64), nullable=True),
        sa.Column("severity", sa.SmallInteger(), nullable=True),
        sa.Column("temp_c", sa.Numeric(5, 2), nullable=True),
        sa.Column("humidity_pct", sa.Numeric(5, 2), nullable=True),
        sa.Column("co2_ppm", sa.Integer(), nullable=True),
        sa.Column("light_klux", sa.Numeric(6, 2), nullable=True),
        sa.Column("observed_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default="false"),
        sa.ForeignKeyConstraint(["author_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_observations_author", "observations", ["author_id"])
    op.create_index("idx_observations_category", "observations", ["category"])
    op.create_index("idx_observations_crop", "observations", ["crop_type"])
    op.create_index("idx_observations_observed", "observations", ["observed_at"])

    # HNSW index — works without pre-existing data (unlike ivfflat which needs ~500+ rows)
    # When dataset grows large, consider replacing with ivfflat for better query performance
    op.execute(
        "CREATE INDEX idx_observations_embedding ON observations "
        "USING hnsw (embedding vector_cosine_ops)"
    )

    # ── media_attachments ────────────────────────────────────────────────────
    op.create_table(
        "media_attachments",
        sa.Column("id", sa.UUID(), nullable=False, server_default=sa.text("gen_random_uuid()")),
        sa.Column("observation_id", sa.UUID(), nullable=False),
        sa.Column("media_type", sa.String(16), nullable=False),
        sa.Column("storage_path", sa.String(), nullable=False),
        sa.Column("original_name", sa.String(), nullable=True),
        sa.Column("size_bytes", sa.BigInteger(), nullable=True),
        sa.Column("transcription", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
        sa.ForeignKeyConstraint(["observation_id"], ["observations.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_media_observation", "media_attachments", ["observation_id"])

    # ── sensor_readings (reserved — not populated in MVP) ────────────────────
    op.create_table(
        "sensor_readings",
        sa.Column("time", sa.DateTime(timezone=True), nullable=False),
        sa.Column("zone_id", sa.String(64), nullable=False),
        sa.Column("metric", sa.String(64), nullable=False),
        sa.Column("value", sa.Numeric(10, 4), nullable=False),
        sa.PrimaryKeyConstraint("time", "zone_id", "metric"),
    )
    op.create_index("idx_sensor_zone_time", "sensor_readings", ["zone_id", "time"])
    # When ready for TimescaleDB: SELECT create_hypertable('sensor_readings', 'time');


def downgrade() -> None:
    op.drop_table("sensor_readings")
    op.drop_table("media_attachments")
    op.drop_index("idx_observations_embedding", table_name="observations")
    op.drop_table("observations")
    op.drop_table("users")
    op.execute("DROP EXTENSION IF EXISTS vector")
