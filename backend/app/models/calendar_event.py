from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, Text, Date, ForeignKey, Enum as SQLAlchemyEnum, Boolean
from app.models.base import Base, IDMixin, TimestampMixin
from datetime import date
from typing import Optional, TYPE_CHECKING
import enum
import uuid

if TYPE_CHECKING:
    from app.models.client import Client
    from app.models.farmer import Farmer
    from app.models.user import User

class CalendarEventStatus(str, enum.Enum):
    SCHEDULED = "SCHEDULED"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"

class CalendarEventType(str, enum.Enum):
    FIELD_VISIT = "FIELD_VISIT"
    REPORTING = "REPORTING"
    QA = "QA"
    FOLLOW_UP = "FOLLOW_UP"
    MEETING = "MEETING"

class CalendarEvent(Base, IDMixin, TimestampMixin):
    __tablename__ = "calendar_events"

    title: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    event_type: Mapped[CalendarEventType] = mapped_column(SQLAlchemyEnum(CalendarEventType), default=CalendarEventType.FIELD_VISIT, nullable=False)
    event_date: Mapped[date] = mapped_column(Date, nullable=False)
    status: Mapped[CalendarEventStatus] = mapped_column(SQLAlchemyEnum(CalendarEventStatus), default=CalendarEventStatus.SCHEDULED, nullable=False)

    client_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("clients.id"), nullable=True)
    farmer_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("farmers.id"), nullable=True)
    assigned_to_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("users.id"), nullable=True)
    created_by_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("users.id"), nullable=True)

    location: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_report_due: Mapped[bool] = mapped_column(Boolean, default=False)

    client: Mapped[Optional["Client"]] = relationship("Client")
    farmer: Mapped[Optional["Farmer"]] = relationship("Farmer")
    assigned_to: Mapped[Optional["User"]] = relationship("User", foreign_keys=[assigned_to_id])
    created_by: Mapped[Optional["User"]] = relationship("User", foreign_keys=[created_by_id])
