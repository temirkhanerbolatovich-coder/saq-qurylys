# SQ-01–SQ-15: последовательное исправление

Дата начала: 20.10.2026 (Asia/Qyzylorda). Исполнитель: Codex.
Основание: полный текст ТЗ «SAQ_QURYLYS_CODEX_TZ_2026-10-20.md» внутри
пользовательского приложения `Вставленный текст.txt`, строки 344–477,
и реестр `docs/audits/SAQ_QURYLYS_UI_UX_ISSUES_2026-10-20.md`.

## Исходное состояние

- Ветка `codex/audit-workflow-fixes`, HEAD `b15608664f271367b3cc63505def5041f1c69117`.
- **NOT_COMMITTED**: до начала работы 278 изменённых/новых путей; 597 файлов
  в исходном SHA-256 manifest. Существующий diff сохранён, автоматический commit
  не разрешает однозначно отделить накопленные изменения.
- Приватные baseline status, binary patch, SHA manifest и логи:
  `.local/sq-fixes-20261020/`. Секреты тестового окружения не публикуются.
- Python 3.12.3, Node 24.12.0, Docker Engine 29.8.0; frontend Next 16.4.0,
  React 19.3.1. Команды определены в backend/pyproject.toml,
  frontend/package.json, CI и README.
- Новый PostgreSQL 17.9: `saq-sq-fixes-408e9ba9`, отдельный случайный порт
  только loopback, случайные credentials, без production volumes.
  pytest дополнительно создаёт собственные случайные схемы и temporary storage.
- Рабочие local/QA/production DB, исходники рекламы, архивные PDF и решения
  не используются для изменяющих проверок. Деплой/push не выполняются.

## Этапы

| Этап | SQ | Статус | Проверки / результат |
|---|---|---|---|
| 0 | SQ-15 | PASS | Full baseline 1185 PASS / 20 SKIP; final focused 113 PASS / 1 SKIP |
| 1 | SQ-01, SQ-02, SQ-03 | PASS | Backend167/1SKIP, Linux20PASS, browser14PASS, native PDF/archives/migrations PASS |
| 2 | SQ-04, SQ-05 | PASS | Backend151PASS; browser26PASS +13PASS; delayed native2PASS;Node13PASS |
| 3 | SQ-06, SQ-07, SQ-10, SQ-11, SQ-12, SQ-13 | PASS | Backend69/3WindowsSKIP +8PASS; Linux31PASS; browser39PASS; migration/static PASS |
| 4 | SQ-14 | PASS | Baseline 12 PASS; after 12 PASS; existing UI 11 PASS; build/format/diff PASS |
| 5 | SQ-09 | PASS | Browser51PASS38.9s; Node3PASS; lint/type/format/build PASS |
| 6 | SQ-08 | PASS | ActualGET8→4,decodedJSON17834→4217bytes; browser46PASS39.8s; static/build PASS |
| 7 | Все SQ | PASS с указанными ограничениями | Linux1252PASS; browser307PASS/1FAIL/9SKIP, единственный FAIL исправлен и отдельный retest1PASS; static/build/PDF PASS |

## Этап 0: подготовка и SQ-15

Причина: session-scoped test schema сохраняла QUEUED PDF после завершения
case. Следующий `analyzed()` ожидал, что один `process_one()` выполнит его
ANALYZE; корректный production FIFO выбирал более ранний PDF.

Исходное воспроизведение, cwd корень, runner явно подставляет disposable env:

```text
.venv/Scripts/python.exe .local/sq-fixes-20261020/run_tests.py stage0-before tests/test_signal_pdf.py::test_pdf_get_is_read_only_and_queue_is_idempotent tests/test_legal_absence.py::test_matching_absence_and_payment_are_red_in_either_order[absence-first]
```

Результат до изменения: **1 PASS / 1 FAIL**, 2.89 s. Правовой assertion не
ослаблялся; сбой в ожидании состояния ANALYZE (QUEUED вместо SUCCEEDED).

Изменяемые файлы:

- `backend/tests/conftest.py`: teardown закрывает оставшиеся QUEUED/RUNNING
  задания как FAILED с `TEST_TEARDOWN`, очищает lease/claim token только
  внутри случайной test schema. Записи/ссылки/assets сохраняются; integrations
  не вызываются; production worker/FIFO не изменяются.
- `backend/tests/test_queue_isolation.py`: реальные исходные cases в четырёх
  subprocess-сессиях (оба порядка и каждый отдельно), собственные schemas;
  отдельный тест сохраняет FIFO PDF → ANALYZE внутри одного case.

