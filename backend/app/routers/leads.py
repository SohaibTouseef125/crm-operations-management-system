from fastapi import APIRouter, Depends, HTTPException, status, Request, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from typing import List, Optional
from uuid import UUID
import os, shutil
from datetime import datetime, timezone
from app.database.session import get_db
from app.repositories.lead_repository import LeadRepository
from app.repositories.client_repository import ClientRepository
from app.schemas.client import LeadCreate, LeadUpdate, LeadInDB, LeadActivityCreate, LeadActivityInDB, ClientCreate
from app.models.user import User, UserRole
from app.models.lead import Lead, LeadActivity, LeadStage, LEAD_STAGE_TRANSITIONS
from app.routers.deps import get_current_user, check_role
from app.services.activity_log_service import ActivityLogService

router = APIRouter()

UPLOAD_DIR = "uploads/quotations"


@router.get("/", response_model=List[LeadInDB])
async def read_leads(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Admin/BDM/Manager see all; Business/Sales see only their own assigned leads
    # Accounts can only view leads at quotation_requested stage (quotation handover)
    if current_user.role not in [UserRole.ADMIN, UserRole.BDM, UserRole.MANAGER, UserRole.BUSINESS, UserRole.ACCOUNTS]:
        raise HTTPException(status_code=403, detail="Not authorized to view leads")

    repo = LeadRepository(db)

    if current_user.role == UserRole.ACCOUNTS:
        return await repo.get_by_status(LeadStage.QUOTATION_REQUESTED, skip=skip, limit=limit)

    if current_user.role in [UserRole.ADMIN, UserRole.BDM, UserRole.MANAGER]:
        return await repo.get_all(skip=skip, limit=limit)
    # Business/Sales see only assigned leads
    return await repo.get_by_assigned(current_user.id, skip=skip, limit=limit)


@router.post("/", response_model=LeadInDB)
async def create_lead(
    lead_in: LeadCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_role([UserRole.ADMIN, UserRole.BDM, UserRole.BUSINESS]))
):
    repo = LeadRepository(db)
    # Auto-assign to current user if not specified (Business hides the field)
    if lead_in.assigned_to_id is None:
        lead_in.assigned_to_id = current_user.id
    lead = await repo.create(lead_in)

    await ActivityLogService.log_activity(
        db, current_user.id, current_user.full_name, "CREATE", "Lead",
        f"Created lead '{lead.name}'", entity_id=lead.id, role=current_user.role
    )
    return lead


