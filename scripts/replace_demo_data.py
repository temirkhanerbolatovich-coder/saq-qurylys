"""Replace explicitly marked DEMO records with the supplied VKO research package.

Offline operator tool: requires stopped writers, a verified backup, and unchanged
table fingerprints. Default is a transaction rolled back after all validations.
No scraping, legal confirmation, matching, analysis jobs, or notifications.
"""

import argparse
import csv
import hashlib
import json
import re
import shutil
import xml.etree.ElementTree as ET
import zipfile
from datetime import datetime, timezone
from pathlib import Path
from uuid import NAMESPACE_URL, uuid5

import backup_local as backup

FILES = (
    'saq_vko_oskemen_registry_2026-10-19.csv',
    'saq_vko_oskemen_registry_instagram_2026-10-19.xlsx',
    'saq_vko_ads_audit_2026-10-19.csv',
    'saq_vko_ads_audit_2026-10-19.xlsx',
)
BATCH = 'vko-user-package-2026-10-19-v1'
NS = {'m': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}


def identifier(key):
    return str(uuid5(NAMESPACE_URL, f'saq-qurylys/import/{BATCH}/{key}'))


def literal(value):
    if value is None:
        return 'NULL'
    if isinstance(value, bool):
        return 'true' if value else 'false'
    if isinstance(value, (dict, list)):
        value = json.dumps(value, ensure_ascii=False)
    return "'" + str(value).replace("'", "''") + "'"


def insert(table, values):
    # Only internal table/column names reach this function; values are SQL literals.
    return f'INSERT INTO {table} ({",".join(values)}) VALUES ({",".join(map(literal, values.values()))});'


def workbook(path):
    """Read literal XLSX values without macros, formulas, or external requests."""
    with zipfile.ZipFile(path) as archive:
        strings = []
        if 'xl/sharedStrings.xml' in archive.namelist():
            root = ET.fromstring(archive.read('xl/sharedStrings.xml'))
            strings = [''.join(n.itertext()) for n in root.findall('m:si', NS)]
        rels = ET.fromstring(archive.read('xl/_rels/workbook.xml.rels'))
        targets = {r.attrib['Id']: r.attrib['Target'] for r in rels}
        result = {}
        for sheet in ET.fromstring(archive.read('xl/workbook.xml')).findall('m:sheets/m:sheet', NS):
            rel = sheet.attrib['{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id']
            target = targets[rel]
            target = target.lstrip('/') if target.startswith('/') else 'xl/' + target
            rows = []
            for row in ET.fromstring(archive.read(target)).findall('m:sheetData/m:row', NS):
                values = {}
                for cell in row.findall('m:c', NS):
                    if cell.find('m:f', NS) is not None:
                        raise ValueError('Formula in input workbook is unsupported')
                    column = 0
                    for letter in re.match('[A-Z]+', cell.attrib['r'])[0]:
                        column = column * 26 + ord(letter) - 64
                    node = cell.find('m:v', NS)
                    value = '' if node is None else node.text or ''
                    if cell.attrib.get('t') == 's':
                        value = strings[int(value)]
                    elif cell.attrib.get('t') == 'inlineStr':
                        value = ''.join(cell.find('m:is', NS).itertext())
                    values[column - 1] = value
                if values:
                    rows.append([values.get(i, '') for i in range(max(values) + 1)])
            result[sheet.attrib['name']] = rows
        return result


