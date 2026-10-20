> Архив исходного состояния до repository cleanup 20.10.2026. Даты, результаты и команды ниже относятся к своим историческим версиям. Актуальный вход — [README](../../README.md), текущий статус — [PROJECT_STATUS](../../PROJECT_STATUS.md).

# SAQ QURYLYS — архитектура MVP

## SQ-08 ·20.10.2026

Досье хранит visited state в keyed-by-property-ID PropertyDossier: вторичные
sections монтируются при первом посещении, затем сохраняют DOM/формы/файлы.
Active children синхронны для deep links; tabpanel/ARIA wrappers всегда доступны.
Provenance и структура остаются первичными чтениями видимой шапки.
Network5samples:8→4GET,17834→4217decodedbytes; latencywin не установлен
(p50 234.2→259.6ms). Browser46PASS,build/staticPASS; evidence/limits —
SQ_FIX_PROGRESS, этап6. Shared WorkspacePanel/monitoring поведение не менялось.

## UI Parser V2 ·20.10.2026

MonitoringView сохраняет mounted panels и загружает MonitoringV2 при первом
посещении section=v2. Setup/profile editor/profile detail/findings используют
прежние useData, review drafts/commands, Button/Pagination/TableRegion/LoadState.
Dictionary register/activate, profile save/run, capture и import остаются отдельными
POST контракта0.31.0. URL v2_* не заменяет legacy IDs; версия находки и observation
обязательны для импорта. Viewer только читает, backend авторизует команды.
TEXT_ONLY acknowledgement живёт только в памяти конкретной версии.
Новых зависимостей/схем/контракта нет. Presentation preview и DEMO import→human
review→PDF на actual API/worker отделены от live access. [Flow](../FEATURE_SOCIAL_MONITORING_V2.md).

## Находки V2 и импорт ·20.10.2026

ProfileVersion → один явный keyword search через прежний Threads gate →
MonitoringRun → capture → Finding/Version/Observation → явный import
version+observation → Advertisement NEW + TEXT Asset. Capture не принимает
payload из браузера и не вызывает сеть. Exact query/profile/dictionary/rules/
SHA/даты сохранены; advisory locks сериализуют capture и однократный импорт.
Исторические версии/материалы не переписываются; запоздалый capture сохраняется
без замены свежего наблюдения. Нет автоматических анализа/resolution/evidence/
R1–R6/сигнала. Миграция ef90fc78b461, контракт0.31.0; одна bounded страница,
UI V2 добавлен в QA выше; live acceptance отдельно. [ADR-026](../decisions/ADR-026-versioned-monitoring-findings.md).

## V2 dictionary persistence ·19.10.2026

monitoring_dictionary_versions хранит исходные bytes/SHA; monitoring_dictionary_activations
фиксирует каждый явный выбор/отключение. API monitoring_dictionaries использует
существующие session/analyst/CSRF/commands/audit. Общая transaction advisory lock
сериализует активацию и создание версии V2 profile. Последняя хранит dictionary ID
и compiled_preview с query IDs/provenance/activation revision. Чтение не компилирует.
Список/detail по умолчанию1.0 защищают прежний UI от V2 parameters.
[Решение и ограничения](../decisions/ADR-025-monitoring-dictionary-history.md).

## Offline ядро parser V2 ·19.10.2026

social_dictionary.py валидирует исходные bytes v1/v2 и SHA/сохранность оригинала.
social_queries.py строит bounded preview с provenance и source capabilities;
scripts/preview_social_queries.py — локальный вход без сети/БД/активации.
Loader/compiler подключены к API V2 профилей и словарей; context rules пока
остаются offline. Worker/словарь UI1.0 не изменены. Контракт0.30.0; миграция df89eb67a350. [Gap-analysis и дальнейшая интеграция](../FEATURE_SOCIAL_MONITORING_V2.md).

## Управляемое расписание URL ·19.10.2026

Контракт0.29/миграция ce78da56f249: UrlSchedule + UrlScheduleRun, default OFF,
короткий transaction-locked due-check в прежнем worker и общий enqueue URL.
Source admission budget учитывает ручные jobs; это не глобальная HTTP-квота.
Job leases/сохранение исходников прежние, независимые решения/риск не вызываются.
[Поведение/API/config/границы](../FEATURE_URL_SCHEDULES.md), [ADR-024](../decisions/ADR-024-reviewed-url-scheduling.md).

## Поисковые профили ·19.10.2026

Аддитивный контракт0.28 и миграция bd67c945e138: query profile header + append-only
версии параметров/готовых фраз/словарного SHA, audit/command idempotency прежние.
Словарь помощника1.0 один в frontend/lib/monitoring-dictionary-v1.json и копируется
в backend Docker image явно; это не отложенный пользовательский v2 JSON.
GET не компилирует старые снимки; POST versions сериализует изменения row lock
и expected_revision. Профили сами ничего не исполняют. Прежний UI hook команд
выделен в lib/use-monitoring-command без смены поведения. [ADR-023](../decisions/ADR-023-versioned-monitoring-query-profiles.md),
[flow/API/ограничения](../FEATURE_QUERY_PROFILES.md).

