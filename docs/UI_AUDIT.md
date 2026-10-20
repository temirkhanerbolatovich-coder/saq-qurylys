# Аудит интерфейса SAQ QURYLYS

## SQ-01—15 ·20.10.2026 ·финальная проверка

Последний полный browser suite:307PASS/1FAIL/9SKIP. Debounce test переведён
на управляемые часы; точный retest1PASS. Продуктовый таймер и проверки фильтров
сохранены. Финальные lint/typecheck/format PASS; native RU/KZ PDF по10страниц
отрендерены и просмотрены. Это suite плюс адресный retest, не единый зелёный
прогон; SKIP/внешняя доступность/KZ приёмка раскрыты в
[SQ_FIX_PROGRESS](implementation/SQ_FIX_PROGRESS.md), этап7.
По просьбе пользователя дальнейшие задачи не запускаются.

## SQ-08 ·20.10.2026

Досье хранит visited state в keyed-by-property-ID PropertyDossier: вторичные
sections монтируются при первом посещении, затем сохраняют DOM/формы/файлы.
Active children синхронны для deep links; tabpanel/ARIA wrappers всегда доступны.
Provenance и структура остаются первичными чтениями видимой шапки.
Network5samples:8→4GET,17834→4217decodedbytes; latencywin не установлен
(p50 234.2→259.6ms). Browser46PASS,build/staticPASS; evidence/limits —
SQ_FIX_PROGRESS, этап6. Shared WorkspacePanel/monitoring поведение не менялось.

## SQ-09 ·20.10.2026 ·PASS

RU/KZ map/date/null/legalchoices и сохранение source/selection/drafts проверены:
51browserPASS38.9s,Node3PASS,build/lint/type/formatPASS. 12SQ14responsive повторены.
Клавиатура/фокус/semantic labels+ARIA/lang проверены на целевых сценариях;
640CSS reflow — имитация200% viewport, не nativezoom. Semantic contrast regression
прошёл в этапе4. Native screenreader/fullWCAG/независимаяKZредактура NOT_RUN.
Полный перечень criteria/limits/screens/failure corrections —
[SQ_FIX_PROGRESS](implementation/SQ_FIX_PROGRESS.md), этап5.

## SQ-14 ·20.10.2026 ·PASS

Production frontend, RU/KZ ×6 разрешений: baseline12PASS, after12PASS,
existing UI11PASS. Основные targets ≥44×44; overflow0; labels/Escape/focus/GET-only
PASS. Mobile tablist поднят на29–33px; длинное исходное имя всё ещё может вынести
его ниже первого экрана. Семантический contrast regression PASS, полный WCAG и
screen-reader аудит NOT_RUN. Точные commands/evidence/fixture rerun —
[журнал](implementation/SQ_FIX_PROGRESS.md), этап4. Master/палитра/шрифты прежние.

## SQ-06/07/10–13 ·20.10.2026 ·этап3 PASS

39browserPASS41.9s:exclusive6groupsRU/KZ;failedrefresh+GETretryсформами;
единыйdocumentslist/Drawer/filters/pages/deeplinks/drafts/files/viewer;
reviewerID/time/asof/frozenname;actionablehref;stableprovenance/error/null.
8reviewermetadata375/768/1024/1440screenshotsбезpageoverflow,просмотреныmobileRU
иdesktopKZ. Backend69PASS3WindowsSKIP+8PASS,Linux31PASS;static/build/migrationPASS.
Первыйbrowser36/3failисправленвfixtures/selectors,безослабленияpermissions.
Нетполногоscreenreader/WCAG/внешнейRU-KZприёмки. [Receipts](implementation/SQ_FIX_PROGRESS.md).

## SQ-04/05 ·20.10.2026 ·этап2 PASS

Exact manual proposal на карточке/в проверке,sourceversion/quote/read-onlytext,
отдельная independentreview,selfcheckdisabled,viewerread-only;RU/KZUnicode/
409/retrydrafts11presentationcases+реальный2analystpathPASS. OriginalSHAсохранён,
доотдельногоR2score0после25,R1UNKNOWN. PDFобакомпонента real26sPASS,manualcancel,
timeoutRU/KZ,5xx/invalid/emptyretryPASS. Настоящиеnativebytes3pageскачаныпосле26s,
сравненыSHA/pypdf;actualRU/KZ8pagePDFскачаны. Неявныхcommandsнет.
Static/buildPASS;общаяaccessibility/6viewportприёмкабудетэтап4/5/7.
[Команды/границы](implementation/SQ_FIX_PROGRESS.md).

## SQ-01–03 ·20.10.2026 ·этап1 PASS

Исторические даты рекламы теперь различают publication/capture/legacyunknown;
новые source labels RU/KZ. Frozen legal basis показывает period,verification,
decision date и historical reviewer ID. Серверный score не менялся. Production
сборка на disposable API/DB/storage:14browserPASS21.3s,включая7новых cases,
GET-only presentation,сохранение source/draft/URL и реальный analysis/review.
RU/KZ375/768/1024/1440:8screenshots,нет page overflow;визуально просмотрены
mobile legal/source и desktop KZ. Новых CSS/fonts/dependencies нет.
Native3×3pagePDF просмотрены,UNKNOWN/GREEN/периоды/источники читаются,
Linux20PASS включает неизменность archived native bytes/SHA. Полный WCAG,
screen reader и внешняя RU/KZ приёмка не выполнены. Старый date helper и прочие
labels исправляются этапом5. [Команды/границы](implementation/SQ_FIX_PROGRESS.md).

## Parser V2 ·20.10.2026 · source/изолированный QA

Production Next standalone на Windows + отдельные Docker API/worker/PostgreSQL.
Вкладка V2 использует прежние components/tokens; palette/font/API/risk не менялись.
Presentation проверяет раздельные команды dictionary/profile/run/capture/import,
историю, viewer, 409, stale GET, retry key, перезагрузку/черновики, пустой/большой
исходник и безопасный source link. Это синтетические ответы, не настоящий Threads.

Actual API/worker: отдельно созданные DEMO DB fixtures двух immutable версий и
observations → исторический текстовый import → ручной candidate/dossier/match,
гипотеза/evidence/CONFIRMED R2 → сигнал/скачанный PDF. Score0 до решения/25 после;
UNKNOWN не превращается в R1. Exact bytes/SHA сохранены. Все3страницы PDF
отрисованы Poppler и просмотрены; DEMO/UNKNOWN/фрагмент/источник/SHA проверены.
Fixture не является выдачей платформы; внешний поиск выключен.

На actual QA RU/KZ375/768/1024/1440:8наблюдений без page overflow/POST/pageerror;
native summary Enter/Tab и видимый/неперекрытый focus проверены. Таблица скроллится
внутри TableRegion; длинный оригинал имеет отдельный scroll. Просмотрены actual
mobile findings и desktop KZ version; артефакты `.local/v2-ui-20261020/visual/`.
Даты форматируются прежним ru-RU helper; новая неизвестная дата имеет KZ подпись.
Это не screen reader, полный WCAG/contrast аудит или независимая языковая приёмка.
Полный browser233PASS/1FAIL/2opt-inSKIP,6.6m: все221прежних исполняемых сценария
прошли. В новом тесте исправлено ожидание завершения смены версии; после этого
все11V2 presentation PASS11.6s. Обе actual V2 проверки в полном прогоне PASS;
на финальном review origin127.0.0.1:3090 повторены5cases PASS10.5s, включая
настоящий login/responsive. Это агрегат221+13пройденных сценариев, не заявление
одного полностью зелёного финального полного прогона. Команды — PROJECT_STATUS.

Первый полный запуск использовал уже изменённую предыдущим DEMO journey QA БД:
старые tests ожидали8строк и score0. Прогон остановлен; отдельная новая БД
восстановила исходные условия. Проверки/продуктовые ожидания не ослаблялись.
Primary не обновлялся, P2 DossierRiskStatistics ниже не исправлялся.

## Аналитик R1–R6 ·20.10.2026 · рабочий localhost3000

Реальный UI/API/worker на отдельном DEMO-досье: подтверждение/отклонение/
повторное подтверждение каждого фактора, отдельность загрузки и решения,
R5порог20п.п., R6даты, неполный R1, риск100/RED,65и75/YELLOW без одного из
обязательных кодов. Сигнал подтверждён; следующая версия возвращена с причиной,
доработка отдельной версией подтверждена. Скачаны PDFv1/v3, все10страниц каждого
проверены по тексту и визуально. История/исходные данные сохранены.
[Протокол и границы](audits/R1_R6_ANALYST_ACCEPTANCE_2026-10-20.md).

Открытый P2: `DossierRiskStatistics` в dossier-overview.tsx использует
`risk.unknown_codes.length` для «Не установлены», одновременно отдельно считает
PENDING.5CONFIRMED+1PENDING отображаются как5+1+0+1. Воспроизведено через
настоящий API и reload UI; screenshot `.local/r1-r6-20261020/statistics-pending.jpg`.
Серверный риск95правильный. Исправление не входило в проверку; следующий шаг —
развести UI-категории/их подписи и добавить regression без изменения формулы/API.
Навык ui-ux-pro-max применён к feedback/ясности статуса, новых master/tokens нет.
Полный responsive, accessibility и browser suite этим проходом не проверены.

## Карта и каталог источников ·19.10.2026 · локальная QA-сборка

После добавленных CSV/профилей/URL-расписания первый полный browser-прогон
выявил2падения: карта начиналась на y706.14 при1440x900; старый shell test
ожидал5карточек вместо6 с AN GROUPS. Исправлены ширина пояснения и проверка
каталога. Геометрическое условие <700 и правовые оговорки не ослаблены.
На новой production-сборке карта y670.14:RU/KZ375/768/1024/1440 без page overflow,
фокус interface-toggle проверен, POST0. Просмотрены4actual screenshots RU/KZ
375/1440. В измерениях OSM tiles заменены пустыми: проверка доступности внешней
подложки не заявляется; markers/data настоящие из QA API. Mobile таблица
прокручивается внутри области. Длинные инструкции карты сохраняют RU fallback.
Новых screen-reader/полного WCAG/независимой языковой или предметной приёмки нет.
Полный финальный Playwright221PASS/0FAIL/2opt-inSKIP,384.557s,retries0;
свежая БД/secret/storage. Включены live profiles/URL schedule/CSV→PDF;
скачанный архивный PDF отдельно проверен скриптом и визуально на всех3страницах.
Артефакты — PROJECT_STATUS; рабочий localhost3000 не обновлялся.

## Сквозной DEMO CSV → архивный PDF ·19.10.2026

18Playwright PASS32.7s,retries0: CSV/source/open-source presentation и реальный
UI/API/worker маршрут с отдельными решениями. Preview не пишет материалы;
commit не запускает анализ/identity/риск. Балл остаётся0 до отдельного R2,
после него25/UNKNOWN без R1. Новый snapshot не изменяет прежние decisions/PDF.
Выбранный пакет/архивный сигнал переживают reload; CSV и PDF скачаны через UI.
Четыре viewport375/768/1024/1440 после загрузки очереди без page overflow;
реальный mobile snapshot просмотрен. Все3страницы финального PDF отрисованы
и просмотрены; script независимо проверяет источники/даты/хеши/DEMO/UNKNOWN/KZ.
Значимых ошибок product-кода в этом блоке не обнаружено; доработан E2E-вход
и readiness locator. Primary31table fingerprints сохранены, QA остановлен.
Это русскоязычный текстовый DEMO-маршрут с KZ буквами в источнике, не новая
оценка OCR, перевод всей формы, screen reader или независимая UX/юридическая
приёмка реальной рекламы. Команды/ограничения/артефакты — PROJECT_STATUS.

## Расписание открытых URL ·19.10.2026 · фактическая проверка

Установлено на localhost3000: native details в «Источниках», default OFF,
явное включение/выключение, независимые сохранение и история, user/session drafts,
прежние Button/TableRegion/Pagination/LoadState. RU/KZ375/768/1024/1440:8реальных
наблюдений без page overflow/POST/pageerror; Enter summary и Tab в форме
проверены.50Asset SHA и25досье/44материала сохранены, новые таблицы0/0.
28browser PASS48.6s на QA, включая новую live OFF/enable/reload/disable и
четыре presentation cases (history/viewer/409/retry/reload/ошибки). История с
длинными URL проверена на mocks в8RU/KZ размерах; реальный run AN GROUPS
проверен API/worker/SHA отдельно. После визуального просмотра исправлены
отступы и KZ pagination; финальная сборка/28tests/primary8 повторены.
Ручной просмотр итоговых RU375primary/KZ1440history PNG выполнен.
Полный browser suite/screen reader/touch/внешняя UX-приёмка здесь не выполнены.
Команды, частные артефакты, backup/restore и границы — PROJECT_STATUS.

## Серверные профили помощника1.0 ·19.10.2026 · VERIFIED в указанном объёме

В существующем RU/KZ-конструкторе доступны общие сохранённые профили, версия
в URL, чтение истории и явное применение. GET/выбор/раскрытие/Enter не запускают
поиск и не заменяют ввод; новая версия — явный analyst POST. 409/ошибка сохраняют
ввод, явный повтор использует прежний ключ. Native fields/fieldset/Button/
Pagination/Notice/LoadState; новых dependencies/токенов нет. После просмотра
mobile исправлены тесные отступы с помощью существующих space tokens.

Фактически:26 Playwright PASS54.2s, retries0 (profiles/queries/monitoring-drafts/
tools/sources и opt-in real profile journey). Live QA: сохранение v1/v2, reload,
старый снимок, одинаковый ключ без дубля, SHA общегоJSON.8responsive сочетаний
RU/KZ375/768/1024/1440 в live QA и8в primary: page overflow0; primary POST0,
pageerrors0. Просмотрены реальные mobile/desktop снимки, включая финальный
mobile после spacing. Build/typecheck/lint/Prettier/Ruff/diff-check PASS.
Backend полный1034PASS356.41s. Это не новая внешняя UX/предметная приёмка;
полный старый browser suite заново не запускался. [Flow/ограничения](FEATURE_QUERY_PROFILES.md).
Точные команды/restore/data preservation — PROJECT_STATUS; артефакты
`.local/open-source-20261019/profiles-*`. Расписание/parser-v2 не включены.

## Фразы RU/KZ ·19.10.2026

MonitoringQueryBuilder использует native details/fieldset/labels и прежний Button;
расположен вне search form, Enter в параметрах не отправляет команду. Фраза
подставляется только кнопкой, фокус возвращается к существующему полю. ID/q и
черновик сохраняются при смене вкладок. Новых tokens/dependencies/API нет.
7 Playwright PASS17.0s (queries/tools/sources), build/typecheck/lint/Prettier PASS.
На primary8responsive наблюдений RU/KZ375/768/1024/1440:overflow0/pageerrors0/
POST0, реальный Threads DISABLED сохранён. Реальный mobile снимок просмотрен.
Справочник редакторский, не evidence/автоклассификация/расписание.
[Поведение](FEATURE_MONITORING_QUERIES.md), артефакты/данные — PROJECT_STATUS.

## AN GROUPS / открытые страницы ·19.10.2026 · VERIFIED в указанном объёме

В локальный runtime установлен URL-import adapter. Каталог источников, форма
и карточка материала поясняют область извлечения мобильных карточек и UNKNOWN.
Устранена ложная атрибуция любого HTML к Primeminister CC BY; новая RU/KZ
регрессия проверяет оба источника. Новых компонентов/dependencies/tokens нет.

Фактически: 17 Playwright PASS (33.6s) — открытые источники/каталог/инструменты,
без retries. Реальные страницы import/sources/material проверены на375/768/1024/
1440px в RU/KZ:24наблюдения QA и24primary, без page overflow/pageerrors.
Открытие/ввод/refresh не отправляют POST; один явный UI POST, затем отдельный
API-повтор проверяет idempotency/content dedup. Скачанный HTML совпадает по SHA.
Просмотрены реальные снимки mobile/desktop, в т.ч. первичная ошибка ложной
лицензии выявлена визуально и затем исправлена до установки. Новые пояснения
переведены; прежние специализированные RU fallback в UrlImportView остаются,
полной локализацией этой формы блок не объявляется. Внешняя UX/предметная
приёмка и live failure/restart провайдера этим не заменены.

Артефакты/команды: `.local/open-source-20261019/`, PROJECT_STATUS. Следующий
Social Monitor блок — RU/KZ словарь и расписание с лимитами/явным управлением;
внешняя приёмка полученного материала до human review/PDF остаётся открытой.

## Карта после дополнительного импорта19.10

На рабочем localhost3000:14markers/25досье.375/768/1024/1440 — overflow0, keyboard selection и dossier deep link PASS;0business writes/page errors. Реальные25details/42materials/47downloads SHA PASS. Desktop screenshot просмотрен, внешняя OSM-подложка частично загружалась; полной доступности tiles не заявляем. Источники координат/точность доступны в audit. Подпись DEMO условная; REAL points обозначены как ориентиры проектов. Полный suite не повторялся; прежний202PASS относится к предыдущему checkpoint.

## Master2.0 ·19.10 · LOCAL VERIFIED

Согласованная основа — девять пользовательских скриншотов Kompra, с собственной
идентичностью SAQ и фактическими данными. Master2.0 — DESIGN_SYSTEM; прежние
результаты ниже относятся к прежним версиям и не заменяют эту приёмку.

Локальный production localhost3000:19 REAL-досье/23материала/28originals,
DEMO0. Авторизованно прочитаны все досье и материалы, скачаны все28assets с
проверкой SHA-256. До/после обновления совпали fingerprints всех предметных таблиц;
изменились только alembic_version и auth sessions. Статусы UNKNOWN/балл0/нет
подтверждённых связей или факторов сохранены.

Production browser: overview/registry/dossier на375/768/1024/1440, по6 вкладок
досье на каждой ширине, один видимый tabpanel и отсутствие page overflow.
Боковая панель импортной строки, Escape/возврат фокуса, явное скачивание двух
настоящих RU/KZ PDF, язык без смены route и ноль business POST/pageerrors — PASS.
Снимки/отчёты: `output/qa/saq-redesign-real-20261019`; доказательства:
`.local/redesign-verified-20261019/production-read-check.json`.

На offline-восстановленной REAL-копии проверены обе миграции,19досье/23материала,
оригиналы и отчёты. PDF RU/KZ по6страниц после правки пагинации отрендерены;
все12страниц просмотрены: нет clipping/overlap, заголовок/пояснение и короткие
табличные строки не разделяются. Источники, четыре имена/SHA файлов, неизвестность
и «Не доказано текущее нарушение» сохранены. Это не официальная справка источника.

Backend966PASS380.68с; после последней PDF-пагинации/перевода system notes —
11report testsPASS14.48с. Static frontend typecheck/lint/format и Docker build PASS.
Первый full browser:200PASS/2FAIL/2SKIP; оба FAIL — устаревшие селекторы после
смены карточки/удаления декоративного eyebrow. Они исправлены и отдельно2PASS.
Новый единый204-case запуск:202PASS/0FAIL/2opt-in typographySKIP616.1с,
retries0/workers1 на свежей `saq-redesign-verified-20261019`. Оба прежних failures
прошли здесь. Код276files неизменен во время/после прогона; fingerprint и точная
команда — PROJECT_STATUS. QA остановлен с сохранением данных, рабочий runtime3000
оставлен запущенным. Это отдельный полный результат, не сумма выбранных повторов.

Shell4cases, DetailDrawer3cases, ReportOptions3cases, import-navigation1case и
workflow-locale1case проверяют keyboard/focus/native semantics, ошибки/повтор/
cancel, сохранение source/reason/ID и отсутствие команд просмотра. Общие
responsive/contrast/reduced-motion/draft/file/Back/legacy link проверки входят
в полный suite; реальные business workflows и HTTP presentation mocks различаются.

Границы: длинные специализированные инструкции частично имеют RU fallback;
внешняя языковая/UX/предметная приёмка, screen-reader/full WCAG и физическая печать
не подтверждены. Закрытые реестры и актуальность внешних URL не имитируются.
В рабочем наборе нет проверенных документов основания; просмотр такой записи
проверяется на изолированных данных, его отсутствие не даёт R1.

## Единый полный прогон ТЗv2 ·19.10 · LOCAL VERIFIED

