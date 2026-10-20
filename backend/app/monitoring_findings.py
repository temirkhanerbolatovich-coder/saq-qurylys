"""Persist trusted saved search pages; findings never establish identity or risk."""

import hashlib
import json
from uuid import UUID, uuid4

from pydantic import ValidationError
from sqlalchemy import func, select
from starlette.exceptions import HTTPException

from app.api.analysis import audit
from app.api.threads import ThreadsSearchResult
from app.models import (
    MonitoringFinding,
    MonitoringFindingObservation,
    MonitoringFindingVersion,
    MonitoringQueryProfileVersion,
    MonitoringRun,
)
from app.monitoring import advisory_lock
from app.monitoring_dictionaries import dictionary_row, stored_snapshot
from app.social_context import MAX_TEXT_LENGTH, RULES_VERSION, analyze_context


def content_hash(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, ensure_ascii=False).encode()).hexdigest()


def profile_query(version, query_id):
    if version is None:
        raise HTTPException(409, 'Сохранённая версия профиля недоступна.')
    preview = version.compiled_preview or {}
    if version.dictionary_id is None or version.parameters.get('dictionary_version') != '2.0':
        raise HTTPException(409, 'Нужен сохранённый профиль V2.')
    query = next((item for item in preview.get('queries', []) if item.get('id') == query_id), None)
    if (
        query is None
        or query.get('dictionary_sha256') != version.dictionary_sha256
        or preview.get('content_sha256') != version.dictionary_sha256
    ):
        raise HTTPException(409, 'Запрос не принадлежит сохранённой версии профиля.')
    return query


def capture_context(post, snapshot):
    text = post.text
    if text and text.strip() and len(text) <= MAX_TEXT_LENGTH:
        result = analyze_context(text, snapshot)
    else:
        result = {
            'rules_version': RULES_VERSION,
            'dictionary_version': snapshot.dictionary_version,
            'dictionary_sha256': snapshot.content_sha256,
            'text_sha256': hashlib.sha256((text or '').encode()).hexdigest(),
            'priority': 'NEEDS_CONTEXT',
            'priority_reason': 'TEXT_LIMIT_EXCEEDED' if text and len(text) > MAX_TEXT_LENGTH else 'TEXT_UNAVAILABLE',
            'registry_status': 'WAITING_REGISTRY',
            'geography_confirmed': False,
            'projects': [],
            'matched_spans': [],
            'mode': 'NOT_ANALYZED',
        }
    result['content_limits'] = ['TEXT_ONLY']
    if post.media_type != 'TEXT_POST':
        result['content_limits'].append('VIDEO_NOT_ANALYZED' if post.media_type == 'VIDEO' else 'MEDIA_NOT_ANALYZED')
    return result


