# SAQ QURYLYS — техническое задание на улучшение UI/UX админ-панели

**Версия:** 2.0 — подробная визуальная спецификация, источники и темы\
**Дата:** 19.10.2026\
**Проект:** https://github.com/temirkhanerbolatovich-coder/saq-qurylys\
**Область:** существующий `frontend/` (Next.js / React / TypeScript / Tailwind CSS).\
**Тип работы:** эволюционный редизайн без изменения предметной логики и контрактов.

> Этот документ — новое ТЗ на визуально-функциональное улучшение интерфейса, а не замена действующих `CODEX_TZ.md`, `docs/DESIGN_SYSTEM.md`, `docs/UX_GUIDELINES.md` и `docs/UI_IMPLEMENTATION_PLAN.md`. Если возникнет конфликт, исполнитель должен выявить его, сохранить действующие инварианты и явно согласовать изменение; молчаливый override запрещён.

## 0. ОБЯЗАТЕЛЬНАЯ ВИЗУАЛЬНАЯ СПЕЦИФИКАЦИЯ: что брать, откуда брать и как применять

> **Этот раздел — точная инструкция реализации, а не список вдохновляющих сайтов.** Он дополняет разделы 1–15 ниже. Прямые ссылки даны на официальные страницы или первичные репозитории, где это возможно. Референсы предназначены для изучения паттернов, **не** для копирования брендов, графики или всего приложения. Если шаблон конфликтует с действующими компонентами/бизнес-процессами, приоритет у `docs/DESIGN_SYSTEM.md`, `docs/UX_GUIDELINES.md`, `AGENTS.md` и предметных инвариантов. Любое изменение утверждённого дизайн-мастера — отдельное осознанное решение с before/after и записью в docs.

### 0.1. Матрица конкретных решений — финальный shortlist

| Категория | Утверждаемый ориентир | Официальный источник | Как применять | Приоритет |
|---|---|---|---|---|
| Визуальный характер | **Vercel Geist** | https://vercel.com/geist/introduction | Системность, контраст, радиусы, компактные поверхности, границы и статусы; не брать фирменные логотипы | P1 |
| Навигация и рабочие очереди | **Linear** | https://linear.app/ | Sidebar, режимы плотного списка, понятный выбранный элемент, фокус на следующем действии | P1 |
| Пример структуры dashboard | **shadcn/ui `dashboard-01`** | https://ui.shadcn.com/blocks?category=dashboard | Только паттерны компоновки: `site-header`, `section-cards`, `data-table`; диаграммы — по реальной аналитике | P1 |
| Пример сворачиваемой навигации | **shadcn/ui `sidebar-07`** | https://ui.shadcn.com/blocks?category=sidebar | Изучить переход desktop→mobile; переписывать существующий sidebar не требуется | P1 |
| Работа с таблицами | **shadcn Data Table Guide** | https://ui.shadcn.com/docs/components/base/data-table | Фильтры, пустые состояния, выбор, фокус, пагинация; не ставить новый table engine без проблемы | P1 |
| Цветовые роли | **Vercel Geist Colors** | https://vercel.com/geist/colors | Модель surface / border / text / action, **но HEX из текущей SAQ-палитры**, не цвета Vercel | P1 |
| Типографика | **Inter** | https://rsms.me/inter/ | Основной UI после проверки KZ глифов в конкретном downloaded WOFF2 | P1 |
| Альтернативный UI-шрифт | **Onest** | https://fonts.google.com/specimen/Onest ; https://github.com/simpals/onest | Если Inter на реальных страницах менее читаем / KZ subset некорректен | запасной |
| Текстовый резерв | **Golos Text** | https://fonts.google.com/specimen/Golos+Text | Для экспериментального сравнения длинных досье; не смешивать произвольно с Inter | запасной |
| Проверка казахских глифов | **Kazakh Fonts** | https://kzfonts.com/ | Проверять 9 букв в *реальных локальных файлах шрифта*, не доверять надписи Cyrillic | P1 |
| UI-иконки | **Lucide React** | https://lucide.dev/icons/ ; https://lucide.dev/guide/react/ | Использовать существующую установленную зависимость | P1 |
| Базовые анимации | **CSS transitions** | https://developer.mozilla.org/en-US/docs/Web/CSS/transition | Переиспользовать готовые `--motion-hover`, `--motion-state`, `--ease-standard` | P1 |
| Сложные enter/exit | **Motion for React** | https://motion.dev/docs/react ; https://motion.dev/docs/react-animate-presence | Добавлять только после отдельного кейса и теста без потери focus/draft | P2 |
| Автоматические перестроения списков | **AutoAnimate** | https://auto-animate.formkit.com/ ; https://github.com/formkit/auto-animate | Альтернатива Motion **для одного узкого кейса**, не обязательно обе библиотеки | P2 |
| Цветовые шкалы для исследования dark-mode | **Radix Colors** | https://www.radix-ui.com/colors | Как справочник семантики/контраста, не импортировать палитру поверх SAQ | P2 |
| Доступность | **WCAG 2.2**, Vercel Web Interface Guidelines | https://www.w3.org/TR/WCAG22/ ; https://vercel.com/design/guidelines | Фокус, подписи, контраст, reduced motion, таблицы, states | P0 |
| Локальный шрифт Next.js | **`next/font/local`** | https://nextjs.org/docs/app/getting-started/fonts | Встраивание собственного font-файла без запроса браузера к внешнему CDN | P1 |

**Не ставить в проект автоматически:** shadcn CLI, Tailwind UI, Material UI, Ant Design, вторую систему иконок, Radix Colors целиком, Sonner, Recharts или Motion. Референс ≠ разрешение добавить зависимость. Основной путь — улучшение уже существующих компонентов.

### 0.2. Концепция внешнего вида — как должна восприниматься SAQ

**Название направления:** *SAQ QURYLYS / Construction Intelligence Workspace*.

- **Базовая тема:** светлая (Light / Master 1.4), высокая читаемость, нейтрально-зелёный фон и белые панели, тёмный зелёный CTA.
- **Стиль:** сложная административная работа без визуального шума: плотные информативные таблицы, тонкие границы, небольшие радиусы, минимум теней, одна главная CTA на блок.
- **Sidebar:** на desktop 220px или текущая проектная ширина, текст + иконка, выбранный пункт читается без цвета. На mobile — доступный toggle и полные названия разделов.
- **Header:** контекст текущей страницы, реальный поиск по объектам (не выдавать за глобальный), профиль/роль, ссылки на ближайшие задачи, если они реально поддерживаются.
- **Desktop:** контент не более текущей проектной ширины (~1500px); обзор — модульная сетка с управляемым количеством карточек. Проверка — две смысловые области; таблицы — самостоятельная горизонтальная прокрутка в `TableRegion`.
- **Визуальные приёмы:** тонкие `1px` границы, `8/12/16/24/32px` внутренние отступы, умеренные контрастные статусы. Никаких кислотных градиентов, glassmorphism, длинных parallax-эффектов, пульсирующих целиком карточек и декоративных 3D.

**Откуда брать какой приём:**

