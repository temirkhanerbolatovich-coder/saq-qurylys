"""Add the owner's October 19 research observations and reviewed project map anchors.

Offline operator tool, not a collector or a legal review. A verified current backup,
stopped writers, an explicit identity/location plan and --apply are required for writes.
Defaults to ROLLBACK. No existing material, decision or source file is overwritten.
"""

import argparse
import csv
import hashlib
import json
import math
import shutil
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit
from uuid import NAMESPACE_URL, uuid5

import backup_local as backup
from replace_demo_data import insert, literal, schema

BATCH = 'oskemen-social-observations-2026-10-19-v1'
FILES = (
    'saq_oskemen_social_ads_2026-10-19.csv',
    'saq_oskemen_social_osint_report_2026-10-19.md',
)


def identifier(key):
    return str(uuid5(NAMESPACE_URL, f'saq-qurylys/import/{BATCH}/{key}'))


def canonical_url(value):
    parsed = urlsplit(value)
    if parsed.scheme != 'https' or not parsed.hostname or parsed.username or parsed.password:
        raise ValueError('Expected a public HTTPS source URL')
    if any(ord(c) < 32 for c in value) or len(value) > 2048:
        raise ValueError('Invalid source URL')
    return urlunsplit(
        (
            'https',
            parsed.netloc.lower().removeprefix('www.'),
            parsed.path.rstrip('/'),
            parsed.query,
            '',
        )
    )


def read_rows(source):
    with (source / FILES[0]).open(encoding='utf-8-sig', newline='') as stream:
        rows = list(csv.DictReader(stream))
    if [row.get('ID') for row in rows] != [f'A{i:02}' for i in range(1, 21)]:
        raise ValueError('Expected the supplied twenty ordered observations')
    for row in rows:
        if not row.get('ЖК') or row.get('Дата фиксации') != '2026-10-19':
            raise ValueError('Missing project identity or unexpected observation date')
        canonical_url(row['Ссылка на доказательство'])
    return rows


def grouped_rows(rows):
    groups = {}
    for row in rows:
        key = (row['ЖК'], canonical_url(row['Ссылка на доказательство']))
        groups.setdefault(key, []).append(row)
    return groups


def validate_location(location):
    lat, lon = location['latitude'], location['longitude']
    if any(isinstance(v, bool) or not isinstance(v, (int, float)) or not math.isfinite(v) for v in (lat, lon)):
        raise ValueError('Invalid coordinate number')
    # This fixed package covers Oskemen only; reject swapped axes/city defaults.
    if not (49.80 < lat < 50.10 and 82.40 < lon < 82.85):
        raise ValueError('Coordinate outside the reviewed city area')
    if location.get('precision') != 'PROJECT_ANCHOR' or not location.get('source_address') or not location.get('note'):
        raise ValueError('Location precision, source address and limitations are required')
    canonical_url(location['source_url'])
    if not location.get('snapshot_sha256') or len(location['snapshot_sha256']) != 64:
        raise ValueError('A preserved source snapshot is required')


def normalized_row(rows):
    first = rows[0]
    # Existing dossier and PDF readers already expose these research fields.
    return {
        'ID': ', '.join(r['ID'] for r in rows),
        'ЖК': first['ЖК'],
        'Площадка': first['Площадка'],
        'Прямой URL': first['Ссылка на доказательство'],
        'Что рекламируется': '\n'.join(r['Наблюдаемый фрагмент'] for r in rows),
        'Стройстатус': first['Основание/стадия'],
        'В реестре 15': first['В списке 15'],
        'Исторические сведения': '\n'.join(f'{r["Тип материала"]}; дата по файлу: {r["Дата материала"]}' for r in rows),
        'Приоритет': first['Приоритет'],
        'Что сверить': '\n'.join(r['Следующее действие'] for r in rows),
        'Вывод': '\n'.join(f'{r["Сигнал/интерпретация"]}. Оговорка автора: {r["Оговорка"]}' for r in rows),
    }


