# SAQ QURYLYS — PROJECT STATUS

Updated: 2026-10-15 (Asia/Qyzylorda). Текущий блок: сигналы, неизменяемые snapshots, решения человека и PDF. Branch main; ревизия — `git log -1`. Исполнитель: Codex. Код и история опубликованы в GitHub, первый CI прошёл; итоговая документация передаётся следующим commit. Deploy не выполнялся.

## Текущее состояние — сигналы

Docker запущен по явному разрешению пользователя. Работают только SAQ db/api/worker/frontend; сторонние проекты, включая AssetGuard, остались остановлены. Данные/volumes сохранены. Полный повтор предыдущего checkpoint 24b5c12: 192 backend passed (133.95s), 15 browser passed (38.2s), логи .local/signals-baseline-*.log. Прежний runtime BLOCKED закрыт этими проверками.

Реализованы /signals: immutable snapshot объекта, оснований, факторов, evidence и SHA-256 assets; DRAFT → CONFIRMED/RETURNED с причиной/автором/временем; версии без разветвлений; stale/optimistic revision/CSRF/roles/idempotency/audit. Решение автоматически ставит PDF своей ревизии в общую PostgreSQL очередь. Worker использует lease/claim token и revision fencing. PDF WeasyPrint 70.0: escaped server template, без внешних/file ресурсов, DejaVu RU/KZ, subprocess timeout, immutable content-hash asset. GET не создаёт jobs; failed/corrupt PDF можно явно перегенерировать. Старый draft PDF сохраняется отдельным asset.

Контракт 0.7.0-mvp: 36 операций = 33 implemented + 2 partial + 1 planned. Добавления: SignalSnapshot.assets, Signal.pdf_job_id; migration e87f4d01a921, nullable advertisement targets + signal/decision revision в общей AnalysisJob. Supporting upload без PDF остаётся partial. Отдельный LegalBasis review также partial по контракту: VERIFIED_ABSENT намеренно не выставляется одним документом, составной R1 уже реализован отдельным сценарием. Collector planned/BLOCKED без разрешённого источника. Полный P0 не принят.

## Итоговые проверки текущего блока

