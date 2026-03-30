from datetime import datetime
from sqlalchemy import String, Numeric, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


# Reserved for sensor pipeline; not populated in MVP.
# When ready: SELECT create_hypertable('sensor_readings', 'time');
class SensorReading(Base):
    __tablename__ = "sensor_readings"

    # Composite primary key (time + zone + metric) for TimescaleDB compatibility
    time: Mapped[datetime] = mapped_column(DateTime(timezone=True), primary_key=True)
    zone_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    metric: Mapped[str] = mapped_column(String(64), primary_key=True)
    value: Mapped[float] = mapped_column(Numeric(10, 4), nullable=False)
