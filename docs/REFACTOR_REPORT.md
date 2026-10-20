# Repository cleanup — отчёт

Статус IN_PROGRESS, дата21.10.2026. Фактическая ревизия будет зафиксирована после проверок. Ветка codex/repository-cleanup; deployment/реальная БД не изменяются.

## Проблема и результат

GitHub отставал от текущих локальных исходников: main aefb72f, feature f5c6387, локальный HEAD b156086 плюс620файлов полного source snapshot. README и статус смешивали текущие инструкции с длинной историей; scripts CI был неполным, E2E использовал обычный рабочий порт.

Сохранены backend/frontend/contracts/scripts/data/.github и закреплённый Skill. Runtime-код массово не перемещается. docs/reference содержит исходники, docs/archive — прежние входные документы, docs/operations — backup/restore; тематические руководства индексируются docs/README.md.

## Перемещения и удаления

Исходный DOCX/PDF moved с сохранением bytes/SHA, SOURCES.json фиксирует hashes. Старые README/PROJECT_STATUS/ARCHITECTURE/DEPLOYMENT полностью архивированы с актуализированными относительными ссылками. Исторические OCR fixtures/результаты, миграции, OpenAPI, лицензии сохранены. REMOVE исходных файлов нет; дубли evidence остаются REVIEW. Кэши исключены из image context.

## Изменения качества

Общий opt-in/loopback guard для recording E2E/OCR. CI должен проверять все scripts, docs/hygiene и Compose overlays, сохраняя текущие jobs. Требования безопасности/предметные guards не ослабляются.

## Проверки

| Проверка | Результат |
|---|---|
| Исходный snapshot620files/SHA | PASS |
| Static/tools/ссылки/Compose | PASS: Ruff backend144/scripts27, frontend lint/type/format, tools101 (1SKIP), Node20, hygiene, 4Compose variants |
| Docker build/new DB install | PASS: api/worker/frontend, новая DB/storage, loopback3093, реальный RU/KZ OCR; remote fresh clone впереди |
| Backend/Linux/native PDF | PENDING |
| Browser acceptance | PENDING |
| GitHub CI точного SHA | PENDING |

Непроверенные сценарии не считаются PASS. Полная матрица будет обновлена фактическими командами/результатами.

## Запуск и ограничения

Quick Start — [README](../README.md), собственный сервер — [DEPLOYMENT](DEPLOYMENT.md). Риск/API/роли/исторические snapshots сохраняются; новые архитектурные слои/пакеты/лицензия не вводятся.

Старые credentials/PR/cache refs остаются open по SECURITY; автоматический off-host backup, официальный REAL-реестр, live access и внешняя приёмка не закрываются реорганизацией. Merge/deploy/settings не выполняются без отдельного разрешения.

## Зафиксированные команды и промежуточные ошибки

- npm ci --no-audit; npm run lint/typecheck/format:check; node --test scripts/test-*.mjs: PASS, Node20. npm audit --audit-level=high:0 vulnerabilities на момент проверки.
- python -m unittest discover -s scripts -p "test_*.py" -q:101tests,100PASS/1SKIP. Сообщение ru-01 failed(ValueError) — ожидаемый negative test, итог unittest OK.
- python scripts/check_repository_hygiene.py: PASS после staging; signatures сканируют все UTF-8 source files, включая key/PowerShell; regression добавлен. Проверка не является полным историческим security audit.
- docker compose -p saq-cleanup-20261021 build; up --no-build -d --wait: PASS. Используется Docker cache, это не полностью offline/no-cache проверка установки зависимостей.
- SAQ_ISOLATED_ACCEPTANCE=1, APP_ORIGIN3093: verify_ocr PASS настоящих двух RU/KZ jobs; source files/PDF не подменяются seed-ответами.
- Первая Linux dev-dependency установка получила PyPI ReadTimeout; retry с90s завершился. Первый pytest collection выявил отсутствующий scripts/evaluate_publications.py в тестовом контейнере; scripts и evaluation fixtures добавлены в одноразовый test container, приложение не исправлялось ради тестового harness. Полный pytest теперь исполняется.

## Independent review

Read-only reviewer проверил deployment/backup/CI/security. Исправлены cookie saq_session, DB --wait, trap перед stop, Windows/Linux storage порядок, .pem/.ps1 scanner coverage и minimum Compose2.35. Схема/поведение runtime не менялись. Старые credentials/cache refs и off-host backup сохранены OPEN.

Первый полный browser на3093:308PASS/2FAIL/7SKIP,6.8min. Два opt-in live tests требуют точный3090; application failures не обнаружены, фикстуры портом не ослаблялись. Финальный полный прогон будет на fresh clone3090 как в CI. Первый source commit cd94984 опубликован; до итоговой docs/CI приёмки завершение не заявляется.
