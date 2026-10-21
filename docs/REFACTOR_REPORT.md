# Repository cleanup — отчёт

Дата:21.10.2026, Asia/Qyzylorda. Исполнитель:Codex и независимый read-only reviewer.
Ветка [codex/repository-cleanup](https://github.com/temirkhanerbolatovich-coder/saq-qurylys/tree/codex/repository-cleanup), [PR5](https://github.com/temirkhanerbolatovich-coder/saq-qurylys/pull/5).
Рабочий deployment/БД/storage не изменялись; merge/settings/history rewrite не выполнялись.

## Проверка GitHub после слияния · 21.10.2026

Этот раздел дополняет исходный отчёт выше: на момент первоначального cleanup слияние ещё не выполнялось. Сейчас [PR №5](https://github.com/temirkhanerbolatovich-coder/saq-qurylys/pull/5) уже слит в main коммитом 24811c2228b66d3e3e863430a98e349b7ceeaee4. Через GitHub API подтверждены main как default branch, 644 файла в опубликованном дереве и отсутствие открытых PR/issues на момент проверки. Все четыре CI jobs этого main прошли: [run 39488225449](https://github.com/temirkhanerbolatovich-coder/saq-qurylys/actions/runs/39488225449).

Последующая ветка codex/repository-structure-followup исправляет оставшиеся инструкции до merge: README/DEPLOYMENT теперь используют main, CONTRIBUTING/CLEAN_INSTALL и PROJECT_STATUS отражают опубликованный срез. Каталоги сценариев и ADR содержат прямые ссылки; PROJECT_STATUS_TEMPLATE описывает текущий checkpoint без устаревшего списка NOT STARTED. Заголовок CHANGELOG перенесён в начало.

Проверки этого документационного блока: Git diff и staged hygiene по исходникам/файловым ссылкам/JSON/ограниченным сигнатурам секретов; точный результат и следующий шаг — [PROJECT_STATUS](../PROJECT_STATUS.md). Backend/frontend/build/E2E локально заново не запускались: исполняемые файлы, зависимости и CI workflow не менялись. Прежние runtime результаты ниже сохранены как исторические evidence.

Дальнейшие удаления или массовые переносы не обоснованы: исходники, миграции, fixtures, audit evidence, первичные документы и закреплённые сторонние лицензии имеют назначение. Repository settings, старые ветки, история, рабочие deployment/DB/storage не изменялись.

## Исходное состояние

GitHub main aefb72f (контракт0.13), feature f5c6387 (0.18), локальный HEAD b156086 (0.19) плюс полный рабочий source0.34. Сохранены620файлов:401tracked/219новых и101изменённый tracked. Snapshot/manifest остались приватно; после работ SHA всех620файлов первоначального checkout совпали.

PR включает ранее неопубликованный продуктовый срез (Social Monitor/SQ fixes) и cleanup. Сравнение с main содержит эти продуктовые изменения; непосредственно cleanup бизнес-код/API/миграции/DTO/UI components относительно сохранённого снимка не менял.

## Итоговая структура и решения

backend/frontend/contracts/scripts/data/.github сохранены. Нужные root Compose/configs остаются на месте. docs/README индексирует developer/API/architecture/deployment/operations guides; docs/reference хранит источники с SHA; docs/archive — полные прежние README/статус/архитектуру/deployment-журнал. Миграции, fixtures, synthetic evaluation evidence, OpenAPI и UI Skill/лицензии сохранены.

Исходные DOCX/PDF moved с неизменными bytes/SHA. Текст нового ТЗ сохранён точно с CRLF; узкий -text/-whitespace исключает его и raw diagnostic logs из нормализации. README сокращён примерно с518до105строк, статус — с4257до короткого checkpoint. REMOVE исходных файлов нет; неоднозначный screenshot duplicate остаётся REVIEW. Полный исходный реестр — [REPOSITORY_AUDIT](REPOSITORY_AUDIT.md).

Новых runtime dependencies, архитектурных слоёв, framework или проектной лицензии нет. EditorConfig/PR/issue templates/SECURITY и документация добавлены. Значимое новое архитектурное решение не принималось; существующие ADR сохранены.

## Docker и CI

Кэши/логи/build outputs исключены из contexts; разделённые local/dev/public/HTTPS/prebuilt overlays сохранены. E2E/OCR требуют явный disposable loopback/opt-in и отдельный порт; это не заменяет изоляцию БД/storage оператором.

Существующий Staged hygiene читает именно Git index blobs: regression ловит secret, даже если рабочая копия уже отредактирована. CI дополнен repository job (versioned links/JSON/private paths/narrow signatures/Compose), Ruff охватывает scripts целиком. Markdown-only changes теперь проверяются. Concurrency отменяет устаревшие runs. Новых внешних сервисов нет.

## Проверки

| Проверка | Фактический результат |
|---|---|
| Python tool tests | PASS:103tests,102PASS/1SKIP; ожидаемое ru-01 ValueError относится к negative test |
| Backend Ruff/format | PASS:144files |
| Scripts Ruff/format | PASS:27files |
| Frontend lint/typecheck/format | PASS |
| Node tests | PASS:20 |
| npm audit | PASS:0vulnerabilities на момент запуска |
| Hygiene/JSON/versioned links/narrow secret scan | PASS; все UTF-8 source files, включая key/PowerShell; не полный historic audit |
| Compose config | PASS:base/dev/public/HTTPS+prebuilt с подставными environment, без раскрытия .env |
| Docker build | PASS:api/worker/frontend, настоящий Next production build; cache использовался |
| Новый isolated DB/storage install | PASS:base-only3093; migrations/bootstrap/health/API/UI/worker |
| Linux full pytest | PASS:1252tests,335.46s,0FAIL/0SKIP |
| Alembic | PASS:upgrade на новой БД,16migrations/одинhead ef90fc78b461; check без drift |
| Свежий remote GitHub clone | PASS:clone a49a9d7→ff982705c, npm ci, build, новая DB/storage3090, actual RU/KZ OCR |
| Fresh full browser | PASS:311PASS/6SKIP/0FAIL,409.88s,workers1/retries0 |
| CSV→human review→signal/PDF | PASS:отдельные решения, R2/25, UNKNOWN R1, historical snapshot и downloaded bytes |
| Downloaded PDF | PASS:offline verifier,3pages/24230bytes; все страницы визуально просмотрены |
| Restart persistence | PASS:повторный login, прежние snapshot/decisions и PDF SHA совпали |
| QA backup/restore | PASS:37tables/60assets,162audit rows,4signals,2архивных PDF; authenticated downloads/SHA |
| Source integrity | PASS:620исходных файлов в первоначальном checkout сохранили SHA; reference Git blobs/fresh clone SHA совпадают |
| diff --check / staged hygiene | PASS перед публикацией |
| GitHub CI | PASS всех4jobs на982705c: [run39482577231](https://github.com/temirkhanerbolatovich-coder/saq-qurylys/actions/runs/39482577231). Последующие runtime paths не менялись; статус последнего SHA — [Checks PR5](https://github.com/temirkhanerbolatovich-coder/saq-qurylys/pull/5/checks); локальные результаты выше не подменяют CI |
| Новый Linux VPS/HTTPS/production deploy | NOT_RUN:изменение реального deployment исключено заданием; инструкции проверены по коду/isolated containers |

6browser SKIP:2typography A/B,2V2 external fixture,1manual two-analyst dedicated fixture,1network measurement. Эти специальные пути не выдаются за покрытые этим прогоном.

PDF SHA:a36e4a46ae5114c4691d94593397bcc76333d72dc9fdafa734bc8e9c84038464.
DEMO/UNKNOWN/веса/цитата/SHA читаются на всех3страницах; существующий перенос label решения между страницами сохранён. Poppler сообщил предупреждения о supplementary nameToUnicode files из Unicode Windows path, PNG всех страниц созданы и просмотрены.

## Команды и среда проверки

- Python:unittest discover scripts; Ruff backend/app backend/tests backend/alembic; scripts с backend/pyproject.toml; hygiene.
- Frontend:npm ci, lint/typecheck/format:check, node --test scripts/test-*.mjs, audit; build внутри Docker.
- docker compose -p saq-cleanup-20261021 build/up:новые DB/storage,порт3093; verify_ocr при SAQ_ISOLATED_ACCEPTANCE=1.
- Linux pytest в одноразовом api container с contracts/scripts/evaluation fixtures и новым venv, APP_ORIGIN=http://localhost:3000; после него alembic check.
- Fresh clone:project saq-cleanup-fresh-20261021,порт3090, флаги isolated/query-profiles/url-schedules; npx playwright test --reporter=list,json.
- Offline verify_intake_journey и Poppler pdftoppm для реального downloaded PDF.
- QA backup создан только из собственных контейнеров после label/working_dir проверки и остановки собственных writers. Штатный verify_backup использовал network-none disposable DB и restored storage read-only. Private wrappers/evidence не публикуются.

## Диагностированные промежуточные отказы

Первая dev-dependency установка:PyPI ReadTimeout, retry90s прошёл. Первый pytest collection:harness не содержал scripts/evaluate_publications.py; scripts/evaluation fixtures добавлены в одноразовый container, затем единый full1252PASS.

Первый browser на3093:308PASS/2FAIL/7SKIP. Два opt-in tests требовали3090; guards не ослаблялись. Полный повтор на новом clone3090 дал311PASS/6SKIP/0FAIL.

Fresh up:host Docker исчерпал default address pools (32existing networks). Выбран non-overlapping10.203.91.0/24 только в private QA override; чужие networks/daemon не менялись. Поэтому remote fresh run использовал этот override; base-only новый install отдельно прошёл на3093.

## Открытые ограничения и передача

Off-host encrypted backup/retention/monitoring и полная pilot-hardening не настроены этим cleanup. Старые credentials/PR/cache refs по SECRET_CLEANUP остаются OPEN; история не переписывалась. Независимая RU/KZ/OCR/UX/предметная приёмка, второй физический ПК, live social access и принятый REAL-реестр остаются внешними условиями.

Helper backup_local требует Git metadata и своего Compose identity/working_dir; пустая БД без оригинала/аудита не покрывается его HTTP verify. Linux VPS/manual backup shell recipe здесь не исполнялся на реальном сервере.

[Quick Start](../README.md), [deployment](DEPLOYMENT.md), [backup/restore](operations/BACKUP_RESTORE.md), [troubleshooting](TROUBLESHOOTING.md). Тестовые volumes/storage/приватные receipts сохраняются; собственные QA services остановлены после приёмки. Слияние PR №5 завершено; актуальный следующий шаг — в [PROJECT_STATUS](../PROJECT_STATUS.md). Production deployment согласуется отдельно.