@router.get("/{lead_id}", response_model=LeadInDB)
async def read_lead(
    lead_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    repo = LeadRepository(db)
    lead = await repo.get_by_id(lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    # Accounts can only view leads with quotation_requested status (quotation handover)
    if current_user.role == UserRole.ACCOUNTS and lead.stage != LeadStage.QUOTATION_REQUESTED:
        raise HTTPException(status_code=403, detail="Accounts can only view leads awaiting quotation")

    # Business/Sales can only view own leads
    if current_user.role == UserRole.BUSINESS and lead.assigned_to_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view this lead")

    return lead


@router.patch("/{lead_id}", response_model=LeadInDB)
async def update_lead(
    lead_id: UUID,
    lead_in: LeadUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    repo = LeadRepository(db)
    db_lead = await repo.get_by_id(lead_id)
    if not db_lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    # Authorize: Admin, BDM, Manager, or assigned person
    is_authorized = (
        current_user.role in [UserRole.ADMIN, UserRole.BDM, UserRole.MANAGER]
        or db_lead.assigned_to_id == current_user.id
    )
    if not is_authorized:
        raise HTTPException(status_code=403, detail="Not authorized to update this lead")

    # Restrict quotation_file_url update to Admin/Accounts only
    if lead_in.quotation_file_url is not None and current_user.role not in [UserRole.ADMIN, UserRole.ACCOUNTS]:
        raise HTTPException(status_code=403, detail="Only Accounts can upload quotation files")

    # Enforce valid stage transition
    if lead_in.stage and lead_in.stage != db_lead.stage:
        allowed = LEAD_STAGE_TRANSITIONS.get(db_lead.stage.value, [])
        if lead_in.stage.value not in allowed:
            raise HTTPException(
                status_code=422,
                detail=f"Invalid stage transition from {db_lead.stage.value} to {lead_in.stage.value}. "
                       f"Allowed transitions: {allowed}"
            )

        # Step 1: When Sales changes status to quotation_requested, auto-log timestamp
        if lead_in.stage == LeadStage.QUOTATION_REQUESTED and db_lead.stage != LeadStage.QUOTATION_REQUESTED:
            lead_in.quotation_requested_at = datetime.now(timezone.utc)

        # Step 3: Once status is quotation_forwarded, Accounts loses write access
        if db_lead.stage == LeadStage.QUOTATION_FORWARDED and current_user.role == UserRole.ACCOUNTS:
            raise HTTPException(status_code=403, detail="Accounts cannot modify leads after quotation is forwarded")

    old_stage = db_lead.stage.value

    # Append notes to notes_log with user name and timestamp
    if lead_in.notes:
        await repo.append_note(db_lead, lead_in.notes, current_user.full_name)

    updated = await repo.update(db_lead, lead_in)

    await ActivityLogService.log_activity(
        db, current_user.id, current_user.full_name, "UPDATE", "Lead",
        f"Updated lead '{updated.name}'", entity_id=updated.id,
        previous_value=old_stage, new_value=str(lead_in.stage.value if lead_in.stage else old_stage),
        role=current_user.role
    )
    return updated


@router.delete("/{lead_id}", response_model=LeadInDB)
async def delete_lead(
    lead_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_role([UserRole.ADMIN, UserRole.MANAGER]))
):
    repo = LeadRepository(db)
    lead = await repo.get_by_id(lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    await ActivityLogService.log_activity(
        db, current_user.id, current_user.full_name, "DELETE", "Lead",
        f"Deleted lead '{lead.name}'", entity_id=lead.id, role=current_user.role
    )
    await repo.delete(lead)
    return lead


@router.post("/{lead_id}/convert", response_model=LeadInDB)
async def convert_lead_to_client(
    lead_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_role([UserRole.ADMIN, UserRole.MANAGER, UserRole.BUSINESS, UserRole.BDM]))
):
    """Convert a WON lead into an active client."""
    lead_repo = LeadRepository(db)
    client_repo = ClientRepository(db)
    lead = await lead_repo.get_by_id(lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    if lead.client_id:
        raise HTTPException(status_code=400, detail="Lead already converted to a client")

    client = await client_repo.create(ClientCreate(
        name=lead.name,
        company_name=lead.company_name or lead.name,
        contact_info=lead.email or lead.contact_mobile or "",
        services=lead.services_interested,
        onboarding_date=lead.next_follow_up,
    ))

    updated = await lead_repo.update(lead, LeadUpdate(stage=LeadStage.WON, client_id=client.id))

    await ActivityLogService.log_activity(
        db, current_user.id, current_user.full_name, "CREATE", "Client",
        f"Converted lead '{lead.name}' to client '{client.name}'",
        entity_id=client.id, role=current_user.role,
        extra_data={"lead_id": str(lead_id)}
    )
    return updated


# Step 2: Accounts upload endpoint for quotation PDF
@router.post("/{lead_id}/quotation", response_model=LeadInDB)
async def upload_lead_quotation(
    lead_id: UUID,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_role([UserRole.ADMIN, UserRole.ACCOUNTS]))
):
    """Accounts uploads a quotation PDF. Auto-changes status to quotation_forwarded."""
    repo = LeadRepository(db)
    db_lead = await repo.get_by_id(lead_id)
    if not db_lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    if db_lead.stage != LeadStage.QUOTATION_REQUESTED:
        raise HTTPException(status_code=422, detail="Lead status must be 'quotation_requested' to upload quotation")

    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=422, detail="Only PDF files are accepted")

    # Save file
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    file_ext = os.path.splitext(file.filename)[1]
    safe_name = f"quotation_{lead_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}{file_ext}"
    file_path = os.path.join(UPLOAD_DIR, safe_name)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Step 2: Auto-update: save file_url, change status, log user
    update_data = LeadUpdate(
        quotation_file_url=file_path,
        stage=LeadStage.QUOTATION_FORWARDED,
        quotation_uploaded_by=current_user.id,
    )
    updated = await repo.update(db_lead, update_data)

    await ActivityLogService.log_activity(
        db, current_user.id, current_user.full_name, "QUOTATION_UPLOAD", "Lead",
        f"Uploaded quotation for lead '{updated.name}' (stage set to quotation_forwarded)",
        entity_id=updated.id, role=current_user.role
    )
    return updated


# ── Lead Activities (Follow-ups, Meetings, Farm Visits) ───
@router.get("/{lead_id}/activities", response_model=List[LeadActivityInDB])
async def list_lead_activities(
    lead_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_role([UserRole.ADMIN, UserRole.MANAGER, UserRole.BUSINESS, UserRole.BDM, UserRole.ACCOUNTS]))
):
    result = await db.execute(
        select(LeadActivity).where(LeadActivity.lead_id == lead_id)
        .order_by(LeadActivity.created_at.desc())
    )
    return result.scalars().all()


@router.post("/{lead_id}/activities", response_model=LeadActivityInDB)
async def create_lead_activity(
    lead_id: UUID,
    activity_in: LeadActivityCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_role([UserRole.ADMIN, UserRole.MANAGER, UserRole.BUSINESS, UserRole.BDM]))
):
    result = await db.execute(select(Lead).where(Lead.id == lead_id))
    lead = result.scalars().first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    activity = LeadActivity(
        lead_id=lead_id,
        activity_type=activity_in.activity_type,
        scheduled_at=activity_in.scheduled_at,
        notes=activity_in.notes,
        created_by_id=current_user.id
    )
    db.add(activity)
    await db.commit()
    await db.refresh(activity)

    await ActivityLogService.log_activity(
        db, current_user.id, current_user.full_name, "CREATE", "LeadActivity",
        f"Logged {activity_in.activity_type.value} for lead {lead_id}",
        entity_id=activity.id, role=current_user.role
    )
    return activity


@router.delete("/{lead_id}/activities/{activity_id}")
async def delete_lead_activity(
    lead_id: UUID,
    activity_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_role([UserRole.ADMIN, UserRole.MANAGER, UserRole.BUSINESS, UserRole.BDM]))
):
    result = await db.execute(
        select(LeadActivity).where(
            LeadActivity.id == activity_id,
            LeadActivity.lead_id == lead_id
        )
    )
    activity = result.scalars().first()
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")

    await db.delete(activity)
    await db.commit()
    return {"message": "Activity deleted"}
