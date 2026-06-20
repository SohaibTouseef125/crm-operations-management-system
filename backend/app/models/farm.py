from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, Float, Text, Date, JSON, ForeignKey, Enum as SQLAlchemyEnum
from app.models.base import Base, IDMixin, TimestampMixin
from datetime import date
from typing import TYPE_CHECKING, Optional
import enum
import uuid

if TYPE_CHECKING:
    from app.models.farmer import Farmer

class OwnershipType(str, enum.Enum):
    OWNER = "owner"
    TENANT = "tenant"
    SHARECROPPER = "sharecropper"

class WaterSource(str, enum.Enum):
    CANAL = "canal"
    TUBEWELL = "tubewell"
    RAIN = "rain"
    BOTH = "both"

class SoilType(str, enum.Enum):
    CLAY_LOAM = "clay_loam"
    SANDY = "sandy"
    SILT_LOAM = "silt_loam"
    LOAM = "loam"
    CLAY = "clay"
    OTHER = "other"

class Farm(Base, IDMixin, TimestampMixin):
    __tablename__ = "farms"

    farmer_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("farmers.id"), nullable=False, index=True)

    farm_name: Mapped[str] = mapped_column(String, nullable=False)
    total_acreage: Mapped[float] = mapped_column(Float, nullable=False)
    location_address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # GPS coordinates (spec: separate lat/lng)
    gps_lat: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    gps_lng: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    # Farm characteristics (spec)
    ownership_type: Mapped[Optional[OwnershipType]] = mapped_column(SQLAlchemyEnum(OwnershipType), nullable=True)
    water_source: Mapped[Optional[WaterSource]] = mapped_column(SQLAlchemyEnum(WaterSource), nullable=True)
    soil_type: Mapped[Optional[SoilType]] = mapped_column(SQLAlchemyEnum(SoilType), nullable=True)
    primary_crop: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    secondary_crop: Mapped[Optional[str]] = mapped_column(String, nullable=True)

    # Legacy / additional
    crop_types: Mapped[Optional[list[str]]] = mapped_column(JSON, nullable=True)

    # Contract Info
    contract_start_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    contract_end_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    services_active: Mapped[Optional[list[str]]] = mapped_column(JSON, nullable=True)

    # Relationships
    farmer: Mapped["Farmer"] = relationship("Farmer", back_populates="farms")
