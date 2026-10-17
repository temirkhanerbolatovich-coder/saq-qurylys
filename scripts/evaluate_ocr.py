"""Reproducible, offline evaluation of the production OCR/extractor/matcher; no DB or API writes."""

import argparse
import hashlib
import io
import json
import locale
import platform
import re
import subprocess
import sys
import unicodedata
from datetime import UTC, datetime
from pathlib import Path
from types import SimpleNamespace
from uuid import NAMESPACE_URL, uuid5

import PIL
import rapidfuzz
from PIL import Image, ImageDraw, ImageFilter, ImageFont
from rapidfuzz.distance import Levenshtein

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / 'backend'))
from app.extraction import extract, match_candidates  # noqa: E402
from app.ocr import recognize  # noqa: E402
from app.uploads import validate_image  # noqa: E402

from scripts.evaluation_fields import structured_metrics, validate_labels  # noqa: E402

SOURCE_FILES = [
    'scripts/evaluate_ocr.py',
    'scripts/evaluation_fields.py',
    'backend/app/extraction.py',
    'backend/app/ocr.py',
    'backend/app/uploads.py',
]


def sha256(content):
    return hashlib.sha256(content).hexdigest()


def load_corpus(path):
    if path.stat().st_size > 5_000_000:
        raise ValueError('Corpus manifest exceeds 5 MB')
    corpus = json.loads(path.read_text(encoding='utf-8'))
    if not isinstance(corpus, dict) or not isinstance(corpus.get('provenance'), dict):
        raise ValueError('Expected corpus object with provenance')
    if (
        type(corpus.get('schema_version')) is not int
        or corpus['schema_version'] not in (1, 2)
        or corpus['provenance'].get('kind') not in {'synthetic', 'external'}
    ):
        raise ValueError('Expected schema_version 1 or 2 and synthetic/external provenance')
    properties, cases = corpus.get('properties', []), corpus.get('cases', [])
    if (
        not isinstance(properties, list)
        or not isinstance(cases, list)
        or not 1 <= len(properties) <= 1000
        or not 1 <= len(cases) <= 500
    ):
        raise ValueError('Expected 1..1000 properties and 1..500 cases')
    keys, ids = set(), set()
    for item in properties:
        if not isinstance(item, dict):
            raise ValueError('Each property must be an object')
        key = item.get('key', '')
        if not isinstance(key, str) or not re.fullmatch(r'[a-z][a-z0-9-]{1,40}', key) or key in keys:
            raise ValueError('Invalid or duplicate property key')
        if not isinstance(item.get('name'), str) or not item['name'].strip():
            raise ValueError('Property name is required')
        if not isinstance(item.get('aliases'), list) or any(not isinstance(alias, str) for alias in item['aliases']):
            raise ValueError('Property aliases must be strings')
        keys.add(key)
    for case in cases:
        if not isinstance(case, dict):
            raise ValueError('Each case must be an object')
        identity = case.get('id', '')
        if not isinstance(identity, str) or not re.fullmatch(r'[a-z][a-z0-9-]{1,40}', identity) or identity in ids:
            raise ValueError('Invalid or duplicate case id')
        ids.add(identity)
        if case.get('language') not in {'ru', 'kz'} or type(case.get('readable')) is not bool:
            raise ValueError(f'{identity}: invalid language/readability')
        if not isinstance(case.get('text'), str) or not 1 <= len(case['text']) <= 10000:
            raise ValueError(f'{identity}: expected reference text, 1..10000 characters')
        if case['readable'] and type(case.get('payment_offer')) is not bool:
            raise ValueError(f'{identity}: readable cases need a Boolean payment label')
        if not case['readable'] and (
            case.get('payment_offer') is not None or case.get('target_property_key') is not None
        ):
            raise ValueError(f'{identity}: unreadable cases must not have scored labels')
        if 'payment_offer' not in case or 'target_property_key' not in case:
            raise ValueError(f'{identity}: explicit labels (including null) are required')
        if case.get('target_property_key') is not None and (
            not isinstance(case['target_property_key'], str) or case['target_property_key'] not in keys
        ):
            raise ValueError(f'{identity}: unknown target property')
        if corpus['schema_version'] == 2:
            if 'field_labels' not in case:
                raise ValueError(f'{identity}: explicit field_labels required in schema 2')
            validate_labels(case['field_labels'], case['text'], case['payment_offer'], readable=case['readable'])
        elif 'field_labels' in case:
            raise ValueError(f'{identity}: field_labels require schema_version 2')
        if case.get('image'):
            if not isinstance(case['image'], str):
                raise ValueError(f'{identity}: image must be a relative path string')
            image_path = (path.parent / case['image']).resolve()
            if not image_path.is_relative_to(path.parent.resolve()) or not image_path.is_file():
                raise ValueError(f'{identity}: image must exist inside the corpus directory')
        elif corpus['provenance']['kind'] == 'external':
            raise ValueError(f'{identity}: external cases require an original image')
        elif case.get('render_style') not in {'plain', 'poster', 'compressed', 'unreadable'}:
            raise ValueError(f'{identity}: unknown render style')
        if not case.get('image') and (case['render_style'] == 'unreadable') == case['readable']:
            raise ValueError(f'{identity}: render style contradicts readability label')
    return corpus


