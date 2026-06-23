from pydantic import BaseModel, field_validator
from uuid import UUID
from datetime import datetime, date, timezone
from typing import Optional, List
from app.models.lead import LeadStage, LeadActivityType
from app.schemas.device import DeviceInDB

VALID_SERVICES = ['AquaSave Pro', 'Ag5x', 'Faas', 'Drone Spray', 'Drone Survey']

# ── Lead Activity Schemas ─────────────────────────────────
class LeadActivityCreate(BaseModel):
    activity_type: LeadActivityType
    scheduled_at: Optional[datetime] = None
    notes: Optional[str] = None

class LeadActivityInDB(LeadActivityCreate):
    id: UUID
    lead_id: UUID
    created_by_id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# ── Lead Schemas ──────────────────────────────────────────
class LeadBase(BaseModel):
    name: str
    contact_mobile: str
    company_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    location: str
    address: Optional[str] = None
    stage: LeadStage = LeadStage.DISCOVERY
    assigned_to_id: Optional[UUID] = None
    notes: Optional[str] = None
    services_interested: Optional[List[str]] = None
    other_services: Optional[str] = None
    next_follow_up: Optional[date] = None
    quotation_file_url: Optional[str] = None
    client_id: Optional[UUID] = None

class LeadCreate(LeadBase):

    @field_validator("services_interested")
    @classmethod
    def validate_services(cls, v):
        if v is not None:
            for s in v:
                if s not in VALID_SERVICES:
                    raise ValueError(f"Invalid service '{s}'. Allowed: {VALID_SERVICES}")
        return v

    @field_validator("next_follow_up")
    @classmethod
    def validate_next_follow_up(cls, v):
        if v is not None and v < date.today():
            raise ValueError("next_follow_up must be >= current date")
        return v

class LeadUpdate(BaseModel):
    name: Optional[str] = None
    contact_mobile: Optional[str] = None
    company_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    address: Optional[str] = None
    stage: Optional[LeadStage] = None
    assigned_to_id: Optional[UUID] = None
    notes: Optional[str] = None
    services_interested: Optional[List[str]] = None
    other_services: Optional[str] = None
    next_follow_up: Optional[date] = None
    quotation_file_url: Optional[str] = None
    client_id: Optional[UUID] = None
    quotation_requested_at: Optional[datetime] = None
    quotation_uploaded_by: Optional[UUID] = None

    @field_validator("services_interested")
    @classmethod
    def validate_services(cls, v):
        if v is not None:
            for s in v:
                if s not in VALID_SERVICES:
                    raise ValueError(f"Invalid service '{s}'. Allowed: {VALID_SERVICES}")
        return v

    @field_validator("next_follow_up")
    @classmethod
    def validate_next_follow_up(cls, v):
        if v is not None and v < date.today():
            raise ValueError("next_follow_up must be >= current date")
        return v

class LeadInDB(LeadBase):
    id: UUID
    # Make nullable fields Optional to handle existing DB records with NULLs
    contact_mobile: Optional[str] = None
    location: Optional[str] = None
    assigned_to_id: Optional[UUID] = None
    quotation_requested_at: Optional[datetime] = None
    quotation_uploaded_by: Optional[UUID] = None
    created_at: datetime
    updated_at: datetime
    activities: List[LeadActivityInDB] = []

    class Config:
        from_attributes = True

# ── Client Schemas ────────────────────────────────────────
class ClientBase(BaseModel):
    name: str
    company_name: str
    contact_person: Optional[str] = None
    designation: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    ntn: Optional[str] = None
    strn: Optional[str] = None
    industry: Optional[str] = None
    source_of_lead: Optional[str] = None
    farm_size: Optional[float] = None
    address: Optional[str] = None
    contact_info: Optional[str] = None
    onboarding_date: Optional[date] = None
    crop_cycle_end_date: Optional[date] = None
    services: Optional[List[str]] = None
    farm_location: Optional[str] = None
    third_party_credentials: Optional[dict] = None
    contract_value: Optional[float] = 0.0
    contract_start_date: Optional[date] = None
    contract_end_date: Optional[date] = None
    contract_status: Optional[str] = None

class ClientCreate(ClientBase):
    pass

class ClientUpdate(BaseModel):
    name: Optional[str] = None
    company_name: Optional[str] = None
    contact_person: Optional[str] = None
    designation: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    ntn: Optional[str] = None
    strn: Optional[str] = None
    industry: Optional[str] = None
    source_of_lead: Optional[str] = None
    farm_size: Optional[float] = None
    address: Optional[str] = None
    contact_info: Optional[str] = None
    onboarding_date: Optional[date] = None
    crop_cycle_end_date: Optional[date] = None
    services: Optional[List[str]] = None
    farm_location: Optional[str] = None
    third_party_credentials: Optional[dict] = None
    contract_value: Optional[float] = None
    contract_start_date: Optional[date] = None
    contract_end_date: Optional[date] = None
    contract_status: Optional[str] = None


class ClientInDB(ClientBase):
    id: UUID
    created_at: datetime
    updated_at: datetime
    devices: List[DeviceInDB] = []

    class Config:
        from_attributes = True
