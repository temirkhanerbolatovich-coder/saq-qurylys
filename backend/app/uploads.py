import io
import warnings

from PIL import Image, UnidentifiedImageError
from starlette.exceptions import HTTPException


def validate_text(content: bytes) -> str:
    """Validate UTF-8 without normalizing bytes, line endings or an optional BOM."""
    try:
        text = content.decode('utf-8')
    except UnicodeDecodeError:
        raise HTTPException(415, 'TXT должен быть в кодировке UTF-8') from None
    if len(text) > 100_000:
        raise HTTPException(413, 'В TXT допускается до 100000 символов')
    if any(ord(char) < 32 and char not in '\t\r\n' or ord(char) == 127 for char in text):
        raise HTTPException(415, 'TXT содержит недопустимые управляющие символы')
    if not text.lstrip('\ufeff').strip():
        raise HTTPException(422, 'TXT не должен быть пустым')
    return text


def validate_image(content: bytes, mime_type: str | None, max_pixels: int) -> tuple[str, str]:
    try:
        with warnings.catch_warnings():
            warnings.simplefilter('error', Image.DecompressionBombWarning)
            with Image.open(io.BytesIO(content)) as image:
                if image.format not in {'PNG', 'JPEG'} or getattr(image, 'n_frames', 1) != 1:
                    raise HTTPException(415, 'Разрешены только однокадровые PNG и JPEG')
                if image.width * image.height > max_pixels or min(image.size) < 10:
                    raise HTTPException(413, 'Недопустимые размеры изображения')
                expected = 'image/png' if image.format == 'PNG' else 'image/jpeg'
                if mime_type not in {expected, 'application/octet-stream', None}:
                    raise HTTPException(415, 'Содержимое не соответствует типу файла')
                extension = 'png' if image.format == 'PNG' else 'jpg'
                image.verify()
            # verify() checks the container; load() also detects a truncated pixel stream.
            with Image.open(io.BytesIO(content)) as image:
                image.load()
        return expected, extension
    except (UnidentifiedImageError, OSError, SyntaxError, Image.DecompressionBombWarning, Image.DecompressionBombError):
        raise HTTPException(415, 'Файл не является корректным PNG/JPEG') from None
