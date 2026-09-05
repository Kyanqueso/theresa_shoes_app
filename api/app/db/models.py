import enum
import uuid

from sqlalchemy import (
    Boolean,
    Column,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship

from app.db.base import Base


class CompanyStatus(str, enum.Enum):
    active = "active"
    archive = "archive"


class OrderStatus(str, enum.Enum):
    current = "current"
    completed = "completed"
    archived = "archived"


class AttributeCategory(str, enum.Enum):
    material = "material"
    mold_type = "mold_type"
    heel_type = "heel_type"
    buckle = "buckle"
    slingback = "slingback"
    flatform = "flatform"


class Device(Base):
    __tablename__ = "devices"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    device_token = Column(String, nullable=False, unique=True, index=True)
    label = Column(String, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    last_seen_at = Column(DateTime(timezone=True), nullable=True)
    # This device's own PIN. Null means the device predates per-device PINs and still falls
    # back to the shared admin_pin row (see auth_service.verify_admin_pin) — that fallback is
    # what stops the migration locking out devices that were paired before this existed.
    pin_hash = Column(String, nullable=True)
    # PIN brute-force protection: 10 wrong PINs from this device locks it out for 30 minutes.
    failed_pin_attempts = Column(Integer, nullable=False, default=0)
    pin_locked_until = Column(DateTime(timezone=True), nullable=True)


class DevicePairingCode(Base):
    """Short-lived, single-use code that lets a brand-new browser register itself as a Device.

    Issued from an already-authorized device (admin session required) and typed into the new
    one. This is the only way onto the device allowlist, which is what makes the allowlist a
    real first factor: without a code you cannot obtain a token, and without a token
    require_valid_device rejects you before the PIN pad is ever reached.
    """

    __tablename__ = "device_pairing_codes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code = Column(String, nullable=False, unique=True, index=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    expires_at = Column(DateTime(timezone=True), nullable=False)
    # Set the moment a code is redeemed, so a code can never be used twice.
    used_at = Column(DateTime(timezone=True), nullable=True)
    used_by_device_id = Column(UUID(as_uuid=True), ForeignKey("devices.id"), nullable=True)
    # Timestamp of the last failed claim attempt, used to rate-limit guessing. Kept on the
    # row because Lambda has no shared in-process state between invocations.
    last_attempt_at = Column(DateTime(timezone=True), nullable=True)


class AdminPin(Base):
    __tablename__ = "admin_pin"

    id = Column(Integer, primary_key=True)
    pin_hash = Column(String, nullable=False)
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())


class Company(Base):
    __tablename__ = "companies"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    status = Column(Enum(CompanyStatus, name="company_status"), nullable=False, default=CompanyStatus.active)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    # Set when status transitions to "archive" (see company_service.update_company).
    archived_at = Column(DateTime(timezone=True), nullable=True)

    # Permanently deleting an (archived) company also removes its orders, which in
    # turn each cascade-delete their own payment (see Order.payment below).
    orders = relationship("Order", back_populates="company", cascade="all, delete-orphan")

    # Case-insensitive uniqueness on name — find_or_create_company matches by ILIKE, so the DB
    # needs to enforce the same case-insensitive dedup to close the TOCTOU race between two
    # near-simultaneous guest submissions naming the same not-yet-existing company.
    __table_args__ = (Index("ix_companies_name_lower", func.lower(name), unique=True),)


class Shoe(Base):
    __tablename__ = "shoes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    price = Column(Numeric(10, 2), nullable=False)
    description = Column(Text, nullable=True)
    is_hidden = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    images = relationship(
        "ShoeImage", back_populates="shoe", cascade="all, delete-orphan", order_by="ShoeImage.sort_order"
    )
    orders = relationship("Order", back_populates="shoe")

    # Case-insensitive name uniqueness, mirroring Company. Two shoes with the same name are
    # indistinguishable in the manual-order form's model dropdown.
    __table_args__ = (Index("ix_shoes_name_lower", func.lower(name), unique=True),)


class ShoeImage(Base):
    __tablename__ = "shoe_images"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    shoe_id = Column(UUID(as_uuid=True), ForeignKey("shoes.id"), nullable=False)
    image_url = Column(String, nullable=False)
    sort_order = Column(Integer, nullable=False, default=0)

    shoe = relationship("Shoe", back_populates="images")


class ShoeAttributeOption(Base):
    __tablename__ = "shoe_attribute_options"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    category = Column(Enum(AttributeCategory, name="attribute_category"), nullable=False)
    name = Column(String, nullable=False)
    swatch_color = Column(String, nullable=True)
    image_url = Column(String, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    parent_id = Column(
        UUID(as_uuid=True), ForeignKey("shoe_attribute_options.id", ondelete="CASCADE"), nullable=True
    )
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    # Case-insensitive name uniqueness scoped to (category, parent).
    # nulls_not_distinct is the part that matters for material *groups* — their parent_id is
    # null, and Postgres treats nulls as distinct by default, so without it two groups both
    # named "Snake" would still be allowed. Scoping by parent keeps the same swatch name legal
    # under two different materials (Helga/Red and Snake/Red); only a clash inside one group
    # is rejected. Requires Postgres 15+.
    __table_args__ = (
        Index(
            "ix_attribute_options_unique_name",
            category,
            func.lower(name),
            parent_id,
            unique=True,
            postgresql_nulls_not_distinct=True,
        ),
    )


class Order(Base):
    __tablename__ = "orders"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id = Column(UUID(as_uuid=True), ForeignKey("companies.id"), nullable=True, index=True)
    client_name = Column(String, nullable=False)
    contact_number = Column(String, nullable=True)
    # Nullable: manually-entered orders may name a model that isn't in the catalog (see
    # custom_model_name below) instead of pointing at a real Shoe row.
    shoe_id = Column(UUID(as_uuid=True), ForeignKey("shoes.id"), nullable=True)
    custom_model_name = Column(String, nullable=True)
    material_id = Column(UUID(as_uuid=True), ForeignKey("shoe_attribute_options.id"), nullable=True)
    mold_type_id = Column(UUID(as_uuid=True), ForeignKey("shoe_attribute_options.id"), nullable=True)
    heel_type_id = Column(UUID(as_uuid=True), ForeignKey("shoe_attribute_options.id"), nullable=True)
    color_code = Column(String, nullable=True)
    size = Column(Integer, nullable=True)
    heel_size = Column(Integer, nullable=True)
    quantity = Column(Integer, nullable=False, default=1)
    with_buckle = Column(Boolean, nullable=False, default=False)
    buckle_id = Column(UUID(as_uuid=True), ForeignKey("shoe_attribute_options.id"), nullable=True)
    with_flatform = Column(Boolean, nullable=False, default=False)
    flatform_id = Column(UUID(as_uuid=True), ForeignKey("shoe_attribute_options.id"), nullable=True)
    with_slingback = Column(Boolean, nullable=False, default=False)
    slingback_id = Column(UUID(as_uuid=True), ForeignKey("shoe_attribute_options.id"), nullable=True)
    unit_price = Column(Numeric(10, 2), nullable=False)
    status = Column(Enum(OrderStatus, name="order_status"), nullable=False, default=OrderStatus.current, index=True)
    # Ordered mixed-content note: text / photo / drawing blocks the guest composed,
    # plus "selection" blocks mirroring their material/mold/heel/buckle/flatform/slingback picks.
    # e.g. [{"type": "text", "value": "flat feet"}, {"type": "drawing", "value": "https://..."}]
    notes_blocks = Column(JSONB, nullable=False, server_default="[]")
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), index=True)
    # Set automatically when status transitions to "completed" (see order_service.update_order).
    completed_at = Column(DateTime(timezone=True), nullable=True)
    # Set when status transitions to "archived". Kept even after archiving so we can tell
    # whether an archived order was previously current or completed (completed_at survives
    # archiving too — see order_service.update_order).
    archived_at = Column(DateTime(timezone=True), nullable=True)
    # True only when this order was archived as part of its company being archived (see
    # company_service's cascade). Restoring the company only un-archives orders flagged this
    # way, so an order the user had already archived by hand independently stays archived.
    archived_with_company = Column(Boolean, nullable=False, default=False)

    company = relationship("Company", back_populates="orders")
    shoe = relationship("Shoe", back_populates="orders")
    material = relationship("ShoeAttributeOption", foreign_keys=[material_id])
    mold_type = relationship("ShoeAttributeOption", foreign_keys=[mold_type_id])
    heel_type = relationship("ShoeAttributeOption", foreign_keys=[heel_type_id])
    buckle = relationship("ShoeAttributeOption", foreign_keys=[buckle_id])
    flatform = relationship("ShoeAttributeOption", foreign_keys=[flatform_id])
    slingback = relationship("ShoeAttributeOption", foreign_keys=[slingback_id])
    payment = relationship("Payment", back_populates="order", uselist=False, cascade="all, delete-orphan")


class Payment(Base):
    __tablename__ = "payments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_id = Column(UUID(as_uuid=True), ForeignKey("orders.id"), nullable=False, unique=True)
    client_name = Column(String, nullable=True)
    total_amount = Column(Numeric(10, 2), nullable=False)
    first_payment = Column(Numeric(10, 2), nullable=False, default=0)
    second_payment = Column(Numeric(10, 2), nullable=False, default=0)
    third_payment = Column(Numeric(10, 2), nullable=False, default=0)
    balance = Column(Numeric(10, 2), nullable=False)
    balance_cleared_date = Column(Date, nullable=True)
    date_delivered = Column(Date, nullable=True)

    order = relationship("Order", back_populates="payment")