API/schema: без изменений. Архивы/история пользователя: без изменений.
Ruff check и scoped format check: PASS. Ошибка cleanup сохраняется с обязательными
request_id/fields; отдельный API regression проверяет исторический FAILED и
неизменность snapshot/decisions. Production API/schema без изменений.

Проверки:

```text
.venv/Scripts/python.exe .local/sq-fixes-20261020/run_tests.py stage0-final-focused tests/test_queue_isolation.py tests/test_signal_pdf.py tests/test_analysis.py tests/test_legal_absence.py
.venv/Scripts/python.exe .local/sq-fixes-20261020/run_tests.py stage0-baseline-full -rs
.venv/Scripts/python.exe -m ruff check backend/app backend/tests backend/alembic
.venv/Scripts/python.exe -m ruff format --check backend/app backend/tests backend/alembic
git -c core.safecrlf=false diff --check
npm run lint
npm run typecheck -- --incremental false
```

Final focused: **113 PASS / 1 Windows native Pango SKIP**, 77.19 s.
Full baseline: **1185 PASS / 20 SKIP / 0 FAIL**, 380.87 s. Этот параллельный
baseline стартовал до добавления request_id в cleanup и дополнительного API case;
финальную форму этих двух изменений покрывает final focused. Это baseline,
а не итоговая регрессия всех будущих этапов. 20 SKIP требуют Linux PDF/resource
runtime. Все перечисленные static/frontend проверки PASS; backend format140files.
Логи полных команд находятся в приватном evidence-каталоге исходного состояния.
Отдельно подготовлен disposable Linux container с read-only source mounts;
очередь/порядок/native WeasyPrint: **7 PASS**, 24.64 s, команда:
`docker exec saq-sq-fixes-linux-20261020 /tmp/sq-venv/bin/python -B -m pytest -q -p no:cacheprovider tests/test_queue_isolation.py tests/test_signal_pdf.py::test_real_weasyprint_renderer`.
Внешняя/production приёмка NOT_RUN.

Критерии этапа 0 выполнены: исходная перестановка/обратный порядок/одиночные
cases/весь legal-only набор проходят, FIFO сохраняется, baseline остальных тестов
измерен. Следующий шаг: этап 1 (SQ-01/02/03). Commit: NOT_COMMITTED.

## Этап 1: PASS — SQ-01, SQ-02, SQ-03

Новые рекламные evidence сохраняют nullable published_at, captured_at и явный
date_basis. event_at больше не подменяет неизвестную publication датой capture;
клиентские подмены даты отвергаются/заменяются серверными сведениями источника.
Legacy defaults используются только при чтении/сравнении, без backfill JSONB.
Формула риска и существующие date/legal guards не менялись.

UI и новые signal PDF показывают frozen period/verification_as_of/reviewed_at и
historical reviewer ID. PDF отдельно выводит confirmed/unknown codes, значение
нулевого score и обязательную оговорку GREEN. Даты generic документов остаются
датами событий. RU/KZ authored copy не переводит исходные цитаты/причины.

Файлы реализации: backend/app/analysis_dto.py, backend/app/api/reviews.py,
backend/app/signals.py, backend/app/pdf_render.py; frontend/components/
analysis-workspace.tsx, signals-workspace.tsx, frontend/lib/types.ts;
contracts/openapi.yaml. Новые tests/test_sq_historical_context.py и
frontend/tests/sq-historical-context.spec.ts; существующий review-workspace.spec.ts
обновляет только ожидаемую подпись неизвестной даты.
Документы: ADR-028, FEATURE_SIGNALS, UI_AUDIT, README, CHANGELOG,
PROJECT_STATUS, этот журнал. Контракт0.32.0: два необязательных output fields;
новых input fields, DB columns и миграций нет.

Проверки (корень, кроме npm из frontend):

```text
.venv/Scripts/python.exe .local/sq-fixes-20261020/run_tests.py stage1-backend tests/test_sq_historical_context.py tests/test_signals.py tests/test_signal_pdf.py tests/test_analysis.py tests/test_legal_absence.py tests/test_legal_bases.py tests/test_contract.py
.venv/Scripts/python.exe .local/sq-fixes-20261020/run_tests.py stage1-last-template tests/test_sq_historical_context.py
docker exec saq-sq-fixes-linux-20261020 /tmp/sq-venv/bin/python -B -m pytest -q -p no:cacheprovider tests/test_sq_historical_context.py tests/test_signal_pdf.py
.venv/Scripts/python.exe .local/sq-fixes-20261020/browser_tests.py stage1-browser-final tests/sq-historical-context.spec.ts tests/review-workspace.spec.ts tests/workflow-locale.spec.ts
npm run build
npm run lint
npm run typecheck -- --incremental false
npm exec -- prettier --check components/analysis-workspace.tsx components/signals-workspace.tsx lib/types.ts tests/sq-historical-context.spec.ts tests/review-workspace.spec.ts
.venv/Scripts/python.exe -m ruff check backend/app backend/tests backend/alembic
.venv/Scripts/python.exe -m ruff format --check backend/app backend/tests backend/alembic
git -c core.safecrlf=false diff --check
```

