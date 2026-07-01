from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from typing import List
from uuid import UUID
from datetime import date
from pydantic import BaseModel

from app.database.session import get_db
from app.repositories.device_repository import DeviceRepository
from app.schemas.device import DeviceCreate, DeviceUpdate, DeviceInDB, DeviceHistoryInDB
from app.services.device_service import DeviceService
from app.models.user import User, UserRole
from app.models.device import Device, InventoryStatus, ClientOpStatus, DeviceType, DeviceHistory
from app.routers.deps import get_current_user_for_middleware, check_role
from app.core.rbac import DEVICE_READ_ROLES, DEVICE_WRITE_ROLES
from app.services.activity_log_service import ActivityLogService

router = APIRouter()


# ── Helper models ──────────────────────────────────────────────────────────

class DeviceStatusChange(BaseModel):
    new_status: InventoryStatus
    notes: str | None = None
    client_id: UUID | None = None
    installation_location: str | None = None


class HwQAUpload(BaseModel):
    hw_qa_report_url: str


class AgroQAUpload(BaseModel):
    agro_qa_report_url: str


class ClientAssign(BaseModel):
    client_id: UUID
    installation_location: str | None = None


class RepairReceiptConfirm(BaseModel):
    fault_cause_report_url: str | None = None
    estimated_repair_date: date | None = None


# ── Endpoints ──────────────────────────────────────────────────────────────

@router.get("/", response_model=List[DeviceInDB])
async def read_devices(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_role(DEVICE_READ_ROLES)),
):
    repo = DeviceRepository(db)
    return await repo.get_all(skip=skip, limit=limit)


@router.get("/statuses", response_model=List[str])
async def get_device_statuses(
    current_user: User = Depends(check_role(DEVICE_READ_ROLES)),
) -> List[str]:
    return [s.value for s in InventoryStatus]


@router.get("/types", response_model=List[str])
async def get_device_types(
    current_user: User = Depends(check_role(DEVICE_READ_ROLES)),
) -> List[str]:
    return [t.value for t in DeviceType]


@router.get("/client-op-statuses", response_model=List[str])
async def get_client_op_statuses(
    current_user: User = Depends(check_role(DEVICE_READ_ROLES)),
) -> List[str]:
    return [s.value for s in ClientOpStatus]


@router.post("/", response_model=DeviceInDB)
async def create_device(
    device_in: DeviceCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_role(DEVICE_WRITE_ROLES)),
):
    repo = DeviceRepository(db)
    try:
        device = await repo.create(device_in, current_user.id)
    except IntegrityError as exc:
        await db.rollback()
        error_msg = str(exc.orig).lower() if getattr(exc, "orig", None) else str(exc).lower()
        if "serial_number" in error_msg or "unique" in error_msg or "duplicate" in error_msg:
            raise HTTPException(status_code=409, detail="Serial Number already exists")
        raise HTTPException(status_code=400, detail="Database error occurred while creating device")

    await ActivityLogService.log_activity(
        db, current_user.id, current_user.full_name,
        "CREATE", "Device",
        f"Created device '{device_in.serial_number}' ({device_in.device_type.value})",
        entity_id=device.id,
    )
    return device


@router.get("/{device_id}", response_model=DeviceInDB)
async def read_device(
    device_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_role(DEVICE_READ_ROLES)),
):
    repo = DeviceRepository(db)
    device = await repo.get_by_id(device_id)
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    return device


@router.get("/{device_id}/history", response_model=List[DeviceHistoryInDB])
async def get_device_history(
    device_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_role(DEVICE_READ_ROLES)),
):
    query = (
        select(DeviceHistory)
        .where(DeviceHistory.device_id == device_id)
        .order_by(DeviceHistory.created_at.desc())
    )
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{device_id}/timeline", response_model=dict)
async def get_device_timeline(
    device_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_role(DEVICE_READ_ROLES)),
):
    timeline = await DeviceService.get_device_timeline(db, str(device_id))
    return timeline


@router.patch("/{device_id}", response_model=DeviceInDB)
async def update_device(
    device_id: UUID,
    device_in: DeviceUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_for_middleware),
):
    repo = DeviceRepository(db)
    db_device = await repo.get_by_id(device_id)
    if not db_device:
        raise HTTPException(status_code=404, detail="Device not found")

    if current_user.role not in [
        UserRole.ADMIN, UserRole.MANAGER, UserRole.HARDWARE, UserRole.AGRONOMY,
    ] and current_user.id not in [db_device.hw_developer_id]:
        raise HTTPException(status_code=403, detail="Not authorized to update this device")

    try:
        updated = await repo.update(db_device, device_in, current_user.id)
    except IntegrityError as exc:
        await db.rollback()
        error_msg = str(exc.orig).lower() if getattr(exc, "orig", None) else str(exc).lower()
        if "serial_number" in error_msg or "unique" in error_msg or "duplicate" in error_msg:
            raise HTTPException(status_code=409, detail="Serial Number already exists")
        raise HTTPException(status_code=400, detail="Database error occurred while updating device")

    await ActivityLogService.log_activity(
        db, current_user.id, current_user.full_name,
        "UPDATE", "Device",
        f"Updated device '{updated.serial_number}'",
        entity_id=updated.id,
    )
    return updated


