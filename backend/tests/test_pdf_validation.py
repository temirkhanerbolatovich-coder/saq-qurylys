import io
import json
import subprocess
import sys
from threading import BoundedSemaphore
from types import SimpleNamespace

import pytest
from pypdf import PdfWriter
from pypdf.actions import JavaScript
from pypdf.generic import ArrayObject, DictionaryObject, NameObject, NumberObject, TextStringObject
from starlette.exceptions import HTTPException

from app import pdf_validation as pdf


@pytest.fixture
def pdf_settings():
    return SimpleNamespace(max_upload_bytes=10_485_760, pdf_max_pages=100, pdf_validation_timeout_seconds=10)


def document(*, pages=1, change=None):
    writer = PdfWriter()
    for _ in range(pages):
        writer.add_blank_page(width=200, height=200)
    if change:
        change(writer)
    result = io.BytesIO()
    writer.write(result)
    return result.getvalue()


def root_entry(key, value):
    return lambda writer: writer.root_object.__setitem__(NameObject(key), value)


def raw_document(*, root_extra=b'', extra_object=b'<< /Note (passive) >>'):
    """Build exact escaped names and unreachable objects without writer rewriting."""
    objects = [
        b'<< /Type /Catalog /Pages 2 0 R ' + root_extra + b' >>',
        b'<< /Type /Pages /Count 1 /Kids [3 0 R] >>',
        b'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] >>',
        extra_object,
    ]
    content = bytearray(b'%PDF-1.7\n')
    offsets = []
    for number, value in enumerate(objects, 1):
        offsets.append(len(content))
        content.extend(f'{number} 0 obj\n'.encode() + value + b'\nendobj\n')
    xref_offset = len(content)
    content.extend(b'xref\n0 5\n0000000000 65535 f \n')
    for offset in offsets:
        content.extend(f'{offset:010} 00000 n \n'.encode())
    content.extend(f'trailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n{xref_offset}\n%%EOF\n'.encode())
    return bytes(content)


def compressed_document(payload):
    """Object 5 is unreachable and compressed; object 6 is the xref stream."""
    compressed = b'5 0 ' + payload
    objects = [
        b'<< /Type /Catalog /Pages 2 0 R >>',
        b'<< /Type /Pages /Count 1 /Kids [3 0 R] >>',
        b'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] >>',
        f'<< /Type /ObjStm /N 1 /First 4 /Length {len(compressed)} >>\nstream\n'.encode() + compressed + b'\nendstream',
    ]
    content = bytearray(b'%PDF-1.7\n')
    offsets = []
    for number, value in enumerate(objects, 1):
        offsets.append(len(content))
        content.extend(f'{number} 0 obj\n'.encode() + value + b'\nendobj\n')
    xref_offset = len(content)
    entries = [(0, 0, 65535), *((1, offset, 0) for offset in offsets), (2, 4, 0), (1, xref_offset, 0)]
    xref = b''.join(
        bytes([kind]) + field.to_bytes(4, 'big') + index.to_bytes(2, 'big') for kind, field, index in entries
    )
    content.extend(
        f'6 0 obj\n<< /Type /XRef /Size 7 /Root 1 0 R /W [1 4 2] /Length {len(xref)} >>\nstream\n'.encode()
        + xref
        + b'\nendstream\nendobj\n'
        + f'startxref\n{xref_offset}\n%%EOF\n'.encode()
    )
    return bytes(content)


def reject(content, status=415, pages=100):
    with pytest.raises(pdf.PdfRejected) as error:
        pdf._inspect_document(content, pages)
    assert error.value.status == status


def test_accepts_passive_original_and_page_limit_boundary():
    content = document(pages=100)
    original = bytes(content)
    pdf._inspect_document(content, 100)
    assert content == original
    reject(content, 413, pages=99)


@pytest.mark.parametrize('password', ['', 'not-a-real-password'])
def test_rejects_encryption_even_with_empty_password(password):
    reject(document(change=lambda writer: writer.encrypt(password)))


@pytest.mark.parametrize(
    ('key', 'value'),
    [
        ('/AcroForm', DictionaryObject()),
        ('/XFA', TextStringObject('form')),
        ('/AA', DictionaryObject()),
        ('/OpenAction', ArrayObject()),
        ('/JS', TextStringObject('alert(1)')),
        ('/EmbeddedFiles', DictionaryObject()),
        ('/AF', ArrayObject()),
        ('/A', DictionaryObject({NameObject('/S'): NameObject('/GoTo')})),
        ('/URI', TextStringObject('https://example.invalid/')),
    ],
)
def test_rejects_active_dictionary_keys(key, value):
    reject(document(change=root_entry(key, value)))


