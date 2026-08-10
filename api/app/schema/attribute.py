import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.db.models import AttributeCategory


class AttributeOptionBase(BaseModel):
    category: AttributeCategory
    name: str
    swatch_color: str | None = None
    image_url: str | None = None
    is_active: bool = True
    parent_id: uuid.UUID | None = None


class AttributeOptionCreate(AttributeOptionBase):
    pass


class AttributeOptionUpdate(BaseModel):
    name: str | None = None
    swatch_color: str | None = None
    image_url: str | None = None
    is_active: bool | None = None


class AttributeAvailabilityUpdate(BaseModel):
    is_active: bool


class AttributeOptionOut(AttributeOptionBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    created_at: datetime
