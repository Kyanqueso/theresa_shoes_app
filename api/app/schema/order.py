import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.config.timezone import business_today, to_business
from app.db.models import OrderStatus

NotesBlockType = Literal[
    "text", "photo", "drawing", "material", "mold_type", "heel_type", "buckle", "flatform", "slingback"
]


class NotesBlock(BaseModel):
    type: NotesBlockType
    # Text content, or an image URL / swatch color depending on type. Capped well above any
    # realistic note so a guest can't post an unbounded blob through the public order endpoint.
    value: str | None = Field(default=None, max_length=2000)
    label: str | None = None  # display name for selection blocks, e.g. the chosen material's name


class OrderBase(BaseModel):
    company_id: uuid.UUID | None = None
    client_name: str
    contact_number: str | None = None
    # Nullable: manually-entered orders may name a model that isn't in the catalog instead
    # (see custom_model_name) — one of the two should be set.
    shoe_id: uuid.UUID | None = None
    custom_model_name: str | None = None
    material_id: uuid.UUID | None = None
    mold_type_id: uuid.UUID | None = None
    heel_type_id: uuid.UUID | None = None
    color_code: str | None = None
    size: int | None = Field(default=None, ge=1)
    heel_size: int | None = Field(default=None, ge=0)
    quantity: int = Field(default=1, ge=1)
    with_buckle: bool = False
    buckle_id: uuid.UUID | None = None
    with_flatform: bool = False
    flatform_id: uuid.UUID | None = None
    with_slingback: bool = False
    slingback_id: uuid.UUID | None = None
    unit_price: float = Field(gt=0)
    # Ordered mixed-content note: text / photo / drawing blocks the guest composed,
    # plus "selection" blocks mirroring their material/mold/heel/buckle/flatform/slingback picks.
    notes_blocks: list[NotesBlock] = Field(default_factory=list, max_length=20)


class OrderCreate(OrderBase):
    # Guest-facing only: lets the order form's company combobox send a typed name
    # that doesn't exist yet instead of requiring an existing company_id.
    company_name: str | None = None
    # Admin manual-entry only: backdates the order instead of using the server's "now".
    # Bounded to [2000-01-01, today] — see the validator below.
    custom_created_at: datetime | None = None

    @field_validator("custom_created_at")
    @classmethod
    def _validate_custom_created_at(cls, value: datetime | None) -> datetime | None:
        """The admin form sends a wall-clock date/time with no offset. Interpreting that as
        UTC would shift an evening order in Manila (UTC+8) onto the following day, so a naive
        value is stamped as shop-local before anything compares or stores it."""
        if value is None:
            return value
        value = to_business(value)
        if value.date() > business_today():
            raise ValueError("Order date can't be in the future.")
        if value.year < 2000:
            raise ValueError("Order date can't be before the year 2000.")
        return value


class OrderUpdate(BaseModel):
    """Admin edit — every field optional so a PATCH only needs to send what changed."""

    company_id: uuid.UUID | None = None
    client_name: str | None = None
    contact_number: str | None = None
    shoe_id: uuid.UUID | None = None
    custom_model_name: str | None = None
    material_id: uuid.UUID | None = None
    mold_type_id: uuid.UUID | None = None
    heel_type_id: uuid.UUID | None = None
    color_code: str | None = None
    size: int | None = Field(default=None, ge=1)
    heel_size: int | None = Field(default=None, ge=0)
    quantity: int | None = Field(default=None, ge=1)
    with_buckle: bool | None = None
    buckle_id: uuid.UUID | None = None
    with_flatform: bool | None = None
    flatform_id: uuid.UUID | None = None
    with_slingback: bool | None = None
    slingback_id: uuid.UUID | None = None
    unit_price: float | None = Field(default=None, gt=0)
    status: OrderStatus | None = None
    notes_blocks: list[NotesBlock] | None = Field(default=None, max_length=20)


class OrderOut(OrderBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    status: OrderStatus
    created_at: datetime
    completed_at: datetime | None = None
    archived_at: datetime | None = None


class NotesImageOut(BaseModel):
    image_url: str


class OrderPage(BaseModel):
    """Paged envelope. `total` is the count matching the filters, not the page size — the UI
    needs it to render the page count without fetching every row just to measure them."""

    items: list[OrderOut]
    total: int
