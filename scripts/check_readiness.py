"""Read-only prerequisites for a local SAQ demo; never start services or contact external sites.

Run from any directory: python scripts/check_readiness.py [--report .local/readiness.json].
Exit 0: local prerequisites passed, 1: blocked/unverified, 2: report/CLI error.
This is not an authenticated end-to-end demo, backup verification or offline acceptance.
"""

import argparse
import json
import re
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from urllib.error import URLError
from urllib.request import HTTPRedirectHandler, ProxyHandler, build_opener

ROOT = Path(__file__).resolve().parents[1]
COMPOSE = ['docker', 'compose', '-f', str(ROOT / 'docker-compose.yml')]
SERVICES = ('db', 'api', 'worker', 'frontend')
INSPECT = (
    '{"image":{{json .Image}},"running":{{json .State.Running}},'
    '"paused":{{json .State.Paused}},"health":{{if .State.Health}}{{json .State.Health.Status}}'
    '{{else}}null{{end}},"labels":{{json .Config.Labels}},"ports":{{json .NetworkSettings.Ports}}}'
)
# Only booleans leave the container. Never print exception text, environment or stored material.
RUNTIME_PROBE = r"""
import json, os, subprocess, sys
from urllib.parse import urlsplit
from urllib.request import ProxyHandler, build_opener
result = {}
try:
    from app.config import Settings
    settings = Settings()
    result['config'] = True
except Exception:
    print(json.dumps({'config': False}))
    sys.exit(0)
try:
    root = settings.storage_root
    with os.scandir(root) as entries:
        next(entries, None)
    result['storage'] = root.is_dir() and os.access(root, os.R_OK | os.X_OK)
except Exception:
    result['storage'] = False
origin = urlsplit(settings.app_origin)
result['local_auth'] = (origin.scheme == 'http' and origin.hostname in ('localhost', '127.0.0.1', '::1')
                        and (origin.port or 80) == int(sys.argv[2]) and not settings.session_cookie_secure)
if sys.argv[1] == 'api':
    try:
        with build_opener(ProxyHandler({})).open('http://127.0.0.1:8000/health', timeout=5) as response:
            result['health'] = response.status == 200 and json.loads(response.read(1024)) == {'status': 'ok'}
    except Exception:
        result['health'] = False
else:
    try:
        process = subprocess.run([settings.tesseract_command, '--list-langs'], capture_output=True, timeout=5)
        result['ocr'] = process.returncode == 0 and {'rus', 'kaz', 'eng'} <= set(process.stdout.decode().split())
    except Exception:
        result['ocr'] = False
    try:
        from weasyprint import HTML
        from weasyprint.urls import URLFetcher, FatalURLFetchingError
        class NoResources(URLFetcher):
            def fetch(self, url, headers=None):
                raise FatalURLFetchingError('Resources disabled')
        result['pdf'] = HTML(string='<p>DEMO. Проверка. Қазақша.</p>', url_fetcher=NoResources()).write_pdf().startswith(b'%PDF-')
    except Exception:
        result['pdf'] = False
print(json.dumps(result))
"""


class ProbeError(Exception):
    """A safe message without captured command output."""


def run(command, timeout):
    try:
        result = subprocess.run(
            command, cwd=ROOT, capture_output=True, timeout=timeout, check=False, encoding='utf-8', errors='replace'
        )
    except FileNotFoundError:
        raise ProbeError('Команда Docker не найдена. Установите Docker Desktop/Compose отдельно.') from None
    except subprocess.TimeoutExpired:
        raise ProbeError('Истёк срок проверки. Проверьте Docker и повторите диагностику.') from None
    except OSError:
        raise ProbeError('Не удалось выполнить локальную команду. Проверьте доступ к Docker.') from None
    if result.returncode:
        raise ProbeError('Локальная команда не выполнена. Проверьте Docker и конфигурацию; вывод скрыт.')
    return result.stdout


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, request, fp, code, message, headers, new_url):
        return None


