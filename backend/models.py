"""AgriPilot AI - SQLAlchemy ORM models (PostgreSQL).

Tables: Farm, Field, Crop, Resource, Task, WeatherForecast.
"""

import enum
from datetime import date, datetime

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base


# --------------------------------------------------------------------------- #
# Enums
# --------------------------------------------------------------------------- #
class ResourceType(str, enum.Enum):
    TRACTOR = "tractor"
    PUMP = "pump"
    LABOR = "labor"


class TaskStatus(str, enum.Enum):
    PLANNED = "planned"
    SCHEDULED = "scheduled"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    BLOCKED = "blocked"


# --------------------------------------------------------------------------- #
# Models
# --------------------------------------------------------------------------- #
class Farm(Base):
    __tablename__ = "farms"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    farmer_id: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    state: Mapped[str] = mapped_column(String(120), nullable=False)
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    area_hectares: Mapped[float] = mapped_column(Float, nullable=False)
    soil_type: Mapped[str | None] = mapped_column(String(80))
    irrigation_method: Mapped[str | None] = mapped_column(String(80))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    fields: Mapped[list["Field"]] = relationship(
        back_populates="farm", cascade="all, delete-orphan"
    )
    resources: Mapped[list["Resource"]] = relationship(
        back_populates="farm", cascade="all, delete-orphan"
    )
    tasks: Mapped[list["Task"]] = relationship(
        back_populates="farm", cascade="all, delete-orphan"
    )
    weather_forecasts: Mapped[list["WeatherForecast"]] = relationship(
        back_populates="farm", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:  # pragma: no cover
        return f"<Farm id={self.id} name={self.name!r} state={self.state!r}>"


class Field(Base):
    __tablename__ = "fields"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    farm_id: Mapped[int] = mapped_column(
        ForeignKey("farms.id", ondelete="CASCADE"), index=True, nullable=False
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    area_hectares: Mapped[float] = mapped_column(Float, nullable=False)
    soil_moisture: Mapped[float | None] = mapped_column(Float)  # percentage 0-100
    last_irrigation_date: Mapped[date | None] = mapped_column(Date)

    farm: Mapped["Farm"] = relationship(back_populates="fields")
    crops: Mapped[list["Crop"]] = relationship(
        back_populates="field", cascade="all, delete-orphan"
    )
    tasks: Mapped[list["Task"]] = relationship(back_populates="field")

    def __repr__(self) -> str:  # pragma: no cover
        return f"<Field id={self.id} name={self.name!r} farm_id={self.farm_id}>"


class Crop(Base):
    __tablename__ = "crops"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    field_id: Mapped[int] = mapped_column(
        ForeignKey("fields.id", ondelete="CASCADE"), index=True, nullable=False
    )
    crop_type: Mapped[str] = mapped_column(String(120), nullable=False)
    sowing_date: Mapped[date] = mapped_column(Date, nullable=False)
    growth_stage: Mapped[str | None] = mapped_column(String(80))
    ndvi_value: Mapped[float | None] = mapped_column(Float)  # 0.0 - 1.0 vegetation index
    health_status: Mapped[str] = mapped_column(String(40), default="healthy", nullable=False)

    field: Mapped["Field"] = relationship(back_populates="crops")

    def __repr__(self) -> str:  # pragma: no cover
        return f"<Crop id={self.id} type={self.crop_type!r} field_id={self.field_id}>"


class Resource(Base):
    __tablename__ = "resources"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    farm_id: Mapped[int] = mapped_column(
        ForeignKey("farms.id", ondelete="CASCADE"), index=True, nullable=False
    )
    resource_type: Mapped[ResourceType] = mapped_column(
        Enum(ResourceType, name="resource_type", values_callable=lambda e: [m.value for m in e]),
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    availability_status: Mapped[str] = mapped_column(
        String(40), default="available", nullable=False
    )  # available / in_use / maintenance
    hourly_cost: Mapped[float | None] = mapped_column(Float)

    farm: Mapped["Farm"] = relationship(back_populates="resources")

    def __repr__(self) -> str:  # pragma: no cover
        return f"<Resource id={self.id} type={self.resource_type} name={self.name!r}>"


class Task(Base):
    __tablename__ = "tasks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    farm_id: Mapped[int] = mapped_column(
        ForeignKey("farms.id", ondelete="CASCADE"), index=True, nullable=False
    )
    field_id: Mapped[int | None] = mapped_column(
        ForeignKey("fields.id", ondelete="SET NULL"), index=True
    )
    task_type: Mapped[str] = mapped_column(String(120), nullable=False)  # e.g. irrigation, spraying
    priority: Mapped[int] = mapped_column(Integer, nullable=False, default=5)
    status: Mapped[TaskStatus] = mapped_column(
        Enum(TaskStatus, name="task_status", values_callable=lambda e: [m.value for m in e]),
        default=TaskStatus.PLANNED,
        nullable=False,
        index=True,
    )
    scheduled_start: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    scheduled_end: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    duration_minutes: Mapped[int | None] = mapped_column(Integer)
    required_resources: Mapped[dict | None] = mapped_column(JSONB)  # e.g. {"tractor": 1, "labor": 2}
    weather_dependent: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    __table_args__ = (
        CheckConstraint("priority >= 1 AND priority <= 10", name="ck_task_priority_range"),
    )

    farm: Mapped["Farm"] = relationship(back_populates="tasks")
    field: Mapped["Field | None"] = relationship(back_populates="tasks")

    def __repr__(self) -> str:  # pragma: no cover
        return f"<Task id={self.id} type={self.task_type!r} priority={self.priority} status={self.status}>"


class WeatherForecast(Base):
    __tablename__ = "weather_forecasts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    farm_id: Mapped[int] = mapped_column(
        ForeignKey("farms.id", ondelete="CASCADE"), index=True, nullable=False
    )
    forecast_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True, nullable=False)
    rainfall_probability: Mapped[float | None] = mapped_column(Float)  # 0.0 - 1.0
    rainfall_amount: Mapped[float | None] = mapped_column(Float)       # millimetres
    temperature: Mapped[float | None] = mapped_column(Float)           # celsius

    farm: Mapped["Farm"] = relationship(back_populates="weather_forecasts")

    def __repr__(self) -> str:  # pragma: no cover
        return f"<WeatherForecast id={self.id} farm_id={self.farm_id} at={self.forecast_time}>"