def statements(rows, plan, package):
    commands, assets = [], []
    captured = plan['captured_at']
    actor = "(SELECT id FROM users WHERE role='analyst' ORDER BY username LIMIT 1)"

    def audit(key, pid, action, reason, details, old=None, new=1):
        return insert(
            'audit_events',
            {
                'id': identifier(key),
                'actor_id': '__ACTOR__',
                'occurred_at': captured,
                'action': action,
                'entity_type': 'properties',
                'entity_id': pid,
                'old_revision': old,
                'new_revision': new,
                'reason': reason,
                'request_id': identifier('request'),
                'details': details,
            },
        ).replace("'__ACTOR__'", actor)

    names = {row['ЖК'] for row in rows}
    if set(plan['projects']) != names:
        raise ValueError('Every project requires an explicit reviewed mapping')
    for name, project in plan['projects'].items():
        pid = project['id']
        if project['existing']:
            commands.append(
                'DO $$ BEGIN IF NOT EXISTS(SELECT 1 FROM properties WHERE id='
                f'{literal(pid)} AND name={literal(name)} AND revision={int(project["revision"])}) '
                "THEN RAISE EXCEPTION 'Existing dossier changed'; END IF; END $$;"
            )
        else:
            did = identifier(f'project/{name}/developer')
            commands.append(
                insert(
                    'developers',
                    {
                        'id': did,
                        'name': f'Не установлен · {name}',
                        'bin': None,
                        'is_demo': False,
                    },
                )
            )
            commands.append(
                insert(
                    'properties',
                    {
                        'id': pid,
                        'parent_id': None,
                        'level': 'PROJECT',
                        'name': name,
                        'aliases': [],
                        'city': 'Усть-Каменогорск',
                        'address': project['address'],
                        'developer_id': did,
                        'stage': 'UNKNOWN',
                        'legal_verification_status': 'UNKNOWN',
                        'revision': 1,
                        'is_demo': False,
                    },
                )
            )
    for (name, url), observations in grouped_rows(rows).items():
        key = '/'.join(row['ID'] for row in observations)
        pid = plan['projects'][name]['id']
        aid = identifier(f'observation/{key}')
        original = (
            'НАБЛЮДЕНИЕ ИЗ ПОЛЬЗОВАТЕЛЬСКОГО ФАЙЛА. Это пересказ исследования, '
            'не оригинал страницы или поста. Уровень проверки ниже указан автором файла; '
            'SAQ не подтверждает его автоматически. Связь с объектом, стадии, основания '
            'и факторы требуют самостоятельного решения аналитика.\n'
            f'Пакет: {BATCH}. Получено: {captured}.\n'
            + '\n\n'.join('\n'.join(f'{k}: {v}' for k, v in row.items()) for row in observations)
            + '\n\nИсходный отчёт и CSV сохранены побайтно; SHA-256:\n'
            + '\n'.join(f'{f["name"]}: {f["sha256"]}' for f in package['files'])
        )
        raw = original.encode('utf-8')
        sha = hashlib.sha256(raw).hexdigest()
        storage_key = f'{sha[:2]}/{sha}.txt'
        assets.append((storage_key, raw))
        commands.append(
            insert(
                'advertisements',
                {
                    'id': aid,
                    'revision': 1,
                    'source_label': f'Исследование из файла · {key} · {name}',
                    'source_url': observations[0]['Ссылка на доказательство'],
                    'published_at': None,
                    'captured_at': captured,
                    'original_text': original,
                    'is_demo': False,
                    'status': 'NEW',
                    'confirmed_property_id': None,
                    'created_by': '__ACTOR__',
                },
            ).replace("'__ACTOR__'", actor)
        )
        commands.append(
            insert(
                'assets',
                {
                    'id': identifier(f'asset/{key}'),
                    'advertisement_id': aid,
                    'kind': 'TEXT',
                    'mime_type': 'text/plain',
                    'byte_size': len(raw),
                    'sha256': sha,
                    'storage_key': storage_key,
                    'captured_at': captured,
                    'is_demo': False,
                    'source_details': {
                        'batch': BATCH,
                        'rows': observations,
                        'package': package,
                        'derived_observation': True,
                    },
                },
            )
        )
        revision = plan['projects'][name].get('revision', 1)
        commands.append(
            audit(
                f'audit/{key}',
                pid,
                'SOURCE_PACKAGE_IMPORTED',
                f'Добавлены наблюдения {key} из файла; источник и оговорки сохранены. '
                'Идентичность материала, правовое основание и риск не подтверждались.',
                {
                    'batch': BATCH,
                    'advertisement_id': aid,
                    'source_row': normalized_row(observations),
                    'original_rows': observations,
                    'package': package,
                    'identity_confirmed': False,
                },
                old=revision if plan['projects'][name]['existing'] else None,
                new=revision,
            )
        )
    for pid, location in plan['locations'].items():
        validate_location(location)
        revision = int(location['expected_revision'])
        commands.append(
            f'DO $$ BEGIN UPDATE properties SET latitude={location["latitude"]}, '
            f'longitude={location["longitude"]}, revision=revision+1 WHERE id={literal(pid)} '
            f'AND name={literal(location["name"])} AND revision={revision} '
            'AND latitude IS NULL AND longitude IS NULL; '
            "IF NOT FOUND THEN RAISE EXCEPTION 'Location target changed'; END IF; END $$;"
        )
        commands.append(
            audit(
                f'location/{pid}',
                pid,
                'PROPERTY_LOCATION_IMPORTED',
                f'Ориентир проекта из {location["source_url"]}: {location["source_address"]}; '
                f'{location["latitude"]}, {location["longitude"]}. {location["note"]} '
                'Это не кадастровые границы и не подтверждение корпуса/правового статуса.',
                {
                    'batch': BATCH,
                    'before': {'latitude': None, 'longitude': None},
                    'after': location,
                },
                old=revision,
                new=revision + 1,
            )
        )
    return commands, assets