- Backend broad: **167 PASS / 1 Windows SKIP**,91.04s. Final template repeat:
  **12 PASS**,5.58s. Затем добавлен native-only archive case, проверенный Linux.
- Final Linux: **20 PASS / 0 SKIP**,11.02s. Настоящий старый PDF до/после изменения
  текущего объекта совпадает по bytes/SHA через обе GET-ссылки; template rerender
  запрещён sentinel. Snapshot/decisions неизменны. Windows этот case пропускает.
- Browser final: **14 PASS**,21.3s,без retries.7 новых presentation cases,
  старые mocked recovery/drafts и настоящий analysis/review путь с worker.
- Новый isolated schema: Alembic upgrade head/check PASS,
  «No new upgrade operations detected»,stage1-migrations.log.
- Build/lint/typecheck/Prettier/Ruff/format141files/diff check PASS.

Промежуточные browser failures не скрыты: dev HMR не давал загрузить страницу;
dead API не поддерживал pre-fixture login. Первый production run10PASS/2FAIL:
не запущен disposable worker и неправильный label locator нового теста.
Исправлен harness и role locator; финальные14cases проходят. Это не изменения
production прав или assertions. Отдельная промежуточная опечатка нового archive
теста исправлена до финального Linux20PASS.

Ручные evidence: три новых native DEMO PDF (known/unknown/legacy),по3страницы;
семантические assertions RU+KZglyphs, SHA receipts в pdf-stage1/result.json.
Все9страниц просмотрены на contact sheet,unknown3 дополнительно в полном размере;
overlap/clipping/tofu не обнаружены. Poppler выдал warnings о nameToUnicode
Bulgarian/Greek/Thai путях под Windows; PNG созданы,целевые RU/KZ проверены.
UI:8screenshots RU/KZ375/768/1024/1440; automated page overflow отсутствует,
визуально просмотрены mobile legal/source и desktop KZ. Evidence сохранён в
`.local/sq-fixes-20261020/pdf-stage1` и `visual-stage1`.

Ограничения: полный WCAG/screen reader/внешняя правовая и языковая приёмка
NOT_RUN. Общий ru-RU date helper и старые authored labels относятся к этапу5;
новые labels локализованы. Production/рабочие DB/storage не затрагивались.
Исполнитель Codex+два scoped агента;NOT_COMMITTED,исходный diff сохранён.
Следующий этап:2 (SQ-04/SQ-05);до фиксации этого PASS не начинался.

## Этап 2: PASS — SQ-04, SQ-05

MANUAL PAYMENT_TERM: точная цитата/codepoint offsets, immutable extraction/source,
PENDING, frozen author/time/reason и audit. Отдельный другой analyst подтверждает
или отклоняет. Самопроверка403, CORRECT422; запись не даёт evidence/баллы.
Штатные match→evidence→отдельный R2 сохраняются. False-negative разрешается только
по совпадающему authenticated audit, не по флагу MANUAL. Дубликаты/границы/CSRF/
roles/revision/idempotency/DEMO/latest/исходныйSHA защищены. Контракт0.33.0;
JSON hypotheses, без schema migration/backfill. ADR-029 прочитан до реализации.
Форма встроена и в `/advertisements/[id]`, и `/review`, черновики/цитаты RU/KZ
сохраняются; история предложений и независимых решений видима.

PDF: shared `frontend/lib/pdf-read.ts`;client90s,exactGETPDFproxy75sdefault/max,
document renderer<=60s. Non-PDF/commands15s. Cancel/timeout различаются RU/KZ;
MIME/header/nonempty проверяются, поздний ответ не скачивается, только явныйGETretry.
Downstream abort передаётся upstream; уже запущенный renderer имеет свой limit.
Исторические PDF не перезаписываются. Caddy reverse_proxy без короткого явного
response header deadline; production параметры не менялись.

Изменённые пути: backend/app/{analysis_dto.py,api/analysis.py,api/reviews.py},
новый backend/tests/test_manual_annotation.py; frontend/components/{analysis-workspace.tsx,
workspace.tsx,pdf-download.tsx,report-options.tsx,manual-annotation.tsx},lib/{types.ts,pdf-read.ts},
app/api/[...path]/route.ts, scripts/{test-pdf-proxy.mjs,test-pdf-read.mjs},
tests/{sq-manual-annotation.spec.ts,sq-manual-live.spec.ts,sq-pdf-download.spec.ts,report-options.spec.ts};
contracts/openapi.yaml,.env.example,docker-compose.public.yml. Документы ADR-029,
FEATURE_MANUAL_ANNOTATION,FEATURE_DOSSIER_REPORT,FEATURE_RECORD_PDF,UI_AUDIT,
PROJECT_STATUS,CHANGELOG и этот журнал. NOT_COMMITTED.

