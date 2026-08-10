import uuid
from datetime import date, datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.db.models import Order, OrderStatus, Payment
from app.schema.payment import PaymentCreate, PaymentUpdate


def _recompute_balance(payment: Payment) -> None:
    """Values coming from the DB are Decimal; values just set from a Pydantic float field
    are plain float. Normalize both to float before doing arithmetic on them."""
    paid = float(payment.first_payment or 0) + float(payment.second_payment or 0) + float(payment.third_payment or 0)
    payment.balance = float(payment.total_amount) - paid
    if payment.balance <= 0 and payment.balance_cleared_date is None:
        payment.balance_cleared_date = date.today()


def _validate_payment_amounts(payment: Payment) -> None:
    """Enforces: no negative installments, each installment can only be filled in once the one
    before it is, and the total paid can never exceed what's owed on the order."""
    first = float(payment.first_payment or 0)
    second = float(payment.second_payment or 0)
    third = float(payment.third_payment or 0)

    if first < 0 or second < 0 or third < 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Payment amounts can't be negative.")
    if second > 0 and first <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="The 1st payment must be filled in before the 2nd."
        )
    if third > 0 and second <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="The 2nd payment must be filled in before the 3rd."
        )
    if first + second + third > float(payment.total_amount):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Total payments can't exceed the order's total amount."
        )


def _sync_order_completion(payment: Payment) -> None:
    """An order is considered complete once it's both delivered and fully paid — there's no
    manual "mark complete" action, this stays in sync automatically whenever a payment/delivery
    date changes. Archived orders are left alone (they're not part of this lifecycle)."""
    order = payment.order
    if order is None or order.status == OrderStatus.archived:
        return

    is_delivered = payment.date_delivered is not None
    is_paid = payment.balance <= 0

    if is_delivered and is_paid:
        if order.status != OrderStatus.completed:
            order.status = OrderStatus.completed
            order.completed_at = datetime.now(timezone.utc)
    elif order.status == OrderStatus.completed:
        order.status = OrderStatus.current
        order.completed_at = None


def list_payments(db: Session, company_id: uuid.UUID | None = None) -> list[Payment]:
    query = db.query(Payment)
    if company_id is not None:
        query = query.join(Order, Payment.order_id == Order.id).filter(Order.company_id == company_id)
    return query.all()


def get_payment(db: Session, payment_id: uuid.UUID) -> Payment | None:
    return db.query(Payment).filter(Payment.id == payment_id).first()


def create_payment(db: Session, data: PaymentCreate) -> Payment:
    order = db.query(Order).filter(Order.id == data.order_id).first()
    if order is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")

    payment = Payment(**data.model_dump())
    _validate_payment_amounts(payment)
    _recompute_balance(payment)
    db.add(payment)
    db.flush()
    _sync_order_completion(payment)
    db.commit()
    db.refresh(payment)
    return payment


def update_payment(db: Session, payment_id: uuid.UUID, data: PaymentUpdate) -> Payment | None:
    payment = get_payment(db, payment_id)
    if payment is None:
        return None
    changes = data.model_dump(exclude_unset=True)
    for field, value in changes.items():
        setattr(payment, field, value)
    # Only re-validate amounts when they're actually part of this edit — otherwise an unrelated
    # change (e.g. just date_delivered) could get blocked by amounts that predate this rule.
    if {"first_payment", "second_payment", "third_payment"} & changes.keys():
        _validate_payment_amounts(payment)
    _recompute_balance(payment)
    _sync_order_completion(payment)
    db.commit()
    db.refresh(payment)
    return payment
