## 21.10.2026 — организация репозитория и воспроизводимость

- Краткий README, тематические developer/API/deployment/backup/troubleshooting guides; история сохранена в docs/archive, первичные источники в docs/reference с SHA.
- Общие guards записывающих E2E/OCR, scripts-wide Ruff и repository/Compose/docs/secret checks в существующем CI.
- Кэши исключены из Docker context, добавлены шаблоны PR/issue, EditorConfig и SECURITY без назначения проекту новой лицензии.
- Полные результаты/ограничения текущей ревизии — docs/REFACTOR_REPORT.md. API/риск/исторические snapshots и рабочие deployment/data не изменены cleanup.

# Changelog

## 2026-10-20 — SQ fixes, этапы3–6 (source/test runtime)

- Исключающие категории факторов, явная ошибка refresh и единый список документов.
- Reviewer provenance в новых snapshots/PDF, actionable DRAFT count и полный bounded source lookup.
- Основные targets44px, меньше мобильных отступов; карта/даты/legalchoices RU/KZ.
- Вторичные досье panels загружаются при первом посещении и сохраняют формы/файлы.
  Initial GET8→4,decoded JSON17834→4217bytes; ускорение latency не подтверждено.
- Контракт0.34.0; история/архивы не переписываются. Проверки — SQ_FIX_PROGRESS.

## 2026-10-20 — SQ fixes, этап2 (source/test runtime)

- Точные ручные платёжные предложения с независимым analyst review и прежними R2 guards.
- Общий bounded PDF GET:90sclient/75sproxy,отмена,различимые timeout/cancel,RU/KZ retry.
- Контракт0.33.0,без миграции/backfill/изменения архивов. Receipts в SQ_FIX_PROGRESS.

## 2026-10-20 — SQ fixes, этапы0–1 (source/test runtime)

- Изолирована незавершённая очередь между backend cases, production FIFO сохранён.
- Новые рекламные evidence различают publication/capture; legacy дата не выдаётся
  за установленную публикацию. Контракт0.32.0,без backfill исторических JSON/PDF.
- Signal UI/новые PDF показывают frozen legal period/review и unknown risk codes;
  нулевой score/GREEN явно не подтверждают безопасность.
- Проверки и ограничения: docs/implementation/SQ_FIX_PROGRESS.md.

## 20.10 · публикация Oracle Micro и ожидание PDF

Создана отдельная бесплатная E2.1.Micro, HTTPS/Caddy, free DNS и приватный перенос
текущих DB/storage с проверкой таблиц/AssetSHA/историческихPDF. Native amd64
images собираются локально и запускаются без build на1GB VM;4GiB swap и rotation
логов. Авторизация/CSRF/роли/риск сохранены, старые copied sessions удалены.
На Micro read-only отчёты требуют больше wall time: добавлены ограниченные
DOCUMENT_PDF_TIMEOUT_SECONDS и PDF_PROXY_TIMEOUT_MS только для GETPDF; defaults
и CPU/address caps прежние. External auth/OCR/PDF и stop/start acceptance PASS;
локальная установка не обновлялась. Ограничения и эксплуатация — ORACLE_DEPLOYMENT.

## 20.10 · интерфейс Parser V2

В мониторинг добавлена вкладка словаря/активации, версий V2 профилей, одного
явного запроса, capture и находок с историей/observations. Импорт точной версии
требует выбора observation, причины и свежего TEXT_ONLY подтверждения; переход
ведёт в существующую проверку. Сохранены legacy links, user/session drafts и
UUID retry. API/DB/dependencies/risk прежние. Исходники/QA, primary не обновлялся;
live доступ/holdout и finding-level review ещё открыты.

## 20.10 · parser V2: находки и явный импорт

Добавлены версионные находки из сохранённых страниц Threads, наблюдения по
run/profile version/query ID, история изменений и явный импорт выбранной версии
в Advertisement NEW. Импорт текста сохраняет Asset/provenance, не запускает
анализ и не подтверждает объект/R1–R6. Профиль V2 явно запускает один сохранённый
keyword-запрос через прежний access/cooldown; disabled не создаёт фиктивные данные.
Добавлены контракт0.31.0, миграция ef90fc78b461 с защитой истории и ADR-026.
UI/live-подключения/публичная установка этим блоком не добавлялись.

## 19.10 · parser V2: словари и версии профилей

Добавлены immutable bytes словаря, явный журнал активации/деактивации с audit,
revision concurrency и idempotency. V2 profile хранит dictionary ID/SHA и готовый
preview/query IDs без перекомпиляции истории. Legacy list/detail по умолчанию1.0;
V2 требует явного фильтра. Добавлены миграция df89eb67a350 с защитой downgrade,
контракт0.30.0, словари в production image и ADR-025. Live сбор не включается.

## 19.10 · parser V2: контекстные гипотезы RU/KZ

Добавлены offline правила географии/отрицаний/платёжного времени/сумм/годов и
раздельных family/phase, объяснимые приоритеты и exact original spans.
Локальный analyze_social_text.py не импортирует материалы и не меняет риск.
246focused tests PASS, включая10входных примеров и существующий extraction.

## 19.10 · parser V2: первый offline-срез

Добавлены строгий загрузчик v1/v2 с сохранением original bytes/SHA и bounded
query preview с provenance/ID/capabilities/причинами пропуска. CLI не обращается
к сети/БД и не активирует источники.47регрессионных проверок; интеграция профилей,
контекстные правила, findings/UI/live приёмка остаются следующими срезами.

