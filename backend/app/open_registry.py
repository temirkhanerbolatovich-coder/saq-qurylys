"""Operator-supplied KHC register PDFs: bounded text lookup, never a legal verdict."""

import io
import json
import logging
import re
import signal
import subprocess
import sys
import unicodedata
from datetime import date, datetime
from threading import BoundedSemaphore
from typing import Literal
from urllib.parse import urlsplit
from uuid import UUID, uuid4

from pydantic import Field, field_validator
from sqlalchemy import JSON, Date, DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column
from starlette.exceptions import HTTPException

from app.dto import DTO
from app.models import Base, utcnow
from app.pdf_validation import PdfRejected, _check_envelope, _inspect_document, _resource_limits

SOURCE_PAGE_URL = 'https://khc.kz/ru/equity/uslugi/357/3260/'
PUBLISHER = 'АО «Казахстанская Жилищная Компания»'
MAX_INPUT_BYTES = 5 * 1024 * 1024
MAX_PAGES = 50
MAX_PAGE_TEXT = 30_000
MAX_TOTAL_TEXT = 250_000
MAX_OUTPUT_BYTES = 2 * 1024 * 1024
MAX_SNIPPET = 1400
_EXTRACTION_SLOTS = BoundedSemaphore(2)
PROVENANCE_NOTICE = (
    'Файл загружен аналитиком; ссылка и издатель указаны для проверки происхождения. '
    'Подлинность файла по адресу источника автоматически не подтверждена.'
)
LIMITATIONS = (
    'Поиск показывает совпадения слов на странице, которые могут относиться к разным записям. '
    'Очередь, статус и применимость документа требуют проверки оригинала. '
    'Отсутствие совпадения не доказывает отсутствие основания и не меняет риск. '
    'Лицензия повторного использования не установлена; автоматическая загрузка с сайта не выполняется.'
)
_MESSAGES = {
    413: 'Реестр превышает лимит размера, страниц или извлечённого текста',
    415: 'Нужен читаемый PDF реестра гарантий КЖК с датой состояния, без действий и вложений',
    503: 'Извлечение реестра временно недоступно. Повторите позже; требуется Linux Docker.',
}


class OpenRegistryDocument(Base):
    __tablename__ = 'open_registry_documents'
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    asset_id: Mapped[UUID] = mapped_column(ForeignKey('assets.id'), unique=True)
    source_url: Mapped[str] = mapped_column(String(2048))
    publisher: Mapped[str] = mapped_column(String(300))
    as_of: Mapped[date] = mapped_column(Date)
    pages: Mapped[list] = mapped_column(JSON)
    sha256: Mapped[str] = mapped_column(String(64), unique=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, index=True)
    created_by: Mapped[UUID] = mapped_column(ForeignKey('users.id'))

    @property
    def page_count(self) -> int:
        return len(self.pages)

    @property
    def original_url(self) -> str:
        return f'/api/v1/assets/{self.asset_id}'


class OpenRegistryImport(DTO):
    source_url: str = Field(min_length=1, max_length=2048)

    @field_validator('source_url')
    @classmethod
    def official_pdf_url(cls, value: str) -> str:
        """Validate attribution only: this URL is never fetched by the application."""
        value = value.strip()
        try:
            parts = urlsplit(value)
            port = parts.port
        except ValueError:
            raise ValueError('Укажите HTTPS-ссылку на PDF КЖК') from None
        if (
            parts.scheme != 'https'
            or parts.hostname != 'khc.kz'
            or port not in {None, 443}
            or parts.username is not None
            or parts.password is not None
            or parts.query
            or parts.fragment
            or not re.fullmatch(r'/upload/[A-Za-z0-9_./-]+\.pdf', parts.path)
            or any(part in {'.', '..'} for part in parts.path.split('/'))
            or any(ord(char) <= 32 for char in value)
        ):
            raise ValueError('Укажите HTTPS-ссылку khc.kz/upload/…pdf без параметров')
        return value


class RegistryPage(DTO):
    page_number: int = Field(ge=1, le=MAX_PAGES)
    text: str = Field(max_length=MAX_PAGE_TEXT)


class ExtractedRegister(DTO):
    as_of: date
    pages: list[RegistryPage] = Field(min_length=1, max_length=MAX_PAGES)


class OpenRegistryDocumentOut(DTO):
    id: UUID
    asset_id: UUID
    source_url: str
    publisher: str
    as_of: date
    page_count: int
    sha256: str
    created_at: datetime
    created_by: UUID
    original_url: str
    source_page_url: Literal[SOURCE_PAGE_URL] = SOURCE_PAGE_URL
    is_demo: Literal[False] = False
    provenance_notice: str = PROVENANCE_NOTICE
    limitations: str = LIMITATIONS


class PageHit(DTO):
    page_number: int = Field(ge=1, le=MAX_PAGES)
    snippet: str = Field(max_length=MAX_SNIPPET)
    matched_terms: list[str]


class OpenRegistrySearchOut(DTO):
    document: OpenRegistryDocumentOut
    query: str
    items: list[PageHit]
    total: int


def normalized_text(value: str) -> str:
    return ' '.join(unicodedata.normalize('NFC', value).casefold().split())


