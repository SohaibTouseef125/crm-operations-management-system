from pydantic import BaseModel, field_validator, EmailStr
from uuid import UUID
from datetime import datetime, date
from typing import Optional, List
from decimal import Decimal
from app.models.billing import InvoiceStatus

# ── Default company constants ───────────────────────────────────────────────
DEFAULT_PAYMENT_TERMS = (
    "Payment can be made in the form of Cheque to the favour of Crop2X Pvt Ltd. "
    "The Quotation is valid for 30 days."
)
DEFAULT_BANK_DETAILS = (
    "Meezan Bank, Title: Crop2X (Private) Limited, "
    "Account no: 9952-0105470950, IBAN: PK14MEZN0099520105470950"
)


# ── Line Item Schemas ────────────────────────────────────────────────────────

class InvoiceItemBase(BaseModel):
    item_name: str
    description: Optional[str] = None
    unit_price: Decimal

    @field_validator("unit_price")
    @classmethod
    def price_positive(cls, v: Decimal) -> Decimal:
        if v <= 0:
            raise ValueError("Unit price must be greater than 0")
        return v

    @field_validator("item_name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Item name cannot be empty")
        return v.strip()


class InvoiceItemCreate(InvoiceItemBase):
    serial_number: Optional[int] = None  # auto-assigned if not provided


class InvoiceItemUpdate(BaseModel):
    item_name: Optional[str] = None
    description: Optional[str] = None
    unit_price: Optional[Decimal] = None
    serial_number: Optional[int] = None

    @field_validator("unit_price")
    @classmethod
    def price_positive(cls, v: Optional[Decimal]) -> Optional[Decimal]:
        if v is not None and v <= 0:
            raise ValueError("Unit price must be greater than 0")
        return v


class InvoiceItemInDB(InvoiceItemBase):
    id: UUID
    invoice_id: UUID
    serial_number: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ── Invoice Schemas (V2 — with all new fields) ───────────────────────────────

class InvoiceCreateV2(BaseModel):
    client_id: UUID
    invoice_date: Optional[date] = None           # defaults to today
    due_date: date
    tax_percentage: Optional[Decimal] = Decimal("15.00")
    payment_terms: Optional[str] = DEFAULT_PAYMENT_TERMS
    bank_details: Optional[str] = DEFAULT_BANK_DETAILS
    notes: Optional[str] = None
    items: Optional[List[InvoiceItemCreate]] = []

    @field_validator("due_date")
    @classmethod
    def due_date_not_past(cls, v: date) -> date:
        from datetime import date as date_type
        if v < date_type.today():
            raise ValueError("Invoice due date cannot be in the past")
        return v

    @field_validator("tax_percentage")
    @classmethod
    def tax_range(cls, v: Optional[Decimal]) -> Optional[Decimal]:
        if v is not None and (v < 0 or v > 100):
            raise ValueError("Tax percentage must be between 0 and 100")
        return v


class InvoiceUpdateV2(BaseModel):
    invoice_date: Optional[date] = None
    due_date: Optional[date] = None
    tax_percentage: Optional[Decimal] = None
    payment_terms: Optional[str] = None
    bank_details: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[InvoiceStatus] = None

    @field_validator("tax_percentage")
    @classmethod
    def tax_range(cls, v: Optional[Decimal]) -> Optional[Decimal]:
        if v is not None and (v < 0 or v > 100):
            raise ValueError("Tax percentage must be between 0 and 100")
        return v


class InvoiceDetailResponse(BaseModel):
    id: UUID
    invoice_number: Optional[str]
    client_id: UUID
    # Legacy amount preserved
    amount: Decimal
    status: InvoiceStatus
    file_path: Optional[str]
    due_date: date
    # New fields
    invoice_date: Optional[date]
    subtotal: Optional[Decimal]
    tax_percentage: Optional[Decimal]
    tax_amount: Optional[Decimal]
    total_amount: Optional[Decimal]
    payment_terms: Optional[str]
    bank_details: Optional[str]
    notes: Optional[str]
    sent_at: Optional[datetime]
    created_at: datetime
    # Related
    items: List[InvoiceItemInDB] = []

    class Config:
        from_attributes = True


# ── Email / Send Schemas ─────────────────────────────────────────────────────

class InvoiceSendRequest(BaseModel):
    recipients: List[EmailStr]
    subject: Optional[str] = None
    message: Optional[str] = None

    @field_validator("recipients")
    @classmethod
    def at_least_one(cls, v: List[EmailStr]) -> List[EmailStr]:
        if not v:
            raise ValueError("At least one recipient email is required")
        return v


# ── Paginated List Response ──────────────────────────────────────────────────

class PaginatedInvoiceResponse(BaseModel):
    total: int
    page: int
    page_size: int
    items: List[InvoiceDetailResponse]
