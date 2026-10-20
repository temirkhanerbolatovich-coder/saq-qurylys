# Social Monitoring V2 — словари, профили и контекстные правила

## Интерфейс и сценарий аналитика ·20.10.2026

В исходниках/изолированном QA доступен `/monitoring?section=v2` — новая вкладка
существующего мониторинга. Рабочий localhost3000 ещё на прежней версии.
UI использует контракт0.31.0 и прежнюю миграцию ef90fc78b461;
новых endpoints, зависимостей, токенов и схем БД этот блок не добавляет.

1. В «Словарь V2 и активация» сверить SHA поставки, указать причину и сохранить
   словарь. Активация выбранной версии — отдельная кнопка с expected_revision;
   отключение тоже явное. История доступна без изменения состояния. Активация
   разрешает сохранение профиля, но не подтверждает права источника и не ищет.
2. Выбрать профиль V2 либо сохранить новый: название, RU/KZ/оба языка, бюджет1–100.
   Редактор сохраняет keyword=true, hashtag=false, max_query_length=300 и текущий
   активный dictionary ID; source_code=OFFLINE означает подготовку набора.
   Новая версия получает эти настройки; исходные параметры/SHA/фразы/пропуски
   исторического снимка остаются доступны в деталях. Сохранение не ищет.
   Профили1.0 остаются отдельными.
3. В текущей версии выбрать одну сохранённую фразу, RECENT/TOP, лимит1–50 и
   причину; отдельно выполнить один поиск. UI уважает access/cooldown.
   Историческая версия или неактивный словарь не запускаются. При ошибке исход
   доступен в прежней истории запусков; ошибка не подменяется пустой выдачей.
4. Прочитать сохранённый run ID. Для успешной V2-страницы явно сохранить находки
   с причиной; это отдельная команда без повторной сети. PARTIAL/одна страница
   и отсутствие полного охвата остаются видимыми.
5. В находках работают серверные фильтры priority/imported/run_id и пагинация.
   Выбор строки открывает точную версию; история и observations показывают run,
   profile version, query ID, дату и SHA. Исходный текст не переводится/не усекается;
   длинный оригинал прокручивается внутри панели. NOT_RELEVANT не удаляет запись.
   Frozen приоритет/контекст пока только читаются, а не решаются аналитиком.
6. Для импорта выбрать observation этой версии, указать причину и заново отметить
   TEXT_ONLY/непроверенные медиа. Пустой текст не импортируется. Успех ведёт в
   существующий материал; повтор показывает тот же материал. Анализ, кандидат,
   создание/выбор досье, match, гипотеза, evidence, R1–R6 и сигнал самостоятельны.

Отдельные URL-параметры: `v2_profile_id`, `v2_profile_revision`, `v2_profiles_page`,
`v2_run_id`, `v2_finding_id`, `v2_finding_version`, `v2_findings_run_id`,
`v2_findings_page`, `v2_priority`, `v2_imported`. Прежние q/candidate/property/
query_profile/run IDs не удаляются. Панель загружается при первом посещении и
затем остаётся mounted. Выбор/раскрытие/Enter/GET не отправляют команды.
Malformatted ID даёт ошибку; предыдущий ответ не показывается под новым ID/версией.

Причины/параметры используют прежние user/session/context черновики и
useMonitoringCommand с тем же UUID при явном повторе одинакового payload.
409/ошибка не сбрасывают ввод; обновление читает API и требует сверки.
TEXT_ONLY не хранится и сбрасывается после reload, смены версии или observation.
Viewer читает историю без команд. Сервер без V2 показывает ошибку и GET-retry;
ошибка не выглядит пустым результатом. Источник и авторские причины не переводятся.

Приёмка разделена: presentation ответы покрывают search/capture/ошибки/роли/retry;
actual API/worker проверены с отдельно созданными DEMO DB fixtures двух версий
и observations. Внешний поиск выключен; fixtures не являются ответом Threads.
Проверены импорт исторической версии, точные bytes/SHA оригинала, отдельные
candidate/dossier/match/hypothesis/evidence/R2: score0 до решения и25 после,
UNKNOWN без автоматического R1, сигнал и скачанный архивный PDF. Все3страницы
PDF просмотрены; текст/DEMO/UNKNOWN/источник/SHA проверены. RU/KZ375/768/1024/1440,
keyboard/focus и отсутствие POST/overflow проверены на actual QA страницах.
Финальные команды/результаты — PROJECT_STATUS и UI_AUDIT.

Открыто: finding-level resolution/review приоритета/false-positive решения,
независимый holdout, разрешённый live доступ и хранение реальной выдачи,
scheduler/paging/другие платформы, установка на рабочий runtime и внешняя
предметная/языковая/UX-приёмка. Полная готовность P0 не заявляется.