## 19.10 · размещение карты на desktop

Правовое пояснение над картой использует доступную ширину рядом с легендой:
удалено узкое ограничение, создававшее лишние строки и смещавшее карту ниже.
Полный текст и мобильная последовательность сохранены. Регрессия каталога
учитывает AN GROUPS и проверяет его ссылку импорта/оговорки. Текущий результат
локальной проверки и граница установки — PROJECT_STATUS.

## 19.10 · первый запуск без DEMO и чистая локальная приёмка

`DEMO_SEED_ENABLED=false` создаёт настроенного аналитика без fixtures/storage,
сохраняя прежние пароль/роль/имя. Native seed получил `--bootstrap-only`;
Compose проверяет строгое true/false. Генератор поддерживает `--port` и
`--no-demo-seed`, отказывается перезаписывать `.env` или credentials и использует
exclusive creation при одновременном запуске. Рецепт чистой приёмки и различие
локального стенда/второго ПК записаны в CLEAN_INSTALL_ACCEPTANCE и PROJECT_STATUS.


## 19.10 · управляемое расписание открытых страниц

Явное включение/выключение точного подключённого URL, durable история со снимком
настройки, межпроцессный бюджет постановок, паузы и остановка после ошибок.
Прежние worker/jobs/lease и человеческие решения сохранены. Контракт0.29,
миграция ce78da56f249; Threads scheduling и parser-v2 не включались.


## 19.10 · подготовка общей URL-очереди (QA)

Существующая постановка URL выделена из route в общую транзакционную функцию
с прежними правилами валидации, лимита и дедупа. Добавлена PostgreSQL проверка
гонки; scheduler остаётся открытым, рабочие images не обновлялись.

## 19.10 · серверные поисковые профили

Общие профили помощника RU/KZ1.0 с append-only снимками параметров/скомпилированных
фраз/SHA и историей по revision. Идемпотентные analyst-команды, защита409 от гонок,
явное применение без поиска. Один JSON для клиента и сервера. Контракт0.28,
миграция bd67c945e138; расписание и parser-v2 не активированы.

## 19.10 · открытая страница AN GROUPS

Явный импорт /payment через существующую очередь: неизменяемые HTML/TEXT,
дедуп по содержимому, корректная provenance без чужой лицензии, строгая проверка
точного пути/query на redirects. В каталоге, форме и карточке RU/KZ показаны
область извлечения и неизвестная дата/ЖК. Исправлена прежняя привязка любого HTML
к Primeminister CC BY. Нет автоматического анализа, привязки или скоринга.

## 19.10 · социальные наблюдения и карта

Добавлены20наблюдений как19материалов/6новыхдосье,14проектных ориентиров с происхождением и SHA. Сохранены ID, решения и UNKNOWN. DEMO-пояснение карты стало условным, уточнена точность RU/KZ. Проверки и открытые11адресов — PROJECT_STATUS.

19.10, Master2.0: новая оболочка/вкладки досье по предоставленным скриншотам,
SVG SAQ, RU/KZ, каталог источников, fact cards и native боковые детали документов
и публикаций. Настраиваемый read-only PDF текущего досье с RU/KZ, обязательными
оговорками, датами/источниками/SHA и отменой скачивания. Сигналы, решения и
серверный риск не переопределяются. Материал импорта ведёт к сохранённой записи
для проверки связи; повторный ввод публикации не предлагается автоматически.
Проверка backup теперь допускает настоящую базу без сигналов и честно сообщает
нулевое покрытие исторических PDF. Точная приёмка и runtime — PROJECT_STATUS.

19.10: исправлена гонка R4 при быстром отклонении после подтверждения: следующая команда ждёт новую revision; при503 доступен явный повтор чтения без потери причины.

19.10, UI/UX-ТЗv2: очередь нерешённых действий при прямом входе /review;
явный processing-режим и совместимость старых deep links. Единые Lucide18px
icon+label на desktop/mobile. Phase-based URL-import fixtures проверяют repeat
GET/late response без изменения корректной production cancellation logic.
Добавлен настоящий DEMO material→candidate→dossier→R2→signal→downloaded PDF маршрут;
Inter проверен A/B и оставлен вне runtime из-за ухудшения плотности.

19.10: исправлена потеря выбранной зоны реестра при быстром переключении на карту;
параметры URL объединяются синхронно, debounce сохраняет Back/Forward. Добавлена
регрессия;23 selected browser PASS. Полная накопленная приёмка остаётся частичной.

## 2026-10-19 · Исправление ошибочной связи кандидата

- Явная отмена только LINKED с причиной, двумя версиями, confirmation и audit;
  дальнейший выбор досье отдельный. CREATED, публикации и предметные решения сохраняются.
- Пагинированная история связей с сохранёнными именами/причинами и читаемыми
  действиями в истории досье. Контракт0.24, ADR-019, без новой миграции.

## 2026-10-19 · Связь кандидата с существующим досье

- Явный выбор объекта и подтверждение идентичности с причиной/двумя версиями.
- CREATED сохраняет источник создания, LINKED допускает несколько находок у досье;
  обратный список с property_id и отдельным счётчиком связанных кандидатов.
- Черновик/selected ID сохраняются, раскрытие не отправляет POST; публикации,
  риск, сигналы и решения инцидентов не переносятся. Контракт0.23/ADR-018.

## 2026-10-19 · Завершение сценария досье

