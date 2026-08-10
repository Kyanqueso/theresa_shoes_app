import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ShoeImageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    image_url: str
    sort_order: int


class ShoeImageUpdate(BaseModel):
    sort_order: int


class ShoeBase(BaseModel):
    name: str
    price: float
    description: str | None = None
    is_hidden: bool = False


class ShoeCreate(ShoeBase):
    pass


class ShoeUpdate(BaseModel):
    name: str | None = None
    price: float | None = None
    description: str | None = None
    is_hidden: bool | None = None


class ShoeOut(ShoeBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    created_at: datetime
    images: list[ShoeImageOut] = []
