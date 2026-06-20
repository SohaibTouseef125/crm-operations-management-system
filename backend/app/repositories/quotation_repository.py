from datetime import date, datetime
from decimal import Decimal, ROUND_HALF_UP
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import desc, func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import joinedload
from app.models.quotation import Quotation, QuotationItem
from app.models.client import Client
from app.schemas.quotation import QuotationCreate, QuotationUpdate
from uuid import UUID
from typing import List, Optional

class QuotationRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def _populate_client_name(self, quotation: Quotation) -> None:
        if quotation.client_id and not quotation.client_name:
            result = await self.db.execute(select(Client.name).where(Client.id == quotation.client_id))
            name = result.scalar()
            if name:
                quotation.client_name = name

    async def get_all(self, skip: int = 0, limit: int = 100, client_id: Optional[UUID] = None) -> List[Quotation]:
        query = select(Quotation).options(joinedload(Quotation.client))
        if client_id:
            query = query.where(Quotation.client_id == client_id)
        
        result = await self.db.execute(
            query
            .order_by(desc(Quotation.created_at))
            .offset(skip)
            .limit(limit)
        )
        quotations = list(result.unique().scalars().all())
        for q in quotations:
            if q.client:
                q.client_name = q.client.name
        return quotations

    async def get_by_id(self, quotation_id: UUID) -> Optional[Quotation]:
        result = await self.db.execute(
            select(Quotation).options(joinedload(Quotation.client)).where(Quotation.id == quotation_id)
        )
        q = result.unique().scalars().first()
        if q and q.client:
            q.client_name = q.client.name
        return q

    async def _generate_number(self) -> str:
        today = date.today()
        prefix = f"Q-{today.strftime('%Y%m')}-"
        result = await self.db.execute(
            select(func.max(Quotation.quote_number)).where(Quotation.quote_number.like(f"{prefix}%"))
        )
        max_num = result.scalar()
        if max_num:
            seq = int(max_num.split("-")[-1]) + 1
        else:
            seq = 1
        return f"{prefix}{seq:04d}"

    async def _recalculate(self, quotation: Quotation, items_data: list) -> None:
        subtotal = sum(item["unit_price"] * item["quantity"] for item in items_data)
        subtotal = Decimal(str(subtotal))
        tax_pct = quotation.tax_percentage or Decimal("15.00")
        tax_amount = (subtotal * tax_pct / Decimal("100")).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        discount = quotation.discount or Decimal("0")
        grand_total = subtotal + tax_amount - discount

        quotation.subtotal = subtotal
        quotation.tax_amount = tax_amount
        quotation.grand_total = grand_total

    async def create(self, quotation_in: QuotationCreate) -> Quotation:
        data = quotation_in.model_dump()
        items_data = data.pop("items", [])

        max_retries = 3
        for attempt in range(max_retries):
            try:
                db_quotation = Quotation(
                    client_id=data["client_id"],
                    quote_number=data.get("quote_number") or await self._generate_number(),
                    date=data.get("quote_date") or date.today(),
                    expiry_date=data["expiry_date"],
                    tax_percentage=data.get("tax_percentage") or Decimal("15.00"),
                    discount=data.get("discount") or Decimal("0"),
                    terms_and_conditions=data.get("terms_and_conditions"),
                    notes=data.get("notes"),
                    subtotal=Decimal("0"),
                    tax_amount=Decimal("0"),
                    grand_total=Decimal("0"),
                )
                self.db.add(db_quotation)
                await self.db.flush()

                for item in items_data:
                    db_item = QuotationItem(quotation_id=db_quotation.id, **item)
                    self.db.add(db_item)
                await self.db.flush()

                await self._recalculate(db_quotation, items_data)
                await self.db.commit()
                await self.db.refresh(db_quotation)
                return db_quotation
            except IntegrityError:
                if attempt == max_retries - 1:
                    raise
                await self.db.rollback()

    async def update(self, db_quotation: Quotation, data: QuotationUpdate) -> Quotation:
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(db_quotation, field, value)
        await self.db.commit()
        await self.db.refresh(db_quotation)
        return db_quotation

    async def delete(self, db_quotation: Quotation) -> None:
        await self.db.delete(db_quotation)
        await self.db.commit()
