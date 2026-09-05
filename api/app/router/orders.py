import uuid

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from PIL import UnidentifiedImageError
from sqlalchemy.orm import Session

from app.config.auth import require_admin_session
from app.db.base import get_db
from app.db.models import OrderStatus
from app.schema.order import NotesImageOut, OrderCreate, OrderOut, OrderPage, OrderUpdate
from app.services import order_service
from app.services.image_service import ImageTooLargeError

router = APIRouter(prefix="/orders", tags=["orders"])

# Creating an order is public — guests submit it from the ShoeDetails "Review Order" button.
# Listing/editing/deleting orders is admin-only.

MAX_UPLOAD_BYTES = 10 * 1024 * 1024  # raw upload cap, before compression


@router.get("", response_model=OrderPage, dependencies=[Depends(require_admin_session)])
def list_orders(
    company_id: uuid.UUID | None = Query(default=None),
    status_filter: OrderStatus | None = Query(default=None, alias="status"),
    search: str | None = Query(default=None, max_length=50),
    completed: bool | None = Query(default=None),
    sort: str = Query(default="newest"),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
):
    items, total = order_service.list_orders(
        db, company_id, status_filter, search, completed, sort, limit, offset
    )
    return OrderPage(items=items, total=total)


@router.post("", response_model=OrderOut, status_code=status.HTTP_201_CREATED)
def create_order(payload: OrderCreate, db: Session = Depends(get_db)):
    return order_service.create_order(db, payload)


@router.post("/notes-image", response_model=NotesImageOut)
async def upload_notes_image(file: UploadFile = File(...)):
    data = await file.read()
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="Image too large")

    try:
        image_url = order_service.upload_notes_image(data)
    except UnidentifiedImageError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid image file") from exc
    except ImageTooLargeError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    return NotesImageOut(image_url=image_url)


@router.patch("/{order_id}", response_model=OrderOut, dependencies=[Depends(require_admin_session)])
def update_order(order_id: uuid.UUID, payload: OrderUpdate, db: Session = Depends(get_db)):
    order = order_service.update_order(db, order_id, payload)
    if order is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    return order


@router.delete(
    "/{order_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_admin_session)],
)
def delete_order(order_id: uuid.UUID, db: Session = Depends(get_db)):
    if not order_service.delete_order(db, order_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