Точные проверки (disposable runner, приватные env, cwd корень или frontend для npm/node):

```text
.venv/Scripts/python.exe .local/sq-fixes-20261020/run_tests.py stage2-backend tests/test_manual_annotation.py tests/test_analysis.py tests/test_legal_absence.py tests/test_signals.py tests/test_contract.py
.venv/Scripts/python.exe .local/sq-fixes-20261020/browser_tests.py stage2-browser tests/sq-manual-annotation.spec.ts tests/sq-pdf-download.spec.ts tests/report-options.spec.ts tests/review-workspace.spec.ts
.venv/Scripts/python.exe .local/sq-fixes-20261020/browser_tests.py stage2-browser-live tests/sq-manual-annotation.spec.ts tests/sq-manual-live.spec.ts tests/zz-dossier-report-live.spec.ts
.venv/Scripts/python.exe .local/sq-fixes-20261020/browser_tests.py stage2-delayed-native tests/sq-pdf-download.spec.ts -g "real 26 second"
node --test scripts/test-pdf-read.mjs scripts/test-pdf-proxy.mjs
npm run lint
npm run typecheck -- --incremental false
npm run format:check
npm run build
.venv/Scripts/python.exe -m ruff check backend/app backend/tests backend/alembic
.venv/Scripts/python.exe -m ruff format --check backend/app backend/tests backend/alembic
git -c core.safecrlf=false diff --check
```

Результаты: backend151PASS125.30s (22newcases);browser26PASS1.4m;
embedding+live13PASS16.0s (11presentation,реальный2analystpath,
реальныеRU/KZ8pagePDFdownloads). Delayednative2PASS55.9s:обе реальные кнопки
ждали26s,скачанные3pagebytes/SHA совпали с native источником,прочитаныpypdf.
Node13PASS,static/build/format142filesPASS. Ранний compose config требовал
PUBLIC_HOST;с безопасным demo.invalid override `config --quiet` PASS.
Последние MIME/abort-propagation поправки покрыты Node13 и rebuild;отмена/ошибки
browser26 проверялись до этих узких поправок,finalstage7 повторит целиком.

Ограничения: только isolated newDEMOfixtures, второй analyst создан исключительно
в disposable DB; рабочие/production роли не трогались. Установка с одним analyst
не может сама утвердить предложение. Внешняя предметная/языковая приёмка NOT_RUN.
Системные таймауты ограничены, но отмена клиента не гарантирует немедленное
завершение уже начатого subprocess. Native +26s test задерживал доставку готового
native файла, а не симулировал нагрузку productionCPU. Evidence private scratch.
Следующий этап3: SQ-06/07/10/11/12/13; до PASS этапа2 не начинался.

## Этап 3: PASS — SQ-06/07/10/11/12/13

SQ-06 считает шесть кодов четырьмя взаимоисключающими категориями; backend unknown
семантика не меняется. SQ-07 сохраняет время последнего успешного чтения и показывает
ошибку refresh/старые данные с GETretry,в том числе в открытом drawer. Первичная
ошибка не показывает старой карточки, сменаIDзащищена успешнымpath. Черновики/файлы/
фильтры сохраняются. SQ-10 один список документов с общими search/status/pages;
nativeDrawer содержит детали и прежнюю самостоятельную LegalBasisDecision.
Legacyhash открывает нужный документ/страницу; открытиенеотправляеткоманд.

SQ-11 новые signals freeze reviewer UserOut одним batch при создании; чтение
архива не обращаетсяк текущему профилю. Старый ID остаётся честнымfallback.
Identity enrichment не делает snapshot stale при смене имени; ID/даты/решения
продолжают сравниваться. CurrentdossierPDF сохраняет reviewerID,signalPDFимя+ID.
SQ-12 Dashboard использует canonical staleness для последних DRAFT,ссылка
открывает state=DRAFT&is_stale=false; stale/superseded/decided409сохраняется.
SQ-13 authenticated provenance directLIMIT1 по exactpropertyentity+action
независимот120позднихсобытий;null/ошибкаразличаются. Контракт0.34.0,
optionalrevieweroutput+новыйGET,безmigration/backfill.