def frontend_available(port, timeout):
    # Ignore system proxies and refuse redirects so this check cannot leave loopback.
    try:
        opener = build_opener(ProxyHandler({}), NoRedirect())
        with opener.open(f'http://127.0.0.1:{port}/login', timeout=timeout) as response:
            content_type = response.headers.get('Content-Type', '').lower()
            return response.status == 200 and 'text/html' in content_type and b'<' in response.read(4096)
    except (URLError, OSError, ValueError):
        return False


def diagnose(timeout=20):
    checks = []

    def add(name, ok, success, failure):
        checks.append({'name': name, 'status': 'PASS' if ok else 'FAIL', 'message': success if ok else failure})

    def command_check(name, callback):
        try:
            return callback()
        except ProbeError as error:
            add(name, False, '', str(error))
            return None
        except (ValueError, TypeError, KeyError):
            add(name, False, '', 'Проверка недоступна. Проверьте локальную конфигурацию/Docker; вывод скрыт.')
            return None

    engine = command_check('docker_engine', lambda: run(['docker', 'info', '--format', '{{.OSType}}'], timeout).strip())
    if engine is None:
        return report(checks)
    add('docker_engine', engine == 'linux', 'Linux Docker engine доступен.', 'Нужен работающий Linux Docker engine.')
    if engine != 'linux':
        return report(checks)
    compose = command_check('compose', lambda: run(['docker', 'compose', 'version', '--short'], timeout).strip())
    if compose is None:
        return report(checks)
    add('compose', bool(compose), 'Docker Compose доступен.', 'Установите Docker Compose отдельно.')

    images = command_check('images', lambda: run(COMPOSE + ['config', '--images'], timeout).split())
    if images:
        available = command_check(
            'images', lambda: run(['docker', 'image', 'inspect', '--format', '{{.Id}}', *sorted(set(images))], timeout)
        )
        if available is not None:
            add('images', bool(available.strip()), 'Все образы Compose есть локально.', 'Образы не найдены локально.')
    elif images is not None:
        add('images', False, '', 'Compose не перечислил образы. Проверьте .env по README без вывода секретов.')

    containers = {}
    for service in SERVICES:
        ids = command_check(
            service, lambda service=service: run(COMPOSE + ['ps', '--all', '-q', service], timeout).split()
        )
        if ids is None:
            continue
        if len(ids) != 1 or not re.fullmatch(r'[0-9a-f]{12,64}', ids[0]):
            add(service, False, '', f'Нужен ровно один контейнер {service}; запуск по README выполняется отдельно.')
            continue
        state = command_check(
            service, lambda: json.loads(run(['docker', 'inspect', '--format', INSPECT, ids[0]], timeout))
        )
        if state is None:
            continue
        if not isinstance(state, dict) or not isinstance(state.get('labels'), dict):
            add(service, False, '', 'Docker вернул неожиданные метаданные контейнера.')
            continue
        labels = state.get('labels') or {}
        identity = (
            labels.get('com.docker.compose.project') == 'saq-qurylys'
            and labels.get('com.docker.compose.service') == service
            and Path(labels.get('com.docker.compose.project.working_dir', '')).resolve() == ROOT.resolve()
        )
        healthy = (
            state.get('health') == 'healthy' if service in ('db', 'api') else state.get('health') in (None, 'healthy')
        )
        ready = identity and state.get('running') is True and state.get('paused') is False and healthy
        add(
            service,
            ready,
            f'{service}: контейнер этого checkout работает; healthcheck проверен, если настроен.',
            f'{service}: проверьте checkout, running/paused и health контейнера. Изменений не выполнено.',
        )
        if ready:
            containers[service] = (ids[0], state)

    frontend = containers.get('frontend')
    port = None
    if frontend:
        for binding in (frontend[1].get('ports') or {}).get('3000/tcp') or []:
            candidate = str(binding.get('HostPort', ''))
            if binding.get('HostIp') == '127.0.0.1' and candidate.isdigit() and 1 <= int(candidate) <= 65535:
                port = int(candidate)
                break

    for service in ('api', 'worker'):
        if service not in containers:
            add(f'{service}_runtime', False, '', f'{service}: runtime не проверен без готового контейнера.')
            continue
        container_id = containers[service][0]
        runtime = command_check(
            f'{service}_runtime',
            lambda: json.loads(
                run(
                    ['docker', 'exec', container_id, 'python', '-B', '-c', RUNTIME_PROBE, service, str(port or 0)],
                    timeout,
                )
            ),
        )
        if runtime is None:
            continue
        if not isinstance(runtime, dict):
            add(f'{service}_runtime', False, '', 'Runtime вернул неожиданный формат результата.')
            continue
        for name, success, failure in (
            (
                'config',
                'Настройки приложения валидны.',
                'Проверьте приватную .env и runtime config без публикации значений.',
            ),
            ('storage', 'Настроенный каталог storage доступен для чтения.', 'Проверьте mount и права чтения storage.'),
        ):
            add(f'{service}_{name}', runtime.get(name) is True, success, failure)
        if service == 'api':
            add(
                'api_health',
                runtime.get('health') is True,
                '/health: HTTP 200, БД отвечает.',
                'API /health/БД недоступны.',
            )
            add(
                'local_auth_config',
                runtime.get('local_auth') is True,
                'Настройки Origin/cookie подходят для локального HTTP входа; сам вход не выполнялся.',
                'Настройки Origin/cookie требуют другого режима входа. Активный sharing не изменён; см. DEPLOYMENT.md.',
            )
        else:
            add(
                'ocr_languages',
                runtime.get('ocr') is True,
                'Tesseract: rus/kaz/eng доступны.',
                'Проверьте Tesseract и rus/kaz/eng в worker.',
            )
            add(
                'pdf_runtime',
                runtime.get('pdf') is True,
                'WeasyPrint/Pango: PDF создан в памяти без внешних ресурсов.',
                'Проверьте WeasyPrint/Pango/шрифты в worker.',
            )

    add(
        'frontend_http',
        port is not None and frontend_available(port, min(timeout, 5)),
        'Локальная страница /login отвечает HTML; вход не выполнялся.',
        'Проверьте frontend и loopback port; HTML /login недоступен без перенаправлений.',
    )
    return report(checks)


