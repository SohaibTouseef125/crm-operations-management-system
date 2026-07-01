from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, Enum as SQLAlchemyEnum, ForeignKey, Text, DateTime, func, Date
from app.models.base import Base, IDMixin, TimestampMixin
import enum
from typing import Optional, List
import uuid
from datetime import datetime, date


# Tell SQLAlchemy to store the enum .value (lowercase) not .name (uppercase)
_enum_values = lambda x: [e.value for e in x]


class DeviceType(str, enum.Enum):
    MOBILE_DEVICE = "MOBILE_DEVICE"
    AQUASAVE_PRO = "AQUASAVE_PRO"


class InventoryStatus(str, enum.Enum):
    UNDER_HW_DEVELOPMENT = "under_hw_development"
    PENDING_AGRO_QA = "pending_agro_qa"
    READY_TO_ASSIGN = "ready_to_assign"
    ASSIGNED_TO_CLIENT = "assigned_to_client"
    UNDER_REPAIR = "under_repair"


class ClientOpStatus(str, enum.Enum):
    ACTIVE = "active"
    INACTIVE_CROP_PAUSE = "inactive_crop_pause"
    FAULTY = "faulty"


class Device(Base, IDMixin, TimestampMixin):
    __tablename__ = "devices"

    serial_number: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
    device_type: Mapped[DeviceType] = mapped_column(SQLAlchemyEnum(DeviceType, values_callable=_enum_values), nullable=False)

    inventory_status: Mapped[InventoryStatus] = mapped_column(
        SQLAlchemyEnum(InventoryStatus, values_callable=_enum_values),
        default=InventoryStatus.UNDER_HW_DEVELOPMENT,
        nullable=False,
        index=True,
    )
    client_op_status: Mapped[Optional[ClientOpStatus]] = mapped_column(
        SQLAlchemyEnum(ClientOpStatus, values_callable=_enum_values), nullable=True
    )

    hw_developer_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("users.id"), nullable=True)
    hw_qa_report_url: Mapped[Optional[str]] = mapped_column(String, nullable=True)

    agro_qa_by: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("users.id"), nullable=True)
    agro_qa_report_url: Mapped[Optional[str]] = mapped_column(String, nullable=True)

    client_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("clients.id"), nullable=True)
    installation_location: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    repair_receipt_timestamp: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    fault_cause_report_url: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    estimated_repair_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)

    client: Mapped[Optional["Client"]] = relationship("Client", back_populates="devices")
    hw_developer: Mapped[Optional["User"]] = relationship("User", foreign_keys=[hw_developer_id])
    agro_qa_user: Mapped[Optional["User"]] = relationship("User", foreign_keys=[agro_qa_by])
    history: Mapped[List["DeviceHistory"]] = relationship(
        back_populates="device", cascade="all, delete-orphan", lazy="selectin"
    )

    @property
    def display_name(self) -> str:
        return f"{self.device_type.value.replace('_', ' ').title()} - {self.serial_number}"


class DeviceHistory(Base, IDMixin):
    __tablename__ = "device_status_history"

    device_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("devices.id"), nullable=False)
    previous_status: Mapped[Optional[InventoryStatus]] = mapped_column(
        SQLAlchemyEnum(InventoryStatus, values_callable=_enum_values), nullable=True
    )
    new_status: Mapped[InventoryStatus] = mapped_column(
        SQLAlchemyEnum(InventoryStatus, values_callable=_enum_values), nullable=False
    )
    changed_by_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())

    device: Mapped["Device"] = relationship(back_populates="history")
    changed_by: Mapped["User"] = relationship("User", foreign_keys=[changed_by_id])
