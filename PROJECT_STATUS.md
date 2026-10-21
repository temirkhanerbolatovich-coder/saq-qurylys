# SAQ QURYLYS — текущий статус

## GitHub и структура · 21.10.2026

Исполнитель: Codex; структура и навигация дополнительно проверены независимым read-only reviewer. Пользователь разрешил проверку GitHub и доработку структуры. Исходная ревизия блока — main 24811c2228b66d3e3e863430a98e349b7ceeaee4; документационные исправления — в codex/repository-structure-followup.

Полный исходный срез с контрактом 0.34 опубликован в main: [PR №5](https://github.com/temirkhanerbolatovich-coder/saq-qurylys/pull/5) слит. GitHub API подтвердил default branch main, 644 опубликованных файла и отсутствие открытых PR/issues на начало этого блока. Все четыре jobs main успешны: [CI 39488225449](https://github.com/temirkhanerbolatovich-coder/saq-qurylys/actions/runs/39488225449).

Исправлены инструкции README/DEPLOYMENT/CONTRIBUTING/CLEAN_INSTALL, оставшиеся от состояния до merge. Каталоги docs и ADR дополнены прямыми ссылками, PROJECT_STATUS_TEMPLATE заменён общим шаблоном checkpoint, заголовок CHANGELOG перенесён в начало. REFACTOR_REPORT дополнен датированным результатом проверки GitHub с сохранением прежних evidence. Архитектурных решений или runtime изменений этот блок не вводит.

## Проверки текущего блока

GitHub main/PR/CI/дерево сверены через API. git diff --check, git diff --cached --check и python scripts/check_repository_hygiene.py --staged — PASS для 644 source paths. Дополнительно подтверждены ссылки на все 29 FEATURE и 29 ADR, один основной заголовок каждого изменённого документа и состав diff: только 10 Markdown-файлов. Независимый review не обнаружил actionable дефектов.

Backend/frontend/build/E2E локально заново не запускались: меняется только документация. Состояние CI опубликованной документационной ветки — [GitHub Actions](https://github.com/temirkhanerbolatovich-coder/saq-qurylys/actions?query=branch%3Acodex%2Frepository-structure-followup).

## Сохранённая приёмка полного среза

Repository cleanup: база b156086 плюс 620 файлов сохранённого рабочего снимка. Первоначальный checkout, .env, DB и storage сохранены. Linux backend: 1252 PASS / 0 SKIP; tools: 102 PASS / 1 SKIP; Node: 20 PASS. Ruff/lint/type/format/build/hygiene/Compose прошли. Fresh GitHub clone с новыми DB/storage: настоящий RU/KZ OCR, полный browser 311 PASS / 6 SKIP / 0 FAIL.

CSV → отдельные решения → R2/25 → архивный PDF проверен; все три страницы просмотрены. Snapshot, решения и PDF SHA сохранились после restart. QA backup/restore: 37 таблиц / 60 assets; authenticated historical downloads прошли. Это результаты предыдущего блока, а не новый runtime прогон. Точные команды, промежуточные отказы, пропуски и QA subnet override — [REFACTOR_REPORT](docs/REFACTOR_REPORT.md).

## Границы и следующий шаг

Контракт 0.34, 16 миграций / head ef90fc78b461; Social Monitor V2 и SQ-01—SQ-15 входят в опубликованный продуктовый срез. Рабочие deployment/DB/storage, настройки GitHub, история и старые ветки этим блоком не менялись. Оснований для массовых переносов или удаления исходников/evidence не найдено.

Следующее действие: review документационного PR codex/repository-structure-followup после CI; merge согласуется отдельно. Deployment требует отдельного разрешения с backup/проверкой схемы. Открыты live social access, принятый REAL-реестр, независимая RU/KZ/OCR/UX/предметная приёмка, второй физический ПК, off-host backup/monitoring и историческая credential rotation.

## История и документы

[Полная прежняя история](docs/archive/PROJECT_STATUS_2026-10-20.md), [отчёт cleanup и post-merge проверки](docs/REFACTOR_REPORT.md), [SQ fixes](docs/implementation/SQ_FIX_PROGRESS.md), [чеклист](docs/REMAINING_CHECKLIST.md), [пофайловый аудит](docs/REPOSITORY_AUDIT.md), [документация](docs/README.md). Завершённые длинные журналы сохраняются в archive; текущий checkpoint не дублирует хронологию.
