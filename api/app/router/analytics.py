from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.orm import Session

from app.config.auth import require_admin_session
from app.db.base import get_db
from app.schema.analytics import AnalyticsOverviewOut
from app.services import analytics_service, report_service

router = APIRouter(prefix="/analytics", tags=["analytics"], dependencies=[Depends(require_admin_session)])


@router.get("/overview", response_model=AnalyticsOverviewOut)
def get_overview(year: int | None = Query(default=None), db: Session = Depends(get_db)):
    return analytics_service.get_overview(db, year)


XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"


@router.get("/report")
def download_report(db: Session = Depends(get_db)):
    """The full business report as an Excel workbook. See report_service for what's in it."""
    content, filename = report_service.build_report(db)
    return Response(
        content=content,
        media_type=XLSX,
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            # A report is a snapshot of money owed — never let a browser or proxy serve an old one.
            "Cache-Control": "no-store",
        },
    )
