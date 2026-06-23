from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from typing import Optional

class ClientDocumentBase(BaseModel):
    file_name: str
    file_type: Optional[str] = None
    file_size: Optional[int] = None
    notes: Optional[str] = None

class ClientDocumentCreate(ClientDocumentBase):
    pass

class ClientDocumentInDB(ClientDocumentBase):
    id: UUID
    client_id: UUID
    file_path: str
    uploaded_by_id: Optional[UUID] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
