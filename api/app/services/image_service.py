import io
import uuid

from PIL import Image

from app.config.supabase import get_supabase

BUCKET_NAME = "shoe-photos"
MAX_DIMENSION = 1600
# Declared width*height above this is rejected before any pixel data is decoded — a small file
# can still claim huge dimensions (a "decompression bomb"), and Image.open() only reads the
# header, so this check has to happen before .convert()/.thumbnail() force a full decode.
MAX_PIXELS = 40_000_000
WEBP_QUALITY = 80


class ImageTooLargeError(ValueError):
    """Raised when an uploaded image's declared pixel dimensions exceed what we'll decode."""


def compress_image(data: bytes) -> bytes:
    """Downscale and re-encode as WEBP so uploads stay well within Supabase's free storage tier.

    Raises PIL.UnidentifiedImageError if `data` isn't a readable image, or ImageTooLargeError
    if its declared dimensions are large enough to be a decompression-bomb risk. (Pillow has its
    own built-in decompression-bomb guard too — for anything beyond MAX_PIXELS but under
    Pillow's own much higher threshold, our check below catches it; for anything past Pillow's
    own threshold, Image.open() itself raises DecompressionBombError, which we fold into the
    same ImageTooLargeError so callers only need to handle one exception type.)
    """
    try:
        with Image.open(io.BytesIO(data)) as image:
            if image.width * image.height > MAX_PIXELS:
                raise ImageTooLargeError(f"Image is {image.width}x{image.height}, which exceeds the size limit.")
            image = image.convert("RGBA" if "A" in image.getbands() else "RGB")
            image.thumbnail((MAX_DIMENSION, MAX_DIMENSION), Image.LANCZOS)
            buffer = io.BytesIO()
            image.save(buffer, format="WEBP", quality=WEBP_QUALITY, method=6)
            return buffer.getvalue()
    except Image.DecompressionBombError as exc:
        raise ImageTooLargeError("Image dimensions are too large.") from exc


def upload_image(data: bytes, folder: str) -> str:
    """Compresses the image and uploads it to Supabase Storage, returning its public URL."""
    compressed = compress_image(data)
    path = f"{folder}/{uuid.uuid4()}.webp"

    client = get_supabase()
    client.storage.from_(BUCKET_NAME).upload(path, compressed, {"content-type": "image/webp"})
    return client.storage.from_(BUCKET_NAME).get_public_url(path)


def delete_image(image_url: str) -> None:
    """Best-effort removal of a previously uploaded image from Storage, given its public URL."""
    marker = f"/{BUCKET_NAME}/"
    if not image_url or marker not in image_url:
        return
    path = image_url.split(marker, 1)[1].split("?", 1)[0]

    client = get_supabase()
    client.storage.from_(BUCKET_NAME).remove([path])


def delete_images(image_urls: list[str | None]) -> None:
    """Removes several images in one call, ignoring blanks and anything not in our bucket.

    Deletes cascade in the database (a shoe takes its images, a material takes its swatches,
    a company takes its orders), but Postgres knows nothing about Storage — so without an
    explicit sweep every cascade leaves files behind that nothing will ever reference or
    reclaim. Best-effort by design: a failure here must not roll back the delete itself.
    """
    marker = f"/{BUCKET_NAME}/"
    paths = [
        url.split(marker, 1)[1].split("?", 1)[0]
        for url in image_urls
        if url and marker in url
    ]
    if not paths:
        return
    try:
        get_supabase().storage.from_(BUCKET_NAME).remove(paths)
    except Exception:  # noqa: BLE001 - storage cleanup must never block the DB delete
        pass


def collect_notes_image_urls(notes_blocks: list | None) -> list[str]:
    """Pulls the uploaded photo/drawing URLs out of an order's notes_blocks.
    Selection blocks are skipped — their `value` points at a shared attribute image that
    other orders still reference, so deleting it would blank out unrelated records."""
    if not notes_blocks:
        return []
    return [
        block.get("value")
        for block in notes_blocks
        if isinstance(block, dict) and block.get("type") in ("photo", "drawing") and block.get("value")
    ]
