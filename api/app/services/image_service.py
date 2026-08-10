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
    if marker not in image_url:
        return
    path = image_url.split(marker, 1)[1].split("?", 1)[0]

    client = get_supabase()
    client.storage.from_(BUCKET_NAME).remove([path])