def read_package(source):
    csv_tables = []
    for filename, delimiter in ((FILES[0], ','), (FILES[2], ';')):
        with (source / filename).open(encoding='utf-8-sig', newline='') as stream:
            csv_tables.append(list(csv.reader(stream, delimiter=delimiter)))
    books = {name: workbook(source / name) for name in (FILES[1], FILES[3])}
    for table, name, sheet, size in (
        (csv_tables[0], FILES[1], 'Реестр ВКО', 15),
        (csv_tables[1], FILES[3], 'Кандидаты', 4),
    ):
        width = len(table[0])
        normalized = [[*row, *([''] * (width - len(row)))] for row in books[name][sheet]]
        # Registry workbook uses Russian display headers in the same column order.
        # Validate the known headers separately, then compare every data cell.
        expected_headers = (
            [
                'ID',
                'ЖК',
                'Город / уровень проверки',
                'Адрес / ориентир',
                'Основание (опубликовано)',
                'Номер документа (вторичный источник)',
                'Дата списка',
                'Проверка правового статуса',
                'Следующее действие',
                'Примечание / расхождения',
                'Официальный источник',
                'Адрес / детали: источник',
                'Ещё источник',
            ]
            if size == 15
            else table[0]
        )
        if normalized[0] != expected_headers or table[1:] != normalized[1:] or len(table) != size + 1:
            raise ValueError('CSV/XLSX mismatch or unexpected row count')
        if len({row[0] for row in table[1:]}) != size:
            raise ValueError('Duplicate source row IDs')
    rows = [dict(zip(table[0], row, strict=True)) for table in csv_tables for row in table[1:]]
    return rows, books


def schema(container):
    result = json.loads(
        backup.sql(
            container,
            """
        SELECT json_build_object(
          'columns', (SELECT json_agg(x) FROM (SELECT table_name,column_name FROM information_schema.columns
            WHERE table_schema='public' ORDER BY table_name,ordinal_position) x),
          'foreign_keys', (SELECT json_agg(x) FROM (SELECT conrelid::regclass::text child,
            confrelid::regclass::text parent,a.attname col FROM pg_constraint c
            JOIN pg_attribute a ON a.attrelid=c.conrelid AND a.attnum=c.conkey[1]
            WHERE c.contype='f' ORDER BY 1,2) x));
    """,
        )
    )
    columns = {}
    for row in result['columns']:
        columns.setdefault(row['table_name'], set()).add(row['column_name'])
    for name in [*columns, *(f['col'] for f in result['foreign_keys'])]:
        if not re.fullmatch('[a-z_]+', name):
            raise ValueError('Unexpected database identifier')
    return columns, result['foreign_keys']


def delete_plan(columns, fks):
    tables = {name for name, cols in columns.items() if 'id' in cols}
    dependencies = {name: {f['parent'] for f in fks if f['child'] == name and f['parent'] != name} for name in tables}
    ordered = []
    while dependencies:
        leaves = sorted(name for name in dependencies if not any(name in v for v in dependencies.values()))
        if not leaves:
            raise ValueError('Unsupported foreign key cycle')
        for name in leaves:
            ordered.append(name)
            del dependencies[name]
    commands = ['CREATE TEMP TABLE removed (tablename text, id uuid, PRIMARY KEY(tablename,id));']
    for name, cols in columns.items():
        if 'is_demo' in cols:
            commands.append(f"INSERT INTO removed SELECT '{name}',id FROM {name} WHERE is_demo;")
    commands.append("INSERT INTO removed SELECT 'users',id FROM users WHERE username='demo-fixture-reviewer';")
    # Resolve the complete dependent graph before deleting; REAL flagged rows abort.
    for _ in tables:
        for fk in fks:
            if fk['child'] in tables:
                commands.append(
                    f"INSERT INTO removed SELECT '{fk['child']}',c.id FROM {fk['child']} c "
                    f"JOIN removed p ON p.tablename='{fk['parent']}' AND c.{fk['col']}=p.id "
                    'ON CONFLICT DO NOTHING;'
                )
    for name, cols in columns.items():
        if 'is_demo' in cols:
            commands.append(
                f'DO $$ BEGIN IF EXISTS(SELECT 1 FROM {name} t JOIN removed r ON '
                f"r.tablename='{name}' AND r.id=t.id WHERE NOT t.is_demo) THEN "
                f"RAISE EXCEPTION 'REAL record depends on DEMO: {name}'; END IF; END $$;"
            )
    commands.extend(
        [
            "INSERT INTO removed SELECT 'audit_events',a.id FROM audit_events a WHERE a.action='DEMO_SEEDED' "
            'OR EXISTS(SELECT 1 FROM removed r WHERE a.entity_id=r.id OR strpos(a.details::text,r.id::text)>0) '
            'ON CONFLICT DO NOTHING;',
            "INSERT INTO removed SELECT 'commands',c.id FROM commands c WHERE "
            'EXISTS(SELECT 1 FROM removed r WHERE strpos(c.response::text,r.id::text)>0) ON CONFLICT DO NOTHING;',
            # Session rows have no UUID id. Invalidate only the removed fixture user.
            "DELETE FROM sessions WHERE user_id IN (SELECT id FROM removed WHERE tablename='users');",
            "SELECT json_build_object('deleted',coalesce(json_object_agg(tablename,n),'{}'::json)) "
            'FROM (SELECT tablename,count(*) n FROM removed GROUP BY tablename) t;',
        ]
    )
    for name in ordered:
        commands.append(f"DELETE FROM {name} WHERE id IN (SELECT id FROM removed WHERE tablename='{name}');")
    return commands