def test_rejects_javascript_and_embedded_file_created_by_writer():
    reject(document(change=lambda writer: writer.add_open_action(JavaScript('app.alert("test")'))))
    reject(document(change=lambda writer: writer.add_attachment('demo.txt', b'harmless')))


@pytest.mark.parametrize(
    'entry',
    [
        b'<< /S /Launch /F (local.exe) >>',
        b'<< /Type /Filespec /F (https://example.invalid/source.pdf) >>',
        b'<< /Type /EmbeddedFile >>',
        b'<< /Subtype /Screen >>',
        b'<< /Filter /Crypt >>',
        b'<< /F (https://example.invalid/external-stream) >>',
        b'<< /FFilter /FlateDecode >>',
        b'<< /FDecodeParms << >> >>',
    ],
)
def test_rejects_unreachable_active_or_external_objects(entry):
    reject(raw_document(extra_object=entry))


def test_resolves_escaped_names_and_indirect_actions():
    reject(raw_document(root_extra=b'/O#70enAction 4 0 R', extra_object=b'<< /S /J#61vaScript /J#53 (test) >>'))
    reject(raw_document(root_extra=b'/Metadata 4 0 R', extra_object=b'<< /J#53 (test) >>'))


def test_inspects_unreachable_compressed_objects():
    pdf._inspect_document(compressed_document(b'<< /Note (safe) >>'), 100)
    reject(compressed_document(b'<< /J#53 (hidden script) >>'))


def test_integer_annotation_flags_remain_passive():
    pdf._inspect_document(raw_document(extra_object=b'<< /Type /Annot /Subtype /Text /F 4 >>'), 100)


@pytest.mark.parametrize(
    'transform',
    [
        lambda content: b'prefix' + content,
        lambda content: content + b'<script>payload</script>',
        lambda content: content[:-20],
        lambda content: b'%PDF-1.7\nnot a PDF\n%%EOF\n',
    ],
)
def test_rejects_disguised_truncated_and_trailing_content(transform):
    with pytest.raises(Exception) as error:
        pdf._inspect_document(transform(document()), 100)
    assert isinstance(error.value, pdf.PdfRejected) or error.value.__class__.__module__.startswith('pypdf')


def test_rejects_no_pages_and_excessive_object_count(monkeypatch):
    reject(document(pages=0))
    monkeypatch.setattr(pdf, 'MAX_OBJECTS', 3)
    reject(document(), 413)


def test_rejects_deep_direct_and_indirect_structures():
    nested = NumberObject(1)
    for _ in range(60):
        nested = ArrayObject([nested])
    reject(document(change=root_entry('/Nested', nested)), 413)

    def add_chain(writer):
        value = DictionaryObject({NameObject('/Note'): TextStringObject('end')})
        for _ in range(30):
            value = DictionaryObject({NameObject('/Nested'): writer._add_object(value)})
        writer.root_object[NameObject('/Nested')] = writer._add_object(value)

    reject(document(change=add_chain), 413)


def test_rejects_many_nodes_even_when_references_repeat(monkeypatch):
    monkeypatch.setattr(pdf, 'MAX_NODES', 100)
    value = ArrayObject([NumberObject(1)] * 101)
    reject(document(change=root_entry('/Repeated', value)), 413)


def fake_child(monkeypatch, *, stdout=b'{"status":200}', returncode=0):
    monkeypatch.setattr(pdf.sys, 'platform', 'linux')
    monkeypatch.setattr(pdf, '_VALIDATION_SLOTS', BoundedSemaphore(2))
    calls = []

    def run(command, **options):
        calls.append((command, options))
        return SimpleNamespace(stdout=stdout, returncode=returncode)

    monkeypatch.setattr(pdf.subprocess, 'run', run)
    return calls


def test_parent_sends_unchanged_bytes_and_bounded_arguments(monkeypatch, pdf_settings):
    calls = fake_child(monkeypatch)
    content = document()
    pdf.validate_pdf(content, pdf_settings)
    command, options = calls[0]
    assert command == [sys.executable, '-m', 'app.pdf_validation', '100', '10']
    assert options['input'] == content
    assert options['timeout'] == 10
    assert options['stderr'] == subprocess.DEVNULL
    assert 'shell' not in options


