import uuid
from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy.orm import Session

from app.db.models import Order, OrderStatus, Payment
from app.schema.order import OrderCreate, OrderUpdate
from app.services import company_service, image_service


def compute_order_total(unit_price: float | Decimal, quantity: int) -> Decimal:
    """The single source of truth for what an order is worth in Python code — previously this
    multiplication was reimplemented ad hoc wherever a total was needed. (Analytics aggregates
    the same multiplication in SQL across many rows, which is a separate, already-precise
    Postgres-side computation and isn't a candidate for sharing this Python helper.)"""
    return Decimal(str(unit_price)) * quantity


def list_orders(
    db: Session,
    company_id: uuid.UUID | None = None,
    status: OrderStatus | None = None,
) -> list[Order]:
    query = db.query(Order)
    if company_id is not None:
        query = query.filter(Order.company_id == company_id)
    if status is not None:
        query = query.filter(Order.status == status)
    return query.order_by(Order.created_at.desc()).all()


def get_order(db: Session, order_id: uuid.UUID) -> Order | None:
    return db.query(Order).filter(Order.id == order_id).first()


def create_order(db: Session, data: OrderCreate) -> Order:
    """Creates the order and its matching payment record (1:1) in one step,
    since every order needs a balance to track from the moment it's placed."""
    order_data = data.model_dump(exclude={"company_name", "custom_created_at"})
    if order_data.get("company_id") is None and data.company_name:
        company = company_service.find_or_create_company(db, data.company_name)
        order_data["company_id"] = company.id

    order = Order(**order_data)
    if data.custom_created_at is not None:
        order.created_at = data.custom_created_at
    db.add(order)
    db.flush()

    total_amount = compute_order_total(order.unit_price, order.quantity)
    payment = Payment(
        order_id=order.id,
        client_name=order.client_name,
        total_amount=total_amount,
        balance=total_amount,
    )
    db.add(payment)

    db.commit()
    db.refresh(order)
    return order


def update_order(db: Session, order_id: uuid.UUID, data: OrderUpdate) -> Order | None:
    order = get_order(db, order_id)
    if order is None:
        return None
    changes = data.model_dump(exclude_unset=True)
    if "status" in changes:
        new_status = changes["status"]
        # Based on completed_at/archived_at themselves (not the current status) so that
        # restoring an archived order back to "completed" preserves its original
        # completion time instead of resetting it to now.
        if new_status == OrderStatus.completed and order.completed_at is None:
            order.completed_at = datetime.now(timezone.utc)
        elif new_status == OrderStatus.current:
            order.completed_at = None

        if new_status == OrderStatus.archived and order.archived_at is None:
            order.archived_at = datetime.now(timezone.utc)
        elif new_status != OrderStatus.archived:
            order.archived_at = None
    for field, value in changes.items():
        setattr(order, field, value)
    db.commit()
    db.refresh(order)
    return order


def upload_notes_image(data: bytes) -> str:
    """Compresses and uploads a guest-attached order note image (a photo or drawing block).
    Not tied to a DB row — the returned URL is stored as a notes_blocks entry's `value`."""
    return image_service.upload_image(data, folder="order-notes")


def delete_order(db: Session, order_id: uuid.UUID) -> bool:
    order = get_order(db, order_id)
    if order is None:
        return False
    db.delete(order)
    db.commit()
    return True
