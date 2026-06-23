from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel, EmailStr

from app.database.session import get_db
from app.repositories.quotation_repository import QuotationRepository
from app.repositories.invoice_repository import InvoiceRepository
from app.schemas.quotation import QuotationCreate, QuotationUpdate, QuotationInDB, QuotationItemBase, QuotationApprove
from app.schemas.invoice import InvoiceDetailResponse
from app.models.user import User, UserRole
from app.models.client import Client
from app.routers.deps import get_current_user, check_role
from app.services.activity_log_service import ActivityLogService

router = APIRouter()

QUOTATION_VIEW_ROLES = [UserRole.ADMIN, UserRole.MANAGER, UserRole.BUSINESS, UserRole.ACCOUNTS]
QUOTATION_WRITE_ROLES = [UserRole.ADMIN, UserRole.MANAGER, UserRole.ACCOUNTS]

@router.get("/", response_model=List[QuotationInDB])
async def read_quotations(
    client_id: Optional[UUID] = None,
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_role(QUOTATION_VIEW_ROLES))
):
    repo = QuotationRepository(db)
    return await repo.get_all(skip=skip, limit=limit, client_id=client_id)

@router.post("/", response_model=QuotationInDB, status_code=201)
async def create_quotation(
    quotation_in: QuotationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_role(QUOTATION_WRITE_ROLES))
):
    repo = QuotationRepository(db)
    quotation = await repo.create(quotation_in)
    await ActivityLogService.log_activity(
        db, current_user.id, current_user.full_name, "CREATE", "Quotation",
        f"Created quotation '{quotation.quote_number}'", entity_id=quotation.id, role=current_user.role
    )
    return quotation

@router.get("/{quotation_id}", response_model=QuotationInDB)
async def read_quotation(
    quotation_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_role(QUOTATION_VIEW_ROLES))
):
    repo = QuotationRepository(db)
    quotation = await repo.get_by_id(quotation_id)
    if not quotation:
        raise HTTPException(status_code=404, detail="Quotation not found")
    return quotation

@router.patch("/{quotation_id}", response_model=QuotationInDB)
async def update_quotation(
    quotation_id: UUID,
    data: QuotationUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_role(QUOTATION_WRITE_ROLES))
):
    repo = QuotationRepository(db)
    quotation = await repo.get_by_id(quotation_id)
    if not quotation:
        raise HTTPException(status_code=404, detail="Quotation not found")
    updated = await repo.update(quotation, data)
    await ActivityLogService.log_activity(
        db, current_user.id, current_user.full_name, "UPDATE", "Quotation",
        f"Updated quotation '{updated.quote_number}'", entity_id=updated.id, role=current_user.role
    )
    return updated

@router.delete("/{quotation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_quotation(
    quotation_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_role([UserRole.ADMIN]))
):
    repo = QuotationRepository(db)
    quotation = await repo.get_by_id(quotation_id)
    if not quotation:
        raise HTTPException(status_code=404, detail="Quotation not found")
    await ActivityLogService.log_activity(
        db, current_user.id, current_user.full_name, "DELETE", "Quotation",
        f"Deleted quotation '{quotation.quote_number}'", entity_id=quotation_id, role=current_user.role
    )
    await repo.delete(quotation)

@router.post("/{quotation_id}/approve", response_model=QuotationInDB)
async def approve_quotation(
    quotation_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_role([UserRole.ADMIN]))
):
    repo = QuotationRepository(db)
    quotation = await repo.get_by_id(quotation_id)
    if not quotation:
        raise HTTPException(status_code=404, detail="Quotation not found")
    if quotation.status != "DRAFT":
        raise HTTPException(status_code=422, detail="Only DRAFT quotations can be approved")
    quotation.status = "APPROVED"
    await db.commit()
    await db.refresh(quotation)
    await ActivityLogService.log_activity(
        db, current_user.id, current_user.full_name, "APPROVE", "Quotation",
        f"Approved quotation '{quotation.quote_number}'", entity_id=quotation.id, role=current_user.role
    )
    return quotation

