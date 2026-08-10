import uuid

from sqlalchemy.orm import Session, joinedload

from app.db.models import Shoe, ShoeImage
from app.schema.shoe import ShoeCreate, ShoeUpdate
from app.services import image_service


def list_shoes(db: Session, include_hidden: bool = False) -> list[Shoe]:
    query = db.query(Shoe).options(joinedload(Shoe.images))
    if not include_hidden:
        query = query.filter(Shoe.is_hidden.is_(False))
    return query.order_by(Shoe.created_at.desc()).all()


def get_shoe(db: Session, shoe_id: uuid.UUID) -> Shoe | None:
    return db.query(Shoe).options(joinedload(Shoe.images)).filter(Shoe.id == shoe_id).first()


def create_shoe(db: Session, data: ShoeCreate) -> Shoe:
    shoe = Shoe(**data.model_dump())
    db.add(shoe)
    db.commit()
    db.refresh(shoe)
    return shoe


def update_shoe(db: Session, shoe_id: uuid.UUID, data: ShoeUpdate) -> Shoe | None:
    shoe = get_shoe(db, shoe_id)
    if shoe is None:
        return None
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(shoe, field, value)
    db.commit()
    db.refresh(shoe)
    return shoe


def delete_shoe(db: Session, shoe_id: uuid.UUID) -> bool:
    shoe = get_shoe(db, shoe_id)
    if shoe is None:
        return False
    db.delete(shoe)
    db.commit()
    return True


def add_shoe_image(db: Session, shoe_id: uuid.UUID, image_url: str, sort_order: int = 0) -> ShoeImage:
    image = ShoeImage(shoe_id=shoe_id, image_url=image_url, sort_order=sort_order)
    db.add(image)
    db.commit()
    db.refresh(image)
    return image


def upload_shoe_image(db: Session, shoe_id: uuid.UUID, data: bytes, sort_order: int = 0) -> ShoeImage:
    """Compresses `data` and uploads it to Storage before recording it against the shoe."""
    image_url = image_service.upload_image(data, folder=str(shoe_id))
    return add_shoe_image(db, shoe_id, image_url, sort_order)


def update_shoe_image(db: Session, image_id: uuid.UUID, sort_order: int) -> ShoeImage | None:
    image = db.query(ShoeImage).filter(ShoeImage.id == image_id).first()
    if image is None:
        return None
    image.sort_order = sort_order
    db.commit()
    db.refresh(image)
    return image


def delete_shoe_image(db: Session, image_id: uuid.UUID) -> bool:
    image = db.query(ShoeImage).filter(ShoeImage.id == image_id).first()
    if image is None:
        return False
    image_service.delete_image(image.image_url)
    db.delete(image)
    db.commit()
    return True
