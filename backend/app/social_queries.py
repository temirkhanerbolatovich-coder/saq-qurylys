"""Bounded offline query planning. No collector, DB writes, or risk decisions."""

import hashlib
import json
from itertools import zip_longest
from string import Formatter
from typing import Literal

from pydantic import Field, StrictBool

from app.social_dictionary import DictionaryModel, DictionarySnapshot, Text, normalized_key


class QueryPreviewOptions(DictionaryModel):
    source_code: Text = 'OFFLINE'
    budget: int | None = Field(default=None, strict=True, ge=1, le=100)
    keyword: StrictBool = False
    hashtag: StrictBool = False
    max_query_length: int = Field(default=500, strict=True, ge=1, le=2000)
    language: Literal['both', 'ru', 'kk'] = 'both'


def _interleave(ru, kk):
    for pair in zip_longest(ru, kk):
        yield from (item for item in pair if item is not None)


def _candidates(document, languages):
    # Original seeds take precedence. Interleave languages so a small budget is not RU-only.
    values = {
        lang: [(text, lang) for text in getattr(document, f'starter_queries_{lang}')] if lang in languages else []
        for lang in ('ru', 'kk')
    }
    for text, lang in _interleave(values['ru'], values['kk']):
        yield (
            text,
            'keyword',
            0,
            {
                'kind': 'original_seed',
                'language': lang,
                'template': None,
                'tokens': {'seed': text},
            },
        )
    additions = document.v2_additions
    if additions:
        groups = sorted(additions.query_groups, key=lambda group: group.rank)
        # One deterministic token tuple per template/language, never a Cartesian product.
        # Round-robin groups prevents a large project group from starving regional queries.
        for index in range(max(len(group.template_ids) for group in groups)):
            for group in groups:
                if index >= len(group.template_ids):
                    continue
                template = group.template_ids[index]
                fields = [field for _, field, _, _ in Formatter().parse(template) if field is not None]
                for lang in languages:
                    tokens = {
                        'city': 'Өскемен' if lang == 'kk' else document.city_aliases[0],
                        'estate': getattr(document, f'real_estate_{lang}')[0],
                        'payment': getattr(document, f'payment_strong_{lang}')[0],
                        'marketing': getattr(document, f'marketing_{lang}')[0],
                        'project': list(document.project_aliases)[index % len(document.project_aliases)],
                        'under_construction': getattr(document, f'under_construction_{lang}')[0],
                        'legal_terms': getattr(document, f'legal_terms_{lang}')[0],
                        'hashtag': next(iter(document.hashtags.values()))[0],
                    }
                    # No invented phase: phase-specific original seeds remain verbatim.
                    if any(field not in tokens for field in fields):
                        continue
                    selected = {field: tokens[field] for field in fields}
                    yield (
                        template.format_map(selected),
                        group.discovery,
                        group.rank,
                        {
                            'kind': 'v2_template',
                            'language': lang,
                            'group': group.id,
                            'template': template,
                            'tokens': selected,
                            'local_filters': group.local_filters,
                        },
                    )
        for text, lang in _interleave(
            [(text, 'ru') for text in additions.extended_queries_ru] if 'ru' in languages else [],
            [(text, 'kk') for text in additions.extended_queries_kk] if 'kk' in languages else [],
        ):
            yield text, 'keyword', 2, {'kind': 'v2_seed', 'language': lang, 'template': None, 'tokens': {'seed': text}}
    for category, tags in document.hashtags.items():
        for tag in tags:
            yield (
                tag,
                'hashtag',
                2,
                {
                    'kind': 'original_hashtag',
                    'category': category,
                    'template': '{hashtag}',
                    'tokens': {'hashtag': tag},
                },
            )


def compile_preview(snapshot: DictionarySnapshot, options: QueryPreviewOptions) -> dict:
    """Return selected and omitted candidates with immutable provenance, not executable jobs.

    Capabilities are caller-declared planning inputs, never proof of platform access.
    Geographic/semantic constraints remain local filters, not a native AND/geo promise.
    """
    document = snapshot.document
    budget = options.budget or (
        document.v2_additions.query_execution_policy.max_compiled_queries_default if document.v2_additions else 25
    )
    languages = ['ru', 'kk'] if options.language == 'both' else [options.language]
    queries = {}
    for text, discovery, priority, origin in _candidates(document, languages):
        key = (discovery, normalized_key(text))
        if key in queries:
            queries[key]['origins'].append(origin)
            continue
        identity = [snapshot.content_sha256, options.source_code, *key]
        query_id = hashlib.sha256(json.dumps(identity, ensure_ascii=False).encode()).hexdigest()
        capability = options.keyword if discovery == 'keyword' else options.hashtag
        supported = capability and len(text) <= options.max_query_length
        queries[key] = {
            'id': query_id,
            'text': text,
            'discovery': discovery,
            'priority': priority,
            'dictionary_version': snapshot.dictionary_version,
            'dictionary_sha256': snapshot.content_sha256,
            'source_code': options.source_code,
            'region': document.geography,
            'capability_status': 'LOCAL_FILTER_ONLY' if supported else 'UNSUPPORTED',
            'reason': 'LOCAL_CONTEXT_REQUIRED'
            if supported
            else ('QUERY_TOO_LONG' if capability else 'CAPABILITY_UNSUPPORTED'),
            'origins': [origin],
            'last_executed_at': None,
        }
    selected, omitted = [], []
    for query in queries.values():
        if query['capability_status'] != 'UNSUPPORTED' and len(selected) < budget:
            selected.append(query)
        else:
            omitted.append(
                {
                    **query,
                    'skip_reason': query['reason'] if query['capability_status'] == 'UNSUPPORTED' else 'BUDGET_LIMIT',
                }
            )
    return {
        **snapshot.metadata(),
        'mode': 'OFFLINE_PREVIEW',
        'access_status': 'ACCESS_UNVERIFIED',
        'capabilities_basis': 'CALLER_DECLARED_NOT_LIVE_VERIFIED',
        'options': {**options.model_dump(), 'budget': budget},
        'queries': selected,
        'omitted_queries': omitted,
        'candidate_count': len(queries),
        'coverage': 'BOUNDED_PREVIEW_NOT_FULL_PLATFORM_COVERAGE',
        'original_seed_count': len(document.starter_queries_ru) + len(document.starter_queries_kk),
        'original_hashtag_count': sum(map(len, document.hashtags.values())),
    }
