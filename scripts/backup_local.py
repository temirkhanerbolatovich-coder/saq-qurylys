"""Create a coordinated local backup and verify it in disposable, offline containers.

Backups contain private database data. They stay under ignored .local directories;
this utility never restores into the working database or deletes saved evidence.
"""

import argparse
import hashlib
import json
import re
import shutil
import subprocess
import sys
import time
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

ROOT = Path(__file__).resolve().parents[1]
COMPOSE = [
    'docker',
    'compose',
    '-f',
    str(ROOT / 'docker-compose.yml'),
    '-f',
    str(ROOT / 'docker-compose.dev.yml'),
]
SHA = re.compile(r'[0-9a-f]{64}')
KEY = re.compile(r'([0-9a-f]{2})/([0-9a-f]{64})\.(txt|png|jpg|pdf|html)')
PSQL = 'exec psql -X -q -A -t -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
INSPECT = (
    '{"id":{{json .Id}},"image":{{json .Image}},"running":{{json .State.Running}},'
    '"paused":{{json .State.Paused}},"labels":{{json .Config.Labels}}}'
)


def run(command, **kwargs):
    """Keep command output private: SQL errors can contain stored material."""
    result = subprocess.run(command, cwd=ROOT, stderr=subprocess.PIPE, timeout=240, **kwargs)
    if result.returncode:
        raise RuntimeError(f'{command[0]} operation failed (exit {result.returncode}); private output suppressed')
    return result.stdout


def linked(path):
    return path.is_symlink() or (hasattr(path, 'is_junction') and path.is_junction())


def private_path(path):
    base = ROOT.absolute() / '.local'
    target = path.absolute()
    if not target.is_relative_to(base) or not target.resolve().is_relative_to(ROOT.resolve() / '.local'):
        raise ValueError('Backup and evidence paths must stay inside project .local')
    current = target
    while current != base.parent:
        if linked(current):
            raise ValueError('Private directory symlinks and junctions are not supported')
        current = current.parent
    return target


def digest(path):
    with path.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


def asset_path(root, asset):
    if not isinstance(asset, dict):
        raise ValueError('Invalid asset manifest entry')
    key = asset.get('storage_key', '')
    match = KEY.fullmatch(key) if isinstance(key, str) else None
    if not match or match[1] != match[2][:2] or match[2] != asset.get('sha256'):
        raise ValueError('Invalid asset storage key or digest')
    if type(asset.get('byte_size')) is not int or asset['byte_size'] < 0:
        raise ValueError('Invalid asset size')
    if linked(root):
        raise ValueError('Storage root must not be a symlink')
    target = root / key
    if any(linked(path) for path in (target.parent, target)):
        raise ValueError('Asset symlinks are not supported')
    if not target.resolve().is_relative_to(root.resolve()):
        raise ValueError('Asset escapes storage root')
    return target


def check_asset(root, asset):
    target = asset_path(root, asset)
    if not target.is_file() or target.stat().st_size != asset['byte_size'] or digest(target) != asset['sha256']:
        raise ValueError('Asset missing, modified, or wrong size')
    return target


def sql(container, statement):
    return run(
        ['docker', 'exec', '-i', container, 'sh', '-c', PSQL],
        input=statement.encode(),
        stdout=subprocess.PIPE,
    )


def fingerprints(container):
    names = sql(
        container,
        "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename;",
    )
    tables = {}
    for name in names.decode().splitlines():
        quoted = '"' + name.replace('"', '""') + '"'
        count = int(sql(container, f'SELECT count(*) FROM public.{quoted};'))
        rows = sql(
            container,
            "SET timezone='UTC'; COPY (SELECT to_jsonb(t)::text FROM public."
            f'{quoted} t ORDER BY to_jsonb(t)::text COLLATE "C") TO STDOUT;',
        )
        tables[name] = {'rows': count, 'sha256': hashlib.sha256(rows).hexdigest()}
    if not tables or not {'assets', 'audit_events', 'signals', 'alembic_version'} <= tables.keys():
        raise ValueError('Expected SAQ schema is missing')
    return tables


