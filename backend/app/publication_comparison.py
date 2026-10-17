"""Bounded, exact text comparison of explicit saved sources; no entity or risk decision."""

import hashlib
from difflib import SequenceMatcher

from sqlalchemy import select
from sqlalchemy.orm import selectinload
from starlette.exceptions import HTTPException

from app.analysis_dto import PublicationComparison, PublicationComparisonSide, PublicationTextChange
from app.dto import AssetOut
from app.models import Advertisement, ExtractionResult

# SequenceMatcher can be quadratic. Bound both operands before matching rather
# than silently truncating a source and potentially declaring two texts equal.
MAX_COMPARISON_CHARACTERS = 100_000
MAX_COMPARISON_LINES = 1_000


def comparison_side(db, advertisement, extraction_id):
    extraction = db.get(ExtractionResult, extraction_id) if extraction_id else None
    if extraction_id and (not extraction or extraction.advertisement_id != advertisement.id):
        raise HTTPException(422, 'Выбранная версия текста не относится к этой публикации')
    if extraction and not any(asset.id == extraction.source_asset_id for asset in advertisement.assets):
        raise HTTPException(422, 'Исходник выбранной версии не относится к этой публикации')
    text = extraction.analysis_text if extraction else advertisement.original_text
    if text is not None and (
        len(text) > MAX_COMPARISON_CHARACTERS or len(text.splitlines(keepends=True)) > MAX_COMPARISON_LINES
    ):
        raise HTTPException(413, 'Сравнение ограничено 100 000 символов и 1 000 строк на каждый выбранный текст')
    available = text is not None and bool(text.strip())
    text_sha256 = hashlib.sha256(text.encode('utf-8')).hexdigest() if available else None
    source_asset_id = (
        extraction.source_asset_id
        if extraction
        else next(
            (asset.id for asset in advertisement.assets if asset.kind == 'TEXT' and asset.sha256 == text_sha256), None
        )
    )
    return PublicationComparisonSide(
        advertisement_id=advertisement.id,
        advertisement_revision=advertisement.revision,
        source_label=advertisement.source_label,
        source_url=advertisement.source_url,
        published_at=advertisement.published_at,
        captured_at=advertisement.captured_at,
        is_demo=advertisement.is_demo,
        text_basis='EXTRACTION' if extraction else 'ORIGINAL',
        extraction_id=extraction.id if extraction else None,
        extraction_revision=extraction.revision if extraction else None,
        pipeline_version=extraction.pipeline_version if extraction else None,
        analysis_created_at=extraction.created_at if extraction else None,
        source_asset_id=source_asset_id,
        original_assets=[
            AssetOut.model_validate(asset) for asset in advertisement.assets if asset.kind in {'TEXT', 'IMAGE', 'HTML'}
        ],
        text=text,
        text_sha256=text_sha256,
    )


def compare_publications(db, left_id, right_id, left_extraction_id=None, right_extraction_id=None):
    """Compare originals by default; historical analysis versions require explicit IDs."""
    advertisements = {
        ad.id: ad
        for ad in db.scalars(
            select(Advertisement)
            .where(Advertisement.id.in_({left_id, right_id}))
            .options(selectinload(Advertisement.assets))
        )
    }
    if left_id not in advertisements or right_id not in advertisements:
        raise HTTPException(404, 'Одна из публикаций не найдена')
    if advertisements[left_id].is_demo != advertisements[right_id].is_demo:
        raise HTTPException(422, 'Нельзя сравнивать DEMO и реальные публикации')
    left = comparison_side(db, advertisements[left_id], left_extraction_id)
    right = comparison_side(db, advertisements[right_id], right_extraction_id)
    changes = []
    if left.text_sha256 is None or right.text_sha256 is None:
        status = 'TEXT_UNAVAILABLE'
    elif left.text == right.text:
        status = 'IDENTICAL_TEXT'
    else:
        status = 'DIFFERENT_TEXT'
        left_lines, right_lines = left.text.splitlines(keepends=True), right.text.splitlines(keepends=True)
        # Repeated RU/KZ lines remain meaningful; the explicit input cap bounds cost.
        for kind, left_start, left_end, right_start, right_end in SequenceMatcher(
            None, left_lines, right_lines, autojunk=False
        ).get_opcodes():
            if kind != 'equal':
                changes.append(
                    PublicationTextChange(
                        kind=kind.upper(),
                        left_start_line=left_start,
                        left_end_line=left_end,
                        right_start_line=right_start,
                        right_end_line=right_end,
                        left_text=''.join(left_lines[left_start:left_end]),
                        right_text=''.join(right_lines[right_start:right_end]),
                    )
                )
    return PublicationComparison(
        left=left,
        right=right,
        status=status,
        same_advertisement=left_id == right_id,
        same_source_url=(left.source_url == right.source_url) if left.source_url and right.source_url else None,
        changes=changes,
    )
