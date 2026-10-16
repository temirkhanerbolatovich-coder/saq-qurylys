"""Offline checks of saved, attributed publications with production extraction.

Usage: python scripts/evaluate_publications.py --manifest PATH --output PATH
This command never fetches URLs, renders HTML, performs OCR, or writes to the DB.
Originals must be acquired separately through the approved bounded transport.
"""

import argparse
import hashlib
import json
import platform
import re
import sys
from datetime import UTC, datetime
from importlib.metadata import version
from pathlib import Path
from types import SimpleNamespace
from uuid import NAMESPACE_URL, uuid5

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'backend'))
from app.extraction import extract, match_candidates  # noqa: E402
from app.url_fetcher import HtmlPage  # noqa: E402
from app.url_import import parse_publication  # noqa: E402

LIMITATIONS = [
    'Text extraction only; no image OCR was performed.',
    'A limited publication corpus does not establish full real-advertising quality acceptance.',
    'Labels require independent domain and Kazakh-language human review.',
    'This report alone does not prove independence from rule tuning on the same examples.',
    'Matching results apply only to the finite manifest catalog, not to registry coverage.',
    'Translations within one topic group are related observations, not independent examples.',
    'No hypotheses, matches, factors or legal conclusions are confirmed by this report.',
]


def digest(content):
    return hashlib.sha256(content).hexdigest()


def load_manifest(path, *, content=None):
    """Validate bounded local inputs and original hashes before running inference."""
    path = Path(path).resolve()
    if path.stat().st_size > 5_000_000:
        raise ValueError('Manifest exceeds 5 MB')
    content = path.read_bytes() if content is None else content
    if len(content) > 5_000_000:
        raise ValueError('Manifest exceeds 5 MB')
    manifest = json.loads(content.decode('utf-8'))
    if (
        not isinstance(manifest, dict)
        or manifest.get('schema_version') != 1
        or not isinstance(manifest.get('provenance'), dict)
        or manifest['provenance'].get('kind') != 'external'
    ):
        raise ValueError('Expected schema_version 1 and external provenance')
    properties, cases = manifest.get('properties'), manifest.get('cases')
    if not isinstance(properties, list) or not 1 <= len(properties) <= 1000:
        raise ValueError('Expected 1..1000 catalog properties')
    if not isinstance(cases, list) or not 1 <= len(cases) <= 500:
        raise ValueError('Expected 1..500 publication cases')
    keys, identities = set(), set()
    for item in properties:
        if not isinstance(item, dict):
            raise ValueError('Catalog properties must be objects')
        key = item.get('key')
        if not isinstance(key, str) or not re.fullmatch(r'[a-z][a-z0-9-]{1,60}', key) or key in keys:
            raise ValueError('Invalid or duplicate catalog key')
        if not isinstance(item.get('name'), str) or not 1 <= len(item['name'].strip()) <= 500:
            raise ValueError('A bounded catalog name is required')
        if (
            not isinstance(item.get('aliases'), list)
            or len(item['aliases']) > 50
            or any(not isinstance(alias, str) or not 1 <= len(alias) <= 500 for alias in item['aliases'])
        ):
            raise ValueError('Expected at most 50 bounded catalog aliases')
        keys.add(key)
    for case in cases:
        if not isinstance(case, dict):
            raise ValueError('Publication cases must be objects')
        identity = case.get('id')
        if (
            not isinstance(identity, str)
            or not re.fullmatch(r'[a-z][a-z0-9-]{1,60}', identity)
            or identity in identities
        ):
            raise ValueError('Invalid or duplicate case id')
        identities.add(identity)
        if 'group_id' in case and (
            not isinstance(case['group_id'], str) or not re.fullmatch(r'[a-z][a-z0-9-]{0,60}', case['group_id'])
        ):
            raise ValueError(f'{identity}: invalid topic group id')
        if case.get('language') not in {'ru', 'kz'}:
            raise ValueError(f'{identity}: language must be ru or kz')
        expected = case.get('expected')
        if (
            not isinstance(expected, dict)
            or type(expected.get('payment_offer')) is not bool
            or 'target_property' not in expected
            or expected['target_property'] is not None
            and (not isinstance(expected['target_property'], str) or expected['target_property'] not in keys)
        ):
            raise ValueError(f'{identity}: explicit payment and catalog-target labels required')
        source = case.get('source')
        required = ('requested_url', 'final_url', 'content_type', 'captured_at', 'publisher', 'license_url')
        if not isinstance(source, dict) or any(
            not isinstance(source.get(key), str) or not source[key] for key in required
        ):
            raise ValueError(f'{identity}: source, retrieval and licensing provenance required')
        if not isinstance(source.get('redirect_chain'), list) or any(
            not isinstance(url, str) for url in source['redirect_chain']
        ):
            raise ValueError(f'{identity}: redirect_chain must be an explicit list')
        try:
            captured_at = datetime.fromisoformat(source['captured_at'])
        except ValueError:
            raise ValueError(f'{identity}: invalid retrieval date') from None
        if captured_at.tzinfo is None:
            raise ValueError(f'{identity}: retrieval date needs a timezone')
        original = case.get('original')
        if not isinstance(original, str) or not original:
            raise ValueError(f'{identity}: original path required')
        original_path = (path.parent / original).resolve()
        if not original_path.is_relative_to(path.parent) or not original_path.is_file():
            raise ValueError(f'{identity}: original must exist inside the manifest directory')
        if original_path.stat().st_size > 2_097_152:
            raise ValueError(f'{identity}: original exceeds 2 MiB')
        if digest(original_path.read_bytes()) != case.get('sha256'):
            raise ValueError(f'{identity}: original SHA-256 mismatch')
    return manifest


