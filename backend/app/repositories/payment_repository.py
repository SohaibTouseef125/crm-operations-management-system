from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import desc
from app.models.billing import Payment
from app.schemas.payment import PaymentCreate
from uuid import UUID
from typing import List, Optional

class PaymentRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_invoice(self, invoice_id: UUID) -> List[Payment]:
        result = await self.db.execute(
            select(Payment)
            .where(Payment.invoice_id == invoice_id)
            .order_by(desc(Payment.payment_date))
        )
        return result.scalars().all()

    async def create(self, payment_in: PaymentCreate) -> Payment:
        db_payment = Payment(**payment_in.model_dump())
        self.db.add(db_payment)
        await self.db.commit()
        await self.db.refresh(db_payment)
        return db_payment
