import uuid

from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.db.models import AttributeCategory, ShoeAttributeOption
from app.schema.attribute import AttributeOptionCreate, AttributeOptionUpdate
from app.services import image_service

# Human-readable labels for the 409 message — "A buckle named X already exists" reads better
# than the raw category enum, and swatches aren't a category at all (they're parented materials).
_CATEGORY_LABELS = {
    AttributeCategory.material: "material",
    AttributeCategory.mold_type: "mold type",
    AttributeCategory.heel_type: "heel type",
    AttributeCategory.buckle: "buckle",
    AttributeCategory.slingback: "slingback",
    AttributeCategory.flatform: "flatform",
}


def _duplicate_name_error(name: str, category: AttributeCategory, is_swatch: bool) -> HTTPException:
    label = "swatch" if is_swatch else _CATEGORY_LABELS.get(category, "option")
    scope = " in this material" if is_swatch else ""
    return HTTPException(
        status_code=status.HTTP_409_CONFLICT,
        detail=f'A {label} named "{name}" already exists{scope}.',
    )


def list_attribute_options(db: Session, category: AttributeCategory | None = None) -> list[ShoeAttributeOption]:
    query = db.query(ShoeAttributeOption)
    if category is not None:
        query = query.filter(ShoeAttributeOption.category == category)
    return query.order_by(ShoeAttributeOption.created_at.desc()).all()


def get_attribute_option(db: Session, option_id: uuid.UUID) -> ShoeAttributeOption | None:
    return db.query(ShoeAttributeOption).filter(ShoeAttributeOption.id == option_id).first()


def create_attribute_option(db: Session, data: AttributeOptionCreate) -> ShoeAttributeOption:
    option = ShoeAttributeOption(**data.model_dump())
    db.add(option)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise _duplicate_name_error(data.name, data.category, data.parent_id is not None) from exc
    db.refresh(option)
    return option


def update_attribute_option(
    db: Session, option_id: uuid.UUID, data: AttributeOptionUpdate
) -> ShoeAttributeOption | None:
    option = get_attribute_option(db, option_id)
    if option is None:
        return None
    changes = data.model_dump(exclude_unset=True)
    category, parent_id = option.category, option.parent_id
    for field, value in changes.items():
        setattr(option, field, value)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise _duplicate_name_error(changes.get("name", ""), category, parent_id is not None) from exc
    db.refresh(option)
    return option


def delete_attribute_option(db: Session, option_id: uuid.UUID) -> bool:
    option = get_attribute_option(db, option_id)
    if option is None:
        return False
    if option.image_url:
        image_service.delete_image(option.image_url)
    db.delete(option)
    db.commit()
    return True


def upload_attribute_image(db: Session, option_id: uuid.UUID, data: bytes) -> ShoeAttributeOption | None:
    """Compresses `data`, uploads it, and replaces the option's image (deleting the old one, if any)."""
    option = get_attribute_option(db, option_id)
    if option is None:
        return None

    previous_url = option.image_url
    option.image_url = image_service.upload_image(data, folder=f"attributes/{option_id}")
    db.commit()
    db.refresh(option)

    if previous_url:
        image_service.delete_image(previous_url)

    return option
