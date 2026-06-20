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

PRODUCT_WRITE_ROLES = [UserRole.ADMIN, UserRole.BDM]
PRODUCT_READ_ROLES = [UserRole.ADMIN, UserRole.MANAGER, UserRole.BUSINESS, UserRole.BDM, UserRole.ACCOUNTS, UserRole.AGRONOMY, UserRole.HARDWARE]

@router.get("/", response_model=List[ProductInDB])
async def read_products(
    product_type: ProductType | None = None,
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_role(PRODUCT_READ_ROLES))
):
    repo = ProductRepository(db)
    return await repo.get_all(product_type=product_type, skip=skip, limit=limit)

@router.get("/{product_id}", response_model=ProductInDB)
async def read_product(
    product_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_role(PRODUCT_READ_ROLES))
):
    repo = ProductRepository(db)
    product = await repo.get_by_id(product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product

@router.post("/", response_model=ProductInDB)
async def create_product(
    data: ProductCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_role(PRODUCT_WRITE_ROLES))
):
    repo = ProductRepository(db)
    product = await repo.create(data)
    await ActivityLogService.log_activity(
        db, current_user.id, current_user.full_name,
        "CREATE", "Product", f"Created {data.product_type.value} '{product.name}'",
        entity_id=product.id
    )
    return product

@router.patch("/{product_id}", response_model=ProductInDB)
async def update_product(
    product_id: UUID,
    data: ProductUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_role(PRODUCT_WRITE_ROLES))
):
    repo = ProductRepository(db)
    product = await repo.get_by_id(product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    updated = await repo.update(product, data)
    await ActivityLogService.log_activity(
        db, current_user.id, current_user.full_name,
        "UPDATE", "Product", f"Updated {data.product_type.value if data.product_type else ''} '{product.name}'",
        entity_id=product.id
    )
    return updated

@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_product(
    product_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_role([UserRole.ADMIN]))
):
    repo = ProductRepository(db)
    product = await repo.get_by_id(product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    await repo.delete(product)
    await ActivityLogService.log_activity(
        db, current_user.id, current_user.full_name,
        "DELETE", "Product", f"Deleted product '{product.name}'",
        entity_id=product_id
    )
