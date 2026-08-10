import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.db.models import CompanyStatus


class CompanyBase(BaseModel):
    name: str
    status: CompanyStatus = CompanyStatus.active


class CompanyCreate(CompanyBase):
    pass


class CompanyUpdate(BaseModel):
    name: str | None = None
    status: CompanyStatus | None = None


class CompanyOut(CompanyBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    created_at: datetime
    archived_at: datetime | None = None
