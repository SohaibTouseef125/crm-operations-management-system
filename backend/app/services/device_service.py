from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.models.device import Device, InventoryStatus, ClientOpStatus, DeviceHistory
from app.models.user import User
from uuid import UUID
from datetime import datetime, date
from typing import Optional, List, Dict, Any


async def _get_device(db: AsyncSession, device_id: str) -> Device | None:
    result = await db.execute(
        select(Device)
        .options(
            selectinload(Device.history).selectinload(DeviceHistory.changed_by)
        )
        .where(Device.id == device_id)
    )
    return result.scalars().first()


ALLOWED_TRANSITIONS = {
    InventoryStatus.UNDER_HW_DEVELOPMENT: [InventoryStatus.PENDING_AGRO_QA],
    InventoryStatus.PENDING_AGRO_QA: [
        InventoryStatus.READY_TO_ASSIGN,
        InventoryStatus.UNDER_HW_DEVELOPMENT,
    ],
    InventoryStatus.READY_TO_ASSIGN: [InventoryStatus.ASSIGNED_TO_CLIENT],
    InventoryStatus.ASSIGNED_TO_CLIENT: [InventoryStatus.UNDER_REPAIR],
    InventoryStatus.UNDER_REPAIR: [InventoryStatus.PENDING_AGRO_QA],
}

INVENTORY_STATUS_LABELS = {
    InventoryStatus.UNDER_HW_DEVELOPMENT: "Under HW Development",
    InventoryStatus.PENDING_AGRO_QA: "Pending Agro QA",
    InventoryStatus.READY_TO_ASSIGN: "Ready to Assign",
    InventoryStatus.ASSIGNED_TO_CLIENT: "Assigned to Client",
    InventoryStatus.UNDER_REPAIR: "Under Repair",
}

CLIENT_OP_STATUS_LABELS = {
    ClientOpStatus.ACTIVE: "Active",
    ClientOpStatus.INACTIVE_CROP_PAUSE: "Inactive (Crop Pause)",
    ClientOpStatus.FAULTY: "Faulty",
}


def validate_status_transition(current: InventoryStatus, new: InventoryStatus) -> None:
    allowed = ALLOWED_TRANSITIONS.get(current, [])
    if new not in allowed:
        raise ValueError(
            f"Invalid status transition: {current.value} → {new.value}. "
            f"Allowed from {current.value}: "
            f"{', '.join(s.value for s in allowed) if allowed else 'none'}"
        )