@router.post("/{quotation_id}/convert-to-invoice", response_model=InvoiceDetailResponse, status_code=201)
async def convert_quotation_to_invoice(
    quotation_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_role([UserRole.ADMIN, UserRole.ACCOUNTS]))
):
    repo = QuotationRepository(db)
    quotation = await repo.get_by_id(quotation_id)
    if not quotation:
        raise HTTPException(status_code=404, detail="Quotation not found")

    invoice_repo = InvoiceRepository(db)
    invoice_data = {
        "client_id": quotation.client_id,
        "due_date": quotation.expiry_date,
        "invoice_date": quotation.date,
        "subtotal": quotation.subtotal,
        "tax_percentage": quotation.tax_percentage,
        "tax_amount": quotation.tax_amount,
        "total_amount": quotation.grand_total,
        "notes": quotation.notes,
        "items": [
            {"item_name": item.description, "unit_price": item.unit_price, "serial_number": i + 1}
            for i, item in enumerate(quotation.items)
        ],
    }

    from app.schemas.invoice import InvoiceCreateV2
    invoice_create = InvoiceCreateV2(**invoice_data)
    invoice = await invoice_repo.create_invoice_v2(invoice_create)

    await ActivityLogService.log_activity(
        db, current_user.id, current_user.full_name, "CREATE", "Invoice",
        f"Created invoice from quotation '{quotation.quote_number}'",
        entity_id=invoice.id, role=current_user.role
    )
    return invoice


class QuotationSendRequest(BaseModel):
    recipients: List[EmailStr]
    subject: Optional[str] = None
    message: Optional[str] = None


@router.post("/{quotation_id}/duplicate", response_model=QuotationInDB, status_code=201)
async def duplicate_quotation(
    quotation_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_role(QUOTATION_WRITE_ROLES))
):
    repo = QuotationRepository(db)
    quotation = await repo.get_by_id(quotation_id)
    if not quotation:
        raise HTTPException(status_code=404, detail="Quotation not found")

    items_data = [
        QuotationItemBase(description=item.description, quantity=item.quantity, unit_price=item.unit_price)
        for item in quotation.items
    ]

    new_quotation = QuotationCreate(
        client_id=quotation.client_id,
        expiry_date=quotation.expiry_date,
        subtotal=quotation.subtotal,
        tax_percentage=quotation.tax_percentage,
        tax_amount=quotation.tax_amount,
        discount=quotation.discount,
        grand_total=quotation.grand_total,
        terms_and_conditions=quotation.terms_and_conditions,
        notes=quotation.notes,
        items=items_data,
    )

    created = await repo.create(new_quotation)
    await ActivityLogService.log_activity(
        db, current_user.id, current_user.full_name, "CREATE", "Quotation",
        f"Duplicated quotation '{quotation.quote_number}' as '{created.quote_number}'",
        entity_id=created.id, role=current_user.role
    )
    return created


@router.post("/{quotation_id}/pdf")
async def download_quotation_pdf(
    quotation_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_role(QUOTATION_VIEW_ROLES))
):
    repo = QuotationRepository(db)
    quotation = await repo.get_by_id(quotation_id)
    if not quotation:
        raise HTTPException(status_code=404, detail="Quotation not found")

    client_result = await db.execute(select(Client).where(Client.id == quotation.client_id))
    client = client_result.scalars().first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    try:
        from app.services.pdf_service import generate_quotation_pdf as _gen_pdf
        pdf_bytes = _gen_pdf(quotation=quotation, items=quotation.items, client=client)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"PDF generation failed: {str(exc)}")

    filename = f"quotation_{quotation.quote_number}.pdf"

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post("/{quotation_id}/email")
async def email_quotation(
    quotation_id: UUID,
    send_req: QuotationSendRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_role(QUOTATION_WRITE_ROLES))
):
    repo = QuotationRepository(db)
    quotation = await repo.get_by_id(quotation_id)
    if not quotation:
        raise HTTPException(status_code=404, detail="Quotation not found")

    client_result = await db.execute(select(Client).where(Client.id == quotation.client_id))
    client = client_result.scalars().first()

    try:
        from app.services.pdf_service import generate_quotation_pdf as _gen_pdf
        pdf_bytes = _gen_pdf(quotation=quotation, items=quotation.items, client=client)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"PDF generation failed: {str(exc)}")

    from app.services.email_service import send_quotation_email as _send
    try:
        await _send(
            quotation=quotation,
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

    await ActivityLogService.log_activity(
        db, current_user.id, current_user.full_name, "SEND", "Quotation",
        f"Sent quotation '{quotation.quote_number}' to {send_req.recipients}",
        entity_id=quotation_id, role=current_user.role
    )
    return {"message": "Quotation sent successfully", "recipients": send_req.recipients}