## Находки, запуски и импорт ·20.10.2026

Реализовано в исходниках/изолированном QA: контракт0.31.0, миграция ef90fc78b461.
Существующий Threads preview и профили1.0 сохраняют поведение. Рабочий сайт
этим блоком не обновляется. Все POST требуют analyst/session/CSRF/Origin и UUID
Idempotency-Key; viewer читает историю без права команд.

1. Сохранить V2-профиль по активному словарю. Взять query ID из frozen preview.
2. `POST /api/v1/monitoring/query-profiles/{id}/runs`: expected_revision,
   query_id, reason, search_type RECENT/TOP и limit1–50. Выполняется один выбранный
   keyword-запрос, не весь список профиля. Hashtag-план не исполняется текущим
   адаптером. Возможности offline preview не являются подтверждением доступа.
3. Run сохраняет profile request/version до I/O. Прежние access/cooldown/deadline
   и one-page transport сохранены; disabled даёт BLOCKED/503 без фиктивных данных.
   Повтор ключа читает исход даже после смены профиля/активации, без новой сети.
4. `POST .../findings/capture` принимает только run_id и reason; обрабатывает
   успешную сохранённую страницу без сети. Непроверенный client payload не
   принимается. Проверяются exact query/profile/dictionary и целостность словаря.
   Сохранённую страницу можно обработать после деактивации словаря. EMPTY даёт0;
   has_more даёт PARTIAL, coverage всегда SINGLE_PAGE_NOT_EXHAUSTIVE. SUCCESS
   относится к странице, не к полному покрытию платформы; прежние run-state имена
   сохранены. Capture/replay не создаёт публикации или решения риска.
5. `GET .../findings`: priority/imported/run_id/page/page_size≤100. Без run_id
   показывается самая поздняя по captured_at версия; с run_id — версия именно
   того запуска. `GET .../findings/{id}?version=N`, `.../{id}/versions`,
   `.../{id}/observations?version_id=<UUID>` дают постраничную историю.
6. `POST .../findings/{id}/imports`: version_id, observation_id, reason,
   text_only_acknowledged:true. Создаёт только Advertisement NEW и TEXT Asset
   с исходным текстом/датами и замороженным происхождением выбранного observation.
   Одна версия импортируется один раз независимо от ключа/автора. Иная версия
   может быть импортирована отдельно; предыдущий материал не переписывается.
   Анализ, resolution, кандидат/досье, match, evidence, R1–R6 и сигнал самостоятельны.

Идентичность — THREADS/external ID/data mode. Текущий источник требует внешний ID;
URL-fallback других платформ не реализован. Принимается только сохранённый official
Threads result, поэтому REAL; файловый/DEMO intake этим API не выдаётся за live.
Normalized content SHA включает текст/URL/published_at/media metadata, не дату
повторного получения. Все query IDs доступны через observations; токены/paging URL
не сохраняются. Изменённые content/dictionary/rules создают новую версию;
A→B→A тоже создаёт ревизию. Номер отражает порядок записи, актуальность — время
получения и номер при равенстве. Запоздалый capture не вытесняет свежую страницу.

Контекст/приоритет frozen с dictionary ID/SHA/rules; WAITING_REGISTRY и
geography_confirmed=false сохраняются. Пустой текст и текст длиннее20k сохраняются
NEEDS_CONTEXT/NOT_ANALYZED без усечения оригинала; пустой текст не импортируется.
Медиа не скачиваются: TEXT_ONLY и VIDEO_NOT_ANALYZED/MEDIA_NOT_ANALYZED явны.
Исходный адаптер ограничен50k символами/пост и одной страницей. Сетевые ошибки,
BLOCKED и неизвестный исход не создают находки. Версии immutable через API,
не от администратора БД. [ADR-026](decisions/ADR-026-versioned-monitoring-findings.md).

78focused API/DB/contract tests PASS; после финального audit штриха16focused PASS: dedup/replay/concurrency,
изменение/возврат текста, поздний capture, смена профиля/активации, границы доступа,
роли/CSRF и отсутствие изменений risk. Положительные source-ответы синтетические
с подменённым transport; живая выдача не заявляется. Production build и isolated
startup/migration/alembic check/restart/blocked replay PASS. Точные результаты,
полный backend и сохранность primary — PROJECT_STATUS.

UI и DEMO browser-путь до human review/PDF добавлены следующим блоком выше.
Finding-level resolution/priority/false-positive review ещё открыты. Live acceptance требует
подтверждённого разрешённого доступа; holdout/scheduler/paging/другие платформы
остаются отдельными этапами. Полный P0 ещё не объявлен завершённым.

