from pydantic import BaseModel
from uuid import UUID
from datetime import datetime, date
from typing import Optional
from app.models.calendar_event import CalendarEventType, CalendarEventStatus

class CalendarEventBase(BaseModel):
    title: str
    description: Optional[str] = None
    event_type: CalendarEventType = CalendarEventType.FIELD_VISIT
    event_date: date
    client_id: Optional[UUID] = None
    farmer_id: Optional[UUID] = None
    assigned_to_id: Optional[UUID] = None
    location: Optional[str] = None
    is_report_due: bool = False

class CalendarEventCreate(CalendarEventBase):
    pass

class CalendarEventUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    event_date: Optional[date] = None
    status: Optional[CalendarEventStatus] = None
    assigned_to_id: Optional[UUID] = None
    location: Optional[str] = None

class CalendarEventInDB(CalendarEventBase):
    id: UUID
    status: CalendarEventStatus
    created_by_id: Optional[UUID] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
