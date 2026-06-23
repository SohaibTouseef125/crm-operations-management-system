from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from uuid import UUID

from app.database.session import get_db
from app.repositories.farm_repository import FarmRepository
from app.schemas.farm import FarmCreate, FarmUpdate, FarmInDB
from app.models.user import User, UserRole
from app.routers.deps import get_current_user, check_role
from app.services.activity_log_service import ActivityLogService

router = APIRouter()

@router.get("/", response_model=List[FarmInDB])
async def read_farms(
    farmer_id: Optional[UUID] = Query(None),
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_role([UserRole.ADMIN, UserRole.MANAGER, UserRole.BUSINESS, UserRole.AGRONOMY, UserRole.HARDWARE]))
):
    repo = FarmRepository(db)
    return await repo.get_all(skip=skip, limit=limit, farmer_id=farmer_id)

@router.post("/", response_model=FarmInDB, status_code=201)
async def create_farm(
    farm_in: FarmCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_role([UserRole.ADMIN, UserRole.MANAGER, UserRole.BUSINESS, UserRole.AGRONOMY, UserRole.HARDWARE]))
):
    repo = FarmRepository(db)
    farm = await repo.create(farm_in)
    
    await ActivityLogService.log_activity(
        db, current_user.id, current_user.full_name, "CREATE", "Farm",
        f"Created farm '{farm.farm_name}' for farmer {farm.farmer_id}", 
        entity_id=farm.id, role=current_user.role
    )
    return farm

@router.get("/{farm_id}", response_model=FarmInDB)
async def read_farm(
    farm_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_role([UserRole.ADMIN, UserRole.MANAGER, UserRole.BUSINESS, UserRole.AGRONOMY, UserRole.HARDWARE]))
):
    repo = FarmRepository(db)
    farm = await repo.get_by_id(farm_id)
    if not farm:
        raise HTTPException(status_code=404, detail="Farm not found")
    return farm

@router.patch("/{farm_id}", response_model=FarmInDB)
async def update_farm(
    farm_id: UUID,
    farm_in: FarmUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_role([UserRole.ADMIN, UserRole.MANAGER, UserRole.BUSINESS, UserRole.AGRONOMY, UserRole.HARDWARE]))
):
    repo = FarmRepository(db)
    db_farm = await repo.get_by_id(farm_id)
    if not db_farm:
        raise HTTPException(status_code=404, detail="Farm not found")
    
    updated = await repo.update(db_farm, farm_in)
    
    await ActivityLogService.log_activity(
        db, current_user.id, current_user.full_name, "UPDATE", "Farm",
        f"Updated farm '{updated.farm_name}'", entity_id=updated.id, role=current_user.role
    )
    return updated

@router.delete("/{farm_id}")
async def delete_farm(
    farm_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_role([UserRole.ADMIN, UserRole.MANAGER]))
):
    repo = FarmRepository(db)
    db_farm = await repo.get_by_id(farm_id)
    if not db_farm:
        raise HTTPException(status_code=404, detail="Farm not found")
    
    await ActivityLogService.log_activity(
        db, current_user.id, current_user.full_name, "DELETE", "Farm",
        f"Deleted farm '{db_farm.farm_name}'", entity_id=farm_id, role=current_user.role
    )
    await repo.delete(db_farm)
    return {"message": "Farm deleted successfully"}