- Поиск дублей использует базовое имя кандидата; отсутствие БИН не создаёт
  ложную DEMO-подпись. Форма использует компактную responsive-сетку.
- Добавлена gated live API/browser регрессия: создание досье сохраняет источники
  и UNKNOWN; привязка публикации требует отдельного решения аналитика.

## 2026-10-19 · Локально: досье из кандидата

- Явное создание PHASE с UNKNOWN стадией/правовым статусом, защитой от повторов
  и точных дублей; источники и причина в аудите, переходы кандидат ↔ досье.
- Черновик формы сохраняется; раскрытие не отправляет команду. Решения о публикации,
  факторах и сигналах независимы. Контракт0.22, миграция d92e6a14f301, ADR-017.

## Unreleased ·19.10.2026 · Material scope and signal queues

- Add server-side is_demo to the material library and processing queue; retain
  scope/search/selection when switching review queues.
- Open bare signal entry on current drafts and expose all/stale presets without
  deleting history; preserve selected snapshot and draft across filters.
- Contract0.21; no new migrations or dependencies. Local changes only.


## Unreleased ·19.10.2026 · Material text search

- Add optional q≤300 to advertisement and review-queue reads: literal
  case-insensitive original text/source-label search before counts/pagination.
- Share compact native search across the library and both review queues;
  preserve URL filters, selected material/version and unsaved reasons.
- Contract0.20; PostgreSQL51 tests and production4 new +27 regression cases
  passed. Live browser/API smoke remains gated; no deployment.


## Unreleased ·19.10.2026 · Monitoring drafts

- Restore comparison input and incident decisions per user, tab and subject;
  keep registry selection per candidate and show a compact restoration notice.
- Preserve explicit retry keys across reload; clear successful drafts and require
  a new choice if the selected publication is unavailable. No API changes.
- Validate 8 new production HTTP-mock browser tests plus19 existing safety and
  composition tests; build, TypeScript, ESLint and Prettier pass. No deployment.


## Unreleased ·19.10.2026 · Readable review tasks and PDF names

- Resolve exact R2 target names in one batch read; preserve historical IDs,
  evidence, commands and drafts. Contract0.19 adds optional display metadata.
- Translate known stage values for reading and retain saved codes separately.
- Name PDF downloads by type, saved context/date/full ID and frozen signal v/r;
  provide safe Unicode/ASCII headers and fallback without changing stored bytes.
- Verify914 Linux backend,37 selected frontend plus3 live integration tests,
  and13 production presentation/parser cases. No publication or push.

## Unreleased ·19.10.2026 · Approved analyst composition

- Move the shared server-ordered3/5 property queue ahead of secondary analytics;
  compact independent action counters and restore deep-green task navigation.
- Use the existing registry table on desktop in both modes; retain full phone
  cards, all reasons/dates/legal context and visible focus after dossier return.
- Put the exact next action first in dossier progress with grouped facts and
  accessible underline tabs; keep editors mounted and drafts intact.
- Add8 isolated presentation scenarios, update existing layout selectors and
  stabilize the synthetic account-switch test.19 production scenarios pass.
- Preserve backend/contracts/risk/roles/snapshots; local only, no deployment.

## Unreleased ·19.10.2026 · Draft safety and precise next actions

- Scope new publication drafts by user/session and clear the unscoped legacy key
  at logout/401; restore input without submitting and explain storage fallback.
- Preserve signal decision reasons per version across navigation/reload/conflict;
  clear only after a successful decision.
- Open the pending document or R1/R3–R6 editor from dossier progress, including
  objects without publications, while preserving roles and separate decisions.
- Add11 presentation regressions and standalone DEMO review mockups for three screens.
- No backend/contract/risk/dependency changes or public deployment.

## Published ·18.10.2026 · Analyst workflow updates

- Publish the accumulated dossier/monitoring tabs, read-only PDF, whole-registry
  search/priority/structure and UI stabilization to the working HTTPS instance.
- Preserve the database/storage, verify a fresh backup by isolated restore, retain
  rollback images, and check44public read-only browser observations plus source/PDF SHA.
- Publish source on codex/audit-workflow-fixes; main remains unmerged.
- Make chooser fixtures independent, await URL reset before reload and scope status
  search assertions to their own property; runtime behavior is unchanged.
- Record the new temporary URL and remaining acceptance boundaries in deployment docs.

## Unreleased · Local UI stabilization and audit reconciliation

- Show the legal-basis limitation next to GREEN property scores without changing risk.
- Collapse mobile global search, retain its draft on Escape, restore keyboard focus,
  and tighten dossier spacing while preserving labels, limitations and touch targets.
- Choose a DEMO registry version by readable label/date/scope with paging and retry;
  retain manual UUID input in details. Selection remains local until reload.
- Debounce registry q/city together for350ms, support Enter and preserve URL/reset/view context.
- Reconcile all20 audit findings and UI requirements; keep partial/external acceptance explicit.
- No backend/contract/dependency changes or public deployment.

## Unreleased · Whole-queue signal search

- Add q to existing listSignals for current/frozen property names, signal ID,
  version and state before pagination; preserve filters, auth and snapshots.
- Submit queue search with Enter/button, restore q in URL, retain selected
  version across search/pages/empty/error, and reuse loading/retry/reset focus.
- Contract0.18.0-mvp; local only, no new route/DTO/migration/dependency.

## Unreleased · Global property work priority

- Extend existing listProperties with order=work_priority before pagination;
  retain default name/ID, filters and unchanged server scores/legal views.
