from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from typing import List
from uuid import UUID
from datetime import date

from app.database.session import get_db
from app.schemas.calendar_event import CalendarEventCreate, CalendarEventUpdate, CalendarEventInDB
from app.models.user import User, UserRole
from app.models.calendar_event import CalendarEvent, CalendarEventStatus
from app.routers.deps import get_current_user, check_role
from app.services.activity_log_service import ActivityLogService

CALENDAR_READ_ROLES = [UserRole.ADMIN, UserRole.MANAGER, UserRole.BUSINESS, UserRole.AGRONOMY]
CALENDAR_WRITE_ROLES = [UserRole.ADMIN, UserRole.MANAGER, UserRole.BUSINESS, UserRole.AGRONOMY]

router = APIRouter()

@router.get("/", response_model=List[CalendarEventInDB])
async def list_calendar_events(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_role(CALENDAR_READ_ROLES))
):
    query = select(CalendarEvent).order_by(CalendarEvent.event_date)
    if current_user.role not in [UserRole.ADMIN, UserRole.MANAGER]:
        query = query.where(
            or_(
                CalendarEvent.assigned_to_id == current_user.id,
                CalendarEvent.created_by_id == current_user.id
            )
        )
    result = await db.execute(query)
    return result.scalars().all()

@router.post("/", response_model=CalendarEventInDB, status_code=201)
async def create_calendar_event(
    event_in: CalendarEventCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_role(CALENDAR_WRITE_ROLES))
):
    event = CalendarEvent(
        **event_in.model_dump(),
        created_by_id=current_user.id,
    )
    db.add(event)
    await db.commit()
    await db.refresh(event)
    await ActivityLogService.log_activity(
        db, current_user.id, current_user.full_name, "CREATE", "CalendarEvent",
        f"Created event '{event.title}'", entity_id=event.id, role=current_user.role
    )
    return event

@router.patch("/{event_id}", response_model=CalendarEventInDB)
async def update_calendar_event(
    event_id: UUID,
    event_in: CalendarEventUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_role(CALENDAR_WRITE_ROLES))
):
    result = await db.execute(select(CalendarEvent).where(CalendarEvent.id == event_id))
    event = result.scalars().first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    if current_user.role not in [UserRole.ADMIN, UserRole.MANAGER] and event.assigned_to_id != current_user.id and event.created_by_id != current_user.id:
        raise HTTPException(status_code=403, detail="Cannot modify events assigned to others")

    for field, value in event_in.model_dump(exclude_unset=True).items():
        setattr(event, field, value)
    await db.commit()
    await db.refresh(event)
    return event

@router.post("/{event_id}/complete", response_model=CalendarEventInDB)
async def mark_event_complete(
    event_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_role(CALENDAR_WRITE_ROLES))
):
    result = await db.execute(select(CalendarEvent).where(CalendarEvent.id == event_id))
    event = result.scalars().first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    if current_user.role not in [UserRole.ADMIN, UserRole.MANAGER] and event.assigned_to_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the assigned person or admin can mark complete")

    event.status = CalendarEventStatus.COMPLETED
    await db.commit()
    await db.refresh(event)
    await ActivityLogService.log_activity(
        db, current_user.id, current_user.full_name, "COMPLETE", "CalendarEvent",
        f"Completed event '{event.title}'", entity_id=event.id, role=current_user.role
    )
    return event

@router.delete("/{event_id}", status_code=204)
async def delete_calendar_event(
    event_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_role([UserRole.ADMIN, UserRole.MANAGER]))
):
    result = await db.execute(select(CalendarEvent).where(CalendarEvent.id == event_id))
    event = result.scalars().first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    await db.delete(event)
    await db.commit()
