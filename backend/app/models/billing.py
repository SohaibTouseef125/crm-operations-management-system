from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, Enum as SQLAlchemyEnum, ForeignKey, Numeric, Date, Text, DateTime
from app.models.base import Base, IDMixin, TimestampMixin
import enum
from typing import Optional, List, TYPE_CHECKING
import uuid
from datetime import date, datetime
from decimal import Decimal

if TYPE_CHECKING:
    from app.models.invoice_item import InvoiceItem
    from app.models.invoice_recipient import InvoiceRecipient


class InvoiceStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    SENT = "SENT"
    PAID = "PAID"
    PARTIALLY_PAID = "PARTIALLY_PAID"
    OVERDUE = "OVERDUE"
    CANCELLED = "CANCELLED"


class Invoice(Base, IDMixin, TimestampMixin):
    __tablename__ = "invoices"

    client_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("clients.id"), nullable=False, index=True)

    # ── Legacy amount field — preserved for backward compatibility ──────────
    amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False, server_default="0")

    status: Mapped[InvoiceStatus] = mapped_column(
        SQLAlchemyEnum(InvoiceStatus), default=InvoiceStatus.DRAFT, nullable=False
    )
    file_path: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    due_date: Mapped[date] = mapped_column(Date, nullable=False)

    # ── New fields added in invoice module migration ────────────────────────
    invoice_number: Mapped[Optional[str]] = mapped_column(String(20), nullable=True, unique=True)
    invoice_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    subtotal: Mapped[Optional[Decimal]] = mapped_column(Numeric(12, 2), nullable=True, server_default="0")
    tax_percentage: Mapped[Optional[Decimal]] = mapped_column(Numeric(5, 2), nullable=True, server_default="15.00")
    tax_amount: Mapped[Optional[Decimal]] = mapped_column(Numeric(12, 2), nullable=True, server_default="0")
    total_amount: Mapped[Optional[Decimal]] = mapped_column(Numeric(12, 2), nullable=True, server_default="0")
    payment_terms: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    bank_details: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    sent_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # ── Relationships ───────────────────────────────────────────────────────
    client: Mapped["Client"] = relationship("Client", back_populates="invoices")
    payments: Mapped[list["Payment"]] = relationship(back_populates="invoice")
    items: Mapped[List["InvoiceItem"]] = relationship(
        "InvoiceItem", back_populates="invoice", cascade="all, delete-orphan", lazy="selectin"
    )
    recipients: Mapped[List["InvoiceRecipient"]] = relationship(
        "InvoiceRecipient", back_populates="invoice", cascade="all, delete-orphan"
    )


class Payment(Base, IDMixin, TimestampMixin):
    __tablename__ = "payments"

    client_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("clients.id"), nullable=False, index=True)
    invoice_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("invoices.id"), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    payment_date: Mapped[date] = mapped_column(Date, default=date.today)
    payment_method: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    transaction_reference: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    receipt_url: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    remarks: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    invoice: Mapped["Invoice"] = relationship(back_populates="payments")
    client: Mapped["Client"] = relationship("Client", back_populates="payments")