## Открытые страницы ·19.10.2026

Постановка URL теперь вынесена в `url_import.enqueue_url_import`: общая транзакция,
проверка адреса, прежний advisory lock/лимит/дедуп/audit; HTTP route отвечает за
auth/CSRF/UUID command и перевод `ImportQueueFull` в429. Сеть/commit не принадлежат
enqueue. Общая функция установлена вместе с URL scheduler; ограничения квот
постановок и проверка — FEATURE_URL_SCHEDULES/PROJECT_STATUS.


Существующий POST advertisements/import-url принимает тот же {url,is_demo};
server-side source_for_url выбирает NEWS_SOURCE или AD_SOURCE после проверки
адреса, job сохраняет source_id. Worker повторно проверяет пару URL/source_id,
вне транзакции получает bounded HTML, затем под lease/claim token сохраняет
Advertisement + HTML/TEXT assets с provenance. Новости и коммерческое предложение
разделены metadata, licence и selector scope. AN GROUPS — один точный /payment
без query, включая redirect до следующего соединения. Схема БД, API DTO и роли
не менялись; только поддерживаемые URL и описание контракта. Scheduler/сеть
соцсетей не добавлялись. Подробности — FEATURE_URL_IMPORT и дополнение ADR-008.

19.10, контракт0.25: `GET /api/v1/properties/{id}/report.pdf` добавляет текущий
отчёт досье с whitelist разделов и RU/KZ. После проверки сессии данные читаются
в отдельной REPEATABLE READ READ ONLY транзакции; ограниченный offline renderer
строит trusted таблицы. Нет jobs/команд/решений/новых evidence или изменения
исторических signal snapshots. [FEATURE_DOSSIER_REPORT](../FEATURE_DOSSIER_REPORT.md),
[ADR-020](../decisions/ADR-020-selectable-dossier-report.md).

LocaleProvider хранит только настройку языка, не меняет API payloads и original
data. Общая DetailDrawer использует native dialog; прежние редакторы и mounted
панели сохраняются. Master2.0 — в DESIGN_SYSTEM, никаких новых runtime packages.

19.10, контракт0.24: unlinkCandidateDossier очищает текущий LINKED после проверки
двух версий и пишет два audit events атомарно; CREATED и ревизия фактов досье
сохраняются. GET dossier-history читает candidate-scoped audit независимо от
текущего FK, с пагинацией и историческими identity snapshots. Новая миграция
не нужна. Сценарий и границы — ADR-019.

19.10, контракт0.23: кандидат получает связь CREATED/LINKED с досье. Миграция
ea34f612b805 сохраняет старое происхождение, снимает общую уникальность FK и
оставляет partial unique для CREATED. linkCandidateDossier проверяет обе ревизии,
режим/город и пишет аудит атомарно; ревизия фактов досье и предметные решения
не меняются. source_candidate_id остаётся источником создания; count LINKED и
GET candidates?property_id дают обратную навигацию. См. ADR-018.

19.10: создание досье из кандидата — отдельная транзакционная команда analyst
с revision/CSRF/idempotency и проверкой дублей внутри DEMO/REAL. Nullable unique
monitoring_candidates.property_id и PropertyDetail.source_candidate_id сохраняют
происхождение; audit хранит исходные наблюдения. Контракт0.22/миграция d92e6a14f301.
Решения и ограничения: [ADR-017](../decisions/ADR-017-candidate-dossier-creation.md).

19.10, контракт0.21: listAdvertisements принимает optional is_demo. SQL predicate
применяется до count/offset/limit и сочетается с q/status/property/date.
Сигналы используют существующие state/is_stale без нового API: UI-предустановки
и сохранение точного signal_id. Новых данных, миграций и зависимостей нет.


19.10, контракт0.20: optional q≤300 на двух GET публикаций/очереди. Общий
search_materials применяет escaped ILIKE к original_text/source_label до
вычисления работы, count и offset/limit; без joins/дублирования строк.
Поиск не читает файлы/сеть/OCR/гипотезы. Подстрочный scan достаточен для MVP;
производительность на больших наборах не подтверждена, отдельный индекс/
поисковый сервис требует измерений. Новых миграций/dependencies/ADR нет.


19.10.2026, контракт0.19: PaymentReviewTarget получает nullable display name.
review_work одним batch SELECT читает имена точных target IDs после вычисления
работы. Counts/порядок/команды/решения прежние. Общий pdf_filenames обслуживает
generic export и direct saved signal; frozen имя/дата/v/r не зависят от текущего
Property. Header/parser меняют только имя скачивания, без хранения/рендера/
снимков. Новых зависимостей/миграций/архитектурного решения нет.

18.10.2026, локальный контракт0.18.0-mvp: listSignals q≤300 добавляет SQL predicate
к текущему/сохранённому имени, signalUUID, version label и state code/label.
EXISTS current Property.name не дублирует строки; JSON path только frozen name,
ILike с буквальным escaping. Query/state/property_id до current signal_view,
stale и pagination прежние. UI submit native form → URL q/reset page/pin signal_id,
без local page filter; queue resolvedPath guard сохранён. Нет новых routes/DTO/
dependencies/migrations/архитектурного слоя; новый ADR не требуется.
Current stale/view N+1/scale остаётся ограничением. [Поиск сигналов](../FEATURE_SIGNAL_SEARCH.md).

