"""Analyze a local UTF-8 text as offline V2 hypotheses; never search, import or score."""

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'backend'))

from app.social_context import MAX_TEXT_LENGTH, analyze_context  # noqa: E402
from app.social_dictionary import load_dictionary  # noqa: E402
from preview_social_queries import read_bounded  # noqa: E402


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('text_file', type=Path)
    args = parser.parse_args()
    try:
        with args.text_file.open('rb') as stream:
            raw = stream.read(MAX_TEXT_LENGTH * 4 + 1)
        if len(raw) > MAX_TEXT_LENGTH * 4:
            raise ValueError('Text file too large')
        text = raw.decode('utf-8-sig')
        dictionary = load_dictionary(
            read_bounded(ROOT / 'docs/saq_oskemen_search_dictionary_v2.json'),
            source='saq_oskemen_search_dictionary_v2.json',
            original_raw=read_bounded(ROOT / 'docs/saq_oskemen_search_dictionary_2026-10-19.json'),
        )
        result = analyze_context(text, dictionary)
    except (OSError, ValueError):
        parser.exit(2, 'Invalid local text or dictionary. No search or import performed.\n')
    print(json.dumps(result, ensure_ascii=True, indent=2))


if __name__ == '__main__':
    main()