| Проверка | Фактический результат 15.10.2026 |
|---|---|
| Полный backend в Linux | Временный Linux test container Compose api, `pytest -q`, отдельная schema, source/contracts подключены read-only, зависимости dev во временном venv с system-site-packages, cache/pyc отключены — **217 passed (124.31s)**, `.local/signals-final-container-pytest.log`; public не сбрасывался |
| Полный browser | Из frontend `npm run test:e2e` — **16 passed (47.2s)**, `.local/signals-final-browser.log`; реальные OCR/БД/review/сигналы/PDF/mobile |
| Focused проверки | Signals 18 passed; host PDF 6 passed / 1 skipped без Pango; focused browser 1 passed. Полный Linux-прогон выше закрывает host render skip |
| Статика | Ruff check и format check — 50 файлов; frontend typecheck/lint/format check passed |
| Миграции/зависимости | `alembic check`: новых upgrade operations нет; `pip check`: ошибок нет; `npm audit --audit-level=high`: 0 vulnerabilities |
| PDF | `output/pdf/signal-demo.pdf`, 10 страниц, около 37 KiB; DEMO/RU/KZ текстовые маркеры проверены; визуально просмотрены все 10 страниц на contact sheet, страницы 1 и 9 дополнительно в полном размере, читаемо/без перекрытий |
| Перед публикацией | Проверены 413 текущих/исторических Git blobs на известные secrets и явные credential patterns: 0 находок; это не полный security audit |
| GitHub/CI | Создан публичный [saq-qurylys](https://github.com/temirkhanerbolatovich-coder/saq-qurylys); `main` отправлена, локальный/удалённый SHA `dc595e24d9dc249448289b15948a590691abcbac` совпали. Первый [CI](https://github.com/temirkhanerbolatovich-coder/saq-qurylys/actions/runs/38696142426) завершён **success**: backend и frontend. CI не включает browser E2E, их 16 passed получены локально. Workflow содержит PDF runtime dependencies и read-only permissions |

Основные файлы: backend/app/{signals,signal_dto,signal_pdf,pdf_render}.py, backend/app/api/{signals,signal_pdf}.py, модели/worker/jobs/settings, миграция e87f4d01a921, backend/tests/test_{signals,signal_pdf}.py, frontend/components/signals-workspace.tsx и frontend/tests/signals.spec.ts, контракт/env/Dockerfile/CI. Документация: [FEATURE_SIGNALS](docs/FEATURE_SIGNALS.md), [ADR-006](docs/decisions/ADR-006-immutable-signals-pdf.md), README/ARCHITECTURE/PLAN и [оставшийся чеклист](docs/REMAINING_CHECKLIST.md). Исходные PDF/DOCX/TZ не менялись; новые зависимости закреплены.

## Текущий P0 checklist

| Блок | Статус | Оставшаяся граница |
|---|---|---|
| Локальный реестр, DEMO 8/12, оригиналы, ручной ввод | VERIFIED локально | Другой ПК и предметная приёмка отдельно |
| OCR/гипотезы/matching/ручные R1–R6/риск/аудит | VERIFIED на текущих тестах | Независимый RU/KZ corpus и precision/recall/top-3, правовая валидация с предметным специалистом |
| Правовое основание и составной R1 | VERIFIED локально | PDF supporting document ещё не принимается; статус одного основания не заменяет составной R1 |
| Сигналы/версии/решения/PDF | VERIFIED локально | Retention, нагрузка, backup/restore и эксплуатационная приёмка отдельно |
| Supporting PDF upload | OPEN | Безопасный приём/хранение/просмотр PDF и тесты hostile/oversize файлов |
| Карта | OPEN | Координаты/тайлы/фильтры, fallback на реестр, keyboard/mobile/zoom |
| Collector | BLOCKED | Нет разрешённого домена/URL; нужны разрешение, SSRF/redirect/limits и реальный импорт |
| Полная приёмка/публикация | IN PROGRESS | Push/реальный CI, второй ПК, backup/restore, UX 3–5 людьми, защита и сдаваемый SHA |

## Следующее конкретное действие

Завершить разрешённый push в созданный GitHub-репозиторий и проверить первый CI по точному SHA. Следующий продуктовый блок — безопасная загрузка supporting PDF; карта и независимые OCR/эксплуатационные проверки могут выполняться независимо. Collector остаётся BLOCKED до разрешённого источника. Полный список условий закрытия — [REMAINING_CHECKLIST](docs/REMAINING_CHECKLIST.md). Публикация кода не означает deploy, сдачу кейса или юридическую приёмку.

## История сессий

15.10.2026: после разрешения пользователя восстановлен Docker, проверен R1 baseline 192/15; реализованы сигналы/PDF и проведены итоговые 217/16, source checks и PDF QA. Работают только SAQ-контейнеры, сторонние остановленные проекты не запускались. Пользователь отдельно разрешил создать GitHub-репозиторий и выполнить push; репозиторий создан, завершение публикации фиксируется следующим обновлением статуса.

<details>
<summary>Предыдущие checkpoints: история до реализации сигналов (прежние BLOCKED и будущие этапы не описывают текущий статус)</summary>

## Исторический checkpoint R1 (состояние до текущего блока)

### Статус R1

Updated: 2026-10-15 (Asia/Qyzylorda). Последний блок: датированная проверка всех механизмов/R1 и временная согласованность R1/R2. Финальная полная runtime-проверка BLOCKED.
Branch: main. Текущую ревизию см. `git log -1`; удалённый репозиторий не настроен, push/deploy не выполнялись.
Owner: Codex; реализация и продолжение разрешены пользователем. Общие подтверждения повторно не нужны.

## Текущее состояние

**Реестр, OCR/review, ручные R1–R6 и датированное правовое основание реализованы локально. Полный P0 ещё не завершён.** Адрес приложения при работающем runtime: http://localhost:3000. На момент финального checkpoint Docker daemon недоступен, localhost:3000 не отвечает; контейнеры/volumes/public не сбрасывались, daemon и сторонние контейнеры повторно не запускались. Логин/пароль только в игнорируемом `.local/credentials.txt`, не печатать и не вводить в DOM автотестов.

Рабочий путь: новый текст или PNG/JPEG/TXT → сохранённый оригинал/SHA-256/происхождение → явный анализ → durable PostgreSQL job/worker → Tesseract RU/KZ + правила + RapidFuzz → гипотезы/offsets/bbox → ручная проверка/исправление → точная привязка ЖК → доказательство → отдельное решение R2 → серверный риск/аудит. Ни OCR, ни matching сами не начисляют баллы.

Seed: 8 DEMO-объектов и 12 исходных публикаций; новые browser/OCR/restart DEMO-записи добавлены отдельно, seed их не сбрасывает. Синтетические A/B/C (35/yellow, 70/red, 10/green) сохранены предыдущими проверками; реальной проверкой они не являются. Успешные browser-сценарии до финального guard оставили историю по DEMO Ертіс с итоговыми отклонёнными R1–R6/0; по Самал добавлено evidence без изменения исходного R2/балла. Последняя попытка browser-прогона не дошла до входа из-за недоступного runtime.

Целевой контракт 0.6.0-mvp: **36 операций = 27 полностью реализованы + 2 частично + 7 PLANNED**, проверено по implementation metadata. Частичны supporting upload без PDF и review отдельного LegalBasis без VERIFIED_ABSENT; составной R1 проходит отдельный LEGAL_ABSENCE_REVIEW. Текущий блок — docs/FEATURE_LEGAL_ABSENCE.md и ADR-005. Новый R1 хранит точный absence_as_of и не устанавливает бессрочный текущий VERIFIED_ABSENT; PropertyOut.legal_absence_as_of показывает дату отдельно. Совместное CONFIRMED R1/R2 допускается только при известной published_at проверенной оплаты, точно совпадающей с моментом отсутствия; guard действует в обоих порядках под property lock.

## P0 checklist

| Блок | Статус | Проверено / файлы | Осталось |
|---|---|---|---|
| Architecture/API | IN PROGRESS | 36 целевых операций с честным implementation status; OpenAPI и live schema tests | Реализовать оставшиеся операции и весь объём частичных сценариев |
| Seed 8/12 | VERIFIED | Аддитивный seed; A/B/C из БД, источники и DEMO | Не выдавать за реальную проверку |
| Новый материал/происхождение | VERIFIED для текста/PNG/JPEG/TXT | Байт-в-байт оригинал, SHA-256, время сервера, nullable published_at, idempotency | Разрешённый collector отдельно |
| Один permitted collector | BLOCKED | Пользователь ответил: разрешённого сайта пока нет | Домен/URL, условия и реальный допустимый импорт; manual не закрывает пункт |
| PostgreSQL jobs/worker | VERIFIED локально | SKIP LOCKED, lease/claim token, ограниченные попытки, fencing, queued job пережил замену API/worker | Нет heartbeat/HA/нагрузочной приёмки |
| OCR RU/KZ | VERIFIED на двух новых синтетических баннерах | Tesseract 5.3.0 + rus/kaz/eng, реальные bbox, originals SHA; scripts/verify_ocr.py | Независимый image corpus ≥30, сложные/нечитаемые изображения и метрики |
| Extraction/matching | IN PROGRESS | Правила/30 text cases, generic RapidFuzz candidates, ручной выбор | Независимые precision/recall/top-3; качество на реальных материалах |
| Human review/audit | IN PROGRESS: реализация R1–R6 доступна, финальный runtime BLOCKED | Версии, review value, причины/server actor, stale 409, before/after, R3 invalidation; R1 проверка трёх механизмов и двусторонних конфликтов | Повтор полного прогона после восстановления Docker, сигналы и предметная приёмка |
| Risk R1–R6 | IN PROGRESS | Все веса/зоны и A/B/C; ручные R1–R6; exact-instant guard R1/R2 проверен focused-тестами | Финальный полный regression, предметная приёмка и snapshots |
| Legal basis | IN PROGRESS | Typed valid/rejected review и самостоятельный R1; источник/дата/период; применимые VERIFIED_VALID/PENDING блокируют R1 | Финальная runtime-проверка, внешняя предметная приёмка, PDF |
| Dashboard/registry/review | IN PROGRESS | Реальные API, фильтры, карточки, split original/hypotheses, audit; mobile no overflow | Карта, keyboard/200% zoom, UX с 3–5 людьми |
| Signals/PDF | NOT STARTED | Честно обозначены будущим этапом | Snapshot/decision/revision/PDF/оговорка/шрифты |
| Полный E2E/второй ПК/CI | BLOCKED для финального runtime-прогона | До финального guard: 184 backend/15 browser; после: 42 focused + 1 legacy отдельно; source checks выполнены | Повтор 192 backend/15 browser после восстановления Docker; полный P0, другой ПК, GitHub CI, backup/restore, freeze SHA |

## Выполненные проверки

| Проверка | Реальный результат |
|---|---|
| Backend PostgreSQL | До финального joint-date guard: **184 passed**. После guard: **42 focused passed** (45.74s), затем отдельный root legacy case **1 passed / 42 deselected**. Итог полного запуска 192 был потерян при смене задач и не считается подтверждённым. Повторный `pytest -q` с `.local/r1-final-pytest.log` остановлен без итогов при недоступном Docker/PG; **BLOCKED**. `--collect-only -q`: **192 tests collected**, это не успешный прогон. Fixture использует случайную schema, public не очищался |
| Concurrency/recovery | Две одновременные гипотезы/факторы одной revision дают 200/409; устаревшее ORM-состояние перечитывается после lock; late worker не публикует второй результат |
| API/errors/security | Roles/CSRF/Origin, чужие IDs/DEMO scope, точный фрагмент, idempotency, invalid/truncated/MIME images, streamed body limit, unavailable/timeout OCR с сохранением оригинала |
| OpenAPI | Валидатор документа и schemas реальных job/extraction/match/evidence/risk/legal/audit responses |
| Миграции | Исходная + `996510abee9b` + `c4f1a903b812`; Alembic check: No new upgrade operations detected |
| Backend quality | Ruff check/format (41 source/test files), pip check и Alembic — без ошибок до смены runtime. Новые финальные попытки не подменяют эти source результаты |
| Frontend | Production build, typecheck, lint, format:check прошли до смены runtime; npm audit ранее дал **0 vulnerabilities**, в блоке R1 повторно не запускался |
| Browser Docker | До финального joint-date guard **15 passed**, включая R1, прежние R2–R6/OCR/mobile сценарии. Финальный запуск после guard с `.local/r1-final-browser.log`: **15 failed из-за ECONNREFUSED localhost:3000**, Docker engine pipe отсутствует. Это инфраструктурный **BLOCKED**, не подтверждение regression продукта и не финальный passed |
| OCR smoke | Новый RU и KZ PNG вне seed: по 2 payment clauses/PENDING с bbox, original SHA идентичен; output/qa/ocr-verification.json |
| OCR observations | CER RU 0.0541 / KZ 0.1026 на **двух чистых синтетических баннерах**, без заявления production accuracy. Потеря казахской диакритики явно показана |
| Actual queue restart | Worker остановлен, новый PNG job сохранён QUEUED; API/worker пересозданы из новой сборки; SUCCEEDED, ровно одна версия, original SHA сохранён. `.local/queue-restart-check.json` |
| Visual QA | Просмотрены review-ocr.png / review-r2.png; источники, статус, предупреждение и действия читаемы |
| Retained state | Существующие public данные/исходные документы сохранены; credentials и runtime artifacts игнорируются Git |

Системные OCR-пакеты фактически установлены в Docker: tesseract 5.3.0-2, rus/kaz/eng 1:4.1.0-2. Apt packages не pinned по digest; Python/JS lock-файлы закреплены. GitHub CI не выполнялся: remote отсутствует. OCR failure/fencing unit-тесты используют управляемую замену распознавания; реальные RU/KZ задания проверены отдельно.

## Решения и ограничения

- PostgreSQL queue и worker из одной backend-сборки, без Redis/Celery: достаточно для объёма MVP; ADR-002.
- Raw OCR и оригинал не перезаписываются. Исправление расшифровки — дочерняя версия; review — отдельное значение и аудит.
- Изменение используемой гипотезы снимает зависимый CONFIRMED R2; исправление расшифровки или привязки снимает зависимые R2/R3 в PENDING. Новый автоматический анализ сам не меняет уже проверенные факторы.
- Текущий риск, уникальный фактор property/code; исторический as_of чтения пока возвращает 400. Дата оценки R1/R3/R5/R6 отделена от reviewed_at. Новый R1 требует точного совпадения as_of с absence_as_of документа, а совместная пара R1/R2 — с известной published_at хотя бы одного проверенного источника оплаты. Неизвестная дата не заменяется captured_at. Формула/веса сохранены; это консервативная контекстная проверка до подтверждения, не historical replay.
- R1 сохраняет проверку трёх проектных механизмов и причины каждого результата; UNKNOWN/NOT_FOUND/UNAVAILABLE не доказывают отсутствие. Применимые VERIFIED_VALID/PENDING документы блокируют создание/подтверждение R1; обратное подтверждение основания при CONFIRMED R1 той же области/даты даёт 409. Новый R1 не создаёт sticky VERIFIED_ABSENT; legal_absence_as_of показывает историческую дату отдельно. Legacy DEMO-агрегат снимается при явном пересмотре старого R1. Подлинность/полнота/правовая достаточность остаются предметом человека; ADR-005.
- Один календарный день R3 и строгие дата/ключ/методика R5 — консервативная политика MVP, а не правовая норма. Разные SHA не доказывают подлинность/независимость; существенность R6 оценивает человек. ADR-004.
- Нет quotas/retention/антивируса, SSO/admin password UI/distributed rate limiting, HA/heartbeat, backup/restore acceptance. Orphan content-hash файл при DB rollback возможен. DB audit не криптографически неизменяемый.
- 30 текстовых регрессий не являются независимым benchmark. Два новых OCR-баннера не заменяют ≥30 image corpus или реальную предметную проверку.
- Proxy ограничивает PNG/JPEG body 10 MiB + 64 KiB overhead. При изменении backend MAX_UPLOAD_BYTES выше этого нужно синхронизировать proxy.
- Diagnostic repr настроек показал локальный DB password: repr секретов отключён, пароль заменён и env/контейнеры обновлены. В Git секреты не добавлялись. Предыдущий риск DOM/trace уже закрыт API-auth автотестами.

## Следующее конкретное действие

Сначала после восстановления Docker пользователем: проверить SAQ runtime, не поднимая посторонние сервисы, повторить `pytest -q` (192 collected) в случайной test schema и `npm run test:e2e` (15 tests) с сохранением итоговых логов. Полный final regression R1 сейчас BLOCKED; не объявлять его завершённым по старым 184/15 или сумме focused-тестов. После успешного checkpoint следующий продуктовый блок — snapshots/решения сигналов и PDF. PDF supporting documents и их безопасная обработка остаются отдельной задачей. Collector BLOCKED до разрешённого источника.

## Продолжение сессии

Сначала прочитать AGENTS/этот статус/docs среза 02 и R1, `git status`, `git log`, текущие файлы/tests. Не сбрасывать public/volume/storage или пользовательские изменения. Все up команды dev окружения — с `-f docker-compose.yml -f docker-compose.dev.yml`, чтобы не потерять порт 55432. На этом checkpoint daemon недоступен; его запуск оставлен пользователю, сторонние остановленные контейнеры не поднимать. Не делать новую сборку ради перезапуска уже собранного runtime. Перед frontend build останавливать host standalone server, если он есть. Не печатать `.env`/credentials. Не публиковать/не деплоить без явного запроса.

История: 05dbbfc — первый срез, 2ecc6ba — его checkpoint; текущий OCR/review commit см. git log. Исходные PDF/DOCX/CODEX_TZ/шаблон статуса не изменены. Публикация в GitHub, внешний deploy, отправка материалов и юридическая приёмка не выполнялись.

## Быстрые задачи после 9ab92bf · 14.10.2026

Закрыто: UTF-8 TXT upload до 100000 символов через существующую файловую форму; сохраняются исходные BOM/CRLF/байты и SHA, правила выполняются без OCR. Проверяются кодировка, пустой текст, бинарные controls, размер и MIME. UNKNOWN стадия теперь «Не проверена»; R4/R5/R6 имеют собственные подписи. Новых зависимостей/миграций/архитектурных решений нет.

Проверки этой задачи: **78 backend passed**, **8 browser passed** на обновлённом Docker-приложении; Ruff check/format, frontend lint/typecheck/format:check; Docker build/up (включает production Next build), git diff --check. Browser-проверка UNKNOWN/R5 использует подмену ответа только для представления, не изменяет решения БД. Npm audit и второй ПК в этой короткой задаче повторно не запускались. README/контракт/changelog и срез 02 обновлены. Следующая крупная задача и блокер collector прежние. Пользователь попросил ограничиться быстрыми задачами из-за остатка лимита.

## Коллективное обращение / R4 · 15.10.2026

Закрыт самостоятельный путь: analyst upload документа TXT/PNG/JPEG → неизменяемый source_details (ЖК/дата/источник/методология/число заявителей) → COLLECTIVE_APPEAL evidence → PENDING R4/0 → отдельное CONFIRMED +15 либо REJECTED 0, с revision/аудитом. Подлинность/полномочия заявителей — предмет ручной проверки, не OCR-вердикт. PDF и остальные виды документов пока не поддерживаются. Ни загрузка, ни количество заявителей сами не подтверждают риск.

Аддитивная миграция c4f1a903b812 добавляет nullable assets.source_details, старые исходники не меняет. Контракт: 36 операций, 22 полностью, 4 частично (asset upload/R2/R4), 10 PLANNED. Ранее указанный PARTIAL_R2 объём расширен, описание первоначального среза историческое.

Проверено: **85 backend passed**, **9 browser passed**, Docker build/up (production Next build), Ruff check/format, frontend lint/typecheck/format, Alembic check (No new upgrade operations detected). Проверки включают чужой ЖК, подмену клиентом source/count, дату в будущем, одного заявителя, пустую методологию, роль viewer, stale 409, загрузку только attachment и полный R4 +15 → 0. Browser оставляет историю R4 по DEMO Ертіс с отклонённым фактором. README/changelog/контракт и docs/FEATURE_COLLECTIVE_APPEAL.md обновлены. Новых пакетов нет, ADR не нужен: сохранены существующие SQL/JSON/idempotency/actor patterns. Внешний CI, security audit зависимостей и другой ПК в этой задаче не выполнялись.

Следующая задача: PDF supporting documents и typed legal basis review; затем R1/R3/R5/R6 guards. Сигналы/PDF-экспорт/карта/collector открыты; collector по-прежнему без разрешённого источника. Большие блоки в текущий короткий бюджет не включены.

## Правовое основание и применимость · 15.10.2026

Закрыт следующий связный сценарий: документ LEGAL_BASIS с immutable source → PENDING LegalBasis + LEGAL_DOCUMENT evidence → отдельная VERIFIED_VALID/REJECTED проверка на дату → актуальная применимость/фильтр/аудит. Три механизма из проектной модели; конкретный ЖК/очередь без наследования. Новые подтверждения требуют номера/даты/начала периода, собственного evidence и сохранённого оригинала с верным SHA. Риск при создании/проверке не начисляется, отклонение и истечение не подтверждают отсутствие основания. VERIFIED_ABSENT и ручной R1 пока 422. Противоречие с CONFIRMED R1 того же периода/ЖК блокируется 409; автоматического снятия R1 нет.

AssetUpload теперь принимает purpose=LEGAL_BASIS или default COLLECTIVE_APPEAL. Для обращения по-прежнему нужны ≥2 заявителя; для основания count запрещён. Старые обращения без purpose поддерживаются. Файлы TXT/PNG/JPEG, PDF пока не добавлен. LegalBasis.evidence_ids/verification_as_of — явные контрактные добавления. Существующие JSON-таблицы используются без новой миграции. Новый текущий контракт: **36 операций = 24 полностью доступны + 5 частично + 7 PLANNED**.

Текущий legal status объекта вычисляется из подтверждённых документов/периодов при чтении; фильтр и dashboard используют тот же результат. Истёкший документ не оставляет действующий VERIFIED_VALID без cron. Синтетическая seed-гарантия без периода/явные seed-статусы сохранены как legacy; это не новая правовая приёмка. Подлинность/отзыв во внешнем реестре автоматически не проверяются. Read-time вычисление сейчас использует дополнительные запросы на объект, допустимо для 8 DEMO; batch оптимизация перед большим реестром. ADR-003 фиксирует этот выбор.

Проверено: **105 backend passed** на отдельной PostgreSQL schema, **10 browser passed** на Docker до последнего уточнения текста/сворачивания новой формы; изменённый legal browser-сценарий проверен отдельно после обновления сборки. Backend regression включает periods/expiry/multiple docs, 3 mechanisms, role/DEMO/чужой документ, idempotency, wrong period/type/company, missing original и границу суток UTC/Asia-Qyzylorda, conflict R1 и concurrent review 200/409. Legal workflow: PENDING → valid → reload → reject, неизменный риск/R1 отсутствует, audit и mobile no overflow. Ruff check/format, frontend lint/typecheck/format, Docker build/up (Next production build), OpenAPI/live DTO, Alembic check и pip check прошли. Внешний CI, второй ПК, актуальная юридическая экспертиза и dependency security audit в этом этапе не проводились.

README/архитектура/план/changelog/контракт обновлены; новая документация docs/FEATURE_LEGAL_BASIS.md и docs/decisions/ADR-003-dated-legal-applicability.md. Визуально просмотрен output/qa/legal-basis-review.png. Автотесты оставляют дополнительные DEMO-карточки/историю оснований по DEMO Алтай, итог — документы отклонены; seed A/B/C не сбрасывался.

Следующий блок: PDF supporting documents и безопасная обработка, либо самостоятельные typed evidence/guards R3/R5/R6; затем полноценная проверка отсутствия механизмов/R1 и разрешение противоречий. Сигналы со snapshots/решением/PDF, карта, разрешённый collector, большой независимый OCR corpus, backup/restore и GitHub CI ещё открыты. Collector BLOCKED: пользователь не предоставил разрешённый источник. Никаких push/deploy/внешних сообщений не выполнялось.

## Документы строительства и R3/R5/R6 · 15.10.2026

Завершён связный блок: upload самостоятельного TXT/PNG/JPEG с purpose и типовыми датированными фактами → неизменяемый source snapshot → evidence → PENDING фактор/0 → отдельное подтверждение/отклонение → серверный балл/ревизия/аудит. R3 требует известной даты рекламы, проверенной привязки версии и отдельного UNDER_CONSTRUCTION документа; один и тот же оригинал нельзя использовать дважды. R5 требует DECLARED/VERIFIED с разными SHA, общей областью/методикой/календарным днём и абсолютной разницей ≥20 п.п. R6 сохраняет плановый срок, состояние и при необходимости фактическую сдачу; существенность обосновывает аналитик. Порог дней не придуман. Date-only сравнения — Asia/Qyzylorda. Один день R3 и строгое сравнение R5 явно обозначены как консервативные продуктовые ограничения MVP (ADR-004), без заявления правовой достаточности.

Дата оценки as_of отделена от серверного reviewed_at. Изменение привязки/расшифровки снимает зависимый CONFIRMED R3 в PENDING. Сервер копирует факты из исходного документа, проверяет доступность/SHA/дату/область/DEMO; поля стройки нельзя подставить в R2 или обращение. Новых таблиц/миграций/зависимостей нет. Контракт 0.5.0-mvp по-прежнему **36 = 24 fully + 5 partial + 7 planned**. Ручной R1 и отсутствие всех правовых механизмов пока 422.

В UI добавлены три формы и показ типовых фактов в evidence. При частичном сбое успешные upload/evidence и idempotency keys повторно используются в памяти текущей страницы. После reload незавершённая форма не восстанавливается; файлы/evidence сохраняются. Общие поля стадии/готовности карточки автоматически не перезаписываются, датированные факты видны в доказательствах. При общей проверке обнаружена и исправлена гонка R2: до успешной загрузки текущего фактора сохранение/решения блокируются, при ошибке доступен retry. Regression удерживает ответ объекта и доказывает отсутствие повторного POST createfactor.

Проверено: **149 backend passed** (`pytest -q`, отдельная PostgreSQL schema, public сохранён), **44 focused construction passed**, **14 browser passed** на новой Docker-сборке. Проверки включают 19.99/20 п.п. и 80.1–60.1, неправильные роли/область/методику/даты/DEMO, одинаковые оригиналы R3/R5, future/unknown публикацию, новую версию без match, invalidation, недоступный оригинал, viewer, idempotency/stale audit. Browser R3 +10→0, R5 +10→0 с искусственным 503 второго evidence и повтором без новых upload, R6 +5→0, реальные OCR и старые workflows; тест R2 ожидания загрузки не меняет seed-фактор Самал. После финального уточнения текста предупреждения о готовности обновлены API/worker, R5 browser workflow повторён отдельно: **1 passed**.

Ruff check/format, frontend lint/typecheck/format:check, Docker build/up (Next production build), Alembic check (No new upgrade operations detected), pip check, OpenAPI/live DTO и git diff --check пройдены. Скан известных локальных secret values по tracked/new nonignored файлам — без совпадений; это не полноценный security audit. Внешний CI, второй ПК, dependency audit и предметная приёмка в этом этапе не выполнялись. Снимок output/qa/construction-r5.png просмотрен; mobile overflow test прошёл. Сторонний AssetGuard остался остановленным, исходные документы сохранены.

Обновлены README/архитектура/план/changelog/контракт/этот статус; новые docs/FEATURE_CONSTRUCTION_REVIEW.md и docs/decisions/ADR-004-dated-construction-evidence.md. Изменения сохраняются локальным commit, ревизия — `git log -1`; remote отсутствует, push/deploy не выполнялись. Следующее действие: полный самостоятельный сценарий отсутствия всех механизмов/R1 с датой/областью/противоречиями, затем сигналы со snapshots/решением/PDF. PDF supporting documents, карта, независимые OCR метрики/предметная проверка, backup/restore/CI открыты. Collector остаётся BLOCKED без разрешённого источника.

## Датированная проверка всех механизмов / R1 · 15.10.2026

Реализован самостоятельный LEGAL_ABSENCE_REVIEW: upload TXT/PNG/JPEG → immutable source с property/scope/absence_as_of/event_at и результатом/причиной каждого механизма → evidence → PENDING R1/0 → отдельное CONFIRMED/+35 либо REJECTED/0 с revision/аудитом. Проверяются KZHK_GUARANTEE, BANK_WITH_MIO_PERMIT и FRAME_WITH_MIO_PERMIT. Неполные, NOT_FOUND/UNAVAILABLE/UNKNOWN материалы сохраняются, но не подтверждают R1. Требуется ровно одно evidence, охватывающее все три DOCUMENTED_ABSENT, и точное совпадение as_of фактора с absence_as_of документа; ретроспективная дата допустима, дата документа не предшествует ей. Это проектная процедура проверки сохранённых материалов, без автоматической правовой квалификации или внешнего доказательства.

Применимые VERIFIED_VALID/PENDING основания той же очереди и даты блокируют R1; проверяются период и дата выдачи документа. Обратное подтверждение действующего основания при CONFIRMED R1 требует явного разрешения противоречия. Новый R1 не выставляет sticky VERIFIED_ABSENT; legal_absence_as_of показывает историческую дату отдельно. Явный пересмотр legacy R1 снимает старый бессрочный DEMO-агрегат. Подтверждение одного LegalBasis по-прежнему не поддерживает VERIFIED_ABSENT: отклонение отдельного документа не исключает все механизмы.

При проверке нового RED-сценария обнаружено некорректное сочетание отсутствия за 2020 год и рекламы без известной даты, полученной в 2026 году. Исправлен backend guard до подтверждения: R1/R2 могут быть одновременно CONFIRMED только при известной published_at хотя бы одного проверенного источника оплаты, точно совпадающей с instant R1; оба порядка подтверждения защищены property lock. Моменты разных TZ сравниваются как одно событие, разные секунды одного дня не считаются совпадением. Формула/веса не менялись; R2/R3 без R1 продолжают прежний путь. Guard новых решений не является миграционной перепроверкой сохранённых seed-состояний или полным historical replay.

Файлы блока: backend/app/legal_absence.py, backend/app/{analysis_dto,construction,dto,legal,views}.py, backend/app/api/{reviews,legal_bases}.py; backend/tests/test_legal_absence.py; frontend/components/legal-absence-review.tsx и workspace.tsx, frontend/lib/types.ts, frontend/tests/legal-absence.spec.ts; contracts/openapi.yaml; docs/FEATURE_LEGAL_ABSENCE.md и docs/decisions/ADR-005-dated-all-mechanism-absence.md; README/CHANGELOG/ARCHITECTURE/PLAN/FEATURE_LEGAL_BASIS/этот статус. Новых таблиц, миграций и зависимостей нет. Контракт **36 = 27 fully + 2 partial + 7 planned** проверен по metadata.

Проверки разделены по версии, без подмены потерянного результата:

1. До финального joint-date guard корневой агент получил **184 backend passed** и **15 browser passed**; source build/typecheck/lint/format, Ruff (41 files), OpenAPI, Alembic и pip check прошли. Browser R1 проверил неполное UNKNOWN → сохранённый материал/0 → полную проверку → PENDING/0 → +35 → reload → отклонение/0, аудит и mobile. Эти результаты относятся к состоянию до последнего guard.
2. После exact-date guard независимый `pytest tests/test_legal_absence.py -q` дал **42 passed in 45.74s**. Проверены совпадение дат в обоих порядках, эквивалентный UTC instant, unknown/другой год/+1 секунда с 409 и неизменным прежним подтверждением. После последних audit/legacy уточнений корневой агент выполнил отдельный case: **1 passed / 42 deselected**. Итогового прогона всех 43 R1 cases вместе не заявляем.
3. Финальные полные 192/backend и 15/browser были запущены в прежних сессиях без сохранённых логов; после смены задачи polling вернул Unknown process id. Их результат неизвестен и **не записан как passed**.
4. Повтор с сохранением логов в `.local/r1-final-pytest.log` и `.local/r1-final-browser.log` выявил остановленный Docker daemon: отсутствует dockerDesktopLinuxEngine pipe, localhost:3000/PG недоступны. Playwright завершился **15 failed / ECONNREFUSED**, pytest остановлен без итогового результата. Это инфраструктурный **BLOCKED**, а не доказанный regression продукта. `pytest --collect-only -q` сохранил **192 tests collected** в `.local/r1-final-collect.log`; collection не заменяет выполнение. Ручной запуск daemon/посторонних сервисов не выполнялся, public/volumes не удалялись.

Перед локальным сохранением повторены проверки текущего source: `.venv\Scripts\python.exe -m ruff check backend/app backend/tests backend/alembic` — passed; `ruff format --check` — 41 files already formatted; frontend `npm run typecheck`, `npm run lint`, `npm run format:check` — passed. Скан известных локальных secret values по tracked/new nonignored файлам — без совпадений; это ограниченная проверка, не полный security audit. Независимый read-only review и `git diff --check` пройдены. Попытка Ruff через системный Python выявила отсутствие модуля; успешные проверки выполнены проектным `.venv` по README, зависимости не менялись.

Текущий checkpoint оставляет финальную runtime validation неполной. После восстановления Docker пользователем нужно повторить полный `pytest -q` в отдельной schema и `npm run test:e2e` с логами, затем обновить статус фактическими итогами. Исторические результаты выше сохранены как этапы, не переписаны в новую приёмку. Изменения R1 прошли review и сохраняются локальным commit корневым агентом, ревизия — `git log -1`; удалённый remote/push/deploy отсутствуют. Следующий продуктовый блок после проверки — snapshots/решения сигналов/PDF; supporting PDF, collector, карта, независимая предметная/юридическая приёмка и полный P0 остаются открыты.

</details>