@router.delete("/{device_id}", status_code=204)
async def delete_device(
    device_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_role([UserRole.ADMIN, UserRole.MANAGER])),
):
    repo = DeviceRepository(db)
    device = await repo.get_by_id(device_id)
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")

    await ActivityLogService.log_activity(
        db, current_user.id, current_user.full_name,
        "DELETE", "Device",
        f"Deleted device '{device.serial_number}'",
        entity_id=device.id,
    )
    await repo.delete(device)


# ── Lifecycle endpoints ────────────────────────────────────────────────────

@router.post("/{device_id}/status", response_model=DeviceInDB)
async def change_device_status(
    device_id: UUID,
    status_change: DeviceStatusChange,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_for_middleware),
):
    db_device = await db.get(Device, device_id)
    if not db_device:
        raise HTTPException(status_code=404, detail="Device not found")

    if current_user.role not in [
        UserRole.ADMIN, UserRole.MANAGER, UserRole.HARDWARE, UserRole.AGRONOMY,
    ] and current_user.id not in [db_device.hw_developer_id]:
        raise HTTPException(status_code=403, detail="Not authorized to change device status")

    try:
        device = await DeviceService.change_device_status(
            db=db,
            device_id=str(device_id),
            new_status=status_change.new_status,
            changed_by_user=current_user,
            notes=status_change.notes,
            client_id=status_change.client_id,
            installation_location=status_change.installation_location,
        )
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    return device


@router.post("/{device_id}/hw-qa", response_model=DeviceInDB)
async def upload_hw_qa(
    device_id: UUID,
    payload: HwQAUpload,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(
        check_role([UserRole.ADMIN, UserRole.MANAGER, UserRole.HARDWARE])
    ),
):
    try:
        device = await DeviceService.upload_hw_qa(
            db=db,
            device_id=str(device_id),
            hw_qa_report_url=payload.hw_qa_report_url,
            hw_user=current_user,
        )
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    await ActivityLogService.log_activity(
        db, current_user.id, current_user.full_name,
        "QA_UPLOAD", "Device",
        f"HW QA uploaded for device '{device.serial_number}'",
        entity_id=device.id,
    )
    return device


@router.post("/{device_id}/agro-qa", response_model=DeviceInDB)
async def upload_agro_qa(
    device_id: UUID,
    payload: AgroQAUpload,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(
        check_role([UserRole.ADMIN, UserRole.MANAGER, UserRole.AGRONOMY])
    ),
):
    try:
        device = await DeviceService.upload_agro_qa(
            db=db,
            device_id=str(device_id),
            agro_qa_report_url=payload.agro_qa_report_url,
            agro_user=current_user,
        )
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    await ActivityLogService.log_activity(
        db, current_user.id, current_user.full_name,
        "QA_UPLOAD", "Device",
        f"Agro QA uploaded for device '{device.serial_number}'",
        entity_id=device.id,
    )
    return device


@router.post("/{device_id}/assign", response_model=DeviceInDB)
async def assign_device_to_client(
    device_id: UUID,
    payload: ClientAssign,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(
        check_role([UserRole.ADMIN, UserRole.MANAGER, UserRole.HARDWARE])
    ),
):
    try:
        device = await DeviceService.assign_to_client(
            db=db,
            device_id=str(device_id),
            client_id=payload.client_id,
            installation_location=payload.installation_location,
            current_user=current_user,
        )
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    await ActivityLogService.log_activity(
        db, current_user.id, current_user.full_name,
        "ASSIGN", "Device",
        f"Device '{device.serial_number}' assigned to client {payload.client_id}",
        entity_id=device.id,
    )
    return device


@router.post("/{device_id}/mark-faulty", response_model=DeviceInDB)
async def mark_device_faulty(
    device_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(
        check_role([UserRole.ADMIN, UserRole.MANAGER, UserRole.HARDWARE, UserRole.AGRONOMY, UserRole.BUSINESS])
    ),
):
    try:
        device = await DeviceService.mark_faulty(
            db=db, device_id=str(device_id), current_user=current_user,
        )
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    await ActivityLogService.log_activity(
        db, current_user.id, current_user.full_name,
        "MARK_FAULTY", "Device",
        f"Device '{device.serial_number}' marked as faulty",
        entity_id=device.id,
    )
    return device


@router.post("/{device_id}/repair-receipt", response_model=DeviceInDB)
async def confirm_repair_receipt(
    device_id: UUID,
    payload: RepairReceiptConfirm,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(
        check_role([UserRole.ADMIN, UserRole.MANAGER, UserRole.HARDWARE])
    ),
):
    try:
        device = await DeviceService.confirm_repair_receipt(
            db=db,
            device_id=str(device_id),
            current_user=current_user,
            fault_cause_report_url=payload.fault_cause_report_url,
            estimated_repair_date=payload.estimated_repair_date,
        )
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    await ActivityLogService.log_activity(
        db, current_user.id, current_user.full_name,
        "REPAIR_RECEIPT", "Device",
        f"Repair receipt confirmed for device '{device.serial_number}'",
        entity_id=device.id,
    )
    return device


@router.post("/{device_id}/repair-complete", response_model=DeviceInDB)
async def complete_repair(
    device_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(
        check_role([UserRole.ADMIN, UserRole.MANAGER, UserRole.HARDWARE])
    ),
):
    try:
        device = await DeviceService.complete_repair(
            db=db, device_id=str(device_id), current_user=current_user,
        )
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    await ActivityLogService.log_activity(
        db, current_user.id, current_user.full_name,
        "REPAIR_COMPLETE", "Device",
        f"Repair completed for device '{device.serial_number}'",
        entity_id=device.id,
    )
    return device
