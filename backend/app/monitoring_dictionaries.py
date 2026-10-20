"""Append-only dictionary storage; activating one does not execute a source."""

from sqlalchemy import select
from starlette.exceptions import HTTPException

from app.config import ROOT
from app.models import MonitoringDictionaryActivation, MonitoringDictionaryVersion
from app.monitoring import advisory_lock
from app.social_dictionary import MAX_DICTIONARY_BYTES, load_dictionary

DICTIONARY_FILE = 'saq_oskemen_search_dictionary_v2.json'
ORIGINAL_FILE = 'saq_oskemen_search_dictionary_2026-10-19.json'
ACTIVATION_LOCK = 'monitoring-dictionary-activation'


def bundled_dictionary():
    def read(name):
        with (ROOT / 'docs' / name).open('rb') as stream:
            return stream.read(MAX_DICTIONARY_BYTES + 1)

    original = read(ORIGINAL_FILE)
    return load_dictionary(read(DICTIONARY_FILE), source=DICTIONARY_FILE, original_raw=original), original


def latest_activation(db, *, lock=False):
    if lock:
        advisory_lock(db, ACTIVATION_LOCK)
    return db.scalar(
        select(MonitoringDictionaryActivation).order_by(MonitoringDictionaryActivation.revision.desc()).limit(1)
    )


def dictionary_row(db, id):
    row = db.get(MonitoringDictionaryVersion, id)
    if row is None:
        raise HTTPException(404, 'Версия словаря не найдена')
    return row


def stored_snapshot(row):
    snapshot = load_dictionary(row.raw, source=row.source, original_raw=row.original_raw)
    if snapshot.content_sha256 != row.content_sha256 or snapshot.dictionary_version != row.dictionary_version:
        raise ValueError('Stored dictionary integrity mismatch')
    return snapshot


def active_snapshot(db, id):
    activation = latest_activation(db, lock=True)
    if activation is None or activation.dictionary_id != id:
        raise HTTPException(409, 'Выбранная версия словаря не активна. Обновите состояние.')
    return stored_snapshot(dictionary_row(db, id)), activation