Изменены backend/app/{api/properties.py,dto.py,views.py,signals.py,pdf_render.py,
dossier_report.py,dossier_report_render.py},frontend/components/{workspace.tsx,
dossier-overview.tsx,dossier-records.tsx,signals-workspace.tsx,legal-basis-review.tsx},
frontend/lib/types.ts,contracts/openapi.yaml;два backend/newtests sq_dossier_queries,
sq_reviewer_provenance;дваfrontend/newtests sq-dossier-workflows,sq-reviewer-provenance;
адаптированы document-archive,dossier-drafts,ux-stabilization,dossier-records specs.
Документы FEATURE_PROPERTY_HISTORY,FEATURE_SIGNALS,UX_GUIDELINES,UI_AUDIT,
PROJECT_STATUS и этотжурнал. NOT_COMMITTED.

Команды (приватные isolated runners):

```text
.venv/Scripts/python.exe .local/sq-fixes-20261020/run_tests.py stage3-broad tests/test_sq_dossier_queries.py tests/test_sq_historical_context.py tests/test_property_history.py tests/test_dashboard.py tests/test_property_priority.py tests/test_signals.py tests/test_dossier_report.py tests/test_contract.py
.venv/Scripts/python.exe .local/sq-fixes-20261020/run_tests.py stage3-reviewers-final tests/test_sq_reviewer_provenance.py
docker exec saq-sq-fixes-linux-20261020 /tmp/sq-venv/bin/python -B -m pytest -q -p no:cacheprovider tests/test_sq_reviewer_provenance.py tests/test_sq_dossier_queries.py tests/test_signal_pdf.py tests/test_sq_historical_context.py
.venv/Scripts/python.exe .local/sq-fixes-20261020/browser_tests.py stage3-browser-verified tests/sq-dossier-workflows.spec.ts tests/sq-reviewer-provenance.spec.ts tests/document-archive.spec.ts tests/dossier-drafts.spec.ts tests/ux-stabilization.spec.ts tests/dossier-records.spec.ts tests/dashboard-priority.spec.ts
npm run build
npm run lint
npm run typecheck -- --incremental false
npm run format:check
```

Broad69PASS/3WindowsSKIP44.33s;focusedreviewers8PASS3.98s;Linux31PASS17.48s;
browser39PASS41.9s безretries. Ruff/format144files,diffcheckиfrontendstatic/buildPASS;
Alembiccheck«No new upgrade operations detected». Первый запрос ошибочно указал
несуществующий test_dashboard_priority.py (0tests); исправленпуть,проверкизапущены.
Первыйbrowser36PASS/3FAIL:oldfixtureбезprovenance,Nextalertstrictlocator,
viewerPDFreadbuttonsпринятызаreviewcontrols;исправленытолькотесты,
реальныемutationguardsнеослаблялись. Первые2SQ11testfailравнозначныхдатZ/+00
исправленынаawareinstantcomparison;final8PASS.

Визуально просмотрены actualproductionfrontend с presentationfixtures: mobile375
frozenfactor/legalmetadata и desktop1440KZ.8responsiveSQ11screenshotsбезoverflow,
документdrawer/draft/focus/filter/pages/deeplinkпроверены39suite.
Evidenceв `.local/sq-fixes-20261020/visual-stage3` иrunlogs. НативныйLinux включает
старыеPDFbytes/SHA;архивы/решениянеперезаписываются. Независимаяязыковая,
правовая,screenreaderприёмкаNOT_RUN. Следующий этап4(SQ-14).


## Этап 4: PASS — SQ-14

Основные targets используют существующий semantic token `--control-target-min:44px`:
Button, tabs, search submit, compact state, record/drawer actions и native controls.
Inline-ссылки не растянуты. Уменьшены мобильные служебные gaps/margins без смены
типографики, палитры, данных или обязательных DEMO/UNKNOWN/правовых пояснений.

Изменены `frontend/app/{design-system,redesign,shell-redesign}.css`,
`frontend/components/dossier-records.css`; добавлен
`frontend/tests/sq-touch-layout.spec.ts`. Обновлены DESIGN_SYSTEM, UI_AUDIT,
PROJECT_STATUS и этот журнал. API/schema/миграции: без изменений.

Точные команды из корня (browser runner использует production build и isolated API):

```text
.venv/Scripts/python.exe .local/sq-fixes-20261020/browser_tests.py stage4-baseline tests/sq-touch-layout.spec.ts
npm run build
.venv/Scripts/python.exe .local/sq-fixes-20261020/browser_tests.py stage4-after tests/sq-touch-layout.spec.ts
.venv/Scripts/python.exe .local/sq-fixes-20261020/browser_tests.py stage4-regression-clean tests/shell-redesign.spec.ts tests/design-system.spec.ts tests/property-structure-responsive.spec.ts tests/dossier-tabs.spec.ts
npm run format:check
git diff --check
```

