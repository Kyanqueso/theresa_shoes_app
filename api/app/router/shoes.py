import uuid

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from PIL import UnidentifiedImageError
from sqlalchemy.orm import Session

from app.config.auth import is_admin_session, require_admin_session
from app.db.base import get_db
from app.schema.shoe import ShoeCreate, ShoeImageOut, ShoeImageUpdate, ShoeOut, ShoeUpdate
from app.services import shoe_service
from app.services.image_service import ImageTooLargeError

router = APIRouter(prefix="/shoes", tags=["shoes"])

# GET endpoints are public — the guest catalog reads them with no auth.
# Mutations are admin-only (Manage Mode).

MAX_UPLOAD_BYTES = 10 * 1024 * 1024  # raw upload cap, before compression


@router.get("", response_model=list[ShoeOut])
def list_shoes(
    include_hidden: bool = Query(default=False),
    db: Session = Depends(get_db),
    is_admin: bool = Depends(is_admin_session),
):
    return shoe_service.list_shoes(db, include_hidden=include_hidden and is_admin)


@router.get("/{shoe_id}", response_model=ShoeOut)
def get_shoe(shoe_id: uuid.UUID, db: Session = Depends(get_db)):
    shoe = shoe_service.get_shoe(db, shoe_id)
    if shoe is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shoe not found")
    return shoe


@router.post(
    "",
    response_model=ShoeOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_admin_session)],
)
def create_shoe(payload: ShoeCreate, db: Session = Depends(get_db)):
    return shoe_service.create_shoe(db, payload)


@router.patch("/{shoe_id}", response_model=ShoeOut, dependencies=[Depends(require_admin_session)])
def update_shoe(shoe_id: uuid.UUID, payload: ShoeUpdate, db: Session = Depends(get_db)):
    shoe = shoe_service.update_shoe(db, shoe_id, payload)
    if shoe is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shoe not found")
    return shoe


@router.delete(
    "/{shoe_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_admin_session)],
)
def delete_shoe(shoe_id: uuid.UUID, db: Session = Depends(get_db)):
    if not shoe_service.delete_shoe(db, shoe_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shoe not found")


@router.post(
    "/{shoe_id}/images",
    response_model=ShoeImageOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_admin_session)],
)
async def upload_shoe_image(
    shoe_id: uuid.UUID,
    file: UploadFile = File(...),
    sort_order: int = Form(0),
    db: Session = Depends(get_db),
):
    if shoe_service.get_shoe(db, shoe_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shoe not found")

    data = await file.read()
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="Image too large")

    try:
        return shoe_service.upload_shoe_image(db, shoe_id, data, sort_order)
    except UnidentifiedImageError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid image file") from exc
    except ImageTooLargeError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.patch(
    "/{shoe_id}/images/{image_id}",
    response_model=ShoeImageOut,
    dependencies=[Depends(require_admin_session)],
)
def update_shoe_image(shoe_id: uuid.UUID, image_id: uuid.UUID, payload: ShoeImageUpdate, db: Session = Depends(get_db)):
    image = shoe_service.update_shoe_image(db, image_id, payload.sort_order)
    if image is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Image not found")
    return image


@router.delete(
    "/{shoe_id}/images/{image_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_admin_session)],
)
def delete_shoe_image(shoe_id: uuid.UUID, image_id: uuid.UUID, db: Session = Depends(get_db)):
    if not shoe_service.delete_shoe_image(db, image_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Image not found")
