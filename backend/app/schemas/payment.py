from pydantic import BaseModel
from uuid import UUID
from datetime import datetime, date
from typing import Optional
from decimal import Decimal

class PaymentBase(BaseModel):
    client_id: UUID
    invoice_id: UUID
    amount: Decimal
    payment_date: date = date.today()
    payment_method: Optional[str] = None
    transaction_reference: Optional[str] = None
    receipt_url: Optional[str] = None
    remarks: Optional[str] = None

class PaymentCreate(PaymentBase):
    pass

class PaymentInDB(PaymentBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
