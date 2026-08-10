from datetime import date, datetime, timedelta, timezone

from sqlalchemy import extract, func
from sqlalchemy.orm import Session

from app.db.models import Order, OrderStatus, Payment


def get_overview(db: Session, year: int | None = None) -> dict:
    year = year or date.today().year
    thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)

    uncollected_balance = db.query(func.coalesce(func.sum(Payment.balance), 0)).scalar()

    total_sales = (
        db.query(func.coalesce(func.sum(Order.unit_price * Order.quantity), 0))
        .filter(extract("year", Order.created_at) == year)
        .scalar()
    )

    total_orders = db.query(func.count(Order.id)).filter(Order.created_at >= thirty_days_ago).scalar()

    pending_orders = (
        db.query(func.count(Order.id))
        .filter(Order.created_at >= thirty_days_ago, Order.status == OrderStatus.current)
        .scalar()
    )

    monthly_rows = (
        db.query(
            extract("month", Order.created_at).label("month"),
            func.coalesce(func.sum(Order.unit_price * Order.quantity), 0).label("sales"),
        )
        .filter(extract("year", Order.created_at) == year)
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
