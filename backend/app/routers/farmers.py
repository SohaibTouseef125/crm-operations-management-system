from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from uuid import UUID

from app.database.session import get_db
from app.repositories.farmer_repository import FarmerRepository
from app.schemas.farmer import FarmerCreate, FarmerUpdate, FarmerInDB
from app.models.user import User, UserRole
from app.routers.deps import get_current_user, check_role
from app.services.activity_log_service import ActivityLogService

router = APIRouter()

@router.get("/", response_model=List[FarmerInDB])
async def read_farmers(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_role([UserRole.ADMIN, UserRole.MANAGER, UserRole.BUSINESS, UserRole.AGRONOMY, UserRole.ACCOUNTS]))
):
    repo = FarmerRepository(db)
    return await repo.get_all(skip=skip, limit=limit)

@router.post("/", response_model=FarmerInDB, status_code=201)
async def create_farmer(
    farmer_in: FarmerCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_role([UserRole.ADMIN, UserRole.MANAGER, UserRole.BUSINESS, UserRole.AGRONOMY]))
):
    repo = FarmerRepository(db)
    farmer = await repo.create(farmer_in)
    
    await ActivityLogService.log_activity(
        db, current_user.id, current_user.full_name, "CREATE", "Farmer",
        f"Created farmer '{farmer.name}'", entity_id=farmer.id, role=current_user.role
    )
    return farmer

@router.get("/{farmer_id}", response_model=FarmerInDB)
async def read_farmer(
    farmer_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_role([UserRole.ADMIN, UserRole.MANAGER, UserRole.BUSINESS, UserRole.AGRONOMY, UserRole.ACCOUNTS]))
):
    repo = FarmerRepository(db)
    farmer = await repo.get_by_id(farmer_id)
    if not farmer:
        raise HTTPException(status_code=404, detail="Farmer not found")
    return farmer

@router.patch("/{farmer_id}", response_model=FarmerInDB)
async def update_farmer(
    farmer_id: UUID,
    farmer_in: FarmerUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_role([UserRole.ADMIN, UserRole.MANAGER, UserRole.BUSINESS, UserRole.AGRONOMY]))
):
    repo = FarmerRepository(db)
    db_farmer = await repo.get_by_id(farmer_id)
    if not db_farmer:
        raise HTTPException(status_code=404, detail="Farmer not found")
    
    updated = await repo.update(db_farmer, farmer_in)
    
    await ActivityLogService.log_activity(
        db, current_user.id, current_user.full_name, "UPDATE", "Farmer",
        f"Updated farmer '{updated.name}'", entity_id=updated.id, role=current_user.role
    )
    return updated

@router.delete("/{farmer_id}")
async def delete_farmer(
    farmer_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_role([UserRole.ADMIN, UserRole.MANAGER]))
):
    repo = FarmerRepository(db)
    db_farmer = await repo.get_by_id(farmer_id)
    if not db_farmer:
        raise HTTPException(status_code=404, detail="Farmer not found")
    
    await ActivityLogService.log_activity(
        db, current_user.id, current_user.full_name, "DELETE", "Farmer",
        f"Deleted farmer '{db_farmer.name}'", entity_id=farmer_id, role=current_user.role
    )
    await repo.delete(db_farmer)
    return {"message": "Farmer deleted successfully"}