- Read the dashboard's first5 (simple3) from that server order across the full registry;
  remove the client comparator and distinguish list failures from empty results.
- Contract0.17.0-mvp; local only. Existing all-view calculation/SQL scaling remains open.

## Unreleased · Property structure navigation

- Add read-only ancestors, paged children and siblings using saved parent_id relations;
  retain each object's separate risk, legal bases, documents and DEMO label.
- Add compact dossier navigation with registry return context, empty/error/retry and keyboard focus.
- Contract0.16.0-mvp adds getPropertyStructure; cycles/depth are bounded. No seed changes or deployment.

## Unreleased · Registry search and signal property selection

- Extend existing registry/dashboard q search to individual saved aliases, developer name and BIN;
  retain literal escaping, filters, ordering and pagination. Contract0.15.0-mvp.
- Treat blank dashboard search as no query so unlinked materials remain counted.
- Reuse the paged PropertyPicker in signal filters with preserved selection and focus;
  fetch missing property names beyond the initial100 with explicit retry on failure.
- Keep risk, human decisions and historical snapshots unchanged. Local QA only.

## Unreleased · Audit workflow fixes

- Expose registry filters and map in both interface modes; remove the large map introduction.
- Collapse queue controls when reviewing a selected material while preserving drafts and URL context.
- Compact dashboard counters with on-demand explanations and retain all metric definitions.
- Open the actual source/version tool from monitoring shortcuts and return to the candidate after selecting a version.
- Move the analysis action into the material header and distinguish PDF copies from saved signal exports.
- Preserve backend, contracts, risk, roles and snapshots; local only.

## Unreleased · Local tabs and record PDF

- Replace dossier and monitoring section anchors with six/four real URL-backed tabs;
  retain mounted drafts/files, keyboard focus, legacy links and browser history.
- Compact the object header/mobile navigation; search, filter and page saved documents,
  and show related publications/signals in existing server pages.
- Add authenticated bounded read-only PDF downloads for saved records and sources;
  preserve original PDF bytes and frozen signal payloads. Contract0.14.0-mvp.
- Preserve existing risk, authorization, decisions and snapshots. Local only.

## Unreleased · Local UI completion

- Collapse dossier documents while preserving visible scope/dates/status and mounted decision drafts.
- Search and page the full eligible registry when selecting a property for an advertisement; retain the selected ID through filters, errors and reload.
- Add the existing exact-city filter and restore registry position, focus and selected map marker after dossier navigation.
- Order overview objects by available work action and review age before server score, with explicit scope and no invented deadlines.
- Keep the working public installation unchanged; these updates are local only.

## 2026-10-18 · B0–B3 frontend installation

- Installed the reviewed dossier drafts, seven dossier sections and monitoring task layout on the working site; retained a rollback image and existing application data/configuration.
- Restored the stopped temporary tunnel, then replaced only the frontend. Public HTTPS smoke passed 44 responsive observations, authentication/CSRF, draft preservation and retained source/PDF reads without business writes.

## 2026-10-18 · Monitoring task layout

- Put candidate queue, selected comparison and preliminary incidents before auxiliary tools; group KHC reference search, Threads preview and DEMO registry versions in mounted native disclosures.
- Preserve existing deep links, query context, forms, file selection and explicit commands; keep REAL/DEMO limits visible and prevent sticky headers from obscuring anchor targets.

## 2026-10-18 · Seven dossier sections

- Organize the dossier into overview, legal bases, publications, risk factors, evidence, history and signals; keep all seven destinations available in both interface modes.
- Open factor editors locally without unmounting forms, drafts or file inputs; retain deep editor links and keyboard focus.
- Reuse existing evidence reads on selection and existing filtered publication/signal routes. Preserve backend risk, legal guards, roles and historical snapshots.

## 2026-10-18 · Dossier draft protection

- Preserve R1/R4/construction/legal-basis form input across object navigation, Back and reload with scoped tab drafts and explicit restore notices.
- Keep selected files and retry state in tab memory during SPA navigation; require and explain file reselection after reload. Clear text and memory on logout/401; never store file bytes in Web Storage or submit restored decisions automatically.
- Verify R4 document capture and its separate decision against an existing nonzero risk baseline.

## 2026-10-17 · Selective integration of frontend updates

- Integrated publication cards/details, intake forms, material review heading and signal guidance while retaining drafts, server pagination, URL context, history, controlled map selection and review/comparison workflows.
- Added publication-status and source charts with explicit first-100 coverage and mutually exclusive categories; retained exact backend review totals and processing-status semantics.
- Reused semantic tokens, readable text/touch sizes and responsive controls; no backend, API, migration or dependency changes.

## 2026-10-17 · Review actions, publication comparison and extraction fixes

- Connected exact unresolved material actions to the review UI and dashboard, with independent processing filters and a historical R2 decision form preserving target, evidence, revisions and retry keys.
- Added explicit original/OCR-version text comparison with server pagination, URL recovery, provenance and bounded read-only diff.
- New rules-1.6 rejects measured RU/KZ bank-program false positives and retains a linked amount plus percentage in a payment clause. Original fragments, pending reviews and historical versions remain unchanged.
- Restored local Docker/temporary HTTPS access after a verified database and storage backup. A temporary tunnel requires the computer and Docker to remain running.

## 2026-10-17 · Integrated frontend and repository structure

