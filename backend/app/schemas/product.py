from pydantic import BaseModel, field_validator
from uuid import UUID
from datetime import datetime
from typing import Optional
from decimal import Decimal
from app.models.product import ProductType, ProductStatus

class ProductBase(BaseModel):
    name: str
    category: str
    product_type: ProductType = ProductType.PRODUCT
    description: Optional[str] = None
    price: Decimal
    tax_percentage: Decimal = Decimal("0.00")
    status: ProductStatus = ProductStatus.ACTIVE

    @field_validator("price")
    @classmethod
    def price_positive(cls, v: Decimal) -> Decimal:
        if v <= 0:
            raise ValueError("Price must be greater than 0")
        return v

    @field_validator("tax_percentage")
    @classmethod
    def tax_range(cls, v: Decimal) -> Decimal:
        if v < 0 or v > 100:
            raise ValueError("Tax percentage must be between 0 and 100")
        return v

class ProductCreate(ProductBase):
    pass

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    product_type: Optional[ProductType] = None
    description: Optional[str] = None
    price: Optional[Decimal] = None
    tax_percentage: Optional[Decimal] = None
    status: Optional[ProductStatus] = None

class ProductInDB(ProductBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
