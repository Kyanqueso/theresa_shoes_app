from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.config.auth import require_admin_session
from app.db.base import get_db
from app.schema.analytics import AnalyticsOverviewOut
from app.services import analytics_service

router = APIRouter(prefix="/analytics", tags=["analytics"], dependencies=[Depends(require_admin_session)])


@router.get("/overview", response_model=AnalyticsOverviewOut)
def get_overview(year: int | None = Query(default=None), db: Session = Depends(get_db)):
    return analytics_service.get_overview(db, year)
