"""Bounded inspection of original PDFs; this is validation, never sanitization."""

import io
import json
import logging
import math
import re
import signal
import subprocess
import sys
from threading import BoundedSemaphore

from starlette.exceptions import HTTPException

MAX_INPUT_BYTES = 20_971_520
MAX_OBJECTS = 10_000
MAX_DEPTH = 50
MAX_NODES = 100_000
MEMORY_LIMIT_BYTES = 512 * 1024 * 1024
_VALIDATION_SLOTS = BoundedSemaphore(2)
_HEADER = re.compile(rb'%PDF-(?:1\.[0-7]|2\.0)(?:\r\n|\r|\n)')
_EOF = re.compile(rb'(?:\r\n|\r|\n)%%EOF[\x00\t\n\f\r ]*\Z')

_ACTIVE_KEYS = frozenset(
    {
        '/AcroForm',
        '/XFA',
        '/AA',
        '/OpenAction',
        '/JS',
        '/JavaScript',
        '/EmbeddedFiles',
        '/EF',
        '/AF',
        '/RichMedia',
        '/Launch',
        '/SubmitForm',
        '/GoToR',
        '/GoToE',
        '/ImportData',
        '/Rendition',
        '/Movie',
        '/Sound',
        '/3D',
        '/URI',
        '/A',
        '/Collection',
        '/FFilter',
        '/FDecodeParms',
        '/UF',
        '/URL',
        '/FS',
    }
)
_ACTIVE_NAMES = frozenset(
    {
        '/JavaScript',
        '/Launch',
        '/SubmitForm',
        '/GoToR',
        '/GoToE',
        '/ImportData',
        '/Rendition',
        '/Movie',
        '/Sound',
        '/RichMedia',
        '/3D',
        '/EmbeddedFile',
        '/Filespec',
        '/Action',
        '/Crypt',
    }
)
_ACTIVE_SUBTYPES = frozenset({'/Movie', '/Sound', '/Screen', '/3D', '/Widget', '/RichMedia'})
_MESSAGES = {
    413: 'PDF превышает лимит страниц или сложности',
    415: 'Нужен корректный PDF без пароля, форм, действий и вложений',
    503: 'Проверка PDF временно недоступна. Повторите позже; для локального запуска используйте Linux Docker.',
}


class PdfRejected(Exception):
    def __init__(self, status: int):
        self.status = status


def _check_envelope(content: bytes) -> None:
    if not _HEADER.match(content) or not _EOF.search(content):
        raise PdfRejected(415)


def _inspect_document(content: bytes, max_pages: int) -> None:
    """Inspect every indexed object, including unreachable and object-stream entries.

    Page content streams are deliberately not decoded or rendered. The subprocess
    resource limits also cover xref/object-stream decompression done by pypdf.
    """
    from pypdf import PdfReader
    from pypdf.generic import (
        ArrayObject,
        DictionaryObject,
        IndirectObject,
        NameObject,
        NumberObject,
        StreamObject,
    )

    _check_envelope(content)
    reader = PdfReader(io.BytesIO(content), strict=True)
    if reader.is_encrypted:
        raise PdfRejected(415)

    declared_size = reader.trailer.get('/Size')
    if not isinstance(declared_size, int) or declared_size < 1:
        raise PdfRejected(415)
    if declared_size > MAX_OBJECTS + 1:
        raise PdfRejected(413)

    references = {
        (number, generation)
        for generation, entries in reader.xref.items()
        if generation != 65535
        for number in entries
        if number != 0
    }
    references.update((number, 0) for number in reader.xref_objStm)
    if len(references) > MAX_OBJECTS:
        raise PdfRejected(413)

    visited_references = set()
    active = set()
    heights = {}
    nodes = 0

    def visit(value, depth=0):
        nonlocal nodes
        nodes += 1
        if nodes > MAX_NODES:
            raise PdfRejected(413)
        if isinstance(value, IndirectObject):
            identity = ('reference', value.idnum, value.generation)
            visited_references.add(identity)
            if len(visited_references) > MAX_OBJECTS:
                raise PdfRejected(413)
        elif isinstance(value, (DictionaryObject, ArrayObject)):
            identity = ('container', id(value))
        else:
            if isinstance(value, NameObject) and value in _ACTIVE_NAMES:
                raise PdfRejected(415)
            if depth > MAX_DEPTH:
                raise PdfRejected(413)
            return 0
        # Page trees contain normal /Parent back references. Cache completed
        # subtree heights so repeated references neither hide depth nor cause
        # quadratic traversal of shared fonts and page trees.
        if identity in active:
            return 0
        if identity in heights:
            if depth + heights[identity] > MAX_DEPTH:
                raise PdfRejected(413)
            return heights[identity]
        if depth > MAX_DEPTH:
            raise PdfRejected(413)
        active.add(identity)
        if isinstance(value, IndirectObject):
            resolved = value.get_object()
            if resolved is None:
                raise PdfRejected(415)
            height = 1 + visit(resolved, depth + 1)
            active.remove(identity)
            heights[identity] = height
            return height
        if isinstance(value, DictionaryObject):
            if _ACTIVE_KEYS.intersection(value):
                raise PdfRejected(415)
            if value.get('/Subtype') in _ACTIVE_SUBTYPES:
                raise PdfRejected(415)
            # /F is also an integer annotation flag; a file specification or an
            # external stream filename must not be mistaken for that flag.
            if '/F' in value and (isinstance(value, StreamObject) or not isinstance(value['/F'], NumberObject)):
                raise PdfRejected(415)
            children = (item for pair in value.items() for item in pair)
        else:
            children = iter(value)
        height = 1 + max((visit(item, depth + 1) for item in children), default=0)
        active.remove(identity)
        heights[identity] = height
        return height

    visit(reader.trailer)
    for number, generation in references:
        visit(IndirectObject(number, generation, reader))

    pages = len(reader.pages)
    if pages < 1:
        raise PdfRejected(415)
    if pages > max_pages:
        raise PdfRejected(413)


