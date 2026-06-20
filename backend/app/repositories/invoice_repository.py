"""
Extended invoice repository with support for:
- Paginated, searchable invoice listing
- Invoice creation with items
- Line item CRUD with automatic recalculation
"""

import math
from decimal import Decimal, ROUND_HALF_UP
from datetime import date, timezone, datetime
from typing import List, Optional
from uuid import UUID

from sqlalchemy import select, func, or_, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.billing import Invoice, InvoiceStatus
from app.models.client import Client
from app.models.invoice_item import InvoiceItem
from app.models.invoice_recipient import InvoiceRecipient
from app.schemas.invoice import InvoiceCreateV2, InvoiceUpdateV2, InvoiceItemCreate, InvoiceItemUpdate
from app.services.invoice_number_service import generate_invoice_number

DEFAULT_PAYMENT_TERMS = (
    "Payment can be made in the form of Cheque to the favour of Crop2X Pvt Ltd. "
    "The Quotation is valid for 30 days."
)
DEFAULT_BANK_DETAILS = (
    "Meezan Bank, Title: Crop2X (Private) Limited, "
    "Account no: 9952-0105470950, IBAN: PK14MEZN0099520105470950"
)


class InvoiceRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    # ── Listing ──────────────────────────────────────────────────────────────

    async def get_invoices_paginated(
        self,
        search: Optional[str] = None,
        status: Optional[InvoiceStatus] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[int, List[Invoice]]:
        """Returns (total_count, invoices_for_page)."""
        query = (
            select(Invoice)
            .options(selectinload(Invoice.items))
            .join(Client, Invoice.client_id == Client.id)
            .order_by(Invoice.created_at.desc())
        )

        if status:
            query = query.where(Invoice.status == status)

        if search:
            pattern = f"%{search}%"
            query = query.where(
                or_(
                    Invoice.invoice_number.ilike(pattern),
                    Client.name.ilike(pattern),
                    Client.company_name.ilike(pattern),
                )
            )

        count_query = select(func.count()).select_from(query.subquery())
        total_result = await self.db.execute(count_query)
        total = total_result.scalar() or 0

        offset = (page - 1) * page_size
        result = await self.db.execute(query.offset(offset).limit(page_size))
        items = result.scalars().all()

        return total, list(items)

    # ── Single invoice ────────────────────────────────────────────────────────

    async def get_invoice_with_items(self, invoice_id: UUID) -> Optional[Invoice]:
        result = await self.db.execute(
            select(Invoice)
            .options(selectinload(Invoice.items))
            .where(Invoice.id == invoice_id)
        )
        return result.scalars().first()

    # ── Create ────────────────────────────────────────────────────────────────

    async def create_invoice_v2(self, invoice_in: InvoiceCreateV2) -> Invoice:
        today = datetime.now(timezone.utc).date()
        invoice_date = invoice_in.invoice_date or today
        invoice_number = await generate_invoice_number(self.db)

        db_invoice = Invoice(
            client_id=invoice_in.client_id,
            invoice_number=invoice_number,
            invoice_date=invoice_date,
            due_date=invoice_in.due_date,
            status=invoice_in.status or InvoiceStatus.DRAFT,
            tax_percentage=invoice_in.tax_percentage if invoice_in.tax_percentage is not None else Decimal("15.00"),
            payment_terms=invoice_in.payment_terms or DEFAULT_PAYMENT_TERMS,
            bank_details=invoice_in.bank_details or DEFAULT_BANK_DETAILS,
            notes=invoice_in.notes,
            subtotal=Decimal("0"),
            tax_amount=Decimal("0"),
            total_amount=Decimal("0"),
            amount=Decimal("0"),  # legacy field
        )
        self.db.add(db_invoice)
        await self.db.flush()  # get ID without committing

        # Add line items
        if invoice_in.items:
            for idx, item_data in enumerate(invoice_in.items, start=1):
                serial = item_data.serial_number or idx
                item = InvoiceItem(
                    invoice_id=db_invoice.id,
                    serial_number=serial,
                    item_name=item_data.item_name,
                    description=item_data.description,
                    unit_price=item_data.unit_price,
                )
                self.db.add(item)
        elif invoice_in.amount is not None:
            # Legacy support: create single line item from amount
            item = InvoiceItem(
                invoice_id=db_invoice.id,
                serial_number=1,
                item_name="Service",
                unit_price=invoice_in.amount,
            )
            self.db.add(item)
        if invoice_in.items or invoice_in.amount is not None:
            await self.db.flush()

        # Recalculate totals
        await self._recalculate_totals(db_invoice)
        await self.db.commit()
        await self.db.refresh(db_invoice)
        return db_invoice

    # ── Line Item CRUD ────────────────────────────────────────────────────────

    async def get_items(self, invoice_id: UUID) -> List[InvoiceItem]:
        result = await self.db.execute(
            select(InvoiceItem)
            .where(InvoiceItem.invoice_id == invoice_id)
            .order_by(InvoiceItem.serial_number)
        )
        return list(result.scalars().all())

    async def add_item(self, invoice: Invoice, item_in: InvoiceItemCreate) -> InvoiceItem:
        # Auto-assign serial_number if not provided
        if item_in.serial_number is None:
            max_result = await self.db.execute(
                select(func.max(InvoiceItem.serial_number)).where(
                    InvoiceItem.invoice_id == invoice.id
                )
            )
            max_serial = max_result.scalar() or 0
            serial = max_serial + 1
        else:
            serial = item_in.serial_number

        item = InvoiceItem(
            invoice_id=invoice.id,
            serial_number=serial,
            item_name=item_in.item_name,
            description=item_in.description,
            unit_price=item_in.unit_price,
        )
        self.db.add(item)
        await self.db.flush()
        await self._recalculate_totals(invoice)
        await self.db.commit()
        await self.db.refresh(item)
        return item

    async def get_item(self, item_id: UUID, invoice_id: UUID) -> Optional[InvoiceItem]:
        result = await self.db.execute(
            select(InvoiceItem).where(
                InvoiceItem.id == item_id,
                InvoiceItem.invoice_id == invoice_id,
            )
        )
        return result.scalars().first()

    async def update_item(self, item: InvoiceItem, item_in: InvoiceItemUpdate, invoice: Invoice) -> InvoiceItem:
        update_data = item_in.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(item, field, value)
        await self.db.flush()
        await self._recalculate_totals(invoice)
        await self.db.commit()
        await self.db.refresh(item)
        return item

    async def delete_item(self, item: InvoiceItem, invoice: Invoice) -> None:
        await self.db.delete(item)
        await self.db.flush()
        await self._recalculate_totals(invoice)
        await self.db.commit()

    # ── Update invoice ────────────────────────────────────────────────────────

    async def update_invoice_v2(self, invoice: Invoice, invoice_in: InvoiceUpdateV2) -> Invoice:
        update_data = invoice_in.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(invoice, field, value)

        # If tax_percentage changed, recalculate
        if "tax_percentage" in update_data:
            await self._recalculate_totals(invoice)

        await self.db.commit()
        await self.db.refresh(invoice)
        return invoice

    # ── Mark sent ─────────────────────────────────────────────────────────────

    async def mark_sent(self, invoice: Invoice, recipients: List[str]) -> Invoice:
        invoice.status = InvoiceStatus.SENT
        # Strip timezone info — DB column is TIMESTAMP WITHOUT TIME ZONE
        invoice.sent_at = datetime.now(timezone.utc).replace(tzinfo=None)
        for email in recipients:
            rec = InvoiceRecipient(invoice_id=invoice.id, email=email)
            self.db.add(rec)
        await self.db.commit()
        await self.db.refresh(invoice)
        return invoice

    # ── Internal calculation ──────────────────────────────────────────────────

    async def _recalculate_totals(self, invoice: Invoice) -> None:
        """Recalculate subtotal, tax_amount, total_amount from current items."""
        result = await self.db.execute(
            select(func.sum(InvoiceItem.unit_price)).where(
                InvoiceItem.invoice_id == invoice.id
            )
        )
        subtotal = result.scalar() or Decimal("0")

        tax_pct = invoice.tax_percentage if invoice.tax_percentage is not None else Decimal("15")
        tax_amount = (subtotal * tax_pct / Decimal("100")).quantize(
            Decimal("0.01"), rounding=ROUND_HALF_UP
        )
        total_amount = subtotal + tax_amount

        invoice.subtotal = subtotal
        invoice.tax_amount = tax_amount
        invoice.total_amount = total_amount
        # Keep legacy amount field in sync
        invoice.amount = total_amount if total_amount > 0 else invoice.amount
