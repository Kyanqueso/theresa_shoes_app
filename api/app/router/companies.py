import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.config.auth import require_admin_session
from app.db.base import get_db
from app.schema.company import CompanyCreate, CompanyOut, CompanyUpdate
from app.services import company_service

router = APIRouter(prefix="/companies", tags=["companies"])

# GET is public — the guest order form reads this to power the company name combobox.
# Mutations are admin-only.


@router.get("", response_model=list[CompanyOut])
def list_companies(db: Session = Depends(get_db)):
    return company_service.list_companies(db)


@router.post(
    "",
    response_model=CompanyOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_admin_session)],
)
def create_company(payload: CompanyCreate, db: Session = Depends(get_db)):
    return company_service.create_company(db, payload)


@router.patch("/{company_id}", response_model=CompanyOut, dependencies=[Depends(require_admin_session)])
def update_company(company_id: uuid.UUID, payload: CompanyUpdate, db: Session = Depends(get_db)):
    company = company_service.update_company(db, company_id, payload)
    if company is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company not found")
    return company


@router.delete(
    "/{company_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_admin_session)],
)
def delete_company(company_id: uuid.UUID, db: Session = Depends(get_db)):
    if not company_service.delete_company(db, company_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company not found")