18.10.2026, локальный контракт0.17.0-mvp: существующий properties list принимает
order=name(default)|work_priority. Сначала текущие filtered PropertyOut, затем
глобальная сортировка по действию/last_reviewed_at(NULL first)/server score DESC/
UUID ASC, потом pagination. Сортировщик использует эффективный legal status,
не сырое поле БД; risk.as_of не используется как дата проверки. Dashboard получает
page_size5, simple показывает3, клиентский comparator исключён. Остальные вызовы
без order сохраняют прежний name/ID. Нет нового endpoint/DTO/слоя/dependency/ADR.
Ограничение: прежнее построение всех views/N+1 не оптимизировано для большого
реестра; UX-16 отдельно. [Поведение и проверка](../FEATURE_PROPERTY_PRIORITY.md).

18.10.2026, локальный контракт0.16.0-mvp: GET properties/{id}/structure читает
существующие parent_id/level и возвращает lightweight references. Ancestors
ограничены16чтениями, циклы/некорректная цепочка дают409; children и siblings
считаются SQL count и читаются order(name,id)/offset/limit с независимыми pages.
Для корня siblings пуст, общий developer/name не создаёт группу.
PropertyStructure переиспользует useData/LoadState/Pagination/Link, хранит pages
локально досье и сохраняет registry return context при переходах.
Ни риск, ни правовые основания/снимки не агрегируются. Миграций/dependencies нет;
нового ADR не требуется: расширен существующий read-only API и текущие primitives.
Границы/проверка — [структура объекта](../FEATURE_PROPERTY_STRUCTURE.md).

18.10.2026, локальный контракт0.15.0-mvp: существующий properties/dashboard q
ищет literal case-insensitive substring по имени, адресу, каждому aliases,
Developer.name/bin. Aliases раскрываются PostgreSQL json_array_elements_text
в коррелированном EXISTS; текст JSON не используется как поисковое поле.
Developer читается через relationship EXISTS. Один объект остаётся одной строкой
при нескольких совпадениях. Прежние фильтры/сортировка/pagination и server risk
сохранены; q.trim пустой не фильтрует dashboard по привязанным объектам.

