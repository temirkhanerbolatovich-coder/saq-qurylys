"""Bounded download names; these never rename stored sources or PDF artifacts."""

import re
import unicodedata
from datetime import date, datetime
from urllib.parse import quote
from uuid import UUID

MAX_FILENAME_BYTES = 220
MAX_CONTEXT_BYTES = 96


def _safe_stem(value: str, byte_limit: int) -> str:
    value = unicodedata.normalize('NFC', value)
    value = ''.join(character if character.isalnum() or character in ' _-' else '-' for character in value)
    value = re.sub(r'[\s_-]+', '-', value).strip('-')
    return value.encode('utf-8')[:byte_limit].decode('utf-8', errors='ignore').rstrip('-')


def _saved_date(value: date | datetime | str | None) -> str:
    if isinstance(value, datetime):
        return value.date().isoformat()
    if isinstance(value, date):
        return value.isoformat()
    if isinstance(value, str):
        try:
            return date.fromisoformat(value[:10]).isoformat()
        except ValueError:
            pass  # Incomplete historical metadata must not prevent a valid download.
    return ''


def pdf_filename(
    kind: str,
    id: UUID,
    *,
    context: str = '',
    saved_at: date | datetime | str | None = None,
    version: int | None = None,
    revision: int | None = None,
) -> str:
    """Keep type, full record ID and versions even when an untrusted label is shortened."""
    kind = re.sub(r'[^a-z0-9-]+', '-', kind.lower()).strip('-')[:40] or 'document'
    prefix = f'saq-{kind}'
    saved_date = _saved_date(saved_at)
    suffix = f'-{saved_date}' if saved_date else ''
    suffix += f'-{UUID(str(id))}'
    if version is not None:
        suffix += f'-v{int(version)}'
    if revision is not None:
        suffix += f'-r{int(revision)}'
    suffix += '.pdf'
    available = MAX_FILENAME_BYTES - len((prefix + suffix).encode('utf-8')) - 1
    label = _safe_stem(context, min(MAX_CONTEXT_BYTES, available)) if isinstance(context, str) else ''
    return f'{prefix}{"-" + label if label else ""}{suffix}'


def signal_pdf_filename(signal) -> str:
    """A historical signal name comes only from that signal's frozen identity and date."""
    return pdf_filename(
        'signal',
        signal.id,
        context=signal.snapshot['property']['name'],
        saved_at=signal.created_at,
        version=signal.version,
        revision=signal.revision,
    )


def pdf_content_disposition(filename: str) -> str:
    """RFC 6266 attachment with a safe ASCII fallback and UTF-8 filename*."""
    stem = _safe_stem(filename.removesuffix('.pdf'), MAX_FILENAME_BYTES - 4) or 'saq-document'
    name = f'{stem}.pdf'
    fallback = unicodedata.normalize('NFKD', stem).encode('ascii', errors='ignore').decode('ascii')
    fallback = _safe_stem(fallback, MAX_FILENAME_BYTES - 4) or 'saq-document'
    return f'attachment; filename="{fallback}.pdf"; filename*=UTF-8\'\'{quote(name, safe="")}'
