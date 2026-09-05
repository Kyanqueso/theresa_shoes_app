import uuid
from datetime import datetime, timezone
from decimal import ROUND_HALF_UP, Decimal

from fastapi import HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.config.timezone import business_today
from app.db.models import Order, OrderStatus, Payment
from app.schema.payment import PaymentCreate, PaymentUpdate


CENTS = Decimal("0.01")

# The three installments, paired with the column recording when each was received.
INSTALLMENTS = (
    ("first_payment", "first_payment_date", "1st"),
    ("second_payment", "second_payment_date", "2nd"),
    ("third_payment", "third_payment_date", "3rd"),
)


def _money(value) -> Decimal:
    """Money as exact cents.

    Amounts arrive from Pydantic as floats and come back from Postgres as Decimal. Mixing the
    two and subtracting in binary floating point is what lets a fully-settled balance land on
    0.009999999999 instead of 0 — near enough to look right in the table, but enough to keep
    an order out of "paid" forever. Everything is converted through str() (never float()) so
    no binary rounding error is inherited, then quantized to two places.
    """
    return Decimal(str(value or 0)).quantize(CENTS, rounding=ROUND_HALF_UP)


def _paid_total(payment: Payment) -> Decimal:
    return sum((_money(getattr(payment, field)) for field, _, _ in INSTALLMENTS), Decimal("0.00"))


def _sync_payment_dates(payment: Payment) -> None:
    """Stamps each installment with the day it was received, and clears the stamp if the
    amount is zeroed again — so a date is never left sitting next to a blank amount."""
    for amount_field, date_field, _ in INSTALLMENTS:
        amount = _money(getattr(payment, amount_field))
        if amount > 0:
            if getattr(payment, date_field) is None:
                setattr(payment, date_field, business_today())
        else:
            setattr(payment, date_field, None)


def _recompute_balance(payment: Payment) -> None:
    """balance is always exactly total - paid, to the cent."""
    payment.balance = _money(payment.total_amount) - _paid_total(payment)
    if payment.balance <= 0:
        if payment.balance_cleared_date is None:
            payment.balance_cleared_date = business_today()
    else:
        # Correcting an installment downward (or raising the order total) means money is owed
        # again — leaving the old clearance date in place would claim the balance was settled.
        payment.balance_cleared_date = None


def _validate_payment_amounts(payment: Payment) -> None:
    """Enforces: no negative installments, each installment can only be filled in once the one
    before it is, and the total paid can never exceed what's owed on the order."""
    first, second, third = (_money(getattr(payment, field)) for field, _, _ in INSTALLMENTS)
    total = _money(payment.total_amount)

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
    paid = first + second + third
    if paid > total:
        over = paid - total
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Payments total ₱{paid:,.2f} but the order is only ₱{total:,.2f} — that's ₱{over:,.2f} too much.",
        )

    # The 3rd instalment is the final one: recording it settles the order, so it has to be
    # exactly what's left. The figure is checked rather than corrected — the amount on record
    # must be the amount actually handed over, not something the system decided.
    if third > 0:
        remaining = total - first - second
        if remaining <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This order is already fully paid by the 1st and 2nd payments — no 3rd payment is needed.",
            )
        if third != remaining:
            short_by = remaining - third
            wording = (
                f"₱{short_by:,.2f} short" if short_by > 0 else f"₱{-short_by:,.2f} over"
            )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"The 3rd payment must settle the order exactly: ₱{remaining:,.2f} is still owed, "
                    f"but ₱{third:,.2f} was entered ({wording})."
                ),
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


_PAYMENT_SORTS = {
    "newest": Order.created_at.desc(),
    "oldest": Order.created_at.asc(),
    "az": Payment.client_name.asc(),
    "za": Payment.client_name.desc(),
}


def list_payments(
    db: Session,
    company_id: uuid.UUID | None = None,
    search: str | None = None,
    archived: bool | None = None,
    sort: str = "newest",
    limit: int | None = None,
    offset: int = 0,
) -> tuple[list[Payment], int]:
    """Returns (page, total). Always joins Order because every filter and sort the UI offers
    is expressed in terms of the order behind the payment."""
    query = db.query(Payment).join(Order, Payment.order_id == Order.id)
    if company_id is not None:
        query = query.filter(Order.company_id == company_id)
    if archived is True:
        query = query.filter(Order.status == OrderStatus.archived)
    elif archived is False:
        query = query.filter(Order.status != OrderStatus.archived)
    if search:
        query = query.filter(Payment.client_name.ilike(f"%{search.strip()}%"))

    total = query.with_entities(func.count(Payment.id)).scalar() or 0
    query = query.order_by(_PAYMENT_SORTS.get(sort, _PAYMENT_SORTS["newest"]))
    if limit is not None:
        query = query.limit(limit).offset(offset)
    return query.all(), total


def get_payment(db: Session, payment_id: uuid.UUID) -> Payment | None:
    return db.query(Payment).filter(Payment.id == payment_id).first()


def create_payment(db: Session, data: PaymentCreate) -> Payment:
    order = db.query(Order).filter(Order.id == data.order_id).first()
    if order is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")

    payment = Payment(**data.model_dump())
    _validate_payment_amounts(payment)
    _sync_payment_dates(payment)
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
    _sync_payment_dates(payment)
    _recompute_balance(payment)
    _sync_order_completion(payment)
    db.commit()
    db.refresh(payment)
    return payment