Playwright **189 PASS / 0 FAIL / 2 SKIP**, 947.3с, без retry на новой
изолированной БД. Четыре прежних failures устранены и прошли в одном запуске;
R4 delayed503/retry, legacy /review, IDs/черновики/файлы также PASS.
Два SKIP — opt-in typography A/B, выполненные отдельно в предыдущем блоке.
В наборе есть runtime/browser, HTTP mocks/presentation и parser tests;
это не189 чистых live E2E. Команда/среда/fingerprint — PROJECT_STATUS.

Текущий код/UI в этом блоке не менялись; master1.5 и инварианты сохранены.
Responsive375/768/1024/1440, keyboard/focus/labels/состояния/reduced-motion —
по выполненным тестам; повторной native200/font A/B/screen-reader проверки нет.
Живой material→candidate→dossier→R2→signal→downloadPDF прошёл заново.
Свежий скачанный PDF3страницы просмотрен целиком, RU/KZ/DEMO/UNKNOWN читаются,
пересечений не обнаружено. Evidence — output/qa/clean-acceptance-20261019/journey.

Typecheck/lint/format/build PASS. Полная локальная browser-приёмка ТЗv2 закрыта;
production/API, независимая UX/предметная/realRU-KZ приёмка остаются OPEN.
Свои QA/dev процессы остановлены; volumes/storage сохранены. Hygiene/diff-check
PASS. Текущие результаты .local/clean-acceptance-20261019/results.json и browser.log.
Прежние записи о незавершённом clean suite ниже — история предыдущего среза.

## Предыдущие проверки · история

Финальные npm run typecheck/lint/format:check/build PASS; repository hygiene и git diff --check PASS. Свои QA/dev процессы остановлены, volumes/storage сохранены; commit/push/deploy не выполнялись.

19.10, финальное уточнение ТЗv2: общий прогон185PASS/4FAIL/2SKIP завершён.
Все4failures исправлены и отдельно повторены: signal-property-picker2PASS18.7s,
ux-flow pending-filter1PASS, simple-interface draft/file1PASS10.8s. Причины:
старые fixtures ожидали all-signals при новом work-default, devlauncher перед
skip-link и fixed count8 после создания новых DEMOдосье. Production для этих
4случаев не менялся; R4productionfix проверен в полном прогоне. Единый новый
fullsuite после последних test-only исправлений НЕ запускался; это точный следующий
шаг на новом isolated seed. Не объявлять общий cleanPASS по сумме повторов.
Команды/логи .local/{v2-signal-picker.log,v2-final-replay.log,v2-simple-replay.log}.

## ТЗv2 ·19.10 · текущая приёмка

Полный финальный fresh-seed browser: 185 PASS / 4 FAIL / 2 SKIP; 983.4s.
Полные команды/среда/границы — PROJECT_STATUS. Master1.5 сохранён; Inter A/B
Chromium/Firefox выполнен отдельно (2opt-in SKIP в обычном suite): KZ/licensePASS,
плотность хуже на18.8–19.4%, currentfont прежний. Браузерный nativezoom200 подтверждён
метрикамиouter1440/inner711/DPR2/CSSzoom1/visualscale1/CDPzoom2,6экранов overflow0.
Corrected1422pxPNG — output/qa/native-zoom200-v2-20261019, парные fontscreenshots —
output/qa/typography-v2-20261019. Dashboardbefore/after — output/qa/tz-v2.
PDF нового liveсигнала3страницы просмотрен; originalbytes/SHA, UNKNOWN/толькоR2 сохранены.

| ТЗ | Фактическая проверка |
|---|---|
| UX-01 | dossier-drafts: R4/документы/Back/reload, transientfilesnotice |
| UX-02 | review-workspace/dossier-drafts:409/422, reason/idempotency; R4 delayed503/GETretry |
| UX-03 | functional-safety/workspace-navigation: viewer/read-only |
| UX-04 | audit-workflows/ux-stabilization: фильтры/ID/Back/map/reset |
| UX-05 | signal-queue-views/signals/ux-flow: версия/причина/URL/reload |
| UX-06 | review-queue/workspace-navigation: actions≠processing, server totals |
| UX-07 | zz-publication-comparison-live: explicitversions/read-only |
| UX-08 | map: missingcoordinates/page scope/internal table scroll |
| UX-09 | ui-updates: loaded/total, без выдуманнойаналитики |
| UX-10 | ширины375/768/1024/1440, RU/KZ A/B и настоящий Chromiumzoom200 |
| UX-11 | redesign/analyst-composition: reducedmotion/focus/labels |
| UX-12 | zz-tz-v2-journey: новый материал→кандидат→досье→R2→сигнал→скачанныйPDF |

Mobile5зон: visibleicons+labels≥44px, без drawer. Новый /review defaultactions,
старыеquerylinks processing; reset закрепляет режим. URL-import guard не менялся:
ошибочныеfixture исправлены по фазе retry/release. R4 ждёт свежую revision перед
следующим POST, 503 не теряет причину и допускает только GETretry. Screen-reader/
полныйWCAGаудит/OSпечать/внешняя UX/предметная приёмка остаются непроверенными.

## Накопленная приёмка и фильтры реестра ·19.10 · PARTIAL

Исправлена реальная потеря zone при быстром переходе к карте: URL меняется
синхронно через native history.replaceState, запрос строится из актуального URL.
23 выбранных browser PASS129.0s: быстрые действия/debounce/Back/Forward/reset,
375/768/1024/1440, keyboard, viewer, вкладки/черновики/файлы без команд раскрытия.
Native textarea ищутся тестами по роли/доступному имени; одинаковые dev GET
проверяются по полному запросу. Next dev launcher скрыт только в keyboard test.
Новый dossier brief375 визуально просмотрен; отдельного screen-reader аудита нет.
Финальный production build и diff --check PASS; свои QA процессы остановлены,
volumes/storage сохранены.

Первоначальный полный прогон остановлен по бюджету после97/186:85 PASS/12 FAIL,
89 не выполнены. Девять failures перепроверены выбранным прогоном; открыты
2 восстановления URL-import job в open-sources и integrated-layout signals timeout.
Полный suite/production API/внешняя UX-приёмка остаются OPEN. Точные команды,
артефакты и следующий шаг — PROJECT_STATUS. Свежий RU/KZ worker OCR PASS только
на2 synthetic PNG; неизменность original/PENDING проверена. Master1.5 сохранён.

## Коррекция LINKED и история ·19.10

Явная отмена ошибочной связи, затем отдельный выбор досье. CREATED/viewer без
controls отмены; доступная история всех решений с датой/аналитиком/причиной.
Перезагрузка/409/refresh сохраняют reason текущей версии и требуют нового checkbox.
При LINKED→LINKED refresh форма ждёт точный snapshot, включая ABA; pending
блокирует ввод. Раскрытие/просмотр истории не отправляют POST.

34 selected browser PASS(2.5m):32 HTTP mocks +2 live API на изолированном dev.
Дополнительный финальный live capture PASS15.8s. Цикл link→unlink→link выполнен
тремя отдельными UI-командами; origin/публикации/факты досье сохраняются.
Form/history375/768/1024/1440 без page overflow;375/1440 визуально просмотрены в
output/qa/candidate-unlink-live-20261019. В истории используются snapshot names,
старый ID — fallback, metadata раскрывается отдельно. Master1.5 сохранён.
Backend955 PASS331.98s; TS/lint/format и Ruff PASS. Новая миграция не нужна.
Финальная production-сборка и git diff --check PASS; QA процессы остановлены,
volumes/storage сохранены. Публичный сайт не обновлялся.
Полный browser suite, production/API и внешняя приёмка OPEN; screen reader отдельно
не проверялся. Исправлены stale history и race старого target после чужой связи.

## Связь с существующим досье ·19.10

CandidatePropertyLink: общий PropertyPicker, две читаемые идентичности, причина
и native checkbox; sibling forms в disabled fieldset. Раскрытие/поиск не
отправляют POST, выбранный ID/причина переживают candidate changes/reload/409;
refresh требует нового подтверждения. На время команды поля заблокированы.
Успех оставляет ссылку на досье; обратный список сохраняет property_id и показывает
CREATED/LINKED отдельно. Источник создания не подменяется новой связью.

Dev --webpack, изолированный реальный API:30 selected browser PASS(1.7m),
28 HTTP-mock regressions +2 live сценария. Проверены сохранность provenance,
отсутствие переноса публикаций и неизменная ревизия досье. Форма на375/768/1024/1440
без page overflow;375/1440 визуально просмотрены в output/qa/candidate-link-live-20261019.
Native keyboard Enter, labels, ошибки/ожидание/успех и viewer проверены автоматически.
Отдельного screen-reader и внешней приёмки не было; полный browser/production/API OPEN.
Backend945 PASS(293.79s); финальные build/typecheck/lint/format и Ruff PASS.
Миграция протестирована с сохранённым origin и запретом потери LINKED при downgrade.

## F-10 · сквозная проверка и исправления ·19.10

Dev UI(--webpack) + изолированный реальный API: новое DEMO-досье создаётся через
форму, сохраняет кандидата/исходник и UNKNOWN; публикация привязывается только
отдельным подтверждением в «Проверке». Новый zz-candidate-dossier-live.spec.ts
gated по SAQ_ISOLATED_ACCEPTANCE и loopback; HTTP mocks в нём нет.
zz-material-search-live.spec.ts подтверждает поиск библиотеки/очереди с API.
Совместно с21 HTTP-mock regressions —23 PASS(1.4m). Это dev acceptance;
совместный production/API прогон и внешняя предметная приёмка остаются OPEN.
Финальные build/typecheck/lint/format PASS. Полный backend934 PASS(273.43s),
включая миграции/контракт/досье/риски. Полный browser suite не запускался.

Исправлены поиск дублей без автодобавленной очереди и ложная DEMO-подпись БИН.
Оба случая защищены browser regression. Форма в две колонки от768px/одну ниже
использует прежние tokens и labels. Enter раскрывает details без команды,
checkbox после reload требует подтверждения, ошибки сохраняют ввод.
Реальные375/768/1024/1440: no page overflow; форма375/1440 и досье375/1440
просмотрены в output/qa/candidate-dossier-live-20261019. Длинные RU/KZ названия
и ссылки читаемы. Отдельный screen-reader аудит не выполнялся.

## Досье из кандидата ·19.10 · локальная проверка

Новая форма раскрывается отдельным native details в кандидате. Развёртывание
не вызывает POST; поиск дублей в отдельной вкладке, обязательные поля/причина/
checkbox, сохранение черновика и ошибок, явный успех со ссылкой на досье.
Viewer не получает форму; ссылка на созданное досье остаётся доступной.
Обратная ссылка source_candidate_id ведёт к исходной карточке и наблюдениям.

Production3195: 25 HTTP-mock tests (monitoring-drafts, material-search,
signal-queue-views, functional-safety) PASS27.8s; analyst-composition8 PASS14.5s.
375/768/1024/1440 no page overflow;375/1440 визуально просмотрены в
output/qa/candidate-dossier-20261019. RU/KZ input, label semantics, обязательный
checkbox после reload,409/retry/успех и readonly роль проверены автоматически.
Native keyboard primitives сохранены; screen reader отдельно не проверялся.
Build/typecheck/lint/format PASS. Backend/contract/review-queue92 PASS46.38s,
включая независимость публикаций, idempotency, concurrency, rollback и DEMO/REAL.
Это не совместный live browser/API прогон; этот smoke и внешняя приёмка OPEN.
Детали реализации и ограничения проверки дублей — ADR-017/PROJECT_STATUS.

## DEMO/REAL и виды сигналов ·19.10 · LOCAL VERIFIED

Публикации/очередь обработки получили native is_demo; переход между очередями
сохраняет режим/поиск/выбранный материал и причину. Сигналы без query открываются
на актуальных DRAFT, all/stale доступны кнопками с aria-pressed. Старые ссылки
не получают новые фильтры неявно; открытый снимок сохраняется при смене списка.
Контракт0.21, master1.5. F-06 частичный, F-07 только существующие state/is_stale.

Production HTTP-mock32 PASS36.6s (material-search/signal-queue-views/functional-safety/
analyst-composition/monitoring-drafts). Backend PostgreSQL/contract52 PASS31.39s.
Build/TS/lint/format/Ruff PASS. Авто no-overflow375/768/1024/1440; signals375/1440
просмотрены визуально: кнопки переносятся, label/история/снимок читаемы. Снимки:
output/qa/queue-views-20261019. HTTP mocks не доказывают live интеграцию; полный
suite, screen reader, чистый DEMO-сценарий и внешняя приёмка остаются OPEN.


## Поиск материалов ·19.10 · LOCAL VERIFIED, live integration OPEN

Одна компактная native форма поиска в публикациях и обоих видах очереди:
исходный текст/название источника, Enter/кнопка, отдельный сброс, URL q≤300,
сброс страницы с сохранением фильтров и выбранного материала. Нулевая очередь
не скрывает выбранную версию или причину и не означает завершённую проверку.
OCR/гипотезы исключены явно. Использованы Button/LoadState/semantic spacing.

Production HTTP-mock:4 новых search tests PASS5.7s;27 прежних safety/composition/
monitoring PASS. Оба вида очереди375/768/1024/1440 без page overflow;
375/1440 визуально просмотрены после удаления лишнего padding формы.
Label/Enter, empty/error/retry, pagination, возврат из публикации, точные
advertisement/extraction ID и черновик после reload проверены. Артефакты:
output/qa/material-search-20261019. Build/TS/lint/format/Ruff PASS.
Backend PostgreSQL + contract51 PASS. Gated live smoke SKIP из-за отказа
автопроверки production start с тестовым API («blocked by policy»).
Полный E2E, screen reader, нагрузка и независимая приёмка остаются открыты.


## F-02 ·19.10 · LOCAL VERIFIED / HTTP MOCK

Сверка сохраняет публикацию/причину и версию по кандидату; решение инцидента —
своё состояние/причины. Восстановление явно обозначено у формы, storage failure
показывает ограничение. Успех очищает ввод; 503/409 сохраняют его. Повтор явный,
ключ совпадает только для прежнего payload; серверная ревизия берётся заново.
Недоступная публикация требует выбора. Native controls/вкладки/DEMO/правовая
граница прежние, раскрытие не отправляет бизнес-команд.

Build/TS/ESLint/Prettier PASS. На production прошли 19 существующих сценариев
functional-safety/analyst-composition и 8 новых monitoring-drafts (финальный
прогон8 PASS9.6s). Первоначальный сбой нового теста — нераскрытый native details;
исправлен сам сценарий. Role/name локаторы, viewer, auth cleanup, reload/Back,
ошибки и no-command navigation проверены. Это реальные компоненты с полностью
синтетическими HTTP-ответами, не live-проверка backend. Полный browser suite,
screen reader и внешняя UX/предметная приёмка не выполнены.

На375/768/1024/1440 нет page overflow; RU/KZ причина сохраняется. Снимки375/1440
просмотрены: поля и уведомление восстановления не обрезаны, отдельные решения
доступны. `output/qa/monitoring-drafts-20261019/restored-*.png`; полноэкранные
снимки длинной страницы могут смещать fixed shell относительно контента.
Новые формы кандидата/версии и Threads не входят в обещание reload persistence.


## F-08/F-09 ·19.10 · LOCAL VERIFIED

Имена точных R2-target, пометка прежнего объекта и явно текущее реестровое имя;
UUID доступен вторым уровнем/fallback. Стадия «Строится» сохраняет исходный код
в details/редакторе. PDF различимы до скачивания; filename* с безопасным fallback,
контекст/дата/ID/v/r; frozen signal и исходные байты прежние. Контракт0.19/master1.5.

Linux914 backend PASS239.49s; focused PDF38 PASS9.42s. Frontend37 PASS/2 gated SKIP;
затем оба live-теста + настоящий PDF3 PASS15.5s. Production13 новых parser/
presentation tests PASS5.9s. Build/TypeScript/lint/format/Ruff PASS. Имена/fallback
и draft R2:375/768/1024/1440 без page overflow,375/1440 просмотрены визуально.
Unicode/повреждённый header/путь/MIME/signature/error/retry, GET без review-команд,
точные ID/evidence и прежние safety/composition сценарии проверены.
Полный browser suite/внешняя приёмка не выполнялись. Снимки — ignored
output/qa/review-pdf-20261019. Независимый read-only review без замечаний.

Real API/DB/worker работали на отдельном QA volume/storage. Production start с
адресом тестового API отклонён автопроверкой; production tests полностью mock,
реальная связка подтверждена на dev. Ошибка первого QA mount и ограничения
запуска отражены в PROJECT_STATUS. F-02 monitoring/C-01/внешняя приёмка OPEN.

## Перенос согласованной композиции ·19.10 · LOCAL VERIFIED / PRESENTATION

База a473941. Обзор/реестр/досье используют согласованную плотную композицию,
master1.5 и существующие компоненты. API/auth/риск/исторические снимки прежние.
Краткий и подробный обзор используют общую очередь до аналитики; реестр —
desktop table и brief phone cards; досье — underline tabs и действие первым.

Фактические проверки:

- npm run build/typecheck/lint/format:check PASS.
- Playwright tests/analyst-composition.spec.ts + tests/functional-safety.spec.ts:
  dev18 PASS31.6s; финальная production-сборка19 PASS20.4s (8 новых +11 прежних).
- 24 screenshot observations:2 режима ×3 экрана ×375/768/1024/1440, RU/KZ,
  длинные названия/адреса, отсутствие page overflow. При1440 все шесть столбцов
  помещаются; более узкая таблица прокручивается внутри region. Отдельно все
  шесть подтверждённых кодов и mobile карточка без потери причины/даты/основания.
- Home/End/focus, query/filter/pagination/map, visible focus после возврата и
  reload на375/1440, независимые error/retry/empty, read-only viewer.
  Прежние scoped drafts/logout/401/409/success и точные редакторы R1/R3–R6 PASS.
- Account contrast ≥4.5:1, native navigation target ≥44px и focus outline ≥2px.
  Визуально просмотрены примеры всех четырёх ширин, исправлены широкая строка
  и наложение ссылки на риск на375px; assertions не дают повторить наложение.

Скриншоты: output/qa/analyst-composition-20261019 (локальные ignored artifacts).
Это реальное приложение с синтетическими HTTP-ответами, без рабочей БД/OCR/PDF.
Полный backend/browser suite и независимая UX/предметная приёмка не выполнялись;
Docker engine недоступен. Ранние прогоны выявили ошибки тестовых ожиданий
selector/StrictMode и гонку смены fixture-сессии; финальный production run чистый.
Обновлены зависимые presentation selectors; полный API-dependent набор не заявлен.
Ничего не опубликовано. F-02 monitoring/F-08/09/C-01 и внешняя приёмка OPEN.

## Функциональный блок A ·19.10.2026 · LOCAL VERIFIED / PRESENTATION

База1b6b4af. F-01: новый материал сохраняет черновик через существующий
user/session helper; legacy без автора не восстанавливается, logout/401 его
удаляет. F-02 частично: причина сигнала сохраняется по signal_id, включая
переходы/reload/409; очистка только после success. Сверка остаётся отдельной
незакрытой частью F-02. F-03: pending-документ/редактор R1/R3–R6 имеет точный
переход/focus, даже без публикаций. R2/роли/снимки/формула/API прежние.

11 новых browser tests PASS на dev13.8s и production build9.9s. Это реальный
frontend с полностью синтетическими HTTP-ответами, без рабочей БД/OCR/PDF.
Проверены logout/401/legacy, сохранение и успешная очистка, блокировка Storage,
раздельность причин/409/success, viewer и пять редакторов×375/768/1024/1440
без page overflow с focus. Build/TypeScript/ESLint/Prettier PASS. Полный прежний
backend/browser suite заново не запускался; независимая приёмка не закрыта.
Первый прогон дал9PASS/2FAIL: Back выполнялся до URL commit; ожидание перехода
исправлено в тесте, runtime ради этого не менялся. Неиспользуемая test variable
устранена после первого lint. Последние прогоны чистые.

