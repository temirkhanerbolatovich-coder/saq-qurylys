"""Offline parser-v2 preview: no tokens, network, database, source activation or search."""

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'backend'))

from app.social_dictionary import MAX_DICTIONARY_BYTES, load_dictionary  # noqa: E402
from app.social_queries import QueryPreviewOptions, compile_preview  # noqa: E402


def read_bounded(path):
    with path.open('rb') as stream:
        return stream.read(MAX_DICTIONARY_BYTES + 1)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        '--dictionary',
        type=Path,
        default=ROOT / 'docs/saq_oskemen_search_dictionary_v2.json',
    )
    parser.add_argument(
        '--original',
        type=Path,
        default=ROOT / 'docs/saq_oskemen_search_dictionary_2026-10-19.json',
    )
    parser.add_argument('--budget', type=int, default=25)
    parser.add_argument('--language', choices=['both', 'ru', 'kk'], default='both')
    parser.add_argument('--capability', action='append', choices=['keyword', 'hashtag'], default=[])
    args = parser.parse_args()
    try:
        snapshot = load_dictionary(
            read_bounded(args.dictionary),
            source=args.dictionary.name,
            original_raw=read_bounded(args.original),
        )
        options = QueryPreviewOptions(
            budget=args.budget,
            language=args.language,
            keyword='keyword' in args.capability,
            hashtag='hashtag' in args.capability,
        )
        result = compile_preview(snapshot, options)
    except (OSError, ValueError):
        # Pydantic errors can echo untrusted input; diagnostics must not dump its contents.
        parser.exit(
            2,
            'Invalid dictionary, original provenance or preview options. No search performed.\n',
        )
    print(json.dumps(result, ensure_ascii=True, indent=2))


if __name__ == '__main__':
    main()
