# Аудит интерфейса SAQ QURYLYS

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