def execute(args):
    manifest = backup.load_backup(args.backup)
    verification = json.loads(args.verification.read_text(encoding='utf-8'))
    if not verification.get('verified') or Path(verification['backup']).resolve() != args.backup.resolve():
        raise ValueError('Restore verification must match this backup')
    if args.container == 'saq-qurylys-db-1':
        containers = backup.source_containers()
        if any(containers[name]['running'] for name in ('api', 'worker')):
            raise ValueError('Stop API/worker before this offline import')
    elif not args.container.startswith('saq-social-rehearsal-'):
        raise ValueError('Unexpected database target')
    if backup.fingerprints(args.container) != manifest['tables']:
        raise ValueError('Database changed since backup; preserve changes and create a fresh backup')
    plan = json.loads(args.plan.read_text(encoding='utf-8'))
    for location in plan['locations'].values():
        snapshot = backup.private_path(backup.ROOT / location['snapshot_path'])
        if backup.digest(snapshot) != location['snapshot_sha256']:
            raise ValueError('Location source snapshot changed after review')
    rows = read_rows(args.source)
    package = {'batch': BATCH, 'files': []}
    output = backup.private_path(args.output)
    output.mkdir(parents=True, exist_ok=True)
    for name in FILES:
        original, copied = args.source / name, output / name
        if backup.digest(original) != plan['source_sha256'][name]:
            raise ValueError('Input changed after review')
        if copied.exists() and backup.digest(copied) != backup.digest(original):
            raise ValueError('Archived source differs')
        if not copied.exists():
            shutil.copy2(original, copied)
        package['files'].append(
            {
                'name': name,
                'sha256': backup.digest(copied),
                'byte_size': copied.stat().st_size,
            }
        )
    commands, assets = statements(rows, plan, package)
    columns, _ = schema(args.container)
    for key, raw in assets:
        path = backup.ROOT / 'storage' / key
        if path.exists() and path.read_bytes() != raw:
            raise ValueError('Asset digest collision')
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(raw)
    sql = [
        'BEGIN;',
        'SET LOCAL standard_conforming_strings=on;',
        "SET LOCAL lock_timeout='5s';",
        'LOCK TABLE ' + ','.join(sorted(columns)) + ' IN ACCESS EXCLUSIVE MODE;',
        *commands,
        (
            "SELECT json_build_object('properties',(SELECT count(*) FROM properties),"
            "'materials',(SELECT count(*) FROM advertisements),'assets',(SELECT count(*) FROM assets),"
            "'mapped',(SELECT count(*) FROM properties WHERE latitude IS NOT NULL AND longitude IS NOT NULL));"
        ),
        'COMMIT;' if args.apply else 'ROLLBACK;',
    ]
    result = backup.sql(args.container, '\n'.join(sql)).decode()
    backup.save_json(output / 'source-manifest.json', package)
    backup.save_json(output / 'reviewed-plan.json', plan)
    (output / ('applied.log' if args.apply else 'dry-run.log')).write_text(result, encoding='utf-8')
    print(result.strip())
    print('COMMITTED' if args.apply else 'ROLLED BACK')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    for name in ('source', 'backup', 'verification', 'plan', 'output'):
        parser.add_argument(f'--{name}', type=Path, required=True)
    parser.add_argument('--container', required=True)
    parser.add_argument('--apply', action='store_true')
    execute(parser.parse_args())


if __name__ == '__main__':
    main()
