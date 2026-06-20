from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, Text, Date, JSON, Float, ForeignKey, Enum as SQLAlchemyEnum
from app.models.base import Base, IDMixin, TimestampMixin
from datetime import date
from typing import TYPE_CHECKING, Optional
import enum
import uuid

if TYPE_CHECKING:
    from app.models.farm import Farm

class PipelineStage(str, enum.Enum):
    PROSPECT = "prospect"
    ACTIVE = "active"
    INACTIVE = "inactive"

class Farmer(Base, IDMixin, TimestampMixin):
    __tablename__ = "farmers"

    @property
    def assigned_agent_name(self) -> Optional[str]:
        return self.assigned_agent.full_name if self.assigned_agent else None

    name: Mapped[str] = mapped_column(String, nullable=False)
    contact_mobile: Mapped[str] = mapped_column(String, nullable=False)
    phone_whatsapp: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    email: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    cnic: Mapped[Optional[str]] = mapped_column(String(15), nullable=True)
    address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    village: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    tehsil: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    district: Mapped[Optional[str]] = mapped_column(String, nullable=True)

    # CRM
    assigned_agent_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("users.id"), nullable=True)
    pipeline_stage: Mapped[PipelineStage] = mapped_column(SQLAlchemyEnum(PipelineStage), default=PipelineStage.PROSPECT, nullable=False)
    lead_source: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    tags: Mapped[Optional[list[str]]] = mapped_column(JSON, nullable=True)

    # Financial Overview (Aggregation)
    total_credit_limit: Mapped[float] = mapped_column(Float, default=0.0)
    total_contract_value: Mapped[float] = mapped_column(Float, default=0.0)
    outstanding_balance: Mapped[float] = mapped_column(Float, default=0.0)

    # Relationships
    assigned_agent: Mapped[Optional["User"]] = relationship("User", foreign_keys=[assigned_agent_id])
    farms: Mapped[list["Farm"]] = relationship("Farm", back_populates="farmer", cascade="all, delete-orphan")
