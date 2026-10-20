"""Validated, byte-preserving parser dictionaries; loading never activates a source."""

import hashlib
import json
import unicodedata
from dataclasses import dataclass
from datetime import date
from string import Formatter
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, JsonValue, StringConstraints, model_validator

MAX_DICTIONARY_BYTES = 512 * 1024
Text = Annotated[str, StringConstraints(strict=True, min_length=1, max_length=2000)]
Terms = Annotated[list[Text], Field(min_length=1, max_length=500)]
SHA256 = Annotated[str, StringConstraints(pattern=r'^[a-f0-9]{64}$')]
TOKENS = {'city', 'estate', 'payment', 'marketing', 'project', 'under_construction', 'legal_terms', 'hashtag', 'phase'}


class DictionaryModel(BaseModel):
    model_config = ConfigDict(extra='forbid')


class QueryGroup(DictionaryModel):
    id: Text
    rank: int = Field(strict=True, ge=1, le=3)
    discovery: Literal['keyword', 'hashtag']
    template_ids: Terms
    local_filters: Terms


class ExecutionPolicy(DictionaryModel):
    no_unbounded_cartesian_product: Literal[True]
    max_compiled_queries_default: int = Field(strict=True, ge=1, le=100)
    respect_platform_limits_and_rights: Literal[True]
    preserve_query_ids_per_finding: Literal[True]
    statuses: list[Literal['SUPPORTED', 'LOCAL_FILTER_ONLY', 'UNSUPPORTED']]
    run_statuses: list[Literal['SUCCESS', 'PARTIAL', 'FAILED', 'BLOCKED']]
    keyword_and_hashtag_are_distinct_capabilities: Literal[True]
    checkpoint_after_persisted_page_only: Literal[True]
    never_assert_full_platform_coverage: Literal[True]


class ReviewExample(DictionaryModel):
    text: Text
    expected: Literal['P1', 'P2', 'P3', 'NOT_RELEVANT', 'NEEDS_CONTEXT']
    reason: Text


class GeoPolicy(DictionaryModel):
    strong_city_aliases: Terms
    weak_or_broad_aliases: Terms
    casefold_deduplicate_queries: Literal[True]
    weak_alias_alone_not_sufficient_to_confirm_city: Literal[True]
    hashtag_context_required: Terms
    regional_scope: Text
    regional_scope_is_search_constraint_not_claim_of_geolocation: Literal[True]


class PhasePolicy(DictionaryModel):
    keep_project_family_separate_from_phase: Literal[True]
    must_resolve_phase_individually: Terms
    weak_project_names_require_extra_context: Terms
    no_auto_property_creation_from_alias: Literal[True]
    no_automatic_legal_document_inheritance_between_phases: Literal[True]


class ExtractionPolicy(DictionaryModel):
    year_regex: Text
    currency_tokens: Terms
    keep_amount_span_and_timing_context: Literal[True]
    price_alone_not_payment_evidence: Literal[True]


class ReviewPriorityPolicy(DictionaryModel):
    P1: Text
    P2: Text
    P3: Text
    NOT_RELEVANT: Text
    NEEDS_CONTEXT: Text
    never_apply_R1_R6_automatically: Literal[True]


class Additions(DictionaryModel):
    schema_version: Literal['2.0']
    based_on_original_sha256: SHA256
    based_on_original_file: Text
    created_at: date
    origin_note: Text
    geo_alias_policy: GeoPolicy
    phase_and_alias_policy: PhasePolicy
    extended_terms: dict[Text, Terms]
    negative_context_ru: Terms
    negative_context_kk: Terms
    negation_and_timing: dict[str, Terms]
    new_query_templates: Terms
    query_groups: list[QueryGroup] = Field(min_length=1, max_length=20)
    extended_queries_ru: Terms
    extended_queries_kk: Terms
    query_execution_policy: ExecutionPolicy
    extraction_patterns: ExtractionPolicy
    review_priority_policy: ReviewPriorityPolicy
    review_examples: list[ReviewExample] = Field(min_length=1, max_length=100)
    sources_status: Text