- Integrated the uploaded light workspace, object search/dashboard analytics, map guidance/selection and signal review presentation into `frontend/`, preserving current APIs, drafts, server pagination, roles and immutable history.
- Removed55 misplaced root uploads/archive paths from the current tree; preserved source history and excluded runtime/private artifacts. Added CI repository hygiene checks; disclosed archive credentials require rotation by their runtime owner.
- Pinned the Next tracing/Turbopack root to frontend and verified the standalone build/start path; added a real Next-config regression and responsive browser checks.

## 2026-10-17 · Offline AI field evaluation

- Added shared schema2 amount/currency/percent and strict source-binding scores to OCR and saved-publication evaluators; schema1 inputs remain supported with unannotated field scores.
- Added a versioned synthetic RU/KZ field regression corpus, behavioral tests and CI artifact run. Preserved old labels/reports and exposed false positives, incomplete mixed values and OCR quote errors without changing production extraction.
- Fixed native Tesseract metadata decoding for Windows Cyrillic paths; no new dependencies or API changes.

## 2026-10-17 · Saved publication comparison (backend)

- Added authenticated read-only `/api/v1/advertisements/compare`: explicit original or historical analysis text, source/date/version context and exact Unicode line differences.
- Distinguished unavailable text from equality; enforced DEMO/REAL, version/source ownership and100000-character/1000-line bounds without truncation. No entity, risk, signal or notification changes.
- Contract0.13.0-mvp; frontend integration and GitHub publication remain separate.

## 2026-10-17 · Derived material review work (backend)

- Added authenticated read-only `/api/v1/advertisements/review-queue` with concrete hypothesis, latest-version match, payment evidence and R2 tasks, exact filtered totals and pagination.
- Preserved historical pending R2 after source correction and checked terminal decision freshness against source/binding review; no status, risk or signal mutations.
- Contract 0.12.0-mvp; frontend integration remains a separate block. A zero task count is not source or legal acceptance.

## 2026-10-17 · Analyst workspace S0–S2

- Five permanent work zones, nested monitoring navigation and contextual breadcrumbs; compact dashboard with server-backed work queues.
- Server-paged review queue with status/URL context and provenance beside the original.
- Tab-scoped recovery of review reasons and manual corrections, explicit storage failure handling, authentication cleanup and preserved retry keys; no automatic decisions or changed risk rules.

## Внешний RU/KZ baseline и правила1.5 · 17.10.2026

- Первый неизменяемый baseline12реальных открытых публикаций; отдельные RU/KZ метрики и переводные группы. Набор отрицательный, после просмотра используется для регрессии; коммерческая/OCR/человеческая приёмка остаётся открытой.
- URL-импорт дополнен двумя проверенными RU-подрубриками Primeminister.kz — press/reviews; остальные вложенные пути и корни рубрик запрещены.
- rules-1.5 отличает отраслевое «строительство» от явного строительства объекта в ипотечном исключении. Исправлены2RUложных условия оплаты, прямые требования/платная бронь/названия сохранены. Существующие решения и snapshots не пересчитываются.
- Offline evaluator защищает прежний отчёт от перезаписи, проверяет изменения исходников/manifest/кода, сохраняет runtime и считает matching top-1/top-3 с ошибками в знаменателе. Добавлен в существующий CI lint; новый CI удалённо не запускался.

## Открытые публикации и документ КЖК · 17.10.2026

- Явный Primeminister.kz URL import: лицензированный источник, leased job, HTML/SHA/атрибуция/текст, защита от повторов и отдельный анализ. Коммерческий рекламный C-01 остаётся открыт.
- Операторский импорт реального PDF КЖК: версии/дата/страницы/поиск, без автоматического правового статуса или баллов.
- rules-1.4: ограниченная обработка ипотечной информации по первым реальным RU/KZ отрицательным примерам; явная оплата/бронь/объекты сохраняются. Новая офлайн-оценка фиксирует ограничения качества.
- Досье показывает найдено/подтверждено/недостающее/следующее действие. Новые UI используют прежние tokens и компоненты.

## Простой интерфейс и каталог · 16.10.2026

- По умолчанию три раздела, короткая верхняя навигация, одно главное действие обзора и карточки объектов с объяснением риска.
- Дополнительные меню, KPI, карта/фильтры, формы документов, история и создание сигнала доступны в подробном режиме; переключение сохраняет ввод и выбранные файлы.
- URL/дата ввода раскрываются по желанию, неработающая вкладка URL-импорта удалена. DEMO, UNKNOWN, доказательства и ручные решения сохранены. Новый вид не меняет backend/API/формулу и не удаляет данные.
- Awwwards/Estudio Niksen использованы как визуальный референс; существующие токены/шрифты/компоненты сохранены. Исправлен контраст профиля на белой верхней панели.

## Предпросмотр Threads на сайте — 16.10.2026

- Доведена до локальной проверки панель поиска в `/monitoring`: подключение, ручной запрос аналитика, временные результаты, ошибки и восстановление без потери фразы. Исправлена гонка фокусировки результата при отправке клавишей Enter.
- Контракт 0.10.0-mvp добавляет status/search; session/CSRF/analyst, один активный запрос на API-процесс, пауза и ограничение времени. Исходники/риск/инциденты не создаются и не меняются. [Настройка и ограничения](docs/FEATURE_THREADS_SEARCH.md).
- Живой доступ не подтверждён; веб-функция остаётся отключённой. Следующий этап — официальный доступ и один проверенный запрос, затем доказательственное сохранение.