def import_rows(rows, package, captured_at):
    actor = "(SELECT id FROM users WHERE role='analyst' ORDER BY username LIMIT 1)"
    commands = []
    asset_files = []
    for row in rows:
        registry = 'record_id' in row
        key = row['record_id'] if registry else row['ID']
        name = row['project'] if registry else row['ЖК']
        pid, did, aid, asset_id = [identifier(f'{key}/{kind}') for kind in ('property', 'developer', 'ad', 'asset')]
        city = row['city'] if registry else 'Усть-Каменогорск'
        address = row['address'] if registry else row['Адрес']
        source = row['official_source'] if registry else row['Прямой URL']
        label = f'{"Перечень из файла" if registry else "Рекламное наблюдение из файла"} · {key} · {name}'
        text = (
            'ИМПОРТИРОВАННОЕ НАБЛЮДЕНИЕ ИЗ ФАЙЛА. Это исследовательский пересказ; '
            'оригинал интернет-страницы не получен. Правовой статус и связь с объектом не подтверждены.\n'
            f'Пакет: {BATCH}. Получено: {captured_at}.\n'
            + '\n'.join(f'{k}: {v or "Не указано"}' for k, v in row.items())
            + '\n\nФайлы пакета (SHA-256):\n'
            + '\n'.join(f'{f["name"]}: {f["sha256"]}' for f in package['files'])
            + '\nДополнительные листы Excel сохранены в исходном пакете; не являются новыми нарушениями.\n'
        )
        raw = text.encode('utf-8')
        sha = hashlib.sha256(raw).hexdigest()
        storage_key = f'{sha[:2]}/{sha}.txt'
        asset_files.append((storage_key, raw))
        commands.append(
            insert(
                'developers',
                {
                    'id': did,
                    'name': f'Не установлен по файлу · {key}',
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
                    'aliases': [key],
                    'city': city or 'Не установлен по файлу',
                    'address': address or 'Не указан в файле',
                    'developer_id': did,
                    'stage': 'UNKNOWN',
                    'legal_verification_status': 'UNKNOWN',
                    'revision': 1,
                    'is_demo': False,
                },
            )
        )
        ad = insert(
            'advertisements',
            {
                'id': aid,
                'revision': 1,
                'source_label': label,
                'source_url': source or None,
                'published_at': None,
                'captured_at': captured_at,
                'original_text': text,
                'is_demo': False,
                'status': 'NEW',
                'confirmed_property_id': None,
                'created_by': '__ACTOR__',
            },
        ).replace("'__ACTOR__'", actor)
        commands.append(ad)
        commands.append(
            insert(
                'assets',
                {
                    'id': asset_id,
                    'advertisement_id': aid,
                    'kind': 'TEXT',
                    'mime_type': 'text/plain',
                    'byte_size': len(raw),
                    'sha256': sha,
                    'storage_key': storage_key,
                    'captured_at': captured_at,
                    'is_demo': False,
                    'source_details': {
                        'batch': BATCH,
                        'row': row,
                        'package': package,
                        'derived_observation': True,
                    },
                },
            )
        )
        reason = (
            f'Импорт строки {key} из переданного файла. Источники и оговорки — в связанном материале. '
            'Материал связан по строке файла, предметная идентичность не подтверждена. '
            'Правовое основание не проверено; факторы риска не подтверждались.'
        )
        commands.append(
            insert(
                'audit_events',
                {
                    'id': identifier(f'{key}/audit'),
                    'actor_id': '__ACTOR__',
                    'occurred_at': captured_at,
                    'action': 'SOURCE_PACKAGE_IMPORTED',
                    'entity_type': 'properties',
                    'entity_id': pid,
                    'old_revision': None,
                    'new_revision': 1,
                    'reason': reason,
                    'request_id': identifier('request'),
                    'details': {
                        'batch': BATCH,
                        'property_id': pid,
                        'advertisement_id': aid,
                        'source_row': row,
                        'package': package,
                        'identity_confirmed': False,
                    },
                },
            ).replace("'__ACTOR__'", actor)
        )
    return commands, asset_files


