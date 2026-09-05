import uuid
from datetime import date

from pydantic import BaseModel, ConfigDict, Field


class PaymentBase(BaseModel):
    total_amount: float = Field(gt=0)
    first_payment: float = Field(default=0, ge=0)
    second_payment: float = Field(default=0, ge=0)
    third_payment: float = Field(default=0, ge=0)
    date_delivered: date | None = None


class PaymentCreate(PaymentBase):
    order_id: uuid.UUID
    client_name: str | None = None


class PaymentUpdate(BaseModel):
    first_payment: float | None = Field(default=None, ge=0)
    second_payment: float | None = Field(default=None, ge=0)
    third_payment: float | None = Field(default=None, ge=0)
    date_delivered: date | None = None


class PaymentPage(BaseModel):
    items: list["PaymentOut"]
    total: int


class PaymentOut(PaymentBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    order_id: uuid.UUID
    client_name: str | None = None
    balance: float
    balance_cleared_date: date | None = None


PaymentPage.model_rebuild()
