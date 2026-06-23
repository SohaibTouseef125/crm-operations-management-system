from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, ForeignKey, Numeric, Date, Text, DateTime, JSON
from app.models.base import Base, IDMixin, TimestampMixin
from typing import List, Optional, TYPE_CHECKING
import uuid
from datetime import date
from decimal import Decimal

if TYPE_CHECKING:
    from app.models.client import Client

class Quotation(Base, IDMixin, TimestampMixin):
    __tablename__ = "quotations"

    client_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("clients.id"), nullable=False, index=True)
    
    quote_number: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    date: Mapped[date] = mapped_column(Date, default=date.today, nullable=False)
    expiry_date: Mapped[date] = mapped_column(Date, nullable=False)
    
    subtotal: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)
    tax_percentage: Mapped[Decimal] = mapped_column(Numeric(5, 2), default=0)
    tax_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)
    discount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)
    grand_total: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)
    
    status: Mapped[str] = mapped_column(String(20), default="DRAFT", nullable=False)
    
    terms_and_conditions: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    client: Mapped["Client"] = relationship("Client", back_populates="quotations")
    items: Mapped[List["QuotationItem"]] = relationship("QuotationItem", back_populates="quotation", cascade="all, delete-orphan", lazy="selectin")

class QuotationItem(Base, IDMixin, TimestampMixin):
    __tablename__ = "quotation_items"

    quotation_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("quotations.id", ondelete="CASCADE"), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    quantity: Mapped[int] = mapped_column(nullable=False)
    unit_price: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    
    quotation: Mapped["Quotation"] = relationship("Quotation", back_populates="items")
