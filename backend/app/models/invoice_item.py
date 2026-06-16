from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import Integer, String, Text, Numeric, ForeignKey, UniqueConstraint
from app.models.base import Base, IDMixin, TimestampMixin
import uuid
from typing import Optional, TYPE_CHECKING
from decimal import Decimal

if TYPE_CHECKING:
    from app.models.billing import Invoice


class InvoiceItem(Base, IDMixin, TimestampMixin):
    __tablename__ = "invoice_items"
    __table_args__ = (
        UniqueConstraint("invoice_id", "serial_number", name="uq_invoice_items_serial"),
    )

    invoice_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("invoices.id", ondelete="CASCADE"), nullable=False, index=True
    )
    serial_number: Mapped[int] = mapped_column(Integer, nullable=False)
    item_name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    unit_price: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)

    invoice: Mapped["Invoice"] = relationship("Invoice", back_populates="items")