class DeviceService:
    @staticmethod
    async def get_device_status_history(
        db: AsyncSession, device_id: str, limit: int = 100
    ) -> List[DeviceHistory]:
        query = (
            select(DeviceHistory)
            .options(selectinload(DeviceHistory.changed_by))
            .where(DeviceHistory.device_id == device_id)
            .order_by(DeviceHistory.created_at.desc())
            .limit(limit)
        )
        result = await db.execute(query)
        return result.scalars().all()

    @staticmethod
    async def change_device_status(
        db: AsyncSession,
        device_id: str,
        new_status: InventoryStatus,
        changed_by_user: User,
        notes: Optional[str] = None,
        client_id: Optional[UUID] = None,
        installation_location: Optional[str] = None,
    ) -> Device:
        device = await _get_device(db, device_id)
        if not device:
            raise ValueError(f"Device {device_id} not found")

        validate_status_transition(device.inventory_status, new_status)

        previous_status = device.inventory_status
        device.inventory_status = new_status

        if client_id is not None:
            device.client_id = client_id
        if installation_location is not None:
            device.installation_location = installation_location

        # Auto-set client_op_status when assigning to client
        if new_status == InventoryStatus.ASSIGNED_TO_CLIENT:
            if not device.client_id:
                raise ValueError("client_id is required when assigning to client")
            device.client_op_status = ClientOpStatus.ACTIVE

        device.updated_at = datetime.utcnow()

        history_entry = DeviceHistory(
            device_id=device.id,
            previous_status=previous_status,
            new_status=new_status,
            changed_by_id=changed_by_user.id,
            notes=notes
            or f"Status changed from {previous_status.value} to {new_status.value}",
        )
        db.add(history_entry)

        await db.commit()
        return await _get_device(db, device_id)

    @staticmethod
    async def upload_hw_qa(
        db: AsyncSession,
        device_id: str,
        hw_qa_report_url: str,
        hw_user: User,
    ) -> Device:
        device = await _get_device(db, device_id)
        if not device:
            raise ValueError(f"Device {device_id} not found")
        if device.inventory_status != InventoryStatus.UNDER_HW_DEVELOPMENT:
            raise ValueError(
                f"Cannot upload HW QA for device in {device.inventory_status.value} status"
            )

        device.hw_qa_report_url = hw_qa_report_url
        device.inventory_status = InventoryStatus.PENDING_AGRO_QA
        device.updated_at = datetime.utcnow()

        history_entry = DeviceHistory(
            device_id=device.id,
            previous_status=InventoryStatus.UNDER_HW_DEVELOPMENT,
            new_status=InventoryStatus.PENDING_AGRO_QA,
            changed_by_id=hw_user.id,
            notes="HW QA uploaded; device moved to Pending Agro QA",
        )
        db.add(history_entry)

        await db.commit()
        return await _get_device(db, device_id)

    @staticmethod
    async def upload_agro_qa(
        db: AsyncSession,
        device_id: str,
        agro_qa_report_url: str,
        agro_user: User,
    ) -> Device:
        device = await _get_device(db, device_id)
        if not device:
            raise ValueError(f"Device {device_id} not found")
        if device.inventory_status != InventoryStatus.PENDING_AGRO_QA:
            raise ValueError(
                f"Cannot upload Agro QA for device in {device.inventory_status.value} status"
            )

        device.agro_qa_report_url = agro_qa_report_url
        device.agro_qa_by = agro_user.id
        device.inventory_status = InventoryStatus.READY_TO_ASSIGN
        device.updated_at = datetime.utcnow()

        history_entry = DeviceHistory(
            device_id=device.id,
            previous_status=InventoryStatus.PENDING_AGRO_QA,
            new_status=InventoryStatus.READY_TO_ASSIGN,
            changed_by_id=agro_user.id,
            notes="Agro QA uploaded; device is Ready to Assign",
        )
        db.add(history_entry)

        await db.commit()
        return await _get_device(db, device_id)

    @staticmethod
    async def assign_to_client(
        db: AsyncSession,
        device_id: str,
        client_id: UUID,
        installation_location: Optional[str],
        current_user: User,
    ) -> Device:
        device = await _get_device(db, device_id)
        if not device:
            raise ValueError(f"Device {device_id} not found")
        if device.inventory_status != InventoryStatus.READY_TO_ASSIGN:
            raise ValueError(
                f"Cannot assign device in {device.inventory_status.value} status. "
                "Both HW and Agro QA must be completed first."
            )

        device.client_id = client_id
        if installation_location:
            device.installation_location = installation_location
        device.client_op_status = ClientOpStatus.ACTIVE
        previous_status = device.inventory_status
        device.inventory_status = InventoryStatus.ASSIGNED_TO_CLIENT
        device.updated_at = datetime.utcnow()

        history_entry = DeviceHistory(
            device_id=device.id,
            previous_status=previous_status,
            new_status=InventoryStatus.ASSIGNED_TO_CLIENT,
            changed_by_id=current_user.id,
            notes=f"Assigned to client {client_id}",
        )
        db.add(history_entry)

        await db.commit()
        return await _get_device(db, device_id)

    @staticmethod
    async def mark_faulty(
        db: AsyncSession,
        device_id: str,
        current_user: User,
    ) -> Device:
        device = await _get_device(db, device_id)
        if not device:
            raise ValueError(f"Device {device_id} not found")
        if device.inventory_status != InventoryStatus.ASSIGNED_TO_CLIENT:
            raise ValueError(
                f"Can only mark a device as faulty when it is assigned to a client "
                f"(current status: {device.inventory_status.value})"
            )

        device.client_op_status = ClientOpStatus.FAULTY
        previous_status = device.inventory_status
        device.inventory_status = InventoryStatus.UNDER_REPAIR

        # Log repair_receipt_timestamp automatically as the start of repair clock
        device.repair_receipt_timestamp = datetime.utcnow()
        device.updated_at = datetime.utcnow()

        history_entry = DeviceHistory(
            device_id=device.id,
            previous_status=previous_status,
            new_status=InventoryStatus.UNDER_REPAIR,
            changed_by_id=current_user.id,
            notes="Device marked as faulty; moved to Under Repair",
        )
        db.add(history_entry)

        await db.commit()
        return await _get_device(db, device_id)

    @staticmethod
    async def confirm_repair_receipt(
        db: AsyncSession,
        device_id: str,
        current_user: User,
        fault_cause_report_url: Optional[str] = None,
        estimated_repair_date: Optional[date] = None,
    ) -> Device:
        device = await _get_device(db, device_id)
        if not device:
            raise ValueError(f"Device {device_id} not found")
        if device.inventory_status != InventoryStatus.UNDER_REPAIR:
            raise ValueError(
                f"Device is not under repair (current status: {device.inventory_status.value})"
            )

        device.repair_receipt_timestamp = datetime.utcnow()
        if fault_cause_report_url:
            device.fault_cause_report_url = fault_cause_report_url
        if estimated_repair_date:
            device.estimated_repair_date = estimated_repair_date
        device.updated_at = datetime.utcnow()

        await db.commit()
        return await _get_device(db, device_id)

    @staticmethod
    async def complete_repair(
        db: AsyncSession,
        device_id: str,
        current_user: User,
    ) -> Device:
        device = await _get_device(db, device_id)
        if not device:
            raise ValueError(f"Device {device_id} not found")
        if device.inventory_status != InventoryStatus.UNDER_REPAIR:
            raise ValueError(
                f"Device is not under repair (current status: {device.inventory_status.value})"
            )

        # Reset QA fields for re-QA
        device.agro_qa_by = None
        device.agro_qa_report_url = None
        device.client_id = None
        device.client_op_status = None

        previous_status = device.inventory_status
        device.inventory_status = InventoryStatus.PENDING_AGRO_QA
        device.updated_at = datetime.utcnow()

        history_entry = DeviceHistory(
            device_id=device.id,
            previous_status=previous_status,
            new_status=InventoryStatus.PENDING_AGRO_QA,
            changed_by_id=current_user.id,
            notes="Repair completed; device moved to Pending Agro QA for re-certification",
        )
        db.add(history_entry)

        await db.commit()
        return await _get_device(db, device_id)

    @staticmethod
    async def get_devices_by_status(
        db: AsyncSession, status: InventoryStatus, limit: int = 100
    ) -> List[Device]:
        query = (
            select(Device)
            .where(Device.inventory_status == status)
            .order_by(Device.updated_at.desc())
            .limit(limit)
        )
        result = await db.execute(query)
        return result.scalars().all()

    @staticmethod
    async def get_device_timeline(
        db: AsyncSession, device_id: str
    ) -> Dict[str, Any]:
        device = await _get_device(db, device_id)
        if not device:
            raise ValueError(f"Device {device_id} not found")

        history = await DeviceService.get_device_status_history(db, device_id)

        timeline = {
            "device": {
                "id": str(device.id),
                "serial_number": device.serial_number,
                "device_type": device.device_type.value,
                "inventory_status": device.inventory_status.value,
                "client_op_status": device.client_op_status.value if device.client_op_status else None,
                "installation_location": device.installation_location,
                "hw_qa_report_url": device.hw_qa_report_url,
                "agro_qa_report_url": device.agro_qa_report_url,
                "client_id": str(device.client_id) if device.client_id else None,
                "repair_receipt_timestamp": device.repair_receipt_timestamp.isoformat()
                if device.repair_receipt_timestamp else None,
                "fault_cause_report_url": device.fault_cause_report_url,
                "estimated_repair_date": device.estimated_repair_date.isoformat()
                if device.estimated_repair_date else None,
                "created_at": device.created_at.isoformat(),
                "updated_at": device.updated_at.isoformat() if device.updated_at else None,
            },
            "status_history": [
                {
                    "id": str(h.id),
                    "previous_status": h.previous_status.value if h.previous_status else None,
                    "new_status": h.new_status.value,
                    "changed_by": h.changed_by.full_name if h.changed_by else None,
                    "changed_at": h.created_at.isoformat(),
                    "notes": h.notes,
                }
                for h in history
            ],
        }
        return timeline
