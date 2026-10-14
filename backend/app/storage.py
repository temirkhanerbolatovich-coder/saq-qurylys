import hashlib
import os
import tempfile
from pathlib import Path


def save_text(root: Path, text: str) -> tuple[str, str, int]:
    """Keep the exact UTF-8 input under a content hash, outside the public directory."""
    content = text.encode('utf-8')
    digest = hashlib.sha256(content).hexdigest()
    key = f'{digest[:2]}/{digest}.txt'
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
