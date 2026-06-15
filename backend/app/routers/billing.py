from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List, Optional
from uuid import UUID
from decimal import Decimal

from app.database.session import get_db
from app.repositories.billing_repository import BillingRepository
from app.repositories.invoice_repository import InvoiceRepository
from app.schemas.ops import InvoiceCreate, InvoiceUpdate, InvoiceInDB, PaymentCreate, PaymentInDB
from app.schemas.invoice import (
    InvoiceCreateV2, InvoiceUpdateV2, InvoiceDetailResponse, InvoiceItemCreate,
    InvoiceItemUpdate, InvoiceItemInDB, InvoiceSendRequest, PaginatedInvoiceResponse,
)
from app.models.user import User, UserRole
from app.models.billing import Invoice, Payment, InvoiceStatus
from app.models.client import Client
from app.routers.deps import check_role
from app.core.rbac import BILLING_READ_ROLES, BILLING_WRITE_ROLES, INVOICE_DELETE_ROLES, INVOICE_SEND_ROLES
from app.services.activity_log_service import ActivityLogService
from app.services.overdue_service import mark_overdue_invoices

router = APIRouter()


# ══════════════════════════════════════════════════════════════════════════════
# EXISTING ENDPOINTS — preserved for backward compatibility
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/invoices", response_model=PaginatedInvoiceResponse)
async def read_invoices(
    client_id: Optional[UUID] = None,
    search: Optional[str] = None,
    status: Optional[InvoiceStatus] = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_role(BILLING_READ_ROLES)),
):
    """
    List invoices with optional search, status filter, and pagination.
    Backward-compatible: callers without query params receive all invoices (page 1, size 20).
    """
    repo = InvoiceRepository(db)

    # If client_id is provided without pagination intent, return all for that client
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


@router.post("/invoices", response_model=InvoiceDetailResponse, status_code=201)
async def create_invoice(
    invoice_in: InvoiceCreateV2,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_role(BILLING_WRITE_ROLES)),
):
    repo = InvoiceRepository(db)
    invoice = await repo.create_invoice_v2(invoice_in)
    await ActivityLogService.log_activity(
        db, current_user.id, current_user.full_name, "CREATE", "Invoice",
        f"Created invoice {invoice.invoice_number} for client {invoice.client_id} amount {invoice.total_amount}",
        entity_id=invoice.id,
    )
    return invoice


@router.get("/invoices/{invoice_id}", response_model=InvoiceDetailResponse)
async def read_invoice(
    invoice_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_role(BILLING_READ_ROLES)),
):
    repo = InvoiceRepository(db)
    invoice = await repo.get_invoice_with_items(invoice_id)
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return invoice


@router.patch("/invoices/{invoice_id}", response_model=InvoiceDetailResponse)
async def update_invoice(
    invoice_id: UUID,
    invoice_in: InvoiceUpdateV2,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_role(BILLING_WRITE_ROLES)),
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


@router.delete("/invoices/{invoice_id}")
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


# ══════════════════════════════════════════════════════════════════════════════
# LINE ITEM ENDPOINTS
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/invoices/{invoice_id}/items", response_model=List[InvoiceItemInDB])
async def get_invoice_items(
    invoice_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_role(BILLING_READ_ROLES)),
):
    repo = InvoiceRepository(db)
    invoice = await repo.get_invoice_with_items(invoice_id)
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return await repo.get_items(invoice_id)


@router.post("/invoices/{invoice_id}/items", response_model=InvoiceItemInDB, status_code=201)
async def add_invoice_item(
    invoice_id: UUID,
    item_in: InvoiceItemCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_role(BILLING_WRITE_ROLES)),
):
    repo = InvoiceRepository(db)
    invoice = await repo.get_invoice_with_items(invoice_id)
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    if invoice.status != InvoiceStatus.DRAFT:
        raise HTTPException(status_code=422, detail="Line items can only be modified on DRAFT invoices")
    return await repo.add_item(invoice, item_in)


@router.patch("/invoices/{invoice_id}/items/{item_id}", response_model=InvoiceItemInDB)
async def update_invoice_item(
    invoice_id: UUID,
    item_id: UUID,
    item_in: InvoiceItemUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_role(BILLING_WRITE_ROLES)),
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


@router.delete("/invoices/{invoice_id}/items/{item_id}", status_code=204)
async def delete_invoice_item(
    invoice_id: UUID,
    item_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_role(BILLING_WRITE_ROLES)),
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


# ══════════════════════════════════════════════════════════════════════════════
# PDF ENDPOINT
# ══════════════════════════════════════════════════════════════════════════════

@router.post("/invoices/{invoice_id}/pdf")
async def generate_invoice_pdf(
    invoice_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_role(BILLING_WRITE_ROLES)),
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


# ══════════════════════════════════════════════════════════════════════════════
# EMAIL SEND ENDPOINT
# ══════════════════════════════════════════════════════════════════════════════

@router.post("/invoices/{invoice_id}/send")
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

    # Generate PDF
    try:
        from app.services.pdf_service import generate_invoice_pdf as _gen_pdf
        pdf_bytes = _gen_pdf(invoice=invoice, items=invoice.items, client=client)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"PDF generation failed: {str(exc)}")

    # Send email
    try:
        from app.services.email_service import send_invoice_email as _send
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
            detail=f"Email delivery failed: {str(exc)}. Recipients: {send_req.recipients}",
        )

    # Update invoice status and record recipients
    await repo.mark_sent(invoice, send_req.recipients)
    await ActivityLogService.log_activity(
        db, current_user.id, current_user.full_name, "SEND", "Invoice",
        f"Sent invoice {invoice.invoice_number} to {send_req.recipients}",
        entity_id=invoice_id,
    )
    return {"message": "Invoice sent successfully", "recipients": send_req.recipients}


