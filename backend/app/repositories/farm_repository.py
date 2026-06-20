from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import desc
from app.models.farm import Farm
from app.schemas.farm import FarmCreate, FarmUpdate
from uuid import UUID
from typing import List, Optional

class FarmRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_all(self, skip: int = 0, limit: int = 100, farmer_id: Optional[UUID] = None) -> List[Farm]:
        query = select(Farm)
        if farmer_id:
            query = query.where(Farm.farmer_id == farmer_id)
        
        result = await self.db.execute(
            query
            .order_by(desc(Farm.created_at))
            .offset(skip)
            .limit(limit)
        )
        return result.scalars().all()

    async def get_by_id(self, farm_id: UUID) -> Optional[Farm]:
        result = await self.db.execute(select(Farm).where(Farm.id == farm_id))
        return result.scalars().first()

    async def create(self, farm_in: FarmCreate) -> Farm:
        db_farm = Farm(**farm_in.model_dump())
        self.db.add(db_farm)
        await self.db.commit()
        await self.db.refresh(db_farm)
        return db_farm

    async def update(self, db_farm: Farm, farm_in: FarmUpdate) -> Farm:
        update_data = farm_in.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_farm, field, value)
        await self.db.commit()
        await self.db.refresh(db_farm)
        return db_farm

    async def delete(self, db_farm: Farm) -> None:
        await self.db.delete(db_farm)
        await self.db.commit()