def render_case(case, font_path):
    """Render only source text/style, never labels or target keys; originals are retained by the runner."""
    font = ImageFont.truetype(str(font_path), 42 if case['render_style'] == 'poster' else 38)
    lines = []
    for paragraph in case['text'].splitlines():
        line = ''
        for word in paragraph.split():
            candidate = f'{line} {word}'.strip()
            if font.getlength(candidate) > 1440:
                if not line or font.getlength(word) > 1440:
                    raise ValueError('An unbroken word exceeds the image width')
                lines.append(line)
                line = word
            else:
                line = candidate
        lines.append(line)
    height = 100 + 68 * len(lines)
    if height > 5000:
        raise ValueError('Rendered image exceeds height limit')
    image = Image.new('RGB', (1600, height), '#f1f7f5' if case['render_style'] == 'poster' else 'white')
    draw = ImageDraw.Draw(image)
    for index, line in enumerate(lines):
        draw.text((70, 40 + index * 68), line, font=font, fill='#162f39')
    if case['render_style'] == 'compressed':
        image = image.resize((880, round(height * 0.55)), Image.Resampling.LANCZOS)
    if case['render_style'] == 'unreadable':
        image = image.resize((16, 8), Image.Resampling.BOX).resize(image.size, Image.Resampling.BILINEAR)
        image = image.filter(ImageFilter.GaussianBlur(8))
    output = io.BytesIO()
    image.save(output, format='JPEG' if case['render_style'] == 'compressed' else 'PNG', quality=50)
    return output.getvalue()


def predict(text, words, properties, case_id):
    # Ground truth and target_property_key are deliberately not inputs to these production functions.
    identity = uuid5(NAMESPACE_URL, f'saq-evaluation/{case_id}')
    hypotheses, warnings = extract(text, identity, identity, properties, words)
    candidates = match_candidates(text, hypotheses, properties)
    return {
        'text': text,
        'payment_offer': any(item['field'] == 'PAYMENT_TERM' for item in hypotheses),
        'hypotheses': [
            {key: item[key] for key in ['field', 'value', 'fragment', 'review_status']} for item in hypotheses
        ],
        'payment_terms': [
            {'value': item['value'], 'fragment': item['fragment']}
            for item in hypotheses
            if item['field'] == 'PAYMENT_TERM'
        ],
        'candidates': [item['property_id'] for item in candidates],
        'candidate_details': candidates,
        'warnings': warnings,
    }


def normalized_text(value):
    return ' '.join(unicodedata.normalize('NFKC', value).split())


def fraction(numerator, denominator):
    return numerator / denominator if denominator else None