# ══════════════════════════════════════════════════════════════════════════════
# OVERDUE MANUAL TRIGGER (ADMIN only)
# ══════════════════════════════════════════════════════════════════════════════

@router.post("/invoices/mark-overdue")
async def trigger_overdue_detection(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_role([UserRole.ADMIN])),
):
    count = await mark_overdue_invoices(db)
    return {"message": f"Marked {count} invoices as OVERDUE"}


# ══════════════════════════════════════════════════════════════════════════════
# EXISTING PAYMENT ENDPOINTS — unchanged
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/payments", response_model=List[PaymentInDB])
async def read_payments(
    client_id: UUID = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_role(BILLING_READ_ROLES)),
):
    query = select(Payment).order_by(Payment.created_at.desc())
    if client_id:
        query = query.where(Payment.client_id == client_id)
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/payments", response_model=PaymentInDB)
async def create_payment(
    payment_in: PaymentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_role(BILLING_WRITE_ROLES)),
):
    if payment_in.amount <= 0:
        raise HTTPException(status_code=422, detail="Payment amount must be positive")
    repo = BillingRepository(db)
    invoice_result = await db.execute(select(Invoice).where(Invoice.id == payment_in.invoice_id))
    invoice = invoice_result.scalars().first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    paid_res = await db.execute(select(func.sum(Payment.amount)).where(Payment.invoice_id == payment_in.invoice_id))
    total_paid = paid_res.scalar() or 0
    # Use total_amount if available, else legacy amount
    invoice_total = invoice.total_amount or invoice.amount
    remaining = invoice_total - total_paid
    if payment_in.amount > remaining:
        raise HTTPException(status_code=422, detail=f"Payment exceeds remaining invoice balance of {remaining}")
    payment = await repo.create_payment(payment_in)
    await ActivityLogService.log_activity(
        db, current_user.id, current_user.full_name, "CREATE", "Payment",
        f"Recorded payment {payment.id} for invoice {payment.invoice_id} amount {payment.amount}",
        entity_id=payment.id,
    )
    return payment


@router.get("/overdue", response_model=List[InvoiceDetailResponse])
async def get_overdue_invoices(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_role(BILLING_READ_ROLES)),
):
    result = await db.execute(
        select(Invoice).where(Invoice.status == InvoiceStatus.OVERDUE).order_by(Invoice.due_date.asc())
    )
    return result.scalars().all()


@router.get("/balance/{client_id}")
async def get_balance(
    client_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_role(BILLING_READ_ROLES)),
):
    repo = BillingRepository(db)
    balance = await repo.get_client_balance(client_id)
    return {"client_id": client_id, "outstanding_balance": balance}


@router.get("/clients/{client_id}/arrears")
async def get_client_arrears(
    client_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_role(BILLING_READ_ROLES)),
):
    invoice_query = select(func.sum(Invoice.amount)).where(
        Invoice.client_id == client_id,
        Invoice.status.in_([InvoiceStatus.SENT, InvoiceStatus.OVERDUE]),
    )
    invoice_result = await db.execute(invoice_query)
    total_invoiced = invoice_result.scalar() or Decimal(0)

    payment_query = select(func.sum(Payment.amount)).where(Payment.client_id == client_id)
    payment_result = await db.execute(payment_query)
    total_paid = payment_result.scalar() or Decimal(0)
    arrears = total_invoiced - total_paid

    client_result = await db.execute(select(Client).where(Client.id == client_id))
    client = client_result.scalars().first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    return {
        "client_id": str(client_id),
        "client_name": client.name,
        "total_invoiced": float(total_invoiced),
        "total_paid": float(total_paid),
        "outstanding_balance": float(arrears),
        "arrears": float(arrears),
    }


@router.get("/clients/{client_id}/ledger")
async def get_client_ledger(
    client_id: UUID,
    skip: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_role(BILLING_READ_ROLES)),
):
    invoices_result = await db.execute(
        select(Invoice).where(Invoice.client_id == client_id).order_by(Invoice.created_at.desc())
    )
    invoices = invoices_result.scalars().all()

    payments_result = await db.execute(
        select(Payment).where(Payment.client_id == client_id).order_by(Payment.created_at.desc())
    )
    payments = payments_result.scalars().all()

    ledger = []
    for inv in invoices:
        ledger.append({
            "type": "INVOICE",
            "id": str(inv.id),
            "amount": float(inv.total_amount or inv.amount),
            "status": inv.status,
            "date": inv.created_at.isoformat(),
            "due_date": inv.due_date.isoformat() if inv.due_date else None,
        })
    for pay in payments:
        ledger.append({
            "type": "PAYMENT",
            "id": str(pay.id),
            "invoice_id": str(pay.invoice_id),
            "amount": float(pay.amount),
            "date": pay.payment_date.isoformat(),
        })

    ledger.sort(key=lambda x: x["date"], reverse=True)
    total = len(ledger)
    return {"total": total, "items": ledger[skip: skip + limit]}