| Экран SAQ | Смотреть | Брать | НЕ брать |
|---|---|---|---|
| `/dashboard` | [shadcn `dashboard-01`](https://ui.shadcn.com/blocks?category=dashboard), [Geist](https://vercel.com/geist/introduction) | Иерархия title→queue→KPI→details; компактные KPI и корректные labels | Генерированные графики и показатели, если нет серверных данных |
| `/properties` | [shadcn Data Table](https://ui.shadcn.com/docs/components/base/data-table), [Linear](https://linear.app/) | Фильтры над таблицей, выбранная строка, стабильные колонки и пагинация | Клиентская сортировка одной страницы под видом общей сортировки |
| `/properties/[id]` | [Geist Design System](https://vercel.com/geist/introduction), [Linear](https://linear.app/) | Навигация по длинному досье, раскрытие подробностей, контекстное действие | Табы, скрывающие важные юридические ограничения или размонтирующие формы |
| `/advertisements` | [Geist](https://vercel.com/geist/introduction), [shadcn components](https://ui.shadcn.com/docs/components) | Cards для источника + даты + processing state, копируемые IDs | Урезанный оригинал вместо доступа к полному первоисточнику |
| `/review` | [Linear](https://linear.app/), [shadcn Data Table](https://ui.shadcn.com/docs/components/base/data-table) | Очередь решений, выбранный материал и независимая область evidence | Автоматическое подтверждение гипотез / анимацию «вердикта» |
| `/monitoring` / comparison | [Geist](https://vercel.com/geist/introduction) | Спокойная таблица diff, явные заголовки левой/правой версии | Автоматическое заключение «дубликат» по совпадению текста |
| `/signals` | [Geist Design System](https://vercel.com/geist/introduction), [shadcn Table](https://ui.shadcn.com/docs/components/base/data-table) | Версия, состояние, автор, PDF, история как устойчивый snapshot | Скрытие правовой оговорки, DEMO и provenance |

### 0.3. Шрифты — точный стек, веса, размеры и внедрение

**Основной выбор:** Inter (регулярное начертание Variable, диапазон весов 400–700). **Fallback:** `"Segoe UI", Roboto, Arial, sans-serif`. **Технический моношрифт (не обязательно подключать):** JetBrains Mono, исключительно для ID/SHA/технических частей; https://www.jetbrains.com/lp/mono/.

Почему **Inter**: хорошо работает в плотных таблицах, формовых метках и интерфейсных цифрах; при этом поддержка всех 9 казахских букв должна быть проверена на локальном файле *до* изменения master. Казахский тестовый текст: `Ә ә Ғ ғ Қ қ Ң ң Ө ө Ұ ұ Ү ү Һ һ І і`; тестовая рабочая строка: `Құрылыс нысаны: Өскемен, Қостанай, Іле ауданы. Ғимараттың құжаттары`. Тестировать 400/500/600/700, desktop+mobile, Chrome/Firefox, PDF viewer и печать; браузерный fallback на отдельных буквах недопустим.

**Альтернатива при провале проверки:** Onest, не Manrope; Golos Text — дополнительный кандидат для большого текстового блока. Проверять OFL/лицензию фактически используемых файлов.

| UI-элемент | Desktop | Mobile | Weight | Line-height | Примечание |
|---|---:|---:|---:|---:|---|
| H1 страницы | 28px | 24px | 650 или 600 (после пробного рендера) | 1.25 | Сохранить текущий размер мастер-токена; mobile отступы адаптивны |
| H2 секции | 19px | 18–19px | 650 / 600 | 1.4 | Не делать каждую карточку H2 |
| H3/card title | 16px | 16px | 600 | 1.5 | |
| Body/форма | 14px | 14px | 400 | 1.55–1.6 | Для мобильных интерактивных input при необходимости ≥16px, чтобы не зумил iOS |
| Table cell | 13–14px | 13–14px | 400–500 | 1.4–1.5 | Длинные ID переносить либо скроллить контейнер |
| Button/nav item | 14px | 14px | 500–600 | 1.3 | |
| Caption/meta | **≥12px** | **≥12px** | 400–500 | 1.4 | Не снижать до 10–11px ради плотности |
| KPI число | 28–34px | 24–30px | 600 | 1.15 | `font-variant-numeric: tabular-nums` |
| ID / SHA / версии | 12–13px | 12–13px | 400 | 1.45 | `overflow-wrap:anywhere`; не применять mono ко всей странице |

**Как внедрять в конкретном проекте:**

1. Сохранить baseline screenshots существующего Segoe UI/Roboto.
2. Скачать **разрешённый** файл Inter Variable с официального сайта https://rsms.me/inter/ (или официального репозитория https://github.com/rsms/inter ), сохранить его в новый локальный путь, например `frontend/assets/fonts/InterVariable.woff2`; имя *пример*, реальное имя берётся из скачанного файла. Нельзя считать файл существующим до добавления.
3. В `frontend/app/layout.tsx` использовать `next/font/local` и `variable: '--font-saq-inter'` (пример ниже), затем в `frontend/app/design-system.css` перенастроить **существующий** `--font-sans`. Не подключать CDN в runtime. Проверить лицензию и сохранить license notice в проекте.
4. Сделать screenshot A/B на RU+KZ, сравнить переносы строк, высоту строк таблиц и формы; провести приёмку. Если разборчивость не улучшилась — оставить текущий шрифт без установки сторонних пакетов.

```tsx
// frontend/app/layout.tsx — фрагмент, адаптировать к существующему layout
import localFont from 'next/font/local';
const saqInter = localFont({
  src: '../assets/fonts/InterVariable.woff2',
  variable: '--font-saq-inter',
  display: 'swap',
  weight: '400 700',
});
// На <html> использовать className={saqInter.variable}
```

```css
/* frontend/app/design-system.css — заменить значение существующего токена,
   не создавать параллельную дизайн-систему */
:root { --font-sans: var(--font-saq-inter), 'Segoe UI', Roboto, Arial, sans-serif; }
.tabular-data { font-variant-numeric: tabular-nums; }
.technical-id { overflow-wrap: anywhere; }
```

### 0.4. Светлая тема — **точные существующие** HEX из `frontend/app/design-system.css`

Это не выдуманная новая палитра: ниже перечислены текущие tokens master 1.4, проверенные по публичному исходнику 19.10.2026. **Их не менять просто ради «нового дизайна».** При несовпадении с новой ревизией репозитория приоритет у текущего кода и решений master.

| Семантика | CSS token | Значение | Для чего |
|---|---|---|---|
| Фон страницы | `--color-canvas` | **#F4F5F1** | Главная подложка |
| Surface/панель | `--color-surface` | **#FFFFFF** | Карточки, таблица, формы |
| Вторичная поверхность | `--color-surface-subtle` | **#EEF1EC** | Вложенная/hover поверхность |
| Основной текст | `--color-text` | **#202721** | Заголовки, content, текстовые решения |
| Вторичный текст | `--color-text-muted` | **#59685F** | Дата, вспомогательная метаинформация |
| Граница | `--color-border` | **#DFE5DE** | Панели/разделители |
| Граница controls | `--color-control-border` | **#819087** | Inputs/select |
| Бренд/CTA | `--color-brand` | **#183E30** | Primary button, выбранное состояние |
| Brand hover | `--color-brand-hover` | **#102F24** | Primary hover |
| Brand soft | `--color-brand-soft` | **#E2F1E7** | Выделение, hover навигации |
| Фокус | `--color-focus` | **#9B4B0E** | Контрастный focus ring; не заменять только glow |
| Успех | `--color-success` / `-bg` | **#205B40 / #E8F2EA** | Сохранено/подтверждено (с текстом) |
| Предупреждение | `--color-warning` / `-bg` | **#76500C / #FFF3D6** | Требует внимания; не автоматически юридическое нарушение |
| Опасность/ошибка | `--color-danger` / `-bg` | **#A12D39 / #FBECEE** | Ошибка/опасное действие |
| Информация/UNKNOWN | `--color-info` / `-bg` | **#344F63 / #EDF3F6** | Неизвестно / нейтральная информация |
| Акцент (использовать редко) | `--color-accent` | **#39A96B** | Дополнительные highlights, если уже есть обоснование |

**Качественные правила:**

- Не окрашивать целиком большие блоки в красный/зелёный. Для badges — лёгкая семантическая подложка, понятный текст и независимое от цвета состояние.
- `UNKNOWN ≠ safe`, `READY_FOR_REVIEW ≠ решение завершено`, `REJECTED ≠ false advertisement`, `DEMO ≠ live`.
- Для данных риска применять только серверную категорию и юридически корректную подпись. Цвет лишь вспомогателен.
- Светлая палитра проверена выборочными расчётами WCAG: `#202721` на `#F4F5F1` ≈ 13.96:1; `#59685F` на `#FFFFFF` ≈ 5.88:1; белый на `#183E30` ≈ 11.86:1. Проверка всех combinations требуется отдельно.

### 0.5. Тёмная тема — **новое конкретное предложение**, НЕ утверждённый master

**Решение по scope:** Светлая тема обязательна и остаётся default. Тёмная — **запланированный отдельный P2-срез**, включаемый только после завершения P0/P1, проверки accessibility и фиксации нового решения в `docs/DESIGN_SYSTEM.md`. Ниже приведены конкретные HEX и семантика, чтобы её можно было реализовать без импровизации. Пока такой реализации нет, **не показывать нерабочий theme-toggle**.

| Семантика | CSS token | Предлагаемый Dark HEX | Деталь |
|---|---|---|---|
| Canvas | `--color-canvas` | **#0F1714** | Тёмный зелёно-графитовый |
| Surface | `--color-surface` | **#17221D** | Карточка на фоне |
| Subtle surface | `--color-surface-subtle` | **#1E3027** | Hover/вложенный блок |
| Primary text | `--color-text` | **#EBF4EE** | Основной текст |
| Muted | `--color-text-muted` | **#AEC2B5** | Подписи и meta |
| Border | `--color-border` | **#35463D** | Панели |
| Control border | `--color-control-border` | **#70877A** | Ввод / focus area |
| Brand | `--color-brand` | **#8ED3A6** | Светло-зелёный primary на dark |
| Brand hover | `--color-brand-hover` | **#B2E7C3** | Hover primary |
| Brand soft | `--color-brand-soft` | **#203D2E** | Тихая brand-подложка |
| Active nav | `--color-nav-active` | **#8ED3A6** | Важно: текущий text-on-active в dark берёт тёмный `--color-surface`, контраст сохранится |
| Nav main | `--color-nav` | **#17221D** | |
| Nav text | `--color-nav-text` | **#AEC2B5** | |
| Focus | `--color-focus` | **#F8B566** | Тёплый оранжевый контрастный outline |
| Success text/bg | `--color-success` / `-bg` | **#8DD8AE / #1C3528** | |
| Warning text/bg | `--color-warning` / `-bg` | **#F2CB7C / #2E2615** | |
| Danger text/bg | `--color-danger` / `-bg` | **#F5A0A9 / #301D22** | |
| Info text/bg | `--color-info` / `-bg` | **#A4CAE2 / #1B2933** | |
| Accent | `--color-accent` | **#8ED3A6** | |

Выборочная проверка контраста: `#EBF4EE` на `#0F1714` ≈ 16.23:1; `#AEC2B5` на `#17221D` ≈ 8.72:1; `#8ED3A6` на `#17221D` ≈ 9.37:1; тёмный текст `#17221D` на `#8ED3A6` ≈ 9.37:1. **Это расчёты базовых пар, не гарантия полной доступности всей тёмной темы.**

Пример будущего CSS, **не вставлять без аудита всех существующих hardcoded `#fff`, rgba, теней, Leaflet controls и PDF viewer**:

```css
/* Подключать только в отдельном P2 PR после проверки Light/master */
html[data-theme='dark'] {
  color-scheme: dark;
  --color-canvas: #0f1714;
  --color-surface: #17221d;
  --color-surface-subtle: #1e3027;
  --color-text: #ebf4ee;
  --color-text-muted: #aec2b5;
  --color-border: #35463d;
  --color-control-border: #70877a;
  --color-brand: #8ed3a6;
  --color-brand-hover: #b2e7c3;
  --color-brand-soft: #203d2e;
  --color-nav: #17221d;
  --color-nav-text: #aec2b5;
  --color-nav-active: #8ed3a6;
  --color-focus: #f8b566;
  --color-success: #8dd8ae;
  --color-success-bg: #1c3528;
  --color-warning: #f2cb7c;
  --color-warning-bg: #2e2615;
  --color-danger: #f5a0a9;
  --color-danger-bg: #301d22;
  --color-info: #a4cae2;
  --color-info-bg: #1b2933;
  --color-accent: #8ed3a6;
}
```

**Требования к будущему переключателю Light / Dark / System:**

- Создать только после проверенной реализации обеих тем. Выбор пользователя сохраняется локально как предпочтение UI, **без** персональных данных; дефолт — Light, пока не согласовано иное.
- При `System` следить за системной темой. Исключить flash неправильной темы на загрузке (Next SSR/hydration), не ломать CSP. Никаких изменений данных/ролей/API.
- Все страницы, модалки, badges, таблицы, map tiles/attribution, фокус, skeleton, пустые состояния, форма и PDF-preview должны иметь проверенную тёмную версию. Исторический PDF при этом **не перерисовывать задним числом**.
- Пройти тесты screen widths и contrast каждого статуса; не вводить переключатель, если хотя бы один критический рабочий процесс не покрыт.

### 0.6. Иконки — утверждённая библиотека и **список конкретных имен**

Использовать **уже установленный** `lucide-react` (`frontend/package.json`). Основные размеры: sidebar `18px`, inline рядом с текстом `16px`, header/панель `20px`, icon-only `18–20px`; stroke `1.75` (выбрать одинаковый stroke на одной поверхности); `color: currentColor`. Не делать иконки единственным маркером статуса. Для новых names проверить экспорт против установленной версии на текущем lockfile.

| UI-сценарий | Имя Lucide-экспорта | Страница с примером |
|---|---|---|
| Обзор | `LayoutDashboard` | https://lucide.dev/icons/layout-dashboard |
| Объекты | `Building2` | https://lucide.dev/icons/building-2 |
| Реклама | `Megaphone` | https://lucide.dev/icons/megaphone |
| Проверка | `ClipboardCheck` | https://lucide.dev/icons/clipboard-check |
| Сверка / сравнение | `GitCompareArrows` | https://lucide.dev/icons/git-compare-arrows |
| Сигналы | `ShieldAlert` | https://lucide.dev/icons/shield-alert |
| Карта | `MapPinned` | https://lucide.dev/icons/map-pinned |
| Документы/доказательства | `Files` | https://lucide.dev/icons/files |
| История действий | `History` | https://lucide.dev/icons/history |
| Поиск | `Search` | https://lucide.dev/icons/search |
| Фильтр | `Filter` | https://lucide.dev/icons/filter |
| Очистить/закрыть | `X` | https://lucide.dev/icons/x |
| Перейти к объекту | `ArrowUpRight` | https://lucide.dev/icons/arrow-up-right |
| Скачать документ | `Download` | https://lucide.dev/icons/download |
| Открыть оригинал | `ExternalLink` | https://lucide.dev/icons/external-link |
| Скопировать ID/SHA | `Copy` | https://lucide.dev/icons/copy |
| Успех операции | `CheckCircle2` (проверить alias в установленной версии) | https://lucide.dev/icons/circle-check |
| Предупреждение | `TriangleAlert` | https://lucide.dev/icons/triangle-alert |
| Неизвестные данные | `CircleHelp` | https://lucide.dev/icons/circle-help |
| Ошибка загрузки | `CircleAlert` | https://lucide.dev/icons/circle-alert |
| Настройки | `Settings2` | https://lucide.dev/icons/settings-2 |
| Тема light/dark (когда готова) | `Sun`, `Moon`, `Monitor` | https://lucide.dev/icons/sun ; https://lucide.dev/icons/moon ; https://lucide.dev/icons/monitor |

```tsx
import { LayoutDashboard, Building2, Megaphone, ClipboardCheck,
  ShieldAlert, Search } from 'lucide-react';

// Пример общего подхода, не новый обязательный component package.
// Sidebar: <LayoutDashboard size={18} strokeWidth={1.75} aria-hidden="true" />
// Рядом остаётся видимый текст "Обзор".
// Icon-only button: aria-label="Поиск" на настоящем <button>.
```

**Запрещено:** вперемешку использовать emoji / Lucide / Material Symbols в одном sidebar; назначать красный щит любому обычному документу; добавлять декоративную иконку ко всем ячейкам таблицы. Альтернативы [Tabler](https://tabler.io/icons) и [Phosphor](https://phosphoricons.com/) оставить *только как обзор референсов*, не как параллельный runtime-набор.

### 0.7. Анимации — точные сценарии, свойства, тайминги, источники

Опора на **существующие** токены: `--motion-hover: 150ms`, `--motion-state: 200ms`, `--ease-standard: cubic-bezier(0.2, 0, 0, 1)`. Это точные значения из текущего CSS. Не добавлять Motion, пока не доказан недостаток CSS.

| Событие | Что анимируется | Duration / easing | Что обязательно сохранить |
|---|---|---|---|
| Кнопка hover | `background-color`, `border-color`, `color` | `150ms`, `--ease-standard` | Не анимировать `width` и `height` |
| Выбор строки / nav | фон и цвет | `150ms` | Selected/aria-current и после завершения анимации |
| Открытие inline detail | opacity + небольшое перемещение на **2–4px** | `200ms` | Не переносить фокус, сохранять содержимое черновика |
| Обновление полученных данных | Однократный fade-in | `200ms` | Не выдавать запрос за состоявшийся результат раньше ответа API |
| Открытие drawer на mobile | `transform` и `opacity` | `200–240ms` | Фокус внутри, Escape, возврат фокуса, скролл body |
| Успешное сохранение | Появление Notice с текстом | `200ms` | `role="status"`, подтверждение только после успеха API |
| Ошибка/409/422 | Появление Notice без мигания | `200ms` | `role="alert"`, поле причины не теряется |
| Загрузка таблицы/формы | Skeleton правильной геометрии | Без бесконечного навязчивого shimmer; opacity ≤ умеренно | Нет layout shift, доступное название загрузки |
| Реорганизация списка | Простой мгновенный порядок или P2 `AutoAnimate` | P2, только после UX-сравнения | Выбранный объект/фокус, правильный порядок данных |

**Пример CSS (только к конкретным классам, не `transition: all`):**

```css
.saq-interactive {
  transition: background-color var(--motion-hover) var(--ease-standard),
              border-color var(--motion-hover) var(--ease-standard),
              color var(--motion-hover) var(--ease-standard);
}
@media (prefers-reduced-motion: reduce) {
  .saq-entrance { animation: none !important; transform: none !important; }
}
```

**Сложные эффекты (P2):** https://motion.dev/docs/react-animate-presence — `AnimatePresence` только там, где действительно размонтируется отдельный noncritical visual элемент; не размонтировать draft формы. Установка после review: `npm install motion` в `frontend/`, изменить lockfile, проверить bundle, no-JS и reduced-motion. Дополнительная альтернатива: https://auto-animate.formkit.com/ — *вместо* Motion для перестановки простых списков. Не включать обе без доказанной пользы.

**Прямой запрет:** confetti, spring-bounce баллов риска, автоскролл при смене статуса, бесконечная анимация успешных решений, анимированный фон, motion-by-default при reduced motion, скачки layout при поиске.

### 0.8. Компоненты — готовые примеры и критерий «взять / написать»

| Компонент SAQ | Официальный пример | Решение |
|---|---|---|
| Карточка сводки | https://ui.shadcn.com/blocks?category=dashboard | Переоформить существующую карточку, не импортировать целый блок |
| Данные в таблице | https://ui.shadcn.com/docs/components/base/data-table | Расширять `TableRegion`/`Pagination`; server-side page/total остаются |
| Skeleton | https://ui.shadcn.com/docs/components/base/skeleton | Добавить только там, где стабильное loading layout улучшит UX |
| Tabs | https://ui.shadcn.com/docs/components/radix/tabs | Вкладывать только когда контент безопасно скрывать; form drafts остаются mounted |
| Badge | https://ui.shadcn.com/docs/components/base/badge | Сохранить собственные semantic цвета, подписи `UNKNOWN/DEMO` |
| Alert | https://ui.shadcn.com/docs/components/base/alert | Сохранить текущий `Notice` и aria semantics |
| Button | https://vercel.com/geist/button | Единая иерархия primary / secondary / destructive, одна CTA |
| Accordion / details | https://ui.shadcn.com/docs/components/base/accordion | Сначала нативный `details` проекта; не ломать вложенные формы |
| Ввод / labels | https://ui.shadcn.com/docs/components/base/input | Не потерять `label`, ошибки/подсказки, disabled и required |

Только при документированной необходимости разрешается новое общее UI-примитивное решение. Подключать фрагменты shadcn CLI «потому что красиво» нельзя: сборка и семантика текущей системы важнее.

### 0.9. Правила раскладки и размеров для разработчика

| Зона | Базовая метрика | Условия |
|---|---|---|
| Desktop sidebar | 220px текущая ширина | Текстовые лейблы и активный пункт сохраняются |
| Topbar | Не меньше 68px текущий baseline | Не раздувать ради декоративной кнопки |
| Глобальная область | Не более текущих ~1500px | Не вводить скролл body вбок |
| Gaps | 4 / 8 / 12 / 16 / 24 / 32 / 40 / 48 px | Соответствие существующим `--space-*` |
| Радиус controls | **9px** | `--radius-control` |
| Радиус panel | **14px** | `--radius-panel` |
| Тень | Существующий `--shadow-card` | Только hover/плавающие слои если нужно; данные не должны выглядеть как рекламные карточки |
| Interactive target | Цель **44×44px**, где это возможно | Приоритет мобильным и таблицам действий |
| Long labels | 2–3 строки допускаются | Не усекать критичные юридические значения |
| Длинный URL / SHA | `overflow-wrap:anywhere` | Полный текст доступен, копирование только как дополнительное действие |
| Таблицы | Контейнерный горизонтальный scroll | Критические колонки не удалять ради мобильной ширины |

**Responsive acceptance:** viewport widths `375`, `768`, `1024`, `1440`; масштаб браузера 200%; RU/KZ не обрезаются; таблица скроллится только внутри своего блока, при этом sticky-header/selected row не теряют контекста. На маленьком экране `/review` превращается в последовательность «очередь → оригинал → решение → подтверждение», без скрытия доказательства.

### 0.10. Конкретные изменения по файлам репозитория

Пути ниже отражают известную структуру на 19.10.2026; перед правкой прочитать HEAD и проверить существование; **не** создавать дубль, если компонент уже реализован в другом месте.

| Файл / область | Что изменить | Проверка |
|---|---|---|
| `frontend/app/design-system.css` | Оставить Light tokens как baseline; A/B Inter; аккуратная унификация `font-*`, hover/focus/animation; P2 отдельные dark overrides | Visual diff; contrast; reduced motion |
| `frontend/app/layout.tsx` | Только после KZ-approve локальный Inter через `next/font/local` и className/variable | RU/KZ глифы, нет external runtime fetch, нет layout shift |
| `frontend/components/workspace.tsx` | Dashboard hierarchy и `/properties`/досье: labels, ID, контекст, next action, данные без выдуманных totals | Таблица/карта/URL и draft intact |
| `frontend/components/analysis-workspace.tsx` | Уточнить левую область provenance и правую область решений, без autoaccept | Черновики и server review decisions |
| `frontend/components/review-queue.tsx` | Уплотнить выбор задания, бейджи и фокус, сохранить `total` и страницу | URL/Back/reload, no lost draft |
| `frontend/components/signals-workspace.tsx` | Сводка версии + PDF + evidence + история в единой семантической иерархии | Immutable snapshots, PDF history |
| `frontend/components/monitoring-workspace.tsx`, `publication-comparison.tsx` | Подписанные левые/правые оригиналы, дата, таблица diff, переносы | Сравнение остаётся read-only |
| `frontend/components/ui/button.tsx` и существующие primitives | Нормализовать иконку/текст/hover/focus, aria-label, размеры | Keyboard, disabled, loading |
| `frontend/lib/status-labels.ts` / `presentation.ts` | Оставить юридически верные подписи статусов и risk, косметические классы по семантике | UNKNOWN/DEMO/R1–R6 не подменены |
| `frontend/tests/*` | Visual/regression/A11y проверки и сохранение draft | `npm run test:e2e` |
| `docs/DESIGN_SYSTEM.md`, `docs/UX_GUIDELINES.md`, `docs/UI_AUDIT.md` | Зафиксировать решение A/B и неизменность master либо явное одобренное обновление | Документация соответствует коду |

### 0.11. Жёсткие визуальные и функциональные критерии приёмки

- [ ] Приложение по умолчанию открывается в существующей Light-теме с перечисленной палитрой; **никаких неожиданных новых HEX** вне семантической системы.
- [ ] Inter подключён локально **только после** проверки всех KZ глифов, RU/KZ скриншотов и регрессий; иначе текущий шрифт оставлен с письменным пояснением.
- [ ] Заголовки и размеры в токенах; body 14px, caption не меньше 12px, H1 ~28px, control/panel 9/14px; 200% zoom работает.
- [ ] У всех пяти верхнеуровневых зон единая 18px Lucide-иконка + подпись, активное состояние читается без цвета; нет смесь emoji/иконографий.
- [ ] UI-состояния `loading`, `empty`, `error`, `saving`, `success`, `conflict`, `UNKNOWN`, `DEMO`, `scope limited` оформлены единообразно и текстом.
- [ ] Нет выдуманных KPI/трендов, клиентской сортировки неполной выборки под видом всех данных; границы loaded vs total видимы.
- [ ] Motion соблюдает reduced motion, не блокирует фокус, не создаёт визуальной потери черновика; никакого `transition:all`.
- [ ] Таблицы, карта, сравнение OCR, версия PDF и юридические основания доступны на 375/768/1024/1440px.
- [ ] Dark mode (P2) **не считается выполненным**, пока не доказан контраст всех компонентов, нет FOUC, доступны настройки Light/Dark/System и пройдены E2E. До этого отсутствует неработающий переключатель.
- [ ] Нет изменений в backend, API, роли/CSRF, риск R1–R6, idempotency/revision, исторические snapshot/PDF и сохранённые решения.
- [ ] Перед завершением обновлены `docs/UI_AUDIT.md` и `PROJECT_STATUS.md` с результатами реальных проверок и перечислены неготовые P2 задачи.

### 0.12. Короткое задание для Codex / Cursor (копировать вместе со **всем** документом)

> Сделай SAQ QURYLYS современным аналитическим workspace, используя визуальную спецификацию из раздела 0 данного ТЗ как источник конкретных дизайн-решений: Vercel Geist для цветовых ролей/поверхностей, Linear для плотных рабочих очередей, shadcn Dashboard/Data Table только для паттернов компоновки. Основной шрифт — локальный Inter при прохождении RU/KZ глиф-проверки, fallback Onest при обосновании. В light сохранить точные semantic HEX мастер-палитры, иконки оставить Lucide React с mapping из таблицы, анимации — CSS tokens 150/200ms; dark использовать только как отдельный завершённый P2 с приведённой палитрой и полной проверкой. Сначала прочитать AGENTS/PROJECT_STATUS/DESIGN_SYSTEM/UX_GUIDELINES и актуальный код. Не переносить целиком чужие шаблоны, не устанавливать новые библиотеки без причины, не менять API/риски/роли/PDF, не терять черновики и evidence. Работать малыми PR/срезами, приложить screenshots RU/KZ light до/после и результаты lint/typecheck/build/E2E; push/deploy только после отдельного разрешения.

---

## 1. Цель и результат

Повысить читаемость и скорость работы аналитика с реальными публикациями, объектами строительства, оригиналами/версиями OCR, гипотезами, документами, риск-факторами и историческими сигналами. Интерфейс должен выглядеть цельно и современно: строгая эстетика Linear + Vercel Geist, но **без копирования брендинга** и без пустой анимационной декоративности.

**Определение готового результата:** аналитик без подсказки находит материал, видит источник и даты, переходит к конкретному действию, принимает или отклоняет гипотезу в рамках полномочий, возвращается к прежним фильтрам и черновику, видит сохранённое решение, историю и PDF; на узких экранах ничего критического не исчезает. Никакие изменения представления не меняют расчёт риска, юридический смысл данных и исторические версии.

### Приоритеты

- **P0 (обязательно):** сохранность данных/черновиков; корректные состояния и тексты; иерархия действий; единые элементы оформления; адаптивность; доступность; регрессионные проверки.
- **P1 (после P0):** улучшенная типографика, организация досье, локальные переходы и таблицы, визуальная полировка.
- **P2 (опционально):** сложные анимации Motion, дополнительная система горячих клавиш, новые диаграммы при достаточности данных. Не выполнять в ущерб P0.

## 2. Обязательное изучение проекта перед изменениями

До правок прочитать: `AGENTS.md`, `README.md`, `PROJECT_STATUS.md`, `docs/REQUIREMENTS.md`, `docs/DESIGN_SYSTEM.md`, `docs/UX_GUIDELINES.md`, `docs/UI_COMPONENTS.md`, `docs/UI_AUDIT.md`, `docs/UI_IMPLEMENTATION_PLAN.md` и относящиеся контракты/ADR. Сверить с актуальными `main`, `git status`, package lock и тестами. Изучить `.agents/skills/ui-ux-pro-max/SKILL.md` (уже установлен в репозитории; не устанавливать копии).

В отчёте об аудите привести таблицу **маршрут → существующее поведение → подтверждённая UX-проблема → изменение → тест → риск регрессии**. Не описывать уже реализованную функцию как отсутствующую. Не выполнять неотносящийся рефакторинг backend.

### Известная база на 19.10.2026

- Next.js 16 / React 19 / TypeScript / Tailwind CSS 4; Leaflet; Lucide; Radix Slot + CVA. Реальная версия зависит от актуального lockfile.
- Принятая дизайн-система **master 1.4**: светлая оболочка, canvas `#f4f5f1`, текст `#202721`, muted `#59685f`, brand `#183e30`; radius control ~9px, panel ~14px; H1/H2 ~28/19px, body ~14px, caption ≥12px.
- Уже имеются `Button`, `Notice`, `LoadState`, `PageTitle`, `Pagination`, `TableRegion`, `RiskSummary`, `PropertyMap`, review drafts, URL/query/pagination, реальные API totals, loading/empty/error, reduced-motion.
- Пять разделов: Обзор `/dashboard`, Объекты `/properties`, Реклама `/advertisements`, Проверка `/review` (вложенная Сверка и comparison), Сигналы `/signals`.
- Изменения выполняются **в имеющемся приложении**. Не создавать новый макет-дубль вместо интеграции.

## 3. Визуальное направление и дизайн-токены

### 3.1 Общий стиль

- Спокойный нейтральный фон, белые/светлые панели, глубокий тёмно-зелёный primary, графитовый текст, тонкие границы, контролируемые радиусы; умеренная плотность данных.
- Приоритет информации: **действие → конкретный объект/материал → доказательства/источник/даты → вторичный контекст**.
- Одна главная CTA на рабочую область; опасные/юридически значимые действия отделить от нейтральных.
- Не добавлять объёмные градиенты, glowing-карточки, glassmorphism, крупные hero-блоки, декоративные иконки в каждой строке, 3D и яркие иллюстрации.
- Сохранить прежние CSS custom properties и семантические состояния; новые токены вводить только если нужную роль невозможно выразить существующими.

### 3.2 Шрифты

**Предложение, не автоматическое требование смены master:** протестировать локальный **Inter** как основной UI-шрифт. До внедрения создать сравнительный скриншот current vs Inter для RU/KZ, длинных таблиц, PDF-ссылок и форм. Проверить глифы `Ә ә Ғ ғ Қ қ Ң ң Ө ө Ұ ұ Ү ү Һ һ І і`, лицензирование, веса и браузеры; без проверок шрифт не менять. Использовать `next/font/local` или иной проектно-совместимый локальный способ, не делать обязательных сетевых запросов к Google Fonts. Fallback оставить системным. Для технических ID/SHA допустим локальный JetBrains Mono только при обосновании и проверке переносов.

Типографическая шкала:

| Элемент | Ориентир | Ограничение |
|---|---|---|
| Заголовок страницы | 28px / 600–700 | На мобильном допустимо 24px |
| Подзаголовок секции | 18–20px / 600 | Сохранить структуру h1…h6 |
| Основной текст | 14–15px / 400–500 | Контраст WCAG 2.2 AA |
| Таблица | 13–14px / 400–600 | Читаемые ячейки; tabular-nums для чисел |
| Подпись/метаданные | ≥12px | Не сокращать DEMO, UNKNOWN, даты |
| Большой показатель | 28–34px / 600 | Только реальный server total; явный охват |

### 3.3 Цвет статусов

- Брендовый зелёный — для навигации/primary, **не** вывод «объект безопасен».
- Риск (green/yellow/red) — только из серверного результата плюс **текстовая подпись**, не вычислять цветом юридическую квалификацию.
- `UNKNOWN`, `PENDING`, `REJECTED`, `CONFIRMED`, `DEMO` и `READY_FOR_REVIEW` имеют отдельные понятные текстовые значения. Отсутствие документа или данных не равно доказанному отсутствию основания.
- Цвет и иконка никогда не единственный носитель смысла. Контраст текста минимум 4.5:1 для обычного текста (кроме нормативных исключений).

### 3.4 Компоновка/отступы

- Использовать текущую шкалу spacing и радиусы. Не заводить новый набор произвольных `px` для каждой карточки.
- Sidebar на desktop с **иконкой + подписью**, активное состояние доступно через `aria-current`; на мобильном доступная навигация по пяти зонам.
- Для таблиц — существующий `TableRegion` с горизонтальным скроллом, корректными заголовками и фокусом; не убирать критические столбцы.
- Вложенные карточки ограничить: не помещать 3–4 рамки одна внутрь другой.

## 4. Иконки и анимации

### 4.1 Иконки

Стандарт — **существующий `lucide-react`**, `18–20px`, stroke примерно `1.75–2`, единая толщина. Примеры: `LayoutDashboard`, `Building2`, `Megaphone`, `ClipboardCheck`, `ShieldAlert`, `MapPinned`, `Files`, `History`, `Search`. Иконки при основных навигационных действиях всегда дополнены текстом; у icon-only кнопок обязателен доступный label. Не устанавливать параллельно Tabler/Phosphor без отдельного решения.

### 4.2 Motion

- Hover/focus: 120–150 мс; раскрытие/смена локальной панели: ~180–220 мс; короткий fade: ~150–200 мс.
- Сначала использовать существующие CSS tokens и переходы. `motion` или `auto-animate` подключать **только** если после аудита найден сценарий, который сложно корректно решить CSS; каждое новое dependency обосновать.
- Запрет: анимация увеличения балла/риска без серверного ответа, эффектный confetti после юридического решения, движение фона на рабочих экранах, бесконечные shimmer-эффекты вне загрузки.
- `prefers-reduced-motion: reduce` — без крупных перемещений; асинхронное событие подтверждается текстом/`aria-live`.
- При смене layout, фильтров и вкладок не терять клавиатурный фокус и введённый черновик.

## 5. Требования по экранам

### 5.1 Обзор — `/dashboard`

- Первый экран: точные очереди и ближайшие рабочие действия: новые материалы, ошибки обработки, материалы с нерешёнными действиями, черновики сигналов — **только если есть соответствующие реальные API данные**.
- Для каждой карточки: короткий заголовок, серверное количество (или корректная метка ограниченности), действие-переход с сохранением понятного контекста, loading/empty/error.
- `READY_FOR_REVIEW` = состояние обработки, **не** число нерешённых решений. Количество материалов и количество действий не складывать.
- Общий поиск явно ограничен объектами (название/адрес) и ведёт к `/properties?q=…`, не обещать поиск по документам/всем сигналам.
- Диаграммы показывать только по фактически загруженной выборке, видимо подписывать «Загружено N из M» / период / отсутствие полной статистики; не имитировать тренды.

### 5.2 Объекты — `/properties`, `/properties/[id]`

- Реестр: поиск «Название ЖК или адрес», серверные фильтры, серверная пагинация, текстовые состояния legal/risk/DEMO, доступный сброс фильтров. Возврат из досье сохраняет `q`, `zone`, `legal_status`, `page` и текущий view.
- Таблица и карта применяют один и тот же набор фильтров/выбор; карта ограничена текущей серверной страницей; объект без координат остаётся в таблице. Нельзя выдать местный поиск или сортировку одной страницы за поиск/сортировку всего реестра.
- Досье: компактная идентификация ЖК/очереди/адреса/застройщика; серверные score/zone/as-of/revision; правовое основание с номером, датой, охватом и источником; ближайшее доступное действие.
- Локальная логическая структура досье: обзор, правовые основания, реклама, факторы R1–R6, доказательства, история, сигналы. Сначала реорганизовать существующий UI через anchors/native details; не создавать фальшивые вкладки и не размонтировать формы.
- P0: до визуальных изменений проверить и устранить известный риск потери причины R4 при выходе/возвращении в досье, а также риск потери других legal/construction draft форм; сохранение через session draft либо явное предупреждение при уходе, но не автосохранение решений на сервере. Файл сохраняется в input только в текущей сессии; после reload требуется повторный выбор с понятным уведомлением.

### 5.3 Реклама — `/advertisements` и текущие вложенные маршруты

- Разделить существующие варианты ввода текст / изображение / разрешённый URL; не смешивать поле URL с обещанием автоматического массового сбора.
- Карточка материала: оригинал, тип источника, URL, дата публикации (или «Не установлена»), дата получения, SHA/asset и статус обработки. Полный оригинал доступен в деталях; обрезка preview не удаляет доказательства.
- OCR-текст и исходник визуально различимы; гипотеза модели не выглядит подтверждённым фактом. Для длинных URL/SHA — переносы, копирование при наличии текущего решения, отсутствие page overflow.
- Пагинация/фильтры серверные, возврат сохраняет страницу и query. Асинхронный анализ — отдельная команда, retry GET не вызывает повторного анализа.

### 5.4 Проверка — `/review` и вложенная «Сверка»

- Начальный экран — **точная очередь нерешённых действий** через существующий review-queue API, с серверными `total` и page; старый processing mode остаётся отдельным и понятно подписан.
- Desktop: контекст очереди и выбранного объявления; слева оригинал с provenance/точным фрагментом, справа гипотезы, конкретное соответствие объекту/очереди, доказательства, отдельные действия подтверждения/исправления/отклонения. На mobile — линейная последовательность с якорными переходами.
- Разделять «текст, предложенный OCR», «кандидат сопоставления», «подтверждённый фактор», «сохранённое решение». Каждый юридически значимый POST — явный пользовательский action со своей проверкой полномочий, reason/revision/idempotency.
- Сохранение причины R2 и остальных черновиков при 409/422, Back/reload, смене материала и раскрытии секций. Исключить двойные команды при pending. Не ослаблять конфликты ревизий.
- Сверка/сравнение `/comparison`: оригинал и архивная extraction выбираются явно; diff — read-only; совпадение текста не называть доказанным дублем. Не изменять риск при просмотре.
- Viewer видит read-only представление без ложного впечатления о возможности сохранить решение.

### 5.5 Сигналы — `/signals`

- Список с серверными фильтрами, пагинацией и явным разделением выбранной версии от списка; выбранный `signal_id` и фильтры сохраняются в URL/Back/reload.
- Экран выбранного сигнала: объект, версия, история, доказательства, подтверждённые факторы, решение человека, дата, автор, PDF и правовая оговорка. Исторические snapshots immutable.
- Поиск «по загруженной странице» не выдавать за серверный глобальный поиск. Нельзя показывать устаревший список как результат нового фильтра или считать отсутствие загрузки нулём.
- Ошибка revision/conflict не удаляет причину. Скачать/открыть PDF можно лишь из реально существующего endpoint; кириллица и DEMO в PDF сохраняются.

### 5.6 Авторизация и состояние без данных

- Существующие auth/roles, protected pages, CSRF/idempotency, Session/logout не изменять.
- На каждом экране различать `loading`, `empty`, `filtered-empty`, `error`, `permission-denied`, `success`, `stale/conflict`, `demo/unknown`, `partial-scope` — только реальные состояния, а не декоративные «всё хорошо».
- Ошибки должны говорить, что случилось и что сделать дальше; retry получения данных не дублирует запись.

## 6. Общие UI-компоненты

Использовать имеющиеся `Button`, `PageTitle`, `Notice`, `LoadState`, `Pagination`, `TableRegion`, `RiskSummary` и native `input`, `select`, `details`, `fieldset`. Новые компоненты создавать только после поиска по `docs/UI_COMPONENTS.md` и `frontend/components`.

Допустимые узкие улучшения: общие отображение статуса (семантика/label), breadcrumb, metadata row «источник + даты», локальный skeleton с фиксированным размером и подтверждение успешного сохранения. Не создавать новый глобальный state manager, новый headless framework, parallel Button/Card/Table или библиотеку toast ради пары сообщений. Не переводить формы на custom Select/Popover без необходимости.

## 7. Доступность, языки и адаптивность

- Целевой стандарт **WCAG 2.2 AA** для новых/изменённых интерфейсов; автоматический аудит дополнить ручной клавиатурной проверкой, потому что один axe не доказывает полное соответствие.
- Поддержка RU/KZ, включая полные строки и спецсимволы; визуально проверить реальный контент, пустые состояния и формы.
- Размеры проверки: 360, 375, 390, 768, 1024, 1440, 1920 px, а также zoom 200%; минимально обязателен текущий baseline 375/768/1024/1440.
- Нет горизонтального скролла *страницы*; таблица может скроллиться внутри подписанного `TableRegion`. Интерактивные цели по возможности ≥44×44 CSS px, мобильные поля ввода 16px.
- Tab/Shift+Tab, Enter/Space, Escape в соответствующих native controls; видимый `:focus-visible`, корректные label/aria-describedby, `aria-live` для сохранения/ошибки, семантический heading outline.
- Reduced motion; контраст WCAG AA; избегать icon-only навигации без подписи.

## 8. Файлы/области изменений

**Ниже ориентиры из документированной структуры; исполнитель обязан проверить актуальные расположения перед правкой:**

| Область | Основные существующие файлы |
|---|---|
| Общий стиль | `frontend/app/design-system.css`, `frontend/app/globals.css` (если существует) |
| Оболочка, обзор, реестр, досье | `frontend/components/workspace.tsx` |
| Проверка | `frontend/components/analysis-workspace.tsx`, `frontend/components/review-queue.tsx` |
| Сигналы | `frontend/components/signals-workspace.tsx` |
| Сверка и сравнение | `frontend/components/monitoring-workspace.tsx`, `frontend/components/publication-comparison.tsx`, `frontend/app/monitoring/monitoring.css` |
| Переиспользуемые элементы | `frontend/components/ui/button.tsx`, `pagination.tsx`, `table-region.tsx` |
| Статусы, черновики | `frontend/lib/status-labels.ts`, `presentation.ts`, `use-review-draft.ts` |
| Тесты | существующие `frontend/tests/*` (Playwright) |
| Документация | `docs/DESIGN_SYSTEM.md`, `UX_GUIDELINES.md`, `UI_COMPONENTS.md`, `UI_AUDIT.md`, `UI_IMPLEMENTATION_PLAN.md`, `PROJECT_STATUS.md` |

Не добавлять файл только ради соответствия таблице; обнаружить фактический путь. Если работа затронет backend/contract, остановить этот срез, оформить причину, границу API и отдельное согласование.

## 9. Порядок выполнения и демонстрации

**Этап 0 — аудит/фиксация baseline (P0):** текущий commit SHA, снимки ключевых экранов/размеров, аудит состояния draft, карта компонентов/токенов, список точных проблем. Записать план в существующий `UI_IMPLEMENTATION_PLAN`, а не делать отдельный master.

**Этап 1 — безопасность сценариев (P0):** сохранить/предупреждать о draft (включая R4), проверить revision/409/422/idempotency и routing context. Добавить регрессионные Playwright тесты.

**Этап 2 — визуальная иерархия (P0/P1):** унифицировать typography/spacing/информационные блоки, улучшить обзор, реестр, досье, очередь и сигналы, сохраняя токены и reusable элементы.

**Этап 3 — шрифты/иконки/легкая анимация (P1):** сравнить Inter с текущим стеком на RU/KZ, внедрить при доказанном улучшении; упорядочить Lucide, фокус/hover/feedback, skeleton и reduced motion.

**Этап 4 — регрессия и приёмка (P0):** браузерные/типовые проверки, доступность, реальные API/DB end-to-end сценарии; ручной осмотр и документирование границ. Не выдавать презентационные mocks за реальную предметную приёмку.

В каждом срезе: одна цель, небольшой PR/diff, before/after screenshots (в локальном ignored каталоге), тесты, документированный результат/ограничения. Не пушить, не мержить, не выкладывать на сервер без отдельного разрешения пользователя.

## 10. Инварианты, которые нельзя менять

1. **Расчёт риска только на backend**: R1–R6 веса 35/25/10/15/10/5; зелёная/жёлтая/красная зона по утверждённым правилам. UI не вычисляет и не перекрашивает риск самовольно. UNKNOWN/PENDING/REJECTED не начисляют баллы; красная ≥60 только при подтверждённых R1+R2.
2. Система показывает **гипотезы**, решения принимает человек; нет автоматического вердикта о нарушении. Отсутствующая запись/ошибка реестра не доказывает отсутствие правового основания.
3. Сохранять оригинал, URL, даты, SHA, источники, охват документов, аудит, привязку к очереди/объекту; DEMO явно маркируется.
4. Версии сигналов/PDF — неизменяемые исторические snapshots. Не перезаписывать историю при новом решении.
5. Роли viewer/analyst, auth, API, договорённые DTO, CSRF, idempotency, revision и backend validation остаются прежними.
6. Сохранённый черновик ≠ выполненная команда; открытие/read-only GET/переключение view не должно выполнять POST.
7. Карта/диаграммы/поиск показывают честно ограниченный охват; не создавать fictitious данные и графики.

## 11. Команды проверок

Запускать из `frontend/` (при наличии проектных зависимостей/инфраструктуры):

```bash
npm run typecheck
npm run lint
npm run format:check
npm run build
npm run test:e2e
```

Прогнать имеющиеся тесты workspace/UX/review-queue/comparison/signals и интеграционные сценарии; `npm audit --audit-level=high` при сетевой доступности и необходимости. Если backend для E2E не поднят, указать это, **не** выдавать browser-mock за полноценный end-to-end. Изменения frontend не подразумевают необходимости менять lockfile.

### Регрессионные сценарии минимум

| ID | Сценарий | Ожидаемый результат |
|---|---|---|
| UX-01 | Ввод причины R4 → уход в реестр → Back/reload | Причина восстановлена либо явное предупреждение до потери |
| UX-02 | Текст/причина R2 → 409/422 → исправление | Ввод сохранён, нет скрытого повторного POST |
| UX-03 | Viewer открывает review и сигнал | Read-only, нет доступной команды без роли |
| UX-04 | Фильтр реестра → объект → назад | q/zone/legal/page/view сохранены |
| UX-05 | Фильтры сигналов → выбрать версию → назад/reload | Корректная версия, фильтры и страница сохранены |
| UX-06 | Очередь действий vs processing READY | Разные подписи и server totals, ничего не суммируется |
| UX-07 | Comparison original/extraction → diff | Явные версии, read-only; нет изменения risk/audit |
| UX-08 | Карта без координат / неполная страница | Объект остаётся в таблице, scope показан |
| UX-09 | Данные 100 из 205 → диаграмма | Прямо указаны границы набора, не 205 полных записей |
| UX-10 | RU/KZ + 375/768/1440 + 200% zoom | Глифы видны, нет page overflow, формы доступны |
| UX-11 | `prefers-reduced-motion` | Нет лишних перемещений, результат действия ясен |
| UX-12 | Конец сценария от нового материала до PDF | API/OCR/человек/факторы/сигнал/PDF работают как до редизайна |

## 12. Критерии приёмки — Definition of Done

- [ ] Все пять основных зон и существующие вложенные маршруты доступны; ключевые CTA работают.
- [ ] Проверки UX-01…UX-12 пройдены либо честно отмечены BLOCKED с причиной; P0 не принимается с критическим failing case.
- [ ] Нет регрессий риска, ролей, ревизий, API, черновиков, idempotency, происхождения оригиналов и исторических PDF.
- [ ] В наличии сравнение до/после по ключевым страницам на desktop/mobile; нет horizontal page overflow на обязательных ширинах.
- [ ] Шрифты читаемы по-русски и по-казахски; система визуально едина, без конкурирующих наборов иконок/кнопок.
- [ ] Loading/empty/error/permission/409/422 являются корректными и понятными; retry не повторяет запись.
- [ ] Клавиатура, фокус, reduced-motion, labels, видимые DEMO/UNKNOWN/source/date и legal caveat проверены.
- [ ] `npm run typecheck`, `lint`, `format:check`, `build`, `test:e2e` завершились успешно в доступной среде; непроверенное не заявлено как PASS.
- [ ] Обновлены действующие `docs/DESIGN_SYSTEM.md`, `docs/UX_GUIDELINES.md`, `docs/UI_COMPONENTS.md` (при изменении каталога), `docs/UI_AUDIT.md`, `docs/UI_IMPLEMENTATION_PLAN.md` и `PROJECT_STATUS.md`; указан commit SHA и точный scope проверки.
- [ ] Нет самовольного деплоя/пуша, новых backend контрактов и несогласованных зависимостей.

## 13. Ограничения по времени и порядок сокращения

Если времени недостаточно, выполнить: (1) сохранность review/dossier drafts и семантика очередей, (2) единая информационная иерархия и обратная связь, (3) responsive/клавиатура/реальные проверки. Перенести на потом: (4) смену шрифта при неполной языковой проверке, (5) сложные анимации, (6) новую библиотеку графиков, (7) тёмную тему. Не сокращать P0 ради «красивого» видео демо.

## 14. Инструкция исполнителю (можно вставить в Codex / Cursor)

> Работай в существующем репозитории SAQ QURYLYS. Выполни это ТЗ как **инкрементальное UI/UX-улучшение**, не переписывая проект. Сначала прочитай `AGENTS.md`, `PROJECT_STATUS.md`, `docs/DESIGN_SYSTEM.md`, `docs/UX_GUIDELINES.md`, `docs/UI_COMPONENTS.md`, `docs/UI_AUDIT.md`, `docs/UI_IMPLEMENTATION_PLAN.md` и реальный код; проверь git HEAD и изменения. Отметь, что уже реализовано, найди реальные пробелы и выдай краткий gap-анализ. Потом реализуй P0 небольшими проверяемыми срезами: сохранность черновиков (особенно R4), корректные очереди/тексты, иерархия пяти зон, responsive/accessibility и тесты. Оставь прежние API/роли/CSRF/idempotency/revisions/snapshots и расчёт R1–R6 без изменения. Не подключай новую UI-библиотеку ради внешнего вида, не меняй дизайн-мастер без обоснования, не выдумывай статистику, не добавляй автоюридический вердикт. Перед любым изменением шрифта проверь казахские символы и сравнение со старым вариантом. Проверь `typecheck`, `lint`, `format:check`, `build`, `test:e2e` и ручной UX по ширинам; подробно фиксируй фактически пройденные проверки и оставшиеся блокеры в текущей документации. Не делай commit/push/merge/deploy без отдельного разрешения.

## 15. Внешние референсы

- Linear: https://linear.app/
- Vercel Geist: https://vercel.com/geist/introduction
- shadcn/ui dashboard blocks: https://ui.shadcn.com/blocks?category=dashboard
- Inter: https://rsms.me/inter/
- Lucide: https://lucide.dev/icons/
- Motion: https://motion.dev/docs/react-animation
- WCAG 2.2: https://www.w3.org/TR/WCAG22/

**Итог:** профессиональное рабочее место аналитика, где эстетика усиливает скорость и безопасность принятия решений, а не подменяет реальные доказательства.