npm команды выполняются в frontend. Baseline12PASS12.4s, after12PASS12.5s,
existing11PASS24.7s. Build/type/format/diff PASS. Первый existing-run7PASS/4FAIL:
предыдущая manual live проверка добавила девятый DEMO property, старые tests
ожидают8. Создана новая отдельная disposable БД/runtime на8193 с8seed records;
старые данные/fixture/assertions не удалялись/не ослаблялись, rerun11PASS.

RU/KZ ×360×800/390×844/768×1024/1024×768/1440×900/1920×1080:
минимальные измеренные основные targets44×44, page overflow0. Пять состояний:
overview/search/report/documents/drawer. Нет обрезки labels; Escape/focus return,
GET-only и неизменность длинного исходного имени проверены. Semantic contrast
regression PASS. JSON/screenshots сохранены в `.local/sq-fixes-20261020/layout-baseline`
и `layout-after`; RU360 screenshot просмотрен. Вкладки RU360 y891.14→858.14,
RU390859.14→826.14; KK360891.14→858.14, KK390831.95→802.95.
Длинное имя всё ещё может вынести вкладки за первый экран. Desktop header+6px
ожидаем из-за увеличения targets. 44px — проектный ориентир, не утверждение
о минимуме WCAG2.2AA. Полный screen-reader/внешняя UX приёмка NOT_RUN.

Codex + scoped CSS/test agent + независимый read-only review. Ревизия:
b156086 + исходный diff + SQ0–4, NOT_COMMITTED; push/deploy отсутствуют.
Следующий этап5: SQ-09, локализация карты/дат/null labels и доступность.


## Этап 5: PASS — SQ-09

Локализованы authored labels/null/options карты, реестра, досье и legal choices.
Map marker/zoom ARIA и сообщения ошибок меняют язык без пересоздания Leaflet;
selection/filters/registry URL/исходные имена/адреса/provider attribution сохранены.
Date helper использует ru-RU/kk-KZ с прежним Asia/Qyzylorda; null/invalid явно
неизвестны. html.lang задаётся до React update для initial preference/set/storage.
Standalone comparison подписан на locale, поэтому его даты тоже меняются сразу.
ISO timestamps/цитаты/причины решений/снимки/payloads/guards не переводятся.

Файлы: frontend/components/{property-map,workspace,legal-basis-review,
publication-comparison}.tsx; frontend/lib/{api.ts,locale.tsx,ui-copy-workspace.ts};
новые scripts/test-localized-date.mjs и tests/sq-localization-accessibility.spec.ts;
адаптированы tests/{sq-dossier-workflows,legal-basis}.spec.ts к KZ labels/canonical
review drawer. FEATURE_LOCALE/UI_AUDIT/PROJECT_STATUS/этот журнал обновлены.
API/schema/миграций нет. Новые зависимости отсутствуют.

Команды (npm/node из frontend, browser runner из корня):

```text
node scripts/test-localized-date.mjs
npm run build
npm run lint
npm run typecheck -- --incremental false
npm run format:check
.venv/Scripts/python.exe .local/sq-fixes-20261020/browser_tests.py stage5-final tests/sq-localization-accessibility.spec.ts tests/map.spec.ts tests/shell-redesign.spec.ts tests/workflow-locale.spec.ts tests/sq-dossier-workflows.spec.ts tests/legal-basis.spec.ts tests/sq-touch-layout.spec.ts
```

Node3PASS; browser51PASS38.9s; build/lint/type/format PASS. Firstbrowser new8PASS2FAIL:
синтетический legal basis не имел evidence_ids, поэтому существующий guard
правильно не показывал review. Fixture получил отдельный DEMO LEGAL_DOCUMENT;
guard не изменялся. Старый legal test искал удалённое в этапе3 duplicate view:
locator переведён на canonical row→drawer, сохранены полные API/risk/audit assertions.
FirstNode2PASS1FAIL: Node mock.property не добавляет отсутствующий document;
исправлен только test harness (temporary global с cleanup). Final3PASS.

Доступные accessibility checks: keyboard Enter/Space/Tab/skip и возврат фокуса
(2.1.1/2.4.3), visible focus (2.4.7), semantic labels/roles/states (1.3.1/4.1.2),
html.lang (3.1.1), semantic token contrast regression (1.4.3, этап4) проверены
в указанных сценариях. Reflow640CSS эквивалентен1280px/200% viewport; screenshots
map/dossier просмотрены/сохранены `.local/sq-fixes-20261020/stage5-screens`.
Это доступная имитация zoom, не native browser zoom или полный1.4.4/1.4.10аудит.
Шесть viewports RU/KZ повторены12SQ14cases. NativeNVDA/JAWS/VoiceOver, полная
WCAG/независимая KZ редактура NOT_RUN. Длинные специализированные инструкции
вне трёх целевых областей могут сохранять documented Russian fallback.

