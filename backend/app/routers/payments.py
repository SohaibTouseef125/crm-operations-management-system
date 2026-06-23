from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from uuid import UUID

from app.database.session import get_db
from app.repositories.payment_repository import PaymentRepository
from app.schemas.payment import PaymentCreate, PaymentInDB
from app.models.user import User, UserRole
from app.routers.deps import get_current_user, check_role
from app.services.activity_log_service import ActivityLogService

router = APIRouter()

@router.get("/invoice/{invoice_id}", response_model=List[PaymentInDB])
async def read_invoice_payments(
    invoice_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_role([UserRole.ADMIN, UserRole.MANAGER, UserRole.ACCOUNTS, UserRole.BDM, UserRole.BUSINESS]))
):
    repo = PaymentRepository(db)
    return await repo.get_by_invoice(invoice_id)

@router.post("/", response_model=PaymentInDB, status_code=201)
async def create_payment(
    payment_in: PaymentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_role([UserRole.ADMIN, UserRole.ACCOUNTS]))
):
    repo = PaymentRepository(db)
    payment = await repo.create(payment_in)
    
    await ActivityLogService.log_activity(
        db, current_user.id, current_user.full_name, "CREATE", "Payment",
        f"Recorded payment of ${payment.amount} for invoice {payment.invoice_id}", 
        entity_id=payment.id, role=current_user.role
    )
    return payment