def metrics(records, pipeline):
    readable = [item for item in records if item['expected']['readable']]
    scored = [item for item in readable if item[pipeline] is not None]
    positive = sum(item['expected']['payment_offer'] for item in readable)
    tp = sum(item['expected']['payment_offer'] and item[pipeline]['payment_offer'] for item in scored)
    fp = sum(not item['expected']['payment_offer'] and item[pipeline]['payment_offer'] for item in scored)
    fn = sum(item['expected']['payment_offer'] and not item[pipeline]['payment_offer'] for item in scored)
    tn = len(scored) - tp - fp - fn
    known = [item for item in readable if item['expected']['target_property_key'] is not None]
    hits = {}
    for k in [1, 3]:
        count = sum(
            item[pipeline] is not None and item['expected']['target_property_key'] in item[pipeline]['candidates'][:k]
            for item in known
        )
        hits[f'top{k}_hits'] = count
        hits[f'top{k}_rate'] = fraction(count, len(known))
    unmatched_all = [item for item in readable if item['expected']['target_property_key'] is None]
    unmatched = [item for item in scored if item['expected']['target_property_key'] is None]
    all_chars = sum(len(normalized_text(item['expected']['text'])) for item in readable)
    errors, chars = 0, 0
    ocr_scored = (
        [item for item in readable if item.get('ocr_output') is not None] if pipeline == 'image_pipeline' else scored
    )
    for item in ocr_scored:
        reference = normalized_text(item['expected']['text'])
        observed = normalized_text(
            item['ocr_output']['text'] if pipeline == 'image_pipeline' else item[pipeline]['text']
        )
        errors += Levenshtein.distance(reference, observed)
        chars += len(reference)
    return {
        'readable_count': len(readable),
        'evaluated_count': len(scored),
        'coverage': fraction(len(scored), len(readable)),
        'structured_fields': structured_metrics(
            [
                {
                    'reference_text': item['expected']['text'],
                    'field_labels': item['expected'].get('field_labels'),
                    'prediction': item[pipeline],
                }
                for item in readable
            ]
        ),
        'payment': {
            'tp': tp,
            'fp': fp,
            'fn': fn,
            'tn': tn,
            'expected_positive': positive,
            'precision': fraction(tp, tp + fp),
            'recall_completed': fraction(tp, tp + fn),
            'recall_end_to_end': fraction(tp, positive),
        },
        'matching': {
            'known_target_count': len(known),
            **hits,
            'unmatched_count': len(unmatched_all),
            'unmatched_evaluated': len(unmatched),
            'unmatched_with_candidates': sum(bool(item[pipeline]['candidates']) for item in unmatched),
            'unmatched_false_candidate_rate': fraction(
                sum(bool(item[pipeline]['candidates']) for item in unmatched), len(unmatched)
            ),
        },
        'ocr': {
            'evaluated_count': len(ocr_scored),
            'character_errors': errors,
            'reference_characters': chars,
            'eligible_reference_characters': all_chars,
            'character_coverage': fraction(chars, all_chars),
            'cer': fraction(errors, chars),
        },
        'unreadable': {
            'count': sum(not item['expected']['readable'] for item in records),
            'with_text': sum(
                not item['expected']['readable'] and item[pipeline] is not None and bool(item[pipeline]['text'].strip())
                for item in records
            ),
            'with_payment': sum(
                not item['expected']['readable'] and item[pipeline] is not None and item[pipeline]['payment_offer']
                for item in records
            ),
            'with_candidates': sum(
                not item['expected']['readable'] and item[pipeline] is not None and bool(item[pipeline]['candidates'])
                for item in records
            ),
        },
    }


def proposed_targets_met(value):
    precision = value['payment']['precision']
    recall = value['payment']['recall_end_to_end']
    top3 = value['matching']['top3_rate']
    return (
        value['coverage'] == 1
        and precision is not None
        and precision >= 0.90
        and recall is not None
        and recall >= 0.85
        and top3 is not None
        and top3 >= 0.90
    )