Codex + три scoped agents; b156086 + исходныйdiff + SQ0–5, NOT_COMMITTED.
Рабочие данные/архивы/решения не менялись; production deployment не выполнялся.
Следующий этап6: SQ-08, сначала измерение текущего Network baseline.


## Этап 6: PASS — SQ-08

PropertyView использует keyed-by-ID внутренний PropertyDossier. Пять вторичных
panel children монтируются при первом посещении; потом остаются mounted.
Пустые tabpanel/ARIA wrappers сохранены; active children появляются синхронно,
включая hash deep links. Смена ID сбрасывает visited/filters/selections до рендера
чужих форм; drafts по точному scope восстанавливаются при посещении. R3 tools
монтируются на первом посещении review без дополнительного disclosure-lazy,
чтобы сохранить anchors и не усложнять workflow. Cache/API/dependencies прежние.

Файлы: frontend/components/workspace.tsx; новые tests/sq-lazy-panels.spec.ts,
sq-network-measurement.spec.ts; old dossier-drafts/workspace-navigation tests
адаптированы к посещению панели и actionableDRAFT href (все draft/file/APIassertions
сохранены). ARCHITECTURE/UI_COMPONENTS/UI_AUDIT/PROJECT_STATUS/журнал обновлены.

До изменения source выполнено5freshbrowsercontexts actual isolated API/DB и
production standalone frontend; после — те же records/config, без throttling.
Login/setup GET не включены. RawJSON endpoints/status/decodedBytes/latency/sourceSHA
в `.local/sq-fixes-20261020/network/{baseline,after}.json`.

| Метрика | Baseline | After |
|---|---|---|
| Initial API GET, каждый из5samples | 8 | 4 |
| Decoded JSON bytes, каждый sample | 17834 | 4217 |
| First useful overview p50 | 234.2ms | 259.6ms |
| First useful range | 230.8–480.2ms | 226.4–478.0ms |

Остались auth/me,property detail,provenance,header structure. Отложены ads100(R3),
ads10(publications),signals10,audit10. Снижение GET50%,decodedpayload76.35%.
Latency improvement НЕ подтверждён: p50 вырос25.4ms в малой локальной выборке;
это не production benchmark/p95. Полезный результат — отсутствие ненужных чтений.

Команды (browser из корня, npm из frontend):

```text
.venv/Scripts/python.exe .local/sq-fixes-20261020/browser_tests.py stage6-baseline tests/sq-network-measurement.spec.ts
npm run build
.venv/Scripts/python.exe .local/sq-fixes-20261020/browser_tests.py stage6-after-network tests/sq-network-measurement.spec.ts
.venv/Scripts/python.exe .local/sq-fixes-20261020/browser_tests.py stage6-final-verified tests/sq-lazy-panels.spec.ts tests/dossier-drafts.spec.ts tests/workspace-navigation.spec.ts tests/dossier-sections.spec.ts tests/functional-safety.spec.ts tests/sq-dossier-workflows.spec.ts
npm run lint
npm run typecheck -- --incremental false
npm run format:check
```

Measurement1PASS7.5s before/1PASS7.1s after; final46PASS39.8s; static/buildPASS.
Первый broad44PASS2FAIL: oldtest искал unvisited form и старыйDRAFT href.
Второй45PASS1FAIL: послеID/back documents тоже надо посетить перед восстановлением.
Тесты теперь проверяют сначала отсутствие чужой формы, затем пустую новую;
оригинальные поля/файлы/back/reload assertions сохранены и finalPASS. Команды
при открытии/переключении/locale не отправляются. New7tests покрывают deferred
network,first/revisits,drafts/files/filter/pages,locale,exactID,failure/retry,legacy.
Ревизия b156086+исходныйdiff+SQ0–6,NOT_COMMITTED; deploy/push нет.
Следующий этап7: полная isolated backend/browser/static/nativePDF регрессия.

## Этап 7: завершён — итоговая регрессия

Исполнитель Codex. Ревизия `b15608664f271367b3cc63505def5041f1c69117`
плюс сохранённый исходный diff и исправления SQ; NOT_COMMITTED. По последнему
уточнению пользователя закрыта только текущая финальная задача; новые циклы,
деплой и дальнейшие задачи не запускаются.

Проверки и сохранённые логи в `.local/sq-fixes-20261020/`:

