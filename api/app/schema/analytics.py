from pydantic import BaseModel


class MonthlySales(BaseModel):
    month: str
    sales: float


class AnalyticsOverviewOut(BaseModel):
    uncollected_balance: float
    total_sales: float
    total_orders: int
    pending_orders: int
    monthly_sales: list[MonthlySales]
