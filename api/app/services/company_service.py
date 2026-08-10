import uuid
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.db.models import Company, CompanyStatus, Order, OrderStatus
from app.schema.company import CompanyCreate, CompanyUpdate


def _duplicate_name_error(name: str) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_409_CONFLICT, detail=f'A company named "{name}" already exists.'
    )


def _cascade_archive_orders(db: Session, company: Company) -> None:
    """Archiving a company archives its still-active orders too, tagged so restoring the
    company later only un-archives the ones this cascade touched — an order the user had
    already archived by hand, independent of the company, is left alone either way."""
    now = datetime.now(timezone.utc)
    orders = db.query(Order).filter(Order.company_id == company.id, Order.status != OrderStatus.archived).all()
    for order in orders:
        order.status = OrderStatus.archived
        order.archived_at = now
        order.archived_with_company = True


def _cascade_restore_orders(db: Session, company: Company) -> None:
    """Restores only the orders this company's own archive action cascaded — orders that were
    already archived independently before the company was archived stay archived."""
    orders = (
        db.query(Order)
        .filter(
            Order.company_id == company.id,
            Order.status == OrderStatus.archived,
            Order.archived_with_company.is_(True),
        )
        .all()
    )
    for order in orders:
        order.status = OrderStatus.completed if order.completed_at is not None else OrderStatus.current
        order.archived_at = None
        order.archived_with_company = False


def list_companies(db: Session) -> list[Company]:
    return db.query(Company).order_by(Company.created_at.desc()).all()


def get_company(db: Session, company_id: uuid.UUID) -> Company | None:
    return db.query(Company).filter(Company.id == company_id).first()


def create_company(db: Session, data: CompanyCreate) -> Company:
    company = Company(**data.model_dump())
    db.add(company)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise _duplicate_name_error(data.name) from exc
    db.refresh(company)
    return company


def find_or_create_company(db: Session, name: str) -> Company:
    """Case-insensitive match on name; creates a new company if none exists yet.
    Used by the guest order form's company combobox, which lets a customer type
    a name that isn't in the list yet."""
    name = name.strip()
    existing = db.query(Company).filter(Company.name.ilike(name)).first()
    if existing is not None:
        return existing

    company = Company(name=name)
    db.add(company)
    try:
        db.commit()
    except IntegrityError:
        # Another concurrent request won the race and created the same (case-insensitive)
        # name between our check above and this commit — fall back to their row.
        db.rollback()
        existing = db.query(Company).filter(Company.name.ilike(name)).first()
        if existing is not None:
            return existing
        raise
    db.refresh(company)
    return company


def update_company(db: Session, company_id: uuid.UUID, data: CompanyUpdate) -> Company | None:
    company = get_company(db, company_id)
    if company is None:
        return None
    changes = data.model_dump(exclude_unset=True)
    if "status" in changes:
        if changes["status"] == CompanyStatus.archive and company.status != CompanyStatus.archive:
            company.archived_at = datetime.now(timezone.utc)
            _cascade_archive_orders(db, company)
        elif changes["status"] == CompanyStatus.active:
            company.archived_at = None
            _cascade_restore_orders(db, company)
    for field, value in changes.items():
        setattr(company, field, value)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise _duplicate_name_error(changes.get("name", company.name)) from exc
    db.refresh(company)
    return company


def delete_company(db: Session, company_id: uuid.UUID) -> bool:
    company = get_company(db, company_id)
    if company is None:
        return False
    db.delete(company)
    db.commit()
    return True
