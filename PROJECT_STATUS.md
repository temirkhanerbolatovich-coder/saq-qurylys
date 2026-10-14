# SAQ QURYLYS — PROJECT STATUS

Updated: 2026-10-14 22:43 +05:00 (Asia/Qyzylorda)
Branch: main. Первый локальный commit готовится; удалённый репозиторий не настроен, push/deploy не выполнялись.
Current goal: первый вертикальный срез VERIFIED; следующий — изображение/OCR/извлечение/matching и ручная проверка.
Owner: Codex; пользователь разрешил реализацию 14.10.2026 («окей гоу начнем реализовывать»).

## Общая готовность

**Первый срез реализован и проверен на живом PostgreSQL и через Docker Compose. Это не полный P0.** Доступно локально: http://localhost:3000. Credentials: игнорируемый `.local/credentials.txt`; пароль не публиковать. Контейнеры SAQ оставлены работающими; посторонние контейнеры не используются. Два AssetGuard-контейнера автоматически поднялись при запуске Docker Desktop и сразу были возвращены в остановленное состояние без удаления данных.

Есть 8 DEMO-объектов, 12 исходных DEMO-публикаций и дополнительные DEMO-записи browser/restart smoke. Все вымышленные документы/решения маркированы. API имеет 13 реализованных операций из целевых 35; остальные явно PLANNED в contracts/openapi.yaml. Нельзя выдавать фиктивные проверки seed за новую ручную проверку реального объекта.

Статусы: NOT STARTED / IN PROGRESS / BLOCKED / VERIFIED. VERIFIED относится к названному объёму и фактической проверке, не к будущим частям модуля.

## P0 MVP checklist

| Блок | Статус | Файлы / доказательства | Что осталось |
|---|---|---|---|
| Architecture + API contract | IN PROGRESS | Архитектура/UX приняты как основа; docs и 13 operationId; OpenAPI validator и live DTO checks проходят | Реализовать ещё 22 целевых операции по срезам |
| Seed ≥8 properties and ≥12 ads | VERIFIED | data/seed/fixtures.json, backend/app/seed.py; повтор seed не меняет записи; A/B/C с источниками | Другой ПК и UX включены в общую приёмку, не в готовность seed |
| Create/import ad + source/time | IN PROGRESS | Новый текст, UTF-8 asset/SHA, nullable published_at, captured_at, server actor, audit, idempotency/concurrency, фактический restart Docker API VERIFIED | Изображения и URL-collector ещё отсутствуют |
| One permitted HTML collector | BLOCKED | Разрешённый рекламный домен/пути ещё не выбраны; ссылка формы только сохраняется | Проверить правила/разрешение и реальный новый импорт; manual не закрывает этот пункт |
| OCR RU/KZ on new image | NOT STARTED | Не подключён; модели не устанавливались | Tesseract rus+kaz+eng, worker, новый RU/KZ файл и метрики |
| Extraction + matching | NOT STARTED | Нет готовых AI-ответов и нет имитации matching | Правила RU/KZ, RapidFuzz, фрагменты, выбор очереди |
| Legal basis verification | IN PROGRESS | Карточка показывает датированный DEMO-документ и источник; UNKNOWN не создаёт R1 | Typed write/review и процедуры реальной проверки |
| Risk R1–R6 + A/B/C tests | IN PROGRESS | backend/app/risk.py: все веса/зоны, дубли и статусы; 11 unit cases VERIFIED; сервер отдаёт 35/70/10 из БД | Ручное подтверждение с guards R1/R5, история/пересчёт через review |
| Human review + audit | IN PROGRESS | Сессии/CSRF/роль и аудит создания публикации VERIFIED | Подтверждение/отклонение гипотез, документов, факторов и сигнала |
| Dashboard / registry / map / review UX | IN PROGRESS | Next.js: обзор, поиск/фильтры, карточка/доказательства, реклама/форма; 4 browser-теста, визуальный desktop/mobile просмотр | Карта, split review, UX с 3–5 людьми, keyboard/zoom полная приёмка |
| Signals + PDF | NOT STARTED | Меню честно показывает будущий этап | Snapshot/версии/decision/PDF/оговорка/шрифты |
| End-to-end + clean setup + CI | IN PROGRESS | Первый срез: backend 23 passed, browser 4 passed; Docker build/up, migrations; workflow создан | Полный P0 E2E, другой ПК, реальный GitHub CI, freeze SHA и резерв демо |

## P1 / P2

P1 NOT STARTED: KZhK PDF import; LLM enrichment; близкие дубликаты; полный RU/KZ UI; экран здоровья источников. Идемпотентность и отсутствие повторного веса уже есть в первом срезе, не откладываются до P1.

P2 NOT STARTED: инспекции/дрон, дополнительные источники, расширенная GIS и ведомственные интеграции. До основного P0 не начинать.

## Проверенные реализации и команды

