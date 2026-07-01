from pydantic import BaseModel
from uuid import UUID
from datetime import datetime, date
from typing import Optional, List
from app.models.device import DeviceType, InventoryStatus, ClientOpStatus
from app.schemas.user import UserInDB


class DeviceHistoryBase(BaseModel):
    previous_status: Optional[InventoryStatus] = None
    new_status: InventoryStatus
    notes: Optional[str] = None


class DeviceHistoryCreate(DeviceHistoryBase):
    device_id: UUID
    changed_by_id: UUID


class DeviceHistoryInDB(BaseModel):
    id: UUID
    device_id: UUID
    previous_status: Optional[InventoryStatus] = None
    new_status: InventoryStatus
    notes: Optional[str] = None
    changed_by_id: UUID
    created_at: datetime
    changed_by: Optional[UserInDB] = None

    class Config:
        from_attributes = True


class DeviceBase(BaseModel):
    serial_number: str
    device_type: DeviceType
    notes: Optional[str] = None


class DeviceCreate(DeviceBase):
    pass


class DeviceUpdate(BaseModel):
    serial_number: Optional[str] = None
    device_type: Optional[DeviceType] = None
    installation_location: Optional[str] = None
    notes: Optional[str] = None


class DeviceInDB(BaseModel):
    id: UUID
    serial_number: str
    device_type: DeviceType
    inventory_status: InventoryStatus
    client_op_status: Optional[ClientOpStatus] = None
    hw_developer_id: Optional[UUID] = None
    hw_qa_report_url: Optional[str] = None
    agro_qa_by: Optional[UUID] = None
    agro_qa_report_url: Optional[str] = None
    client_id: Optional[UUID] = None
    installation_location: Optional[str] = None
    notes: Optional[str] = None
    repair_receipt_timestamp: Optional[datetime] = None
    fault_cause_report_url: Optional[str] = None
    estimated_repair_date: Optional[date] = None
    created_at: datetime
    updated_at: datetime
    history: List[DeviceHistoryInDB] = []

    class Config:
        from_attributes = True
