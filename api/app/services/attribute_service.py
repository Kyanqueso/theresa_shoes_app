import uuid

from sqlalchemy.orm import Session

from app.db.models import AttributeCategory, ShoeAttributeOption
from app.schema.attribute import AttributeOptionCreate, AttributeOptionUpdate
from app.services import image_service


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
    db.commit()
    db.refresh(option)
    return option


def update_attribute_option(
    db: Session, option_id: uuid.UUID, data: AttributeOptionUpdate
) -> ShoeAttributeOption | None:
    option = get_attribute_option(db, option_id)
    if option is None:
        return None
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(option, field, value)
    db.commit()
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
