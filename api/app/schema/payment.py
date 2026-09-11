import uuid
from datetime import date

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.config.timezone import validate_record_date


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
    # Editable so a payment recorded late can carry the day it was actually received. A date
    # still only exists alongside an amount — see payment_service._sync_payment_dates, which
    # clears it for a zeroed instalment and stamps today for a paid one left without a date.
    first_payment_date: date | None = None
    second_payment_date: date | None = None
    third_payment_date: date | None = None

    @field_validator("date_delivered", "first_payment_date", "second_payment_date", "third_payment_date")
    @classmethod
    def _validate_dates(cls, value: date | None, info) -> date | None:
        labels = {
            "date_delivered": "Delivery date",
            "first_payment_date": "1st payment date",
            "second_payment_date": "2nd payment date",
            "third_payment_date": "3rd payment date",
        }
        return value if value is None else validate_record_date(value, labels[info.field_name])


class PaymentPage(BaseModel):
    items: list["PaymentOut"]
    total: int


class PaymentOut(PaymentBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    order_id: uuid.UUID
    # The order's number (see Payment.order_number) — shown in place of the payment's own id.
    order_number: int | None = None
    client_name: str | None = None
    balance: float
    balance_cleared_date: date | None = None
    # Defaults to the day an amount is first entered; editable afterwards (see PaymentUpdate).
    first_payment_date: date | None = None
    second_payment_date: date | None = None
    third_payment_date: date | None = None


PaymentPage.model_rebuild()