def _resource_limits(timeout: float) -> None:
    """Fail closed if the OS cannot bound both address space and CPU time."""
    if sys.platform != 'linux':
        raise PdfRejected(503)
    try:
        import resource

        for kind, requested in (
            (resource.RLIMIT_AS, MEMORY_LIMIT_BYTES),
            (resource.RLIMIT_CPU, max(1, math.ceil(timeout))),
        ):
            _, hard = resource.getrlimit(kind)
            limit = requested if hard == resource.RLIM_INFINITY else min(requested, hard)
            resource.setrlimit(kind, (limit, limit))
    except (ImportError, OSError, ValueError):
        raise PdfRejected(503) from None


def _worker() -> None:
    status = 503
    try:
        if len(sys.argv) != 3:
            raise PdfRejected(503)
        max_pages = int(sys.argv[1])
        timeout = float(sys.argv[2])
        if not 1 <= max_pages <= 500 or not 1 <= timeout <= 10:
            raise PdfRejected(503)
        _resource_limits(timeout)
        logging.disable(logging.CRITICAL)
        content = sys.stdin.buffer.read(MAX_INPUT_BYTES + 1)
        if len(content) > MAX_INPUT_BYTES:
            raise PdfRejected(413)
        _inspect_document(content, max_pages)
        status = 200
    except PdfRejected as error:
        status = error.status
    except (MemoryError, RecursionError):
        status = 413
    except ImportError:
        status = 503
    except Exception:
        # Parser exception strings can contain document bytes or filesystem data.
        # Only a stable public result crosses the subprocess boundary.
        status = 415
    sys.stdout.write(json.dumps({'status': status}))


def validate_pdf(content: bytes, settings) -> None:
    """Accept an unchanged passive PDF or raise 413/415/503.

    The upload route must run this blocking function in its thread pool. Linux is
    required so hostile parser input always runs with CPU/address-space limits.
    Two validation slots per API process bound concurrent parser memory use.
    """
    if len(content) > settings.max_upload_bytes:
        raise HTTPException(413, _MESSAGES[413])
    try:
        _check_envelope(content)
    except PdfRejected:
        raise HTTPException(415, _MESSAGES[415]) from None
    if sys.platform != 'linux' or not _VALIDATION_SLOTS.acquire(blocking=False):
        raise HTTPException(503, _MESSAGES[503])
    try:
        try:
            result = subprocess.run(
                [
                    sys.executable,
                    '-m',
                    'app.pdf_validation',
                    str(settings.pdf_max_pages),
                    str(settings.pdf_validation_timeout_seconds),
                ],
                input=content,
                stdout=subprocess.PIPE,
                stderr=subprocess.DEVNULL,
                timeout=settings.pdf_validation_timeout_seconds,
                check=False,
            )
        except (OSError, subprocess.TimeoutExpired):
            raise HTTPException(503, _MESSAGES[503]) from None
        if result.returncode in {-getattr(signal, 'SIGKILL', 9), -getattr(signal, 'SIGXCPU', 24)}:
            raise HTTPException(413, _MESSAGES[413])
        if result.returncode != 0 or len(result.stdout) > 2048:
            raise HTTPException(503, _MESSAGES[503])
        try:
            payload = json.loads(result.stdout)
        except (ValueError, UnicodeError):
            raise HTTPException(503, _MESSAGES[503]) from None
        if not isinstance(payload, dict) or set(payload) != {'status'} or type(payload['status']) is not int:
            raise HTTPException(503, _MESSAGES[503])
        status = payload['status']
        if status in _MESSAGES:
            raise HTTPException(status, _MESSAGES[status])
        if status != 200:
            raise HTTPException(503, _MESSAGES[503])
    finally:
        _VALIDATION_SLOTS.release()


if __name__ == '__main__':
    _worker()
