from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import desc
from sqlalchemy.orm import joinedload
from app.models.farmer import Farmer
from app.schemas.farmer import FarmerCreate, FarmerUpdate
from uuid import UUID
from typing import List, Optional

class FarmerRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_all(self, skip: int = 0, limit: int = 100) -> List[Farmer]:
        result = await self.db.execute(
            select(Farmer)
            .options(joinedload(Farmer.assigned_agent))
            .order_by(desc(Farmer.created_at))
            .offset(skip)
            .limit(limit)
        )
        return result.unique().scalars().all()

    async def get_by_id(self, farmer_id: UUID) -> Optional[Farmer]:
        result = await self.db.execute(
            select(Farmer)
            .options(joinedload(Farmer.assigned_agent))
            .where(Farmer.id == farmer_id)
        )
        return result.unique().scalars().first()

    async def create(self, farmer_in: FarmerCreate) -> Farmer:
        db_farmer = Farmer(**farmer_in.model_dump())
        self.db.add(db_farmer)
        await self.db.commit()
        await self.db.refresh(db_farmer)
        return db_farmer

    async def update(self, db_farmer: Farmer, farmer_in: FarmerUpdate) -> Farmer:
        update_data = farmer_in.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_farmer, field, value)
        await self.db.commit()
        await self.db.refresh(db_farmer)
        return db_farmer

    async def delete(self, db_farmer: Farmer) -> None:
        await self.db.delete(db_farmer)
        await self.db.commit()
