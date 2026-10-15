# Аудит интерфейса SAQ QURYLYS

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

Evidence (ignored): `.local/ux-flow/{focused-final,browser-final,responsive-final,build-final}.log`, `.local/ui-design-after.json`, `output/design/after/*`. Exact-SHA GitHub CI фиксируется после публикации в PROJECT_STATUS. Внешняя приёмка ниже остаётся открытой.

## Внешняя приёмка

Нужны UX-сессии с 3–5 аналитиками/читателями, проверка KZ/длинных имён, screen reader на целевой Windows-сборке и реальные touch devices. Визуальный аудит и функциональные тесты не устанавливают полное соответствие WCAG 2.2 AA.


## Поддержка и открытые улучшения

Базовый globals.css сохранён для специализированных модулей; новый design-system.css централизованно задаёт tokens и визуальные правила. Это постепенная миграция, а не удаление всех legacy declarations: новые компоненты не должны добавлять raw colors или локальные tiny font sizes. Последующая консолидация CSS допустима отдельным изменением с тем же browser-набором.

Не реализованы и не заявлены: полноценная новая система field-level server validation, user testing, screen-reader certification и новые modal/dialog сценарии. Сложные dialogs пока не нужны; правила их будущего использования через Radix зафиксированы в системе. Приоритет следующей UX-проверки — время понимания причин риска и прохождения review пользователем без обучения.