def report(checks):
    return {
        'schema_version': 1,
        'checked_at': datetime.now(timezone.utc).isoformat(),
        'local_prerequisites_ready': bool(checks) and all(check['status'] == 'PASS' for check in checks),
        'checks': checks,
        'external_dependencies': {
            'status': 'NOT_CHECKED',
            'items': ['Cloudflare/public HTTPS', 'URL import/websites', 'map tiles', 'Threads', 'Telegram'],
        },
        'limitations': [
            'Проверка предусловий не доказывает полноценную работу без интернета или на втором ПК.',
            'Вход, OCR изображения, сохранение/чтение конкретного материала и полный PDF workflow не выполнялись.',
            'Права записи storage и целостность всех исходников/БД не проверены; используйте LOCAL_BACKUP.md отдельно.',
            'Worker проверен как процесс и runtime; выполнение очереди и внешние уведомления не проверялись.',
        ],
    }


def save_report(path, payload):
    # Exclusive creation also rejects an existing symlink and preserves earlier evidence.
    with path.open('x', encoding='utf-8') as stream:
        json.dump(payload, stream, ensure_ascii=False, indent=2)
        stream.write('\n')


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--report', type=Path, help='Новый JSON-файл; родительский каталог должен существовать.')
    parser.add_argument('--timeout', type=int, default=20, choices=range(5, 61), metavar='5..60')
    args = parser.parse_args(argv)
    payload = diagnose(args.timeout)
    print(json.dumps(payload, ensure_ascii=False, indent=2))
    if args.report:
        try:
            save_report(args.report, payload)
        except OSError:
            print(
                'Отчёт не записан: нужен новый файл в доступном каталоге; существующие файлы не изменены.',
                file=sys.stderr,
            )
            return 2
    return 0 if payload['local_prerequisites_ready'] else 1


if __name__ == '__main__':
    raise SystemExit(main())