19.10.2026 пользователь явно поручил «гоу начнем работу над парсер V2».
Это снимает прежнюю отсрочку разработки. Старые результаты приёмки относятся
к своим версиям; текущий срез ещё не установлен на рабочий сайт.

## Gap-analysis по текущему коду

| Область ТЗ | Уже есть | Решение / остаток |
|---|---|---|
| Профили | query_profiles.py, MonitoringQueryProfile/Version, immutable параметры1.0/2.0 | V2 сохраняет ID/SHA словаря и готовый preview; история не перекомпилируется |
| Словарь/запросы | UI-словарь1.0 не равен переданному v1/v2 | В этом срезе отдельный чистый loader и offline compiler |
| Поиск/доступ | threads_search.py, api/threads.py, явный preview | Не менять доступ; возможности в offline CLI только заявленные входы, не проверенная интеграция |
| Прогоны | MonitoringRun, begin_run/finish_run, сохранённый query/result | Расширять прежнюю сущность; RUNNING/INTERRUPTED и EMPTY не терять при будущем mapping в SUCCESS/PARTIAL/FAILED/BLOCKED |
| Импорт | CSV, ограниченный URL import, Advertisement/jobs/OCR/review/PDF | Переиспользовать; finding import требует отдельного действия и происхождения |
| Кандидаты/реестр | MonitoringCandidate/Observation/RegistrySnapshot/Comparison | Переиспользовать; не создавать Property из alias, REAL не сравнивать с DEMO |
| Расписание | UrlSchedule/Run для точных разрешённых URL | Не выдавать за поисковое расписание; последнее требует доступа/курсорных checkpoint/квот |
| Контекст/находки | RU/KZ rules, immutable finding versions/query observations и явный import | Сервер/UI в QA; finding-level resolution/review ещё открыты |
| UI | Вкладка V2 в мониторинге, версии/импорт и DEMO путь до PDF | Primary install и независимая/live приёмка не выполнены |

## Что реализовано

`backend/app/social_dictionary.py`: Pydantic проверяет форму исходного словаря
и расширений, шаблоны/ссылки групп, safety flags. Чтение ограничено512KiB;
неверный UTF-8, дубли ключей, неизвестные поля, управляющие символы и NaN отвергаются.
V2 требует оригинальные bytes: based_on_original_sha256 и все оригинальные поля
должны совпасть. Исходные bytes неизменяемы; возвращаемая модель — новая копия.
Метаданные содержат version/content_sha256/source и NOT_ACTIVATED/activated_at=null.
Это метаданные offline loader; реальное состояние активации хранится отдельно в БД.
Политики будущей классификации сохраняются; их наличие ещё не реализует правила.
`extraction_patterns.year_regex` хранится как строка и не исполняется.

`backend/app/social_queries.py`: детерминированный preview, original seeds RU/KZ
чередуются и имеют приоритет, затем ограниченные template tuples по группам,
дополнительные seed и исходные теги. Для каждой пары template/language берётся
один набор токенов, без декартова произведения. Это ограниченная выборка, не
обход всех20ЖК/55алиасов. Шаблон с phase не получает выдуманную очередь; явные
имена Altyn Uia2/III в original seeds остаются без замены. Дополнительный подбор
проектов/очередей в профиле — дальнейшая работа.

Нормализованный ключ NFKC/casefold/пробелы используется только для dedup;
оригинальные строки сохранены в origins. Повторные теги объединяют origins.
ID учитывает SHA словаря, источник, discovery kind и нормализованную фразу,
не зависит от бюджета. При изменении bytes словаря ID меняется. Каждая запись
помнит origin/template/tokens/region/priority, версию/SHA и last_executed_at=null.
Число priority здесь означает порядок генерации, не P1/P2/P3 и не R1–R6.

Бюджет из словаря(default25), явное переопределение1–100. Неподдерживаемые или
слишком длинные запросы не занимают бюджет; omitted_queries объясняет причины.
Keyword и hashtag независимы. Совпадение географии/контекста требует локальной
проверки, поэтому доступный тип получает LOCAL_FILTER_ONLY, а не обещание AND/
геофильтра платформы. Без capabilities все запросы UNSUPPORTED. Флаг capability
не предоставляет доступ: отчёт всегда OFFLINE_PREVIEW/ACCESS_UNVERIFIED.

## Запуск

Из корня с существующими зависимостями backend:

