from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List, Optional
from uuid import UUID

from app.database.session import get_db
from app.repositories.billing_repository import BillingRepository
from app.repositories.invoice_repository import InvoiceRepository
from app.schemas.invoice import (
    InvoiceCreateV2, InvoiceUpdateV2, InvoiceDetailResponse, InvoiceItemCreate,
    InvoiceItemUpdate, InvoiceItemInDB, InvoiceSendRequest, PaginatedInvoiceResponse,
)
from app.models.user import User, UserRole
from app.models.billing import Invoice, Payment, InvoiceStatus
from app.models.client import Client
from app.routers.deps import check_role
from app.core.rbac import INVOICE_READ_ROLES, INVOICE_WRITE_ROLES, INVOICE_DELETE_ROLES, INVOICE_SEND_ROLES
import logging

from app.services.activity_log_service import ActivityLogService
from app.services.overdue_service import run_invoice_automation

router = APIRouter()


@router.get("/", response_model=PaginatedInvoiceResponse)
async def read_invoices(
    client_id: Optional[UUID] = None,
    search: Optional[str] = None,
    status: Optional[InvoiceStatus] = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_role(INVOICE_READ_ROLES)),
):
    repo = InvoiceRepository(db)
    if client_id and not search and not status:
        legacy_repo = BillingRepository(db)
        legacy_invoices = await legacy_repo.get_invoices(client_id)
        return PaginatedInvoiceResponse(
            total=len(legacy_invoices),
            page=1,
            page_size=len(legacy_invoices) or 20,
            items=legacy_invoices,
        )
    total, invoices = await repo.get_invoices_paginated(
        search=search, status=status, page=page, page_size=page_size
    )
    return PaginatedInvoiceResponse(total=total, page=page, page_size=page_size, items=invoices)


@router.post("/", response_model=InvoiceDetailResponse, status_code=201)
async def create_invoice(
    invoice_in: InvoiceCreateV2,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_role(INVOICE_WRITE_ROLES)),
):
    repo = InvoiceRepository(db)
    invoice = await repo.create_invoice_v2(invoice_in)
    await ActivityLogService.log_activity(
        db, current_user.id, current_user.full_name, "CREATE", "Invoice",
        f"Created invoice {invoice.invoice_number} for client {invoice.client_id} amount {invoice.total_amount}",
        entity_id=invoice.id,
    )
    return invoice


@router.get("/{invoice_id}", response_model=InvoiceDetailResponse)
async def read_invoice(
    invoice_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_role(INVOICE_READ_ROLES)),
):
    repo = InvoiceRepository(db)
    invoice = await repo.get_invoice_with_items(invoice_id)
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return invoice


@router.patch("/{invoice_id}", response_model=InvoiceDetailResponse)
async def update_invoice(
    invoice_id: UUID,
    invoice_in: InvoiceUpdateV2,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_role(INVOICE_WRITE_ROLES)),
):
    repo = InvoiceRepository(db)
    db_invoice = await repo.get_invoice_with_items(invoice_id)
    if not db_invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    if db_invoice.status == InvoiceStatus.PAID and invoice_in.status and invoice_in.status != InvoiceStatus.PAID:
        raise HTTPException(status_code=422, detail="Cannot change status of a paid invoice")
    previous = {"status": db_invoice.status.value, "amount": str(db_invoice.total_amount or db_invoice.amount)}
    updated = await repo.update_invoice_v2(db_invoice, invoice_in)
    await ActivityLogService.log_activity(
        db, current_user.id, current_user.full_name, "UPDATE", "Invoice",
        f"Updated invoice {invoice_id}",
        entity_id=invoice_id,
        previous_value=str(previous),
        new_value=str(invoice_in.model_dump(exclude_unset=True)),
    )
    return updated


@router.delete("/{invoice_id}")
async def delete_invoice(
    invoice_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_role(INVOICE_DELETE_ROLES)),
):
    legacy_repo = BillingRepository(db)
    db_invoice = await legacy_repo.get_invoice_by_id(invoice_id)
    if not db_invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    if db_invoice.status == InvoiceStatus.PAID:
        raise HTTPException(status_code=422, detail="Cannot delete a paid invoice. Cancel instead.")
    paid_res = await db.execute(select(func.sum(Payment.amount)).where(Payment.invoice_id == invoice_id))
    if (paid_res.scalar() or 0) > 0:
        raise HTTPException(status_code=422, detail="Cannot delete invoice with recorded payments")
    await ActivityLogService.log_activity(
        db, current_user.id, current_user.full_name, "DELETE", "Invoice",
        f"Deleted invoice {invoice_id} amount {db_invoice.amount}",
        entity_id=invoice_id,
    )
    await legacy_repo.delete_invoice(db_invoice)
    return {"message": "Invoice deleted successfully"}