@pytest.mark.parametrize(
    ('stdout', 'returncode', 'status'),
    [
        (b'{"status":415}', 0, 415),
        (b'{"status":413}', 0, 413),
        (b'{"status":503}', 0, 503),
        (b'{"status":true}', 0, 503),
        (b'{"status":200,"unexpected":"data"}', 0, 503),
        (b'not-json', 0, 503),
        (b'x' * 2049, 0, 503),
        (b'{"status":200}', 1, 503),
        (b'', -9, 413),
    ],
)
def test_parent_fails_closed_on_worker_results(monkeypatch, pdf_settings, stdout, returncode, status):
    fake_child(monkeypatch, stdout=stdout, returncode=returncode)
    with pytest.raises(HTTPException) as error:
        pdf.validate_pdf(document(), pdf_settings)
    assert error.value.status_code == status
    # Every rejection releases the slot for a later upload.
    assert pdf._VALIDATION_SLOTS.acquire(blocking=False)
    assert pdf._VALIDATION_SLOTS.acquire(blocking=False)
    pdf._VALIDATION_SLOTS.release()
    pdf._VALIDATION_SLOTS.release()


@pytest.mark.parametrize('failure', [OSError('unavailable'), subprocess.TimeoutExpired('validator', 10)])
def test_timeout_or_spawn_failure_is_retryable_and_releases_slot(monkeypatch, pdf_settings, failure):
    fake_child(monkeypatch)

    def fail(*args, **kwargs):
        raise failure

    monkeypatch.setattr(pdf.subprocess, 'run', fail)
    with pytest.raises(HTTPException) as error:
        pdf.validate_pdf(document(), pdf_settings)
    assert error.value.status_code == 503
    assert pdf._VALIDATION_SLOTS.acquire(blocking=False)
    pdf._VALIDATION_SLOTS.release()


def test_concurrency_limit_rejects_before_starting_child(monkeypatch, pdf_settings):
    calls = fake_child(monkeypatch)
    monkeypatch.setattr(pdf, '_VALIDATION_SLOTS', BoundedSemaphore(0))
    with pytest.raises(HTTPException) as error:
        pdf.validate_pdf(document(), pdf_settings)
    assert error.value.status_code == 503
    assert calls == []


def test_wrong_envelope_size_and_unsupported_host_fail_before_parser(monkeypatch, pdf_settings):
    calls = fake_child(monkeypatch)
    with pytest.raises(HTTPException) as error:
        pdf.validate_pdf(b'not a PDF', pdf_settings)
    assert error.value.status_code == 415
    pdf_settings.max_upload_bytes = 1
    with pytest.raises(HTTPException) as error:
        pdf.validate_pdf(document(), pdf_settings)
    assert error.value.status_code == 413
    pdf_settings.max_upload_bytes = 10_485_760
    monkeypatch.setattr(pdf.sys, 'platform', 'win32')
    with pytest.raises(HTTPException) as error:
        pdf.validate_pdf(document(), pdf_settings)
    assert error.value.status_code == 503
    assert calls == []


def test_resource_limit_setup_fails_closed(monkeypatch):
    monkeypatch.setattr(pdf.sys, 'platform', 'linux')

    def unsupported(*args):
        raise OSError('unsupported')

    monkeypatch.setitem(
        sys.modules,
        'resource',
        SimpleNamespace(RLIMIT_AS=1, RLIMIT_CPU=2, RLIM_INFINITY=-1, getrlimit=unsupported),
    )
    with pytest.raises(pdf.PdfRejected) as error:
        pdf._resource_limits(10)
    assert error.value.status == 503


@pytest.mark.skipif(sys.platform != 'linux', reason='Parser resource limits require Linux Docker')
def test_real_bounded_subprocess_accepts_passive_and_rejects_active(pdf_settings):
    pdf.validate_pdf(document(), pdf_settings)
    with pytest.raises(HTTPException) as error:
        pdf.validate_pdf(document(change=lambda writer: writer.add_open_action(JavaScript('test'))), pdf_settings)
    assert error.value.status_code == 415


@pytest.mark.skipif(sys.platform != 'linux', reason='Parser resource limits require Linux Docker')
def test_worker_never_returns_document_or_exception_text():
    secret_marker = b'PRIVATE_PDF_MARKER_DO_NOT_ECHO'
    result = subprocess.run(
        [sys.executable, '-m', 'app.pdf_validation', '100', '10'],
        input=b'%PDF-1.7\n' + secret_marker + b'\n%%EOF\n',
        capture_output=True,
        check=False,
        timeout=10,
    )
    assert result.returncode == 0
    assert json.loads(result.stdout) == {'status': 415}
    assert secret_marker not in result.stdout + result.stderr
