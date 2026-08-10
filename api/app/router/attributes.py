import uuid

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from PIL import UnidentifiedImageError
from sqlalchemy.orm import Session

from app.config.auth import require_admin_session
from app.db.base import get_db
from app.db.models import AttributeCategory
from app.schema.attribute import AttributeOptionCreate, AttributeOptionOut, AttributeOptionUpdate
from app.services import attribute_service
from app.services.image_service import ImageTooLargeError

router = APIRouter(prefix="/attributes", tags=["attributes"])

# GET is public — the order form (ShoeDetails) needs to read these to render its pickers.
# Mutations are admin-only (Manage Mode).

MAX_UPLOAD_BYTES = 10 * 1024 * 1024  # raw upload cap, before compression


@router.get("", response_model=list[AttributeOptionOut])
def list_attribute_options(
    category: AttributeCategory | None = Query(default=None),
    db: Session = Depends(get_db),
):
    return attribute_service.list_attribute_options(db, category)


@router.post(
    "",
    response_model=AttributeOptionOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_admin_session)],
)
def create_attribute_option(payload: AttributeOptionCreate, db: Session = Depends(get_db)):
    return attribute_service.create_attribute_option(db, payload)


@router.patch(
    "/{option_id}",
    response_model=AttributeOptionOut,
    dependencies=[Depends(require_admin_session)],
)
def update_attribute_option(option_id: uuid.UUID, payload: AttributeOptionUpdate, db: Session = Depends(get_db)):
    option = attribute_service.update_attribute_option(db, option_id, payload)
    if option is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attribute option not found")
    return option


@router.delete(
    "/{option_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_admin_session)],
)
def delete_attribute_option(option_id: uuid.UUID, db: Session = Depends(get_db)):
    if not attribute_service.delete_attribute_option(db, option_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attribute option not found")


@router.post(
    "/{option_id}/image",
    response_model=AttributeOptionOut,
    dependencies=[Depends(require_admin_session)],
)
async def upload_attribute_image(option_id: uuid.UUID, file: UploadFile = File(...), db: Session = Depends(get_db)):
    data = await file.read()
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="Image too large")

    try:
        option = attribute_service.upload_attribute_image(db, option_id, data)
    except UnidentifiedImageError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid image file") from exc
    except ImageTooLargeError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    if option is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attribute option not found")
    return option
