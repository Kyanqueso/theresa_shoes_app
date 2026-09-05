import uuid
from datetime import datetime, timezone
from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.config.timezone import business_today
from app.db.models import CompanyStatus, Order, OrderStatus, Payment
from app.schema.order import OrderCreate, OrderUpdate
from app.services import company_service, image_service, payment_service


def compute_order_total(unit_price: float | Decimal, quantity: int) -> Decimal:
    """The single source of truth for what an order is worth in Python code — previously this
    multiplication was reimplemented ad hoc wherever a total was needed. (Analytics aggregates
    the same multiplication in SQL across many rows, which is a separate, already-precise
    Postgres-side computation and isn't a candidate for sharing this Python helper.)"""
    return Decimal(str(unit_price)) * quantity


def _order_query(db: Session, company_id, status, search, completed):
    query = db.query(Order)
    if company_id is not None:
        query = query.filter(Order.company_id == company_id)
    if status is not None:
        query = query.filter(Order.status == status)
    # Archived orders are split between the Orders and Completed Orders tabs by whether
    # completed_at survived from before they were archived, so the caller can ask for either.
    if completed is True:
        query = query.filter(Order.completed_at.isnot(None))
    elif completed is False:
        query = query.filter(Order.completed_at.is_(None))
    if search:
        query = query.filter(Order.client_name.ilike(f"%{search.strip()}%"))
    return query


_ORDER_SORTS = {
    "newest": Order.created_at.desc(),
    "oldest": Order.created_at.asc(),
    "az": Order.client_name.asc(),
    "za": Order.client_name.desc(),
}


def list_orders(
    db: Session,
    company_id: uuid.UUID | None = None,
    status: OrderStatus | None = None,
    search: str | None = None,
    completed: bool | None = None,
    sort: str = "newest",
    limit: int | None = None,
    offset: int = 0,
) -> tuple[list[Order], int]:
    """Returns (page, total). Filtering, searching and sorting all happen in Postgres —
    doing them in the browser would mean shipping every order to every admin page load,
    which stops being viable long before the shop does."""
    query = _order_query(db, company_id, status, search, completed)
    total = query.with_entities(func.count(Order.id)).scalar() or 0
    query = query.order_by(_ORDER_SORTS.get(sort, _ORDER_SORTS["newest"]))
    if limit is not None:
        query = query.limit(limit).offset(offset)
    return query.all(), total


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


def _resync_payment(order: Order) -> None:
    """Keeps the order's payment in step after its quantity or unit price changed.

    Without this the payment keeps the total it was created with, so balances, the
    "Uncollected Balance" figure and the CSV export all silently drift from reality.

    Raising the price on an order that was already settled means it is no longer settled, so
    the order goes back to Current — it can't be "completed" while money is outstanding. That
    mirrors _sync_order_completion in payment_service, which is the same rule seen from the
    payment side. Archived orders are left alone; they're outside the lifecycle.
    """
    payment = order.payment
    if payment is None:
        return

    payment.total_amount = compute_order_total(order.unit_price, order.quantity)
    # Reuses payment_service's exact-cents arithmetic so a balance recomputed from this side
    # is identical to one recomputed from the payments table.
    payment.balance = payment_service._money(payment.total_amount) - payment_service._paid_total(payment)
    payment.client_name = order.client_name

    if payment.balance > 0:
        # Money is owed again — the clearance date is no longer true.
        payment.balance_cleared_date = None
        if order.status == OrderStatus.completed:
            order.status = OrderStatus.current
            order.completed_at = None
    elif payment.balance_cleared_date is None:
        payment.balance_cleared_date = business_today()


def update_order(db: Session, order_id: uuid.UUID, data: OrderUpdate) -> Order | None:
    order = get_order(db, order_id)
    if order is None:
        return None
    changes = data.model_dump(exclude_unset=True)
    if "status" in changes:
        new_status = changes["status"]

        # An order can't be brought back while the company it belongs to is archived — that
        # would leave a live order filed under a company the shop has put away, invisible on
        # the active Companies list but still counted in orders and analytics. Restoring the
        # company itself is what brings its orders back (see company_service's cascade).
        if (
            order.status == OrderStatus.archived
            and new_status != OrderStatus.archived
            and order.company is not None
            and order.company.status == CompanyStatus.archive
        ):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    f'"{order.company.name}" is archived, so its orders can\'t be restored '
                    f"individually. Restore the company first and its orders come back with it."
                ),
            )
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

    # Anything that moves the money owed, or the name shown against it, has to reach the
    # payment row too. Skipped for archived orders, which are out of the lifecycle.
    if {"quantity", "unit_price", "client_name"} & changes.keys() and order.status != OrderStatus.archived:
        _resync_payment(order)

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
    # The guest's photo/drawing attachments belong to this order alone, so they go with it.
    image_urls = image_service.collect_notes_image_urls(order.notes_blocks)
    db.delete(order)
    db.commit()
    image_service.delete_images(image_urls)
    return True