@router.get("/{invoice_id}/items", response_model=List[InvoiceItemInDB])
async def get_invoice_items(
    invoice_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_role(INVOICE_READ_ROLES)),
):
    repo = InvoiceRepository(db)
    invoice = await repo.get_invoice_with_items(invoice_id)
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return await repo.get_items(invoice_id)


@router.post("/{invoice_id}/items", response_model=InvoiceItemInDB, status_code=201)
async def add_invoice_item(
    invoice_id: UUID,
    item_in: InvoiceItemCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_role(INVOICE_WRITE_ROLES)),
):
    repo = InvoiceRepository(db)
    invoice = await repo.get_invoice_with_items(invoice_id)
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    if invoice.status != InvoiceStatus.DRAFT:
        raise HTTPException(status_code=422, detail="Line items can only be modified on DRAFT invoices")
    return await repo.add_item(invoice, item_in)


@router.patch("/{invoice_id}/items/{item_id}", response_model=InvoiceItemInDB)
async def update_invoice_item(
    invoice_id: UUID,
    item_id: UUID,
    item_in: InvoiceItemUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_role(INVOICE_WRITE_ROLES)),
):
    repo = InvoiceRepository(db)
    invoice = await repo.get_invoice_with_items(invoice_id)
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    if invoice.status != InvoiceStatus.DRAFT:
        raise HTTPException(status_code=422, detail="Line items can only be modified on DRAFT invoices")
    item = await repo.get_item(item_id, invoice_id)
    if not item:
        raise HTTPException(status_code=404, detail="Invoice item not found")
    return await repo.update_item(item, item_in, invoice)


@router.delete("/{invoice_id}/items/{item_id}", status_code=204)
async def delete_invoice_item(
    invoice_id: UUID,
    item_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_role(INVOICE_WRITE_ROLES)),
):
    repo = InvoiceRepository(db)
    invoice = await repo.get_invoice_with_items(invoice_id)
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    if invoice.status != InvoiceStatus.DRAFT:
        raise HTTPException(status_code=422, detail="Line items can only be modified on DRAFT invoices")
    item = await repo.get_item(item_id, invoice_id)
    if not item:
        raise HTTPException(status_code=404, detail="Invoice item not found")
    await repo.delete_item(item, invoice)


@router.post("/{invoice_id}/pdf")
async def generate_invoice_pdf(
    invoice_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_role(INVOICE_WRITE_ROLES)),
):
    repo = InvoiceRepository(db)
    invoice = await repo.get_invoice_with_items(invoice_id)
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    client_result = await db.execute(select(Client).where(Client.id == invoice.client_id))
    client = client_result.scalars().first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    try:
        from app.services.pdf_service import generate_invoice_pdf as _gen_pdf
        pdf_bytes = _gen_pdf(invoice=invoice, items=invoice.items, client=client)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"PDF generation failed: {str(exc)}")

    invoice_number = invoice.invoice_number or str(invoice.id)[:8].upper()
    filename = f"invoice_{invoice_number}.pdf"

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post("/{invoice_id}/send")
async def send_invoice_email(
    invoice_id: UUID,
    send_req: InvoiceSendRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_role(INVOICE_SEND_ROLES)),
):
    repo = InvoiceRepository(db)
    invoice = await repo.get_invoice_with_items(invoice_id)
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    if invoice.status == InvoiceStatus.CANCELLED:
        raise HTTPException(status_code=422, detail="Cannot send a cancelled invoice")
    if invoice.status == InvoiceStatus.PAID:
        raise HTTPException(status_code=422, detail="Invoice is already paid")

    client_result = await db.execute(select(Client).where(Client.id == invoice.client_id))
    client = client_result.scalars().first()

    try:
        from app.services.pdf_service import generate_invoice_pdf as _gen_pdf
        pdf_bytes = _gen_pdf(invoice=invoice, items=invoice.items, client=client)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"PDF generation failed: {str(exc)}")

    from app.services.email_service import send_invoice_email as _send
    try:
        await _send(
            invoice=invoice,
            pdf_bytes=pdf_bytes,
            recipients=send_req.recipients,
            subject=send_req.subject,
            message=send_req.message,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Failed to send email: {str(exc)}",
        )

    await repo.mark_sent(invoice, send_req.recipients)
    await ActivityLogService.log_activity(
        db, current_user.id, current_user.full_name, "SEND", "Invoice",
        f"Sent invoice {invoice.invoice_number} to {send_req.recipients}",
        entity_id=invoice_id,
    )
    return {"message": "Invoice sent successfully", "recipients": send_req.recipients}


@router.post("/mark-overdue")
async def trigger_overdue_detection(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_role([UserRole.ADMIN])),
):
    await run_invoice_automation(db)
    return {"message": "Invoice automation job completed successfully"}
