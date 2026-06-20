from pydantic import BaseModel
from uuid import UUID
from datetime import datetime, date
from typing import Optional, List
from app.models.farm import OwnershipType, WaterSource, SoilType

class FarmBase(BaseModel):
    farmer_id: UUID
    farm_name: str
    total_acreage: float
    location_address: Optional[str] = None
    gps_lat: Optional[float] = None
    gps_lng: Optional[float] = None
    ownership_type: Optional[OwnershipType] = None
    water_source: Optional[WaterSource] = None
    soil_type: Optional[SoilType] = None
    primary_crop: Optional[str] = None
    secondary_crop: Optional[str] = None
    crop_types: Optional[List[str]] = None
    contract_start_date: Optional[date] = None
    contract_end_date: Optional[date] = None
    services_active: Optional[List[str]] = None

class FarmCreate(FarmBase):
    pass

class FarmUpdate(BaseModel):
    farm_name: Optional[str] = None
    total_acreage: Optional[float] = None
    location_address: Optional[str] = None
    gps_lat: Optional[float] = None
    gps_lng: Optional[float] = None
    ownership_type: Optional[OwnershipType] = None
    water_source: Optional[WaterSource] = None
    soil_type: Optional[SoilType] = None
    primary_crop: Optional[str] = None
    secondary_crop: Optional[str] = None
    crop_types: Optional[List[str]] = None
    contract_start_date: Optional[date] = None
    contract_end_date: Optional[date] = None
    services_active: Optional[List[str]] = None

class FarmInDB(FarmBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