## Первый адаптер Threads — 16.10.2026

- Реализован CLI offline-status/одной страницы официального keyword search: даты/ссылки, bounded TLS/timeout/size, приватный отчёт, dedup и безопасные ошибки без токенов.
- Поиск не подключён к API/worker/БД: токен отсутствует, живой доступ ожидает проверки. Источники перепроверены, в Ashyq обнаружен паспорт CSV; скачивание остановилось на TLS verification, без обхода. [Реализация и запуск](docs/FEATURE_THREADS_SEARCH.md).


## Сверка рекламы и предварительные карточки — 16.10.2026

- Добавлен раздел `/monitoring`: ручное выделение кандидата из сохранённой публикации, версии DEMO-списка, объяснение результата и история отдельных предварительных карточек.
- Повторные/конкурентные команды защищены idempotency/revision/уникальностью активной карточки; противоречивые дубли документов отклоняются до записи. Восемь новых API-операций, контракт 0.9.0-mvp и аддитивная миграция b26f105d7c41.
- REAL/DEMO разделены. Недоступный/неполный/устаревший реестр и неоднозначная область не дают отрицательного правового вывода; R1–R6, сигналы и Telegram не меняются. Live-поиск площадок остаётся следующим блоком. [Границы и использование](docs/FEATURE_MONITORING_CASES.md).

## Исправления обзора и условий оплаты — 16.10.2026

- Счётчик «Новые публикации» ограничен статусом NEW с сохранением фильтров; pending-гипотезы по последней версии продолжают учитываться независимо от статуса материала.
- `rules-1.3`: явный перевод с суммой для закрепления квартиры в RU/KZ, мягкие переносы и исходные offsets; ограниченный контекст, отрицания назначения/необходимости, предупреждения, старые предложения и посторонние переводы.
- Новые гипотезы остаются PENDING. API формы и веса риска не менялись, описан смысл new_advertisements; ручное создание пропущенного PAYMENT_TERM не добавлено. Версия повышена для обычного анализа и ручной расшифровки; старые извлечения и снимки не переписываются.

## Telegram-уведомления — 16.10.2026

- Добавлен отключённый по умолчанию transactional outbox для новых ручных CONFIRMED R1–R6, обработка существующим worker, deduplication/429/backoff/UNKNOWN и закреплённый private chat.
- Добавлен безопасный CLI BotFather-token → одноразовая привязка → проверка/статус/retry/выключение. Secrets остаются в приватной env; Telegram SDK и новые сервисы не добавлены.
- Миграция a91b76f2c305 создаёт telegram_notifications. Формула/роли/ручные проверки и исторические сигналы сохранены; DEMO по умолчанию не рассылается. Живая регистрация/доставка не объявляется выполненной только по тестам.
## История объекта — 16.10.2026

- Добавлена общая хронология в досье и review: понятные события, автор, причина, сохранённые изменения статусов и переходы к связанным материалам/сигналам.
- Серверная пагинация по 10 событий с `history_page`, сохранением query/форм, loading/empty/error/retry и скрытием прежней страницы во время запроса/ошибки.
- Существующий API аудита дополнен текущим именем автора и кодом фактора. Формула, БД/миграции, роли и исторические snapshots сохранены; график прошлого риска/уведомления не добавлялись.

## Подготовка URL-импорта — 16.10.2026

- Добавлен отключённый от API/worker HTTPS-транспорт одного разрешённого источника: домен/пути, проверка всех DNS-адресов и redirects, IP pinning с TLS verification, размер и общий deadline.
- Добавлены отдельные security/HTTP/subprocess тесты и безопасные сообщения ошибок с признаком допустимости явного повтора. Автоматических retries и новых зависимостей нет.
- Исследованы условия Krisha/Korter/BI; подтверждённого разрешённого источника нет. C-01 остаётся OPEN/BLOCKED; сохранение/извлечение/jobs/UI ещё не интегрированы. Приоритеты и следующий блок уточнены в существующем плане/статусе.

## UI/UX: рабочее пространство аналитика — 16.10.2026

- Обзор показывает пять приоритетных объектов с явным охватом выборки, реальные KPI и переходы к материалам/проверке/карте/сигналам.
- Реестр показывает активные фильтры, город/застройщика; выбранный на карте объект выделен в таблице. Возврат из досье сохраняет query/page/list-map даже после reload.
- Реклама использует существующие серверные status filters/pagination, отдельные даты публикации/фиксации и прямой переход в review. Старая выборка не показывается под новым фильтром или после ошибки.
- Выбор материала review хранится в URL; Back/reload не запускает анализ. Общий RiskSummary, anchors сигналов и выделение версии упрощают доступ к фактам/решению/PDF/истории.
- Единая типографика/поверхности legal forms/motion 150–200 ms с reduced-motion. Backend/API/БД/риск/права/исторические snapshots и зависимости сохранены.

## OCR/extraction rules-1.2 — 15.10.2026

- Условия оплаты сохраняются через мягкий перенос суммы/термина и сокращение `тыс.`; добавлены резервирование и казахский призыв предварительной оплаты. Нулевой платёж не заимствует положительную цену квартиры.
- Исторический пересказ отделён от нового предложения. Неоднозначное `т.` не превращается в выдуманную валюту; длинный PAYMENT_TERM содержит фактический термин/сумму в своём фрагменте.
- Без ЖК/ТК и exact name допускаются только ограниченные OCR-подмены казахских букв зарегистрированных длинных названий, с исходными offsets/bbox, предупреждением и PENDING.
- Новые extraction версии `rules-1.2`; прежние данные/решения не переписываются. API/БД/риск/зависимости не менялись. На прежнем изученном synthetic corpus payment 100%/100%, top-3 24/24; внешний holdout остаётся открытым.

