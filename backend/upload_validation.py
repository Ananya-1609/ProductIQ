"""Bounded upload reading and content-based image validation."""

import warnings
from io import BytesIO
from pathlib import Path
from uuid import uuid4

from fastapi import HTTPException, UploadFile
from fastapi.responses import JSONResponse
from PIL import Image, UnidentifiedImageError

MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024
MAX_IMAGE_PIXELS = 25_000_000
SUPPORTED_IMAGE_FORMATS = {
    "JPEG": (".jpg", "image/jpeg"),
    "PNG": (".png", "image/png"),
    "WEBP": (".webp", "image/webp"),
}
SUPPORTED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
MAX_MULTIPART_BODY_BYTES = MAX_IMAGE_SIZE_BYTES + 1024 * 1024


class UploadRequestBodyLimitMiddleware:
    """Bound request buffering before Starlette parses multipart uploads."""

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if (scope["type"] != "http" or scope.get("method") != "POST"
                or scope.get("path") not in {"/predict", "/analyze"}):
            await self.app(scope, receive, send)
            return

        headers = {key.lower(): value for key, value in scope.get("headers", [])}
        content_length = headers.get(b"content-length")
        if content_length:
            try:
                if int(content_length) > MAX_MULTIPART_BODY_BYTES:
                    response = JSONResponse(status_code=413, content={"detail": "Image request exceeds upload limit"})
                    await response(scope, receive, send)
                    return
            except ValueError:
                pass

        messages = []
        total_bytes = 0
        while True:
            message = await receive()
            if message["type"] == "http.disconnect":
                return
            if message["type"] != "http.request":
                continue
            total_bytes += len(message.get("body", b""))
            if total_bytes > MAX_MULTIPART_BODY_BYTES:
                response = JSONResponse(status_code=413, content={"detail": "Image request exceeds upload limit"})
                await response(scope, receive, send)
                return
            messages.append(message)
            if not message.get("more_body", False):
                break

        async def replay_receive():
            if messages:
                return messages.pop(0)
            return await receive()

        await self.app(scope, replay_receive, send)


async def read_validated_image(file: UploadFile):
    """Return image bytes, safe suffix and MIME after bounded content checks."""
    extension = Path(file.filename or "").suffix.lower()
    if extension not in SUPPORTED_EXTENSIONS:
        raise HTTPException(status_code=415, detail="Unsupported image format")

    image_bytes = bytearray()
    while True:
        chunk = await file.read(min(1024 * 1024, MAX_IMAGE_SIZE_BYTES + 1 - len(image_bytes)))
        if not chunk:
            break
        image_bytes.extend(chunk)
        if len(image_bytes) > MAX_IMAGE_SIZE_BYTES:
            raise HTTPException(status_code=413, detail="Image exceeds the 10 MB upload limit")

    if not image_bytes:
        raise HTTPException(status_code=400, detail="Image file is empty")

    try:
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            with Image.open(BytesIO(image_bytes)) as image:
                image_format = image.format
                if image.width * image.height > MAX_IMAGE_PIXELS:
                    raise HTTPException(status_code=400, detail="Image dimensions are too large")
                image.verify()
            if image_format not in SUPPORTED_IMAGE_FORMATS:
                raise HTTPException(status_code=415, detail="Unsupported image format")
            with Image.open(BytesIO(image_bytes)) as image:
                image.load()
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError, Image.DecompressionBombWarning) as error:
        raise HTTPException(status_code=400, detail="Invalid or corrupted image") from error

    expected_extension, mime_type = SUPPORTED_IMAGE_FORMATS[image_format]
    compatible_extensions = {expected_extension}
    if image_format == "JPEG":
        compatible_extensions.add(".jpeg")
    if extension not in compatible_extensions:
        raise HTTPException(status_code=415, detail="Image content does not match its file extension")
    return bytes(image_bytes), expected_extension, mime_type


def save_validated_image(image_bytes: bytes, extension: str, upload_root: Path):
    """Save only to a generated path directly inside upload_root."""
    root = upload_root.resolve()
    filename = f"{uuid4()}{extension}"
    path = (root / filename).resolve()
    if path.parent != root:
        raise HTTPException(status_code=400, detail="Invalid image path")
    with path.open("wb") as image_file:
        image_file.write(image_bytes)
    return filename, str(path)