```powershell
.venv/Scripts/python.exe scripts/preview_social_queries.py
.venv/Scripts/python.exe scripts/preview_social_queries.py --capability keyword --budget 25
.venv/Scripts/python.exe scripts/preview_social_queries.py --capability keyword --capability hashtag --language kk --budget 10
```

JSON идёт в stdout; при необходимости сохраняйте под ignored `.local/` или
`output/`. CLI читает локальные файлы, не открывает URL из sources_used, не читает
токены/.env, не обращается к БД/сети, не создаёт задания и не активирует словарь.
Без `--capability` selected queries пусты, но причины и исходные гипотезы видны.
Ошибки дают exit2 без вывода содержимого недоверенного JSON. Это инструмент
из checkout; оба docs-словаря также включены в backend Docker image для API.

## Хранение и активация ·19.10.2026

Миграция `df89eb67a350` добавляет версии словаря (исходные bytes v2 и оригинала,
SHA, автор/дата) и append-only журнал активаций. Запуск миграции/приложения
сам по себе ничего не регистрирует и не активирует. Старые профили получают
schema1.0 без изменения параметров и сохранённых фраз. Обратная миграция
отказывается удалять непустую историю V2; нужен backup/restore, а не потеря данных.
Решение и границы: [ADR-025](decisions/ADR-025-monitoring-dictionary-history.md).

Сценарий API для аутентифицированного аналитика:

1. `GET /api/v1/monitoring/dictionaries/bundled`: проверить metadata/SHA
   поставляемого файла. `NOT_ACTIVATED` здесь описывает offline artifact;
   текущее состояние читать отдельным `GET .../dictionaries/activation`.
2. `POST /api/v1/monitoring/dictionaries` с `expected_sha256` и `reason`:
   сохранить проверенные bytes из поставки; одинаковый SHA не дублируется.
   Загрузка произвольных JSON/путей/URL не поддерживается.
3. `POST .../dictionaries/activations` с `dictionary_id`, `expected_revision`
   и `reason`: явно активировать версию. `dictionary_id:null` отключает её;
   повторная активация прежнего ID создаёт новую запись, не меняя историю.
4. `POST /api/v1/monitoring/query-profiles` с `name` и `parameters`, например
   `{"dictionary_version":"2.0","dictionary_id":"<UUID>","keyword":true,"budget":3}`.
   Словарь должен быть активен в момент сохранения. Snapshot включает готовые
   queries/IDs/origins/omitted reasons и activation revision/time.
5. Список и detail V2 читать с `?dictionary_version=2.0`; историческую версию —
   дополнительно `&revision=N`. Без явного фильтра обслуживается1.0; чужой
   schema detail возвращает404. Обновление требует `expected_revision`;
   переключить schema существующего профиля нельзя — создайте другой профиль.

Все POST требуют session, CSRF/Origin и UUID `Idempotency-Key`; повтор команды
возвращает прежний результат без повторного изменения. Viewer может читать,
но не изменять. Stale revision/SHA/неактивный словарь дают409, неизвестный ID404,
неверные параметры422, недоступная поставка503 без раскрытия внутренних путей.
`GET .../dictionaries` и `GET .../dictionaries/activations` имеют pagination.
Активация и сохранение V2 профиля сериализованы общей transaction advisory lock.
Прочитанная история остаётся прежней после смены активного словаря/перезапуска.

Контракт0.30.0. Профиль V2 пока только `source_code:OFFLINE`: capabilities —
заявленные входы preview, `ACCESS_UNVERIFIED` сохраняется. Эти операции не
запускают сбор, runs, jobs, OCR и не создают evidence/Property/R1–R6. UI активации
и findings/import добавлены последующими блоками выше; весь P0 ещё не принят. Приложение
обеспечивает неизменяемость через отсутствие update/delete API, но это не защита
от администратора БД; SHA повторно проверяется перед использованием словаря.

## Контекстный срез19.10 · rules social-context-0.1

`backend/app/social_context.py` принимает текст до20 000 Unicode-символов и
валидированный v2 snapshot. Исходник не переписывается; matched_spans, payment
context/amount_span, completion_years и project span хранят точные start/end/text.
Индексы — Python Unicode code points, не JavaScript UTF-16; при будущей подсветке
нужно учитывать разницу. Текущий UI показывает готовые span.text отдельным списком,
не режет JavaScript-строку этими offsets. Результат содержит SHA текста/словаря и rules_version.