## UX: материал → проверка → сигналы — 15.10.2026

- Прямой переход от сохранённого текста к review за одно действие; исходник доступен отдельно, анализ по-прежнему запускается явно. Focus приходит к результату сохранения.
- Четыре anchor-этапа review с фактическим счётчиком разобранных гипотез, условиями привязки/R2 и предупреждением об архивной версии; формы остаются mounted.
- Формы разделяют материал/происхождение и необязательный контекст; связаны подсказки, видны размер/имя файла и лимит, счётчик текста.
- Фильтры/страница/выбранная версия сигналов сохраняются в URL при выборе и просмотре истории; Back/reload восстанавливают контекст. Новый запрос не показывает прежнюю очередь под новыми фильтрами.
- Пять новых UX regressions. Backend/API/БД/формула/зависимости и отдельные подтверждения сохранены.

## Постоянная UI/UX-инфраструктура — 15.10.2026

- Один repo-scoped UI UX Pro Max на проверенном upstream commit с лицензией; обнаружение Codex и локальный поиск проверены, smoke включён в CI. Docker context исключает Skills.
- Общие Pagination/TableRegion, объявление страницы, сброс фильтров за одно действие с сохранением map/list и возвратом focus в поиск.
- Типографические tokens H1–H6, каталог компонентов, библиотечная матрица и правила работы агентов через GitHub; walkthrough основных сценариев и границы внешней приёмки.
- Три новых browser regression; существующие backend/API/данные и зависимости сохранены.

## Дизайн-система рабочего досье — 15.10.2026

- Семантические цвета, единая типографика и состояния компонентов; сводка, реестр, карточка, проверка, сигналы и формы с общей визуальной системой и разной композицией.
- Читаемые расшифровки R1–R6 и русские статусы, профиль/выход на телефоне, skip link, доступная прокрутка таблицы и навигация по досье с сохранением ввода.
- Видимое обоснование решения R1, переход к выбранному оригиналу и сигналу с управлением фокусом; увеличены цели на карте.
- DESIGN_SYSTEM/UX_GUIDELINES/UI_AUDIT и обязательное чтение перед frontend-работой; 5 новых UI-тестов. API, данные, роли и расчёт риска сохранены, новых dependencies нет.

## Измерение OCR и исправление алиасов — 15.10.2026

- Воспроизводимый offline evaluator с 36 новыми синтетическими RU/KZ изображениями, baseline/JSONL evidence, coverage/CER/payment/top-3 и диагностикой ошибок.
- Названия без ЖК/ТК выделяются по registered aliases; исходные offsets/bbox и PENDING сохранены, версия новых extraction rules-1.1.
- После исправления top-3 18/24 вместо 8/24; precision/recall оплаты 80%/75%, цели качества не достигнуты.
- CI выполняет оценку и сохраняет synthetic artifact; зелёные jobs не означают приёмку качества. Контракт, БД и формула риска без изменений.

## Карта реестра — 15.10.2026

- Leaflet-карта DEMO-объектов с серверными баллами, общими фильтрами/страницей и переходом в карточку.
- Обработка непригодных координат и отказа тайлов/JS/API; список остаётся доступным, старые метки не выдаются за новые результаты.
- Публичная настройка провайдера, атрибуция, keyboard/mobile/200% zoom; 5 новых browser-тестов и тест конфигурации в CI.
- Явная пагинация реестра; актуальная ссылка на карту из обзора. Контракт/БД/формула без изменений.

## Эксплуатационные инструменты — 15.10.2026

- Локальная согласованная копия PostgreSQL+storage с контрольными суммами и сохранением истории.
- Изолированная проверка восстановления без перезаписи рабочей БД, со скачиванием прежних оригиналов и PDF через приложение.
- Проверки целостности, путей и возобновления приостановленных SAQ writers, включённые в CI. Новых API, миграций и зависимостей нет.

## 0.8.0-mvp — 15.10.2026

- Исходные PDF во всех supporting-document формах, pypdf strict в bounded Linux subprocess, неизменяемые байты/SHA и отдельный human review.
- Лимиты страниц, памяти, CPU, времени и конкурентности; отклонение шифрования, действий, форм, вложений и внешних ссылок.
- Browser E2E job с Compose/OCR/PDF и подготовкой прав Linux storage; Markdown-only commits не запускают повторную сборку.
- Контракт 34 implemented + 1 partial + 1 planned, без миграции; pypdf 6.20.1 закреплён.


## 0.7.0-mvp — 15.10.2026

- Неизменяемые сигналы, версии, явное подтверждение/возврат человеком с аудитом и защитой stale/revision.
- Очередь PDF точной ревизии, WeasyPrint/Pango/DejaVu, ограничения ресурсов и сохранение исторических assets.
- Экран сигналов и создание из карточки, фильтры, история, PDF и browser regression.
- Миграция e87f4d01a921; контракт добавляет snapshot.assets/pdf_job_id.


## 0.6.0 · 2026-10-15 · датированная проверка отсутствия оснований / R1