def source_containers():
    containers = {}
    for service in ('db', 'api', 'worker'):
        ids = run(COMPOSE + ['ps', '--all', '-q', service], stdout=subprocess.PIPE).decode().split()
        if len(ids) != 1:
            raise ValueError(f'Expected exactly one source {service} container')
        state = json.loads(
            run(
                ['docker', 'inspect', '--format', INSPECT, ids[0]],
                stdout=subprocess.PIPE,
            )
        )
        labels = state['labels'] or {}
        if (
            labels.get('com.docker.compose.project') != 'saq-qurylys'
            or labels.get('com.docker.compose.service') != service
        ):
            raise ValueError('Source Compose identity does not match SAQ')
        if Path(labels.get('com.docker.compose.project.working_dir', '')).resolve() != ROOT.resolve():
            raise ValueError('Source Compose working directory does not match this checkout')
        containers[service] = state
    if not containers['db']['running'] or containers['db']['paused']:
        raise ValueError('Source database must be running and unpaused')
    return containers


@contextmanager
def quiesced(containers):
    paused = []
    try:
        for service in ('api', 'worker'):
            state = containers[service]
            if state['running'] and not state['paused']:
                run(['docker', 'pause', state['id']], stdout=subprocess.PIPE)
                paused.append(state['id'])
        yield
    finally:
        failures = []
        for container in reversed(paused):
            try:
                run(['docker', 'unpause', container], stdout=subprocess.PIPE)
            except (OSError, RuntimeError, subprocess.TimeoutExpired):
                failures.append(container)
        if failures:
            raise RuntimeError('Could not resume SAQ container(s): ' + ', '.join(failures))


def private_directory(kind):
    stamp = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')
    target = private_path(ROOT / '.local' / kind / f'{stamp}-{uuid4().hex}')
    target.mkdir(mode=0o700, parents=True, exist_ok=False)
    return target