[Три локальных макета](prototypes/README.md) проверены в браузере на четырёх
ширинах:12 наблюдений, таблицы прокручиваются внутри области. Первоначальный
overflow обзора375/768 исправлен min-width:0/minmax(0,1fr). Поиск, переход из
реестра в досье, клавиатурные вкладки и явная имитация решения проверены.
Это визуальное предложение с DEMO, не обновлённые продуктовые страницы.
Public runtime не обновлялся. Следующий шаг — согласование композиции и затем
связный presentation-блок; C-01/внешняя UX/предметная приёмка остаются OPEN.

Итог публикации: [PR №4](https://github.com/temirkhanerbolatovich-coder/saq-qurylys/pull/4),
code e690378, [чистый CI](https://github.com/temirkhanerbolatovich-coder/saq-qurylys/actions/runs/39146844077)
893backend/130browser PASS и frontend job success. После этого — только Markdown
фиксация результатов. Внешняя UX/предметная приёмка от CI не закрывается.

## Публичная установка всех изменений ·18.10.2026

Пользователь разрешил публикацию. Runtime875e288 установлен на рабочий
HTTPS [сайт](https://voice-cultures-brandon-independence.trycloudflare.com);
позднейшие2f40242/4b8a665 — только test/status fixes после чистого CI.
Публичный read-only Chromium:44наблюдения11страниц×375/768/1024/1440,
overflow/errors/businesswrites0;6вкладок досье/4мониторинга, новый search/priority/
structure, mobile focus/Escape/draft и читаемый snapshot chooser проверены.
Original Asset SHA и historical READY PDF SHA совпали с backup; три новых
read-only PDF экспорта вернули действительные Linux PDF. Auth401/200/Secure/
wrong Origin403/logout204 PASS. PNG output/qa/publish-all-20261018, private
report .local/publish-all-20261018/public-smoke.json.
Это технический smoke рабочей установки; полные записывающие E2E выполняются
на отдельных QA/CI данных, не на публичной БД. Матрица10/5/5 ниже сохраняется:
новой независимой UX/предметной/источниковой/масштабной приёмки не проводилось.

## Финальная локальная сверка и стабилизация ·18.10.2026

Базаa3afdf0, codex/audit-workflow-fixes, один Codex; пользователь «гоу гоу».
[Актуальная матрица ТЗ/всех20 замечаний](audits/SAQ_QURYLYS_UI_UX_RECONCILIATION_2026-10-18.md):
10 технически устранены,5 частично,5 открыты/отложены. Это учёт backlog,
не процент готовности продукта. Baseline860e033 не переписывался.

Текущий UI-блок: GREEN сопровождается явным статусом основания в registry,
cards/dashboard/dossier/selected map; number/zone остаются серверными.
≤639px поиск раскрывается кнопкой44px с focus, Escape предотвращает native
очистку input, возвращает focus и сохраняет draft. Сжаты отступы shell/досье,
не скрыты DEMO/ограничения/вкладки. Monitoring snapshot native select/page10
показывает label/город/дату, выбранный охват/истечение/полноту; metadata/ID
сохраняются между страницами/error. Manual UUID в details; reload по-прежнему
сбрасывает выбор/несохранённое основание. q+city применяются вместе через350ms/
Enter, reset/page/view/URL сохранены. LoadState retry type=button предотвращает
случайный submit формы сверки. Backend/API0.18/auth/риск/снимки/данные прежние.

Новые4теста и связанные сценарии **22PASS/41.4s**. Первый прогон19PASS/3FAIL:
native Escape очищал draft, label locator включал option text и mobile fold
был927px. Исправлены Escape и семантический role locator, compact spacing;
промежуточный3PASS/1FAIL показал875px, затем финальный22PASS. Это не отказ
бизнес-формулы. После последней сборки full **130PASS/3.9m**, workers1/retries0:
реальные API/worker/OCR/PDF/historical R2, роли, drafts и navigation.
npm build/typecheck/lint/format:check PASS. Backend suite не повторялась;
предыдущие57PASS/1Windows PDF SKIP относятся к a3afdf0.

Fresh14наблюдений реального GREEN+UNKNOWN досье:2вида×360/375/390/768/1024/
1440/1920px, overflow/errors/businessPOST0, reduced-motion. На375/390 начало
summary≈832–836px при844px высоты, на360≈884–888 и768≈872–876: UX-09 частично
открыт. Не заявляется первый экран для всех имён и наборов. Просмотрены PNG
390/768/1440; дополнительно реальный snapshot picker390/1440, overflow/errors/
commands0, визуально проверены label/truncation + полное описание ниже select.
Читаемость длинного названия сохраняется в metadata, не только в option.

Настоящий browser200% через chrome.tabs.setZoom/getZoom2, DPR2 и innerWidth720
при viewport1440:6вкладок, scrollWidth720 во всех. Full-page screenshot при
zoom обрезал raster; использован viewport capture, DOM-измерение до него.
Локальные artifacts: output/qa/audit-stabilization-20261018; логи/JSON в ignored
.local/tabs-pdf-20261018/audit-stabilization-*. Новая внешняя UX/screen-reader/
предметная/SQL-scale/второйПК приёмка не проводилась. C-01/качество OCR и реальных
источников этим UI-блоком не закрыты. Публичная установка не обновлялась.
Финальный self-review, diff check, hygiene, strict UTF8, добавленные local links
и private-literal scan17source files PASS; секретные значения не выводились.

## Поиск по всей очереди сигналов ·18.10.2026 · локальный блок

UX-06, база0bd2dfd, codex/audit-workflow-fixes; согласование «гоу», один Codex.
Existing listSignals q≤300: current/frozen имя объекта, signalUUID, version label,
state code/RU label. Literal case-insensitive substring/trim/escape; SQL predicate
до signal_view, stale фильтр и pagination прежние. Native submit вместо client
filter текущих25, URL q/page/filter, pin signal_id при search/pagination.
Пустой/ошибочный/ожидаемый результат не скрывает открытый historical snapshot.
Подписи counts страницы остаются честными, global total учитывает q.

Backend **57PASS/1SKIP/46.80s**: signal search/signals/PDF/document exports/contract,
отдельная случайная test schema QA PostgreSQL.30версий, ID за25страницей, current/
frozen RU/KZ/case/trim, state/version/literal%_backslash, filters/stale/pages,
empty/auth/viewer/length422, unchanged snapshot/decisions/audit и полный live q.
Windows skip — native Pango PDF; реальный Linux PDF остаётся в browser regression.
Полная backend suite/нагрузка заново не выполнялись. Ruff check/format94files PASS.

Операционный сбой до тестов: Docker daemon был остановлен; после запуска Desktop
QA DB не поднялась из-за Windows reserved range55663–55762, куда попал55667.
Только QA host mapping перенесён на57667, том/БД/qa_search_* namespace сохранены,
API8227 и preview3227 прежние. Не менялись host exclusions, public images или
данные ради тестов. Прогон на недоступной DB:7PASS/1SKIP/50setup errors; это
инфраструктурный сбой, не проверка поиска. Более ранний helper имел ошибочное имя
test_record_pdf.py — тесты не запускались; исправлен на существующий document_exports.

Первый browser related10PASS/1FAIL выявил40px height новой кнопки вместо44px.
Scoped input/button min-height44 исправлен, production build/typecheck/lint/format
PASS; повтор related **11PASS/34.1s**. Ввод без submit не посылает search запрос,
presentation51 подтверждает page3/pin/back/reload/reset/pending/error/retry/noPOST,
реальный API по UUID и14responsive наблюдений2режима×360/375/390/768/1024/1440/1920
подтверждают overflow/pageerror/businesscommands0, controls≥44px, reduced-motion.
Вручную просмотрены2form crops (detailed1440/simple390) и2полных кадра тех же
страниц. Остальные snapshots — автоматическая матрица; новых200%zoom/secondPC/
независимой UX/предметной/масштабной приёмки нет.

Контракт0.18.0-mvp: только q в существующем endpoint, response/auth/роли/снимки/
решения/риск прежние. Нет migration/dependency/seed правок. Имя в очереди текущее,
по frozen имени ищется historical версия; старое имя видно в её снимке.
UX-16 stale/views/N+1 остаётся OPEN, история панели100 не заменялась этим блоком.
Первый full **125PASS/1FAIL/4.0m**: единственный отказ — предусловие historical-R2,
в накопленной qa_search_* уже не было DEMO-объекта без R2. Факторы не переписывались.
Подготовлена отдельная qa_signal_search_* schema и новый acceptance_signal_search_storage;
прежние schema/storage сохранены, QA api/worker переведены на новую схему.
При финальном review уточнён текст empty page с total>0: возврат на предыдущую
страницу вместо false no matches. Добавлена browser regression проверка, сборка/
typecheck/lint/format повторно PASS. Окончательный full на чистом QA с финальным
empty-page refinement: **126PASS/3.6m**, workers1/retries0, реальный Linux OCR/PDF/
review и historical-R2. Новая матрица14наблюдений в этом full — overflow/errors/
businesscommands0. Финальные diff/hygiene/UTF8/local-links/private-literal scan PASS.
Логи signal-search-full.log/предыдущий exhausted log сохранены локально, ignored.
Публикация не выполнялась; сохраняется открытая SQL-scale/внешняя приёмка.

## Глобальный приоритет обзора ·18.10.2026 · локальный блок

UX-03, базаbd78bba, codex/audit-workflow-fixes; пользователь «гоу», один Codex.
Раньше список сортировался из первых100, теперь существующий listProperties
получает order=work_priority перед pagination. Default name/ID и фильтры прежние.
Приоритет использует текущие серверные legal views и score: PENDING, затем
UNKNOWN/REJECTED, затем остальные; внутри NULL review date/более давняя дата/score DESC/
ID ASC. Это не юридический рейтинг/дедлайн. В detailed5, simple3; клиентский
comparator удалён. Error имеет отдельный alert/retry, не false empty.

Backend **57PASS/50.62s**: priority/structure/search/dashboard/contract/API,
транзакционные synthetic rows в собственной случайной test schema QA PostgreSQL.
101 алфавитный filler перед важными записями, порядок/NULL/tie/page/filter,
эффективный legal status вместо raw status, unchanged detail, viewer/auth,
полный live/manual order parameter. Ruff check/format93files PASS.
Production build/lint/typecheck/format PASS; related browser **21PASS/46.7s**,
full **124PASS/4.0m**, workers1/retries0, реальные Linux QA OCR/PDF/review сохранены.
Полная backend suite и масштабная нагрузка заново не выполнялись.

14свежих наблюдений настоящего обзора:2режима×360/375/390/768/1024/1440/1920,
overflow/pageerror/business commands0, reduced-motion. Presentation205 и503
проверяют только UI trust/order/error; это не205 настоящих объектов стенда.
Ручная проверка обнаружила сжатие mobile пояснения между баллом и ссылкой:
priority-action≤639px переведён на grid с полноширинным пояснением во второй строке.
В regression добавлено измерение ширины пояснения≥90% области действия.
После CSS-правки production build/typecheck/lint/format PASS; повтор новых
dashboard и integrated-layout tests **6PASS/22.6s**. Матрица14наблюдений повторена,
включая новое измерение ширины, overflow/errors/commands0. Вручную просмотрены
4итоговых crop самого priority panel: simple/detailed ×390/1440, без перекрытия
sticky header при подготовке артефакта. Это ручной просмотр выбранных кадров,
не независимая UX-приёмка. Snapshot папка output/qa/dashboard-priority-20261018
и helper/logs ignored. Новый200%zoom/secondPC/предметная приёмка не выполнялись.
Финальные diff/hygiene/UTF8/local-links/private-literal проверки PASS.

Контракт0.17.0-mvp добавляет только параметр существующего endpoint; response,
роли/auth/данные/решения/snapshots/формула риска не меняются. Нет migration/
dependency/seed правок. Сортировка текущих filtered views идёт в памяти до slice:
логическая полнота исправлена, прежний N+1 и SQL-scale UX-16 остаются OPEN.
Публикация не выполнялась. Следующий самостоятельный блок — UX-06 server signal q;
внешняя UX/предметная приёмка и подтверждённое наполнение parent_id остаются OPEN.

## Структура ЖК/очередей/корпусов ·18.10.2026 · локальный блок

База9e7f195, согласование «гоу», codex/audit-workflow-fixes, один Codex.
UX-04 реализован по сохранённым parent_id/level: breadcrumb, прямые дети и другие
объекты того же ненулевого родителя, SQL pages10, отдельные досье и registry context.
Новый read-only контракт0.16.0-mvp, auth/роли/риск/решения/snapshots прежние.
Пустая структура текущего seed не дополнена предположениями по названиям.

Focused backend **52PASS/43.90s**, своя случайная test schema QA DB:
103ребёнка/порядок предков/независимые страницы соседей, отсутствие группировки
по названию/общему застройщику, root empty siblings, неизменность досье,
границы pages/cycle/depth/auth/viewer/404 и контракт. Первый прогон49PASS/1FAIL
выявил нестабильное сравнение тестовой записи без last_reviewed_at: её risk.as_of
по существующей логике utcnow. Fixture теперь явно фиксирует дату; продуктовый
расчёт не менялся. Три новых browser tests PASS10.7s: navigation101/context,
503retry и настоящий GET текущего досье. Статические checks/build PASS.

Трёхуровневые связи проверяются отдельными synthetic PostgreSQL rows и явно
presentation-only browser tree. В текущих8seed parent_id=null, level=PHASE;
наполнение настоящими подтверждёнными связями/предметная приёмка не выполнены.
Full browser **119PASS/3.8m**, workers1/retries0, против изолированного Linux
QA API/worker с реальными OCR/PDF/review. После финального h2 refinement и
упрощения page handler: production build, lint/format/typecheck PASS и повтор
новых4browser tests **4PASS/21.4s**. Typecheck запускался повторно после build:
одновременное чтение генерируемых .next types сначала дало missing routes.js;
последовательный прогон PASS, продуктового изменения для этого не требовалось.
Ruff check/format92files PASS, diff/hygiene/UTF8/links/private-literal checks PASS.
Полная backend suite, нагрузка и независимая предметная приёмка не повторялись.

Свежая responsive матрица:28presentation наблюдений (очередь/корпус ×2режима ×
360/375/390/768/1024/1440/1920), плюс4настоящего досье (2режима ×390/1440).
Режимы проверены по фактическому aria-pressed. Overflow/pageerrors/business
commands0; reduced-motion, native summary Enter и ссылки≥44px проверены.
Вручную просмотрены4итоговых снимка: phase detailed1440,building simple390,
real dossier detailed1440/simple390. Остальные snapshots — автоматическая
матрица, не независимая ручная UX-приёмка. Артефакты ignored:
output/qa/property-structure-20261018. Новые200%zoom/secondPC не выполнялись.
Публичный runtime не заменён. UX-03/06/16 остаются открыты.

## Поиск и объекты сигналов ·18.10.2026 · LOCAL VERIFIED

Второй согласованный блок, базаcd10b84, codex/audit-workflow-fixes, один Codex.

| Пункт | Фактический результат |
|---|---|
| UX-02 | Server q расширен на сохранённые aliases/застройщика/БИН; старые name/address/filter/order/page сохранены. Не fuzzy и не автоматическое совпадение |
| UX-05 | Signal filter использует paged25 picker; 101-й объект доступен и selectedID сохраняется на пустом/ошибочном поиске/reload; missing names текущей страницы дочитываются |
| UX-03/04/06/16 | Не закрыты: global priority/связи очередей/server signal q/большая SQL-нагрузка остаются отдельными задачами |

Backend focused40PASS/40.42s: PostgreSQL RU/KZ,case/trim/alias/developer/BIN,
literal%_backslash,JSON boundaries,duplicate aliases,filters/page,unchanged state,
dashboard blank q и live/manual contract. Контракт0.15.0-mvp; новые endpoints,
миграции,авторизация,риск,решения и snapshots не добавлялись/не менялись.
Весь backend suite не повторялся. Ruff91files PASS. Frontend lint/types/format/
production build PASS; targeted13PASS и первый full115PASS/3.6m. Финальный full
после blank-q/spacing refinement и fixture repairs — **115PASS/3.8m**, workers1/retries0. Не было функциональных failures;
локальные format/import warnings исправлены до финальных проверок.
Прогон после визуального уточнения114PASS/1FAIL завершился на предусловии
historical-R2: после нескольких прогонов в QA все8объектов уже получили R2.
Вместо удаления/перезаписи факторов созданы отдельная qa_search_* schema и новый
QA storage; исходные данные сохранены. Повторная приёмка использует этот отдельный
QA namespace; тестовые записи внутри него накапливаются обычным образом.
Первый чистый full112PASS/3FAIL выявил fixtures предыдущих этапов: отсутствовали
candidate/signal, у seed legal basis не было evidence для формы решения.
Audit workflow tests теперь сами создают candidate/version/signal через API;
archive test явно задаёт evidence ID только в своей presentation fixture, без
подмены серверного evidence-validation. Связанные7PASS/14.5s после правок.
Historical-R2 по-прежнему требует DEMO-объект без R2: после многих full runs
нужен новый QA namespace. Существующие факторы нельзя удалять ради теста.

Новые browser tests различают presentation101/503 и настоящий developer search.
Поиск/пагинация/выбор не отправляют POST; legacy match drafts/DEMO guards и
signal reset-focus проверяются общим regression. Names lookup ограничен разными
propertyIDs текущих25сигналов, cache локален компоненту; при ошибке — ID и retry,
не ложный нулевой результат. Поиск signal list остаётся локален странице25.

Fresh36наблюдений:3реальных экрана×2режима×6ширин360/390/768/1024/1440/1920,
actualDetailed записан в JSON, overflow/pageerrors/business writes0. Матрица
затрагивает существующую DEMO-компанию из QA API в реестре и обоих picker; исходники
не создавались. Captures в output/qa/search-picker-20261018. Это геометрия и
visual sampling, не независимая UX/правовая/WCAGAA-приёмка или large-data benchmark.
Вручную просмотрены registry1440,signal picker1440/390 и match picker390;
не все12PNG объявляются вручную проверенными. После визуального просмотра убраны
только inherited form padding/input margin внутри общего picker; матрица повторена.
Новый200%zoom/secondPC/latency10k не выполнялись. QA API/worker обновлены только
в собственном проекте saq-tabs-pdf-20261018, рабочий public runtime не заменён.

## Первый блок после полного аудита · 18.10.2026 · LOCAL VERIFIED

Согласован пользователем после [baseline860e033](audits/SAQ_QURYLYS_UI_UX_AUDIT_2026-10-18.md).
Ветка codex/audit-workflow-fixes, Codex root, один исполнитель. Только frontend;
backend/API/contract/risk/roles/snapshots/dependencies не изменены.

| Пункт baseline | Результат этого блока |
|---|---|
| UX-01: скрытые функции реестра | Город/зона/основание и карта доступны в обоих видах; URL и возврат сохранены |
| UX-08: рабочие данные ниже первого экрана | Убрана вводная панель карты, уплотнена её шапка; обе очереди целиком сворачиваются при выбранном материале |
| UX-10: высокие KPI | Название+число+действие, определения метрик в native disclosure; серверный смысл счётчиков сохранён |
| UX-11: указания «ниже» | Кнопки открывают и раскрывают реальный source/registry tool после commit; версия возвращает к кандидату |
| UX-13: PDF-действия | Копия без сохранения и формирование архивного PDF явно различены |
| UX-14: original/derived | Частично: labels по имеющемуся MIME и пояснение в материале; остальные точки экспорта ещё требуют единого уточнения |
| UX-12: UUID-выбор | Частично: прямой переход к списку и возврат; сам UUID input и reload выбранной версии остаются прежними |

Первичная приёмка27:25PASS/2FAIL — старые тесты обращались к закрытым фильтрам;
обновлены под новый путь, повтор связанных8PASS. Первый полный прогон остановлен
после68PASS/4FAIL в review-workspace: общий helper и ожидание open относились к
прежней вложенной disclosure. Исправлены тестовые переходы; отказы не скрыты retry.
Во время визуальной проверки дополнительно уплотнена карта и мобильные фильтры;
финальная сборка после этих изменений выполнена заново.

Финальный full browser: **113PASS/3.4m**, workers1/retries0. Lint/typecheck/format:check и
production build PASS. Новые4browser tests проверяют default filters/map/reload,
desktop first-screen обоих review queues, выбор версии с возвратом и draft,
различие PDF-actions (последнее — presentation fixture состояния PDF).
Backend suite заново не запускалась: серверный код не изменён; browser suite
использует прежний изолированный реальный Linux API/worker, включая OCR/PDF.

Свежие108наблюдений:9экранов×2режима×6размеров360×800/390×844/768×1024/
1024×768/1440×900/1920×1080. Page overflow0, pageerrors0, business commands0.
Координаты/данные реальные QA API; raster tiles в этой матрице подставлены
без внешней сети. Это проверка presentation карты, не качество live tiles.
Вручную просмотрены desktop map/dashboard/review/material и mobile registry;
не все36PNG объявляются вручную просмотренными. На1440×900 карта начинается
на646–651px, оригинал выбранного материала на750–754px; карточки объектов
краткого обзора на678px. Высота содержимого зависит от QA-данных; скорость
работы аналитика не измерялась.

Артефакты: output/qa/audit-workflow-fixes-20261018, ignored helper
.local/tabs-pdf-20261018/capture-audit-fixes.cjs. Локальный preview3227/API8227.
Настоящий200%zoom в этом блоке не повторялся; keyboard/contrast/viewer/drafts
проверяются существующими browser regressions. Внешняя UX/предметная приёмка
не проводилась. Остальные пункты baseline, включая search/global priority,
полные отношения очередей, signal picker100 и компактную mobile shell, открыты.

## U18.10.2026: настоящие вкладки и PDF · LOCAL VERIFIED

База1b47cc6, ветка codex/dossier-tabs-pdf, Codex root, один исполнитель.
Актуальная локальная версия заменяет прежнюю схему anchors. Публичная установка
e2dfefd и её данные не обновлялись. Следующие разделы — история предыдущих срезов.

| Требование нового ТЗ | Реализовано и проверено |
|---|---|
| Реальные вкладки | 6 в досье, 4 в monitoring; ровно одна видимая panel, остальные mounted hidden |
| Понятный первый экран | Название/адрес, застройщик, legal status, компактный server risk и основной переход; обзор по умолчанию |
| Навигация/черновики | URL section, reload, Back/Forward, старые editor/document hashes, выбранные файлы и ввод без POST |
| Длинные архивы | Документы: search/status/pages10; fixture25 с сохранением формы и переходом на страницу3 по hash; публикации/сигналы/история server-paged |
| Разделение действий | Глобальные зоны / карточные tabs / действия конкретной записи; подтверждения и роли сохранены |
| Шум и плотность | Убрана повторная большая risk panel, постоянная справка режима; справка о черновике по запросу; компактнее mobile shell |
| Доступность | Native buttons/semantics, roving arrows/Home/End, focus, skip link, no page overflow, reduced motion |
| Размеры | Реальные панели375/768/1024/1440; дополнительный regression320/1920; RU/KZ и целостность названий |
| Масштаб200% | Настоящий chrome.tabs.setZoom(2) в отдельном Chromium QA profile: width1440→720, DPR1→2, 5панелей без page overflow |
| PDF | 15 существующих видов; Linux HTTP smoke16случаев с изображением/exact original, плюс18страниц40DEMO-записей; open-registry exact path отдельно в API tests |
| Предметные границы | Formula/roles/auth/review/snapshot не менялись; read-only exports не создают evidence/job/decision |

Проверки: frontend lint/typecheck/format/build PASS; full browser **109PASS/3.2m**,
workers1/retries0. Backend full **820PASS/18Windows skips/437.02s** до финального
уточнения PDF provenance/layout; после него focused export+contract **13PASS**.
Ruff check и format90files PASS; repository hygiene и changed-file scan PASS.
Первый browser full100PASS/8FAIL раскрывал старые locator assumptions и реальные
focus/URL races; исправлены. Последующий focused14PASS/1FAIL выявил неточный
native-select label, теперь явный accessible name и успешный архивный regression.
Не использовались retries для сокрытия отказов.

Отдельный реальный сценарий: новый DEMO текст → анализ → human hypothesis →
property match → evidence → отдельное CONFIRMED R2 → signal v7 CONFIRMED →
сохранённый PDF **39338bytes**. R1 не подтверждён, исходник включён. Это техническая
проверка цепочки, не независимая оценка качества OCR или правовая приёмка.

PDF: кириллица/DEMO/источники/даты/версии читаются из файлов; hash/path/size guards,
ошибки, роли, frozen signal и zero writes проверены. Poppler PNG визуально
просмотрены для основания, изображения, середины/конца длинного списка; переносы,
страницы и отсутствие обрезки проверены. Дополнительный glyph bounds scan:
17файлов/90страниц, out-of-page glyphs0. Отчёт —
в output/qa/tabs-pdf-20261018/exports/bounds.json. Это не ручное чтение каждой
страницы каждого PDF. Перенос строки/поля на следующую страницу не выдаётся
за потерю записи. Исходный PDF не получает изменяющей его DEMO-надписи.

Реальные финальные страницы дополнительно сняты17наблюдениями, overflow/errors/
business writes0; captures с reduced-motion. Скриншоты/PDF/logs находятся только
в ignored output/qa/tabs-pdf-20261018 и .local/tabs-pdf-20261018.
Стенд отдельный localhost3227/API8227/DB55667, платные/закрытые сервисы не подключены.

Kompra: применён принцип разделённой карточки и иерархии из согласованного
направления; приватные экраны не наблюдались и конкретное private поведение не
приписывается сервису. Собственная палитра/семантика SAQ сохранены.

Открыто: независимая приёмка обычным сотрудником/аналитиком, второй компьютер,
субъективная оценка удобства и официальный freeze к защите21октября. Один
zoom-профиль Chromium не является проверкой всех браузеров. Закрытый реестр,
коммерческий C-01 и независимое качество AI/OCR этим UI/PDF-срезом не закрыты.
PDF больших записей может достичь resource cap; отказ явный, оригинал доступен.
Публикация требует отдельного разрешения пользователя.

## Локальная доработка по итогам сверки ТЗ · 18.10.2026

База b24531b, ветка codex/ui-stabilization-20261018, Codex root; приложение
на публичном сайте не обновлялось. Предыдущая матрица ниже — состояние ДО этого
среза. Её выводы уточнены следующим результатом:

| Пробел предыдущего аудита | Текущее состояние |
|---|---|
| Длинные документы досье | Компактные native disclosure; номер/дата/статус/область/период видны, прежняя форма остаётся mounted |
| Выбор ЖК только среди100 | Новый q/name/address picker с server pagination25, DEMO/REAL и сохранением выбранного ID вне результатов;101-й объект проверен presentation fixture |
| City filter отсутствовал | Подключён существующий точный city filter, URL/reset/page работают |
| Dashboard сортировал по score | Доступное действие по статусу основания, затем давность, затем server score; охват первых100 и отсутствие deadlines объяснены |
| Scroll/marker/focus при возврате не проверены | Реальный переход с карты→досье→reload→возврат восстанавливает query, marker, scroll±3px и исходную ссылку;4повтора и full E2E PASS |
| Матрица размеров была исторической | Свежие156наблюдений13страниц×2вида×360/390/768/1024/1440/1920; overflow/pageerrors/writes0 |

Семь разделов сохраняют native anchors согласно согласованному плану. Это
осознанное сохранение mounted forms/простых deep links перед защитой; ARIA tabs
не имитируются. Поля developer/БИН/document search/global sort не выдаются за
поддержанные: отсутствующий backend контракт не расширялся ради UI.

Фактическая приёмка: frontend typecheck/lint/format/build,2Node tests и npm audit0
PASS;26focused,4repeat возврата и **107full E2E/2.9m** PASS. Full включает реальные
OCR/документы/решения/сигналы/PDF, presentation viewer отдельно от server auth.
Backend **810PASS/18platform skips/329.07s**, ruff86files PASS. Новый реальный
text→analysis→human hypothesis/match/evidence/R2→signal CONFIRMED v7→PDF39309bytes
PASS, исходник в snapshot, UNKNOWN не дал R1. Прямой конечный ручной OCR-кейс
не выдаётся за этот текстовый проход; OCR покрыт suite отдельно.

Исправлена выявленная полным прогоном гонка: прежний RAF мог фокусировать
страницу до commit выбранной map-card. Восстановление теперь ожидает selectedId
в отдельном effect; одинаковые href карты/таблицы различаются. Picker после
pagination/search возвращает keyboard focus к загруженному select. Старые тесты
документов теперь раскрывают настоящий summary; прежнее ожидание конкретного
объекта в risk-first top заменено проверкой доступной очереди действий.

Изолированный финальный QA saq-ux-final-20261018, loopback3207/8208/55648,
с отдельной DB/storage и выключенными внешними коллекторами. Рабочие контейнеры,
туннель, данные и публичный frontend e2dfefd сохранены. Снимки/отчёты —
output/qa/ux-stabilization-20261018 и .local/ux-stabilization-20261018, ignored.
Матрица — browser captures с reduced-motion; настоящий200%zoom/screenreader/
touch/независимый аналитик/второйПК не выполнены. Полная многоязычность,
независимое KZ OCR качество, разрешённый коммерческий C01, официальный freeze
и сдаваемый GitHub SHA остаются вне закрытого UI-среза.

Вручную просмотрены финальные dossier-detailed-1440(-viewport) и
material-detailed-390-viewport. Для материала capture ожидает загруженные
picker/results и pagination, а не только появление статической оболочки;
после уточнения ожидания вся матрица156повторно PASS. Все156снимков не объявляются
вручную просмотренными. Сравнение с предыдущими captures качественное:
число документов/событий и данные стендов различаются, сокращение высоты страницы
как количественная метрика до/после не заявляется.


## Сверка с повторно приложенным ТЗ · 18.10.2026

Исполнитель: Codex root. Проверена версия ТЗ17.10.2026 из вложения346dd328;
база репозитория b24531b, установленный frontend e2dfefd. На входе Git clean.
Это аудит соответствия, без изменений приложения и нового запуска regression.
Фазы0–1 выполнены; согласованные S0–S2/B0–B3 реализованы. Полный редизайн
и фаза3 ещё не приняты. Наличие работающих функций не доказывает удобство
для независимого аналитика.

| Требование ТЗ | Текущее соответствие | Доказательство / остаток |
|---|---|---|
| Baseline, AS-IS, Kompra, Keep/Refactor/Defer, IA и план | Выполнено | Датированные разделы этого аудита и UI_IMPLEMENTATION_PLAN; ограничения источников раскрыты |
| Пять зон, sidebar, breadcrumbs, сохранение маршрутов | Выполнено | workspace.tsx: Обзор/Объекты/Реклама/Проверка/Сигналы; сверка вложена в Проверку |
| Рабочий анализ, оригинал/OCR/гипотезы, отдельные решения | Реализовано, ранее проверено | AnalysisWorkspace, regression103PASS и отдельный text→PDF; независимая точность KZ OCR остаётся OPEN |
| R1–R6, UNKNOWN, viewer, неизменяемый PDF | Сохранено в проверенном объёме | backend/app/risk.py: веса35/25/10/15/10/5, CONFIRMED, RED≥60+R1+R2; полная backend suite в этом аудите не запускалась |
| Семь вкладок досье | Частично по буквальному ТЗ | Семь native anchor-секций, не переключаемые tab panels; реклама/сигналы ведут в фильтрованные списки |
| Progressive disclosure и много функций | Существенно улучшено, частично | Редакторы и источники раскрываются локально; legal_bases всё ещё целиком map в длинную страницу |
| Безопасная навигация | Реализовано с ограничениями | Текстовые drafts; файлы переживают SPA, но после reload требуют повторного выбора; monitoring сохраняет формы внутри mounted страницы |
| Реестр, поиск, фильтры, карта, пагинация | Частично | q по имени/адресу; нет отдельного city filter в UI, developer/БИН/document search/global sort; привязка в review читает первые100 ЖК |
| Возврат в результаты | Частично | query/page/view сохраняются; точный scroll и выбранный marker не подтверждены |
| Метрики обзора | Исправлены | NEW фильтр в properties.py и test_dashboard.py; нерешённые действия считаются отдельным review-queue API |
| Приоритет по действию/срочности | Частично | Очереди действий есть, но DashboardView priorityRows сортирует первые100 ЖК только по risk.score; это не полноценная приоритизация из ТЗ |
| Своя визуальная система, focus, reduced motion, состояния | Реализовано; приёмка частичная | Семантический master1.4, tests/redesign.spec.ts; все состояния каждой страницы вручную сегодня не проверены |
| Все размеры,200%zoom, независимый аналитик | Не полностью закрыто | Последний public smoke375/768/1024/1440;360/390 относятся к более ранним captures,1920 есть в ограниченном dossier regression; единой итоговой матрицы всех страниц нет |
| Фаза3: чистый запуск, freeze, сдаваемый SHA и demo parity | Частично | Образ работает, build/smoke/PDF ранее PASS; новый чистый запуск/второй ПК/официальный cutoff и соответствие GitHub сдаче не закрыты |

### Что действительно перенесено из Kompra

**DOCUMENTED, повторная web-проверка18.10.2026:** официальная
[инструкция карточки25.06.2024](https://blog.kompra.kz/kak-proverit-yuridicheskoe-litso-i-individualnogo-predprinimatelya-kazahstana/)
подтверждает сводку, локальное меню, первоисточники и PDF;
[профиль04.06.2025](https://blog.kompra.kz/novyj-razdel-v-kartochke-kontragenta-profil-blagonadezhnosti/)
описывает первичный обзор и переход к подробностям. В SAQ адаптированы
сводка→раздел→доказательство и контекстные переходы. Это организация информации,
не перенос оценки благонадёжности Kompra.

**OBSERVED ранее17.10:** live services/search и опубликованные изображения,
URL/снимки перечислены ниже. Группировка вспомогательных инструментов B3 —
наша адаптация этого ориентира, а не доказанная копия поведения Kompra.
Сегодня web extraction services снова возвращает главную; это не новый просмотр
каталога. [Kompra Group](https://www.kompra.group/) снова не дал содержательного
текста. Закрытый кабинет/полноценный мониторинг не проверены. Утверждение
«воспроизведён реальный рабочий UI Kompra Group» не подтверждается.
Зелёная палитра и draft protection — собственные решения SAQ.

### Свежие наблюдения и границы

Прочитаны текущие компоненты оболочки/досье/реестра/обзора, выбор ЖК в review,
properties API, риск и релевантные тесты. Сверен сохранённый public report:
44наблюдения,0overflow/0pageerrors/0business mutations, оригинал SHA/PDF PASS.
Это результаты установки18.10, а не повторный прогон в текущем аудите.
Вручную просмотрены сохранённые public dossier1440/monitoring1440 screenshots.
Досье на этих данных имеет высоту6786px; это размер конкретного capture,
не универсальная метрика. Код legal_bases.map подтверждает причину длинного списка.
Текущий CUA подтвердил доступную страницу входа; authenticated обход сейчас
не выполнялся. Docker показывает установленный ui-b0-b3-e2dfefd и четыре
работающих сервиса. Новый build/E2E/backend suite не запускались.

Skill ui-ux-pro-max прочитан; два targeted поиска progressive disclosure не дали
релевантного правила. Вывод о перегрузке основан на ТЗ/коде/снимках, не на
нерелевантных результатах Skill. docs/decisions/README.md отсутствует;
релевантный ADR-006 прочитан напрямую.

Следующий полезный блок: ограничить перегрузку списка документов без потери
форм; исправить смысл приоритета объектов; затем единая итоговая responsive/
zoom/keyboard приёмка и короткий проход независимого аналитика. Search>100 —
отдельный ограниченный UX-срез. Коммерческий C01 и KZ OCR — функциональные
остатки MVP, не основание расширять визуальный редизайн до интеграций.
Граф связей/сравнение ЖК/автомониторинг остаются backlog. Существующее сравнение
публикаций отдельно согласовано и не равно сравнению ЖК из P2 этого ТЗ.


## Установленная публичная версия B0–B3 · 18.10.2026

Source e2dfefd (включая709a0be/f7e8358), Docker image5199009d9fad… установлен
после отдельного103PASS. Туннель восстановлен по разрешению пользователя;
текущий HTTPS адрес — DEPLOYMENT. Сам frontend update сохранил baseline
API/worker/DB IDs/env hashes/mounts, .env SHA-256 и новый origin; rollback сохранён.

Public Chromium smoke:11страниц×375/768/1024/1440=44PASS, overflow0/pageerrors0/
businesswrites0. Anonymous401/login200/Secure cookie/Origin403/logout204 PASS.
Семь секций досье и три вспомогательных блока «Сверки» присутствуют; причина R4
восстанавливается после menu return, Threads query сохраняется локально, logout
чистит draft namespace. Старый исходник скачан с совпавшим SHA-256, старый
PDF200/%PDF-/62384bytes. Посмотрен public monitoring screenshot.
Первая проверка перепутала постоянный role=status пагинации с loading; исправлен
только private verifier, затем все44наблюдения повторены успешно. Это read-only
public smoke, не записывающая приёмка или новые данные на рабочей БД. Полная
backend suite/независимая OCR/UX/второй ПК остаются отдельными проверками.

## B3: группировка инструментов «Сверки» · 18.10.2026

Локальная ветка codex/monitoring-tools, базаf7e8358, master1.4. Основная работа
расположена раньше справочников: кандидаты → сверка → предварительные инциденты.
КЖК/Threads/DEMO-версии — native disclosures ниже, с постоянно mounted формами.
Все прежние endpoints/IDs/query и ограничения REAL/DEMO сохранены; навигация не
создаёт команд и не подтверждает R1. Сверка остаётся ручной/DEMO.

Целевой набор17PASS/25.2s, полный Chromium **103PASS/3.0m**, workers1/retries0,
production frontend3197 и отдельная Linux DB/storage. Новые проверки:
создание DEMO-кандидата через настоящий API, локальная сохранность причины/
snapshot ID/Threads query/DEMO draft/File при раскрытиях, отсутствие POST и
неизменные score/zone/revision/confirmed/unknown/rules_version; viewer role fixture
и503 источника с рабочей очередью, URL/hash/reload/Back и keyboard. Fixture не
доказывает backend authorization/реальное соединение Threads или доступ к реестру.
Прежний настоящий comparison/immutable version/incident/retry workflow прошёл.

Первый targeted15PASS/2FAIL: исправлен реальный duplicate-focus по click/hashchange;
тест сравнения риска перестал считать динамический as_of изменением решения.
Ни guards, ни баллы, ни допуски проверки не ослаблялись. Повторный17PASS и
полный103PASS выполнены после исправлений. Typecheck/ESLint/Prettier/2Nodechecks/
production build/start PASS. Новый текст→human decisions→R2→signal→PDF PASS:
version4, 37742bytes, новый Asset в snapshot,
UNKNOWN не дал R1. Полная backend suite/новая независимая OCR-оценка не выполнялись.

На375/768/1024/1440px проверены шесть keyboard targets (24наблюдения), фактический
focus ниже sticky header, без page overflow. Native nav links≥44px, TableRegion
сохраняет все столбцы с внутренней прокруткой. Captures queue1440/375 просмотрены
вручную. Это browser captures, не интерактивный CUA/настоящий200%zoom/screenreader
или независимая UX-приёмка. Evidence ignored output/qa/monitoring-tools-20261018.

B3 закрыт в локальном source; публичная версия не обновлена. Следующий этап —
стабилизация, независимая UX/предметная приёмка и второй ПК. KZ OCR fidelity и
коммерческий C01 остаются OPEN. Сохранность форм B3 относится к текущей странице;
новое хранение monitoring drafts после полного reload не добавлялось.

## B2/S3: семь разделов досье · 18.10.2026

Локальная ветка codex/dossier-sections, база709a0be. Семь native секций доступны
в обоих видах; обзор/следующий шаг, основания, реклама, R1–R6, доказательства,
история и сигналы. Формы свернуты локально без remount; адресный переход
раскрывает редактор и сохраняет фокус. Основания редактируются у документов;
R2 остаётся у оригинальной публикации. UNKNOWN, область/даты/ограничения и
backend score не скрываются. Существующие master1.4/tokens/primitives сохранены.

Доказательства выбранного фактора/основания используют прежний read endpoint,
источник/даты/исходник; ID дедуплицируются в показе, не в сохранённых данных.
Реклама и версии сигналов открываются с текущим property_id. История остаётся
серверно пагинированной; signal/PDF продолжает хранить исторический snapshot.

Финальная production standalone проверка: **101passed/3.1m**, workers1/retries0,
отдельная Linux DB/storage saq-sections-20261018 и frontend3197. Два новых кейса:
семь keyboard anchors/фокус/сохранность File и причины/прямой hash/reload/mode/
отсутствие POST и изменения risk; viewer presentation fixture с отсутствующими
командами, выбранными evidence reads и responsive375/768/1024/1440. Fixture роли
не доказывает backend authorization. Все прежние workflow regressions входят
в этот прогон; исходные проверки решений и guards не ослаблялись.

Первый targeted25PASS/5FAIL: четыре ожидания0 на повторно использованном стенде
с R2=25 после прежнего PDF-пути; устранено созданием новой DB/storage, без reset.
Один locator новой проверки совпал по одинаковой причине трёх DEMO-факторов;
заменён на уникальный код. Промежуточный101PASS/3.0m — до последнего UI-уточнения;
финальный101PASS/3.1m включает120px clearance для существующей sticky шапки,
краткий доступ к основаниям и одинаковый перенос фокуса к доказательствам.

Визуальный осмотр выявил перекрытие заголовка при исходном margin24px. На
финальном source target находится ниже sticky header, на mobile margin24 при
static header. Проверяется геометрия, а не только activeElement. Четыре ширины
без page overflow; вручную просмотрены актуальные screenshots1440/375 и полный
render desktop. Это просмотр captures реального Chromium, не интерактивный CUA,
не screenreader/настоящий200%zoom и не независимая UX-приёмка.

Typecheck/ESLint/Prettier/2Nodechecks/production build/start PASS. Отдельный
новый ручной текст→analysis→human decisions→R2→signal→PDF PASS: version7,
39206bytes, PDF200/%PDF-, оригинал в snapshot, UNKNOWN не дал R1.
Полная backend suite и новая независимая OCR-оценка этим блоком не выполнялись.
Артефакты ignored output/qa/dossier-sections-20261018 и .local/dossier-sections-20261018.

B2/S3 закрыт в локальном source, публичный frontend не обновлён. B3 — группировка
«Сверки» — ещё не выполнен; внешняя UX/предметная приёмка и KZ OCR fidelity OPEN.

## B0+B1: черновики досье и проверка регрессий · 18.10.2026

Локальная ветка `codex/dossier-drafts`, база d3c1a6f, master1.4. Прежний F1
(потеря ввода досье после навигации) закрыт в текущем source для R1/R4/R3/R5/R6
и оснований. Существующий точный action queue уже закрывал старое замечание
о READY; повторного изменения API или подмены счётчиков не было.

Поля восстанавливаются отдельно для пользователя/объекта/формы; причина
решения основания привязана к ID, актуальная revision читается из API.
Файлы и контекст новых доказательств живут только в памяти вкладки; reload
восстанавливает реквизиты и явно просит выбрать файл повторно. Черновик не
равен сохранённому доказательству/решению. 409 сохраняет причину и retry key,
правка причины меняет ключ, подтверждение использует новое выбранное evidence.
Отклонение старого фактора не стирает неподанные новые материалы. Logout очищает
текст и File memory; автоматических POST при restore нет.

Финальный полный Chromium E2E: **99passed/3.1m**, workers1/retries0, отдельная
Linux DB/storage и production standalone frontend3197. Четыре новых сценария:
переходы A→B→Back/reload/beforeunload и отсутствие POST; capture R4→две
инъекции409→исправление→настоящее решение; logout/relogin; presentation basis
revision1→2. Последний не доказывает реальную конкурентную запись основания.
R4 проверяется на ненулевом baseline без удаления других факторов. Прежняя
геометрическая проверка диаграмм исправлена после98pass/1fail: чтение обоих
rect в одном DOM проходе; допуск2px сохранён, CSS не менялся. Промежуточный
99PASS и прерванный после84PASS прогон не заменяют финальный полный результат.

Typecheck/ESLint/Prettier/2Nodechecks/production build PASS. Отдельный настоящий
путь новый текст→анализ→human decisions→R2→сигнал→PDF PASS: version13,42213bytes,
исходник в snapshot, UNKNOWN не дал R1. OCR двух синтетических RU/KZ изображений
проверен отдельно; внешняя точность/независимая разметка остаётся открытой.

Responsive-наблюдения375/768/1024/1440: scrollWidth360/753/1009/1425,
переполнения страницы нет, причина R4 после menu return сохранена. Скриншоты
1440/375 просмотрены вручную. Это наблюдения до финального уточнения checkpoint/
evidence context; повтор CUA после восстановления остановлен URL policy без
обхода. Финальный автоматический набор включает responsive и keyboard/focus.
Палитра/tokens/CSS/layout не менялись; Notice использует native semantics и
существующие role=status/alert. Формальная внешняя accessibility/UX-приёмка
не выполнялась. Evidence — output/qa/dossier-drafts-20261017 (ignored).

Блок сохранён локально, публичная версия не обновлена. B2/S3 (семь разделов
досье) и B3 (группировка инструментов) остаются следующими этапами, не закрыты
этим исправлением. Локальное хранение текста ограничено12h при восстановлении;
восстановление File/retry после полного reload намеренно отсутствует.

## Опубликованная версия PR №3

Main4552d44 совпал с проверенным dccc281; PR/push CI полностью зелёные.
После визуальных исправлений полный95browser repeat PASS. На обновлённом
рабочем HTTPS origin проверены9страниц×4ширины:36наблюдений, overflow0/
pageerrors0/businesswrites0, вход/Secure cookie/очередь/comparison/Asset SHA/logout
PASS. Обновлён только frontend; внешний UX/предметный и независимый RU/KZ
контроль этим не закрываются. Ход проверки и границы доказательств — ниже.

## Выборочная интеграция новой frontend-ветки · 17.10.2026

Вход9691bf0 объединён с main33173a0 в отдельной ветке; сохранены drafts/history/pagination/map/queue/comparison. Typecheck/ESLint/Prettier/2Nodechecks и Windows/Docker production builds PASS. Первый targeted run19pass/1fail: новый тест ожидал URL синхронно после Link.click; исправлено ожидание. Полный прогон95passed/2.6m на отдельной Linux DB/storage. Новые presentation cases проверяют100/total205, image+URL без дубля, processing states, error/retry без старых значений, card→detail→list с query, полный оригинал/SHA. Это дополнение к настоящим API/worker/UI сценариям.

Read-only осмотр7страниц×4ширины:28наблюдений,overflow0/pageerrors0/businesswrites0. Screenshots375/1440 в ignored output/qa/ui-updates; вручную просмотрены loaded dashboard, forms, original, review и signals guide. Исправлены full-row span диаграммы и inline labels upload; caption≥12px, tab links≥44px, color tokens существуют. После визуальных исправлений полный повтор95passed/2.6m и повтор28наблюдений PASS. Публикация — PROJECT_STATUS. Внешняя UX/предметная и независимая RU/KZ приёмка остаются открытыми.

## Очередь решений и сравнение · 17.10.2026

Проверенная версия опубликована через [PR №2](https://github.com/temirkhanerbolatovich-coder/saq-qurylys/pull/2),
main `d95c95d`; [Linux CI](https://github.com/temirkhanerbolatovich-coder/saq-qurylys/actions/runs/39052856375)
полностью зелёный. Последующие изменения отдельной `codex/ui-updates` сюда не входят:
перед интеграцией нужны сохранение workflow и её собственная проверка.

Реальная отдельная Linux Compose установка на loopback3199 с новой БД/storage:
все 77 прежних сценариев прошли в полном прогоне. Из новых проверок сначала
91passed/2failed: неоднозначный locator двух live-status в presentation тесте
и устаревшая revision в setup исторического R2. Исправлены только тестовые
ожидания/получение актуальной revision; guards приложения не ослаблялись.
Повтор всех 16 новых сценариев — PASS, включая три настоящих API/worker/UI
прохода и 13 presentation сценариев. Не смешивать эти виды доказательств.

Новая очередь проверена на375/768/1024/1440: total/actions, фильтры/URL/Back/reload,
drafts, focus, delayed/error/empty, exact historical target, 409/422, неопределённый
retry с тем же ключом и отдельный PENDING→решение. Comparison: те же ширины,
явные архивные версии, быстрый выбор сторон, GET-only, текстовый HTML, 404/422/413,
viewer/keyboard и отсутствие page overflow. Просмотрены screenshots375/1440
обеих страниц; исправлена наследуемая dl-grid ширина provenance локальным
`.review-provenance { display:block }`, добавлена проверка ширины каждой строки.

Публичный HTTPS smoke на рабочем приложении: 12 наблюдений трёх страниц на четырёх
ширинах, overflow0/pageerrors0, API writes после login0; старые материалы не менялись.
Существующий исходный файл скачан и сверен по SHA-256. Тестовый стенд остановлен,
рабочее приложение и туннель оставлены включёнными.
Артефакты остаются ignored `output/qa/{review-queue,publication-comparison,working-site}`.
Typecheck/ESLint/Prettier/production build PASS. Внешняя UX/предметная приёмка,
человеческий KZ holdout и рольовая production-аутентификация остаются отдельно.

## Интеграция поставленного frontend · 17.10.2026

**Проверено и опубликовано:** после финальных исправлений целевой native suite —
26passed/34.8s,12responsive screenshots, визуально просмотрены desktopdashboard/signals
и mobilemap/signals; clipping/summaryclasses исправлены. Полный LinuxE2E —
**77passed/1.9m** на провереннойревизииd551626,
[CI39043383017](https://github.com/temirkhanerbolatovich-coder/saq-qurylys/actions/runs/39043383017)
success по3jobs, включая803backendtests. [PR1](https://github.com/temirkhanerbolatovich-coder/saq-qurylys/pull/1)
merged вmainbdab80a; дерево исходников совпадает с проверенным. Ниже — ход проверки
и явные ограничения, а не заявка на внешнюю UX/предметную приёмку.

Пользователь разрешил совместить frontend и backend/AI работу с публикацией.
Мастер1.4: светлая оболочка/поиск, реальная аналитика обзора, карта и сигналы
из двух supplied вариантов интегрированы с текущими пятью зонами, drafts/forms,
pagination/URL и предметными инвариантами. Корневые дубли не используются.
Команды сигналов/revisions/idempotency/PDF polling и формы досье сохранены;
page-local signal search явно обозначен, READY назван обработкой.

Native production build/start на отдельной базе/портах3199/8199 выполнены.
Целевые25browser scenarios (design-system/map/ux-flow/workspace-navigation/workspace)
прошли30.4s после создания ожидаемых OCR/signal fixtures. Первый прогон на голом
seed дал12pass/3fail/10notrun: отсутствовали READY extraction и signal, а не
наблюдался дефект нового UI; fixtures явно подготовлены verify_ocr и DEMO draft.
Отдельная integrated-layout проверяет375/768/1024/1440 по dashboard/map/signal,
без page overflow, с локальной SVG map-подложкой (не live OSM), screenshots
в ignored output/qa/integration. Первое тестовое ожидание PDF anchor исправлено
на существующий version-specific ID. При визуальном просмотре найдены и исправлены
clipped workflow links в узкой rail и несогласованные summary label/value classes.
Итог повторного прогона после исправлений и удалённый Linux E2E — PROJECT_STATUS.

Проверены keyboard/focus/skip/table navigation, семантические contrast tokens,
native disclosure/черновики/409 reason, карта без координат/ошибкаtiles/API, роли и
loading/error/empty. Screen reader, настоящий200%zoom, liveOSM, touch/landscape,
внешняя UX и предметная приёмка остаются открыты. Native Windows не подтверждает
Linux PDF/resource paths: они проверяются отдельным CI, без ослабления контроля.

## Повторный аудит по приложенному ТЗ · baseline f9db50b · 17.10.2026

**Вывод: S0–S2 работают в проверенном объёме; весь редизайн и готовность к защите ещё не приняты.** Повторное вложение идентично исходному (SHA-256 `2f9a529f35aa680213e55a5ceffb34f7d98f5268a1e2765ca1eadd1495f255ac`). На входе ветка `main`, HEAD `f9db50bbed7e8ba1f2897a5d5151d47cef332216`, clean tree. Работа продолжена с этой контрольной точки, а не с первоначального дизайна. Раздел 10 вложения разрешает сейчас фазы 0–1; S3/S4 не реализованы этим аудитом. Единственный исполнитель — Codex root, новых агентов нет; текущий diff ограничен документацией.

### Что действительно закрыто и что осталось по ТЗ

| Требование | Состояние на этой ревизии | Граница доказательства |
|---|---|---|
| Пять зон, sidebar, breadcrumb, реальные KPI | Реализовано | Default/detail одинаковые зоны; подпись READY total требует уточнения, см. F2 |
| Новое объявление → анализ → hypothesis → match → evidence/R2 → signal/PDF | Проверено свежим реальным DEMO проходом | Текстовый ввод, CONFIRMED v14, PDF43763bytes; image OCR проверяется отдельными browser tests, не выдаётся за этот же проход |
| Оригинал, источники, даты, две панели, отдельные решения | Реализовано и покрыто browser regression | Review очередь >100 проверяется presentation fixture, команды — реальным DEMO API |
| Сохранность ручного ввода | Частично | Review drafts проходят tests; досье R4 теряет причину при уходе, F1 |
| R1–R6 / UNKNOWN / viewer / snapshots | Регрессия пройдена, формула в backend/risk.py сверена | Только CONFIRMED, уникальные коды, веса35/25/10/15/10/5, RED≥60 вместе с R1+R2; не юридическая сертификация |
| Реестр/поиск/карта | Реализованный ограниченный сценарий | Name/address q и server paging; город поддержан API, но отдельного UI фильтра нет; developer/БИН/document search и global sort отсутствуют |
| Семь разделов досье и распределение многочисленных инструментов | Частично | Пять старых anchors и mode-dependent формы; monitoring содержит шесть последовательных блоков |
| Адаптивность / keyboard / motion | Browser regression PASS | Прежние112 наблюдений той же ревизии + свежая ручная проверка375/1440; новый реальный200%zoom и screenreader не выполнены |
| Коммерческий импорт / внешняя OCR и UX-приёмка / второй ПК | OPEN | Лицензированные информационные URL и ручной PDF КЖК не закрывают коммерческий C-01 или утверждённый реальный реестр |

### Пять главных текущих проблем

| ID / важность | Доказательство и влияние на аналитика | Минимальная адаптация / API / риск |
|---|---|---|
| **F1 · P0 — потеря ввода в досье** | В браузере введено `DEMO audit unsaved navigation check` в «Обоснование решения R4»; переход «Объекты» → тот же Ертіс вернул пустое поле, предупреждения не было. Команда решения не отправлялась. `appeal-review.tsx:18` хранит reason в useState, досье размонтируется при уходе. S0 покрывает `/review`, но не этот сценарий | Расширить scoped draft/guard на формы досье; проверять объект/документ/ревизию и auth. Файлы не сериализовать: предупреждать или сохранять mounted state. Без нового API; medium, до перестановки панелей |
| **F2 · P1 — очередь обработки представлена как остаток проверок** | `workspace.tsx:616` показывает total READY как «Ожидают проверки». `worker.py:150` ставит READY; runtime transitions в REVIEWED не найдены (REVIEWED присваивается seed). Новый материал после CONFIRMED signal/PDF остаётся READY. Это не доказывает, что все его гипотезы разобраны, но доказывает отсутствие автоматического закрытия по созданию сигнала; точный остаток действий этим total не измеряется | До защиты назвать «Обработанные материалы» и явно описать фильтр/отдельные решения. Не добавлять React-критерий «проверено всё». Настоящая закрываемая очередь требует отдельно согласованного backend workflow; подпись low, новая модель high |
| **F3 · P1 — досье требует знать глобальный режим** | В кратком виде нет локального меню, создания сигнала и истории; «Открыть инструменты» расположено после факторов. `workspace.tsx:1269,1288,1427`. Подробное досье при1440×1000 имеет высоту8483px на текущих накопленных DEMO документах; число зависит от данных, не является универсальной метрикой качества | Шапка/следующий шаг + локальные семь разделов, контекстные формы и ссылки. Сохранить mounted inputs, документы/даты/UNKNOWN. API не нужен; medium/high; сначала F1 |
| **F4 · P1 — вспомогательные источники вытесняют основную очередь** | На `/monitoring` заголовки: КЖК y462, Threads y735, кандидаты y1325 при высоте окна1000; пользователю сначала показывается подключение/источники. `monitoring-workspace.tsx:220–221`; screenshot monitoring-1440. Текущая страница4952px | Кандидаты/выбранная сверка/инциденты выше, источники и DEMO-версии по раскрытию; сохранить все пути/anchors/состояния. API не нужен; medium |
| **F5 · P2 — доступ к большому набору объектов неодинаков** | Реестр пагинируется, но ручная привязка review загружает только `/properties?page_size=100` (`analysis-workspace.tsx:359,959`), ограничение честно подписано. `properties.py:18–29` поддерживает q только name/address. Возврат из досье переносит query, но selected marker локален (`workspace.tsx:1033`) и явного сохранения scroll нет | Bounded поиск объекта по существующему q и сохранение выбранного ID; точный scroll/selection отдельно тестировать. Не обещать поиск developer/БИН/sort. Без нового API для name/address; medium; можно отложить, если демонстрационный набор мал |

**Дополнительная проблема воспроизводимости:** первый свежий E2E дал72pass/1fail: `analysis.spec.ts:40` ожидал общий score0, получил25 от R2, сохранённого предыдущим контрольным проходом. Тест документа R4 должен проверять отсутствие изменения при upload и отдельное изменение R4 относительно исходного состояния, а не предполагать пустой объект. После обычного завершения остальной suite и её штатных cleanup повторный полный прогон73pass. Это data-dependency, а не доказательство исправления теста. Seed/volumes не сбрасывались. Будущий тест должен изолировать также состояние самого R4; простая замена0 на произвольную сумму недостаточна.

### Kompra: повторно проверено, не реконструировано

Дата проверки всех ссылок —17.10.2026, Asia/Qyzylorda. **OBSERVED:** live [каталог сервисов](https://kompra.kz/ru/services) показывает предметные группы, sidebar и явное уведомление недоступного источника; live [расширенный поиск](https://kompra.kz/ru/search-extended) имеет самостоятельные структурированные фильтры. Снимки сохранены в `output/ux-followup-2026-10-17/kompra-*.png`. Web extraction SPA возвращает главную вместо маршрута, поэтому для этих выводов использован browser.

**DOCUMENTED:** [официальная инструкция карточки от25.06.2024](https://blog.kompra.kz/kak-proverit-yuridicheskoe-litso-i-individualnogo-predprinimatelya-kazahstana/) описывает сводку, локальное меню, источники и полный/краткий PDF; [профиль от04.06.2025](https://blog.kompra.kz/novyj-razdel-v-kartochke-kontragenta-profil-blagonadezhnosti/) — обзор с переходом к деталям; [about](https://about.kompra.kz/) — источник и дата по разделам. Эти материалы не подтверждают сегодняшний точный layout закрытого кабинета или новую функциональность PDF профиля. Kompra Group вновь не дал содержательного web extraction; платный кабинет/аккаунт не открывался.

**INFERRED — адаптация:** локальные секции досье для F3 и разделение рабочего/справочного контекста для F4. Сохранение drafts F1 — собственное требование SAQ, в Kompra эта гарантия не проверялась. Для F2 сохраняем принцип честного состояния/источника, но не переносим бизнес-логику чужого сервиса. Для F5 переносим организацию поиска, а не обещаем отсутствующие поля/API. Цветовая система SAQ1.3 сохраняется; новая палитра не решает найденные проблемы.

### Свежая валидация и ограничения

- Typecheck, lint, format:check — PASS. `pytest -q -rs` — **711 passed,18 skipped,266.23s**; skips Windows/Linux parser limits/Pango. E2E на isolated production3107 — **72pass/1fail**, затем **73pass,2.2m**; причина выше, не скрыта за повтором.
- Новый отдельный UI critical path — PASS, signal v14, PDF43763bytes, новый original asset и CONFIRMED R2 включены в snapshot; CONFIRMED R1 отсутствует. PDF сигнатура/ответ проверены автоматически; этот новый PDF вручную постранично не рендерился.
- Production build в этом повторном аудите не запускался: используется успешная сборка предыдущего блока, соответствующая неизменённым application sources `f9db50b`. Свежие E2E выполнены именно на ней. Это повторное использование свидетельства, не новый build PASS.
- Лично просмотрены текущие досье/реестр/сверка и Kompra services; сохранены desktop/mobile screenshots и manual-findings.json. На375px у сверки page overflow не обнаружен. Массовые112captures не повторялись; они относятся к предыдущему блоку той же версии. Реальный200%zoom, screenreader, независимый аналитик и второй ПК остаются OPEN.
- Логи текущего прохода — ignored `.local/ux-followup-2026-10-17/`, артефакты — `output/ux-followup-2026-10-17/`. Все команды решений в тестах идут в отдельный DEMO стенд; рабочие БД/storage/runtime/tunnel не пересоздавались. Новых commit/push/deploy нет.

**Результат контрольной точки B:** текущая карта пяти зон сохраняется. Keep/Refactor/Defer, семь секций досье, конкретные paths, оценки и план17–21.10 обновлены в [UI_IMPLEMENTATION_PLAN](UI_IMPLEMENTATION_PLAN.md). Рекомендуемый следующий пакет — **B0+B1: сохранность досье, повторяемость R4-теста и честная подпись READY total**. Полная перестройка досье/сверки требует выбора следующего среза пользователем.

## Приёмка утверждённого S0–S2 · 17.10.2026

**IMPLEMENTED / INTERNAL CHECKS PASS.** Пользователь утвердил первый пакет после аудита, затем попросил завершить и сохранить локальный commit из-за лимита. Записи фаз 0–1 ниже сохранены как исторический baseline. Использован установленный UI/UX skill и проектный master; новые dependencies/API не вводились.

| Проблема baseline | Фактический результат | Подтверждение / оставшаяся граница |
|---|---|---|
| Переход A→B→A терял причины | Scoped review drafts, reload/Back recovery, отдельные версии OCR; успешная команда очищает сохранённые поля, 409 сохраняет ввод | Новые review E2E: реальные DEMO материалы, match/hypothesis/correction/OCR/R2, retry key, logout, corrupt storage/quota. При запрещённом storage только память приложения с предупреждением; это не серверное autosave |
| Режим скрывал этапы и вводный блок занимал обзор | Пять постоянных зон, green sidebar, компактный обзор и четыре реальные рабочие очереди | Navigation E2E оба вида/viewer; серверные totals и независимая ошибка/retry. Simple/detailed остаётся предпочтением представления |
| Selector первых100 заменял очередь | status/page/page_size (10/20/50), total, URL state, явный выбор; selected ID независим от текущего фильтра и ошибок списка | 121 presentation fixture проверяет вторую страницу и материал вне фильтра; real DEMO используется для команд. Picker привязки объекта всё ещё first100 и явно подписан |
| Provenance было далеко от review | Источник, оригинальный URL, published/captured timestamps рядом с оригиналом | Responsive captures + E2E. Неизвестные даты не выдумываются |
| Сверка и досье перегружены | Сверка вложена в «Проверку», добавлены breadcrumbs; маршруты сохранены | Внутренняя перегруппировка monitoring и S3 досье не выполнены; нет заявления об устранении всей сложности |

**Окончательные проверки:** frontend typecheck/lint/format/build PASS; backend Ruff check/format PASS; pytest **711 passed,18 skipped** (277.41s, платформенные skips); tooling **37 tests OK,1 skipped**; production E2E **73 passed (2.3m)**. Первый production прогон 71/73 выявил два неоднозначных test locator (`alert` вместе с Next announcer); исправлены только тесты, затем весь suite прошёл. Предварительный dev-run не считается acceptance.

**Визуальная проверка:** 112 автоматических наблюдений (8 маршрутов × краткий/подробный × 360/375/390/768/1024/1440/1920), overflow0/pageerror0. Лично просмотрены `saq-dashboard-simple-1440.png`, `saq-review-detailed-1440.png`, `saq-review-detailed-390.png`, `saq-dossier-detailed-390.png`; остальные captures не объявляются вручную просмотренными. Семантические native controls, focus/keyboard/reduced-motion и viewer проверены E2E. Настоящий 200% browser zoom, screenreader, touch и внешние аналитики остаются OPEN.

**Сквозная сохранность:** отдельный новый DEMO UI-проход до CONFIRMED signal v7/PDF41238bytes прошёл; новый original asset/R2 вошёл в snapshot, CONFIRMED R1 отсутствует. RU/KZ synthetic OCR worker smoke прошёл отдельно. Это внутренняя регрессия, не внешняя юридическая/OCR приёмка.

Свидетельства: ignored `.local/ux-implementation-2026-10-17/` и `output/ux-s0-s2-2026-10-17/`. Стенд изолирован от рабочей БД/storage: local frontend3107 + отдельные API/worker/DB, внешние collectors/Telegram выключены. Публичный runtime не обновлялся. Утверждённый local checkpoint включает также сохранённый ранее dirty MVP source; текущий UX-пакет не меняет backend/OpenAPI/риск/роли. S3/S4 и внешняя приёмка остаются следующей работой после просмотра пользователем.

## Фазы 0–1 · Kompra-inspired audit · 17.10.2026

**Статус: аудит выполнен, целевая IA и изменения ниже ПРЕДЛОЖЕНЫ, реализация не утверждена.** Основание — приложенное ТЗ «SAQ QURYLYS — Kompra-inspired UX Redesign», версия 17.10.2026. Фаза 2 не начата. Этот раздел описывает свежий baseline; записи ниже являются историей отдельных этапов.

### Объём и доказательства baseline

- Ветка `main`, HEAD `e993dc855da00fd5d65c980caeb53ba139d4ce92`. До работы: 58 изменённых tracked-файлов и 61 untracked entry (entry может быть каталогом). 317 файлов зафиксированы SHA-256; status и tracked binary diff сохранены в ignored `.local/ux-audit-2026-10-17/`. Это инвентаризация текущего dirty состояния, а не воспроизводимая версия одного HEAD.
- Изучены приложенное ТЗ, AGENTS, README, PROJECT_STATUS, первичный PDF кейса (6 страниц, текст), CODEX_TZ, исследовательский DOCX (текст/раздел UX), REQUIREMENTS, ARCHITECTURE, DESIGN_SYSTEM, UX_GUIDELINES, UX_UI_SPEC, UI_COMPONENTS, прежний аудит/план, DATA_SOURCES, релевантные FEATURE/ADR (включая006,008–011), текущие routes/components/tests и OpenAPI 0.11.0-mvp. Запрошенные исходные документы найдены. Первичный кейс и исследовательские рекомендации различаются: коммерческий C-01 — дополнительный профиль CODEX_TZ, его нельзя объявить закрытым новостным импортом.
- Ownership: root — проверки, снимки и пять существующих audit/design/status документов; два независимых помощника — только чтение frontend и backend/контракта. Ни один помощник не редактировал приложение. Занятость файлов внешним разработчиком нельзя доказать Git-статусом; сохранность проверяется сравнением хешей. Перед фазой 2 требуется заново согласовать её конкретные пути, не присваивать существующий dirty diff себе.
- Для E2E использованы отдельные API/worker, PostgreSQL в tmpfs, отдельный storage и локальный production frontend `http://localhost:3107`. Telegram/Threads отключены только в этом тестовом окружении. Рабочие четыре контейнера, их БД/storage и tunnel-настройки не менялись. Установки зависимостей, миграции рабочей БД, commit/push/deploy не выполнялись.
- Фактические логи: `.local/ux-audit-2026-10-17/{typecheck,lint,format,build,backend,e2e,ocr-smoke,capture,critical-path}.log`. Снимки/наблюдения: ignored `output/ux-audit-2026-10-17/`; локальные свидетельства не попадут в Git автоматически.

| Проверка | Свежий результат | Граница вывода |
|---|---|---|
| `npm run typecheck`, `npm run lint`, `npm run format:check` из frontend | PASS | Текущие исходники, не прежний CI |
| `npm run build` | PASS, Next.js production | Сборка отдельно от рабочего frontend |
| `../.venv/Scripts/python.exe -X utf8 -m pytest -q -rs` из backend | 711 passed, 18 skipped, 290.28 s | Случайная test-schema; Windows skips: Linux resource limits / Pango |
| `SAQ_E2E_BASE_URL=http://localhost:3107 npm run test:e2e` | 64 passed, 2.0 min | Настоящий proxy/API/worker + явно помеченные в tests presentation mocks; не 64 live-интеграции |
| `APP_ORIGIN=http://localhost:3107 .venv/Scripts/python.exe -X utf8 scripts/verify_ocr.py` | PASS, два новых RU/KZ synthetic изображения, исходные байты совпали | Не внешняя оценка качества; текущий CER RU 5.41%, KZ 10.26% на двух smoke-образцах |
| 8 маршрутов × simple/detailed × 360/390/768/1024/1440/1920 px | 96 наблюдений, page overflow 0, pageerror 0 | Финальная съёмка после загрузки данных; настоящие страницы на DEMO-данных изолированного стенда |
| Проверка несохранённого текста при смене публикации | **FAIL поведения, воспроизведён** | `match-reason`: A → B → A, текст исчезает; POST сохранения не выполнялся |
| Отдельный непрерывный `critical-path.cjs` на новом тексте | PASS, CONFIRMED signal v4, настоящий PDF39456bytes | UI: добавить→анализ→fragment→hypothesis→match→evidence→R2→досье/охват/период→signal→решение→PDF. OCR изображений проверен отдельно, не в этом текстовом проходе |
| Keyboard/reduced-motion | Существующие сценарии входят в 64 PASS | Не полная ручная клавиатурная или WCAG-приёмка |
| Реальный browser zoom 200%, screen reader, touch device, 3–5 аналитиков, второй ПК | Не выполнены в этом блоке | Responsive viewport/320 CSS px в E2E не объявляется настоящим browser zoom |

Первая служебная съёмка прервалась из-за ошибочного ожидаемого заголовка «Кандидаты для сверки» вместо настоящего «Кандидаты объектов»; вторая проверка черновика выбрала ещё не анализированный материал. Локальный capture script уточнён, затем выполнен полный финальный сбор после завершения загрузки. Это ошибки audit harness, не скрытые отказы продукта. Первичный контрольный smoke также ошибочно ожидал «Не проверено» внутри основания, где после regression suite законно отображался отклонённый DEMO-документ; критерий исправлен на видимость охвата и периода. Продуктовый код не менялся.

### AS-IS: что действительно имеется

| Маршрут | Задачи и функции | Ограничения/иерархия |
|---|---|---|
| `/dashboard` | Default: добавить публикацию, NEW, объекты; detailed: реальные сводки и переходы | Крупный вводный блок перед рабочей очередью; приоритет score внутри ограниченной выборки |
| `/properties` | Поиск имени/адреса, zone/legal filters, server pagination; карточки/таблица/карта | `city` поддержан API; q по застройщику/БИН/документам отсутствует. Карта показывает текущую страницу |
| `/properties/[id]` | Данные, серверный риск, ход проверки, основания, evidence, R1–R6, история, создание сигнала | Часть операций скрыта mode; формы идут длинной последовательностью, anchors сохраняют mounted state |
| `/advertisements` | Серверные status/property/date/page, оригиналы, переход к проверке | Нет q/global sort/is_demo-filter; список не заменять поиском первых100 |
| `/advertisements/new`, `/upload`, `/import-url` | Текст/TXT/PNG/JPEG; source/date/DEMO; лицензированный URL job/recovery | Primeminister.kz — информационные REAL публикации, не коммерческий collector; отдельный анализ |
| `/advertisements/[id]` | Оригинал, asset/SHA, источник, published/captured dates; review/сверка | Provenance полнее, чем непосредственно на review |
| `/review` | Две панели, OCR/версии/фрагменты, отдельные hypotheses/match/evidence/R2, история | Selector последних100; нет полной очереди решений; причины локальны |
| `/signals` | Серверные filters/page, snapshot/версии, CONFIRM/RETURN, stale/409, PDF | Список и документ; URL восстанавливает выбор. Глобальный поиск отсутствует |
| `/monitoring` | КЖК PDF; Threads preview; кандидаты; сверка; DEMO snapshots; incidents | Шесть разных задач одним полотном; REAL/DEMO строго разделены, incident не равен Signal |
| `/login`, `/` | Вход, analyst/viewer; redirect к обзору | Simple/detailed — вид, а не полномочие |

Общие Button/Pagination/TableRegion/Notice/LoadState/RiskSummary/Demo/Zone, семантические tokens, RU/KZ font stack, отдельные решения и история — **сохранить**. Review уже двухпанельный; это не новая функция плана. Публичный сайт доступен отдельно от тестового стенда; новый production deploy этим аудитом не проводился.

### Что проверено в Kompra

Дата всех просмотров: **17.10.2026, Asia/Qyzylorda**. OBSERVED означает лично просмотренный live публичный экран или явно названное опубликованное изображение; DOCUMENTED — текст официального материала; INFERRED — предлагаемая адаптация. Коммерческий кабинет, настоящая работа с платной карточкой, настройками мониторинга и скачиванием отчёта не проверялись. Аккаунт не создавался, покупок/контактов не было.

| Источник | Уровень и результат | Полезный паттерн / граница |
|---|---|---|
| [Kompra.kz](https://kompra.kz/ru) | OBSERVED, публичный live экран | Один поиск и отдельный расширенный; mobile нижняя навигация, desktop rail. Виден баннер проблемы источника «Суды»; это пример честного unavailable-state, не оценка доступности остальных сервисов |
| [Расширенный поиск](https://kompra.kz/ru/search-extended) | OBSERVED, live форма 1440 px | Breadcrumb, основной запрос, отдельная область структурированных filters, явный Apply, полезное начальное состояние. Результаты реального запроса не проверялись |
| [Все сервисы](https://kompra.kz/ru/services) | OBSERVED, live каталог | Много функций распределены по предметным группам: проверки, аналитика, комплаенс, физлица, закупки. Не все услуги превращены в одинаковые главные пункты |
| [Мониторинг](https://kompra.kz/ru/company-monitoring/description) | OBSERVED — экран описания и вход; DOCUMENTED — возможности | Описаны выбранные параметры, лента и уведомления. Закрытый рабочий мониторинг не открывался; автоматизацию SAQ из этого не выводим |
| [Карточка/отчёт, инструкция 25.06.2024](https://blog.kompra.kz/kak-proverit-yuridicheskoe-litso-i-individualnogo-predprinimatelya-kazahstana/) | DOCUMENTED, историческая инструкция | Сводка, локальное меню секций, источники показателей, полный/краткий PDF. Это подтверждает описанный паттерн, не сегодняшний точный layout кабинета |
| [Профиль благонадёжности, 04.06.2025](https://blog.kompra.kz/novyj-razdel-v-kartochke-kontragenta-profil-blagonadezhnosti/) | OBSERVED — опубликованный screenshot; DOCUMENTED — описание | В изображении краткий профиль с раскрытием групп и деталями поверх карточки. Не live кабинет. Заимствуем сводка → основание; категории и автоматические оценки Kompra не переносим на R1–R6. Упомянутый будущий PDF не считаем подтверждением актуального релиза |
| [О сервисе](https://about.kompra.kz/) | DOCUMENTED, публичный текст | Источник и дата обновления по разделу; рекламные цифры/тарифы не использованы для проектных решений |
| [Путеводитель](https://blog.kompra.kz/putevoditel-dlya-polzovatelej-sajta/), [monitoring guide](https://blog.kompra.kz/guide_monitoring/) | DOCUMENTED, исторические материалы | Разные рабочие задачи имеют свои инструменты, история и отчёт. Даты старых материалов не превращаем в гарантию current behavior |
| [Kompra Group](https://www.kompra.group/) | Недоступно для содержательного аудита | Browser показал пустое полотно/AX, web extraction — без текста. Паттерны Group не реконструировались |

Снимки: `output/ux-audit-2026-10-17/kompra-{search-1440,services-1440,monitoring-description,profile-public-article}.jpg`. Web extraction SPA иногда возвращал главную вместо services/description; для OBSERVED использован настоящий browser, не этот fallback HTML. Decider отдельно не исследовался: для выбранного среза достаточно первичного Kompra.

### Сравнительный аудит и пять главных проблем

Оценки ценности/часов ниже — инженерные предположения, не измерение производительности аналитиков. Проблема адаптивности page overflow не обнаружена; длина и переключения — отдельные UX-вопросы.

| № / подтверждение SAQ | Kompra-ориентир | Адаптация SAQ (INFERRED) | Пути / API / риск |
|---|---|---|---|
| 1. Главный workflow скрыт глобальным видом. Три default против шести detailed пунктов; проверка/сигналы появляются по переключателю. На 1440 первый экран обзора преимущественно вводный. `workspace.tsx:90–97,175,193–197`; снимок `saq-dashboard-simple-1440.png` | OBSERVED: самостоятельные поиск/сервисы, предметная группировка | Пять постоянных зон; компактный рабочий обзор; раскрывать детали внутри задачи. Существующий простой режим можно оставить как плотность, а не доступность workflow | `workspace.tsx`, design-system.css; API нет; medium. Меняется согласованный16.10 UX — требуется утверждение |
| 2. «Сверка» = шесть задач, PDF/disabled Threads выше кандидатов. `monitoring-workspace.tsx:211–221`; `saq-monitoring-detailed-1440.png` | OBSERVED: каталог сервисов распределяет задачи по группам | Сохранить `/monitoring` вложенным инструментом Проверки; сделать кандидатов первым рабочим содержимым. Источники/справочный PDF и DEMO управление раскрывать по контексту | monitoring-workspace/open-registry/threads-search; API нет при локальном раскрытии; medium. Перенос живых форм опасен потерей state |
| 3. Review — selector100 вместо очереди; loading/error смешаны с empty. `analysis-workspace.tsx:168–215`; свежие64 tests не покрывают полноту queue | OBSERVED: отдельная форма поиска/filters; DOCUMENTED: секции карточки | Встроенная server-paged очередь по уже доступным status/page; загрузка, отказ и пустой результат отдельно. Показывать источник/обе даты рядом с оригиналом | analysis-workspace + tests; существующий list API достаточен; medium. Глобальные totals READY/FAILED не обещать без отдельных server запросов/контракта |
| 4. **Воспроизведена потеря draft**: ввести причину, A→B→A — пусто. `analysis-workspace.tsx:213,239–248`; `observations.json`, `saq-review-draft-loss.png` | INFERRED: сохранность контекста — требование SAQ; Kompra эту гарантию не проверяли | Явная защита перехода/сохранённый draft по материалу, без автоматического решения. Первым срезом до массового перемещения панелей | analysis-workspace + focused regression; API нет; low/medium. Не хранить файлы/секреты в localStorage и не терять idempotency/reason при409 |
| 5. Досье — длинная цепочка чтения и четырёх форм, часть действий скрыта mode. После suite высота detailed1440 ≈7579px (зависит от данных). `workspace.tsx:1215–1223,1373–1397`; `saq-dossier-detailed-full.png` | DOCUMENTED: локальные секции и сводка; OBSERVED screenshot: summary→detail | Шапка + следующий шаг + семь секций. Для начала anchors/раскрытия с mounted формами, не новый router/tab framework; сигналы через действующий filtered URL | workspace/history/signals + scoped CSS; API нет для группировки; medium/high из-за форм/дат/версий |

Дополнительные находки: source URL/published_at видны в оригинале (`workspace.tsx:1620–1630`), на review toolbar только captured_at/ссылка (`analysis-workspace.tsx:394–401`). Приоритет Dashboard выбирается по score внутри первых100 (`workspace.tsx:643–647`), а не по требуемому действию. NEW-counter уже исправлен (`backend/app/api/properties.py:87–145`, `backend/tests/test_dashboard.py:102,124`), повторный багфикс не требуется. Legacy CSS и большой workspace.tsx — долг, но не повод переписывать весь компонент до защиты.

Документный drift: `FEATURE_SIGNALS.md:58` ещё говорит, что supporting PDF upload не реализован; `FEATURE_SUPPORTING_PDF.md:35` и `FEATURE_LEGAL_BASIS.md:20` описывают старый контракт0.8/36операций. Актуальный OpenAPI0.11 и код имеют49операций, включая bounded PDF/открытые источники. Эти исторические строки не использованы как доказательство отсутствия функции. Их синхронизация — небольшой отдельный documentation task, не реализация нового API.

### Keep / Refactor / Defer

| Keep — действующее | Refactor — только после approval | Defer — после защиты / отдельно |
|---|---|---|
| URLs/deep links/query state; backend risk/roles/CSRF/revisions; OCR/RapidFuzz; ручные решения; все исходники/даты/SHA | Стабильная навигация, рабочий обзор, queue/status/load states, provenance на review, защита draft | Граф/сравнение, новый auth/roles/backend architecture, новые service dependencies |
| Зелёные semantic tokens, системный RU/KZ sans, доступные primitives, focus/reduced-motion | Плотность/иерархия, локальные секции досье, вложенные инструменты сверки | Полный auto monitoring, новые госинтеграции/массовый импорт, global search/sort, KPI без API |
| Immutable signals/PDF, UNKNOWN, DEMO, история; работающие manual monitoring/open PDF/URL import | Улучшить доступность и понятность уже имеющихся функций, ничего не удалять | Новые виды отчётов, полная KZ-локализация. Существующие monitoring/history остаются доступны |

Коммерческий C-01, независимые positive OCR RU/KZ, реальный утверждённый реестр, второй ПК и UX с людьми остаются открытыми функциональными/приёмочными направлениями. Их нельзя замещать редизайном. Разрешённый источник и внешние доступы не возникают из UX-плана.

### Целевая IA, композиции и контрольная точка A

Подробная карта, ownership, часы, acceptance и план17–21.10 — [UI_IMPLEMENTATION_PLAN](UI_IMPLEMENTATION_PLAN.md). В DESIGN_SYSTEM/UX_GUIDELINES добавлены явно неутверждённые предложения; действующий master1.2 не заменён. Изменение routes/API/models не требуется для первого рекомендуемого пакета; любые выявленные расширения — отдельное решение.

До approval не меняются компоненты/CSS/маршруты/API. Следующее действие: утвердить состав минимального среза и направление «постоянные пять зон + локальное раскрытие», затем исправить draft safety/queue и только после этого выполнять согласованную компоновку.

Финальная проверка документации: независимый read-only review сверил ограничения API/план/сохранение функций; исправлены page_size,375px и полная оценка11–17ч. UTF-8 всех пяти затронутых документов,48локальныхссылок и scoped `git diff --check` — PASS. Сравнение317начальныххешей показало только ожидаемые пять Markdown-изменений. Первая страница baseline PDF визуально просмотрена после Poppler render (11страниц целиком визуально не проверялись). Тестовые контейнеры/hostfrontend остановлены; рабочийruntime сохранён. Это audit checkpoint, не принятый редизайн.

Дополнение17.10: URL-importqueryjob восстанавливается послеreload/Back; ошибки/повторноечтение/новоеявноедействие, invalidID/kind и устаревшиеответы разделены. Использованы существующиеNotice/Button/nativecontrols и UIUXProMax error-recovery/focus рекомендации. Typecheck/scopedESLint/Prettier/productionbuild passed. Browserrecoverytests добавлены; финальныйрезультат — PROJECT_STATUS. Новаяручнаяresponsive/visual/screenreader/UXприёмка вограниченномбюджете не объявляетсявыполненной.

## Открытые источники и ход проверки · 17.10.2026

Новые URL-import/OpenRegistry/DossierProgress используют существующие tokens/components/native controls. Новых зависимостей нет. Простой основной режим сохранён; импорт доступен из добавления, реестр — в «Сверке». Понятные ошибки/состояния/источник/лицензия/дата/предел поиска остаются видимыми.

- Фокусный `SAQ_E2E_BASE_URL=<публичный HTTPS origin> npx playwright test tests/open-sources.spec.ts`: **5 passed (20.9s)**. Четыре presentation-сценария отдельно проверяют success/poll/new key, failure/retry/сохранение URL, viewer/page search/no-match/XSS text, четыре вопроса/следующее действие; это контролируемые API mocks. Пятый тест проходит настоящий proxy/auth/API с malformed600KB PDF:415 вместо прежнего proxy413.
- На import/dossier и panel поиска выполнены12 наблюдений375/768/1024/1440 без page overflow; `output/open-sources/`. Визуально просмотрены import1440, registry375, dossier375. После просмотра mobile dl переведён на одну колонку; финальная перепроверка записывается в PROJECT_STATUS. Общая метка уточнена для смеси REAL/DEMO.
- Первый browser smoke:2pass/2fail. Один502 пришёл от Cloudflare при обновлении контейнера, второй — неоднозначный role=alert из-за Next route announcer; тест уточнён до error Notice. Это не скрыто rerun. Затем все5 прошли на доступном runtime.
- Настоящий HTTPS API подтвердил2реальные RU/KZ загрузки/HTML SHA/дедуп/отдельный анализ и PDF12стр/page6/дедуп, risk unchanged. Отдельная новая вкладка in-app browser показала реальную версию02.10.2026 и результат ASYLYM/page6 с ограничениями; пользовательская вкладка с черновиком не перезагружалась.
- Полный browser по HTTPS:59passed/1failed(9.1m), единственный отказ прежнего Threads fixture — release вызывался до завершения CSRF GET. Добавлено ожидание handler через expect.poll; production Threads не менялся. На итоговой косметической сборке новый UI+Threads повторены:9passed(38.8s). Полного60/60после косметики не заявляем; все60сценариев прошли в совокупности этих проверок.
- Финальные12responsive наблюдений без page overflow повторены. Просмотрены итоговые dossier375 с одноколоночным dl и import375 с новой меткой прототипа. Новый screen-reader/200% zoom/user testing не проводились, полное WCAG-соответствие не заявляется.

## Простой интерфейс / Awwwards · 16.10.2026

По запросу пользователя реализован простой режим по умолчанию: 6→3 пункта навигации, верхняя панель вместо боковой, карточки вместо начальной таблицы, один главный CTA, необязательные URL/дата по раскрытию. Убраны из основного экрана KPI, карта/дополнительные фильтры, создание сигнала, документальные формы и история; подробный режим сохраняет доступ. Данные, API и предметные решения не удалены. Референсы и решения — DESIGN_SYSTEM 1.2.

- Production frontend build и локальный recreate прошли. **Итоговый полный browser rerun — 55 passed (2.7m)**; typecheck/lint/format:check и git diff --check прошли. Команды и границы — верхний блок PROJECT_STATUS.
- Первоначальный полный прогон: 53 passed / 2 failed; оба отказа в новых тестах (Tab до готовности UI, неоднозначный alert из-за Next route announcer). Исправлено ожиданием карточек и точным alert locator; focused `npx playwright test tests/simple-interface.spec.ts` — 6 passed, 17.9s.
- Новые тесты: 3 пункта/реальные серверные баллы; поиск/возврат/reload/доказательства; текстовый draft/необязательная дата/сохранение режима; создание DEMO материала без автоматического анализа; keyboard skip/черновик R1/выбранный файл; viewer/error/retry (последние роль и ошибка — presentation mocks, не доказательство backend auth).
- Обзор, каталог, досье и загрузка: 16 автоматических наблюдений на 375/768/1024/1440 px без page overflow. Ввод и названия RU/KZ присутствуют. Скриншоты `output/simple-interface/{home,catalog,dossier,upload}-{width}.png`; визуально просмотрены home 1440/375, dossier/upload 375, каталог в живом браузере. Визуальная проверка выявила бледное имя пользователя на белом header: исправлен цвет, добавлена проверка фактического контраста ≥4.5.
- Проверен живой переход обзор→каталог через in-app browser. Таблицы подробного режима, keyboard/focus, tokens contrast, reduced-motion и прежние предметные сценарии покрывает общий набор. Новый ручной screen-reader аудит, zoom 200% и UX-проверка людьми не проводились; прежние результаты не переносить на новую версию.

Следующий шаг: дать 3–5 пользователям задачи «добавить публикацию» и «найти объект/понять причины», наблюдать затруднения. До этого удобство подтверждено техническими проверками, а не пользовательским исследованием.

## Веб-предпросмотр Threads · 16.10.2026

Завершено продолжение ранее написанной панели `/monitoring`. Переиспользованы Button/Notice/LoadState/native controls и monitoring CSS. Визуальная проверка выявила отсутствующие в системе panel-head/panel-body; заменены существующими panel-heading/padded. Гонка фокуса после Enter исправлена effect после React commit; новый CSS/framework не добавлялся.

- Полный `npm run test:e2e` — **49 passed (1.6m)** после исправления фокуса. После последующей замены двух классов — focused `npx playwright test tests/threads-search.spec.ts`: **4 passed (9.7s)**; typecheck/lint/format и production Docker build passed.
- Реальный API подтвердил DISABLED, поиск не отправлялся. Presentation mocks отдельно проверили успешный текст/неизвестную дату/следующую страницу, пустой ответ, pending/ошибку/удаление старого success, восстановление TOKEN_MISSING/TOKEN_INVALID без потери фразы. Текст `<script>` остаётся текстом. Live Threads не проверялся.
- Для DISABLED и результатов на 375/768/1024/1440: scrollWidth ≤ viewport. Screenshots `output/threads-preview/disabled-{375,1440}.png` и `results-{375,1440}.png`; итоговые results 375/1440 визуально просмотрены, мобильный disabled просмотрен до поправки отступов. RU/KZ строки/правовые оговорки видимы, поля/кнопки переносятся.
- Отправка Enter и фокус на результате проверены; ошибка — role=alert, busy блокирует повторный запуск, фраза сохраняется. Zoom 200%, новый reduced-motion тест, screen reader и внешняя UX-приёмка для панели не проводились. Полное WCAG-соответствие не заявляется.

## Сверка рекламы · 16.10.2026

[Первый ручной/DEMO-срез](FEATURE_MONITORING_CASES.md): новый `/monitoring` использует существующие semantic tokens, Button/Pagination/TableRegion/Notice/LoadState/native forms. Шестой пункт «Сверка» в общей навигации, mobile grid три колонки; явные DEMO/недоступность источников/реестра сохранены.

- Полный `npm run test:e2e`: **45 passed (1.4m)**, в том числе два новых сценария. Настоящий API/БД: недоступность → DEMO-нет совпадения → case → повтор без дубля → новая версия с документом → ручное закрытие/история, риск не меняется. Presentation mocks отдельно проверяют retry/ключ команды, задержки/ошибки/старую выдачу/инертный текст.
- `node .local/monitoring-visual.mjs`: 375/768/1024/1440, scrollWidth=viewport на каждой, pageerror=0, шесть пунктов навигации. Enter на локальном anchor переносит focus в раздел; native details управляется клавиатурой, несохранённое обоснование соседней формы остаётся. Reduced-motion 0.00001s. Скриншоты `output/monitoring/overview-{width}.png`, `candidate-{width}.png`; 375/1440 визуально просмотрены.
- typecheck/lint/format/production build passed. Первоначальный timeout оказался точным implicit-label селектором с вложенными option; заменены только три тестовых селектора на accessible combobox. Повторный focused — 2 passed (6.5s), затем полный — 45/45.
- Новый zoom 200%, screen reader, внешняя UX/предметная приёмка не проводились. Полное соответствие WCAG не заявляется. Live-сбор рекламы и реальный реестр не проверялись, они ещё не подключены.

## История объекта · 16.10.2026

Связанный блок — [FEATURE_PROPERTY_HISTORY](FEATURE_PROPERTY_HISTORY.md), исходный HEAD `e993dc8` плюс сохранённый локальный redesign/URL diff. В досье и review используется единая лента, общий Pagination, семантические tokens. Две nullable read-model добавки в audit API раскрыты в контракте; роли/решения/риск/исходники/снимки сохранены.

- Полный финальный browser: **43 passed (1.3m)**. Новые проверки — реальный audit API/автор/неизменность риска; presentation fixtures для задержки/503/retry/empty/неизвестного события/инертной HTML-строки. Старые R1–R6, OCR, сигналы и PDF входят в прогон.
- `node .local/history-visual.mjs`: 375/768/1024/1440, scrollWidth=viewport width на каждой; pageerror=0. Пагинация фокусирует заголовок и сохраняет несохранённое поле соседней формы. Reduced-motion: 0.00001s. Итоговые 375/1440 скриншоты визуально просмотрены; `output/history/dossier-{width}.png`. Исправлен обнаруженный недостаток отступов панели.
- `node .local/history-zoom.mjs`: настоящий вход через форму, отдельный временный Chromium profile, zoom=2 через chrome.tabs API, width=scrollWidth=720, DPR=2; Enter на anchor истории фокусирует раздел, ошибок JS нет. `output/history/zoom200.png`. CDP page-scale из отдельного capture не подменяет эту проверку.
- typecheck/lint/format и production build passed. Новые dependencies отсутствуют. Внешняя UX/предметная/screen-reader приёмка не проводилась; полное соответствие WCAG не заявляется.

Промежуточный полный прогон выявил широкие status locators и последующие зависимые ошибки DEMO-состояния; селекторы уточнены, тестовые решения завершены через API, финальные 43/43 проверены после последней сборки без перезапуска во время тестов. Подробности и точные команды — PROJECT_STATUS.

## Редизайн рабочего пространства · 16.10.2026

Исходная ревизия `e993dc8`, дерево перед работой чистое. Исследованы текущие маршруты/компоненты/тесты, README/статус/требования/CODEX_TZ, архитектура/UX/feature/ADR и DTO/OpenAPI/API. Направление — **Construction Intelligence / рабочее досье аналитика**, существующие зелёная навигация, светлые поверхности, системный sans-serif. Серверный код/контракты/права/риск не менялись.

| Экран → задача | Проблема до | Изменение | Риск регрессии / проверка |
|---|---|---|---|
| Обзор → выбрать случай | Полная таблица дублирует реестр | Пять объектов, охват выборки, реальные KPI, рабочая колонка | Первые 100 не глобальный рейтинг; score/total по API |
| Реестр → найти очередь | Фильтры только в controls; ссылка возврата теряет контекст | Active filters, город/застройщик, query-context досье | Поиск/страница/вид при reload и возврате |
| Карта → выбрать объект | Нет связи с выделением строки | Общий выбор с таблицей, текст/граница, сохранение при list/map | Keyboard/focus/fallback, reset при смене выборки |
| Досье → понять риск | Балл теряется в метаданных; одинаковая высота панелей | RiskSummary, anchors, различение фактов/форм/решений | Score/zone из API, формы mounted, UNKNOWN/DEMO/даты |
| Реклама → найти материал | Нет controls существующего status API и следующих страниц | Status/filter/page, разные даты, прямой review, возврат | Прежние строки скрыты при новом запросе/ошибке |
| Проверка → сопоставить источник | Выбор публикации в local state; области похожи | URL/Back/reload, selector, оригинал/гипотезы, статусы | Выбор не вызывает analyze; OCR/match/R2 отдельно |
| Правовые формы → источник/решение | Inputs и сведения визуально смешаны | Legal-review, fieldset/legend, поверхность решения, подписи | Labels/names/payload/revisions/обязательные проверки |
| Сигналы → решение/PDF/история | Длинный снимок без быстрых переходов | Anchors, RiskSummary, выделение версии, расшифровки | Снимок не заменяется текущими фактами; reason сохранён |
| Ввод/login/оболочка | Разные defaults headings; нет motion vocabulary | Sans-serif, 30/20 px desktop, controls 14 px, motion 150/200 ms | Reduced motion; 320–1920 px, RU/KZ |

Референсы просмотрены 16.10.2026, только публичные страницы. Применение ниже — дизайнерская интерпретация, без копирования закрытых экранов:

| Источник | Приём → проблема → применение |
|---|---|
| [Linear](https://linear.app/features) | Последовательность задач → обзор не ведёт к работе → очередь/переходы |
| [Vercel Geist](https://vercel.com/geist/introduction) | Foundations/components → разнобой состояний → tokens/headings/controls |
| [Stripe Dashboard](https://docs.stripe.com/dashboard/basics) | Навигация/списки/карточки → потеря контекста → возвраты/filters/pagination |
| [Palantir Workshop](https://www.palantir.com/docs/foundry/workshop/overview) | Связанные объекты/данные → разрозненные материалы → досье и две области review |
| [Radix accessibility](https://www.radix-ui.com/primitives/docs/overview/accessibility) | Native semantics/focus → недоступные controls → select/details/anchors; dialog без сценария не добавлен |

Awwwards dashboard/web-app страницы не загрузились, не заявляются изученными. UI UX Pro Max выполнен локально: `legal analytics dashboard --design-system`, `keyboard focus navigation --domain ux`. Приняты hierarchy/keyboard/focus; marketing Gateway/sales CTA/синяя палитра/внешние Fira fonts отвергнуты. Единственный master — DESIGN_SYSTEM, без persist/force. Новых dependencies/фреймворков/платных сервисов нет.

Скриншоты до: `output/redesign/before/` — 22 наблюдения, 375/1440. После — `output/redesign/after/`. Это реальные страницы/API; только тайлы в responsive-скрипте заменены локальным SVG. Исторические сведения аудита ниже относятся к прежним ревизиям.

Финальная проверка 16.10.2026:

- `npm run test:e2e` — **41 passed (1.3m)** на production frontend с действующими API/worker. Включает оригиналы TXT/PNG/PDF, настоящий OCR/bbox, отдельные решения R1–R6, пересчёт/отклонение, stale revisions, immutable signal versions/CONFIRM/RETURN и скачивание PDF. Шесть новых regressions: query-return досье, фактические scores/охват обзора, pagination/status/return рекламы, loading/error без старой очереди, 320–1920/reduced motion/aria-expanded, review URL/Back/reload без автоанализа. Map regression дополнен возвратом query и общим map/table selection. Pagination/отказы/некоторые viewer/длинные RU/KZ — явно обозначенные presentation mocks, не серверная приёмка этих свойств.
- `node .local/redesign-capture.mjs after` — **66 observations**, 10 authenticated routes + login на **320/375/768/1024/1440/1920**; page overflow=0, pageerror=0. Desktop/mobile screenshots основных экранов визуально просмотрены; это выборочный ручной просмотр, не просмотр каждого из 66 кадров. Регион таблицы прокручивается отдельно. В ходе первого прохода исправлен ошибочно расширенный CSS selector, который уменьшал подписи и давал overflow на 320; финальный повтор без этого дефекта.
- `node .local/redesign-zoom.mjs` — настоящий **вход через форму**, затем `chrome.tabs.setZoom(2)` в отдельном временном Chromium-профиле: dashboard/map/property/review/new/signals, **zoom=2, DPR=2, viewport/scrollWidth=720/720**, pageerror=0. Enter на метке перемещает focus к карточке; anchors досье/решения сигнала — к соответствующему заголовку. Тестовое расширение не устанавливается в пользовательский браузер.
- `npm run typecheck`, `npm run lint`, `npm run format:check` — passed; `npm audit --audit-level=high` — **0 vulnerabilities**; production `docker compose -f docker-compose.yml -f docker-compose.dev.yml build frontend` — passed. Обновлён только frontend через `up -d --no-deps frontend`; БД/storage/API/worker и посторонние проекты сохранены. Backend pytest не повторялся, серверный код не менялся.
- Первый focused run: 13/15; исправлены доступное имя ссылки карты и неоднозначный тестовый locator alert (Next route announcer), без ослабления предметных проверок. Финальные 41/41 включают эти исправления. Только семантические token contrast pairs проверены автоматически; полного нового rendered contrast audit нет.

Финальная самопроверка: **23 UTF-8 файла / 79 локальных Markdown-ссылок**, известных локальных secrets/credential patterns и отсутствующих ссылок не найдено; `git diff --check` passed. Минимальный измеренный текст responsive-набора — **12 px**. Ограниченный scan не является полным security audit.

Evidence (ignored): `.local/redesign-{before,after,zoom}.json`, `.local/redesign-{focused,browser-final,build-final}.log`, `.local/redesign-final-scan.json`, `output/redesign/{before,after}/`. Состояние проекта/границы — PROJECT_STATUS. Новые fonts/runtime deps не добавлены, отдельного сравнения bundle bytes/CLS/нагрузки не выполнялось; число API-запросов для декоративной статистики не увеличено. Внешние UX с 3–5 людьми, Windows screen reader и реальные touch devices остаются открытыми. Общая привязка серверных ошибок к каждому полю не добавлена; существующие native validation/inline alerts/draft protection сохранены. Полное соответствие WCAG 2.2 AA не заявляется.

Дата 15.10.2026. Исходная ревизия `59e870a`, аудит кода и локального UI. Визуальное направление и план показаны пользователю до реализации; ниже записаны наблюдавшиеся проверки текущего UI. API, данные, роли и правила риска сохраняются.

## Аудит до изменений

| Приоритет | Наблюдение | Свидетельство | Решение |
|---|---|---|---|
| P1 | Таблицы, даты и статусы слишком мелкие для длительной работы | globals.css: badge 8 px, th/date/zone 10 px, td 11 px; browser computed minimum 8 px на dashboard/registry/property | Типографическая шкала с нижней границей 12 px, текст таблиц 13 px |
| P1 | На телефоне нет выхода и роли | media max-width760 скрывает `.user`; browser 375 px `logoutVisible=false` | Сохранить профиль/выход на всех ширинах |
| P1 | Длинная карточка требует прокрутки для поиска формы | property screenshot 375 px высотой 4168 px, 84 интерактивных элемента на desktop | Anchor-навигация по досье, ясные заголовки, сохранение mounted forms |
| P1 | Коды причин не объясняют смысл без обучения | `PropertyTable`: confirmed_codes.join; метки R1/R2/R3 без расшифровки | Краткие текстовые расшифровки рядом с кодами |
| P1 | Цветов/размеров много, нет общего словаря | raw hex и локальные font-size по globals.css/review styles | Семантические tokens и единые состояния controls |
| P2 | Вся сводка состоит из одинаковых отдельных boxes | Четыре KPI cards + таблица + две compact cards | Общая KPI-полоса, рабочие документы и маршруты с разным ритмом |
| P2 | Основная навигация уезжает в горизонтальную прокрутку | mobile `.sidebar nav` flex/nowrap/overflow-x:auto | Открытая сетка пяти разделов на узкой ширине |
| P2 | Таблица не имеет отдельного доступного имени/keyboard-target | `.table-scroll` только overflow-x:auto | Focusable region с подписью и scope заголовков |
| P2 | Disabled cursor=wait, loading/error оформлены несогласованно | globals.css button:disabled cursor wait; `LoadState` role=status, Notice role=alert уже существуют | `not-allowed` для disabled, aria-busy для ожидания, сохранение native roles |

Baseline evidence (ignored): `.local/ui-design-before.json`, `output/design/before/*`: login/session получены через API без вывода credentials, страницы dashboard/registry/property/review/signals/new/upload. На проверенных 375/1440 px page overflow не обнаружен; это не свидетельство для остальных ширин. Скриншоты review/signals могли быть получены до завершения всех data-запросов — финальная проверка должна дождаться заполнения UI.

## Направление и границы

«Рабочее досье аналитика»: спокойная зелёная навигация, светлые документы, читаемая плотная таблица, ограниченный цвет семантических состояний. [DESIGN_SYSTEM](DESIGN_SYSTEM.md) и [UX_GUIDELINES](UX_GUIDELINES.md) определяют реализацию. Существующий Next/React/Tailwind/Radix Slot/Lucide; новая UI-библиотека не требуется.

Не менять серверные расчёты, review payloads, URLs endpoint, auth/CSRF, роли, snapshots/PDF и idempotency. Не менять сохранённый текст источников и не считать UNKNOWN отсутствием основания. Не скрывать важные действия/правовые оговорки ради компактности.

## Проверки после реализации

Реализовано: семантические tokens в design-system.css, шкала 12/13/14/19/28 px, новый ритм сводки/таблиц/досье/очереди, расшифровки R-кодов, русские status labels, видимые role/logout и пять разделов на mobile, skip-to-main, focusable table с scope=col, anchor-разделы досье без unmount форм. Обоснование R1 видно вне details и связано с прежней capture form; решения остаются отдельными. Очередь/детали сигналов стоят рядом при достаточной ширине; Open version переносит focus к выбранному документу, mobile show-original — к исходнику с возвратом к гипотезе. Экран входа на телефоне сокращён до компактного контекста и формы. Form submit сообщает aria-busy в формах входа/текста/файла. Новых runtime/dev dependencies нет.

| Проверка | Фактический результат |
|---|---|
| Responsive | 7 authenticated routes × 375/768/1024/1440 = 28 наблюдений; scrollWidth ≤ viewport в каждом, logout visible во всех, минимум измеренного рабочего текста 12 px. Дополнительно login на четырёх ширинах — без page overflow |
| Keyboard | Skip link → main, table focus + ArrowRight scroll, dossier anchors с сохранением unsaved reason, Enter/Space на карте, focus выбранного сигнала и оригинала на узком экране — проверены |
| Состояния | Тесты загрузки и пустого результата, retry после 503, R1 disabled до ввода причины; success/save, реальный OCR/review/signal/PDF в полном E2E |
| Viewer | Узкая ширина: роль видна, add-publication скрыт, logout доступен. Подменён только auth/me role для проверки presentation; это не новый backend authorization test |
| Token contrast | 13 text/control/focus pairs: text ≥4,5:1, control/focus ≥3:1; проверяется браузерным тестом по фактическим CSS variables |
| Дополнительный contrast sample | 7 заполненных страниц, 1440 px; вычисленная выборка видимых текстовых DOM nodes с композицией foreground/background/opacity: минимум 5,30:1, ниже порога не найдено. Disabled исключены. Это собственная ограниченная выборка, не полный WCAG/axe audit и не проверка текста внутри изображений |
| Browser suite | `npm run test:e2e` — **27 passed (1.0m)**. Новый design-system.spec.ts: 5 tests; прежние API assertions не ослаблены, только 3 ожидаемые видимые enum-строки заменены русскими status labels |
| Focused | `npx playwright test tests/design-system.spec.ts tests/analysis.spec.ts` — **11 passed (22.8s)** |
| Настоящий zoom | Chromium `chrome.tabs.setZoom(2)`/getZoom=2 в отдельном временном профиле, DPR=2, viewport/scrollWidth=720/720; карта с 8 markers, 8 real OSM HTTP200, Enter/card/attribution доступны. Это не CSS zoom. Пользовательский профиль не менялся |
| Статика/сборка | `npm run lint`, `typecheck`, `format:check`, `npm audit --audit-level=high` (0 vulnerabilities), production Compose build frontend — passed |
| Консоль | В 28 responsive observations pageerror не зарегистрированы |
| Финальное ревью | Независимый read-only review diff не выявил блокирующих ошибок; сохранены API/roles/revisions/idempotency, R1 form association и mounted state |

Локальные evidence (ignored): `.local/ui-design-{before,after}.json`, `.local/design-rendered-contrast.json`, `.local/design-{focused-final,final-browser,build,map-zoom}.log`, `output/design/{before,after}`, `output/qa/map-zoom-200-*.png`. Просмотрены реальные desktop/tablet/mobile screenshots обзора, реестра, досье/R1, review-original, signals/selected-signal, форм и login; по ним исправлены tiny mobile actions, растянутые badges/zone в очереди и большой пустой блок login. Проверки не предполагают pixel-identical rendering на всех ОС.

После полного browser прогона сделаны только финальные визуальные правки compact login/selected signal spacing и aria-busy. На итоговом production build повторены `npx playwright test tests/design-system.spec.ts` — **5 passed (8.5s)** и все **28 authenticated + 4 login responsive observations**, без page overflow/pageerror, минимальный измеренный рабочий текст 12 px. Финальные screenshots просмотрены, включая формы и компактный login. [GitHub CI точной ревизии 53e9ef0](https://github.com/temirkhanerbolatovich-coder/saq-qurylys/actions/runs/38762778431) полностью **success**: **294 backend / 27 browser / 27 tool tests**, frontend checks/build. Полный browser-набор повторён уже на финальном коде; job logs прочитаны. Evidence: `.local/design-smoke-final.log`, `.local/design-responsive-final.log`; публикация также записана в PROJECT_STATUS.

## Дополнение: постоянная UI/UX-инфраструктура, 15.10.2026

Исходная ревизия `5bd0cca`, предыдущий visual block не переделывался. Дополнительные пробелы: нет установленного Skill, каталога reuse, явных правил shared GitHub workflow и оценки числа действий; pagination дублируется, нет общего reset q/zone/legal_status. H4–H6 не имели проектной шкалы.

Внедрены repo `.agents/skills/ui-ux-pro-max` (один pinned upstream, 73 source hashes совпали), SOURCE/license/metadata, shared Pagination/TableRegion, H1–H6/font/spacing/shadow tokens, native search и reset с сохранением view/возвратом focus. Добавлены UI_COMPONENTS/UI_IMPLEMENTATION_PLAN и десять правил AGENTS. UX_GUIDELINES содержит walkthrough по основным сценариям и явное различие модели действий и user testing. Три независимых domain-step решения OCR/match/фактор и отдельный сигнал сохранены.

| Проверка | Наблюдавшийся результат |
|---|---|
| Codex discovery | Два свежих app-server процесса: ровно один ui-ux-pro-max, scope=repo, enabled=true; второй forceReload=false. Search smoke без pip/npm/сети, CI smoke добавлен |
| Skill applicability | Domain/Next.js searches и два system preview; marketing hero/sales patterns не применены и не persisted; palettes/fonts/API проекта сохранены |
| Focused UI | `npx playwright test tests/ui-infrastructure.spec.ts tests/design-system.spec.ts` — **8 passed (12.8s)** |
| Полный browser | `npm run test:e2e` — **30 passed (54.2s)**, настоящий OCR/R1–R6/сигналы/PDF и существующие regressions |
| Responsive / console | Повторены 28 authenticated routes и login на 375/768/1024/1440 — без page overflow; authenticated pageerror=0, min measured text=12. Дополнительно 4 filtered views и два component captures, pageerror=0 |
| Новые regressions | Reset удаляет q/zone/legal_status/page, сохраняет map и focus в search; server-metadata pagination сохраняет q и границы disabled; длинный RU/KZ accessible name/reduced-motion/без page overflow |
| RU/KZ | Визуально просмотрен полный набор Ә Ғ Қ Ң Ө Ұ Ү Һ І в строке таблицы 375 px. Mock только имени API-ответа. Native scroll сохраняет длинное имя; FontFaceSet check не заменяет проверку glyph coverage на других ОС |
| Статика / сборка | `npm run typecheck`, `lint`, `format:check`, `npm audit --audit-level=high` (0), production Compose build frontend — passed |
| Архитектура | Backend/API/БД/dependency locks не менялись. Локальный backend pytest не повторялся; результаты exact-SHA CI записываются в PROJECT_STATUS |

Evidence (ignored): `.local/ui-infrastructure/{focused,browser-full,build-final,responsive}.log`, `discovery{,-repeat}.json`, `*-result.txt`, `visual.json`; `output/design/{reset-*,ru-kz-visible-375,pagination-signals-375}.png` и свежие `after/*`. Визуально просмотрены reset mobile, tablet registry, RU/KZ row и пагинация/детали сигналов; не выявлены перекрытия/потеря controls. Подмена данных для pagination/имени проверяет presentation и URL, не нагрузку на большой реальной БД.

Опубликованная ревизия `d2d9c6b`: [exact-SHA GitHub CI](https://github.com/temirkhanerbolatovich-coder/saq-qurylys/actions/runs/38768212690) полностью **success** — **294 backend / 30 browser / 27 tool tests**, новый offline Skill smoke и frontend checks/build. Счётчики и успешный поиск Skill прочитаны из job logs. Backend pytest не повторялся локально, но выполнялся в этом чистом Linux CI.

Открыты: UX 3–5 людьми, screen reader, touch devices, KZ human review и legacy CSS consolidation. Тёмная тема только предусмотрена semantic tokens, не реализована. Dialog/toast/Storybook и новая server sorting не добавлены без продуктового сценария; их отсутствие не скрывается под claims полной установки UI suite.

## UX-блок: материал → проверка → сигналы

Исходная ревизия `1577cac`. Выявлены лишний переход после сохранения текста (карточка → review), отсутствие понятной карты длинного review и потери фильтров сигналов при reload/открытии версии. Прежний useData сохранял data во время смены path, из-за чего очередь могла временно показывать старые строки под новым фильтром.

Реализованы прямой Next Link в review (анализ остаётся отдельным действием), фокус результата сохранения, две смысловые группы в text/file формах, связанные hints/счётчик текста/имя и размер выбранного файла/aria-invalid для oversize. На review четыре anchor-этапа с фактическим count принятых/исправленных/отклонённых hypotheses, объяснениями готовности match/R2 и архивной версии; формы не unmount. Primary review относится к текущему материалу; добавление нового остаётся в разделе рекламы. Viewer получает описание ожидания аналитика, без кнопки запуска.

В signals state/property_id/is_stale/page/signal_id хранятся в URL; выбор/создание/история версии сохраняют фильтры, Back/reload восстанавливают контекст. При смене фильтра page/выбранный id сбрасываются. `useData.resolvedPath` позволяет скрыть чужую текущему запросу очередь и показать loading/error; прежнее поведение остальных callers сохранено. Прямая версия вне фильтрованной очереди подписана отдельно. Это не изменение API/ролей/решений/снимков.

Проверки 15.10.2026:

- Финальный `npm run test:e2e` — **35 passed (1.1m)** с реальными OCR/R1–R6/сигналами/PDF. Новые 5 tests: прямой переход без автоанализа/с сохранением текста; выбор/oversize файла без upload; steps/count/focus/сохранение причины; URL/history/reload; отсутствие прежней очереди при удержанном запросе. Viewer — presentation mock auth/me, не серверная приёмка роли.
- Focused 5/5 (11.3s) до последней viewer-copy; полный финальный прогон включает эту copy и проверку viewer. Первые отказы новых tests были преждевременным чтением URL/Back до завершения Next navigation; ожидания исправлены. Не ослаблялись существующие API assertions.
- Повторены **28 authenticated + 4 login responsive observations** на 375/768/1024/1440: page overflow=0, authenticated pageerror=0, min measured text=12. Визуально просмотрены финальные review desktop/mobile, forms desktop/tablet/mobile и signals desktop; helpers приближены к полям, конкурирующая primary на review убрана.
- `npm run typecheck`, `lint`, `format:check`, `npm audit --audit-level=high` (**0 vulnerabilities**), production Compose build frontend — passed. Контрастные token pairs и keyboard regressions входят в полный browser suite. Новый zoom/screen-reader/user test отдельно не выполнялся; прежняя zoom-проверка остаётся исторической.

Evidence (ignored): `.local/ux-flow/{focused-final,browser-final,responsive-final,build-final}.log`, `.local/ui-design-after.json`, `output/design/after/*`. [Exact-SHA CI 8434d1b](https://github.com/temirkhanerbolatovich-coder/saq-qurylys/actions/runs/38779704092) **success**: **294 backend / 35 browser / 27 tool tests**, Skill smoke и frontend checks/build. Счётчики прочитаны из job logs; backend pytest прошёл в чистом Linux CI, локально не повторялся. Публикация зафиксирована в PROJECT_STATUS; внешняя приёмка ниже остаётся открытой.

## Внешняя приёмка

Нужны UX-сессии с 3–5 аналитиками/читателями, проверка KZ/длинных имён, screen reader на целевой Windows-сборке и реальные touch devices. Визуальный аудит и функциональные тесты не устанавливают полное соответствие WCAG 2.2 AA.


## Поддержка и открытые улучшения

Базовый globals.css сохранён для специализированных модулей; новый design-system.css централизованно задаёт tokens и визуальные правила. Это постепенная миграция, а не удаление всех legacy declarations: новые компоненты не должны добавлять raw colors или локальные tiny font sizes. Последующая консолидация CSS допустима отдельным изменением с тем же browser-набором.

Не реализованы и не заявлены: полноценная новая система field-level server validation, user testing, screen-reader certification и новые modal/dialog сценарии. Сложные dialogs пока не нужны; правила их будущего использования через Radix зафиксированы в системе. Приоритет следующей UX-проверки — время понимания причин риска и прохождения review пользователем без обучения.

## CSV intake · 19.10.2026 · частичная локальная приёмка

CsvImport: native controls, явные preview/commit, mounted tab, immutable receipt
и сохранение query IDs. Два новых и два regression E2E:4PASS на QA3090 перед
последним polish. RU/KZ375/768/1024/1440 без page overflow>1px; клавиатура,
табличный scroll focus, download bytes, duplicate receipt, reload deep link PASS.
Desktop screenshot просмотрен; исправлены отсутствие padding и пустой Notice.
По ui-ux-pro-max error-summary добавлен фокус ошибки над формой и ссылка к файлу.
Финальная сборка PASS; повтор browser после этих правок и visual375/1440 OPEN.
Скриншоты: output/qa/csv-import-20261019. Внешняя UX/языковая приёмка OPEN.
Точные команды/окружение/прерванные проверки — PROJECT_STATUS.

## CSV intake — финальная приёмка и установка ·19.10.2026

Закрывает OPEN polish-проверки предыдущего раздела:4Playwright PASS12.2с на
финальной собранной QA3090; ESLint/tsc/Prettier PASS. Проверены error focus,
файлы/предпросмотр между вкладками, API commit только по отдельной кнопке,
повтор без дублей, byte-exact CSV download с .csv, receipt reload/deep link,
RU/KZ375/768/1024/1440 и keyboard scroll target. DesktopRU1440/mobileKK375
скриншоты просмотрены: padding и отсутствие пустой красной ошибки подтверждены.
На primary3000 после установки реальный файл20строк даёт19DUPLICATE, все ссылки
ведут на существующие материалы. Preview не сохранил пакет; journal0,
нет page errors/неявных POST;375/1440 overflow<=1px. Evidence — PROJECT_STATUS.
Длинные старые инструкции monitoring shell ещё частично RU в KZ-режиме;
внешняя редактура, screen-reader/full WCAG не объявляются выполненными.

## Social Monitor — источники и запуски ·19.10.2026

Каталог пяти методов и mounted панель «Запуски» используют существующие controls,
semantic tokens, native tables и GET refresh. Success/EMPTY/BLOCKED/ERROR/INTERRUPTED
различаются текстом; причины имеют RU/KZ и безопасный код. Историческая дата успеха
не объявляется текущим подключением. Таблица сохраняет все столбцы внутри scroll.

Финальный QA3090 Playwright sources/threads/csv/tools: **11PASS26.7с**.
Проверены реальный disabled attempt через QA API (503→сохранённая история),
Back/reload/deep links/filters, прежний candidate_id/q в новой ссылке, сохранность
черновика Threads, отсутствие POST при просмотре/GETretry; RU/KZ375/768/1024/1440,
overflow<=1px и keyboard table focus. Success snapshot/ошибка GET в новом browser
тесте используют presentation fixtures; live Threads/токен этим не подтверждаются.
Старые4Threads browser cases и CSV2/tools2 прошли в том же запуске.

Скриншоты `output/qa/source-runs-20261019`: desktopRU sources1440 и mobileKK
runs375 визуально просмотрены. Текст/ссылки источника экранируются; script literal
не исполняется. ESLint/tsc/Prettier и Docker build PASS. Более ранний9PASS/1FAIL
был неоднозначным getByLabel для select, исправлен role=combobox; финальный запуск
без retry. Внешняя языковая/предметная/WCAG приёмка остаётся OPEN. Новые каталог и
история RU/KZ; старые длинные инструкции Threads/monitoring частично RU.
Установка и preservation evidence фиксируются в PROJECT_STATUS.

Установка source/runs среза на primary3000 завершена: schemaac56b834d027,
пять методов/ThreadsDISABLED/история0,25досье/42материала/47assetSHA/14точек.
Primary browser smoke sources/runs375/1440 без overflow/pageerror/POST; opening
Threads сохраняет черновик при смене вкладок. CSV доступен. Это read-only runtime
проверка; синтетические поиски в рабочую базу не добавлялись. Полный backend1001PASS.
Точные preservation/backup/restore evidence — PROJECT_STATUS.