- Самостоятельный LEGAL_ABSENCE_REVIEW с областью, точным absence_as_of, датой документа и отдельными результатами/обоснованиями трёх проектных механизмов; факты evidence копируются из сохранённого источника.
- Неполные/UNKNOWN/NOT_FOUND/UNAVAILABLE материалы сохраняются без R1. Полная документальная проверка позволяет PENDING/0 → отдельное CONFIRMED/+35 либо REJECTED/0, с версиями и аудитом.
- Применимые VERIFIED_VALID/PENDING основания блокируют R1; обратное подтверждение документа на дату CONFIRMED R1 также требует явного разрешения противоречия. Отклонение отдельного основания само не доказывает отсутствие всех механизмов.
- Совместное подтверждение R1/R2 требует известной published_at проверенной рекламы, точно совпадающей с моментом R1, в обоих порядках подтверждения. Веса и формула риска сохранены; время импорта не подменяет дату события.
- legal_absence_as_of показывает датированное решение отдельно от текущей применимости. Новый R1 не делает VERIFIED_ABSENT бессрочным; явный пересмотр legacy R1 снимает старый бессрочный DEMO-агрегат. Новых миграций/зависимостей нет.
- Финальный полный runtime-прогон заблокирован недоступным Docker daemon; сохранены source/focused результаты и точные границы проверки в PROJECT_STATUS.md. Сигналы/PDF, collector и полный P0 остаются открыты.

## 0.5.0 · 2026-10-15 · документы строительства и ручные R3/R5/R6

- Датированные документы стадии, готовности и сроков с неизменяемым происхождением; реклама для R3 подтверждается отдельной привязкой версии.
- Отдельные PENDING/CONFIRMED/REJECTED решения R3 (+10), R5 (+10), R6 (+5), ревизии/аудит и оценка as_of отдельно от серверного времени решения.
- Разные SHA R3/R5, сопоставимые измерения и точная граница 20 п.п.; существенность задержки оценивает аналитик. Изменение расшифровки/привязки снимает зависимый R3.
- Формы сохраняют успешные этапы при повторе после частичного сбоя в текущей странице. R1/PDF/collector остаются открыты; новых зависимостей/миграций нет.
- Закрыта гонка формы R2: сохранение ждёт загрузки текущего фактора, чтобы не создавать повторный код. Ошибка чтения позволяет повторить загрузку.

## 0.4.0 · 2026-10-15 · правовые основания

- Создание PENDING основания для конкретного ЖК из отдельного документа, три механизма, реквизиты/период и snapshot доказательства.
- Отдельная датированная проверка/отклонение, роли, ревизии/конкурентные решения и аудит; конфликт с R1 на ту же дату блокирует подтверждение.
- Текущая применимость и фильтры учитывают истечение периода без cron. UNKNOWN/отклонение не создают R1.
- Asset upload различает документы обращения и основания. Контракт дополнен purpose, evidence_ids и verification_as_of; новой миграции/зависимости нет. PDF и VERIFIED_ABSENT workflow ещё не реализованы.

## 0.3.0 · 2026-10-15 · коллективное обращение

- Документ TXT/PNG/JPEG с неизменяемым происхождением, датой, областью ЖК и ручной проверкой коллективности.
- COLLECTIVE_APPEAL evidence и отдельный R4 review: PENDING/0 → CONFIRMED/+15 → REJECTED/0; ревизии и аудит.
- Аддитивная миграция c4f1a903b812; partial API contract расширен для R4, PDF ещё не поддерживается.

## 0.2.1 · 2026-10-14 · быстрые задачи

- UTF-8 TXT upload с сохранением исходных байтов, проверкой кодировки/лимитов и анализом без OCR.
- UNKNOWN стадия больше не отображается как стройка; отдельные подписи R4/R5/R6. Новых зависимостей/архитектурных решений нет.

## 0.2.0 · 2026-10-14 · локальный этап OCR/review

- PNG/JPEG originals, PostgreSQL jobs/worker, настоящий Tesseract RU/KZ OCR, правила извлечения и RapidFuzz-кандидаты.
- Ручная проверка/исправление, версии расшифровки, выбор очереди, доказательство и отдельное подтверждение/отклонение R2 с аудитом и пересчётом.
- Лимит фактически прочитанного тела запроса, проверка изображений, защищённый preview, fencing worker и защита от устаревших одновременных решений.
- Контракт дополнен версиями текста, OCR_TEXT, hypothesis_id, audit details и endpoint расшифровки; миграция аддитивная. Остальные виды доказательств/факторов пока отклоняются; это не полный P0.

## 0.1.0 · 2026-10-14 · первый вертикальный срез

- Локальная сессия аналитика, PostgreSQL/Alembic, DEMO seed, обзор/реестр/карточки/сохранённые доказательства, новый текст с происхождением и SHA-256.

## 2026-10-19 — Social Monitor: ручной CSV

Добавлены CSV preview/commit/journal, точное хранение оригинала, дедупликация
и новые версии без перезаписи старых материалов. Поддержаны простой шаблон
и пользовательский формат social audit. Новый контракт0.26.0/миграцияfb45a723c916.
Импорт не создаёт досье и не подтверждает связь/фактор; source URL не загружается.

## 2026-10-19 — источники и поисковые запуски

Добавлены capability catalogue и сохраняемая история явного Threads preview:
результаты/пустые ответы/ошибки/неизвестный исход, повторное чтение без внешнего
поиска, actor+key retry защита. Контракт0.27.0, миграцияac56b834d027.
CSV journal и IMPORT_URL jobs сохраняют прежние механизмы.
