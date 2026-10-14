# SAQ QURYLYS — PROJECT STATUS

Updated: 2026-10-15 (Asia/Qyzylorda). Последний блок: самостоятельные документы и ручные R3/R5/R6.
Branch: main. Текущую ревизию см. `git log -1`; удалённый репозиторий не настроен, push/deploy не выполнялись.
Owner: Codex; реализация и продолжение разрешены пользователем. Общие подтверждения повторно не нужны.

## Текущее состояние

**Реестр, OCR/review, ручные R2–R6 и датированное правовое основание реализованы локально. Полный P0 ещё не завершён.** Приложение: http://localhost:3000. Логин/пароль только в игнорируемом `.local/credentials.txt`, не печатать и не вводить в DOM автотестов. Контейнеры SAQ db/api/worker/frontend оставлены работающими; сторонние контейнеры не использовались.

Рабочий путь: новый текст или PNG/JPEG/TXT → сохранённый оригинал/SHA-256/происхождение → явный анализ → durable PostgreSQL job/worker → Tesseract RU/KZ + правила + RapidFuzz → гипотезы/offsets/bbox → ручная проверка/исправление → точная привязка ЖК → доказательство → отдельное решение R2 → серверный риск/аудит. Ни OCR, ни matching сами не начисляют баллы.

Seed: 8 DEMO-объектов и 12 исходных публикаций; новые browser/OCR/restart DEMO-записи добавлены отдельно, seed их не сбрасывает. Синтетические A/B/C (35/yellow, 70/red, 10/green) сохранены; реальной проверкой они не являются. Browser-сценарии оставляют историю по DEMO Ертіс с итоговыми отклонёнными R2–R6/0; по Самал добавлено evidence без изменения исходного R2/балла.

Целевой контракт: 36 операций, из них 24 полностью доступны, 5 частично, 7 PLANNED. Ручные R2–R6 принимают только соответствующие доказательства; R1 и LEGAL_ABSENCE_REVIEW ещё отклоняются 422. Текущий этап — docs/FEATURE_CONSTRUCTION_REVIEW.md и ADR-004; legal/OCR/R2/R4 описаны в документах предыдущих срезов.

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
| Human review/audit | VERIFIED локально для гипотез/расшифровки/match/R2–R6/valid-rejected основания | Версии, review value, причины/server actor, stale 409, история before/after; R3 source invalidation | Проверка отсутствия основания/R1, сигналы и предметная приёмка |
| Risk R1–R6 | IN PROGRESS | Все веса/зоны и A/B/C; ручные R2–R6, типовые документы, даты/сопоставимость/SHA | Полная процедура отсутствия всех оснований/R1, предметная приёмка |
| Legal basis | IN PROGRESS | Typed создание и valid/rejected review, отдельный документ/evidence, область/дата/период; UNKNOWN не создаёт R1 | Полная проверка отсутствия всех механизмов, внешняя предметная приёмка, PDF |
| Dashboard/registry/review | IN PROGRESS | Реальные API, фильтры, карточки, split original/hypotheses, audit; mobile no overflow | Карта, keyboard/200% zoom, UX с 3–5 людьми |
| Signals/PDF | NOT STARTED | Честно обозначены будущим этапом | Snapshot/decision/revision/PDF/оговорка/шрифты |
| Полный E2E/второй ПК/CI | IN PROGRESS | 149 backend + 14 browser; Docker/модели/build; workflow создан | Полный P0 E2E, другой ПК, реальный GitHub CI, backup/restore, freeze SHA |

## Выполненные проверки

| Проверка | Реальный результат |
|---|---|
| Backend PostgreSQL | `cd backend; ..\.venv\Scripts\python.exe -m pytest -q`: **149 passed**, без warnings. Каждый запуск использует случайную test schema; public не очищался |
| Concurrency/recovery | Две одновременные гипотезы/факторы одной revision дают 200/409; устаревшее ORM-состояние перечитывается после lock; late worker не публикует второй результат |
| API/errors/security | Roles/CSRF/Origin, чужие IDs/DEMO scope, точный фрагмент, idempotency, invalid/truncated/MIME images, streamed body limit, unavailable/timeout OCR с сохранением оригинала |
| OpenAPI | Валидатор документа и schemas реальных job/extraction/match/evidence/risk/legal/audit responses |
| Миграции | Исходная + `996510abee9b` + `c4f1a903b812`; Alembic check: No new upgrade operations detected |
| Backend quality | Ruff check/format, pip check — без ошибок |
| Frontend | Docker production build, typecheck, lint, format:check; npm audit ранее дал **0 vulnerabilities**, в блоке R3/R5/R6 повторно не запускался |
| Browser Docker | **14 passed**: прежние сценарии, R3/R5/R6 pending/confirm/reject, частичный сбой/retry, 80.1–60.1 = 20 п.п., задержанная загрузка R2, реальный KZ OCR и mobile без overflow |
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
- Текущий риск, уникальный фактор property/code; исторический as_of чтения пока возвращает 400. Дата оценки R3/R5/R6 сохранена отдельно от серверного reviewed_at. Ручной R1 пока отклоняется.
- Один календарный день R3 и строгие дата/ключ/методика R5 — консервативная политика MVP, а не правовая норма. Разные SHA не доказывают подлинность/независимость; существенность R6 оценивает человек. ADR-004.
- Нет quotas/retention/антивируса, SSO/admin password UI/distributed rate limiting, HA/heartbeat, backup/restore acceptance. Orphan content-hash файл при DB rollback возможен. DB audit не криптографически неизменяемый.
- 30 текстовых регрессий не являются независимым benchmark. Два новых OCR-баннера не заменяют ≥30 image corpus или реальную предметную проверку.
- Proxy ограничивает PNG/JPEG body 10 MiB + 64 KiB overhead. При изменении backend MAX_UPLOAD_BYTES выше этого нужно синхронизировать proxy.
- Diagnostic repr настроек показал локальный DB password: repr секретов отключён, пароль заменён и env/контейнеры обновлены. В Git секреты не добавлялись. Предыдущий риск DOM/trace уже закрыт API-auth автотестами.

## Следующее конкретное действие

Продолжить без повторного общего разрешения: самостоятельная полная проверка отсутствия всех применимых механизмов/R1 и разрешение противоречий с действующими основаниями. Затем snapshots/решения сигналов и PDF. PDF supporting documents и их безопасная обработка остаются отдельной задачей. Collector BLOCKED до появления разрешённого источника; не подменять его ручным вводом.

## Продолжение сессии

Сначала прочитать AGENTS/этот статус/docs среза 02, `git status`, `git log`, текущие файлы/tests. Не сбрасывать public/volume/storage или пользовательские изменения. Все up команды текущего dev окружения — с `-f docker-compose.yml -f docker-compose.dev.yml`, чтобы не потерять порт 55432. Не запускать Docker daemon заново без необходимости и не поднимать сторонние остановленные контейнеры. Перед frontend build останавливать host standalone server, если он есть; Docker UI на 3000 уже работает. Не печатать `.env`/credentials. Не публиковать/не деплоить без явного запроса.

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