def save_json(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


def create_backup():
    containers = source_containers()
    target = private_directory('backups')
    storage = target / 'storage'
    storage.mkdir()
    db = containers['db']['id']
    with quiesced(containers):
        tables = fingerprints(db)
        assets = json.loads(
            sql(
                db,
                "SELECT coalesce(json_agg(a ORDER BY a.id)::text,'[]') FROM "
                '(SELECT id,storage_key,sha256,byte_size,kind FROM assets) a;',
            )
        )
        with (target / 'database.dump').open('wb') as stream:
            run(
                [
                    'docker',
                    'exec',
                    db,
                    'sh',
                    '-c',
                    'exec pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" '
                    '--format=custom --no-owner --no-acl --lock-wait-timeout=5s',
                ],
                stdout=stream,
            )
        for asset in assets:
            original = check_asset(ROOT / 'storage', asset)
            copied = asset_path(storage, asset)
            if not copied.exists():
                copied.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(original, copied)
            check_asset(storage, asset)
        if fingerprints(db) != tables:
            raise ValueError('Database changed while writers were paused; backup rejected')
        revision = run(['git', 'rev-parse', 'HEAD'], stdout=subprocess.PIPE).decode().strip()
        manifest = {
            'schema_version': 1,
            'created_at': datetime.now(timezone.utc).isoformat(),
            'git_revision': revision,
            'source_containers': containers,
            'database_sha256': digest(target / 'database.dump'),
            'tables': tables,
            'assets': assets,
        }
        save_json(target / 'manifest.json', manifest)
    print(f'Backup created: {target.relative_to(ROOT)}')
    return target


def load_backup(target):
    target = private_path(target)
    if linked(target / 'manifest.json') or linked(target / 'database.dump'):
        raise ValueError('Backup symlinks are not supported')
    manifest = json.loads((target / 'manifest.json').read_text(encoding='utf-8'))
    if not isinstance(manifest, dict) or type(manifest.get('schema_version')) is not int:
        raise ValueError('Unsupported or malformed backup manifest')
    if manifest['schema_version'] != 1 or not isinstance(manifest.get('database_sha256'), str):
        raise ValueError('Unsupported or malformed backup manifest')
    if not SHA.fullmatch(manifest['database_sha256']):
        raise ValueError('Unsupported or malformed backup manifest')
    with (target / 'database.dump').open('rb') as stream:
        if stream.read(5) != b'PGDMP':
            raise ValueError('Expected a custom-format PostgreSQL dump')
    if digest(target / 'database.dump') != manifest['database_sha256']:
        raise ValueError('Database dump checksum mismatch')
    tables = manifest.get('tables')
    if not isinstance(tables, dict) or not {'assets', 'audit_events', 'signals', 'alembic_version'} <= tables.keys():
        raise ValueError('Expected table fingerprints are missing')
    for table in tables.values():
        if not isinstance(table, dict) or type(table.get('rows')) is not int or table['rows'] < 0:
            raise ValueError('Invalid table row count')
        if not isinstance(table.get('sha256'), str) or not SHA.fullmatch(table['sha256']):
            raise ValueError('Invalid table fingerprint')
    sources = manifest.get('source_containers')
    if not isinstance(sources, dict) or not isinstance(sources.get('api'), dict):
        raise ValueError('Source API metadata is missing')
    image = sources['api'].get('image', '')
    if not isinstance(image, str) or not re.fullmatch(r'sha256:[0-9a-f]{64}', image):
        raise ValueError('Immutable source API image is missing')
    if not isinstance(manifest.get('assets'), list) or len(manifest['assets']) != tables['assets']['rows']:
        raise ValueError('Asset manifest count does not match database fingerprint')
    for asset in manifest['assets']:
        check_asset(target / 'storage', asset)
    return manifest


# Runs solely inside the disposable API container. No migrations, seed or worker.
HTTP_PROBE = r"""
import hashlib, http.cookiejar, json, subprocess, sys, time, urllib.error, urllib.request
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session
from app.config import Settings
from app.models import Asset, Signal

settings = Settings()
engine = create_engine(settings.database_url, hide_parameters=True)
with Session(engine) as db:
    assets = [{'id': str(a.id), 'sha256': a.sha256, 'size': a.byte_size, 'kind': a.kind}
              for a in db.scalars(select(Asset))]
    signals = [{'id': str(s.id), 'snapshot': s.snapshot, 'decisions': s.decisions,
                'pdf_state': s.pdf_state, 'pdf_asset_id': str(s.pdf_asset_id)}
               for s in db.scalars(select(Signal))]
engine.dispose()
if not any(a['kind'] != 'SIGNAL_PDF' for a in assets):
    raise RuntimeError('No existing originals: HTTP proof cannot be completed')
# An operational database may legitimately have no signals after demo cleanup.
# Verify every saved signal/PDF that exists and report zero coverage explicitly.
server = subprocess.Popen([sys.executable, '-m', 'uvicorn', 'app.main:app', '--host', '127.0.0.1',
                           '--port', '8000', '--no-access-log'], stdout=subprocess.DEVNULL,
                          stderr=subprocess.DEVNULL)
try:
    client = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
    base = 'http://127.0.0.1:8000'
    def request(path, body=None, headers=None):
        data = json.dumps(body).encode() if body is not None else None
        return client.open(urllib.request.Request(base + path, data=data, headers=headers or {}), timeout=15)
    for attempt in range(60):
        try:
            with request('/health') as response:
                assert response.status == 200
            break
        except (OSError, urllib.error.URLError):
            if server.poll() is not None or attempt == 59:
                raise RuntimeError('Restored API did not become healthy') from None
            time.sleep(0.25)
    with request('/api/v1/auth/csrf') as response:
        csrf = json.load(response)['csrf_token']
    with request('/api/v1/auth/login', {'username': settings.bootstrap_analyst_username,
                 'password': settings.bootstrap_analyst_password},
                 {'Origin': settings.app_origin, 'X-CSRF-Token': csrf, 'Content-Type': 'application/json'}) as response:
        assert response.status == 200
    for asset in assets:
        with request('/api/v1/assets/' + asset['id']) as response:
            content = response.read()
        assert len(content) == asset['size'] and hashlib.sha256(content).hexdigest() == asset['sha256']
    by_id = {a['id']: a for a in assets}
    ready = 0
    for signal in signals:
        with request('/api/v1/signals/' + signal['id']) as response:
            restored = json.load(response)
        assert restored['snapshot'] == signal['snapshot'] and restored['decisions'] == signal['decisions']
        if signal['pdf_state'] == 'READY':
            with request('/api/v1/signals/' + signal['id'] + '/pdf') as response:
                content = response.read()
                assert response.status == 200 and response.headers.get_content_type() == 'application/pdf'
            asset = by_id[signal['pdf_asset_id']]
            assert content.startswith(b'%PDF-') and hashlib.sha256(content).hexdigest() == asset['sha256']
            ready += 1
    print(json.dumps({'assets_downloaded': len(assets), 'signals_checked': len(signals),
                      'decided_signals_checked': sum(bool(s['decisions']) for s in signals),
                      'historical_pdf_assets': sum(a['kind'] == 'SIGNAL_PDF' for a in assets),
                      'ready_signal_pdfs_downloaded': ready}))
finally:
    server.terminate()
    try:
        server.wait(timeout=10)
    except subprocess.TimeoutExpired:
        server.kill()
        server.wait(timeout=5)
"""


def verify_backup(target):
    manifest = load_backup(target)
    evidence = private_directory('restore-checks')
    storage = evidence / 'storage'
    storage.mkdir()
    for asset in manifest['assets']:
        copied = asset_path(storage, asset)
        if not copied.exists():
            copied.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(check_asset(target / 'storage', asset), copied)
        check_asset(storage, asset)
    name = 'saq-restore-check-' + uuid4().hex
    container = None
    database_id_file = evidence / 'database-container.id'
    probe_id_file = evidence / 'probe-container.id'
    result = {'backup': str(target), 'verified': False, 'stage': 'start_database'}
    try:
        container = (
            run(
                [
                    'docker',
                    'run',
                    '-d',
                    '--name',
                    name,
                    '--cidfile',
                    str(database_id_file),
                    '--network',
                    'none',
                    '--tmpfs',
                    '/var/lib/postgresql/data:rw',
                    '-e',
                    'POSTGRES_DB=restore_check',
                    '-e',
                    'POSTGRES_USER=restore_check',
                    '-e',
                    'POSTGRES_HOST_AUTH_METHOD=trust',
                    'postgres:17.9-bookworm',
                ],
                stdout=subprocess.PIPE,
            )
            .decode()
            .strip()
        )
        if not re.fullmatch(r'[0-9a-f]{64}', container):
            raise ValueError('Unexpected disposable database container ID')
        for attempt in range(60):
            try:
                run(
                    [
                        'docker',
                        'exec',
                        container,
                        'pg_isready',
                        '-h',
                        '127.0.0.1',
                        '-U',
                        'restore_check',
                        '-d',
                        'restore_check',
                    ],
                    stdout=subprocess.PIPE,
                )
                break
            except RuntimeError:
                if attempt == 59:
                    raise RuntimeError('Disposable PostgreSQL did not become ready') from None
            time.sleep(0.5)
        result['stage'] = 'restore_database'
        with (target / 'database.dump').open('rb') as stream:
            run(
                [
                    'docker',
                    'exec',
                    '-i',
                    container,
                    'sh',
                    '-c',
                    'exec pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner --no-acl --exit-on-error',
                ],
                stdin=stream,
                stdout=subprocess.PIPE,
            )
        if fingerprints(container) != manifest['tables']:
            raise ValueError('Restored table fingerprints do not match backup')
        result['tables_matched'] = len(manifest['tables'])
        result['audit_events_matched'] = manifest['tables']['audit_events']['rows']
        if manifest['tables']['audit_events']['rows'] < 1:
            raise ValueError('No decision/audit history exists to verify')
        # Root is confined to the disposable probe, allowing reads of copied 0600 files.
        result['stage'] = 'http_probe'
        output = run(
            [
                'docker',
                'run',
                '--rm',
                '-i',
                '--name',
                name + '-api',
                '--cidfile',
                str(probe_id_file),
                '--network',
                f'container:{container}',
                '--user',
                'root',
                '--env-file',
                str(ROOT / '.env'),
                '-e',
                'DATABASE_URL=postgresql+psycopg://restore_check@127.0.0.1:5432/restore_check',
                '-e',
                'STORAGE_ROOT=/restore/storage',
                '-e',
                'SESSION_COOKIE_SECURE=false',
                '--mount',
                f'type=bind,source={storage},target=/restore/storage,readonly',
                '--entrypoint',
                'python',
                manifest['source_containers']['api']['image'],
                '-',
            ],
            input=HTTP_PROBE.encode(),
            stdout=subprocess.PIPE,
        )
        result.update(http=json.loads(output), verified=True)
        result['stage'] = 'complete'
    except (OSError, ValueError, RuntimeError, subprocess.TimeoutExpired) as error:
        result['error_type'] = type(error).__name__
        raise
    finally:
        if probe_id_file.is_file():
            probe_id = probe_id_file.read_text().strip()
            if re.fullmatch(r'[0-9a-f]{64}', probe_id):
                # docker --rm normally removed it; a timed-out attached CLI can leave it running.
                try:
                    remaining = (
                        run(
                            [
                                'docker',
                                'ps',
                                '-aq',
                                '--no-trunc',
                                '--filter',
                                f'id={probe_id}',
                            ],
                            stdout=subprocess.PIPE,
                        )
                        .decode()
                        .split()
                    )
                    if probe_id in remaining:
                        run(['docker', 'rm', '-f', probe_id], stdout=subprocess.PIPE)
                except (OSError, RuntimeError, subprocess.TimeoutExpired):
                    result['cleanup_failed_probe'] = probe_id
                    result['verified'] = False
        if not container and database_id_file.is_file():
            container = database_id_file.read_text().strip()
        if container and re.fullmatch(r'[0-9a-f]{64}', container):
            try:
                run(['docker', 'rm', '-f', container], stdout=subprocess.PIPE)
            except (OSError, RuntimeError, subprocess.TimeoutExpired):
                result['cleanup_failed_container'] = container
                result['verified'] = False
        save_json(evidence / 'result.json', result)
    if not result['verified']:
        raise RuntimeError(f'Restore cleanup failed; inspect private evidence: {evidence}')
    print(f'Restore verified: {(evidence / "result.json").relative_to(ROOT)}')
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest='command', required=True)
    commands.add_parser(
        'create',
        help='Briefly pause only SAQ API/worker and save DB plus referenced storage',
    )
    verify = commands.add_parser('verify', help='Verify a trusted local backup in disposable offline containers')
    verify.add_argument('backup', type=Path)
    args = parser.parse_args()
    try:
        if args.command == 'create':
            create_backup()
        else:
            verify_backup(args.backup.absolute())
    except (OSError, ValueError, RuntimeError, subprocess.TimeoutExpired) as error:
        # Do not print exception values: paths/SQL/process arguments can contain private input.
        print(
            f'{args.command} failed ({type(error).__name__}); source data and saved evidence retained.',
            file=sys.stderr,
        )
        return 1
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
