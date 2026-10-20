"""Verify downloaded DEMO intake artifacts independently of the browser UI.

Run with the artifact directory printed by zz-tz-v2-journey.spec.ts.
Requires pypdf from backend/requirements-dev.txt. This does not contact the app,
change PDFs, or replace rendering/visual inspection of every page.
"""

import argparse
import csv
import hashlib
import io
import json
from datetime import datetime
from pathlib import Path

from pypdf import PdfReader


def require(condition, message):
    if not condition:
        raise ValueError(message)


def read_bounded(path):
    require(path.stat().st_size <= 10_485_760, f'Artifact exceeds 10 MiB: {path.name}')
    return path.read_bytes()


def verify(folder):
    record = json.loads(read_bounded(folder / 'evidence.json'))
    intake, detail = record['intake'], record['signal']
    signal, snapshot = detail['signal'], detail['snapshot']
    historical = record['historical_signal']
    require(signal['is_demo'] and snapshot['property']['is_demo'], 'Expected DEMO data only')
    require(signal['state'] == 'CONFIRMED', 'Expected an explicit signal decision')
    require(signal['risk_snapshot']['score'] == 25, 'Unexpected score')
    require(
        signal['risk_snapshot']['confirmed_codes'] == ['R2'],
        'Expected only reviewed R2',
    )
    require(
        snapshot['property']['legal_verification_status'] == 'UNKNOWN',
        'Legal status changed',
    )
    require(historical['snapshot'] == snapshot, 'Historical snapshot changed')
    require(historical['decisions'] == detail['decisions'], 'Historical decisions changed')
    require(
        historical['signal']['is_stale'] and historical['signal']['state'] == 'CONFIRMED',
        'Expected the archived confirmed version after its successor',
    )

    raw_csv = read_bounded(folder / 'intake-original.csv')
    raw_text = read_bounded(folder / 'original-downloaded.txt')
    pdf = read_bounded(folder / 'signal-archived.pdf')
    for data, expected in [
        (raw_csv, intake['csv_sha256']),
        (raw_text, record['original_sha256']),
        (pdf, record['pdf_sha256']),
    ]:
        require(hashlib.sha256(data).hexdigest() == expected, 'Downloaded hash mismatch')
    rows = list(csv.DictReader(io.StringIO(raw_csv.decode('utf-8-sig'), newline='')))
    require(
        len(rows) == 1 and rows[0]['text'] == raw_text.decode('utf-8'),
        'CSV/text mismatch',
    )
    require(rows[0]['source_label'].startswith('DEMO '), 'Synthetic source label missing')
    require(rows[0]['source_url'] == intake['source_url'], 'Source URL changed')
    require(
        record['original_sha256'] in [asset['sha256'] for asset in snapshot['assets']],
        'Signal does not reference the downloaded text',
    )
    require(
        record['advertisement_id'] in [item['advertisement_id'] for item in snapshot['evidence']],
        'Evidence refers to another publication',
    )

    require(
        pdf.startswith(b'%PDF-') and len(pdf) == record['pdf_bytes'],
        'Invalid PDF bytes',
    )
    reader = PdfReader(io.BytesIO(pdf))
    texts = [page.extract_text() or '' for page in reader.pages]
    require(texts and all(text.strip() for text in texts), 'Empty PDF page')
    for page in reader.pages:
        require(
            abs(float(page.mediabox.width) - 595.28) < 2 and abs(float(page.mediabox.height) - 841.89) < 2,
            'Expected A4 pages',
        )
    evidence = snapshot['evidence'][0]
    require(
        datetime.fromisoformat(evidence['event_at']) == datetime.fromisoformat(intake['published_at']),
        'Publication date was replaced',
    )
    require(
        datetime.fromisoformat(evidence['captured_at']) == datetime.fromisoformat(intake['captured_at']),
        'Capture date changed',
    )
    text = '\n'.join(texts)
    normalized = ' '.join(text.split())
    for expected in [
        record['signal_id'],
        record['original_sha256'],
        snapshot['property']['name'],
        rows[0]['source_label'],
        intake['source_url'],
        evidence['event_at'],
        evidence['captured_at'],
        'DEMO - синтетические данные',
        'R2 / CONFIRMED / 25',
        '25 / YELLOW',
        'UNKNOWN',
        'Өскемен',
        'Ә',
        'не устанавливает факт правонарушения',
        'Это не подтверждает R1.',
    ]:
        require(
            ' '.join(expected.split()) in normalized,
            f'Expected PDF text missing: {expected}',
        )
    require('\ufffd' not in text, 'PDF contains a replacement character')
    for index, page_text in enumerate(texts, 1):
        require(f'Страница {index} / {len(texts)}' in page_text, 'Page numbering missing')
    report = {
        'verified': True,
        'pages': len(texts),
        'pdf_bytes': len(pdf),
        'pdf_sha256': record['pdf_sha256'],
        'csv_sha256': intake['csv_sha256'],
        'text_sha256': record['original_sha256'],
        'signal_id': record['signal_id'],
        'automatic_visual_check': False,
        'note': 'Render and inspect every page separately; no external/legal acceptance implied',
    }
    (folder / 'pdf-verification.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
    return report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('folder', type=Path)
    args = parser.parse_args()
    try:
        print(json.dumps(verify(args.folder), ensure_ascii=True))
    except (OSError, ValueError, KeyError) as error:
        parser.exit(1, f'Intake artifact verification failed: {type(error).__name__}\n')


if __name__ == '__main__':
    main()