| Проверка | Реальный результат | Файлы |
|---|---|---|
| PostgreSQL / migration | Новая БД и начальная миграция применены; Alembic check: No new upgrade operations detected | backend/alembic/versions/7c3486b58495_initial_data_and_sessions.py |
| Backend tests | `cd backend; ..\.venv\Scripts\python.exe -m pytest -q`: **23 passed**, последний прогон без warnings; реальные миграции в отдельной случайной test schema | backend/tests/* |
| Backend lint/format | Ruff check проходит; format --check: 21 files already formatted | backend/pyproject.toml |
| Contract | Полный OpenAPI validator; schema validation живых responses; неизвестные operationId не появились | backend/tests/test_contract.py |
| Build / types / lint / format | npm run build/typecheck/lint/format:check проходят; production Next standalone проверен | frontend/package.json и lock |
| Proxy failure | API остановлен: возвращается schema-valid 503 и совпадающий X-Request-ID; API восстановлен, browser 4/4 повторно прошёл | frontend/app/api/[...path]/route.ts |
| Dependency checks | pip check: no broken requirements; полный npm audit: **0 vulnerabilities** | requirements*.txt, package-lock.json |
| Browser E2E | **4 passed** на Docker-приложении: anonymous/login, dashboard/filter/evidence, draft/new text/reload, mobile no overflow | frontend/tests/workspace.spec.ts |
| Visual QA | Просмотрены output/qa/dashboard.png, mobile.png и new-advertisement.png; читаемые статусы и источники, 390px без page overflow | Игнорируемый output/qa/ |
| Docker | api/frontend образы собраны; `docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --wait api frontend` успешно; API healthy | docker-compose*.yml, Dockerfiles |
| Actual restart | Новый DEMO-текст → `docker compose restart api` → та же session/record/nullable date/captured_at/UTF-8 asset; PASS | .local/restart-check.json (игнорируется) |
| Seed | Повтор аддитивный, не сбрасывает новые пользовательские записи | backend/app/seed.py |

Backend-тесты используют отдельную schema test_<uuid> и удаляют только её; существующие public данные не сбрасывались. Browser-тесты создают новые DEMO-записи. Workflow ещё не запускался в GitHub: remote отсутствует. Чистый другой ПК, полный P0, реальные данные/реестры, OCR/collector/PDF и проверка людьми НЕ выполнены.

## Исправленные проблемы этой сессии

- TypeScript 7 несовместим с текущим typescript-eslint: закреплён совместимый TypeScript 6.0.3.
- Уязвимый braces в цепочке eslint-config-next: выбран core/TypeScript ESLint без этой зависимости; итоговый npm audit = 0. Контроли типов/lint не отключены.
- Mobile page overflow из-за абсолютной sr-only подписи таблицы: таблица получила собственный positioning context; browser regression проходит.
- Один ранний failure snapshot Playwright содержал локальный пароль формы: credentials заменены, прежние sessions отозваны, snapshot очищен. Тесты теперь авторизуются через API и не кладут пароль в DOM/trace. Новый пароль остаётся только в приватной конфигурации/локальном файле.
- Windows EBUSY при сборке поверх работающего standalone server: локальный сервер останавливается до сборки; рецепт записан в README. Первые browser-прогоны во время рестарта API не считались успешной проверкой; финальный согласованный прогон 4/4 прошёл.

## Известные ограничения первого среза

См. docs/IMPLEMENTATION_SLICE_01.md: нет обработки chunked размера тела сверх проверки Content-Length, distributed throttling, session retention и admin управления паролями; orphan content-hash файл возможен при rollback БД. При реальном внешнем deploy эти ограничения требуют отдельного закрытия. Исторический as_of возвращает явную 400. Текущий scorer не является юридическим верификатором.

## Блокеры и открытые вопросы

1. Collector: нет согласованного разрешённого источника. Нужны домен/пути/правила и фактический импорт.
2. Процедуры R1/R4/R6 и полномочия реального пилота предметно не согласованы; на демо только явные синтетические документы. Полная актуальная редакция закона не проверялась повторно.
3. «ИГК», точный GitHub, состав команды/часы, второй ПК, роли проверяющих и правила/timezone отсечки не определены.
4. OCR/PDF системные зависимости ещё не устанавливались и не проверялись; это задача следующего среза, не доказанная готовность окружения.

## Next concrete action

Следующий вертикальный срез без нового запроса общего разрешения: добавить upload PNG/JPEG с limits, контролируемый worker/DB jobs, Tesseract rus+kaz+eng, сохранённый OCR/фрагменты, правила оплаты и RapidFuzz-кандидаты; экран оригинал ↔ гипотеза и отдельный выбор точной очереди. До начисления баллов необходимо реализовать ручной review, evidence guards и аудит. Разрешённый источник collector искать ранней независимой задачей; массовый сбор/LLM/дрон не начинать.

## Last session handoff

Date: 14.10.2026. Executor: Codex.
Completed: первый срез, Docker runtime, auth, seed, реестр/карточки/доказательства, новый текст и restart persistence, тесты и документация.
Runtime: Docker SAQ UI http://localhost:3000; API внутренний; PostgreSQL dev binding localhost:55432. Host API/UI процессы остановлены. AssetGuard не работает.
Commit: первый локальный commit фиксируется после финальной проверки; remote/push/deploy отсутствуют.
Unfinished: следующий OCR/review срез и остальной P0; не выдавать текущую оболочку за готовое решение кейса.

## История сессий

| Дата | Исполнитель | Результат | Следующий шаг |
|---|---|---|---|
| 14.10.2026, планирование | Codex | Четыре источника изучены, требования/архитектура/UX/OpenAPI сохранены | Согласование пользователя |
| 14.10.2026, реализация | Codex | Разрешение получено, первый срез и Docker/browser/restart проверки выполнены | Изображение → OCR → фрагменты → matching → ручная проверка |