def execute(args):
    target = backup.private_path(args.output)
    target.mkdir(parents=True, exist_ok=True)
    manifest = backup.load_backup(args.backup)
    verification = json.loads(args.verification.read_text(encoding='utf-8'))
    if not verification.get('verified') or Path(verification['backup']).resolve() != args.backup.resolve():
        raise ValueError('A successful restore check for this backup is required')
    if args.container == 'saq-qurylys-db-1':
        containers = backup.source_containers()
        if any(containers[name]['running'] for name in ('api', 'worker')):
            raise ValueError('Stop API and worker before replacing data')
        env = dict(
            line.split('=', 1)
            for line in (backup.ROOT / '.env').read_text().splitlines()
            if '=' in line and not line.startswith('#')
        )
        if env.get('DEMO_SEED_ENABLED') != 'false':
            raise ValueError('Set DEMO_SEED_ENABLED=false before changing the primary database')
    elif not args.container.startswith('saq-vko-rehearsal-'):
        raise ValueError('Only the primary SAQ database or a named rehearsal is supported')
    if backup.fingerprints(args.container) != manifest['tables']:
        raise ValueError('Database changed since backup; refusing replacement/replay')
    rows, books = read_package(args.source)
    package = {'batch': BATCH, 'files': []}
    for name in FILES:
        original = args.source / name
        copied = target / name
        if copied.exists() and backup.digest(copied) != backup.digest(original):
            raise ValueError('Existing source archive differs')
        if not copied.exists():
            shutil.copy2(original, copied)
        package['files'].append(
            {
                'name': name,
                'sha256': backup.digest(copied),
                'byte_size': copied.stat().st_size,
            }
        )
    backup.save_json(target / 'workbooks.json', books)
    backup.save_json(target / 'source-manifest.json', package)
    columns, fks = schema(args.container)
    captured = datetime.now(timezone.utc).isoformat()
    inserts, assets = import_rows(rows, package, captured)
    # Originals stay in the private package. Derived observation assets are durable
    # before COMMIT; a failed transaction can leave harmless unreferenced files.
    for key, raw in assets:
        path = backup.ROOT / 'storage' / key
        if not path.resolve().is_relative_to((backup.ROOT / 'storage').resolve()):
            raise ValueError('Invalid asset target')
        path.parent.mkdir(parents=True, exist_ok=True)
        if path.exists() and path.read_bytes() != raw:
            raise ValueError('Asset digest collision')
        path.write_bytes(raw)
    commands = [
        'BEGIN;',
        'SET LOCAL standard_conforming_strings=on;',
        "SET LOCAL lock_timeout='5s';",
        'LOCK TABLE ' + ','.join(sorted(columns)) + ' IN ACCESS EXCLUSIVE MODE;',
    ]
    commands += delete_plan(columns, fks) + inserts
    commands.append(
        "SELECT json_build_object('properties',(SELECT count(*) FROM properties),"
        "'advertisements',(SELECT count(*) FROM advertisements),"
        "'factors',(SELECT count(*) FROM risk_factors),'signals',(SELECT count(*) FROM signals));"
    )
    commands.append('COMMIT;' if args.apply else 'ROLLBACK;')
    result = backup.sql(args.container, '\n'.join(commands)).decode()
    (target / ('applied.log' if args.apply else 'dry-run.log')).write_text(result, encoding='utf-8')
    print(result.strip())
    print('COMMITTED' if args.apply else 'DRY RUN: transaction rolled back')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, required=True)
    parser.add_argument('--backup', type=Path, required=True)
    parser.add_argument('--verification', type=Path, required=True)
    parser.add_argument('--container', required=True)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--apply', action='store_true')
    execute(parser.parse_args())
