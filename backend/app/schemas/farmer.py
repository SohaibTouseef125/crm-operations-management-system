from pydantic import BaseModel, Field
from uuid import UUID
from datetime import datetime
from typing import Optional, List
from app.models.farmer import PipelineStage

class FarmerBase(BaseModel):
    name: str
    contact_mobile: str
    phone_whatsapp: Optional[str] = None
    email: Optional[str] = None
    cnic: Optional[str] = Field(None, max_length=15)
    address: Optional[str] = None
    village: Optional[str] = None
    tehsil: Optional[str] = None
    district: Optional[str] = None
    assigned_agent_id: Optional[UUID] = None
    client_id: Optional[UUID] = None
    pipeline_stage: PipelineStage = PipelineStage.PROSPECT
    lead_source: Optional[str] = None
    tags: Optional[List[str]] = None
    total_credit_limit: float = 0.0

class FarmerCreate(FarmerBase):
    pass

class FarmerUpdate(BaseModel):
    name: Optional[str] = None
    contact_mobile: Optional[str] = None
    phone_whatsapp: Optional[str] = None
    email: Optional[str] = None
    cnic: Optional[str] = None
    address: Optional[str] = None
    village: Optional[str] = None
    tehsil: Optional[str] = None
    district: Optional[str] = None
    assigned_agent_id: Optional[UUID] = None
    client_id: Optional[UUID] = None
    pipeline_stage: Optional[PipelineStage] = None
    lead_source: Optional[str] = None
    tags: Optional[List[str]] = None
    total_credit_limit: Optional[float] = None

class FarmerInDB(FarmerBase):
    id: UUID
    created_at: datetime
    updated_at: datetime
    total_contract_value: float
    outstanding_balance: float
    assigned_agent_name: Optional[str] = None

    class Config:
        from_attributes = True
