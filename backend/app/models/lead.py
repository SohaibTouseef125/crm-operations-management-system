from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, Enum as SQLAlchemyEnum, ForeignKey, Text, Date, DateTime, Numeric, JSON, func
from app.models.base import Base, IDMixin, TimestampMixin
import enum
from typing import Optional, List
import uuid
from datetime import datetime

class LeadStage(str, enum.Enum):
    DISCOVERY = "discovery"
    OUTREACH = "outreach"
    QUOTATION_REQUESTED = "quotation_requested"
    QUOTATION_FORWARDED = "quotation_forwarded"
    IN_NEGOTIATION = "in-negotiation"
    WON = "won"
    LOST = "lost"

# Valid forward transitions for lead stages
LEAD_STAGE_TRANSITIONS: dict[str, list[str]] = {
    "discovery": ["outreach", "lost"],
    "outreach": ["quotation_requested", "lost"],
    "quotation_requested": ["quotation_forwarded", "lost"],
    "quotation_forwarded": ["in-negotiation", "won", "lost"],
    "in-negotiation": ["won", "lost"],
    "won": [],
    "lost": ["discovery"],
}

class LeadActivityType(str, enum.Enum):
    FOLLOW_UP = "FOLLOW_UP"
    MEETING = "MEETING"
    FARM_VISIT = "FARM_VISIT"

class Lead(Base, IDMixin, TimestampMixin):
    __tablename__ = "leads"

    # CRM assignment (mandatory per spec)
    assigned_to_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)

    assigned_to: Mapped["User"] = relationship("User", foreign_keys=[assigned_to_id])

    # Basic contact fields (spec: contact_mobile mandatory)
    name: Mapped[str] = mapped_column(String, nullable=False)
    contact_mobile: Mapped[str] = mapped_column(String, nullable=False)
    company_name: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    email: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    phone: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    location: Mapped[str] = mapped_column(String, nullable=False)
    address: Mapped[Optional[str]] = mapped_column(String, nullable=True)

    # Lead pipeline fields
    stage: Mapped[LeadStage] = mapped_column(SQLAlchemyEnum(LeadStage, validate_strings=False, values_callable=lambda x: [e.value for e in x]), default=LeadStage.DISCOVERY, nullable=False)
    next_follow_up: Mapped[Optional[Date]] = mapped_column(Date, nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    notes_log: Mapped[Optional[JSON]] = mapped_column(JSON, nullable=True)

    # Service interest (spec: services_interested with strict list)
    services_interested: Mapped[Optional[list[str]]] = mapped_column(JSON, nullable=True)
    other_services: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Quotation handover fields
    quotation_file_url: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    quotation_requested_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    quotation_uploaded_by: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("users.id"), nullable=True)

    client_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("clients.id"), nullable=True)

    client: Mapped[Optional["Client"]] = relationship(back_populates="leads")
    activities: Mapped[List["LeadActivity"]] = relationship(back_populates="lead", cascade="all, delete-orphan", lazy="selectin")


class LeadActivity(Base, IDMixin, TimestampMixin):
    __tablename__ = "lead_activities"

    lead_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("leads.id"), nullable=False, index=True)
    activity_type: Mapped[LeadActivityType] = mapped_column(SQLAlchemyEnum(LeadActivityType), nullable=False)
    scheduled_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_by_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)

    lead: Mapped["Lead"] = relationship(back_populates="activities")
    created_by: Mapped["User"] = relationship("User")
