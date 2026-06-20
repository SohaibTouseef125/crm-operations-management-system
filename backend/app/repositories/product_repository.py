from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.product import Product, ProductType
from app.schemas.product import ProductCreate, ProductUpdate
from typing import Optional, List
from uuid import UUID

class ProductRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_all(self, product_type: Optional[ProductType] = None, skip: int = 0, limit: int = 100) -> List[Product]:
        query = select(Product)
        if product_type:
            query = query.where(Product.product_type == product_type)
        query = query.offset(skip).limit(limit).order_by(Product.name)
        result = await self.db.execute(query)
        return result.scalars().all()

    async def get_by_id(self, product_id: UUID) -> Optional[Product]:
        query = select(Product).where(Product.id == product_id)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def create(self, data: ProductCreate) -> Product:
        product = Product(**data.model_dump())
        self.db.add(product)
        await self.db.flush()
        await self.db.refresh(product)
        return product

    async def update(self, product: Product, data: ProductUpdate) -> Product:
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(product, field, value)
        await self.db.flush()
        await self.db.refresh(product)
        return product

    async def delete(self, product: Product) -> None:
        await self.db.delete(product)
        await self.db.flush()
