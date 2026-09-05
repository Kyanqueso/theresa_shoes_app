from datetime import date, timedelta

from sqlalchemy import Date, case, cast, extract, func, literal_column, select, union_all
from sqlalchemy.orm import Session

from app.config.timezone import BUSINESS_TZ, business_now, business_today
from app.db.models import Order, OrderStatus, Payment

# Archived orders are void, not history — they are excluded from every figure here. The
# admin UI applies the same rule, and the two must agree or the dashboard contradicts itself.
_ACTIVE = Order.status != OrderStatus.archived

# created_at is stored as UTC. Grouping by calendar year/month has to happen in shop-local
# time or an order placed on the 1st at 07:00 Manila is counted in the previous month.
_LOCAL_CREATED = func.timezone(BUSINESS_TZ.tzname(None), Order.created_at)

# The three installments, each with the date it was received.
_INSTALLMENT_COLUMNS = (
    (Payment.first_payment, Payment.first_payment_date),
    (Payment.second_payment, Payment.second_payment_date),
    (Payment.third_payment, Payment.third_payment_date),
)


def _payments_received():
    """One row per installment actually received: (amount, date it was received).

    Sales are counted as money collected, not as orders placed. An order sitting unpaid is
    not revenue, and an order paid across three months is revenue in three months — so each
    installment is attributed to the day it arrived rather than to the order's date.

    Installments recorded before per-installment dates existed have an amount but no date;
    those fall back to the order's own date, which is the closest thing available. Without
    the fallback all historical revenue would silently vanish from the dashboard.
    """
    selects = [
        select(
            amount_col.label("amount"),
            func.coalesce(date_col, cast(_LOCAL_CREATED, Date)).label("received_on"),
        )
        .select_from(Payment)
        .join(Order, Payment.order_id == Order.id)
        .where(_ACTIVE, amount_col > 0)
        for amount_col, date_col in _INSTALLMENT_COLUMNS
    ]
    return union_all(*selects).subquery()


def get_overview(db: Session, year: int | None = None) -> dict:
    year = year or business_today().year
    thirty_days_ago = business_now() - timedelta(days=30)

    # Only balances belonging to orders that still count.
    uncollected_balance = (
        db.query(func.coalesce(func.sum(Payment.balance), 0))
        .join(Order, Payment.order_id == Order.id)
        .filter(_ACTIVE)
        .scalar()
    )

    received = _payments_received()
    amount = literal_column("amount")
    received_on = literal_column("received_on")

    total_sales = (
        db.query(func.coalesce(func.sum(amount), 0))
        .select_from(received)
        .filter(extract("year", received_on) == year)
        .scalar()
    )

    total_orders = (
        db.query(func.count(Order.id)).filter(_ACTIVE, Order.created_at >= thirty_days_ago).scalar()
    )

    pending_orders = (
        db.query(func.count(Order.id))
        .filter(_ACTIVE, Order.created_at >= thirty_days_ago, Order.status == OrderStatus.current)
        .scalar()
    )

    monthly_rows = (
        db.query(
            extract("month", received_on).label("month"),
            func.coalesce(func.sum(amount), 0).label("sales"),
        )
        .select_from(received)
        .filter(extract("year", received_on) == year)
        .group_by(extract("month", received_on))
        .all()
    )
    sales_by_month = {int(row.month): float(row.sales) for row in monthly_rows}
    monthly_sales = [
        {"month": date(year, month, 1).strftime("%b %Y"), "sales": sales_by_month.get(month, 0.0)}
        for month in range(1, 13)
    ]

    return {
        "uncollected_balance": float(uncollected_balance or 0),
        "total_sales": float(total_sales or 0),
        "total_orders": int(total_orders or 0),
        "pending_orders": int(pending_orders or 0),
        "monthly_sales": monthly_sales,
    }