def capture_run(db, request, actor, run_id, reason):
    """Recover a saved page without contacting the source, using frozen profile provenance.

    One identity lock serializes observations from different queries and prevents
    duplicate version numbers. Reverting to earlier content creates a new version.
    """
    advisory_lock(db, f'finding-capture:{run_id}')
    run = db.get(MonitoringRun, run_id)
    if run is None:
        raise HTTPException(404, 'Запуск не найден.')
    if run.source_code != 'THREADS' or run.state not in {'SUCCEEDED', 'EMPTY'} or run.result is None:
        raise HTTPException(409, 'Нет успешно сохранённой страницы для создания находок.')
    try:
        version_id = UUID(run.query['profile_version_id'])
        query_id = run.query['profile_request']['query_id']
        result = ThreadsSearchResult.model_validate(run.result)
        expected = {key: run.query[key] for key in ('query', 'search_type', 'limit')}
    except (KeyError, TypeError, ValueError, ValidationError):
        raise HTTPException(409, 'У запуска нет проверенного V2 происхождения.') from None
    version = db.get(MonitoringQueryProfileVersion, version_id)
    if version is None:
        raise HTTPException(409, 'Сохранённая версия профиля недоступна.')
    query = profile_query(version, query_id)
    if (
        result.run_id != run.id
        or result.request.model_dump() != expected
        or query['text'] != result.request.query
        or str(version.profile_id) != run.query['profile_request'].get('profile_id')
        or version.revision != run.query['profile_request'].get('expected_revision')
        or version.dictionary_sha256 != run.query.get('dictionary_sha256')
        or result.returned_count > result.request.limit
        or len({post.id for post in result.items}) != len(result.items)
        or result.returned_count - result.duplicate_count != len(result.items)
        or (run.state == 'EMPTY') != (len(result.items) == 0)
    ):
        raise HTTPException(409, 'Сохранённая страница не соответствует запросу запуска.')
    try:
        snapshot = stored_snapshot(dictionary_row(db, version.dictionary_id))
        if snapshot.content_sha256 != version.dictionary_sha256:
            raise ValueError('Profile dictionary mismatch')
    except ValueError:
        raise HTTPException(409, 'Словарь сохранённой версии не прошёл проверку целостности.') from None

    observations, new_versions, new_findings = [], 0, 0
    # Stable order avoids deadlocks when two pages contain overlapping identities.
    for post in sorted(result.items, key=lambda item: item.id):
        advisory_lock(db, f'finding:THREADS:{post.id}:REAL')
        finding = db.scalar(
            select(MonitoringFinding).where(
                MonitoringFinding.platform == 'THREADS',
                MonitoringFinding.external_id == post.id,
                MonitoringFinding.is_demo.is_(False),
            )
        )
        if finding is None:
            finding = MonitoringFinding(id=uuid4(), platform='THREADS', external_id=post.id, is_demo=False)
            db.add(finding)
            db.flush()
            new_findings += 1
        previous = db.scalar(
            select(MonitoringFindingObservation).where(
                MonitoringFindingObservation.run_id == run.id, MonitoringFindingObservation.finding_id == finding.id
            )
        )
        if previous:
            observations.append(previous)
            continue
        latest = db.scalar(
            select(MonitoringFindingVersion)
            .where(MonitoringFindingVersion.finding_id == finding.id)
            .order_by(MonitoringFindingVersion.captured_at.desc(), MonitoringFindingVersion.version.desc())
            .limit(1)
        )
        sha = content_hash(post.model_dump(mode='json'))
        if (
            latest is None
            or latest.content_sha256 != sha
            or latest.dictionary_sha256 != snapshot.content_sha256
            or latest.rules_version != RULES_VERSION
        ):
            context = capture_context(post, snapshot)
            latest = MonitoringFindingVersion(
                id=uuid4(),
                finding_id=finding.id,
                version=(
                    db.scalar(
                        select(func.max(MonitoringFindingVersion.version)).where(
                            MonitoringFindingVersion.finding_id == finding.id
                        )
                    )
                    or 0
                )
                + 1,
                content_sha256=sha,
                dictionary_id=version.dictionary_id,
                dictionary_sha256=snapshot.content_sha256,
                rules_version=RULES_VERSION,
                source_url=post.permalink,
                published_at=post.timestamp,
                captured_at=result.captured_at,
                text=post.text,
                media_type=post.media_type,
                priority=context['priority'],
                context=context,
                created_by=actor.id,
            )
            db.add(latest)
            db.flush()
            new_versions += 1
            audit(
                db,
                request,
                actor,
                latest,
                'MONITORING_FINDING_VERSION_SAVED',
                reason=reason,
                details={'finding_id': str(finding.id), 'version': latest.version, 'run_id': str(run.id)},
            )
        observation = MonitoringFindingObservation(
            id=uuid4(),
            finding_id=finding.id,
            version_id=latest.id,
            run_id=run.id,
            profile_version_id=version.id,
            query_id=query_id,
            captured_at=result.captured_at,
            raw_response_sha256=result.raw_response_sha256,
            has_more=result.has_more,
        )
        db.add(observation)
        db.flush()
        audit(
            db,
            request,
            actor,
            observation,
            'MONITORING_FINDING_OBSERVED',
            reason=reason,
            details={
                'finding_id': str(finding.id),
                'version_id': str(latest.id),
                'run_id': str(run.id),
                'query_id': query_id,
            },
        )
        observations.append(observation)
    return {
        'run_id': run.id,
        'outcome': 'PARTIAL' if result.has_more else 'SUCCESS',
        'coverage': result.coverage,
        'new_findings': new_findings,
        'new_versions': new_versions,
        'observations': [
            {'id': item.id, 'finding_id': item.finding_id, 'version_id': item.version_id, 'query_id': item.query_id}
            for item in observations
        ],
    }