def source_code_hashes():
    sources = [
        'scripts/evaluate_publications.py',
        'backend/app/url_import.py',
        'backend/app/url_fetcher.py',
        'backend/app/extraction.py',
    ]
    return {name: digest((ROOT / name).read_bytes()) for name in sources}


def fraction(numerator, denominator):
    return numerator / denominator if denominator else None


def metrics(records):
    """Keep errors out of the confusion matrix and expose missing coverage."""
    completed = [row for row in records if row['prediction'] is not None]
    tp = sum(row['expected']['payment_offer'] and row['prediction']['payment_offer'] for row in completed)
    fp = sum(not row['expected']['payment_offer'] and row['prediction']['payment_offer'] for row in completed)
    fn = sum(row['expected']['payment_offer'] and not row['prediction']['payment_offer'] for row in completed)
    tn = len(completed) - tp - fp - fn
    negatives = [row for row in completed if row['expected']['target_property'] is None]
    false_candidates = sum(len(row['prediction']['candidates']) for row in negatives)
    false_candidate_cases = sum(bool(row['prediction']['candidates']) for row in negatives)
    known_targets = [row for row in records if row['expected']['target_property'] is not None]
    known_completed = [row for row in known_targets if row['prediction'] is not None]
    top1_hits, top3_hits = 0, 0
    for row in known_completed:
        candidate_ids = [item['property_id'] for item in row['prediction']['candidates']]
        target = row['expected']['target_property']
        top1_hits += target in candidate_ids[:1]
        top3_hits += target in candidate_ids[:3]
    return {
        'case_count': len(records),
        'topic_group_count': len({row.get('group_id', row.get('id', index)) for index, row in enumerate(records)}),
        'evaluated_count': len(completed),
        'error_count': len(records) - len(completed),
        'coverage': fraction(len(completed), len(records)),
        'payment': {
            'tp': tp,
            'fp': fp,
            'fn': fn,
            'tn': tn,
            'expected_positive': sum(row['expected']['payment_offer'] for row in records),
            'precision': fraction(tp, tp + fp),
            'recall': fraction(tp, tp + fn),
            'recall_end_to_end': fraction(tp, sum(row['expected']['payment_offer'] for row in records)),
        },
        'matching': {
            'known_target_count': len(known_targets),
            'known_target_evaluated': len(known_completed),
            'top1_hits': top1_hits,
            'top1_rate': fraction(top1_hits, len(known_targets)),
            'top3_hits': top3_hits,
            'top3_rate': fraction(top3_hits, len(known_targets)),
            'no_target_evaluated': len(negatives),
            'false_candidate_count': false_candidates,
            'cases_with_false_candidates': false_candidate_cases,
            'cases_with_false_candidates_rate': fraction(false_candidate_cases, len(negatives)),
        },
    }


