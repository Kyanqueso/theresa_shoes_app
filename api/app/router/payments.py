import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.config.auth import require_admin_session
from app.db.base import get_db
from app.schema.payment import PaymentCreate, PaymentOut, PaymentPage, PaymentUpdate
from app.services import payment_service

router = APIRouter(prefix="/payments", tags=["payments"], dependencies=[Depends(require_admin_session)])


@router.get("", response_model=PaymentPage)
def list_payments(
    company_id: uuid.UUID | None = Query(default=None),
    search: str | None = Query(default=None, max_length=50),
    archived: bool | None = Query(default=None),
    sort: str = Query(default="newest"),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
):
    items, total = payment_service.list_payments(db, company_id, search, archived, sort, limit, offset)
    return PaymentPage(items=items, total=total)


@router.post("", response_model=PaymentOut, status_code=status.HTTP_201_CREATED)
def create_payment(payload: PaymentCreate, db: Session = Depends(get_db)):
    return payment_service.create_payment(db, payload)


@router.patch("/{payment_id}", response_model=PaymentOut)
def update_payment(payment_id: uuid.UUID, payload: PaymentUpdate, db: Session = Depends(get_db)):
    payment = payment_service.update_payment(db, payment_id, payload)
    if payment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment not found")
    return payment
