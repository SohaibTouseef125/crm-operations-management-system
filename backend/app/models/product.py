from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import String, Enum as SQLAlchemyEnum, Numeric, Text
from app.models.base import Base, IDMixin, TimestampMixin
import enum
from typing import Optional
from decimal import Decimal

class ProductType(str, enum.Enum):
    PRODUCT = "PRODUCT"
    SERVICE = "SERVICE"

class ProductStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"

class Product(Base, IDMixin, TimestampMixin):
    __tablename__ = "products"

    name: Mapped[str] = mapped_column(String, nullable=False, index=True)
    category: Mapped[str] = mapped_column(String, nullable=False)
    product_type: Mapped[ProductType] = mapped_column(SQLAlchemyEnum(ProductType), default=ProductType.PRODUCT, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    price: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    tax_percentage: Mapped[Decimal] = mapped_column(Numeric(5, 2), default=Decimal("0.00"), nullable=False)
    status: Mapped[ProductStatus] = mapped_column(SQLAlchemyEnum(ProductStatus), default=ProductStatus.ACTIVE, nullable=False)
