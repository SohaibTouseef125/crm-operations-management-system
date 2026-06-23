from pydantic import BaseModel, Field
from uuid import UUID
from datetime import datetime, date
from typing import Optional, List
from decimal import Decimal

class QuotationItemBase(BaseModel):
    description: str
    quantity: int
    unit_price: Decimal

class QuotationBase(BaseModel):
    client_id: UUID
    quote_number: Optional[str] = None
    quote_date: Optional[date] = Field(None, alias="date")
    expiry_date: date
    subtotal: Optional[Decimal] = None
    tax_percentage: Optional[Decimal] = Decimal("15.00")
    tax_amount: Optional[Decimal] = None
    discount: Optional[Decimal] = Decimal("0")
    grand_total: Optional[Decimal] = None
    terms_and_conditions: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = None

class QuotationCreate(QuotationBase):
    items: List[QuotationItemBase]

class QuotationUpdate(BaseModel):
    expiry_date: Optional[date] = None
    terms_and_conditions: Optional[str] = None
    notes: Optional[str] = None

class QuotationApprove(BaseModel):
    pass

class QuotationItemInDB(QuotationItemBase):
    id: UUID
    quotation_id: UUID

    class Config:
        from_attributes = True

class QuotationInDB(QuotationBase):
    id: UUID
    client_id: Optional[UUID] = None
    client_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    items: List[QuotationItemInDB] = []

    model_config = {"from_attributes": True, "populate_by_name": True}