- Полный Linux backend: **1252 PASS**, 456.16 s, `stage7-backend-full.log`.
  Первоначальная ошибка collection из-за отсутствия scripts в тестовом контейнере
  устранена копированием scripts в disposable container; полный повтор прошёл.
- Python scripts: 95 tests, **94 PASS / 1 SKIP**, `stage7-script-tests.log`.
- Node tests: **18 PASS**. Ruff check/format, frontend lint/typecheck/format,
  production build, repository hygiene, npm audit (0 vulnerabilities) — PASS.
  Fresh disposable DB: Alembic upgrade/check — PASS, новых migrations нет.
- Первый полный браузерный прогон: 304 PASS / 4 FAIL / 9 SKIP.
  Старые test fixtures/locators приведены к provenance endpoint, canonical
  document drawer и явной неизвестной дате публикации; viewport assertion
  ожидает завершения layout без расширения допуска.
- Второй полный прогон: **307 PASS / 1 FAIL / 9 SKIP**, 7.3 min,
  `stage7-browser-final.log`. Оставшийся FAIL — тест debounce, где реальные
  действия ввода на загруженном runner заняли больше 350 ms. Тест использует
  управляемые часы Playwright и проверяет отсутствие запроса до истечения
  интервала, затем полный объединённый фильтр. Продуктовый debounce не изменён.
- Точный повтор исправленного case: **1 PASS**, 3.3 s,
  `stage7-debounce-final.log`. Все исполнявшиеся cases имеют успешную проверку;
  это полный прогон плюс адресный retest, а не единый полностью зелёный запуск.
  Третий полный цикл по указанию пользователя не запускался.
- 9 SKIP: отдельные opt-in SQ04 live/SQ08 measurement, typography Chromium/Firefox,
  monitoring-v2 live (2), query profiles, CSV journey, URL schedules. SQ04 live
  и SQ08 measurement отдельно пройдены на этапах 2/6; SKIP не засчитывается как PASS.
- Скачанные native RU/KZ PDF досье: по 10 страниц, извлечение текста и рендер
  всех 20 страниц просмотрены; `.local/sq-fixes-20261020/stage7-pdf/`.
  Проверки legacy snapshots и неизменности архивных PDF входят в backend suite.

Файлы финального этапа: `frontend/tests/{dossier-import-navigation,supporting-pdf,
ux-stabilization,workspace,audit-stabilization}.spec.ts`; этот журнал,
PROJECT_STATUS.md, README.md, docs/UI_AUDIT.md, docs/UI_IMPLEMENTATION_PLAN.md.
Список файлов и SHA текущего дерева сохранён в приватном
`stage7-final-manifest.json`. Финальный lint/typecheck/format после test edits — PASS.

Команды последнего браузерного цикла и адресного retest (cwd корень):

```text
.venv/Scripts/python.exe .local/sq-fixes-20261020/browser_tests.py stage7-browser-final
.venv/Scripts/python.exe .local/sq-fixes-20261020/browser_tests.py stage7-debounce-final tests/audit-stabilization.spec.ts --grep "registry coalesces"
```

| Замечание | Итог в исходниках / isolated runtime | Основной результат |
|---|---|---|
| SQ-01 | PASS | Publication и capture различимы, неизвестная дата явная |
| SQ-02 | PASS | Исторический правовой контекст сохранён в snapshot/PDF |
| SQ-03 | PASS | GREEN/0 не скрывает неизвестные факторы |
| SQ-04 | PASS | Точная ручная аннотация с независимым review и аудитом |
| SQ-05 | PASS | Согласованные сроки PDF, отмена и явный retry |
| SQ-06 | PASS | Взаимоисключающие категории шести факторов |
| SQ-07 | PASS | Старые данные после ошибки помечены, доступен GET retry |
| SQ-08 | PASS | Загрузка по посещению, 8→4 GET; latency improvement не доказан |
| SQ-09 | PASS | RU/KZ подписи карты, даты и целевые controls |
| SQ-10 | PASS | Единый список документов и drawer |
| SQ-11 | PASS | Reviewer/date рядом с решением и в новых snapshots |
| SQ-12 | PASS | Счётчик только актуальных actionable DRAFT |
| SQ-13 | PASS | Точный provenance lookup без окна последних 100 событий |
| SQ-14 | PASS | Основные targets 44px, проверка шести размеров RU/KZ |
| SQ-15 | PASS | Очередь тестов изолирована, production FIFO сохранён |

Ограничения: production установка/HTTPS smoke/restart/backup для этой версии
не выполнялись. Полный WCAG, native screen reader/zoom и независимая KZ/предметная
приёмка остаются внешними проверками. Рабочие данные, архивы и история решений
не удалялись и не переписывались. Дальнейшая работа остановлена по просьбе пользователя.