Применяются словарные strong/weak geo, aliases, construction/marketing extensions
и negation phrases; regex литералов экранируется. Региональная гипотеза требует
сильной географии и контекста жилья; слабое «УК/Ука» не устанавливает город.
Все названия остаются CANDIDATE/NEEDS_CONTEXT, не подтверждённой идентичностью.
Самые длинные alias совпадения имеют приоритет; family и явная phase раздельны,
включая quoted family. Неизвестное название после ЖК в кавычках возвращается
как NEEDS_RESOLUTION. Новые Property/Developer/candidate_object_id не создаются:
постоянная сущность кандидата будет добавлена на этапе интеграции, не выдумана здесь.

Для границ фрагментов, денежных сумм и базовой проверки отрицаний повторно
используются pure helpers из существующего extraction.py без его изменения.
Дополнительные правила разделяют payment timing BEFORE_COMMISSIONING /
AFTER_COMMISSIONING / UNKNOWN / NEGATED, исключают нулевые суммы, отрицательные
перечисления, условное получение разрешения и банковский контекст из upfront
гипотез. Смешанные before/after в одном фрагменте дают timing_conflict и UNKNOWN.
50% после сдачи не считается предоплатой; цена без требования платежа не даёт P1.
Сумма/процент сохраняются отдельно, получатель без доказательства — UNKNOWN;
BANK_CONTEXT означает контекст текста, не установленную личность получателя.

P1/P2/P3 — только предложение очередности просмотра. NOT_RELEVANT/NEEDS_CONTEXT
сохраняют причины и фрагменты. Предупреждения с цитируемой рекламой, географический
конфликт и явно сданный дом консервативно направляются в NEEDS_CONTEXT. Аренда/
ремонт в одном фрагменте не удаляют отдельное положительное рекламное условие.
Все результаты OFFLINE_HYPOTHESES/WAITING_REGISTRY, geography_confirmed=false;
никаких баллов, evidence, решений или переходов REAL→DEMO.

Запуск из корня:

```powershell
.venv/Scripts/python.exe scripts/analyze_social_text.py "path/to/material.txt"
```

CLI читает только локальный UTF-8(также BOM) и сохранённые словари, выводит JSON
в stdout. Не обращается к URL/БД, не импортирует публикации и не сохраняет решения.
Неверные bytes/размер/путь дают exit2 без echo содержимого. Сеть/источники не включены.

**Проверки:**54новых context/CLI tests (включая все10примеров словаря и hard
negatives) +47dictionary +145существующих extraction tests = **246PASS2.10s**.
Команда из backend:
`../.venv/Scripts/python.exe -m pytest tests/test_social_context.py tests/test_social_dictionary.py tests/test_extraction_payments.py tests/test_extraction_payment_fields.py tests/test_extraction_names.py -q`.
Ruff check/format --config backend/pyproject.toml для3новых файлов; diff-check.

**Ограничения:** детерминированные лексические правила, не полноценный RU/KZ
морфологический/семантический анализ. Используются Unicode case-insensitive
совпадения и гибкие пробелы; OCR опечатки/произвольная транслитерация не гарантированы.
OUTSIDE_GEO пока распознаёт ограниченные явные формы Москва/Алматы/Астана;
отсутствие совпадения не доказывает геолокацию. Контекст предупреждения и явно
сданного дома оценивается консервативно на уровне публикации. Сложные смешанные
предложения, несколько получателей/объектов и произвольные некавыченные новые
имена требуют аналитика. Полные даты сдачи ещё не извлекаются, только годы20XX.
Это синтетическая техническая регрессия, не precision/recall на независимой рекламе.

## Проверки и оставшийся P0

```powershell
cd backend
../.venv/Scripts/python.exe -m pytest tests/test_social_dictionary.py -q
```

47PASS: v1/v2/SHA/оригинал/пределы/шаблоны/дубли/safety flags/бюджет/стабильныеID/
capabilities/казахский Unicode и4CLI сценария. Ruff check/format PASS.
Это результат первого offline-среза. Для текущего API/DB блока полный backend
запущен отдельно; фактический результат и Docker smoke записаны в PROJECT_STATUS.
Browser suite не повторяется: frontend в этом блоке не менялся.
Это не приёмка всего P0 и не измерение точности на реальной рекламе.

Дальше по порядку:
1. Первый контекстный rules-срез реализован выше. Независимый RU/KZ holdout,
   полнота дат/морфологии и сложные смешанные объявления остаются открытыми.
2. Версия/активация словаря, V2 профили, finding versions/query observations,
   дедуп/история, явный импорт и UI реализованы в QA. Далее finding resolution/review;
   полный mapping run statuses/paging/scheduler остаются отдельными.
3. UI и DEMO end-to-end до human review/PDF проверены; установка на primary отдельно.
4. Live acceptance только при подтверждённом разрешённом доступе. Независимая
   разметка реальных RU/KZ, второй ПК/CI/сдача остаются отдельными условиями.
