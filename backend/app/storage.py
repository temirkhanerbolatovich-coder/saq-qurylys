import hashlib
import os
import tempfile
from pathlib import Path


def save_text(root: Path, text: str) -> tuple[str, str, int]:
    """Keep the exact UTF-8 input under a content hash, outside the public directory."""
    return save_bytes(root, text.encode('utf-8'), 'txt')


def save_bytes(root: Path, content: bytes, extension: str) -> tuple[str, str, int]:
    if extension not in {'txt', 'png', 'jpg', 'pdf', 'html'}:
        raise ValueError('Unsupported storage extension')
    digest = hashlib.sha256(content).hexdigest()
    key = f'{digest[:2]}/{digest}.{extension}'
    target = root / key
    target.parent.mkdir(parents=True, exist_ok=True)
    if target.exists():
        if target.read_bytes() != content:
            raise OSError('Stored asset integrity check failed')
        return key, digest, len(content)
    handle, temporary = tempfile.mkstemp(dir=target.parent)
    try:
        with os.fdopen(handle, 'wb') as stream:
            stream.write(content)
        os.replace(temporary, target)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)
    return key, digest, len(content)


def read_asset(root: Path, storage_key: str, digest: str, max_size: int = 10_485_760) -> bytes:
    target = (root / storage_key).resolve()
    if not target.is_relative_to(root.resolve()) or not target.is_file():
        raise OSError('Saved material is unavailable')
    if target.stat().st_size > max_size:
        raise OSError('Saved material exceeds size limit')
    content = target.read_bytes()
    if hashlib.sha256(content).hexdigest() != digest:
        raise OSError('Saved material integrity check failed')
    return content