def evaluate(path):
    """Run the same parser, extractor and matcher used by the application."""
    path = Path(path).resolve()
    if path.stat().st_size > 5_000_000:
        raise ValueError('Manifest exceeds 5 MB')
    manifest_bytes = path.read_bytes()
    initial_sources = source_code_hashes()
    manifest = load_manifest(path, content=manifest_bytes)
    properties = [
        SimpleNamespace(id=item['key'], name=item['name'], aliases=item['aliases']) for item in manifest['properties']
    ]
    records = []
    for case in manifest['cases']:
        source = case['source']
        original = (path.parent / case['original']).read_bytes()
        if len(original) > 2_097_152 or digest(original) != case['sha256']:
            raise ValueError(f'{case["id"]}: original SHA-256 mismatch before inference')
        page = HtmlPage(
            requested_url=source['requested_url'],
            final_url=source['final_url'],
            redirect_chain=tuple(source['redirect_chain']),
            content_type=source['content_type'],
            captured_at=source['captured_at'],
            content=original,
        )
        row = {
            'id': case['id'],
            'language': case['language'],
            'group_id': case.get('group_id', case['id']),
            'original': case['original'],
            'sha256': case['sha256'],
            'source': source,
            'expected': case['expected'],
            'label_notes': case.get('label_notes'),
            'prediction': None,
            'error': None,
        }
        try:
            publication = parse_publication(page)
            if publication.language != case['language']:
                raise ValueError('Parsed language disagrees with corpus label')
            identity = uuid5(NAMESPACE_URL, f'saq-publication-evaluation/{case["id"]}')
            hypotheses, warnings = extract(publication.text, identity, identity, properties)
            candidates = match_candidates(publication.text, hypotheses, properties)
            row['prediction'] = {
                'title': publication.title,
                'text_sha256': digest(publication.text.encode('utf-8')),
                'text_characters': len(publication.text),
                'published_at': publication.published_at.isoformat() if publication.published_at else None,
                'payment_offer': any(item['field'] == 'PAYMENT_TERM' for item in hypotheses),
                'payment_terms': [item['value'] for item in hypotheses if item['field'] == 'PAYMENT_TERM'],
                'candidates': candidates,
                'warnings': warnings,
            }
        except Exception as exc:
            # A failed case is retained as missing coverage, never a successful abstention.
            row['error'] = {'type': type(exc).__name__, 'code': getattr(exc, 'code', None), 'message': str(exc)}
        records.append(row)
    changed = []
    inputs = [('manifest', path, digest(manifest_bytes))] + [
        (f'original:{case["original"]}', path.parent / case['original'], case['sha256']) for case in manifest['cases']
    ]
    for label, input_path, expected_hash in inputs:
        try:
            unchanged = digest(input_path.read_bytes()) == expected_hash
        except OSError:
            unchanged = False
        if not unchanged:
            changed.append(label)
    try:
        final_sources = source_code_hashes()
    except OSError:
        final_sources = {}
    changed.extend(f'code:{name}' for name, sha in initial_sources.items() if final_sources.get(name) != sha)
    return {
        'schema_version': 1,
        'generated_at': datetime.now(UTC).isoformat(),
        'manifest_sha256': digest(manifest_bytes),
        'provenance': manifest['provenance'],
        'catalog_size': len(properties),
        'limitations': LIMITATIONS,
        'acceptance_established': False,
        'run_valid': not changed,
        'inputs_changed_during_run': changed,
        'runtime': {'python': platform.python_version(), 'rapidfuzz': version('rapidfuzz')},
        'source_code_sha256': initial_sources,
        'overall': metrics(records),
        'by_language': {
            language: metrics([row for row in records if row['language'] == language]) for language in ['ru', 'kz']
        },
        'cases': records,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--manifest', required=True, type=Path)
    parser.add_argument('--output', required=True, type=Path)
    args = parser.parse_args()
    try:
        if args.output.exists():
            raise ValueError('Report already exists; choose a new output path')
        if args.output.resolve() == args.manifest.resolve():
            raise ValueError('Report must not overwrite the manifest')
        report = evaluate(args.manifest)
        originals = {(args.manifest.parent / case['original']).resolve() for case in report['cases']}
        if args.output.resolve() in originals:
            raise ValueError('Report must not overwrite an original publication')
        args.output.parent.mkdir(parents=True, exist_ok=True)
        with args.output.open('x', encoding='utf-8') as output:
            output.write(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    except (OSError, ValueError) as exc:
        parser.exit(2, f'Evaluation input/output error: {exc}\n')
    print(
        json.dumps(
            {
                'run_valid': report['run_valid'],
                'inputs_changed_during_run': report['inputs_changed_during_run'],
                'by_language': report['by_language'],
                'limitations': report['limitations'],
            },
            ensure_ascii=False,
            indent=2,
        )
    )
    return 1 if not report['run_valid'] or report['overall']['error_count'] else 0


if __name__ == '__main__':
    sys.exit(main())