Signal filter переиспользует PropertyPicker с page_size25 и без is_demo guard
привязки: это чтение разрешённых объектов обеих категорий. Match picker сохраняет
обязательное текущее ограничение DEMO/REAL по материалу. Для имён текущей страницы
сигналов, отсутствующих в initial100, используются существующие property-detail
GET (не более25 разных ID на страницу), abort/локальный cache/error+retry.
Нет новых endpoint/service/dependency/миграции; авторизация и snapshot не меняются.
Масштабная SQL-оптимизация deferred: прежний filtered_properties всё ещё строит
представления совпадающих объектов до Python pagination, latency при10k не измерена.
Использованы существующие возможности
[PostgreSQL JSON functions](https://www.postgresql.org/docs/17/functions-json.html)
и [SQLAlchemy table-valued functions](https://docs.sqlalchemy.org/en/20/dialects/postgresql.html#table-valued-functions).

17.10.2026: интерфейс подключает существующие review-queue и comparison API;
processing список сохранён отдельным режимом. Dashboard использует точный
material total из очереди, исторический R2 отправляет прежние команды для
своего property/factor/evidence. `/comparison` читает только явно выбранные
сохранённые тексты/версии. Новый pipeline `rules-1.6` исправляет изученные банковские
false positives и составные условия сумма+процент; старые extraction/решения
не пересчитываются. Контракт 0.13, БД/миграции/формула риска не меняются.

17.10.2026, контракт0.13.0-mvp: [сравнение сохранённых текстов](../FEATURE_PUBLICATION_COMPARISON.md), [ADR-013](../decisions/ADR-013-bounded-saved-text-comparison.md). GET advertisements/compare читает две публикации и их original_text либо explicit extraction.analysis_text с проверкой принадлежности исходника. Stdlib bounded line diff100000символов/1000строк, provenance/dates/text SHA; нет внешних вызовов, записей, миграций, новых зависимостей или автоматической идентичности/риска. Предыдущие API и frontend сохраняются.

17.10.2026, контракт 0.12.0-mvp: [вычисляемая очередь материала](../FEATURE_REVIEW_QUEUE.md), [ADR-012](../decisions/ADR-012-derived-material-review-work.md). GET advertisements/review-queue пакетно читает последние extraction, matches, evidence, R2 и audit timestamps, затем фильтрует действия и считает total до pagination. Assets загружаются только для страницы. Новых таблиц/миграций/внешних вызовов нет; processing statuses, risk, review-команды, signals/PDF не изменяются. Это отдельный backend API, frontend ещё не подключён.

Дополнение17.10.2026: [ADR-011](../decisions/ADR-011-open-information-and-register-documents.md) добавляет информационный URL import и справочный OpenRegistryDocument. URL command→AnalysisJob.input_payload→существующий claim/lease worker→ограниченный subprocess HTTPS→HTML+TEXT Assets/Advertisement. PostgreSQL locks сериализуют очередь и content fingerprint; исходник не рендерится браузером. Отдельный импорт operator PDF→bounded Linux parser→Asset+OpenRegistryDocument(page text/provenance/date). Поиск страниц read-only не участвует в расчёте риска и не использует DEMO RegistryEntry. Авторизация/CSRF сохраняются в том же API/proxy; multipart5MiB разрешён обоими body limits, прочие JSON по-прежнему500KB. Контракт0.11.0-mvp. Досье строит ход проверки из существующего PropertyDetail, нового бизнес-расчёта frontend нет.

Дополнение 16.10.2026: [Threads preview](../FEATURE_THREADS_SEARCH.md), контракт 0.10.0-mvp, добавляет две операции поверх существующих auth/CSRF и same-origin proxy. API → ограниченный subprocess → фиксированный официальный endpoint; ответ существует только в памяти браузера. По умолчанию выключен. Один process-local gate ограничивает одновременность/частоту; это допустимо для текущего single-process локального запуска, перед масштабированием нужны общий quota/lease и политика аудита. БД/jobs/worker/Asset не участвуют. Это временный read-only поиск, не идемпотентная сохраняемая команда; отдельный ADR для нового слоя не нужен, значимый будущий persistent импорт требует собственного решения.

Дополнение 16.10.2026: [ручная/DEMO-сверка](../FEATURE_MONITORING_CASES.md), [ADR-010](../decisions/ADR-010-preliminary-monitoring-cases.md), контракт 0.9.0-mvp. Новый monitoring router/service/DTO использует существующие auth, CSRF, Command, audit и PostgreSQL-транзакции; шесть новых таблиц добавляет b26f105d7c41. Кандидат/наблюдение → неизменяемая версия списка → историческая сверка → отдельная предварительная карточка → ручное решение. API/worker обновлены совместно; внешних адаптеров/scheduler/нового outbox нет. Блокировки candidate → advertisement и candidate → incident согласованы; активная карточка уникальна по кандидату/причине. Совпадение не закрывает старую карточку без аналитика. Реальный реестр недоступен, изменения факторов/сигналов/уведомлений не выполняются. Ниже сохранены сведения предшествующих срезов.

Актуализация 16.10.2026: новые extraction и manual transcription используют `rules-1.3`; ограниченно распознаются переводы с суммой для закрепления квартиры в RU/KZ, с ручной проверкой и сохранением исходных spans. Прежние результаты/решения не мигрируются. Dashboard new_advertisements считает NEW; pending_hypotheses сохраняет независимую выборку по последним версиям всех статусов. DTO/таблицы/роли/формула риска не менялись; уточнена семантика счётчика в контракте. Проверки и ограничения — [OCR_EVALUATION](../OCR_EVALUATION.md) и PROJECT_STATUS. Ниже исторический базовый срез 15.10.2026.

Базовая архитектура согласована 14.10.2026; текущая реализация 15.10.2026 соответствует контрактному этапу 0.8.0-mvp. Реестр/ручной ввод, OCR/гипотезы/matching, документы и ручные R1–R6, снимки/решения сигналов и PDF реализованы. Карта и список используют одну страницу API и общие фильтры; 22 browser-теста прошли на текущем срезе. Новый evaluation CLI вызывает production OCR/extractor/matcher без API/БД на отдельном каталоге; его [36 synthetic regression cases](../OCR_EVALUATION.md) после исправления правил дают payment 100%/100%, top-3 24/24; внешний holdout ещё не проверен. Без префикса выделяются exact aliases и ограниченные OCR-подмены казахских букв зарегистрированных имён; версия новых extraction rules-1.2. Collector и произвольное историческое воспроизведение риска остаются целевыми компонентами. В PDF/CI checkpoint прошли 279 backend-тестов в Linux и 17 browser-тестов; полная приёмка P0 ещё не завершена. Основание требований — [REQUIREMENTS.md](../REQUIREMENTS.md), фактические проверки — [PROJECT_STATUS.md](../../PROJECT_STATUS.md).

Текущая реализация очереди, версия текста и пересмотр риска описаны в [срезе 02](../IMPLEMENTATION_SLICE_02.md) и [ADR-002](../decisions/ADR-002-durable-analysis-review.md). Датированная проверка правовых оснований: [feature](../FEATURE_LEGAL_BASIS.md), [ADR-003](../decisions/ADR-003-dated-legal-applicability.md). Текущая применимость вычисляется при чтении, VERIFIED_ABSENT не создаётся при отклонении документа. Независимые источники R3/R5/R6, разные SHA, даты/сопоставимость и отдельные решения: [feature](../FEATURE_CONSTRUCTION_REVIEW.md), [ADR-004](../decisions/ADR-004-dated-construction-evidence.md). Составная проверка отсутствия всех механизмов/R1: [feature](../FEATURE_LEGAL_ABSENCE.md), [ADR-005](../decisions/ADR-005-dated-all-mechanism-absence.md); as_of оценки отделён от reviewed_at. Коррекция расшифровки или привязки снимает зависимый R3 до повторной проверки. Сигналы и PDF: [feature](../FEATURE_SIGNALS.md), [ADR-006](../decisions/ADR-006-immutable-signals-pdf.md), миграция e87f4d01a921.

## Семь основных решений

| № | Решение | Почему | Цена/ограничение |
|---|---|---|---|
| 1 | Один репозиторий, модульный backend, отдельный worker из той же сборки | Общая модель и транзакции, простой запуск, без микросервисных контрактов | API и worker обновляются совместно |
| 2 | Next.js/TypeScript/Tailwind + FastAPI/Pydantic/SQLAlchemy/Alembic + PostgreSQL | Следует профилю CODEX_TZ; SQL-транзакции связывают решение, риск и аудит | Два языка; версии и lock-файлы поддерживаются совместно |
| 3 | PostgreSQL — очередь заданий и источник бизнес-состояния; файловый volume — оригиналы и PDF | Задачи переживают рестарт, не нужен Redis; файлы не раздувают БД | Нужен lease/recovery и согласованный backup БД+файлов |
| 4 | Tesseract rus+kaz+eng → правила RU/KZ → RapidFuzz → ручная проверка | Содержательный OCR на новом вводе; правила прозрачны; LLM не блокирует P0 | Качество измеряется отдельно; неоднозначные случаи идут человеку |
| 5 | Риск рассчитывает только backend, из подтверждённых фактов, с версией и снимком сигнала | A/B/C воспроизводимы; результат можно объяснить и пересмотреть | Требуются отдельные статусы гипотез, факторов, сигналов |
| 6 | Leaflet 1.9.4 и один настраиваемый HTTPS XYZ raster-провайдер; координаты seed вручную | Карта и таблица получают одну страницу API, серверные баллы и общие фильтры; без GIS | Реализовано: fallback/отсутствие координат, атрибуция, keyboard/mobile/200% zoom; без bulk offline tiles. Публичные build args и охват страницы — [FEATURE_MAP](../FEATURE_MAP.md) |
| 7 | Локальное демо в Linux-контейнерах, серверная идентичность аналитика, изолированный импорт | OCR/PDF имеют системные зависимости; автор решения проверяется сервером | Локальный Docker проверен; второй ПК, public production и ведомственный SSO отдельны |

Общее архитектурное обоснование — [ADR-001](../decisions/ADR-001-mvp-baseline.md). Базовая архитектура принята пользователем; реализация подтверждается отдельно по срезам.

## Компоненты и потоки

Telegram (дополнение U, 16.10.2026): review CONFIRMED → `telegram_notifications` в той же транзакции → существующий worker → фиксированный HTTPS Bot API. Очередь отделена от AnalysisJob; токен только в env, получатель закреплён в событии после одноразовой private-привязки. Сеть вне транзакции решения; UNKNOWN не повторяется автоматически. Дополнительные побочные эффекты review явно описаны в контракте. Нет новых публичных endpoints/сервисов/dependencies. [FEATURE_TELEGRAM](../FEATURE_TELEGRAM.md), [ADR-009](../decisions/ADR-009-telegram-outbox.md).

Дополнение 16.10.2026: [история объекта](../FEATURE_PROPERTY_HISTORY.md) читает существующий audit endpoint, с теми же session/ролями и серверной пагинацией. DTO дополнен `actor_display_name` (текущий профиль) и `risk_code`; два пакетных lookup по странице, без новой таблицы/миграции. Сохранённые audit metadata, решения и snapshots не изменяются. Полноценный temporal replay и историческое имя автора для старых audit events этим не создаются.

```mermaid
flowchart LR
    A[Аналитик] --> F[Next.js UI]
    F -->|API того же origin| B[FastAPI]
    B --> D[(PostgreSQL)]
    B --> V[(Файловый volume)]
    W[Worker из backend] --> D
    W --> V
    W -. план .-> C[Collector HTTPX / BeautifulSoup]
    W --> O[Tesseract / Extractor / Matcher]
    W --> P[WeasyPrint]
    C -. только разрешённый источник .-> X[Внешний HTML]
    B --> R[Детерминированный scorer]
```

UI вызывает API через same-origin proxy. В режиме карты браузер отдельно получает только видимые raster-тайлы от настроенного HTTPS-провайдера; бизнес-поля остаются в приложении, IP/Referer и область просмотра доступны провайдеру. Браузер не обращается к БД, хранилищу или collector напрямую. Backend создаёт job и отвечает 202. Worker получает job из БД, сохраняет исходный материал, затем версии OCR/извлечения/кандидатов. Результат анализа не меняет CONFIRMED-факторы. Analyst review отдельной командой создаёт решение.

При подтверждении фактора backend проверяет доказательства, область/дату, роль и optimistic version; в одной транзакции с блокировкой строки объекта/риска сохраняет событие проверки, обновляет актуальный фактор, пересчитывает риск и добавляет audit_event. Это сериализует и одновременные решения по разным факторам одного объекта. Ошибка откатывает всё. После ответа UI обновляет объект и summary; WebSocket/SSE для MVP не нужен.

Создание сигнала фиксирует снимок текущей версии риска и доказательств. Утверждение требует совпадения версии со свежим состоянием объекта; иначе 409 и новый снимок. Изменения факторов помечают предыдущие сигналы устаревшими для текущего решения, но не меняют их историческое содержимое/PDF. PDF-asset привязывается к снимку и конкретной ревизии решения; PDF черновика после утверждения остаётся отдельным историческим asset, его файл не перезаписывается. GET pdf возвращает файл актуальной ревизии решения, прежние файлы доступны через сохранённые asset-ссылки. Доработка возвращённого сигнала создаёт новую версию через POST signals с previous_signal_id.

## Модель данных

| Сущность | Ответственность и важные связи |
|---|---|
| users, sessions | Локальные учётные записи аналитиков; сервер определяет автора и роль |
| developers | Юридические лица с ролью застройщика/уполномоченной компании/подрядчика; БИН с происхождением |
| properties | ЖК/очередь/корпус: parent_id, level, имя/алиасы, город, адрес, stage, готовность и дата, отдельные latitude/longitude, is_demo |
| legal_bases | Механизм, документ, проверка, применимость во времени; property_id указывает конкретную область, наследования нет |
| advertisements | Публикация, неизменяемый исходный текст, URL/площадка, published_at nullable, captured_at, revision, is_demo |
| advertisement_assets | Сохранённые текст/HTML/изображения, тип, размер, SHA-256, безопасный storage_key |
| extraction_results | Версия pipeline, исходный OCR, исправления отдельной версией, поля с offsets/bbox, решения о гипотезах |
| property_matches | Кандидаты и строковое сходство; отдельная история ручного выбора/отклонения |
| evidence | Ссылка на конкретную версию материала/документа, буквальный фрагмент и даты; R5 — два датированных значения |
| risk_factor_reviews | Решения по кодам R1–R6: статус, область, период, evidence_ids, автор, reason, revision; предыдущие решения сохраняются |
| signals | Неизменяемый JSONB-снимок, previous_signal_id, решение/автор/время, pdf_job_id и PDF-asset точной ревизии; аудит хранит историю команд |
| audit_events | Действие, actor_id, время, объект, old/new revision, причина, request_id; секретов и полного PII нет |
| analysis_jobs | ANALYZE / RENDER_PDF, state, stage, attempt, lease_until, ошибка, idempotency_key; IMPORT_URL запланирован |

Схему можно объединять только без потери происхождения и истории. ORM-модели — внутренние; наружу отдельные Pydantic DTO. JSONB допустим для вариативных полей извлечения/снимка, но не вместо ключей/связей и статусов.

UUID для идентификаторов; ISO-8601 timestamps с offset, UTC в БД; отображение Asia/Qyzylorda (+05:00). Unknown даты/координаты остаются null. Денежные суммы передавать десятичной строкой и хранить Numeric, не binary float. Географические поля названы явно, без неоднозначного порядка массива.

## Состояния и инварианты

- Job: QUEUED → RUNNING → SUCCEEDED / FAILED / BLOCKED. BLOCKED означает, например, запрет доступа источника; ERROR не интерпретируется как отсутствие объекта.
- Гипотеза: PENDING → CONFIRMED / CORRECTED / REJECTED. Исправление сохраняет оригинал; смысловая коррекция требует причины.
- Match: PENDING → CONFIRMED / REJECTED. Выбор одного кандидата не подтверждает остальные. Изменение подтверждённой связи требует повторной проверки зависимых факторов.
- Legal verification: UNKNOWN / PENDING / VERIFIED_VALID / VERIFIED_ABSENT / REJECTED. Новое отсутствие всех механизмов фиксируется отдельным датированным R1, не статусом отдельного LegalBasis и не бессрочным агрегатом объекта. Текущий legal status вычисляется из документов; legal_absence_as_of показывает дату CONFIRMED R1 отдельно. Legacy DEMO VERIFIED_ABSENT сохраняется до явного пересмотра старого R1; пустой legal_bases не создаёт его.
- Фактор: UNKNOWN / PENDING / CONFIRMED / REJECTED. В текущей реализации одна актуальная запись на property_id+code; её as_of и прежние решения сохраняются в аудите. Отдельного набора факторов для каждого исторического периода пока нет. UNKNOWN/PENDING/REJECTED = 0.
- Сигнал: DRAFT → CONFIRMED / RETURNED; новая редакция отдельной записью. PDF generation_state отдельно: NOT_REQUESTED / QUEUED / READY / FAILED.

R1 требует одного LEGAL_ABSENCE_REVIEW с конкретной областью, absence_as_of, датой документа и отдельными результатами/причинами всех трёх проектных механизмов. Неполные/UNKNOWN/NOT_FOUND/UNAVAILABLE материалы можно сохранить, но нельзя подтвердить по ним R1. Факты evidence копируются сервером из самостоятельного документа с проверкой SHA. Дата документа может быть позже оцениваемого отсутствия; as_of фактора должна точно совпасть с absence_as_of. Это проектная процедура, не автоматическое юридическое заключение.

Применимый VERIFIED_VALID или неразрешённый PENDING того же ЖК на дату отсутствия блокирует создание/подтверждение R1 с 409; учитываются период и календарная дата выдачи документа. Обратное подтверждение VERIFIED_VALID на дату уже CONFIRMED R1 также блокируется. Наличие гарантии другого корпуса или документа более позднего периода не создаёт этого противоречия. Новые контрматериалы PENDING сохраняются для ручного разрешения; старое решение не отменяется скрыто.

При подтверждении R1 или R2 сервер дополнительно проверяет перспективную пару CONFIRMED: нужна известная published_at хотя бы одного проверенного источника оплаты, точно совпадающая с as_of R1 как timezone-aware момент. captured_at и reviewed_at не заменяют дату публикации. Несогласованные события, включая разные моменты одного дня, дают 409 в обоих порядках подтверждения. Формула/веса сохранены; R2/R3 без R1 не требуют такой пары. Строгое равенство — консервативное ограничение текущей модели без интервалов отсутствия. R5 отдельно проверяет два сопоставимых evidence и расхождение ≥20 п.п.

Произвольный расчёт риска на историческую дату ещё не реализован. Сигнал уже сохраняет фактические as_of и версии решений в историческом снимке; более поздний документ не меняет этот JSON или ранее выпущенный PDF. Отсутствующий период или юридическая неопределённость требуют ручного решения, а не придуманной автоматической даты истечения.

## Надёжность worker

Один worker в MVP. Задание захватывается атомарно в PostgreSQL, сохраняются lease и attempts; истёкший RUNNING восстанавливается без повторного бизнес-эффекта. Новая команда с тем же Idempotency-Key и тем же телом возвращает прежний результат; с другим телом — 409. Повторный анализ создаёт новую версию извлечения, не затирает рассмотренную.

Анализ и PDF используют одну очередь с ограниченным числом попыток, lease и claim token. PDF дополнительно проверяет target_revision и текущий pdf_job_id перед публикацией результата: поздний worker не меняет файл нового решения. Рендер выполняется в subprocess с PDF_TIMEOUT_SECONDS (default 60, диапазон 1–90), ограничениями входа и результата. Сетевые timeout/retry-параметры collector остаются проектными до выбора разрешённого источника; бесконечные retries и обход 401/403/CAPTCHA не предусмотрены.

## Безопасность и границы доверия

16.10.2026 подготовлен [изолированно проверяемый HTTPS-транспорт](../FEATURE_URL_IMPORT.md): точный hostname/path allowlist, проверка всех DNS-адресов и redirects, соединение с закреплённым IP при сохранении TLS hostname, лимиты ответа и общий subprocess timeout. Источник не включён, parser/jobs/storage/API/UI ещё не интегрированы. Решение — [ADR-008](../decisions/ADR-008-bounded-url-transport.md); C-01 остаётся незавершённым.

Для localhost-демо — серверные сессии, password hash, login/logout/me, cookie HttpOnly/SameSite, CSRF token для небезопасных методов и проверка Origin. Автор из сессии; actor_id из request body не принимается. Две роли достаточно: analyst (работа и проверка), viewer (чтение). Второй обязательный проверяющий и ведомственный SSO не заявлены реализованными.

В Compose наружу по умолчанию привязывается только UI к 127.0.0.1; API/БД внутри сети.20.10.2026 развёрнута отдельная Oracle Micro: public+https+prebuilt overrides, Caddy80/443/TLS, Secure cookies/HTTPS Origin, прежняя авторизация и восстановленная пара DB/storage. Локальный runtime сохранён. [Runbook/фактическая приёмка](../ORACLE_DEPLOYMENT.md), [ADR-027](../decisions/ADR-027-single-vm-https-deployment.md). Нельзя открывать demo-mode с общей идентичностью в интернет.

Требования к будущему URL-импорту: allowlist домена и путей, только HTTP(S), запрет credentials и произвольных портов; проверка DNS/всех редиректов, запрет private/loopback/link-local/reserved IP, защита от DNS rebinding закреплением проверенного адреса. Прокси из окружения не наследовать без настройки. Копия HTML хранится как данные; не исполнять scripts, не отображать raw HTML в UI. robots.txt — дополнительный технический сигнал, а не единственное доказательство разрешения. Пользователь предоставил реестровые источники: [каталог](../DATA_SOURCES.md) различает наблюдавшиеся страницы, описание API и ещё не проверенные выгрузки. Импорт реестров остаётся отдельным P1; рекламный C-01 collector — BLOCKED до подходящего источника/условий и фактического импорта. Каталог не меняет компоненты или контракт.

Uploads сейчас: PNG/JPEG/TXT для рекламы; supporting documents также принимают passive PDF через [bounded Linux subprocess](../FEATURE_SUPPORTING_PDF.md). Проверяются содержимое/MIME, размер MAX_UPLOAD_BYTES и ограничения изображения; случайный storage_key вне webroot, запрет traversal и inline active content. OCR — subprocess с timeout и без shell; OCR PDF не реализован. Supporting originals выдаются как authenticated attachment с CSP sandbox/nosniff, имена файлов не становятся путями. PDF parser не является антивирусом или очисткой оригинала.

PDF: только доверенный server-side шаблон, экранирование текста, локальные шрифты с RU/KZ, custom resource loader без сети и без произвольного file://. Оригинал рекламы не становится HTML/CSS шаблоном WeasyPrint. Логи не содержат секреты, session/CSRF tokens и лишние персональные данные.

Текущие read-only PDF exports имеют DOCUMENT_PDF_TIMEOUT_SECONDS(default12,1–60),
ограниченный также общим PDF_TIMEOUT_SECONDS; child CPU12s/address1GiB и2slots
сохранены. Frontend PDF_PROXY_TIMEOUT_MS(default15000,max75000) действует только
на GET dossier/signal/record PDF. Остальные запросы, включая Threads, остаются15s.
Micro использует60s/75000ms из-за фактически измеренного throttled wall time.

Аудит приложения append-only для штатных операций, но администратор БД технически может его изменить. SHA-256 обнаруживает изменение сохранённого файла, не доказывает авторство/законность/судебную допустимость. Локальная проверка backup/restore выполнена: [LOCAL_BACKUP](../LOCAL_BACKUP.md). Production retention, внешнее резервирование и усиление аудита — отдельный этап.

## Структура после согласования

```text
frontend/                  Next.js app, components, API client, browser tests
backend/app/               api, schemas, models, services, worker, configuration
backend/tests/             unit и API/БД integration
backend/alembic/            миграции
contracts/openapi.yaml     согласованный внешний контракт
data/seed/                 синтетические ЖК, объявления и материалы
docs/                      требования, архитектура, UX, приёмка, решения
docker-compose.yml         UI, API, worker, PostgreSQL и volumes
.github/workflows/         проверки и сборка
```

Worker, uploads, анализ, предметные модули review, сигналы и PDF реализованы; collector остаётся целевым компонентом. Не добавлять универсальные repository/service/adapter-фабрики без конкретной потребности. Небольшие модули предметных сценариев предпочтительнее общего «менеджера».

## Контракт и проверка архитектуры

`contracts/openapi.yaml` — контракт 0.8.0-mvp с implementation metadata: 36 операций, 34 реализованы полностью, 1 частично и 1 PLANNED (collector). Login/me/CSRF, чтение объявления, review извлечения/документов/факторов R1–R6, выдача материалов и аудит расширяют исходный список CODEX_TZ; дополнения маркируются x-origin: proposal. Partial остаётся valid/rejected review отдельного LegalBasis: VERIFIED_ABSENT намеренно проходит отдельным составным R1, а не review одного основания.

OpenAPI и схемы реальных ответов проверяются backend-тестами; локальные итоговые прогоны — 279 backend в Linux и 17 browser. Первый удалённый [CI](https://github.com/temirkhanerbolatovich-coder/saq-qurylys/actions/runs/38696142426) для `dc595e2` прошёл: backend tests/migrations и frontend checks/build; в новом [CI 20ab6f4](https://github.com/temirkhanerbolatovich-coder/saq-qurylys/actions/runs/38703582239) все три jobs прошли, включая browser-e2e с Compose/OCR/PDF (279 backend / 17 browser). Локальная пара PostgreSQL+storage восстановлена и проверена по таблицам/истории/HTTP/PDF (LOCAL_BACKUP.md). Второй ПК и предметная приёмка остаются открыты: [чеклист](../REMAINING_CHECKLIST.md).

Исходные PDF проходят строгую проверку pypdf в отдельном Linux subprocess с CPU/AS/wall limits и двумя слотами на процесс API; форма upload ждёт в thread pool. Оригинал не очищается и не переписывается. Рекламные uploads/OCR остаются TXT/PNG/JPEG. Подробнее — [FEATURE_SUPPORTING_PDF](../FEATURE_SUPPORTING_PDF.md), [ADR-007](../decisions/ADR-007-bounded-passive-pdf-upload.md).

## CSV intake · 19.10.2026

`csv_import.py` валидирует/сопоставляет ограниченный файл, `api/csv_import.py`
реализует preview/commit/journal. Миграция `fb45a723c916` добавляет квитанции
`csv_import_batches` и fingerprints `csv_imported_materials`; новые материалы
используют существующие Advertisement/Asset/audit/Command. Preview read-only,
commit сериализован advisory lock, исходники и старые версии неизменяемы.
[ADR-021](../decisions/ADR-021-csv-material-intake.md), [поток/API](../FEATURE_CSV_IMPORT.md).

## Источники и история ·19.10.2026

`monitoring_runs.py` сохраняет намерение до внешнего I/O и исход вместе с audit;
`api/threads.py` использует его вокруг существующего preview. `api/monitoring_sources.py`
читает capability catalogue и пагинированную историю. Миграцияac56b834d027 добавляет
MonitoringRun; новые jobs/worker/scheduler не вводятся. [ADR-022](../decisions/ADR-022-durable-monitoring-runs.md)
и [feature flow](../FEATURE_MONITORING_SOURCES.md).
