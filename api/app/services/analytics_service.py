from datetime import date, timedelta

from sqlalchemy import extract, func
from sqlalchemy.orm import Session

from app.config.timezone import BUSINESS_TZ, business_now, business_today
from app.db.models import Order, OrderStatus, Payment

# Archived orders are void, not history — they are excluded from every figure here. The
# admin UI applies the same rule, and the two must agree or the dashboard contradicts itself.
_ACTIVE = Order.status != OrderStatus.archived

# created_at is stored as UTC. Grouping by calendar year/month has to happen in shop-local
# time or an order placed on the 1st at 07:00 Manila is counted in the previous month.
_LOCAL_CREATED = func.timezone(BUSINESS_TZ.tzname(None), Order.created_at)


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

    total_sales = (
        db.query(func.coalesce(func.sum(Order.unit_price * Order.quantity), 0))
        .filter(_ACTIVE, extract("year", _LOCAL_CREATED) == year)
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
            extract("month", _LOCAL_CREATED).label("month"),
            func.coalesce(func.sum(Order.unit_price * Order.quantity), 0).label("sales"),
        )
        .filter(_ACTIVE, extract("year", _LOCAL_CREATED) == year)
        .group_by("month")
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
