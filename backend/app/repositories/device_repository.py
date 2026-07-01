from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy import desc
from app.models.device import Device, DeviceHistory, InventoryStatus
from app.schemas.device import DeviceCreate, DeviceUpdate
from uuid import UUID
from typing import List, Optional


class DeviceRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_all(self, skip: int = 0, limit: int = 100) -> List[Device]:
        result = await self.db.execute(
            select(Device)
            .options(selectinload(Device.history).selectinload(DeviceHistory.changed_by))
            .order_by(desc(Device.updated_at))
            .offset(skip)
            .limit(limit)
        )
        return result.scalars().all()

    async def get_by_id(self, device_id: UUID) -> Optional[Device]:
        result = await self.db.execute(
            select(Device)
            .options(selectinload(Device.history).selectinload(DeviceHistory.changed_by))
            .where(Device.id == device_id)
        )
        return result.scalars().first()

    async def create(self, device_in: DeviceCreate, user_id: UUID) -> Device:
        device_data = device_in.model_dump()
        db_device = Device(**device_data)
        db_device.inventory_status = InventoryStatus.UNDER_HW_DEVELOPMENT
        db_device.hw_developer_id = user_id
        self.db.add(db_device)
        await self.db.flush()

        history = DeviceHistory(
            device_id=db_device.id,
            previous_status=None,
            new_status=InventoryStatus.UNDER_HW_DEVELOPMENT,
            changed_by_id=user_id,
            notes="Device created by Hardware team",
        )
        self.db.add(history)

        await self.db.commit()
        return await self.get_by_id(db_device.id)

    async def delete(self, db_device: Device) -> None:
        await self.db.delete(db_device)
        await self.db.commit()

    async def update(self, db_device: Device, device_in: DeviceUpdate, user_id: UUID) -> Device:
        update_data = device_in.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_device, field, value)
        await self.db.commit()
        return await self.get_by_id(db_device.id)