def register_metadata(pages: list[dict]) -> ExtractedRegister:
    """Accept bounded extracted pages and read only the register's stated date."""
    if not 1 <= len(pages) <= MAX_PAGES:
        raise PdfRejected(413)
    if sum(len(page['text']) for page in pages) > MAX_TOTAL_TEXT:
        raise PdfRejected(413)
    if any(len(page['text']) > MAX_PAGE_TEXT for page in pages):
        raise PdfRejected(413)
    first = normalized_text(pages[0]['text'])
    if 'реестр договоров о предоставлении гарантии по строящимся объектам' not in first:
        raise PdfRejected(415)
    match = re.search(r'по состоянию на\s+(\d{2})\s*\.\s*(\d{2})\s*\.\s*(\d{4})', first)
    if not match:
        raise PdfRejected(415)
    try:
        as_of = date(int(match[3]), int(match[2]), int(match[1]))
        if as_of > utcnow().date():
            raise ValueError('Future register date')
        return ExtractedRegister(as_of=as_of, pages=pages)
    except ValueError:
        raise PdfRejected(415) from None


def _extract_pages(content: bytes) -> ExtractedRegister:
    """Child-process implementation: all PDF decoding stays inside resource limits."""
    from pypdf import PdfReader

    _inspect_document(content, MAX_PAGES)
    reader = PdfReader(io.BytesIO(content), strict=True)
    pages, total = [], 0
    for number, page in enumerate(reader.pages, 1):
        text = page.extract_text() or ''
        total += len(text)
        if len(text) > MAX_PAGE_TEXT or total > MAX_TOTAL_TEXT:
            raise PdfRejected(413)
        pages.append({'page_number': number, 'text': text})
    return register_metadata(pages)


def _worker() -> None:
    payload = {'status': 503}
    try:
        _resource_limits(8)
        logging.disable(logging.CRITICAL)
        content = sys.stdin.buffer.read(MAX_INPUT_BYTES + 1)
        if len(content) > MAX_INPUT_BYTES:
            raise PdfRejected(413)
        result = _extract_pages(content)
        payload = {'status': 200, 'document': result.model_dump(mode='json')}
    except PdfRejected as error:
        payload = {'status': error.status}
    except (MemoryError, RecursionError):
        payload = {'status': 413}
    except ImportError:
        payload = {'status': 503}
    except Exception:
        # Do not propagate parser exceptions containing document bytes or paths.
        payload = {'status': 415}
    sys.stdout.write(json.dumps(payload, ensure_ascii=False))


def extract_register(content: bytes) -> ExtractedRegister:
    """Inspect and extract in a bounded Linux subprocess; raise stable 413/415/503."""
    if len(content) > MAX_INPUT_BYTES:
        raise HTTPException(413, _MESSAGES[413])
    try:
        _check_envelope(content)
    except PdfRejected:
        raise HTTPException(415, _MESSAGES[415]) from None
    if sys.platform != 'linux' or not _EXTRACTION_SLOTS.acquire(blocking=False):
        raise HTTPException(503, _MESSAGES[503])
    try:
        try:
            result = subprocess.run(
                [sys.executable, '-m', 'app.open_registry'],
                input=content,
                stdout=subprocess.PIPE,
                stderr=subprocess.DEVNULL,
                timeout=10,
                check=False,
            )
        except (OSError, subprocess.TimeoutExpired):
            raise HTTPException(503, _MESSAGES[503]) from None
        if result.returncode in {-getattr(signal, 'SIGKILL', 9), -getattr(signal, 'SIGXCPU', 24)}:
            raise HTTPException(413, _MESSAGES[413])
        if result.returncode != 0 or len(result.stdout) > MAX_OUTPUT_BYTES:
            raise HTTPException(503, _MESSAGES[503])
        try:
            payload = json.loads(result.stdout)
            status = payload['status']
            if type(status) is not int or status not in {200, 413, 415, 503}:
                raise ValueError('Invalid worker status')
            if status != 200:
                raise HTTPException(status, _MESSAGES[status])
            result = ExtractedRegister.model_validate(payload['document'])
            if [page.page_number for page in result.pages] != list(range(1, len(result.pages) + 1)):
                raise ValueError('Invalid page order')
            if sum(len(page.text) for page in result.pages) > MAX_TOTAL_TEXT:
                raise ValueError('Invalid text limit')
            return result
        except (KeyError, TypeError, ValueError, UnicodeError):
            raise HTTPException(503, _MESSAGES[503]) from None
    finally:
        _EXTRACTION_SLOTS.release()


def search_pages(pages: list[dict], query: str) -> list[PageHit]:
    """Require every query term on a page; hits do not imply one entity or record."""
    terms = list(dict.fromkeys(re.findall(r'[^\W_]+', normalized_text(query))))
    if not 2 <= len(query.strip()) <= 100 or not terms:
        raise HTTPException(422, 'Введите от 2 до 100 символов для поиска')
    hits = []
    for page in pages:
        text = ' '.join(unicodedata.normalize('NFC', page['text']).split())
        normalized = text.casefold()
        if not all(term in normalized for term in terms):
            continue
        first = min(normalized.find(term) for term in terms)
        start = max(0, first - 250)
        end = min(len(text), start + MAX_SNIPPET - 2)
        snippet = ('…' if start else '') + text[start:end] + ('…' if end < len(text) else '')
        hits.append(PageHit(page_number=page['page_number'], snippet=snippet, matched_terms=terms))
    return hits


if __name__ == '__main__':
    _worker()