def evaluate(corpus, manifest, output, font_path, settings):
    manifest_bytes = manifest.read_bytes()
    if json.loads(manifest_bytes) != corpus:
        raise ValueError('Manifest changed after validation')
    sources = {name: sha256((ROOT / name).read_bytes()) for name in SOURCE_FILES}
    runtime = runtime_metadata(font_path, settings)
    output.mkdir(parents=True, exist_ok=False)
    (output / 'images').mkdir()
    (output / 'manifest.json').write_bytes(manifest_bytes)
    properties = [
        SimpleNamespace(id=item['key'], name=item['name'], aliases=item['aliases']) for item in corpus['properties']
    ]
    records = []
    for case in corpus['cases']:
        record = {
            'id': case['id'],
            'language': case['language'],
            'expected': case,
            'text_baseline': None,
            'image_pipeline': None,
            'error': None,
            'baseline_error': None,
            'ocr_output': None,
        }
        if case['readable']:
            try:
                record['text_baseline'] = predict(case['text'], [], properties, case['id'])
            except Exception as error:
                record['baseline_error'] = {'stage': 'extract_match', 'type': type(error).__name__}
        stage = 'image_input'
        try:
            if case.get('image'):
                image_path = (manifest.parent / case['image']).resolve()
                if image_path.stat().st_size > 10_485_760:
                    raise ValueError('IMAGE_SIZE_LIMIT')
                content = image_path.read_bytes()
            else:
                content = render_case(case, font_path)
            if len(content) > 10_485_760:
                raise ValueError('IMAGE_SIZE_LIMIT')
            _, extension = validate_image(content, None, 25_000_000)
            image_name = f'images/{case["id"]}.{extension}'
            (output / image_name).write_bytes(content)
            record['image'] = {'path': image_name, 'sha256': sha256(content), 'byte_size': len(content)}
            stage = 'ocr'
            text, words = recognize(content, settings)
            record['ocr_output'] = {'text': text, 'words': words}
            stage = 'extract_match'
            record['image_pipeline'] = predict(text, words, properties, case['id'])
        except Exception as error:
            record['error'] = {'stage': stage, 'type': type(error).__name__, 'code': getattr(error, 'code', None)}
            print(f'{case["id"]}: failed ({type(error).__name__})', file=sys.stderr)
        records.append(record)
        with (output / 'cases.jsonl').open('a', encoding='utf-8') as stream:
            stream.write(json.dumps(record, ensure_ascii=False) + '\n')
    summaries = {}
    for language in ['all', 'ru', 'kz']:
        subset = records if language == 'all' else [item for item in records if item['language'] == language]
        summaries[language] = {pipeline: metrics(subset, pipeline) for pipeline in ['text_baseline', 'image_pipeline']}
    changed = [name for name, digest in sources.items() if sha256((ROOT / name).read_bytes()) != digest]
    if (
        manifest.read_bytes() != manifest_bytes
        or font_path
        and sha256(font_path.read_bytes()) != runtime['font_sha256']
    ):
        changed.append('manifest_or_font')
    protocol_eligible = (
        len(records) >= 30
        and len(properties) > 3
        and all(
            summaries[language]['image_pipeline']['readable_count'] >= 12
            and summaries[language]['image_pipeline']['unreadable']['count'] >= 1
            and any(
                item['language'] == language and item['expected']['readable'] and item['expected']['payment_offer']
                for item in records
            )
            and any(
                item['language'] == language and item['expected']['readable'] and not item['expected']['payment_offer']
                for item in records
            )
            for language in ['ru', 'kz']
        )
    )
    report = {
        'schema_version': 2,
        'manifest_schema_version': corpus['schema_version'],
        'corpus_id': corpus.get('corpus_id'),
        'provenance': corpus['provenance'],
        'created_at': datetime.now(UTC).isoformat(),
        'case_count': len(records),
        'manifest_sha256': sha256(manifest_bytes),
        'runtime': runtime,
        'source_sha256': sources,
        'inputs_changed_during_run': changed,
        'protocol_eligible': protocol_eligible,
        'unique_image_count': len({item['image']['sha256'] for item in records if 'image' in item}),
        'summaries': summaries,
        'errors': [item['id'] for item in records if item['error'] or item['baseline_error']],
        'proposed_targets_met': protocol_eligible
        and not changed
        and not any(item['error'] or item['baseline_error'] for item in records)
        and proposed_targets_met(summaries['all']['image_pipeline']),
        'acceptance_established': False,
        'limitations': [
            'Synthetic results are not real-world accuracy or independent human acceptance.',
            'Once inspected for changes this corpus is a regression set, not a fresh holdout.',
            'Payment targets remain document-level; structured fields have separate scores and no acceptance threshold.',
            'Schema 1 has no field annotations; structured scores are null, never inferred from predictions.',
            'Binding is strict whitespace-normalized alignment, not semantic correctness; OCR substitutions inside quotes fail.',
            'Percent scores cover PAYMENT_TERM values, not every percentage mentioned in a document.',
        ],
    }
    (output / 'report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    return report


def runtime_metadata(font_path, settings):
    version = subprocess.run(
        [settings.tesseract_command, '--version'],
        capture_output=True,
        text=True,
        encoding=locale.getencoding(),
        timeout=10,
        check=True,
    ).stdout.splitlines()[0]
    languages = subprocess.run(
        [settings.tesseract_command, '--list-langs'],
        capture_output=True,
        text=True,
        encoding=locale.getencoding(),
        timeout=10,
        check=True,
    ).stdout
    available = languages.splitlines()[1:]
    requested = settings.ocr_languages.split('+')
    if any(language not in available for language in requested):
        raise ValueError('Requested Tesseract languages are not all installed')
    directory = re.search(r'"([^"]+)"', languages)
    if not directory:
        raise ValueError('Cannot identify traineddata directory for reproducible evaluation')
    traineddata = {
        language: sha256((Path(directory[1]) / f'{language}.traineddata').read_bytes()) for language in requested
    }
    return {
        'python': platform.python_version(),
        'pillow': PIL.__version__,
        'rapidfuzz': rapidfuzz.__version__,
        'tesseract': version,
        'languages': settings.ocr_languages,
        'traineddata_sha256': traineddata,
        'font_sha256': sha256(font_path.read_bytes()) if font_path else None,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--manifest', type=Path, default=ROOT / 'data/evaluation/ru-kz-v1.json')
    parser.add_argument(
        '--output', type=Path, required=True, help='New directory only; existing evidence is never overwritten'
    )
    parser.add_argument('--font', type=Path)
    parser.add_argument('--tesseract', default='tesseract')
    parser.add_argument('--languages', default='rus+kaz+eng')
    parser.add_argument(
        '--require-targets', action='store_true', help='Return 1 when proposed quality targets are unmet'
    )
    args = parser.parse_args()
    if not re.fullmatch(r'[a-z+]+', args.languages):
        parser.error('Languages must be Tesseract language codes joined with +')
    corpus = load_corpus(args.manifest.resolve())
    font = args.font or next(
        (
            path
            for path in [Path('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'), Path('C:/Windows/Fonts/arial.ttf')]
            if path.is_file()
        ),
        None,
    )
    if any(not case.get('image') for case in corpus['cases']) and (not font or not font.is_file()):
        parser.error('A font is required to render synthetic cases')
    # No Settings() or .env: this runner needs no database/session credentials.
    settings = SimpleNamespace(tesseract_command=args.tesseract, ocr_languages=args.languages, ocr_timeout_seconds=60)
    report = evaluate(corpus, args.manifest.resolve(), args.output.resolve(), font, settings)
    print(
        json.dumps(
            {
                'case_count': report['case_count'],
                'summaries': report['summaries'],
                'errors': report['errors'],
                'proposed_targets_met': report['proposed_targets_met'],
            },
            ensure_ascii=False,
        )
    )
    return (
        2
        if report['errors'] or report['inputs_changed_during_run']
        else 1
        if args.require_targets and not report['proposed_targets_met']
        else 0
    )


if __name__ == '__main__':
    raise SystemExit(main())
