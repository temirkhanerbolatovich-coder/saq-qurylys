# Разработка и тестирование

## Окружение

Python 3.12, Node.js 24, PostgreSQL 17.9, Docker Linux engine/Compose v2.35+. Подойдут VS Code/PyCharm с Python/TypeScript поддержкой. Backend requirements*.txt и frontend package-lock.json закрепляют зависимости; Python входные списки — requirements*.in.

Linux OCR/PDF: tesseract-ocr с rus/kaz/eng, fonts-dejavu-core, libpango-1.0-0, libpangoft2-1.0-0, libharfbuzz-subset0. Dockerfile устанавливает их. Native Windows API намеренно не покрывает POSIX passive PDF validation.

## Native-разработка

Создайте новую конфигурацию по [README](../README.md). PostgreSQL можно оставить в Docker:

```powershell
python -m venv .venv
.venv\Scripts\python.exe -m pip install -r backend/requirements-dev.txt
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --wait --wait-timeout 180 db
cd backend
..\.venv\Scripts\python.exe -m alembic upgrade head
..\.venv\Scripts\python.exe -m app.seed
..\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

На Linux: python3 -m venv .venv и ../.venv/bin/python вместо Windows-пути. Для пустой установки: python -m app.seed --bootstrap-only. В другом терминале из backend: python -m app.worker тем же venv. Во frontend: npm ci → npm run dev. API_INTERNAL_URL по умолчанию http://127.0.0.1:8000. Native и Compose UI не должны занимать один порт.

## Статические проверки

Из корня с активным venv:

```sh
python scripts/check_repository_hygiene.py
python -m unittest discover -s scripts -p "test_*.py" -v
python -m ruff check backend/app backend/tests backend/alembic
python -m ruff format --check backend/app backend/tests backend/alembic
python -m ruff check --config backend/pyproject.toml scripts
python -m ruff format --check --config backend/pyproject.toml scripts
git diff --check
```

Из frontend:

```sh
npm ci
npm run lint
npm run typecheck
npm run format:check
node --test scripts/test-*.mjs
npm audit --audit-level=high
npm run build
npm start
```

На Windows остановите свой standalone process до повторного build. Next root ограничен frontend/; не добавляйте root lockfiles.

## pytest и миграции

Используйте отдельный тестовый PostgreSQL и тестовые DATABASE_URL/SESSION_SECRET/BOOTSTRAP_ANALYST_PASSWORD. Из backend: python -m pytest -q, затем python -m alembic upgrade head и python -m alembic check. Fixture создаёт случайную schema, но рабочую БД применять не следует. Linux нужен для полного PDF/resource-limit покрытия; Windows SKIP не равен PASS.

Миграция: alembic revision --autogenerate -m "describe change"; вручную проверить SQL и запуск на пустой БД/копии предыдущей схемы. Проверить один head, отсутствие drift и совместимость старых snapshots. Не выполнять autogenerate/upgrade production ради разработки.

## Browser и OCR acceptance

Нужны отдельный checkout, .env, DB/storage, project и HTTP loopback-порт (например3090). Общий guard отказывает без SAQ_ISOLATED_ACCEPTANCE=1, на public origin и обычных рабочих портах. Адрес/opt-in не заменяют изоляцию данных. Полный рецепт — [CLEAN_INSTALL_ACCEPTANCE](CLEAN_INSTALL_ACCEPTANCE.md).

Перед первым OCR и Playwright в PowerShell:

```powershell
$env:SAQ_ISOLATED_ACCEPTANCE = '1'
$env:SAQ_E2E_BASE_URL = 'http://localhost:3090'
python scripts/verify_ocr.py
cd frontend
npx playwright install chromium
npm run test:e2e
```

Bash: export SAQ_ISOLATED_ACCEPTANCE=1 SAQ_E2E_BASE_URL=http://localhost:3090. APP_ORIGIN в .env новой копии должен совпадать. verify_ocr создаёт DEMO материалы/jobs, это не read-only диагностика. scripts/evaluate_ocr.py измеряет synthetic corpus отдельно и не доказывает точность на реальной рекламе.

## Новые функции

Прочитайте AGENTS/требования/FEATURE/ADR, код и тесты; найдите аналог, выберите минимальное изменение. DTO/OpenAPI/types/tests меняются согласованно. Проверьте роли/ошибки/ревизии/историю, обновите docs и PROJECT_STATUS. Для UI обязательна единая дизайн-система. Значимое решение записывается ADR.

Фактическая проверка конкретной ревизии — [REFACTOR_REPORT](REFACTOR_REPORT.md). Архивные цифры не доказывают текущий код.
