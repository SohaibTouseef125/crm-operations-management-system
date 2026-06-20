from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from uuid import UUID
from app.database.session import get_db
from app.repositories.product_repository import ProductRepository
from app.schemas.product import ProductCreate, ProductUpdate, ProductInDB
from app.models.user import User, UserRole
from app.routers.deps import check_role
from app.models.product import ProductType
from app.services.activity_log_service import ActivityLogService

router = APIRouter()

SERVICE_WRITE_ROLES = [UserRole.ADMIN, UserRole.BDM]
SERVICE_READ_ROLES = [UserRole.ADMIN, UserRole.MANAGER, UserRole.BUSINESS, UserRole.BDM, UserRole.ACCOUNTS, UserRole.AGRONOMY, UserRole.HARDWARE]

@router.get("/", response_model=List[ProductInDB])
async def read_services(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_role(SERVICE_READ_ROLES))
):
    repo = ProductRepository(db)
    return await repo.get_all(product_type=ProductType.SERVICE, skip=skip, limit=limit)

@router.get("/{service_id}", response_model=ProductInDB)
async def read_service(
    service_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_role(SERVICE_READ_ROLES))
):
    repo = ProductRepository(db)
    service = await repo.get_by_id(service_id)
    if not service or service.product_type != ProductType.SERVICE:
        raise HTTPException(status_code=404, detail="Service not found")
    return service

@router.post("/", response_model=ProductInDB)
async def create_service(
    data: ProductCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_role(SERVICE_WRITE_ROLES))
):
    data.product_type = ProductType.SERVICE
    repo = ProductRepository(db)
    service = await repo.create(data)
    await ActivityLogService.log_activity(
        db, current_user.id, current_user.full_name,
        "CREATE", "Service", f"Created service '{service.name}'",
        entity_id=service.id
    )
    return service

@router.patch("/{service_id}", response_model=ProductInDB)
async def update_service(
    service_id: UUID,
    data: ProductUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_role(SERVICE_WRITE_ROLES))
):
    repo = ProductRepository(db)
    service = await repo.get_by_id(service_id)
    if not service or service.product_type != ProductType.SERVICE:
        raise HTTPException(status_code=404, detail="Service not found")
    updated = await repo.update(service, data)
    await ActivityLogService.log_activity(
        db, current_user.id, current_user.full_name,
        "UPDATE", "Service", f"Updated service '{service.name}'",
        entity_id=service.id
    )
    return updated

@router.delete("/{service_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_service(
    service_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_role([UserRole.ADMIN]))
):
    repo = ProductRepository(db)
    service = await repo.get_by_id(service_id)
    if not service or service.product_type != ProductType.SERVICE:
        raise HTTPException(status_code=404, detail="Service not found")
    await repo.delete(service)
    await ActivityLogService.log_activity(
        db, current_user.id, current_user.full_name,
        "DELETE", "Service", f"Deleted service '{service.name}'",
        entity_id=service_id
    )