class SourceDictionary(DictionaryModel):
    project: Text
    geography: Text
    created_at: date
    notes: Terms
    city_aliases: Terms
    real_estate_ru: Terms
    real_estate_kk: Terms
    payment_strong_ru: Terms
    payment_strong_kk: Terms
    marketing_ru: Terms
    marketing_kk: Terms
    under_construction_ru: Terms
    under_construction_kk: Terms
    legal_terms_ru: Terms
    legal_terms_kk: Terms
    project_aliases: dict[Text, Terms] = Field(min_length=1, max_length=100)
    hashtags: dict[Text, Terms] = Field(min_length=1, max_length=20)
    query_templates: Terms
    starter_queries_ru: Terms
    starter_queries_kk: Terms
    review_rules: dict[str, JsonValue]
    sources_used: Terms
    v2_additions: Additions | None = None

    @model_validator(mode='after')
    def validate_templates(self):
        templates = self.query_templates + (self.v2_additions.new_query_templates if self.v2_additions else [])
        for template in templates:
            fields = list(Formatter().parse(template))
            if not any(field is not None for _, field, _, _ in fields):
                raise ValueError('A query template must contain a token')
            if any(
                field not in TOKENS or spec or conversion for _, field, spec, conversion in fields if field is not None
            ):
                raise ValueError('Unsupported query template token or formatting')
        if self.v2_additions:
            groups = self.v2_additions.query_groups
            if len({group.id for group in groups}) != len(groups):
                raise ValueError('Duplicate query group ID')
            if any(template not in templates for group in groups for template in group.template_ids):
                raise ValueError('Query group references an unknown template')
        return self


def normalized_key(value: str) -> str:
    """Normalize only derived search keys; the original bytes remain untouched."""
    return ' '.join(unicodedata.normalize('NFKC', value).casefold().split())


def _unique_object(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError('Duplicate JSON key')
        result[key] = value
    return result


def _reject_constant(value):
    raise ValueError('Non-finite JSON number')


def _read(raw: bytes) -> tuple[dict, SourceDictionary]:
    if not raw or len(raw) > MAX_DICTIONARY_BYTES:
        raise ValueError('Dictionary exceeds size limit or is empty')
    try:
        data = json.loads(raw.decode('utf-8'), object_pairs_hook=_unique_object, parse_constant=_reject_constant)

        # Prevent invisible controls from reaching compiled query IDs or terminals.
        def check(value):
            if isinstance(value, str) and (
                not value.strip() or any(unicodedata.category(c) in {'Cc', 'Cf', 'Cs'} for c in value)
            ):
                raise ValueError('Blank text or control character in dictionary')
            if isinstance(value, dict):
                for key, child in value.items():
                    check(key)
                    check(child)
            elif isinstance(value, list):
                for child in value:
                    check(child)

        check(data)
        return data, SourceDictionary.model_validate(data)
    except (UnicodeError, RecursionError) as error:
        raise ValueError('Invalid dictionary encoding or nesting') from error


@dataclass(frozen=True)
class DictionarySnapshot:
    raw: bytes
    source: str
    dictionary_version: str
    content_sha256: str
    duplicate_city_aliases: tuple[str, ...]

    @property
    def document(self) -> SourceDictionary:
        # A fresh model prevents callers from mutating the preserved version.
        return SourceDictionary.model_validate_json(self.raw)

    def metadata(self) -> dict:
        return {
            'dictionary_version': self.dictionary_version,
            'content_sha256': self.content_sha256,
            'source': self.source,
            'activation_status': 'NOT_ACTIVATED',
            'activated_at': None,
            'duplicate_city_aliases': list(self.duplicate_city_aliases),
        }


def load_dictionary(raw: bytes, *, source: str, original_raw: bytes | None = None) -> DictionarySnapshot:
    """Load v1 or v2; v2 must match the exact original bytes and all original fields.

    Source is attribution only: this function never opens paths or fetches URLs.
    Activation/history belongs to the future explicit application workflow.
    """
    data, document = _read(raw)
    if document.v2_additions:
        if original_raw is None:
            raise ValueError('v2 requires the original v1 bytes')
        original, original_model = _read(original_raw)
        if original_model.v2_additions is not None:
            raise ValueError('The original must be v1')
        if hashlib.sha256(original_raw).hexdigest() != document.v2_additions.based_on_original_sha256:
            raise ValueError('Original SHA-256 mismatch')
        if {key: value for key, value in data.items() if key != 'v2_additions'} != original:
            raise ValueError('v2 changed original dictionary fields')
    seen, duplicates = set(), []
    for alias in document.city_aliases:
        key = normalized_key(alias)
        if key in seen:
            duplicates.append(alias)
        seen.add(key)
    return DictionarySnapshot(
        raw=raw,
        source=source,
        dictionary_version='2.0' if document.v2_additions else 'source_dictionary_v1',
        content_sha256=hashlib.sha256(raw).hexdigest(),
        duplicate_city_aliases=tuple(duplicates),
    )
