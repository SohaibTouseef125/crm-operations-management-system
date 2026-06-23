from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from uuid import UUID
import os
import shutil

from app.database.session import get_db
from app.schemas.document import ClientDocumentCreate, ClientDocumentInDB
from app.models.user import User, UserRole
from app.models.document import ClientDocument
from app.routers.deps import check_role
from app.core.rbac import CLIENT_READ_ROLES
from app.services.activity_log_service import ActivityLogService

router = APIRouter()

UPLOAD_DIR = "uploads/documents"

@router.get("/", response_model=List[ClientDocumentInDB])
async def list_client_documents(
    client_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_role(CLIENT_READ_ROLES))
):
    result = await db.execute(
        select(ClientDocument).where(ClientDocument.client_id == client_id).order_by(ClientDocument.created_at.desc())
    )
    return result.scalars().all()

@router.post("/upload", response_model=ClientDocumentInDB, status_code=201)
async def upload_client_document(
    client_id: UUID,
    file: UploadFile = File(...),
    notes: Optional[str] = Form(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_role(CLIENT_READ_ROLES))
):
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    file_ext = os.path.splitext(file.filename)[1] if file.filename else ""
    safe_name = f"{client_id}_{current_user.id}_{file.filename}"
    file_path = os.path.join(UPLOAD_DIR, safe_name)

    with open(file_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    doc = ClientDocument(
        client_id=client_id,
        file_name=file.filename or "unnamed",
        file_path=file_path,
        file_type=file.content_type,
        file_size=os.path.getsize(file_path),
        uploaded_by_id=current_user.id,
        notes=notes,
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc)

    await ActivityLogService.log_activity(
        db, current_user.id, current_user.full_name, "UPLOAD", "Document",
        f"Uploaded document '{doc.file_name}'", entity_id=doc.id, role=current_user.role
    )
    return doc

@router.delete("/{document_id}", status_code=204)
async def delete_client_document(
    client_id: UUID,
    document_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_role([UserRole.ADMIN, UserRole.MANAGER]))
):
    result = await db.execute(
        select(ClientDocument).where(ClientDocument.id == document_id, ClientDocument.client_id == client_id)
    )
    doc = result.scalars().first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    if os.path.exists(doc.file_path):
        os.remove(doc.file_path)
    
    await db.delete(doc)
    await db.commit()
