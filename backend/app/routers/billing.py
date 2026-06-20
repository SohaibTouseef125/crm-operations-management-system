from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List, Optional
from uuid import UUID
from decimal import Decimal

from app.database.session import get_db
from app.repositories.billing_repository import BillingRepository
from app.schemas.ops import PaymentCreate, PaymentInDB
from app.schemas.invoice import InvoiceDetailResponse
from app.models.user import User
from app.models.billing import Invoice, Payment, InvoiceStatus
from app.models.client import Client
from app.routers.deps import check_role
from app.core.rbac import BILLING_READ_ROLES, BILLING_WRITE_ROLES
from app.services.activity_log_service import ActivityLogService

router = APIRouter()


# ══════════════════════════════════════════════════════════════════════════════
# PAYMENT ENDPOINTS
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


# ── Financial Reports ─────────────────────────────────────────────────────────

@router.get("/reports/revenue/monthly")
async def monthly_revenue_report(
    year: int = 0,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_role(BILLING_READ_ROLES)),
):
    from datetime import datetime, date
    target_year = year or date.today().year
    query = select(
        func.date_trunc('month', Invoice.created_at).label('month'),
        func.sum(Invoice.total_amount).label('revenue'),
        func.count(Invoice.id).label('count'),
    ).where(
        Invoice.status.in_([InvoiceStatus.PAID, InvoiceStatus.PARTIALLY_PAID]),
        func.extract('year', Invoice.created_at) == target_year,
    ).group_by('month').order_by('month')
    result = await db.execute(query)
    rows = result.all()
    return {
        "year": target_year,
        "data": [
            {
                "month": row.month.strftime("%Y-%m"),
                "revenue": float(row.revenue or 0),
                "invoice_count": row.count,
            }
            for row in rows
        ],
    }


@router.get("/reports/revenue/yearly")
async def yearly_revenue_report(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_role(BILLING_READ_ROLES)),
):
    query = select(
        func.extract('year', Invoice.created_at).label('year'),
        func.sum(Invoice.total_amount).label('revenue'),
        func.count(Invoice.id).label('count'),
    ).where(
        Invoice.status.in_([InvoiceStatus.PAID, InvoiceStatus.PARTIALLY_PAID]),
    ).group_by('year').order_by('year')
    result = await db.execute(query)
    rows = result.all()
    return {
        "data": [
            {"year": int(row.year), "revenue": float(row.revenue or 0), "invoice_count": row.count}
            for row in rows
        ],
    }


@router.get("/reports/revenue/client/{client_id}")
async def client_revenue_report(
    client_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_role(BILLING_READ_ROLES)),
):
    inv_query = select(
        func.sum(Invoice.total_amount).label('total_invoiced'),
        func.count(Invoice.id).label('invoice_count'),
    ).where(Invoice.client_id == client_id)
    inv_row = (await db.execute(inv_query)).one()

    pay_query = select(
        func.sum(Payment.amount).label('total_paid'),
        func.count(Payment.id).label('payment_count'),
    ).where(Payment.client_id == client_id)
    pay_row = (await db.execute(pay_query)).one()

    overdue_query = select(func.count(Invoice.id)).where(
        Invoice.client_id == client_id,
        Invoice.status == InvoiceStatus.OVERDUE,
    )
    overdue_count = (await db.execute(overdue_query)).scalar() or 0

    return {
        "client_id": str(client_id),
        "total_invoiced": float(inv_row.total_invoiced or 0),
        "total_paid": float(pay_row.total_paid or 0),
        "outstanding": float((inv_row.total_invoiced or 0) - (pay_row.total_paid or 0)),
        "invoice_count": inv_row.invoice_count,
        "payment_count": pay_row.payment_count,
        "overdue_invoice_count": overdue_count,
    }


@router.get("/reports/invoices/summary")
async def invoice_summary_report(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_role(BILLING_READ_ROLES)),
):
    query = select(
        Invoice.status,
        func.count(Invoice.id).label('count'),
        func.sum(Invoice.total_amount).label('amount'),
    ).group_by(Invoice.status)
    result = await db.execute(query)
    breakdown = {}
    for row in result:
        breakdown[row.status.value] = {
            "count": row.count,
            "amount": float(row.amount or 0),
        }
    return {"breakdown": breakdown}


@router.get("/reports/payments/monthly")
async def monthly_payments_report(
    year: int = 0,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_role(BILLING_READ_ROLES)),
):
    from datetime import date
    target_year = year or date.today().year
    query = select(
        func.date_trunc('month', Payment.payment_date).label('month'),
        func.sum(Payment.amount).label('collected'),
        func.count(Payment.id).label('count'),
    ).where(
        func.extract('year', Payment.payment_date) == target_year,
    ).group_by('month').order_by('month')
    result = await db.execute(query)
    rows = result.all()
    return {
        "year": target_year,
        "data": [
            {
                "month": row.month.strftime("%Y-%m"),
                "collected": float(row.collected or 0),
                "payment_count": row.count,
            }
            for row in rows
        ],
    }


@router.get("/reports/payments/outstanding")
async def outstanding_report(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_role(BILLING_READ_ROLES)),
):
    query = select(
        Client.id,
        Client.name,
        func.sum(Invoice.total_amount).label('total_invoiced'),
        func.coalesce(
            select(func.sum(Payment.amount)).where(Payment.client_id == Client.id).scalar_subquery(), 0
        ).label('total_paid'),
    ).join(Invoice, Invoice.client_id == Client.id).where(
        Invoice.status.not_in([InvoiceStatus.PAID, InvoiceStatus.CANCELLED]),
    ).group_by(Client.id, Client.name).order_by(Client.name)
    result = await db.execute(query)
    rows = result.all()
    return {
        "data": [
            {
                "client_id": str(row.id),
                "client_name": row.name,
                "total_invoiced": float(row.total_invoiced or 0),
                "total_paid": float(row.total_paid or 0),
                "outstanding": float((row.total_invoiced or 0) - (row.total_paid or 0)),
            }
            for row in rows
        ],
    }
