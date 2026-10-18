# SAQ QURYLYS — PROJECT STATUS

## F-08/F-09 · понятные задачи и PDF ·19.10.2026 · LOCAL VERIFIED

База ee6605e, codex/audit-workflow-fixes, на входе clean. Пользователь разрешил
продолжить и запустить нужные сервисы. Root: F-08/frontend/контракт/runtime;
агент: F-09 backend filenames/tests, затем независимый read-only review.
F-08: optional nullable r2_reviews.property_name точного target ID, один batch
SELECT по именам. Исторические ID/evidence/команды/draft scope/counts/порядок
прежние. UI явно показывает текущее реестровое имя и прежний объект; UUID
доступен вторым уровнем/fallback. STAGE переведён только при отображении,
сохранённый код и редактор прежние. Контракт0.19.0-mvp, master1.5.
F-09: PDF name включает тип, название, дату записи, полный ID и v/r сигнала.
Unicode/ASCII Content-Disposition и безопасный клиентский parser. Имя сигнала
только frozen snapshot; исходные/готовые PDF не переписываются. Неизвестный MIME
имеет нейтральную подпись с пояснением оригинала/копии. Риск/роли/решения прежние.

Проверки: полный Linux backend914 PASS239.49s; focused PDF38 PASS9.42s.
Selected frontend37 PASS/2 gated SKIP1.2m; затем оба live-сценария и настоящий
PDF3 PASS15.5s на явно изолированном стенде. Live проверяет анализ, явные решения,
перепривязку и отдельное отклонение прежнего R2. Production13 новых parser/
presentation tests PASS5.9s. Build/TypeScript/ESLint/Prettier/Ruff PASS.
Два R2-варианта на375/768/1024/1440 без page overflow;375/1440 просмотрены
визуально. Unicode/fallback/MIME/signature/error/retry, GET без бизнес-команд,
точные target/evidence и сохранность причин проверены. Полный browser suite и
внешняя приёмка не выполнялись. Снимки: output/qa/review-pdf-20261019;
реальный PDF — output/qa/tabs-pdf-20261018/property-report.pdf.

Docker Desktop запущен. QA saq-review-pdf-20261019: отдельный DB volume и
.local/review-pdf-20261019/storage, API8247/UI3000, внешние интеграции выключены.
Рабочие DB/storage не использовались. Полный pytest сначала не собрался из-за
отсутствующего mount scripts; QA-конфигурация исправлена, финальный run чистый.
Ruff readonly-cache заменён host Ruff. QA процессы остановлены; volumes/storage
сохранены. Туннель не запускался. Автозапущенные Docker worker рабочего стенда
и посторонний PostgreSQL остановлены перед QA, без удаления данных; рабочая
БД оставалась остановленной.

Основные пути: review_queue.py/analysis_dto.py/pdf_filenames.py/document_exports.py,
api/exports.py/signal_pdf.py; review-queue.tsx/analysis-workspace.tsx/pdf-download.tsx,
presentation.ts/types.ts, contract и связанные tests/docs. Команды: QA Compose
exec api python -m pytest -q -p no:cacheprovider; Playwright review-language-pdf,
review-queue, zz-review-queue-live, dossier-tabs, supporting-pdf, analyst-composition,
functional-safety (для двух live: SAQ_ISOLATED_ACCEPTANCE=1 на localhost).
npm run build/typecheck/lint/format:check; host Ruff check/format; repository
hygiene и git diff --check PASS. Конфигурация QA — локальный ignored
.local/review-pdf-20261019/acceptance.compose.json; в Git secrets не добавлены.

Автопроверка отклонила production start с адресом тестового API: только
«blocked by policy», без подробной причины. Повторного обхода нет: обычный
production start использован с полным HTTP-mock; реальная связка проверена на dev.
Отклонён также длинный shell-скрипт обновления docs; ограниченные изменения
документации внесены структурированным apply_patch. Это ограничения исполнения,
не провал сборки. Публикации/push/merge/туннеля нет.

Следующий шаг: F-02 — черновики сверки; затем независимая UX/предметная приёмка,
C-01 и второй ПК. Новый ADR не требуется: расширено существующее представление
и скачивание без новой архитектуры. Полная готовность проекта не заявляется.

## Согласованная композиция приложения ·19.10.2026 · LOCAL VERIFIED / PRESENTATION

Пользователь «окок» согласовал три макета. База a473941, ветка
codex/audit-workflow-fixes, на входе clean. Исполнитель Codex; отдельный
read-only review указал на focus скрытого дубля реестра и зависимые селекторы.
Перенесена композиция в реальные компоненты, без новой библиотеки/зависимостей.
Обзор: компактные независимые очереди и общая рабочая очередь сразу под ними,
3/5 объектов в кратком/подробном виде, прежний серверный порядок. Реестр: таблица
в обоих видах на desktop, полные карточки на телефоне в кратком виде; все шесть
столбцов и коды доступны. Длинные адреса переносятся; широкий набор прокручивается
в TableRegion. Возврат фокусирует видимую ссылку. Досье: подчёркнутые вкладки,
сгруппированные сведения, точное следующее действие первым в ходе проверки;
на узком экране эта панель предшествует сведениям. Sidebar — существующий
deep-green token с контрастным текстом/focus. Master1.5, API0.18 без изменений.

Код: workspace.tsx/design-system.css/use-registry-context.ts. Новый
analyst-composition.spec.ts (8 сценариев); обновлены presentation-селекторы
simple-interface/dashboard-priority и изоляция смены fixture-сессии в
functional-safety. Проверки: npm run build/typecheck/lint/format:check PASS.
git diff --check и scripts/check_repository_hygiene.py PASS.
Playwright analyst-composition + functional-safety: dev18 PASS31.6s до последнего
плотного кейса; финальная production-сборка19 PASS20.4s. Матрица двух режимов ×
трёх экранов ×375/768/1024/1440:24 скриншота без page overflow, клавиатура
Home/End, сохранение URL/q/page/map и visible focus; error/retry/empty, viewer,
все R1–R6 в плотной строке, прежние черновики/401/409/success. Составной сценарий
только читает mock API, без POST; прежние тесты отправляют команды только fixture.
Скриншоты output/qa/analyst-composition-20261019 просмотрены визуально, включая
исправленные переносы и отсутствие наложения риска/ссылки на375px.

Это frontend с синтетическими HTTP-ответами, не проверка рабочей БД/OCR/PDF.
Docker engine в этой сессии недоступен; полный прежний backend/browser suite
и внешняя приёмка не запускались. Первые проверки выявили ошибочный селектор
скриншота, dev StrictMode read-count и гонку при смене синтетической сессии;
исправлены тестовые предпосылки. Визуально найденные наложение и широкая строка
исправлены в CSS и покрыты assertions. Исторические CI ниже не новый результат.

Обновлены README/CHANGELOG/REQUIREMENTS, DESIGN_SYSTEM/UX_GUIDELINES,
UI_COMPONENTS/UI_AUDIT/UI_IMPLEMENTATION_PLAN, описание приоритета/макетов и
функциональный аудит. Нового ADR нет: архитектура/контракт/риск/auth/снимки/данные
прежние. Только локальный commit; push/deploy/публичный runtime не затрагивались.
Следующий шаг: F-08/09 — понятные исторические задачи и назначение PDF; затем
оставшаяся сохранность сверки F-02 и независимая UX/предметная приёмка.
Поиск материалов/новый CRUD/C-01/второй ПК остаются открытыми.

## Функциональный блок A и три макета ·19.10.2026 · LOCAL VERIFIED

Пользователь «окей гоу» согласовал начало исправлений. Один Codex; база1b6b4af,
codex/audit-workflow-fixes, на входе clean. F-01: новый материал использует
существующий useReviewDraft, user/session/TTL12h; legacy saq-ad-draft не
восстанавливается и очищается на logout/401. F-02 частично: причина SignalCard
привязана к signal_id, сохраняется на переходах/reload/409, очищается после
success; часть monitoring остаётся OPEN. F-03: DossierProgress открывает точный
pending-документ или R1/R3–R6 с focus, в том числе без публикаций; R2 прежний.

Код: workspace.tsx/signals-workspace.tsx/use-review-draft.ts; новые
functional-safety.fixture.ts/spec.ts.11 self-contained presentation tests:
dev13.8s PASS, production build9.9s PASS. Пять редакторов×четыре ширины без
page overflow, focus/keyboard target; legacy/logout/401, Storage fallback,
перерывы/версии/409/success и viewer. API ответы синтетические: рабочая БД,
бизнес-команды, OCR/PDF и внешние уведомления не затрагивались. Первый прогон
9PASS/2FAIL исправлен ожиданием URL commit перед Back; первый lint выявил одну
неиспользуемую test variable, исправлено. TypeScript/build/lint/format PASS.
Прежний полный backend/browser suite и внешняя приёмка заново не выполнялись.

[Макет трёх экранов](docs/prototypes/README.md): отдельный standalone HTML,
проектные tokens, DEMO, без API. Браузер375/768/1024/1440:12 наблюдений,
исправлен первоначальный overflow таблицы обзора; поиск/переходы/стрелки
вкладок и имитация решения проверены. Композиция ещё не перенесена в приложение.
Локальный просмотр: http://127.0.0.1:8137/prototype; файл открывается и без сервера.
Preview helper: node .local/functional-safety-20261019/preview.mjs, только
loopback/один HTML, без API. Изображения: output/qa/functional-safety-20261019.

Документация: README/CHANGELOG/UX_GUIDELINES/UI_AUDIT/UI_IMPLEMENTATION_PLAN,
функциональный аудит и prototypes/README. Master1.4/API0.18/auth/риск/снимки/
данные прежние; новых dependencies/ADR нет. Repository hygiene/diff check PASS.
Только локальный commit, без
push/deploy. Следующий шаг: согласование макетов, затем presentation-блок и
F-08/09; F-02 monitoring, поиск материалов, C-01 и внешние приёмки остаются OPEN.

## Аудит функционала ·19.10.2026 · LOCAL AUDIT / NO APP CHANGES

Пользователь попросил оценить функционал и продумать его удобство. Исполнитель:
один Codex, база849f04b, codex/audit-workflow-fixes, на входе clean. Подготовлен
[аудит 18 групп функций и 14 замечаний](docs/audits/SAQ_QURYLYS_FUNCTIONAL_AUDIT_2026-10-19.md).
Прочитаны актуальные UI/API/контракт, черновики и тесты; на рабочем HTTPS
прочитаны обзор/добавление/очередь/DEMO-review/сигнал/досье/сверка/источники.
Бизнес-команды, загрузки, генерация PDF, решения и внешние уведомления не запускались.

Новые CODE-находки: общий saq-ad-draft не очищается на logout/401 и не содержит
user/session; причина SignalCard в useState теряется при размонтировании/reload;
DossierProgress не учитывает код pending-фактора при выборе следующего действия.
Переключение аккаунтов и записывающие регрессии на рабочей БД не выполнялись.
Также подтверждены отсутствие q в рекламе/review-queue и create/update объекта
в текущем контракте. Кандидат сверки — доступный предварительный путь, не Property.

Предложены короткие исправления сохранности/навигации, затем единый рабочий
сценарий и макеты по референсам. Расширения требуют отдельного решения/контракта;
C-01, внешний holdout/предметная/UX-приёмка и второй ПК остаются OPEN.
Изменены только этот статус, UI_IMPLEMENTATION_PLAN и новый аудит; код/данные/
master/runtime прежние. Проверки PASS: ссылки/существование опор в коде,
Prettier нового документа и git diff --check. Новый функциональный прогон не запускался,
893backend/130browser ниже — историческая проверка опубликованного блока18.10.
Следующий шаг: согласованный короткий блок сохранности/точных переходов и локальные
макеты трёх экранов; масштабный рефакторинг и публикация в аудит не входят.

## Референсы сложных интерфейсов ·19.10.2026 · LOCAL RESEARCH

Пользователь предложил взять Kompra основой и найти готовые продукты с большим
числом функций. Исполнитель: один Codex; база f5c6387, ветка
codex/audit-workflow-fixes, на входе clean. Подготовлено [исследование реальных
продуктов](docs/audits/SAQ_QURYLYS_PRODUCT_REFERENCES_2026-10-19.md): публичная
карточка Kompra и переход «История изменений» наблюдались в браузере; Linear —
официальный экран и docs; Контур.Фокус/Sentry — официальные описания.
Закрытые кабинеты не реконструировались, демо Фокуса не загрузилось.

Рекомендована единая композиция на основе Kompra с рабочими очередями Linear;
пять зон/шесть вкладок уже существуют. Новые схемы обзора/реестра/досье и приоритет
до защиты — PROPOSED, не выполненное изменение UI. Изменены только новый документ,
UI_IMPLEMENTATION_PLAN и этот статус; runtime/API/риск/данные/master прежние,
push/deploy не выполнялись. Проверки PASS: git diff --check, три новые локальные
ссылки и Prettier нового документа. Историческое форматирование статуса/плана сохранено.
Функциональные тесты для исследовательских Markdown не запускались.

Следующий шаг: подготовить локальные макеты трёх экранов для визуального
согласования; широкий рефакторинг до согласования не начинать. Дальнейшие
UX-14/15, чистый DEMO/независимая приёмка и C-01/holdout/второйПК остаются OPEN.
Статус опубликованной версии и выполненные проверки ниже остаются историей
предыдущего блока, а не доказательством приёмки новых предложений.

## Все изменения опубликованы ·18.10.2026 · HTTPS VERIFIED / GITHUB PUBLISHED

Финальная проверка кода e690378: push CI
[39146844077](https://github.com/temirkhanerbolatovich-coder/saq-qurylys/actions/runs/39146844077)
success во всех3jobs: backend893PASS217.19s, browser130PASS3.8m, frontend checks/
build/audit PASS;74tooling tests выполнены. [PR №4](https://github.com/temirkhanerbolatovich-coder/saq-qurylys/pull/4)
создан и прикреплён к чату; его CI39146897325 также имеет success во всех3jobs.
Последующее изменение фиксирует только результаты в Markdown, без runtime/tests/
контракта/данных; повторное функциональное тестирование для этой записи не нужно.
Заключительный docs commit отправляется в ту же ветку, main без merge.

Разрешение пользователя: «опубликуй все изменения». Один Codex; ветка
codex/audit-workflow-fixes, main aefb72f не объединялся. Все исходные14локальных
коммитов до875e288 отправлены в GitHub, затем2f40242/4b8a665 исправили только
CI test fixtures/ожидания. Runtime app/backend/contracts/data с875e288 идентичны.
Новая публикация не означает закрытие UX10/5/5, C-01 или внешней приёмки.

Рабочий сайт: https://voice-cultures-brandon-independence.trycloudflare.com .
Туннель contacted-string-quiz-kinda был остановлен; штатный share_site.ps1 Start
создал новый и применил к API правильный HTTPS Origin/Secure cookie.
На входе db/api/frontend были остановлены; запущена прежняя DB, volumes/хранилище
сохранены. Перед установкой backup create/verify PASS:
.local/backups/20261018T163635Z-9b3940c63f384e0196f0b92e3a34b6c8,
restore .local/restore-checks/20261018T163742Z-f85441f9bf254c92bf3a437402236233/result.json.
Рабочая БД из backup не восстанавливалась и не заменялась QA schema.

Build api/worker/frontend PASS, runtime images:
saq-qurylys-api:publish-875e288 (api/worker),
saq-qurylys-frontend:publish-875e288. Установка прежними compose/dev/tunnel +
private candidate override, up -d --no-build --no-deps --wait api worker frontend.
После health/invariants проверки новые images также назначены стандартным
saq-qurylys-api/worker/frontend:latest; rollback-before-875e288 tags прежних image
IDs сохранены. Env file hash/DB container+image/mounts прежние; новых migration нет.

До auth smoke fingerprints24таблиц полностью совпали с backup;555Assets сохранены.
После auth smoke23таблицы совпали, только sessions изменены тестовыми входами
(один ранний helper завершился до logout); бизнес-данные/audit/сигналы не менялись.
Чужие сессии не удалялись. Fresh HTTPS Chromium public-smoke.cjs:
11страниц×375/768/1024/1440=44наблюдения, overflow/pageerrors/businesswrites0;
anonymous401/login200/Secure cookie/wrong Origin403/logout204 PASS.
6tabs dossier/4monitoring, mobile Escape/focus/draft, GREEN+UNKNOWN, readable
snapshot chooser, server search/work_priority/structure/signal q PASS.
Original Asset SHA и historical READY PDF SHA совпали с backup;3read-only PDF
properties/assets/signals21308/19477/25381bytes, PDF MIME/signature PASS.
Первый smoke helper ожидал tbody в кратком карточном виде; locator helper исправлен,
новый44PASS. Приложение ради этой проверки не менялось.

Локальная валидация runtime875e288 до публикации:130browser PASS3.9m,
build/typecheck/lint/format PASS. CI39145832806 выявил890backend PASS/3FAIL и
128browser PASS/2FAIL: global status count включал чужие записи, chooser зависел
от прошлых кандидатов/версий, reload выполнялся до URL reset. Исправлены тестовые
предусловия/ожидания; runtime неизменён. После test-only fixes4tests×3=12PASS36.3s,
backend signal/signals/PDF/exports/contract57PASS/1Windows Pango SKIP52.92s;
Ruff test check/format PASS, frontend typecheck/lint/format повторно PASS перед push.
Run4b8a665 дополнительно выявил формат длинной строки нового ожидания; Prettier
исправлен до текущей публикации. Итоговые зелёные CI/PR результаты указаны выше;
промежуточные красные проверки сохранены в GitHub и не считаются успешными.

Source publication preflight: ancestor/remote SHA, git diff --check, history
262new blobs на входе/274после исправлений prohibited paths/known-private-literals/token patterns PASS;
repository hygiene PASS. Secrets/env/DB/storage/images/logs в Git не отправляются.
Private evidence .local/publish-all-20261018 (preflight,before,build,apply,
pre/post-tunnel/post-smoke-invariants,public-smoke,GitHub logs); PNG
output/qa/publish-all-20261018. Docs README/CHANGELOG/DEPLOYMENT/UI_AUDIT/
сверка/этот статус обновлены, старые local-only записи ниже исторические.
Публикация завершена: исходники/документация в PR, runtime на HTTPS, код проверен,
backup/rollback сохранены. Main merge отдельно не выполняется. Следующая разработка — UX-14/15,
clean DEMO/независимая приёмка; source C-01/holdout/второйПК остаются OPEN.

## Публикация всех изменений ·18.10.2026 · IN PROGRESS

Уточнение после первого чистого CI39145832806:890backend PASS/3FAIL и128browser
PASS/2FAIL. Chooser precondition уже исправлен2f40242. Backend status-search
ожидал глобально ровно1совпадение, хотя другие тесты сохраняют сигналы с тем же
статусом; проверка теперь ограничена property_id своей fixture. Browser reset
перезагружал страницу до завершения router.replace, поэтому проверка теперь
дожидается q/city=null в URL. Runtime code/API/scoring не менялись. Повторённые
4новыеbrowser tests×3 →12PASS/36.3s. Ruff test check/format PASS; backend focused
и новый чистый CI проверяются перед окончательным отчётом публикации.

Пользователь явно разрешил «опубликуй все изменения»: GitHub source и обновление
рабочего сайта. Ветка codex/audit-workflow-fixes на входе875e288, clean;
origin/main aefb72f является ancestor.14локальных коммитов/95изменённых путей
отправлены отдельной веткой, remote SHA875e288 подтверждён. Main не объединялся.
Preflight:262новых history blobs, prohibited-path/known-private-literal/token
patterns PASS; source hygiene/diff PASS. Значения приватной конфигурации не выводились.

Рабочие db/api/frontend и tunnel были остановлены; worker работал. Запущена
прежняя DB без замены volume. Создана копия
.local/backups/20261018T163635Z-9b3940c63f384e0196f0b92e3a34b6c8;
backup create/verify PASS, отдельный restore report
.local/restore-checks/20261018T163742Z-f85441f9bf254c92bf3a437402236233/result.json.
Candidate API/worker/frontend images publish-875e288 собраны, rollback-before-875e288
tags сохранены; установка/HTTPS smoke ещё впереди. Env/storage/DB не подменялись.

При подготовке чистого CI обнаружена зависимость chooser test от кандидата/
версии предыдущих monitoring tests, которых нет в seed. Test теперь создаёт
собственного DEMO-кандидата существующим API и использует полный typed snapshot
presentation fixture; listener команд начинается после setup. Никакого сравнения/
изменения риска при выборе не выполняется. Связанные4tests PASS14.8s на QA;
typecheck/lint PASS. Runtime source не менялся. Чистый GitHub CI ещё выполняется.
Следующий шаг: установить candidate services с прежними mounts/БД, восстановить
HTTPS helper, проверить public read-only UI/API/PDF и fingerprints; завершить
docs, отправить final commit и создать PR без автоматического merge.

## Сверка ТЗ и стабилизация UI ·18.10.2026 · LOCAL VERIFIED / NOT DEPLOYED

Пользователь «гоу гоу», Codex root, один исполнитель; codex/audit-workflow-fixes,
базаa3afdf0, clean на входе. Новых агентских задач не создавалось.
Разрешён локальный commit; запрет push/publish/deploy сохраняется.

Завершён ограниченный frontend-блок UX-07/09/12/17:
- PropertyRisk/propertyRiskContext добавляет рядом с GREEN точный статус
  основания (UNKNOWN/PENDING/REJECTED); Zone/число/server calculation прежние.
  Registry/cards/dashboard/dossier/selected map и marker accessible name.
- GlobalSearch≤639px: native44px toggle, aria-expanded/controls, opening focus,
  Escape preventDefault сохраняет draft/возвращает focus, Enter ведёт в registry.
  Одна mounted форма, desktop visible. Compact shell/досье сохраняет статусы/
  юридическую оговорку/DEMO/полные вкладки; first fold360/768 ещё частичен.
- Snapshot chooser: native select/page10, label/город/дата, выбранная полнота/
  охват/истечение, cached metadata/ID вне страницы и при error/retry; UUID
  перенесён в details. Выбор не выполняет compare; REAL+DEMO запрет прежний.
  Reload по-прежнему сбрасывает snapshot/reason, manual ID не загружает metadata.
  Shared LoadState retry теперь type=button, без случайного submit формы.
- Registry q+city: общий debounce350ms, Enter/reset/URL/page/view/focus сохранены.
  Город остаётся точным текстовым фильтром, combobox не добавлялся.

Файлы: frontend workspace/monitoring-workspace/property-map/presentation/
design-system.css; новый tests/audit-stabilization.spec.ts. Backend/контракт0.18/
auth/бизнес-данные/риск/исторические снимки не менялись; dependencies/ADR нет.
Master1.4 и native controls/существующие UI primitives сохранены.
Docs: README/CHANGELOG, REQUIREMENTS, DESIGN_SYSTEM/UX_GUIDELINES/UI_COMPONENTS,
UI_IMPLEMENTATION_PLAN/UI_AUDIT/REMAINING_CHECKLIST и
[полная сверка ТЗ/20 замечаний](docs/audits/SAQ_QURYLYS_UI_UX_RECONCILIATION_2026-10-18.md).
Итог backlog:10 технически устранены,5 частично,5 open/deferred, не процент
готовности MVP. Исходный аудит860e033 сохранён исторически. Kompra documented
patterns отделены от недоступного приватного UI; новых private screens не изучали.

Фактические проверки на финальной сборке:
- node .local/tabs-pdf-20261018/build.cjs → npm run build PASS.
- npm run typecheck; npm run lint; npm run format:check → PASS.
- node .local/tabs-pdf-20261018/test.cjs tests/audit-stabilization.spec.ts
  tests/audit-workflows.spec.ts tests/monitoring.spec.ts tests/redesign.spec.ts
  tests/workspace.spec.ts →22PASS/41.4s.
- node .local/tabs-pdf-20261018/run.cjs full →130PASS/3.9m, workers1/retries0;
  API/worker/Linux OCR/PDF/review/historical R2, roles, draft/tab/URL regression.
  Лог audit-stabilization-full.log; related audit-stabilization-targeted.log.
- Новый chooser101 использует presentation response fixture; реальный compare
  отдельно покрыт monitoring.spec.ts. Fresh14real dossier observations:
  2вида×360/375/390/768/1024/1440/1920, overflow/errors/businessPOST0,
  reduced-motion. Ещё2real picker captures390/1440, те же нули. PNG просмотрены
  390/768/1440 dossier и390/1440 picker. artifacts output/qa/audit-stabilization-20261018.
- node .local/tabs-pdf-20261018/audit-stabilization-zoom.cjs → actual browser200%,
  getZoom2/DPR2/innerWidth720,6вкладок scrollWidth720. Full-page capture обрезал
  raster; локальный снимок viewport, измерения DOM до capture. Не CSS zoom.
- .venv/Scripts/python.exe scripts/check_repository_hygiene.py → PASS.
  .venv/Scripts/python.exe .local/tabs-pdf-20261018/validate-audit-stabilization.py
  →17source files PASS: strict UTF8/added local links/private literals (без вывода
  значений). git diff --check PASS, self-review scope/semantics/error paths PASS.

Первый related run19PASS/3FAIL: native Escape clearing; getByLabel locator с
option text (accessible combobox существует); mobile summary927px. Исправлены
preventDefault/role locator/spacing. Промежуточный3PASS/1FAIL875px; затем22PASS
и full130PASS. Нет переписывания факторов/удаления QA данных для прохождения.
Backend этим блоком не менялся и заново не прогонялся (предыдущийa3afdf0:
57PASS/1Windows native Pango PDF SKIP). Полный security/load/screen-reader audit,
независимые UX/предметная/внешний holdout и второйПК не выполнены этим блоком.

Runtime прежний: localpreview3227, QA API8227/PostgreSQL57667,
image saq-signal-search-api:local-20261018, QA project saq-tabs-pdf-20261018.
Config .local/tabs-pdf-20261018/signal-search-final.compose.json и отдельная
qa_signal_search_* schema/storage сохранены. Старая qa_search_* и прежние volumes
не удалялись, публичные images/tunnel не заменялись; frontend preview пересобран.
Все private configs/logs/captures ignored; credentials не включаются в commit.

Открытые границы: mobile fold360/768; UX-14/15 PDF labels/names, clean DEMO
UX-20; реальные hierarchy UX-04; понимание GREEN UX-07; reload выбора/reason
UX-12; SQL-scale UX-16; hidden reads UX-18/change summary UX-19.
Обязательные C-01/качество OCR/внешняя UX/предметная/второйПК/сдача не закрыты.
Следующий точный шаг: закончить UX-14/15 на имеющихся MIME/record metadata,
затем отдельный читаемый DEMO-набор и независимая репетиция основного сценария.
Для C-01 сначала требуется конкретный разрешённый рекламный источник; live
import до установления источника/разрешения не выполнять. Новую публикацию
делать только после отдельного разрешения пользователя.

## Поиск всей очереди сигналов ·18.10.2026 · LOCAL VERIFIED / NOT DEPLOYED

Пользователь «гоу», Codex root, один исполнитель; codex/audit-workflow-fixes,
база0bd2dfd, clean на входе. Новые агентские задачи не создавались.
Разрешён локальный блок/commit; запрет push/publish/deploy сохранён.

UX-06: optional q≤300 в существующем GET signals (контракт0.18.0-mvp).
SQL literal case-insensitive substring в current/frozen Property.name, signalUUID,
метке версии и state code/RU label; %,_,backslash literal, trim. Query/state/
property_id до signal_view, is_stale до pagination. Default ordering created_at DESC/
ID, роли/auth/response прежние. Поиск не читает произвольный JSON, PDF/evidence,
не создаёт и не переписывает snapshots/решения/риск/audit.

UI: native form label «Поиск по всем сигналам», запуск Button/Enter вместо client
фильтра25. q/page/filters в URL, submit сбрасывает page и фиксирует текущий
signal_id; pagination сохраняет выбранный снимок. Reload/Back восстанавливают q.
Pending/error/empty не подменяются прежней очередью и не закрывают выбранный
historical snapshot. Reset прежним сценарием очищает q/filters/page/selection
и фокусирует selector объекта. Draft ввода до submit локален; counts DRAFT/stale
подписаны текущей страницей, total всей server выборкой. Scoped form padding0/
input margin0 и targets≥44px; существующие tokens/Button/LoadState/Pagination.
Нет новых routes/DTO/dependencies/migrations/seed правок/архитектурного слоя/ADR.

Файлы: backend api/signals,test_signal_search,test_contract; contracts/openapi.yaml;
frontend signals-workspace,design-system.css,signal-search/ux-flow tests.
Docs: FEATURE_SIGNAL_SEARCH,README,CHANGELOG,REQUIREMENTS,ARCHITECTURE,
DESIGN_SYSTEM,UX_GUIDELINES,UI_COMPONENTS,UI_IMPLEMENTATION_PLAN,UI_AUDIT/этот статус.

Проверки: .venv python .local/tabs-pdf-20261018/signal-search-backend-tests.py →
**57PASS/1SKIP/46.80s** (search/signals/signalPDF/document exports/contract,
собственная случайная test schema QA PostgreSQL).30версий, ID вне25, current/frozen
RU/KZ/trim/case, literal%_backslash/SQL/JSON/length422, status/version, filters/stale/
total/pages/auth/viewer/unchanged snapshot/decisions/audit. Native Pango PDF skip
на Windows не считается Linux PDF-приёмкой; реальная генерация есть в browser suite.
Полная backend suite/нагрузка не повторялись. Ruff check/format94files PASS.
npm run build/typecheck/lint/format:check PASS. Первый browser10PASS/1FAIL показал
40px вместо44px у новой кнопки; scoped min-height44 исправлен. После пересборки
связанные11tests PASS34.1s. Первый full125PASS/1FAIL4.0m: исторический R2 test
отказал до действий, потому что в накопленной QA не осталось seed-объекта без R2.
Факторы не удалялись/не перезаписывались. Отдельная qa_signal_search_* schema и
новый acceptance_signal_search_storage подготовлены для чистого финального прогона;
прежняя qa_search_* и все исходные schema/storage сохранены. Уточнена подпись
пустой страницы с total>0, added regression; финальная сборка/typecheck/lint/format
PASS. Окончательный full на новой схеме **126PASS/3.6m**, workers1/retries0,
на финальной сборке с empty-page refinement. Реальный Linux OCR/PDF/review сохранён.
Матрица14наблюдений повторена в этом full, overflow/errors/businesscommands0.
Финальные diff/hygiene/UTF8/local-links/private-literal scan PASS.

Операционные ограничения: на входе daemon Docker и localpreview оказались
остановлены. Desktop запущен, image saq-signal-search-api:local-20261018 собран;
QA DB сначала не стартовала из-за Windows excluded ports55663–55762. Только QA
host mapping перенесён55667→57667; container db5432, volume/данные/qa_search_*
schema/storage/credentials сохранены. API8227 и preview3227 прежние. Конфиг
.local/tabs-pdf-20261018/signal-search-final.compose.json; имя схемы — ignored
signal-search-final-schema.txt. Public images/tunnel не заменены,
host exclusions не менялись, старые QA namespace/storage не удалялись.
Первый helper указал отсутствующий test_record_pdf.py: тесты не запускались;
исправлен на существующий test_document_exports.py. Попытка до запуска DB дала
7PASS/1SKIP/50setup errors подключения; после восстановления пройдены57 выше.
При чтении конфигурации один приватный QA compose ошибочно попал в технический
вывод инструмента; пользователь уведомлён. Конфиги/credentials не включаются в Git.

Fresh responsive14наблюдений реального ID-search:2режима×360/375/390/768/1024/
1440/1920, actual mode проверен, overflow/pageerror/businesscommands0, reduced-motion,
button≥44px. Вручную просмотреныform crops detailed1440/simple390 и2полных кадра;
остальные snapshots — автоматическая матрица. Presentation51 отдельно проверяет
страницу3/query/selected/error/pending/retry/Back/reload/reset/noPOST, не заявляется
реальной51записью проекта. Новые200%zoom/secondPC/независимая UX/предметная/масштабная
приёмка не выполнялись. Логи signal-search-backend-tests.log,signal-search-targeted.log,
signal-search-full.log,signal-search-exhausted-full.log,signal-search-db-unavailable.log
и captures output/qa/signal-search-20261018 ignored.

Открыто: UX-16 прежний stale/view all-match/N+1 в памяти, panel history100,
historical-R2 fixture требует fresh QA после повторных full и не должна
перезаписывать существующие факторы ради предусловия,
подтверждённое наполнение parent_id и независимая приёмка. Следующий этап —
финальная сверка оставшегося audit backlog с исходным ТЗ и стабилизация MVP к21октября:
отдельно обязательные blockers, качество демонстрационного наполнения и deferred
SQL-scale. Не выдавать технические regression за юридическую/пользовательскую приёмку.
Перед локальным commit — self-review/актуальные проверки и итог full, база0bd2dfd.

## Приоритет всего реестра ·18.10.2026 · LOCAL VERIFIED / NOT DEPLOYED

Пользователь «гоу», Codex root, один исполнитель; codex/audit-workflow-fixes,
базаbd78bba, clean на входе. Новые агентские задачи не создавались.
Разрешён локальный блок и commit; запрет push/publish/deploy сохранён.

UX-03: существующий GET properties принимает order=name(default)|work_priority,
контракт0.17.0-mvp. Все filtered current PropertyOut сортируются до pagination:
PENDING → UNKNOWN/REJECTED → остальные; затем NULL last_reviewed_at first,
более давняя дата, server score DESC, UUID ASC. Эффективный legal status берётся
из существующего server view; не raw status и не risk.as_of вместо даты проверки.
Default name/ID, фильтры/q/total/страницы, роли/auth и response schema прежние.
Dashboard получает5, simple показывает3 из этой выдачи; comparePropertyWork и
client order удалены. propertyNextAction оставляет только UI label.
Ошибка priority list имеет LoadState alert/retry, не false empty; другие очереди
доступны. При визуальном просмотре устранено сжатие mobile пояснения: scoped
priority-action≤639px grid, балл/ссылка в строке1, текст полной шириной в строке2.
Формула риска/решения/снимки/данные/seed не менялись. Нет новых endpoints/DTO,
dependency/migration/слоя; новый ADR не нужен. UX-16 остаётся: прежние all-view
расчёт/N+1 и сортировка в памяти не являются SQL-scale или нагрузочной приёмкой.

Файлы: backend app/api/properties.py,test_property_priority/test_contract;
contracts/openapi.yaml; frontend workspace,property-priority,design-system.css,
dashboard-priority/redesign/simple-interface/ux-stabilization tests.
Docs: FEATURE_PROPERTY_PRIORITY,README,CHANGELOG,REQUIREMENTS,ARCHITECTURE,
DESIGN_SYSTEM,UX_GUIDELINES,UI_COMPONENTS,UI_IMPLEMENTATION_PLAN,UI_AUDIT и этот статус.

Проверки: .venv python .local/tabs-pdf-20261018/priority-backend-tests.py →
**57PASS/50.62s** (priority/structure/search/dashboard/contract/API, своя случайная
test schema QA PostgreSQL).101filler перед важными записями, группировка по
действию, NULL/date/score/ID, стабильные страницы, filters/effective legal status,
unchanged detail/viewer/auth; live/manual order parameter полностью совпадает.
Ruff check/format backend PASS93files. npm run build/typecheck/lint/format:check PASS.
Browser related21PASS46.7s; full124PASS4.0m (workers1/retries0, реальный Linux QA
OCR/PDF/review); после mobile CSS и нового width regression final6PASS22.6s
(dashboard-priority/integrated-layout). Полный backend suite не повторялся:
серверный блок read-only ordering покрыт focused57 и полным браузерным regression.
Новый полный browser suite после только scoped mobile CSS не повторялся;
фактическая финальная сборка проверена6связанными tests/матрицей.
Git diff/hygiene/UTF8/local-links/private-literal scan PASS; это не security-аудит.

Responsive14наблюдений настоящего обзора:2режима×360/375/390/768/1024/1440/1920,
reduced-motion, overflow/pageerror/business commands0. После CSS матрица повторена;
пояснение mobile измеренно занимает≥90% action region. Вручную просмотрены4финальных
panel screenshots simple/detailed×390/1440. Synthetic205/error fixtures отдельно
проверяют UI trust/order/retry/empty, не объявляются реальными объектами проекта.
Большой server set — транзакционные synthetic PostgreSQL rows, не наполненный стенд.
Новые200%zoom/secondPC/независимая UX/предметная/нагрузочная приёмка не выполнялись.

Preview http://localhost:3227. Изменён только изолированный QA saq-tabs-pdf-20261018
API8227/DB55667, api/worker image saq-priority-api:local-20261018, конфиг
.local/tabs-pdf-20261018/priority.compose.json. Сохранены qa_search_* schema/storage
и прежние QA public schema/storage/credentials; public containers/tunnel не заменены.
Логи priority-backend-tests.log,priority-targeted.log,priority-full.log,
priority-final-targeted.log и captures output/qa/dashboard-priority-20261018 ignored.

Блокеров данного блока нет. OPEN: UX-06 серверный поиск сигналов, UX-16 SQL-scale,
подтверждённое наполнение parent_id и независимая приёмка. Точный следующий связный
блок — заменить поиск текущих25сигналов на серверный поиск по всему разрешённому
набору с контрактом/URL/page/error-state; сохранить frozen snapshots и роли.
Перед локальным commit — self-review и проверки выше, ревизия базыbd78bba.

## Навигация ЖК/очередей/корпусов ·18.10.2026 · LOCAL VERIFIED / NOT DEPLOYED

Пользователь «гоу», Codex root, один исполнитель; ветка codex/audit-workflow-fixes,
база9e7f195, Git clean на входе. Новые агентские задачи не создавались.
Граница: локальный код/QA/коммит, без push/publish/deploy и изменения публичных служб.

UX-04: GET properties/{id}/structure (контракт0.16.0-mvp) возвращает только
сохранённые parent_id relationships: bounded ancestors и независимые SQL pages
детей/соседей. Корни без parent не получают выдуманных siblings;103 ребёнка
не ограничены первыми100. В досье — уровень, цепочка ссылок и native disclosure;
Link сохраняет registry context, новое досье открывает «Обзор», Back/reload работают.
Ссылки DEMO отмечены отдельно. Риск/правовые основания/документы не наследуются.
Ошибка/retry связей отдельно от доступного досье; cycle/depth guards409.
Миграций/dependencies/редактора структуры/seed-правок нет; auth/роли/решения и
исторические snapshots прежние. Pages/disclosure локальны досье, после reload
начинаются сначала. Нового ADR нет: расширен существующий read-only API/primitives.

Файлы: backend app/api/properties.py,dto.py; test_property_structure/test_contract;
frontend PropertyStructure,workspace,types,presentation,design-system.css;
browser structure/fixture/responsive tests; контракт и актуальные docs.
Документация: FEATURE_PROPERTY_STRUCTURE,README,CHANGELOG,REQUIREMENTS,
ARCHITECTURE,DESIGN_SYSTEM,UX_GUIDELINES,UI_COMPONENTS,UI_IMPLEMENTATION_PLAN,UI_AUDIT.

Проверки: .venv python .local/tabs-pdf-20261018/structure-backend-tests.py →
**52PASS/43.90s** (structure/search/dashboard/contract/API, своя случайная test
schema в QA DB); Ruff check/format backend →PASS92files. Первый49PASS/1FAIL
исправлен в fixture: фиксирован last_reviewed_at, чтобы существующий динамический
risk.as_of не нарушал сравнение неизменности. Продуктовая формула не менялась.
Frontend npm run lint/format:check/typecheck и production build →PASS.
Typecheck после build повторён последовательно из-за временной гонки .next/types
при одновременном запуске; финальный прогон чистый. Browser targeted3PASS10.7s,
full119PASS3.8m (workers1/retries0), затем после semantic h2 refinement и
упрощения page handler новые4tests PASS21.4s на финальной сборке.
Полная backend suite заново не запускалась:52focused плюс полный browser
regression покрывают данный read-only блок. Git diff/hygiene/UTF8/local-links/
private-literal scan PASS; это не независимый security аудит.

Responsive:28presentation наблюдений2экрана×2режима×7размеров360/375/390/768/
1024/1440/1920 и4настоящего досье(2режима×390/1440). Overflow/pageerror/business
commands0, reduced-motion/native keyboard/ссылки≥44px. Вручную просмотрены4итоговых
снимка, остальное автоматическая матрица. Новых200%zoom/secondPC/UX с аналитиком/
нагрузочной приёмки не было. Полная структура — synthetic PostgreSQL transactions
и явно browser presentation fixture: текущие8seed parent_id=null,level=PHASE,
их данные не дополнялись предположениями из названий. Реальное наполнение OPEN.

Локальный просмотр http://localhost:3227. Только QA saq-tabs-pdf-20261018
API8227/DB55667 переведён на saq-structure-api:local-20261018; конфиг
.local/tabs-pdf-20261018/structure.compose.json. Сохранены прежняя qa_search_*
schema, storage, credentials и исходные QA public schema/storage. Публичные
контейнеры/tunnel не заменены. Логи structure-backend-tests.log,structure-full.log,
structure-targeted.log; screenshots output/qa/property-structure-20261018 ignored.

Блокеры данного блока: нет. Открыто: подтверждённое наполнение parent_id,
UX-03 глобальная приоритизация,UX-06 server signal q,UX-16 SQL-scale и внешняя
приёмка. Точный следующий связный блок — UX-03: заменить priority top5 из первых100
на серверную приоритизацию всего разрешённого набора с явным контрактом; сохранить
UNKNOWN/роли/исторические snapshots, локальную границу и текущую рабочую навигацию.
Перед локальным commit — self-review/проверки выше; ревизия базы9e7f195.

## Поиск реестра и выбор объекта сигнала · 18.10.2026 · LOCAL VERIFIED / NOT DEPLOYED

Продолжение согласованного аудита, пользователь «продолжи работу». Codex root,
один исполнитель, ветка codex/audit-workflow-fixes отcd10b84; на входе Git clean.
Сохранён запрет push/publish/deploy. Не создавались новые агентские задачи.

UX-02: существующий server q ищет literal case-insensitive substring по имени,
адресу, отдельным aliases, Developer.name/bin. Коррелированные EXISTS сохраняют
одну строку объекта; спецсимволы escaped, фильтры/order/pages прежние. Пустой q
в dashboard нормализован, не исключает публикации без привязки. Контракт0.15.0-mvp
явно фиксирует новые semantics q на properties и dashboard; маршруты/схемы прежние.

UX-05: общий PropertyPicker(mode=filter), page_size25 по всему разрешённому
реестру, выбранныйID вне search page/error/empty и после reload/Back. Match mode
сохраняет required isDemo и прежнюю отдельную human-привязку. Names текущих
сигналов вне initial100 дочитываются по ID с dedup/abort/cache/error/retry;
первоначальная страница100 больше не ограничивает выбор или названия очереди.
Server risk/роли/auth/решения/snapshot/миграции/dependencies не менялись.

Проверки: focused backend search/dashboard/API/contract **40PASS/40.42s**
(своя случайная schema существующей изолированной QA DB). Ruff check/format91files
PASS; frontend lint/typecheck/format:check/build PASS. Targeted browser13PASS,
первый full **115PASS/3.6m** до финального blank-q уточнения; окончательный full
на пересобранном runtime **115PASS/3.8m**. Retries0/workers1. Не запускалась вся
backend suite: серверное изменение ограничено read-only q; полный browser suite
проверяет прежний реальный Linux OCR/PDF/review, а новые backend tests — поиск.
Последующий full114PASS/1FAIL: historical-R2 test исчерпал свободные DEMO-объекты
без R2 после повторных прогонов; отказ предусловия до UI. Существующие факторы
не перезаписывались: подготовлены отдельная случайная schema/новый storage для
чистого финального набора. Это не исправление или обход продуктовых guards.
Чистый full112PASS/3FAIL дополнительно выявил зависимости старых audit/document
tests от ранее созданных candidate/signal/evidence. Теперь первые2теста создают
собственные записи через API, archive presentation явно задаёт evidence reference
без серверной команды. Повтор затронутых7PASS/14.5s. Эти правки только в tests.
Historical-R2 fixture после многих запусков всё ещё требует свежего QA namespace;
перезаписывать существующий фактор для её подготовки запрещено.
Финальные git diff --check, repository hygiene и changed-file UTF8/local-links/
private-literal scan PASS. Наблюдения и результаты не являются независимой
security/предметной приёмкой.

Fresh36наблюдений3экрана(registry search/signals filter/review picker)×2фактических
режима×6размеров360/390/768/1024/1440/1920: overflow/errors/business commands0.
Вручную просмотрены registry1440,signal picker1440/390,match picker390. Исправлены
унаследованные padding/margin только внутри picker; capture matrix повторена.
Внешняя UX-приёмка/secondPC/новый200%zoom/масштабная нагрузка не выполнялись.
101-й объект — browser presentation fixture, реальный server developer search
и PostgreSQL alias/BIN/special-character cases проверены отдельно. Имя-retry
также проверено503fixture. Новый общий поиск сигналов не добавлен (UX-06).

Локальный preview3227, изолированный QA saq-tabs-pdf-20261018 API8227/DB55667.
QA api/worker image saq-search-api:local-20261018, конфиг
.local/tabs-pdf-20261018/search-final.compose.json; отдельная qa_search_* schema
и новый acceptance_search_storage. Прежние QA schema/storage и credentials
сохранены, секреты не печатались. Working public services/tunnel не заменены.
Логи search-backend-tests.log/search-full.log и captures
output/qa/search-picker-20261018; helpers/private env ignored.

Docs: README/CHANGELOG/REQUIREMENTS/ARCHITECTURE/DESIGN_SYSTEM/UX_GUIDELINES/
UI_COMPONENTS/UI_IMPLEMENTATION_PLAN/UI_AUDIT, контракт. Нового ADR нет:
расширен существующий read-only query и переиспользован picker без нового слоя.
Открыто: UX-03 global priority,UX-04 связи очередей,UX-06 server signal q,
UX-16 масштабная SQL-оптимизация и внешняя приёмка. Следующий связный UI-блок —
явная навигация между реальными parent/phase/building, затем global priority
с отдельным измеримым контрактом. Официальный freeze21октября остаётся OPEN.
Ревизия проверки cd10b84+diff; окончательный local SHA — git log -1 этой ветки.

## Первый блок исправлений аудита · 18.10.2026 · LOCAL VERIFIED / NOT DEPLOYED

Пользователь согласовал начало исправлений после полного UI/UX-аудита.
Codex root, один исполнитель; ветка codex/audit-workflow-fixes от860e033.
На входе только untracked docs/audits из предыдущего задания; они сохранены.
Новых parallel agent tasks не создавалось. Работа и commit только локальные;
публичная установка/тunnel/рабочие Docker services не заменялись.

Сделано: фильтры/карта в обоих видах; общая mounted disclosure обеих очередей
при выбранном материале; компактные KPI с пояснениями по запросу; компактная
карта/мобильные filters; прямые source/registry tool transitions с раскрытием
после commit вкладки и возвратом к кандидату; analysis action в шапке материала;
ясные signal PDF actions и MIME-aware label источника в материале.
Изменены frontend components/CSS и presentation/types;
сервер/контракт/риск/роли/версии/зависимости не менялись. Новый ADR не требуется:
использованы прежние native controls, маршруты и semantic master1.4.

Проверки: npm run lint/typecheck/format:check PASS; production build через
node .local/tabs-pdf-20261018/build.cjs PASS. Финальный npm run test:e2e:
**113PASS/3.4m**, workers1/retries0. Первичный targeted25PASS/2FAIL,
затем related8PASS; ранний full прерван после68PASS/4FAIL на старых раскрытиях в review-workspace.
Исправлены общие test helpers/ожидания новой очереди. Журнал первого full сохранён
отдельно; никаких retry для скрытия отказов.

Свежая матрица108наблюдений9экранов×2вида×6размеров360/390/768/1024/1440/1920:
overflow/errors/business writes0, reduced-motion. Тайлы заменены presentation
подложкой, координаты/score из реального API. Вручную просмотрены5репрезентативных
экранов (map/dashboard/review/material1440,registry390). MapTop646–651px,
selected originalTop750–754px на1440×900. Не новый200%zoom/внешняя UX-приёмка.
Новый signal PDF labels test — fixture, реальный PDF download и OCR входят в suite.
Backend suite заново не запускалась; backend исходники не изменены.
Repository hygiene, git diff --check и changed-file UTF8/local-links/private-literal
scan PASS. Результаты сканов относятся к этому diff, не независимой security-приёмке.

Документация: README/CHANGELOG, DESIGN_SYSTEM/UX_GUIDELINES/UI_COMPONENTS/
UI_IMPLEMENTATION_PLAN/UI_AUDIT, исходные два отчёта docs/audits.
Точные closure/partial/open — UI_AUDIT; все20пунктов не объявляются закрытыми.
Остаются: server search/priority, связи очередей, paged signal picker, дальнейшая
mobile shell/повторная проверка/независимый аналитик и freeze21октября.
Следующий связный блок: paged signal property picker через существующий API,
затем отдельно согласованный server search/priority contract.

Текущий preview http://localhost:3227, прежний изолированный backend8227/DB55667,
credentials только .local/tabs-pdf-20261018/credentials.txt. Ревизия проверок:
860e033 плюс diff этого блока, конечный локальный SHA определяется git log -1
ветки codex/audit-workflow-fixes. Push/PR/merge/deploy не выполнялись.
Ниже — история предыдущих блоков, а не актуальная структура до/после.

## Вкладки и PDF по новому ТЗ · 18.10.2026 · LOCAL VERIFIED / NOT DEPLOYED

Codex root, один исполнитель. Ветка `codex/dossier-tabs-pdf`, база `1b47cc6`.
Пользователь разрешил реализацию настоящих вкладок и минимального backend PDF;
push/publish/deploy запрещены. Публичная установка остаётся на `e2dfefd`.

В коде: шесть mounted панелей досье и четыре мониторинга, одна видима; URL section,
клавиатура/legacy hash, компактное состояние, поиск/фильтр/пагинация документов,
списки публикаций/сигналов. Read-only PDF с exact original/frozen signal и
производными копиями, контракт0.14.0-mvp, ADR-016/FEATURE_RECORD_PDF.

Финальный full browser **109PASS/3.2m**, workers1/retries0. Frontend typecheck,
lint, format:check, production build PASS. Backend full820PASS/18Windows skips
до завершающего PDF provenance/layout, после него focused export+contract13PASS.
Ruff check/format90files PASS, repository hygiene/changed-file UTF8/local links/
private-literal scan PASS. Начальные100PASS/8FAIL и последующие focused отказы
задокументированы в UI_AUDIT; исправлены focus timing, history race и select label.

Реальные PDF:15видов (open-registry exact в APItests);16HTTP smoke downloads
включая исходный PDF byte-for-byte и изображение, плюс40DEMO-записей/18страниц.
Poppler visual samples и glyph bounds17PDF/90страниц — без выхода за страницу. Новый
текст→анализ→human hypothesis/match/evidence/R2→CONFIRMED signalv7→PDF39338bytes
проверен отдельно; R1 не подтверждён. PDF экспорт не меняет снимок/риски/источники.

Responsive375/768/1024/1440, RU/KZ, keyboard, legacylinks, reload/Back/Forward,
черновики/файлы/возврат в реестр PASS. Настоящий Chromium zoom200%:1440→720CSSpx,
DPR1→2, пять панелей overflow0. Дополнительные17captures: pageerrors/writes/overflow0.
Внешняя UX/предметная приёмка и проверка на втором компьютере не выполнены.

Стенд `saq-tabs-pdf-20261018`: loopback frontend3227/API8227/DB55667,
собственные volumes/image `saq-tabs-pdf-api:local-20261018`, внешние collectors off.
Прежний host preview3207 остановлен ради Windows build lock; рабочий Docker
frontend и данные не менялись. Secrets/helpers/logs только ignored
`.local/tabs-pdf-20261018`; артефакты `output/qa/tabs-pdf-20261018`.

Документация: DESIGN_SYSTEM/UX_GUIDELINES/UI_COMPONENTS/UI_AUDIT/PLAN/REQUIREMENTS,
README/CHANGELOG, FEATURE_RECORD_PDF и ADR-016. Ниже сохраняется история предыдущей
сессии; preview3207 больше не является текущим. Ревизия проверки: база1b47cc6 плюс
изменения этого локального блока. Код/контракт/проверки зафиксированы в локальном
`cd32183` (feat: add stateful dossier tabs and read-only PDF downloads).
Эта запись SHA оформлена отдельным documentation-only commit. Доступ к QA preview
сохранён в ignored `.local/tabs-pdf-20261018/credentials.txt`; secrets не в Git.
Следующий шаг: пользовательская приёмка на localhost3227, затем отдельно
согласованный freeze/publish. Push/PR/merge/deploy не выполнялись.

## Локальная доработка UI после аудита · 18.10.2026

**IMPLEMENTED / LOCAL VERIFIED / NOT DEPLOYED.** Пользователь разрешил
доработку при сохранении локально. Codex root, один исполнитель, ветка
codex/ui-stabilization-20261018, база b24531b. Входной diff предыдущего аудита
в PROJECT_STATUS/UI_AUDIT сохранён. Рабочий сайт остаётся на e2dfefd.

Сделано: native disclosure документов с видимыми номером/датой/статусом/областью/
периодом и mounted решениями; переход к ожидающему документу и document hash;
PropertyPicker с q/name/address, server pagination25 и DEMO/REAL filter; сохранение
выбранного ID вне страницы/при ошибке/reload; keyboard focus после поиска и
pagination; точный city filter; восстановление query/page/view/scroll/focus/marker
при возврате из досье; порядок обзора по доступному действию/давности, затем score.
Это порядок внутри загруженных100, без выдуманной срочности или глобального sort.
Backend/API/contracts/риск/роли/модели/миграции/dependencies не изменены.

Проверки: frontend typecheck/lint/format:check/build PASS; Node tests2PASS;
npm audit --audit-level=high:0vulnerabilities. Целевой набор26PASS; исправленный
возврат4повтора PASS. Финальный полный npm run test:e2e: **107passed/2.9m**,
workers1/retries0. Backend ../.venv/Scripts/python.exe -X utf8 -m pytest -q -rs:
**810passed/18skipped/329.07s** на Windows, собственной случайной schema отдельной
QA БД; skips — Linux resource/PDF. ruff check/format86files PASS. Browser suite
использует реальный Linux API/worker OCR/PDF; >100 picker dataset и error cases —
presentation fixtures, реальный новый текст→анализ→human hypothesis/match/R2→
CONFIRMED signal v7→PDF **39309bytes** проверен отдельно; original включён,
R1 не подтверждён. Это не независимая оценка качества OCR.

Responsive:13страниц×2вида×6ширин360/390/768/1024/1440/1920 =156наблюдений,
page overflow0/pageerrors0/business writes0; reduced-motion включён. Это
автоматическая матрица, не настоящий browser zoom200% и не внешняя UX-приёмка.
Скриншоты/JSON/PDF/logs — ignored output/qa/ux-stabilization-20261018 и
.local/ux-stabilization-20261018. Изначальный диагностический QA проект остановлен,
volumes сохранены. Итоговый отдельный saq-ux-final-20261018 и production host UI
на http://localhost:3207 оставлены для локального просмотра; backend8208/DB55648
слушают loopback. Доступ в private credentials.txt этого QA каталога, не в Git.

В первом полном прогоне105PASS/2FAIL тесты ожидали открытую новую disclosure и
прежний risk-first Dashboard; тесты обновлены. Следующий106PASS/1FAIL выявил
реальную гонку focus restoration; вместо ожидания нескольких кадров восстановление
теперь привязано к commit selectedId. Отдельные4повтора и финальные107PASS зелёные.
Начальные focused failures также выявили неуникальный source_label в старом тесте
и неверное предположение о наличии extraction у seed REVIEWED; выбор по ID и
реальный setup анализа сделали сценарии воспроизводимыми. Отказы не скрыты retry.

Пути:7production UI/helper/CSS,7tests и8существующих документов (README/CHANGELOG/
DESIGN_SYSTEM/UX_GUIDELINES/UI_COMPONENTS/UI_IMPLEMENTATION_PLAN/UI_AUDIT/статус).
Новый ADR не требуется: применены существующие компоненты/контракт. Локальный
commit разрешён ранее; push/PR/merge/deploy не выполняются. Рабочие Docker image
ui-b0-b3-e2dfefd/API/worker/DB и tunnel не заменены. Следующий шаг — внешний
аналитик/второй ПК/настоящий200%zoom, официальная freeze/сдаваемая версия;
KZ OCR fidelity и разрешённый коммерческий C01 остаются OPEN. Семь anchors
сохранены по согласованному плану; новый API search/sort и P2 — backlog.


## Аудит соответствия UI/UX ТЗ · 18.10.2026

Codex root, база b24531b, установленный UI e2dfefd. По повторному вложению
проверены ТЗ, код, документация, сохранённые public evidence и официальные
материалы Kompra. Матрица и источники — начало docs/UI_AUDIT.md.
Фазы0–1 выполнены; S0–S2/B0–B3 работают в ранее проверенном объёме;
полная приёмка редизайна/стабилизация остаётся открытой.
Конкретные остатки: длинный список legal_bases; семь anchors вместо tab panels;
выбор ЖК в review ограничен100; city filter/global sort/расширенный поиск;
priorityRows сортирует по score вместо действия/срочности; точный scroll/marker
при возврате и единая итоговая матрица размеров/200%zoom/независимый UX.
Kompra.kz и официальные статьи использованы как IA-референс; содержательный
аудит kompra.group и закрытого рабочего кабинета не подтверждён.
Свежие проверки: Git clean на входе, текущий код/тесты и public report прочитаны,
два сохранённых desktop capture просмотрены, CUA показал login, четыре Docker
сервиса работают.103E2E/44public observations — прежние результаты этой версии,
не новые прогоны. Код приложения/данные не менялись; commit/push/deploy нет.
Изменены только UI_AUDIT и этот статус. Следующий шаг — согласованный небольшой
срез документов/приоритета, затем итоговая приёмка; новые функции не начаты.


## B0–B3 установлены в рабочий frontend · 18.10.2026

**DEPLOYED / PUBLIC HTTPS VERIFIED; GITHUB NOT UPDATED.** Пользователь
«установи изменеия» разрешил установку. Codex root, ветка codex/monitoring-tools;
установленный UI source — e2dfefdf0bc830b2579a341033d90408d6f63b3c (включает
709a0be/f7e8358). Git на входе clean; исходники интерфейса не менялись.

Текущий адрес: **https://contacted-string-quiz-kinda.trycloudflare.com**. Старый туннель был остановлен;
`powershell -NoProfile -File scripts/share_site.ps1 -Action Start` восстановил
публикацию и пересоздал API с новым HTTPS APP_ORIGIN/Secure cookie. Образ API,
worker/DB и приватная .env сохранены. Старый honey-identity адрес исторический.
После восстановления снят baseline: дальнейшее обновление заменило только
frontend. API/worker/DB IDs/start times/image/environment hashes/mounts и
.env SHA-256 совпали до/после обновления и после smoke; origin также сохранён.

Новый Docker image `saq-qurylys-frontend:ui-b0-b3-e2dfefd`, image ID5199009d9fad…,
собран через существующие compose/dev/tunnel настройки и private image override.
Rollback tag прежнего image сохранён локально. Команда установки: `docker compose
-f docker-compose.yml -f docker-compose.dev.yml -f .local/tunnel/compose.json
-f .local/deploy-ui-b0-b3-20261018/frontend.compose.json up -d --no-build --no-deps
--wait frontend`. После проверки стандартный frontend:latest указывает на тот же
установленный image. Новых миграций, DB/storage replacements и изменения
backend/API/ролей/риска/снимков нет.

Публичный Chromium smoke:11страниц×375/768/1024/1440=**44наблюдения PASS**,
pageerrors0/page overflow0/business mutations0. Anonymous401/login200/Secure cookie,
чужой Origin403/logout204 PASS. Проверены семь разделов досье, новая группировка
«Сверки», восстановление причины R4 после menu return, сохранность Threads input
между блоками и очистка draft namespace после logout. SHA-256 существующего
исходного Asset совпал; сохранённый PDF200/%PDF-/62384bytes PASS.
Это read-only public smoke, не повтор103записывающих E2E на рабочей БД;103PASS
на отдельном стенде относятся к установленному исходному source. Полная backend
suite/remote CI/независимая OCR/UX/второй ПК этим действием не проверялись.
Первый private smoke ошибочно считал status пагинации незавершённой загрузкой;
уточнено ожидание загруженного server total, приложение не менялось. Финальный
повтор всех44наблюдений PASS. Вручную просмотрен текущий public monitoring capture.

Обновлены README/CHANGELOG/DEPLOYMENT/UI_AUDIT/UI_IMPLEMENTATION_PLAN и статус.
Evidence ignored `.local/deploy-ui-b0-b3-20261018` и
`output/qa/deploy-ui-b0-b3-20261018`; секреты/полные env не выводились и не входят
в Git. Финальная проверка6Markdown/132локальных ссылок/UTF-8 и четырёх приватных
literals без совпадений PASS; repository/candidate hygiene и `git diff --check`
PASS. Новый ADR не нужен: применён существующий frontend-only deployment.
Рабочие четыре сервиса и туннель оставлены включёнными; ссылка временная и зависит
от этого компьютера/сети. GitHub push/PR/merge не выполнялись. Следующий этап —
стабилизация сдаваемой версии, независимая UX/предметная приёмка и второй ПК;
KZ OCR fidelity и разрешённый коммерческий C01 остаются OPEN.

## B3: рабочий путь в «Сверке» · 18.10.2026

**IMPLEMENTED / LOCAL VERIFIED / NOT PUBLISHED.** Codex root, один исполнитель,
ветка `codex/monitoring-tools`, чистая базаf7e83581525819e5c97951efecbb63c263adabf9.
Пользователь «гоу» согласовал названный следующий блок; B0–B2 сохранены.

Порядок `/monitoring`: кандидаты → выбранная сверка → предварительные инциденты.
КЖК/Threads/DEMO-версии перенесены ниже в три native disclosure. Компоненты
постоянно mounted в одном экземпляре; причина сверки, snapshot ID, запрос Threads,
черновик DEMO-версии и выбранный File сохраняются при перемещении между блоками.
Это не новое восстановление monitoring-форм после полного reload. Старые IDs,
query filters/pages/candidate_id, права и ограничения REAL/DEMO сохранены.
Открытие источника не выполняет search/import/compare/review; прежние read hooks
продолжают работать и при закрытом disclosure. Ограничения реестра остаются над
очередью. Hash открывает нужный инструмент и фокусирует target; matching событие
после клика не перехватывает следующую клавишу. Modified click сохраняет native
поведение; header clearance120px desktop/24px mobile проверен геометрически.

Фактические проверки: frontend/ `npm run typecheck`, `npm run lint`,
`npm run format:check`, `node --test scripts/test-*.mjs` (2PASS), production
`npm run build` и standalone start PASS. Целевой E2E **17passed/25.2s**;
полный `npm run test:e2e` **103passed/3.0m**, exit0, workers1/retries0.
Отдельный Compose `saq-monitoring-tools-20261018`, новые DB/storage, loopback8197/
3197, внешние collectors/Threads/Telegram/LLM отключены. Два новых кейса:
настоящий DEMO-кандидат через API и сохранность локальных полей/File без команд;
viewer presentation fixture с HTTP503 справочного источника, deep hash/reload/
Back/keyboard,24target-проверки на375/768/1024/1440 и отсутствие page overflow.
Fixture роли/ошибки не доказывает серверную авторизацию или доступность источника.
Прежний настоящий workflow сравнения/версий/инцидента/идемпотентности/неизменного
риска прошёл, вместе с остальными R1–R6/OCR/history/queue/PDF regressions.

Первый targeted15PASS/2FAIL: двойной перенос фокуса по click+hashchange мешал
следующему Enter; устранено дублирование и ненужный отложенный focus. Второй тест
сравнивал динамический as_of для объектов без факторов; теперь сравнивает id/
score/zone/revision/confirmed/unknown/rules_version. Backend/guards не менялись.
Ранний Prettier check потребовал форматирования нового теста; итоговый PASS.

Новый непрерывный текст→analysis→human hypothesis→match→R2 capture/CONFIRM→
signal/CONFIRM→PDF PASS: version4, 37742bytes,
PDF200/%PDF-, новый оригинальный Asset в snapshot, R2=25, R1 не подтверждён.
Это не независимая OCR-оценка. Вручную просмотрены текущие Chromium captures1440/
375; таблица прокручивается внутри TableRegion. Интерактивный CUA, настоящий200%
zoom, screenreader и внешняя UX/предметная приёмка этим не подтверждаются.

Изменены monitoring-workspace.tsx/monitoring.css, три прежних browser tests и
новый monitoring-tools.spec.ts; README/CHANGELOG/DESIGN_SYSTEM/UX_GUIDELINES/
UI_COMPONENTS/UI_IMPLEMENTATION_PLAN/UI_AUDIT/этот статус. API/backend/contracts/
миграции/dependencies/расчёт риска/роли/immutable snapshots не менялись; полная
backend suite не повторялась. ADR не нужен: переставлены существующие primitives
и компоненты без новой архитектуры. Evidence ignored `.local/monitoring-tools-20261018`
и `output/qa/monitoring-tools-20261018`; приватная конфигурация не входит в Git.
Самопроверка14изменённых/новых файлов: UTF-8/147локальных Markdown-ссылок/три
приватных тестовых literals без совпадений PASS. Candidate path hygiene,
`python scripts/check_repository_hygiene.py` и `git diff --check` PASS.

После QA свой frontend/Compose остановлены с сохранением volumes; рабочие четыре
SAQ контейнера не пересобирались и оставлены работающими. Локальный коммит — по
прежней просьбе пользователя; push/merge/deploy/обновление публичного сайта не
выполняются. Следующий приоритет: стабилизация сдаваемой версии к21октября,
независимый аналитик/второй ПК, KZ OCR fidelity и разрешённый C01;103PASS не
закрывает эти задачи и не является полной внешней приёмкой MVP.

## B2/S3: семь разделов досье · 18.10.2026

**IMPLEMENTED / LOCAL VERIFIED / NOT PUBLISHED.** Codex root, один исполнитель;
ветка `codex/dossier-sections`, чистая база709a0be41c1d2f5af3c449c0af0a29f4b7f41a88.
Пользователь «гоу», затем «продолжи от туда от куда остановился» разрешил
продолжение названного этапа. Блок B0+B1 сохранён; повторной интеграции нет.

Досье распределено на обзор, основания, рекламу, факторы риска, доказательства,
историю и сигналы. Семь anchors доступны в обоих видах. Шапка, backend score,
UNKNOWN и ограничения остаются видимыми. Матрица R1–R6 показывает сохранённое
решение/дату/баллы/причину; отсутствующий фактор явно «Не зафиксирован».
«Проверить R…» раскрывает нужный редактор и переводит фокус; R2 остаётся у
публикации. Native disclosure форм постоянно mounted: ввод, File и retry state
сохраняются. Создание основания рядом с основаниями; в кратком виде есть
контекстная кнопка проверки/добавления. Доказательства читаются прежним
EvidenceItem по выбранной группе, с дедупом IDs; предварительного запроса всех
источников нет. История использует прежнюю пагинацию, сигналы — property_id URL
и прежний CreateSignalButton, без изменения immutable snapshots.

Исправлены две локальные детали: изменение identity UI mode setter не открывает
редактор заново при переключении вида; якоря оставляют место для sticky desktop
header. Проверяется не только activeElement, но и фактическое положение заголовка
ниже шапки. Старые dossier section IDs и #dossier-materials сохранены.

Финальные проверки source: frontend/ `npm run typecheck`, `npm run lint`,
`npm run format:check`, `node --test scripts/test-*.mjs` (2PASS), production
`npm run build` и standalone start — PASS. Полный `npm run test:e2e` на
`saq-sections-20261018`, отдельной новой DB/storage, loopback8197/3197:
**101passed / 3.1m**, exit0, workers1/retries0. Предыдущий101PASS/3.0m относится
к source до финального anchor clearance; не заменяет финальную проверку.
Два новых теста: настоящий analyst read-only сценарий с семью keyboard anchors,
collapse/File/draft/deep hash/reload/mode и неизменным risk; viewer presentation
fixture с отсутствующими командами, ленивыми evidence reads и четырьмя ширинами.
Viewer fixture не является серверной проверкой авторизации; прежние server/role
сценарии не менялись. Прежние R1–R6, 409/retry, queue, OCR, history и PDF — в101PASS.

Первый targeted run на повторно использованной B0 DB:25PASS/5FAIL. Четыре
ожидали0, но имели сохранённый после прежнего critical path R2=25; новая БД
изолирует исходный seed без reset/удаления старых volumes. Пятый — новый locator
по одинаковой DEMO-причине трёх факторов; уточнён по уникальному коду фактора.
Guards/допуски/расчёт риска для зелёных тестов не ослаблялись.

Непрерывный новый текст→analysis→human hypothesis→match→R2 capture/CONFIRM→
сигнал/CONFIRM→PDF PASS: version7, 39206bytes,
PDF200/%PDF-, новый Asset в snapshot, R2=25, R1 не подтверждён. Это текстовый путь;
отдельную оценку OCR качества он не заменяет. Responsive375/768/1024/1440 без page
overflow; фактическая видимость anchor target проверена. Вручную просмотрены
актуальные Chromium screenshots1440/375 и полный desktop dossier. Интерактивный
CUA/настоящий200%zoom/screenreader/внешний аналитик этим не подтверждаются.

Изменены PropertyView/CSS, editor IDs ConstructionFactor, тестовый helper и
соответствующие browser regressions; README/CHANGELOG/DESIGN_SYSTEM/UX_GUIDELINES/
UI_COMPONENTS/UI_IMPLEMENTATION_PLAN/UI_AUDIT/этот статус. Новый ADR не нужен:
презентационная группировка использует существующие primitives, API и runtime.
Backend/contracts/миграции/dependencies/формула/роли не менялись, полная backend
suite этим блоком не повторялась. Evidence ignored `.local/dossier-sections-20261018`
и `output/qa/dossier-sections-20261018`; конфигурация содержит только локальные
тестовые доступы и не включается в Git. Финальная самопроверка19изменённых/новых
файлов: UTF-8/146локальных Markdown-ссылок/три приватных тестовых literals без
совпадений PASS. `python scripts/check_repository_hygiene.py`, candidate path
hygiene и `git diff --check` PASS; QA artifacts и приватная конфигурация исключены.

Свой standalone frontend и Compose после QA остановлены с сохранением volumes;
рабочие четыре SAQ контейнера восстановлены без пересборки/замены конфигурации.
Локальный коммит — по прежней просьбе пользователя; push/merge/обновление
публичного сайта не выполняются. B3: группировка инструментов «Сверки» —
следующий отдельный срез. Независимая UX/предметная приёмка, второй ПК,
KZ OCR fidelity и разрешённый C01 остаются открытыми перед защитой21октября.

## B0+B1: сохранность форм досье · 18.10.2026

**IMPLEMENTED / LOCAL VERIFIED / NOT PUBLISHED.** Codex root, один исполнитель,
ветка `codex/dossier-drafts`, чистая база `d3c1a6f2328b25976c0d9a3a1dbde67a0ec93419`.
Продолжено после согласования пользователем следующего блока. Текущий master1.4,
точная очередь решений и интегрированный frontend сохранены; старый аудит не
использован как основание откатывать уже выполненную работу.

B0: формы R1/R4/R3/R5/R6, создания и проверки основания восстанавливают поля
после menu/Back/другого объекта/reload. Использован прежний review-draft runtime:
scoped sessionStorage, 12h при восстановлении, storage fallback, beforeunload.
File-объекты, выбранные новые evidence IDs и retry context остаются только в памяти
вкладки для SPA; после reload требуется повторный выбор файлов. Файловые байты
не сериализуются. Logout и auth/me401 очищают текст/память. Восстановление не
отправляет команд; документ и решение по-прежнему сохраняются отдельно.
Причина сохраняется перед каждой командой, включая немедленный review после
capture. Изменение только причины R4 не теряет новое доказательство; неподанные
новые материалы сохраняются и после отклонения старого фактора.

B1: endpoint точной очереди был готов на входе и не переписывался. R4 regression
проверяет ненулевой исходный риск Самал и сохранность остальных факторов,
а не предполагает нулевой общий score. Исправлена гонка только в проверке
геометрии диаграмм: два DOM-прямоугольника читаются за один проход с ожиданием.
Первый полный прогон98pass/1fail выявил эту гонку; промежуточный99pass не был
выдан за проверку последующих изменений. Последний прогон прерван остановкой
Docker после84PASS; после восстановления выполнен новый полный запуск:
**99 passed / 3.1m**, exit0, retries0, workers1.

Проверки окончательного source: frontend/ `npm run typecheck`, `npm run lint`,
`npm run format:check`, `node --test scripts/test-*.mjs` (2PASS), production
`npm run build` и запуск standalone — PASS. E2E на отдельном Compose
`saq-dossier-20261017`, новой DB/storage, loopback8197/3197: 4 новых draft cases,
прежние роли/keyboard/focus/queue/OCR/history/PDF — в полном99PASS. Из четырёх
новых: три используют реальные API (конфликт R4 инъецирован HTTP409), один
проверяет presentation fixture новой revision основания без отправки решения.
Это не проверка реального конкурентного изменения основания.

Отдельный непрерывный путь: новый ручной текст → worker analysis → human hypothesis →
match → R2 capture/CONFIRM → сигнал/CONFIRM → PDF200/%PDF-, **42213bytes**,
version13, R2=25, R1 не подтверждён, новый оригинальный Asset входит в snapshot.
RU/KZ OCR smoke на двух синтетических изображениях выполнен отдельно: байты
исходника совпали, гипотезы PENDING с bbox; это не независимая оценка качества OCR.
Ранее сняты четыре responsive-наблюдения375/768/1024/1440 без page overflow,
причина R4 сохранена; вручную просмотрены1440/375. Повтор CUA после восстановления
заблокирован browser URL policy; обход не выполнялся. Финальный автоматический
responsive/keyboard набор прошёл, CSS/layout не менялись.

Изменены: пять review/workspace компонентов, новый `use-dossier-form-draft` и
`DossierDraftNotice`, три browser test files; README/CHANGELOG, DESIGN_SYSTEM,
UX_GUIDELINES, UI_COMPONENTS, UI_IMPLEMENTATION_PLAN, UI_AUDIT и этот статус.
Нового ADR нет: расширен существующий локальный механизм. API/backend/contracts/
миграции/dependencies не менялись; полная backend suite этим блоком не повторялась.
Evidence: ignored `.local/dossier-drafts-20261017` и `output/qa/dossier-drafts-20261017`.
Финальная самопроверка18изменённых/новых файлов: UTF-8/144локальные Markdown-ссылки/
три приватных тестовых literals без совпадений; `python scripts/check_repository_hygiene.py`
и `git diff --check` PASS. Runtime secrets и QA artifacts в коммит не входят.
После проверки свой тестовый стенд остановлен с сохранением volumes; рабочие
четыре SAQ контейнера восстановлены без пересборки и замены конфигурации.
Локальный коммит сохраняет блок по прежней просьбе пользователя; push/merge/
обновление публичного сайта не выполняются.

Следующий UI-шаг: B2/S3 — семь локальных разделов досье с сохранением mounted
форм, затем B3 — распределение инструментов «Сверки». Эти этапы ещё не реализованы.
Независимая UX/предметная приёмка, KZ OCR fidelity и разрешённый C01 остаются
открытыми;99PASS не означает завершение всей подготовки к защите21октября.

## Продолжение: runtime восстановлен, KZ provenance проверен · 17.10.2026

**COMPLETED / TARGETED VERIFIED; KZ OCR FIDELITY OPEN.** Исходная интеграция
PR №3 уже завершена; повторная интеграция не нужна. Codex root, база
`aefb72f`, ветка `codex/verify-ocr-provenance`; помощник выполнил независимый
read-only разбор KZ ошибок и review двух тестов, замечаний нет.

При продолжении Docker Desktop и туннель оказались остановлены. Запущен Docker
и только четыре существующих SAQ сервиса, без сборки/замены образов/рабочих
volumes. Новый туннель штатным helper применил публичный origin к API;
приватная `.env` сохранена. Текущий адрес:
**https://honey-identity-approx-hotel.trycloudflare.com**. Прежний адрес ниже
исторический. Рабочие сервисы и туннель оставлены включёнными.

Проверка Chromium: 9 страниц × 375/768/1024/1440 px = **36 наблюдений PASS**,
0 overflow / 0 pageerrors / 0 business mutations. Anonymous401/login200/
Secure cookie/logout204, точная очередь, сравнение и SHA-256 скачанного
сохранённого Asset PASS. Это read-only runtime smoke, не повтор полного
записывающего E2E или внешняя UX-приёмка.

Четыре KZ strict ошибки — OCR `—` → `--`, а не неверные суммы/привязка к
другому условию. Повторная оценка сохранённых predictions воспроизвела
KZ raw11/11 и strict fragment/binding1TP/4FP/4FN; manifests, raw reports и
labels неизменны. Новый Tesseract-прогон не выполнялся. Добавлены регрессии
пунктуационной строгости и пути mocked TSV → worker → ручная дочерняя версия:
raw OCR/исходные байты/родитель/bbox сохраняются, новые offsets точны,
унаследованного bbox нет, гипотезы PENDING, retry идемпотентен, stale parent409.
Mocked OCR не доказывает качество распознавания изображения.

Фактические проверки: из backend/ `python -m pytest -q tests/test_analysis.py
tests/test_extraction_payment_fields.py tests/test_extraction_payments.py
tests/test_extraction_names.py tests/test_publication_evaluation.py` —
**230 passed / 27.94s** на отдельном PostgreSQL `127.0.0.1:55639`, private tmpfs;
после тестов контейнер остановлен. `python -m unittest discover -s scripts
-p "test_*.py" -v` — **74 tests OK / 1 Windows symlink skip**. Ruff check/
format двух тестовых файлов, repository hygiene и `git diff --check` PASS.
Локальные команды используют `.venv`; скриптовый Ruff — config backend/pyproject.toml.
Frontend/API/правила/контракт/миграции/dependencies не менялись; build и полная
backend/browser suite не повторялись. Evidence ignored
`.local/resume-verification-20261017`, captures `output/qa/resume-verification-20261017`.

Обновлены README, DEPLOYMENT, OCR_EVALUATION и REMAINING_CHECKLIST. Нового ADR
нет: production-поведение не меняется. Финальная проверка пяти Markdown/145
локальных ссылок/UTF-8 PASS; семь изменённых файлов проверены по четырём
локальным sensitive literals, совпадений0. Изменения сохранены локальным
коммитом в указанной ветке; GitHub push/merge и удалённый CI не выполнялись.
Этот блок закрывает восстановление и
проверку provenance, не точность KZ OCR. Следующий шаг: независимая RU/KZ
разметка разрешённых реальных примеров и проверка KZ-пунктуации; коммерческий
C01 по-прежнему требует разрешённого источника. claude-mem недоступен для новых
записей из-за отозванной авторизации; передача сохранена здесь.

## PR №3 опубликован; новый frontend установлен · 17.10.2026

**PUBLISHED / CI SUCCESS / PUBLIC HTTPS VERIFIED.** Проверенный merge
`dccc281bd281306c670b131708d9e7adaf4fe259` опубликован через
[PR №3](https://github.com/temirkhanerbolatovich-coder/saq-qurylys/pull/3)
в main `4552d44d67ba96c4b8a13e9b41e000e83bdbf117`; деревья совпали.
Входящий9691bf0 — ancestor main, история обеих сторон сохранена.
[PR CI](https://github.com/temirkhanerbolatovich-coder/saq-qurylys/actions/runs/39055627392)
и [push CI](https://github.com/temirkhanerbolatovich-coder/saq-qurylys/actions/runs/39055621564)
success во всех3jobs. Своя объединённая ветка удалена после ancestry check,
исходная `codex/ui-updates` сохранена; дальнейшую работу начинать от свежего main.
Повторный [CI на main4552d44](https://github.com/temirkhanerbolatovich-coder/saq-qurylys/actions/runs/39056051978)
также success во всех3jobs. Заключительный update меняет только документацию.

Оба полных локальных browser прогона95passed/2.6m; после визуальных исправлений
повторный28наблюдений PASS. Перед push352trackedфайла/8известных sensitive literals/
0совпадений,9Markdown/143ссылки/UTF-8/hygiene/diff-check PASS. Backend/API/данные/
миграции/dependencies не менялись. Подробности реализации и проверок — ниже.

Обновлён только frontend, прежний image сохранён для отката; кандидат назначен
также стандартному `saq-qurylys-frontend:latest`. API/worker/DB container IDs и
start times, env hash и URL остались прежними. HTTPS smoke9страниц×4ширины:
36наблюдений/0overflow/0pageerrors/0businesswrites; anonymous401/login200/
Secure cookie/logout204, очередь/comparison и скачанный Asset SHA-256 PASS.
Адрес прежний: https://casey-medicine-feed-bowl.trycloudflare.com.
Открытую вкладку с досье не перезагружали; новая версия доступна при обновлении.
Собственный acceptance остановлен, private volumes сохранены; работают только
4рабочихSAQсервиса. Evidence/rollback config ignored `.local/ui-integration-20261017`;
screenshots `output/qa/{ui-updates,working-site-ui-updates}`. README/UX/deployment/
GitHub audit обновлены. Следующий блок — независимая RU/KZ приёмка и KZ quotes;
рекламный C01 требует разрешённого источника. Ниже — ход работы до публикации.

## Интеграция новой frontend-ветки · 17.10.2026

**IMPLEMENTED / LOCAL VERIFIED / PUBLICATION NEXT.** Пользователь «гоу» согласовал безопасную интеграцию и обновление сайта. Codex root; база main `33173a0363bb454b5be48a75d730e1a5d8399930`, вход `9691bf0489ba1e5d5ecd207306e803e368e6bb8a`, ветка `codex/integrate-ui-updates`. Три конфликта разрешены выборочным переносом представления; история обоих родителей сохраняется, чужая ветка не переписывается.

Приняты карточки/детали публикаций, даты/версия/SHA, оформление text/file intake, заголовок материала review, инструкция сигналов и две диаграммы. Диаграммы явно ограничены первыми100/сервернымtotal; image+URL считается один раз, реальные processing statuses не заменяются выдуманными SUCCEEDED. Точные action totals остаются отдельной очередью. Пять зон, оба вида, URL/Back/reload, server pagination, drafts/idempotency, PropertyHistory, controlled map, comparison, роли/решения/исторические snapshots сохранены. Backend/контракт/миграции/dependencies/frozen data не менялись; нового ADR не требуется.

Первый targeted browser run:19passed/1failed — новый тест читал URL до завершения client navigation. Исправлено ожидание, без ослабления guards. Полный Linux API/worker/production frontend прогон:95passed/2.6m. Typecheck/ESLint/Prettier,2Nodechecks, Windows и Docker production builds PASS. Read-only осмотр7страниц×4ширины375/768/1024/1440:28наблюдений,overflow0/pageerrors0/businesswrites0. Captures375/1440 просмотрены вручную; исправлены full-row span диаграммы и группировка upload fields, caption≥12px/native links≥44px/существующие color tokens. Финальный полный повтор после визуальных исправлений:95passed/2.6m; повторный read-only осмотр28наблюдений PASS, logout204.

Стенд `saq-ui-acceptance-20261017-53b240`: новые private DB/storage volumes, loopback3199/8199/55629. Рабочие данные не используются в write tests; Docker frontend имеет отдельный tag. Config/logs ignored `.local/ui-integration-20261017`, screenshots `output/qa/ui-updates`. README/CHANGELOG, design/UX/components/plan/audit и GitHub audit обновлены. Следующий шаг: финальные проверки/secret scan → merge commit/push/PR/CI → обновление только рабочего frontend с прежним HTTPS override/read-only smoke; свой стенд остановить. KZ quotes/независимая RU-KZ приёмка/разрешённый C01 остаются OPEN.

## Сайт обновлён; rules-1.6 и review/comparison опубликованы · 17.10.2026

**PUBLISHED / CI SUCCESS / WORKING SITE VERIFIED.** Пользователь
согласовал восстановление сайта и следующие backend/UI блоки. Проверенный
коммит `6c2b8cda394e91d3c3f160c782049ee88527a2a9` из ветки
`codex/restore-site-ai-review-tools` объединён через [PR №2](https://github.com/temirkhanerbolatovich-coder/saq-qurylys/pull/2)
в main `d95c95daae6ec74404925ac8502f93c2612a0183` обычным merge, без переписывания истории.
Оба CI на исходном коммите зелёные: [PR](https://github.com/temirkhanerbolatovich-coder/saq-qurylys/actions/runs/39052856375)
и [push](https://github.com/temirkhanerbolatovich-coder/saq-qurylys/actions/runs/39052786775),
во всех трёх jobs frontend/backend/browser-e2e. После fetch и fast-forward
дерево main полностью совпало с проверенным коммитом. Codex root отвечает за
runtime/интеграцию, помощники — независимые extraction/queue/comparison области.
Повторный [CI на merge-коммите main](https://github.com/temirkhanerbolatovich-coder/saq-qurylys/actions/runs/39053400753)
также завершился success во всех трёх jobs. Собственная объединённая ветка
удалена после проверки ancestry; чужая `codex/ui-updates` сохранена.
Заключительный docs update:351trackedфайл/8известных literals/0совпадений,
5Markdown/114относительных ссылок/UTF-8/hygiene/diff-check PASS;
обычный push завершён, main чистый и синхронный с origin.
Сохранены frontend master1.4, API0.13/51operations, роли/риск/исторические решения;
новых dependencies/миграций нет. Next dev создал локальные frontend/AGENTS.md;
проверены поставленные Next Link/searchParams docs, инструкция сохраняется в Git.

**Реализовано:** rules-1.6 исправляет банковские false positives от общего отрицания
названия и сохраняет связанные сумму/процент одной фразы; новые extraction остаются
PENDING, старые не пересчитываются. `/review?queue=actions` и Dashboard используют
точные серверные totals; processing режим сохранён. Actions ведут к текущей версии,
исторический R2 имеет собственные target/factor/evidence/revision/idempotency/draft.
`/comparison` явно выбирает две публикации или extraction версии, показывает
bounded diff/исходники/даты/SHA; после выбора только GET, без бизнес-записей.

**Рабочий сайт:** восстановлен Docker Linux с существующим SAQ volume;
до startup/migrations получена согласованная копия и isolated restore PASS:
24 таблицы/1936 audit events/553 Assets/66signals/44READY PDF. Перед финальным
обновлением создан дополнительный backup. Рабочая env/БД/storage не заменялись.
Сначала поднят точный published f1ee219 snapshot, затем проверенные новые образы.
URL https://casey-medicine-feed-bowl.trycloudflare.com, HTTPS origin/Secure cookie
сохранены. Chromium smoke:12наблюдений dashboard/queue/comparison375/768/1024/1440,
overflow0/pageerror0, anonymous401/login200/logout204, business mutations0.
Скачанный существующий исходный Asset дополнительно сверен по SHA-256.
После публикации `/comparison` по HTTPS вновь ответил200; рабочие сервисы
оставлены включёнными. Адрес зависит от компьютера, Docker, интернета и туннеля.

**Проверки:** полный backend из backend/ —809passed/18WindowsLinuxPDFskips/377.33s;
первая команда из корня дала808pass/18skip/1fail из-за child module cwd, отдельный
повтор и полный правильный запуск PASS. Ruff app/tests/alembic check/format86files
PASS. Tooling unittest73tests/72pass/1Windows symlink skip PASS через venv;
system Python без зависимостей ранее дал import errors и не принят за результат.
Frontend typecheck/lint/format, production Docker build/start,2Nodechecks PASS.
На отдельной acceptance БД все77старых сценариев прошли; после исправления двух
тестовых ошибок все16новых presentation/live сценариев PASS. Финальная проверка
metadata/navigation layout —8passed/19.5s. Удалённый Linux CI после этих исправлений
завершился success во всех трёх jobs; точные локальные результаты приведены выше.

**ИИ качество:**172целевыхpytest/44evaluatorunittest PASS; frozen labels unchanged.
Offline Linux OCR v1/v2 безnetwork/DB: payment16/0/0/16 и8/0/0/4, top3 24/24 и10/10;
v2money11/0/0,percent4/0/0,value10/0/0,strictbinding6/4/4 из-за четырёх KZquotes.
CER2.49%/1.69%; оба acceptance=false. Это изученный synthetic regression, не
real-positive holdout/человеческая приёмка. Максимум одна сумма+один процент на
фразу; произвольные несколько платежей и KZ OCR нормализация не заявляются.

**Стенд/диагностика:** отдельный Compose `saq-acceptance-20261017-d68a0f` с портами
3199/8199/55629 и private named volumes. Первоначальные internal network/кириллический
bind не публиковали Windowsports/исказили path; заменены только test network/storage.
После замены storage создана новая согласованная testDB/storage pair: старый seed
указывал на прежние файлы (75pass/2fail), рабочая система не затрагивалась.
Все private logs/config/results лежат ignored `.local/site-refresh-20261017`;
старые тестовые тома/backup не удалялись. Стенд штатно остановлен;
работают только четыре сервиса рабочей SAQ установки.

**Документация:** README/CHANGELOG, architecture, AI/OCR audit, обе feature docs,
design/UX/components/plan/audit, deployment/checklist и этот статус синхронизируются.
CI включает write-smoke flag только одноразовому browser job; тесты требуютloopback.
Значимых новых архитектурных решений нет: используются ADR012/013 и прежний runtime.
Перед push проверены351trackedфайл и восемь известных sensitive literals:
совпадений0;16изменённых Markdown/217относительных ссылок/UTF-8/diff/hygiene PASS.
Frozen data и API contract не изменялись. Перед merge ещё раз проверены точные
SHA исходной ветки и main; чужая frontend-ветка не изменялась.

**Новая frontend-ветка:** при заключительном fetch обнаружена
`origin/codex/ui-updates` (`9691bf0489ba1e5d5ecd207306e803e368e6bb8a`, от f1ee219).
Её [CI39051315128](https://github.com/temirkhanerbolatovich-coder/saq-qurylys/actions/runs/39051315128)
имеет failures format:check и browser-e2e. Read-only merge preview с новым main
показал три конфликта: design-system.css, analysis-workspace.tsx, workspace.tsx.
Diff также удаляет useReviewDraft и серверную пагинацию прежней очереди.
Эта отдельная ветка сохранена и не объявляется установленной на сайте.
Следующий блок — интеграция её представления с сохранением действующих сценариев,
разбор её CI и повторная проверка; затем независимая RU/KZ приёмка качества.
C01/realRU-KZ/KZquotes/внешняяприёмка остаются OPEN. Пароли другойкопии/PRcache
из предыдущего инцидента владелец обрабатывает отдельно; они не объявляются закрытыми.

## Очистка GitHub завершена в доступном объёме · 17.10.2026

**PUBLISHED / MAIN SYNCHRONIZED / CI VERIFIED.** Опубликованы очищенный main
6059064 и документальный блок `1db8e95d8be8262864db8cd46fecb928443f0bf8`.
Свежий single-branch clone после обычного fast-forward подтвердил совпадение
с локальным деревом, отсутствие обеих ZIP blob и архивных путей во всей истории
main; `git fsck --full --strict` PASS. Сохранены исходные 38 коммитов плюс
документация; frontend/backend/контракт/миграции не менялись после зелёного
CI39045481388. Все три CI job success: 803 backend, 77 browser E2E, 73 tool tests,
2 Node checks, frontend checks/build/audit, OCR и migrations PASS.

Перед публикацией 1078 достижимых объектов HEAD проверены на восемь известных
текущих/раскрытых secret literals: 0 совпадений. Восемь Markdown, 113 links,
Python/PowerShell syntax, четыре изолированных SQLite сценария, hygiene/diff-check
PASS. Собственные две временные локальные ветки удалены после verified bundle;
остался только main, локальное/удалённое дерево синхронно и чистое. Приватные
старые backups, рабочие env/БД/storage сохранены. Этот заключительный update
меняет только PROJECT_STATUS и публикуется обычным fast-forward.

**Следующий шаг вне этой машины:** пользователь подтвердил отсутствие доступа
к компьютеру frontend-разработчика; владелец выполняет
[инструкцию ротации](docs/ROTATE_FRONTEND_WORKSTATION.md) и подтверждает отказ
старых паролей/сессий с сохранностью данных. PR №1/cache refs остаются старой
историей и требуют отдельной обработки владельцем/GitHub Support; обращение
не отправлялось. Полное удаление из GitHub/чужих клонов и отзыв доступов не заявляются.

## История main очищена и опубликована · 17.10.2026

**MAIN HISTORY PUBLISHED / FRESH CLONE VERIFIED / CI SUCCESS.** По разрешению
пользователя «продолжай» выполнен main-only force-with-lease:
`97d2bff842cabbd0e36417fc897a876d33e21bff` → `6059064572b64571f4e910d4483af167ef99bbdc`.
Сразу перед действием проверен точный remote SHA; новых веток/tags/open PR/forks
нет. Все 38 коммитов сохранены, изменены 8 SHA; текущий код полностью совпадает
с прежним. Другие удалённые refs не менялись; read-only `refs/pull/1/head` остался прежним.

**Наблюдавшаяся проверка:** новый remote clone `--bare --single-branch --branch main --no-tags`
содержит 38 commits и tree `e4fa6ca83e83173d839b7891d9281e6ffc6f770d`, совпадающий
с деревом до очистки; `rev-list --objects main` не содержит архивных путей,
`cat-file -e` не находит обе ZIP blob, `git fsck --full --strict` PASS. Приватные
результаты: `.local/history-cleanup-20261017/publication.json`,
`fresh-main-verification.json`. Полный [CI39045481388](https://github.com/temirkhanerbolatovich-coder/saq-qurylys/actions/runs/39045481388)
на 6059064 завершился success во всех трёх jobs: 803 backend/143.83s,
77 browser E2E/1.9m, 73 tool tests, 2 Node checks; frontend audit 0 vulnerabilities,
lint/typecheck/format/build, hygiene, OCR и migration upgrade/check PASS.

Локальная рабочая копия переведена на очищенный main без reset/clean; прежние
main/подготовительная ветка сохранены в verified private bundle. Перенесены только
два документальных коммита cherry-pick без старых родителей. Обновлены README,
CONTRIBUTING, SECRET_CLEANUP, GITHUB_SYNC_AUDIT, ADR-014 и этот статус; принято
новое решение ADR-015. Документы публикуются обычным fast-forward после проверок;
backend/frontend/контракт/данные/.env/службы не изменялись.

По просьбе пользователя добавлена отдельная инструкция ROTATE_FRONTEND_WORKSTATION
с последовательностью backup → пароль существующей роли БД → новая private env →
одноразовая транзакция password_hash/sessions/audit → проверка старых/новых доступов.
Пример транзакции проверен с текущими ORM/security в изолированном SQLite:
успех отзывает две сессии/сохраняет другой аккаунт и контрольный документ;
неизменённый пароль/нет пользователя/ошибка audit оставляют исходные hash/сессии.
Все четыре сценария PASS, синтаксис Python и пяти PowerShell блоков PASS;
0 подключений к рабочим БД. Восемь Markdown проверены: UTF-8 PASS,
113 относительных ссылок/0 missing; известных текущих/раскрытых secret literals
нет. Repository hygiene и `git diff --check` PASS. После очистки main удаляются
только две собственные временные локальные ветки после проверки сохранённого
bundle; незавершённые пользовательские файлы и приватные backups не удаляются.
Это не проверка PostgreSQL/Docker или машины разработчика. Отчёт:
`.local/history-cleanup-20261017/rotation-example-verification.json`.

**Открыто:** пользователь подтвердил запуск старой копии на компьютере
frontend-разработчика и отсутствие доступа к нему. По просьбе пользователя
подготовлена [инструкция владельцу](docs/ROTATE_FRONTEND_WORKSTATION.md),
ротация удалённо не выполнена; PR/cache refs требуют отдельной обработки владельцем/GitHub
Support. Никаких обращений/сообщений не отправлялось. Команде перейти на очищенные
клоны по CONTRIBUTING, не объединять старую историю. Точный следующий шаг —
завершить публикацию документации, затем владельцу выполнить ротацию на своей машине.

## Очистка истории: разрешение на применение · 17.10.2026

После конкретного отчёта о сохранности исходников, изменении восьми SHA и
вопроса о публикации пользователь ответил «продолжай». Codex применяет это
разрешение к подготовленному main-only обновлению: `97d2bff` → `6059064` с
точным force-with-lease. Повторная проверка remote не обнаружила новых веток,
тегов или коммитов main; candidate fsck PASS. На момент этой записи обновление
ещё не выполнено. Ротация чужой установки и обращение в Support этим разрешением
не объявляются выполненными; runtime пока не установлен. Никаких merge старой
истории или mirror push; локальные пользовательские данные сохраняются.

## Раскрытые доступы: локальная подготовка очистки · 17.10.2026

**LOCAL CANDIDATE VERIFIED / NOT PUBLISHED / CREDENTIAL REVOCATION OPEN.**
После согласия пользователя заняться раскрытым ZIP исполнитель Codex подготовил
изолированный remote mirror и приватный verified bundle в ignored
`.local/history-cleanup-20261017/`. Проверены обе версии ZIP: один набор четырёх
секретов; `.local/credentials.txt` содержит тот же пароль аналитика. Все четыре
отличаются от текущего локального `.env`. Целевая машина старой копии пока
не установлена; рабочая конфигурация/БД/службы не менялись. Запрошено уточнение
владельца runtime; отзыв не заявляется выполненным.

git-filter-repo 2.47.0 удалил только архивный путь в candidate: сохранены все
38 commits, изменены 8 SHA. Исходный main `97d2bff842cabbd0e36417fc897a876d33e21bff`,
candidate `6059064572b64571f4e910d4483af167ef99bbdc`. Текущие деревья полностью
равны `e4fa6ca83e83173d839b7891d9281e6ffc6f770d`; все исторические деревья
равны за исключением ZIP. Metadata/messages/parent topology сохранены;
у 4 затронутых исходных коммитов подписи gpgsig не сохраняются при rewrite.
`git fsck --full --strict` PASS; exact-secret scan всех 1057 достижимых объектов
candidate — 0 совпадений, обе ZIP blob отсутствуют; положительные контроли по обоим
оригинальным архивам PASS. На отдельном локальном bare remote проверены успешное
обновление main с точным lease и отказ при устаревшем lease. Это репетиция,
GitHub main/PR refs не менялись. Build/E2E неизменённого приложения не повторялись.

Read-only независимый аудит: remote содержит main и read-only `refs/pull/1/head`,
0 forks по API, других branches/tags нет. Замена main не удалит PR/cache refs;
сведения для GitHub Support собраны локально, не отправлялись. Generic push
candidate отключён. Документы текущего блока: README, этот PROJECT_STATUS,
[SECRET_CLEANUP](docs/SECRET_CLEANUP.md). Решение о перезаписи общей истории ещё
не принято; действующее согласование команды — ADR-014.
Документация: UTF-8 PASS, проверены 102 относительные ссылки/0 missing,
известные текущие/раскрытые секреты в трёх Markdown отсутствуют; repository
hygiene и `git diff --check` PASS. Изменены только три документа.

**Следующий шаг:** определить runtime раскрытых доступов и выполнить там
согласованную ротацию роли БД, существующего password_hash, всех server sessions
и private env. Перед force-with-lease публикацией очищенной истории требуется
подтвердить готовность команды перейти на новые SHA и повторно проверить remote.
Сейчас только локальная ветка `codex/prepare-secret-cleanup`; никаких deploy,
удалений пользовательских артефактов или переписывания GitHub не выполнено.

## GitHub: согласованная интеграция frontend и публикация · 17.10.2026

**POST-MERGE VERIFIED.** Повторный [CI main39043777565](https://github.com/temirkhanerbolatovich-coder/saq-qurylys/actions/runs/39043777565) на mergebdab80a завершился **success по всем3jobs**:803backend/116.32s,77browser/1.9m,73tooltests,frontend checks/build иmigrationcheck. Следующий main0ac49cc менял только README/UI_AUDIT/PROJECT_STATUS; исходники совпадают с проверенным приложением. Локальный/удалённыйmain синхронизированы, дерево чистое,55rootartifacts отсутствуют, hygienePASS. Собственная mergedfeaturebranch удалена локально/удалённо после проверки ancestry вmain; исходная история/PR1 сохранены. Этот заключительный update также только документация, runtime/данные не меняет.

**COMPLETED / PUBLISHED TO MAIN.** [PR1](https://github.com/temirkhanerbolatovich-coder/saq-qurylys/pull/1) объединён после зелёного полногоCI точной ревизии `d5516267152dbaad6dd6de068792b8c6fe8068c9`; merge в main — `bdab80a5c846c5b593187583a670cf87cabcdb56`. Локальный main обновлён только fast-forward, origin/main совпал, product tree merge совпадает с проверенной PRревизией. [CI39043383017](https://github.com/temirkhanerbolatovich-coder/saq-qurylys/actions/runs/39043383017): все3jobs **success**, **803backend tests/109.80s**, **77browser E2E/1.9m**, **73tool tests**, **2Node tests**, frontend dependency audit/lint/typecheck/format/build, обаOCRcorpora, hygiene иmigration upgrade/check PASS. Все прежние локальные backend/AI/UX изменения опубликованы вместе с интегрированнымfrontend. Нет runtime deploy/force push/history rewrite/изменения рабочейБД.

**Разрешение и checkpoints.** Пользователь после аудита явно поручил привести GitHub в порядок, совместить frontend и опубликовать наши изменения. Это разрешение заменяет прежний запрет публикации для данного блока. Создана ветка `codex/integrate-frontend-backend`; сохранены исходные35dirty/untracked файлов, binary patches,55remote additions и очищенная выборка54frontend файлов ZIP в ignored `.local/github-integration-20261017`. Секреты не выводятся и не попадают в новые source artifacts. Checkpoint сохраняет предыдущие backend/AI/UX результаты. Интеграция сохраняет API/роли/риск/ручные решения/исторические snapshots; глобальный новый дизайн не изобретается. История Git не переписывается, force push не применяется.

**Итог и оставшиеся границы:** активныйfrontend находится только в frontend/;55ошибочныхкорневыхпутей исключены, rootlockfile отсутствует, git hygiene PASS и trackedsecret scan338files/0matches. Доступы текущейлокальнойкопии отличаются от раскрытогоZIP; чужие раскрытые пароли/сессии должен заменить владелец соответствующейкопии. СтарыйZIP остаётся в прежнихкоммитах; очистка общейистории требует согласования команды, не выполнена. Фактический UIдизайн master1.4, документы/CONTRIBUTING/ADR014 синхронизированы. Независимыйreview команды/fixtures/source mapping и визуальнаяQA не нашли оставшихся blockers. Стенд штатно остановлен; рабочаяPostgreSQLслужба/данные не менялись. Следующий продуктовыйблок — измеренныеAI банковскиеFP/mixedmoney+percent, затем разрешённые реальныеRU/KZ изображения/человеческаяразметка; внешнийUX/реестр/C01остаютсяOPEN.

**LOCAL INTEGRATION VERIFIED / REMOTE CI NEXT.** Сохранённый backend/AI/UX commit `6f78d52` объединён с origin986ca90 без конфликтов. Намеренные различия двухfrontend-вариантов перенесены в workspace/property-map/signals-workspace/design-system.css; сохранены5зон, досье/формы/history/review drafts, API/риск/роли, URLfilters/pagination/revisions/PDFpolling.Все55remote additions убраны с ошибочных корневых путей (54frontend/config/test/download artifacts и ZIP): все55исключены из будущего текущего дерева, исходники/история и ignored backup сохранены. Next tracing/Turbopack root явно frontend; новый настоящий config-loader test предотвращает parentlock regression. CI guard отвергает private/generated files/source archives и rootfrontend, `/*.zip` ignored. [ADR-014](docs/decisions/ADR-014-frontend-build-root-and-source-hygiene.md), UI master1.4/UX/components/plan/audit, README/CHANGELOG обновлены.

**Фактические проверки перед push:** native PostgreSQL18 только собственный retained loopback55617/UTC, случайные backendtestschemas и новая отдельная `saq_frontend_integration_20261017` база для API8199/frontend3199/worker. Рабочая БД/.env/storage/службы не менялись. Backend `pytest -q -rs` — **785passed/18skipped/253.77s** (Linux resource/Pango); `alembic check` отдельнойruntimeБД — PASS. Tooling unittest discovery — **73tests,72passed/1skipped** (Windows symlink privileges). Backend Ruff app/tests/alembic PASS85files; scoped11tooling Ruff check/format PASS. Frontend typecheck/lint/format PASS; node scripts test2/2 PASS (mapconfig + realNext parentlock config); production build PASS, `.next/standalone/server.js` существует, штатныйstart поднялся, GETcsrf200. Docker недоступен, Linux PDF/E2E проверяются удалённымCI, контроль не ослаблялся.

**Browser/визуально:** финальный целевой Playwright6files — **26passed/34.8s**, включая dashboard/map/signals375/768/1024/1440, overflow0, keyboard/contrast/role/loading/error/empty, draft/URL/conflict reason. Новый regression проверяет не только pageoverflow, но и отсутствиеclip уworkflow links/отдельное размещениеsummarylabels/numbers. Все12screenshots сохранены в ignored output/qa/integration; после QA просмотрены desktopdashboard/signals и mobilemap/signals, устранены railclip и mismatchsummaryclasses. Тестовый maplayer — localSVG, не liveOSM. В первомпрогоне голомуseed не хваталоREADY/signals (12pass/3fail/10notrun); явно созданы realOCR RU/KZ fixtures и DEMOdraft, затем25pass. При финальномповторе исправлены2ошибкистенда/новоготеста (startreadiness и несуществующийCSSselector), итог26pass выше. Всеfailedlogs сохранены в `.local/github-integration-20261017`; productAPI/labels ради проверок не менялись. Полный Linuxbrowserнабор ожидаетCI.

**Граница секретов:** четыре `.env` значения из опубликованногоZIP **не совпадают** с актуальными локальными POSTGRES_PASSWORD/DATABASE_URL/SESSION_SECRET/BOOTSTRAP_ANALYST_PASSWORD; локальные доступы не менялись без необходимости. Другаяruntimeкопия не подключена: её владелец должен заменить раскрытые доступы/отозватьсессии. Новыйsource tree не содержитZIP/.env/credentials/storage/output. Старыеblob/history остаются: это раскрытый residualrisk, не утверждение полногоотзыва/очисткиистории.

**Публикация интеграционной ветки:** mergecommit `f560bf093ae2674951a518de99c95609140d7883` отправлен в origin/codex/integrate-frontend-backend; создан [PR1](https://github.com/temirkhanerbolatovich-coder/saq-qurylys/pull/1), прикреплён к текущему чату. Main пока986ca90. До push просканированы338trackedфайлов на совпадения текущих/раскрытых секретов и ограниченные privatekey/token signatures:0matches; UTF-8 десятиdocs/132локальные ссылки0missing, hygiene/diffcheckPASS. Независимый финальный review exactf560bf0 не нашёл blockers и подтвердил preservationcommands/fixtures. Native API/worker/frontend остановлены по проверенным собственнымPID, отдельныйPostgreSQLcluster штатно остановлен; чужаяPostgreSQLслужба осталасьRunning. Runtime/privatefiles сохраненыignored.

**Первый remote CI:** PRrun39043174512 начал Linuxbackend/browser, frontend остановился только на Prettier нового integrated-layout теста: последняя смена selector была после локальногоformat. Исправлено форматирование без изменения assertions/поведения; локальные frontend format/typecheck/lint повторноPASS. CONTRIBUTING закрепляет правильные sourceпути/ветки/PR и проверкуbuild→start; новый commit требует нового полногоCI передmain. Ошибка не скрывается успешными предыдущими локальными прогонами.

## GitHub: проверка безопасной публикации при новом frontend · 17.10.2026

**AUDIT COMPLETE / DIRECT PUSH NOT READY.** Пользователь попросил проверить новые изменения GitHub и возможность публикации без повреждения frontend. Выполнены только fetch/read/API GET, изолированная копия и проверки; push/merge/pull/stash/reset/новых веток/commit/deploy не выполнялись. HEAD/main сохранён `f9db50bbed7e8ba1f2897a5d5151d47cef332216`, новый origin/main `986ca90a17188b0b4c9bd4116aafc05d845fea9b`, база `e993dc855da00fd5d65c980caeb53ba139d4ce92`; ahead1/behind3. Прежние34dirty/untracked файла сохранены. Исполнитель root; отдельное основание двух read-only помощников — независимый анализ frontend imports/API/root selection и безопасная инвентаризация ZIP без вывода секретов. Они продуктовые файлы не меняли. В этой сессии добавлены только [GITHUB_SYNC_AUDIT](docs/GITHUB_SYNC_AUDIT.md) и текущая запись статуса.

**Remote/объединение:** три новых upload-коммита добавляют55путей в корень (54отдельных frontend/config/test файла и ZIP); существующий frontend/backend от общей базы не менялся. Локальные141пути от базы, включая checkpoint/dirty/untracked, с remote не пересекаются. `git merge-tree --write-tree --name-only HEAD origin/main` exit0, tree `2284af7c6af5f3a76faed13af13cd9cd1f194dca`; реальный index/локальная ветка не менялись. Прямой push main без синхронизации non-fast-forward, force push не допускается. GitHub API:0открытых PR, heads толькоmain; CI986ca90 run39033732564 success по3jobs. Он проверяет активный frontend/DockerE2E remote SHA, а не архив или наш кандидат.

**Конкретный blocker:** объединённое committed дерево безопасно извлечено в ignored `.local/github-publish-audit-20261017/candidate`, поверх скопированы34dirty/untracked файла (без изменения исходников/index), отдельно установлен npm CI без scripts. В candidate/frontend `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm run build` — **PASS**. Но `npm run start` на отдельном PORT3199 — **FAIL/exit1/MODULE_NOT_FOUND**: новый корневой package-lock выбирается Next16.4 как tracing/Turbopack root, сборка создаёт `.next/standalone/frontend/server.js`, а start.mjs ищет `.next/standalone/server.js`. Подтверждены manifest.relativeAppDir/frontend root и отсутствующий/существующий файл, независимый review исключил артефакт вложенной `.local` копии. Сервер не запустился, процессов не осталось. Docker context ./frontend не включает rootlockfile; свежий Docker/runtime/E2E/БД/миграции этим аудитом не проверены. Логи/summary — в `.local/github-publish-audit-20261017/`; product frontend/.next и рабочая БД не менялись.

**Сохранение frontend/security:** новые rootTSX/CSS сами не заменяют frontend/. Последний ZIP содержит363файла,54frontend,12отличаются от активного remote и22отHEAD; root uploads — другая версия карты/сигналов/CSS, не полная копия ZIP. Blanketcopy вернёт часть старых ограничений review/pagination/types/proxy. В опубликованном архиве есть заполненный .env и .local/credentials.txt, конфигурационные секреты отличаются отexample, плюс72storage/30output файлов; значения нигде не выводились. Доступы следует считать раскрытыми и заменить владельцем; удаление ZIP новым коммитом не уберёт историю. Смена/отзыв/очистка истории не выполнялись. Наши два новых GET/AI tools не меняют прежние41paths/105schemas относительноHEAD; относительноremote checkpoint шире, поэтому это не полная runtime-приёмка.

**Следующий точный шаг:** сохранить обе frontend-версии без секретов, отдельно интегрировать нужные UI-изменения в правильные пути с сохранением currentfeatures; устранить rootlockfile/tracing-root/start mismatch и повторить build+start/E2E. Владелец меняет раскрытые доступы, затем согласованное удаление архива/очистка истории. Только после отдельного разрешения — синхронизация/feature branch/PR, свежий remoteSHA/diff/secret/migration checks. Публикация этой проверкой не разрешена и не выполнена; технического основания обещать безопасный main push сейчас нет.

**Финальная проверка аудита:** повторный ls-remote вернул тот же986ca90; UTF-8 двух документов/33локальные ссылки PASS, missing0; `git diff --check` PASS. Отчёт отделяет0Gitконфликтов,4успешные frontend проверки, наблюдавшийся hoststartfailure, исторический remoteCI и непроверенную интеграцию новых вариантов UI. Исходные PDF/DOCX/TZ, приложения/ветка/index/службы и прежние dirty изменения сохранены.

## ИИ: offline оценка полей и исходных фрагментов · 17.10.2026

**IMPLEMENTED / OFFLINE VERIFIED / EXTERNAL QUALITY ACCEPTANCE OPEN.** Пользователь согласовал следующий блок после аудита («окей гоу»): оценка amount/currency/percent и связи с PAYMENT_TERM/источником, с сохранением прежних baselines. Вход/выход HEAD `f9db50bbed7e8ba1f2897a5d5151d47cef332216`, ветка main, прежние dirty queue/compare/UX сохранены. Исполнитель root; отдельное основание помощников — независимый review семантики метрик, создание только нового JSON regression и отдельно поведенческих тестов. Пути разделены; общие evaluators/документы/статус редактировал root. Commit/push/deploy/платные API не выполнялись, публикация остаётся запрещена.

**Результат:** оба offline evaluator поддерживают manifests1/2, новые reports2 с manifest_schema_version. Общий scorer считает multiset-value и строгую source binding отдельно, Decimal, currency/percent, TP/FP/FN, coverage, raw fragment validity и RU/KZ; ошибки inference сохраняются FN, дубли не дают лишние TP, нулевые знаменатели null. V1 остаётся not_annotated/scores=null, labels из predictions не создаются. HTML v2 проверяет frozen reference против parser. Source hashes включают общий scorer; старые выходы не перезаписываются. Решение о whitespace-only alignment/точной цитате и его ограничения описаны в [OCR_EVALUATION](docs/OCR_EVALUATION.md); это оценка диагностики, не semantic/legal verdict и не новый порог приёмки.

**Пути:** scripts/evaluation_fields.py, evaluate_ocr.py, evaluate_publications.py, test_evaluation_fields.py, test_evaluate_ocr.py; backend/tests/test_publication_evaluation.py; data/evaluation/ru-kz-fields-v2.json; .github/workflows/ci.yml; OCR_EVALUATION/AI_REQUIREMENTS_AUDIT/REMAINING_CHECKLIST, README/CHANGELOG/этот статус. Нет новых dependencies, миграций/изменения API. Production extraction/OCR/worker, риск/ручные решения и frontend source/CSS/tests не менялись; `git diff --name-only HEAD -- frontend backend/app/extraction.py backend/app/ocr.py backend/app/worker.py` пуст. Исходный ru-kz-v1.json совпадает с HEAD (Git blob d1281d931b76ad66f3b91c50a0eb44fe66993bde).

**Фактические проверки:** из корня `.venv/Scripts/python.exe -X utf8 -m unittest discover -s scripts -p 'test_*.py' -v` — **69tests,68passed/1skipped,0.261s** (Windows symlink privileges; `.local/field-tool-tests-final.log`). Из backend `../.venv/Scripts/python.exe -X utf8 -m pytest -q tests/test_publication_evaluation.py tests/test_extraction_payments.py tests/test_extraction_names.py` — **148passed/0.54s**. Ruff check + format --check шести изменённых Python файлов PASS. Новые проверки покрывают v1/null, v2/frozen reference, неправильные деньги/quote/offsets, неверную фразу, дубли, failures FN, Decimal, OCR prefix/whitespace/substitution и неизменность predictions при смене labels. Полный backend/браузер/build/удалённый CI не запускались: product code не менялся; CI workflow подготовлен локально.

**Наблюдаемые результаты:** новый authored synthetic14cases (12readable,6RU/6KZ,8positive/4negative;2unreadable) — image/text money11TP/0FP/0FN, percent4/2/0, payment_value8/4/2; strict image payment_binding5/7/5, text8/4/2. Document payment8TP/2FP/0FN/2TN; all12/12coverage, rawfragment23/23валидны, errors=[], inputs_changed=[]. Найдены два банковских FP и два mixed money+percent с потерей money; KZ strict fragments чувствительны к ошибкам символов/пунктуации OCR (KZ binding1TP/5FP/4FN против RU4/2/1). Labels не менялись под результат, правила не исправлялись. Агентская разметка требует human/KZ проверки;14cases не выполняют прежний30caseпротокол, `acceptance_established=false`.

**Сохранённые прогоны:** `output/evaluation/fields-v2-20261017/configured-run` exit0; прежний36casev1 — `output/evaluation/fields-v1-compat-20261017/configured-run`, `--require-targets` exit0, payment16/0/0/16, image top3 24/24,1/8unknown falsecandidate, structured scores=null. Native CER128/6311≈2.03% против исторического Docker157/6311 не является улучшением алгоритма: runtime иной. Внешние12HTMLv1 также12/12,TN12/FP0,nullfields, `.local/publication-quality/fresh-2026-10-17/fields-v1-compat-20261017.json` exit0. Прежние baseline/manifest/labels/reports сохранены; новые directories исключены из Git.

**Финальная самопроверка:** UTF-8 шести документов/135локальных ссылок PASS, missing0; YAML workflow parse PASS; source hashes обоих финальных OCR reports совпадают с текущими файлами, исторический rules1.5 report остался schema1. Ограниченный secret-signature scan8изменённых source/test/data/CI файлов —0совпадений (не полный security audit). `git diff --check` PASS. Независимый read-only review scorer/integrations/labels и соответствия docs реальным JSON не нашёл существенных ошибок; value-only TP нигде не объявлен доказательством binding или реальной приёмки. Новая архитектура/провайдер/ADR не требовались: protocol tradeoffs записаны в существующем OCR_EVALUATION.

**Стенд/сбои:** Docker daemon недоступен, БД/сервисы не запускались. Использован установленный Tesseract5.4 native Windows, Arial и отдельные `.local/field-evaluation-tessdata` rus/kaz/eng из официального tessdata_fast commit87416418657359cb625c412a48b6e1d6d41c29bd (SHA в report), configs/tsv из установленного Tesseract. .env/настройки приложения не менялись. Первый preflight не декодировал кириллический путь при PythonUTF8: исправлено чтение native metadata в системной кодировке, добавлен regression test. Следующий первый сохранённый OCR run имел14ошибок OCR_OUTPUT_LIMIT из-за отсутствия configs/tsv в отдельном каталоге моделей; config добавлен только в локальный стенд. Ошибочные отчёты/логи `field-evaluation-{v1,v2}*.log` и directories `run` сохранены, успешные результаты записаны в новые configured-run.

**Следующий точный шаг:** отдельным связным блоком разобрать измеренные банковские FP и mixed money+percent, добавить предметные regressions и версию новых анализов, сохраняя ручные решения/историю; затем новые разрешённые positive/negative RU/KZ изображения и замороженная независимая человеческая разметка. KZ/fragment boundaries проверить человеком, не ослаблять метрики ради зелёного отчёта. Коммерческий C-01, REAL-реестр и внешняя приёмка не закрыты. Frontend подключается своим исполнителем; перед любой будущей публикацией повторно проверить remote SHA и пересечения.

## ИИ: сверка с исходным ТЗ · 17.10.2026

**AUDIT COMPLETE / QUALITY ACCEPTANCE OPEN.** Пользователь попросил пройти ИИ-функционал по ТЗ, пока frontend в работе. Перечитаны исходный PDF кейса (6стр, SHA `14335e6be4f866722d6c741888e1bafcb2fd01fc7f75150d611aa415053ce6da`, релевантные страницы2–6, стр4 отрендерена/визуально проверена), CODEX_TZ, актуальные pipeline/контракты, evaluators и сохранённые JSON. Исполнитель root; read-only помощник независимо проверил реализацию/quality gaps, ничего не редактировал. Программный код, frontend, API, модели, БД и runtime не менялись; прежний dirty queue/compare/UX сохранён, HEAD `f9db50bbed7e8ba1f2897a5d5151d47cef332216`. Commit/push/deploy не выполнялись.

**Вывод:** O §6 требует хотя бы один содержательный AI-сценарий на новых данных с фрагментом/гипотезой/ручным решением; OCR+анализ явно приведён как пример. C §1.4 допускает rules и относит LLM кP1. Текущее ядро Tesseract RU/KZ→rules1.5→RapidFuzz→review реализовано; это не LLM/универсальный NER. PROPERTY_NAME/PAYMENT_TERM/AMOUNT/STAGE создаются, COMPLETION_DATE/LEGAL_DOCUMENT только предусмотрены DTO; адрес/БИН/готовность автоматически не извлекаются. confidence=null допустим при честной маркировке, similarity не вероятность. Recovery при полном пропуске PAYMENT_TERM ограничен существующим guard; вопрос ручного создания остаётся отдельным продуктовым решением.

**Документ:** [AI_REQUIREMENTS_AUDIT](docs/AI_REQUIREMENTS_AUDIT.md) — матрица O/C→код/тесты→реальные ограничения, качество, разделение обязательного/P1 и точный следующий блок. Сохранённый rules1.5 synthetic report совпадает с текущими4source SHA: payment100%/100%, image top3 24/24, CER≈2,49%,1/8unknown false candidate — изученный regression. Внешний HTML12/12, FP0/TN12, все отрицательные; precision/recall/top3=null, human/KZ/realpositive/image acceptance не установлена. Evaluators пока не измеряют все суммы/валюты/проценты и связь с точным условием. В этой сессии `pytest -q tests/test_extraction_payments.py tests/test_extraction_names.py` — **121passed/0.16s**; новый OCR/E2E/benchmark не запускался, прежний backend-pass не выдаётся за accuracy.

**Следующий конкретный блок предложен:** расширить существующее offline evaluation до amount/currency/percent и привязки к PAYMENT_TERM/фрагменту с новой версией labels/report, не переписывая старые baselines. Затем разрешённые positive/negative RU/KZ изображения с замороженной человеческой разметкой и новый holdout. LLM/семантические поля — отдельный P1 по измеренной необходимости. Фронтенд не менять, публикацию ждать; C-01/реальный реестр/внешняя предметная приёмка не закрыты.

**Самопроверка аудита:** UTF-8 двух изменённых документов и35локальных ссылок PASS, missing0; `git diff --check` PASS. Независимый финальный review не нашёл существенных ошибок/завышенных заявлений. Исходные PDF/DOCX/TZ и файлы кода не менялись этим аудитом. Приватный rendered source — ignored `.local/ai-requirements-audit/case-page-4.png`.

## Backend: сравнение сохранённых публикаций · 17.10.2026

**IMPLEMENTED / BACKEND INTERNALLY VERIFIED.** Пользователь поручил проверить frontend на GitHub, затем уточнил: фронтенд пока локальный, ждать публикации и продолжать независимую работу; последнее steering — «нужно продолжить работу». Начатый compare-блок завершён без frontend source/CSS/test изменений и без commit/push/deploy. Ветка main, HEAD `f9db50bbed7e8ba1f2897a5d5151d47cef332216`. Ранее изменённые UX-документы/queue-блок сохранены. Исполнитель root, read-only помощник независимо проверил семантику/контракт, финальных blockers не нашёл.

**GitHub-проверка перед продолжением:** fetch/ls-remote показали origin/main `e993dc855da00fd5d65c980caeb53ba139d4ce92`, только main; PR-search не вернул PR. Локальный HEAD на один checkpoint впереди,126файлов frontend/backend/docs; его публикация не равна публикации одного queue/compare-блока. Пользователь запретил публикацию до появления frontend. Remote/local UI consumers статически совместимы с очередью, но пока её не вызывают. Это snapshot проверки, не обещание неизменности remote; перед будущей публикацией повторить fetch/diff и интеграционные проверки.

**Результат:** `GET /api/v1/advertisements/compare`, контракт **0.13.0-mvp**. Два явно выбранных original_text либо исторических extraction.analysis_text, provenance/даты/revisions/source Asset и SHA выбранного DB-текста, exact line diff с сохранением RU/KZ/emoji/LF/CRLF. Отдельный TEXT_UNAVAILABLE; no implicit OCR/last-version fallback; проверка DEMO/REAL и принадлежности версии/исходника. Предел100000символов/1000строк на сторону проверяется до equality, без обрезки. Нет внешней сети, записи в БД/аудит, нового entity matching/дублей/риска/сигнала/Telegram. [Контракт подключения/ограничения](docs/FEATURE_PUBLICATION_COMPARISON.md), [ADR-013](docs/decisions/ADR-013-bounded-saved-text-comparison.md).

**Пути:** backend/app/publication_comparison.py, analysis_dto.py, api/advertisements.py, tests/test_publication_comparison.py, tests/test_contract.py, contracts/openapi.yaml; FEATURE_PUBLICATION_COMPARISON/ADR-013, README/ARCHITECTURE/REQUIREMENTS/REMAINING_CHECKLIST/CHANGELOG и статус. Нет миграций/новых dependencies. Текстовые лимиты не ограничивают всю историю Assets; SHA DB-текста не заявлен проверкой текущего файла в storage. Изображения/PDF/семантические кластеры и frontend — отдельные блоки.

**Финальные проверки:** из backend `../.venv/Scripts/python.exe -X utf8 -m pytest -q -rs` — **781 passed /18 skipped /216.10s**. Пропуски относятся к Linux resource limits/Pango и перечислены в `.local/comparison-full-final.log`. Целевой `pytest -q -rs tests/test_publication_comparison.py tests/test_review_queue.py tests/test_contract.py` — **72 passed /46.18s**, включая33comparison cases. Ruff check/format backend/app+tests+alembic PASS,85files. Старые41paths/105schemas структурно неизменны, только2новых paths и6schemas (queue+compare); AST-сравнение5старых advertisement handlers —0изменений. UTF-8 девяти документов/141локальная ссылка PASS; дополнительно status+comparison-doc links32/0missing, diff --check PASS. Ограниченный secret-signature scan8source/contract файлов —0совпадений, не полный security audit. Frontend source diff относительно HEAD пуст, browser E2E/production runtime/нагрузка большого набора не запускались.

Первый focused дал68passed/4errors из-за гигантских параметрических test IDs, переполнивших Windows env32767; product API не вызывался для этих4setup/teardown errors. IDs исправлены на короткие без изменения boundary assertions, добавлены2source-asset regression cases. Итоговые focused/full выше прошли. Один локальный stdlib smoke на1000чередующихся строках занял0.053s; это не нагрузочная приёмка API/Asset history.

**Стенд и следующий шаг:** отдельный native PostgreSQL18 кластер127.0.0.1:55617 повторно запущен из retained ignored `.local/review-queue-20261017-pg` с UTC; рабочая PostgreSQL-служба/БД/volumes не менялись. Tests использовали случайные schemas/rollback. После проверок собственный кластер штатно остановлен; retained ignored файлы/логи `.local/comparison-*.log` сохранены, посторонняя PostgreSQL-служба осталась Running. Следующий шаг — frontend-исполнителю отдельно подключить оба API и проверить browser transitions. Публикация остаётся запрещена; после появления frontend повторно проверить SHA/пересечения. Внешний рекламный доступ, RU/KZ holdout, REAL-реестр, второйПК/предметная приёмка остаются открыты.

## Backend: точная очередь нерешённых действий · 17.10.2026

**IMPLEMENTED / BACKEND INTERNALLY VERIFIED.** Пользователь согласовал следующий независимый backend-блок («окей гоу») при параллельной frontend-работе. Вход: main, HEAD `f9db50bbed7e8ba1f2897a5d5151d47cef332216`, сохранены семь ранее изменённых документов UX/status. Исполнитель root; отдельное основание read-only помощника — независимая проверка бизнес-семантики/регрессий очереди без конкурирующих правок файлов. Помощник не менял файлы и не запускал сервисы; финальных blockers не нашёл. Commit/push/deploy этим блоком не выполнялись.

**Результат:** новый `GET /api/v1/advertisements/review-queue`, контракт **0.12.0-mvp**. Для последних extraction READY_FOR_REVIEW/REVIEWED возвращает REVIEW_HYPOTHESES / REVIEW_MATCH / CREATE_PAYMENT_EVIDENCE / REVIEW_R2, IDs/revisions, конкретные targets, фильтры и точные totals до pagination. Один достаточный payment evidence завершает соответствующую часть после свежего ручного R2; отрицательная исправленная бронь не требует невыполнимого evidence. Связанный исторический PENDING R2 остаётся задачей после исправления текста/привязки. Свежесть terminal R2 проверяется по аудитам гипотезы и значимой привязки, включая ранее REJECTED. GET не меняет status, риск, решения, сигнал/PDF, audit и Telegram. Нулевой остаток не означает human/source/legal acceptance.

**Пути:** backend/app/review_queue.py, api/advertisements.py, analysis_dto.py, tests/test_review_queue.py, tests/test_contract.py; contracts/openapi.yaml; FEATURE_REVIEW_QUEUE/ADR-012, README/ARCHITECTURE/REQUIREMENTS/REMAINING_CHECKLIST/CHANGELOG и этот статус. Frontend source/CSS/его тесты и чужие UX-документы этим backend-блоком не изменялись. Миграций/dependencies/нового внешнего доступа нет. [Контракт подключения и границы](docs/FEATURE_REVIEW_QUEUE.md).

**Финальные проверки:** из backend `../.venv/Scripts/python.exe -X utf8 -m pytest -q -rs` — **748 passed /18 skipped /202.69s**. Пропуски Linux resource limits/Pango перечислены в логе. После добавления live-response contract assertion целевой `pytest -q -rs tests/test_review_queue.py tests/test_contract.py tests/test_dashboard.py` — **48 passed /37.71s**, включая37новых queue tests. Ruff check/format всего backend/app+tests — PASS (74 files); UTF-8 семи изменённых feature-документов и134локальные ссылки — PASS, missing0; diff --check PASS. Ограниченный secret-signature scan6source/contract файлов —0совпадений, не полный security audit.

Первый focused42pass/29.69s и expanded37queuepass предшествовали окончательным регрессиям. Первоначальный full: **740 passed /2 failed /18 skipped /198.18s**. Две исходные проверки provenance/registry падали из-за собственного нового PostgreSQL-кластера, сериализовавшего timestamptz как +05:00 вместо Z. Настроен UTC только у disposable кластера, production/config приложения не менялись; итоговый полный прогон выше прошёл. Приложение не объявляется проверенным с произвольным DB timezone на основании этой настройки тестового стенда.

**Стенд:** Docker daemon недоступен; использованы установленные PostgreSQL18 binaries для собственного loopback-кластера на127.0.0.1:55617 в ignored `.local/review-queue-20261017-pg`, отдельные случайные test schemas и rollback/savepoints. После тестов кластер штатно остановлен. Комбинированная команда stop/remove была отклонена автоматической проверкой (`blocked by policy`, без уточнения причины); выполнена только отдельная остановка, ignored файлы сохранены. Посторонняя PostgreSQL-служба осталась Running; рабочая БД/volumes не менялись. Логи — ignored `.local/review-queue-{focused,expanded,full,full-final,focused-final}.log`. Linux PDF/resource/Pango, браузерный E2E и production runtime этим backend-блоком не проверены.

**Следующий шаг:** frontend-исполнителю подключить новый endpoint вместо подмены READY total числом решений и проверить переходы/ошибки/фильтры; пока существующий экран и dashboard сами не переключаются. Стоимость расчёта зависит от всего filtered набора/history (batch, без N+1; OCR/text не загружаются для подсчёта); нагрузочная проверка большого реестра остаётся перед пилотом. C-01/внешний RU/KZ holdout/реестровый доступ/второй ПК/предметная приёмка не закрыты этим изменением.

## Повторный аудит и продолжение контекста · 17.10.2026

**AUDIT COMPLETE / следующая реализация предложена к утверждению.** По новому запросу перечитано повторно приложенное Kompra ТЗ: его SHA совпадает с исходным. На входе `main`, HEAD **f9db50bbed7e8ba1f2897a5d5151d47cef332216**, clean tree. S0–S2 уже реализованы; стартовая команда ТЗ снова ограничивает текущую работу фазами0–1. Исполнитель Codex root, без новых субагентов. Новый commit/push/deploy не выполнялся; прежнее разрешение на checkpoint завершено предыдущим коммитом.

**Подтверждённые находки:** причина R4 теряется при досье→реестр→то же досье, без предупреждения; защита S0 относится только к review. READY total отражает обработку, а не точный остаток решений: новый материал после signal/PDF остаётся READY_FOR_REVIEW. В досье действия/история зависят от общего режима; подробная страница8483px на текущих данных. В «Сверке» кандидаты начинаются на y1325 при viewport1000, после источников. Picker привязки всё ещё first100. Полная матрица с файлами/доказательствами — верхний [UI_AUDIT](docs/UI_AUDIT.md).

**Свежие проверки:** `npm run typecheck`, `npm run lint`, `npm run format:check` PASS; из backend `../.venv/Scripts/python.exe -X utf8 -m pytest -q -rs` с APP_ORIGIN localhost3000 и тестовыми cookie-настройками процесса — **711passed,18skipped,266.23s** (случайная test schema, skips Linux limits/Pango). Production3107 `SAQ_E2E_BASE_URL=http://localhost:3107 npm run test:e2e`: первый прогон72pass/1fail, повтор73pass2.2m. Первый тест R4 ожидает score0, но предыдущий critical path оставил R2=25; test-isolation gap не исправлен и не скрывается успешным повтором. Повтор сделан после штатных cleanup остальных тестов, без reset seed/volumes.

**Новый критический путь:** text→analysis→fragment→human hypothesis→match→evidence→R2→досье→CONFIRMED signal v14→PDF43763bytes PASS; snapshot содержит новый original asset/R2, безCONFIRMEDR1. Новый PDF постранично визуально не проверялся. Production build не повторяли: приложение не менялось, используется успешная сборка предыдущего блока той же ревизии; свежий E2E проверяет её. Свежая ручная проверка досье/реестра/сверки и375/1440; предыдущие112responsive наблюдений не выдаются за новый прогон. Настоящий200%zoom/screenreader/внешняя приёмка остаются OPEN.

**Референсы:** в live browser повторно проверены публичные Kompra services/advanced search; официальные материалы карточки/профиля/источников прочитаны с датами и маркировкой DOCUMENTED. Закрытые экраны не реконструировались. Снимки/JSON/PDF — ignored `output/ux-followup-2026-10-17/`, логи — `.local/ux-followup-2026-10-17/`. Сохраняется local preview3107 и отдельный DEMO Compose из предыдущего блока; рабочая версия3000 и её данные не пересоздавались.

**Изменены только документы:** PROJECT_STATUS, UI_AUDIT, UI_IMPLEMENTATION_PLAN, DESIGN_SYSTEM, UX_GUIDELINES, UI_COMPONENTS, UX_UI_SPEC. Исправлены устаревшие текущие описания3/6пунктов/будущихbreadcrumbs/отсутствующего URL-import; история предыдущих решений сохранена. Палитра/master1.3/API/источники приложения не менялись. Рекомендуемый следующий блок **B0+B1**: сохранность форм досье, независимый от общего нуля R4-тест, точная подпись READY queue (2.5–5.5ч разработки +25%резерв, стабилизация отдельно). Затем отдельно выбрать S3-досье или группировку сверки; не брать всё сразу. До21.10 остаются также C-01/внешнийOCR/второйПК/UX/предметная приёмка. Полный acceptance не заявлен.

**Самопроверка документации:** все7 изменённых Markdown читаются как UTF-8;62локальные ссылки существуют; `git diff --check` PASS. `git diff --name-only` подтверждает отсутствие application/test/config изменений. Новых source файлов нет. Локальная документация остаётся незакоммиченной для просмотра; точный следующий шаг — решение пользователя по B0+B1 из контрольной точки B.

## Утверждённый UX-пакет S0–S2 завершён · 17.10.2026

**IMPLEMENTED / INTERNALLY VERIFIED.** После аудита пользователь разрешил начало («окей гоу начинаем»), затем попросил завершить работу из-за лимита и сделать локальный commit. Реализован только согласованный S0–S2; масштабная перегруппировка досье S3 и optional S4 не начинались. Исторические отметки «ожидает утверждения» ниже относятся к предыдущей контрольной точке.

**Изменено:** пять постоянных зон в обоих видах, зелёная навигация, breadcrumbs и вложенная «Сверка»; компактный рабочий обзор с четырьмя очередями по реальным серверным totals и отдельными состояниями отказа. Review использует серверную пагинацию status/page/page_size, явный выбор материала и устойчивую прямую ссылку; оригинал показывает источник, URL и даты публикации/получения. Сохранение причин, гипотез, OCR-правок и R2 разделено по пользователю/вкладке/материалу/версии. Черновики восстанавливаются при переходах и reload через sessionStorage; logout/401 очищают namespace, недоступное storage даёт явный memory-only fallback. Срок 12 часов проверяется при восстановлении, не фоновым удалением. Файлы и исходный OCR автоматически не сохраняются; изменённый пользователем текст хранится в пределах вкладки. Автоматических решений нет, повторы команд сохраняют idempotency key; конфликт 409 не удаляет ввод.

**Границы:** backend, OpenAPI, роли, риск, рабочая БД и опубликованный runtime этим UX-пакетом не менялись. Досье и остальные существующие возможности сохранены; перегруппировка шести инструментов внутри `/monitoring` остаётся следующим отдельным срезом. Picker объекта в review по-прежнему ограничен первыми 100, ограничение раскрыто в UI. Legacy CSS/крупные компоненты не переписывались.

**Фактическая валидация окончательного source:**

- Frontend: `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm run build` — PASS. Backend Ruff check/format — PASS.
- Backend: `../.venv/Scripts/python.exe -X utf8 -m pytest -q -rs` из `backend` — **711 passed, 18 skipped, 277.41s**. Skips относятся к Windows/Linux resource limits/Pango. Tooling unittest — **37 tests, OK (skipped=1)**.
- Production frontend + изолированный API/worker/PostgreSQL: `SAQ_E2E_BASE_URL=http://localhost:3107 npm run test:e2e` — **73 passed, 2.3m**. В первом production прогоне 71/73: два новых теста имели неоднозначный alert locator из-за Next route announcer; исправлена область locator до `main`, итоговый полный прогон зелёный. Предварительный dev-прогон не используется как доказательство приёмки.
- OCR smoke `scripts/verify_ocr.py` на двух новых RU/KZ synthetic изображениях — PASS; реальные worker/download/bbox и отдельные PENDING payment clauses. Это не внешний holdout и не экспертная оценка качества.
- Отдельный контрольный UI-проход: новая публикация → анализ → фрагмент → ручная гипотеза → match → evidence → R2 → досье → **CONFIRMED signal v7 → PDF 41238 bytes**, PASS. Snapshot содержит новый original asset и R2, без CONFIRMED R1. Предыдущие исторические сигналы не переписывались.
- **112 автоматических наблюдений**: 8 маршрутов × 2 вида × 7 ширин (360/375/390/768/1024/1440/1920), page overflow **0**, page errors **0**. Лично визуально просмотрены desktop обзор/review и mobile review/досье. Keyboard/reduced-motion и viewer входят в E2E. Реальный 200% zoom, screenreader и внешняя UX-приёмка остаются OPEN.

**Документация/исполнители:** root — shell/dashboard/CSS/navigation tests, проверки и документы; помощник — review/draft helper и focused regression; независимый помощник — read-only review commit scope. Обновлены DESIGN_SYSTEM (master 1.3), UX_GUIDELINES, UI_COMPONENTS, UI_IMPLEMENTATION_PLAN, UI_AUDIT, README, CHANGELOG и три устаревшие ссылки на контракт/загрузку PDF. Архитектура/API не изменены, новый ADR не требовался.

**Контрольная точка Git:** ветка `main`, родитель `e993dc855da00fd5d65c980caeb53ba139d4ce92`. Сохранены baseline 317 SHA/status/diff в ignored `.local/ux-implementation-2026-10-17/`. Локальный commit по просьбе пользователя включает согласованный UX-пакет и сохранённые ранее незакоммиченные MVP-блоки (URL import, Threads/Telegram, monitoring, open registry/history, migrations, backup/readiness); эти блоки не приписываются текущему UI-пакету. Выборочное сохранение одного frontend оставило бы отсутствующие зависимости. Commit SHA сообщается в итоговом ответе; push/deploy не выполняются.

**Финальная самопроверка:** сравнение baseline подтвердило отсутствие изменений backend/contracts этим UX-пакетом. Проверены UTF-8 документов и 127 локальных Markdown-ссылок — отсутствующих нет. Staged source: 126 файлов, известных private-key/GitHub/AWS/OpenAI/Telegram secret signatures — 0 совпадений; `.env`, `.local`, output, runtime/venv не включены. Это ограниченный signature scan, не сертификация безопасности. `git diff --cached --check` PASS после удаления одной лишней пустой строки EOF в ранее незакоммиченном документе вопросов заказчику. Read-only review не нашёл блокеров для связного локального checkpoint.

**Стенд/свидетельства:** ignored `.local/ux-implementation-2026-10-17/` — логи команд/critical path/compose; `output/ux-s0-s2-2026-10-17/` — observations/screenshots/PDF. Для просмотра оставлены локальный production frontend `http://localhost:3107` и отдельные три контейнера `saq-ux-s0-s2-20261017` (DB tmpfs, API, worker; отдельный storage; Threads/Telegram отключены). Четыре рабочих контейнера/данные/tunnel не пересоздавались. Эта локальная проверка не означает обновление публичного сайта.

**Следующий шаг:** показать сохранённый результат пользователю; S3 только отдельным утверждённым блоком при наличии времени. До защиты 21.10 приоритет — внешняя RU/KZ/UX/предметная приёмка, второй ПК/автономный запуск и стабилизация. Коммерческий C-01, разрешённый реальный реестр и внешняя OCR-оценка остаются незакрытыми; полный MVP acceptance этим checkpoint не заявлен. Новые функции остановлены по просьбе пользователя, презентация/видео не создавались.

## Фазы 0–1 Kompra-inspired UX · 17.10.2026

**AUDIT COMPLETE / IMPLEMENTATION AWAITS APPROVAL.** По приложенному ТЗ изучены текущий проект и публичный Kompra; код/CSS/API/БД приложения не менялись. Исполнитель Codex root; два помощника только читали frontend и backend/контракт. Ветка `main`, HEAD `e993dc855da00fd5d65c980caeb53ba139d4ce92`, сохранён прежний dirty блок (58 modified tracked,61 untracked entry). В ignored `.local/ux-audit-2026-10-17/` сохранены317SHA-256/status/binary diff. Commit/push/deploy не выполнялись; статус прошлых сессий ниже сохранён.

**Результат:** [UI_AUDIT](docs/UI_AUDIT.md) содержит AS-IS,5главных проблем, сравнительную матрицу Kompra→SAQ, источники/даты/OBSERVED–DOCUMENTED–INFERRED, baseline/ограничения. [UI_IMPLEMENTATION_PLAN](docs/UI_IMPLEMENTATION_PLAN.md) —5зон, композиция review/досье, Keep/Refactor/Defer, paths/ownership/API/риски/оценки/план17–21.10. В DESIGN_SYSTEM/UX_GUIDELINES добавлены явно **неутверждённые предложения**; действующий master1.2 сохранён. Предложен первый пакет S0–S2: draft safety, постоянные5зон, server-paged review/provenance,5.5–8.5ч+проверка. Более рискованный S3 досье и optional S4 реестр отдельно. Начинать после явного approval пользователя; прежние маршруты/возможности сохраняются.

**Kompra:** browser лично показал public search/advanced filters/breadcrumb/services grouping/source-unavailable banner; изучены официальный guide карточки/PDF/источников, описание monitoring и публичный screenshot профиля. Платный кабинет/настройки/настоящий PDF Kompra не проверялись, Group в browser пустой. Реальные адаптации — IA/progressive disclosure, а не перенос юридических категорий или новых сервисов.

**Свежие проверки текущего dirty source:**

- Frontend `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm run build` — PASS. Рабочий production frontend не пересоздавался; host build использован отдельно.
- Backend `../.venv/Scripts/python.exe -X utf8 -m pytest -q -rs` из backend — **711 passed,18 skipped (290.28s)**. Test-schema случайная; skips Windows/Linux resource limits/Pango, не скрытые PASS.
- E2E `SAQ_E2E_BASE_URL=http://localhost:3107 npm run test:e2e` — **64 passed (2.0m)**. Для сохранности рабочего seed создан изолированный local API/worker/PostgreSQL tmpfs/storage + production frontend. Исходники backend read-only, внешние Threads/Telegram в этом стенде выключены; рабочие четыре контейнера/данные/tunnel не менялись.
- `APP_ORIGIN=http://localhost:3107 .venv/Scripts/python.exe -X utf8 scripts/verify_ocr.py` — PASS, новые RU/KZsynthetic изображения, download bytes совпали, по2PENDINGpayment сbbox. Не external holdout/приёмка качества.
-96наблюдений:8маршрутов×2режима×6ширин360/390/768/1024/1440/1920, overflow0/pageerror0. Снимки после загрузки и JSON — ignored `output/ux-audit-2026-10-17/`. Визуально просмотрены desktop обзор/review/сверка и mobile досье; остальные снимки — автоматическая фиксация, не ручная проверка всех96. Keyboard/reduced-motion входят в64E2E; новый реальный200%zoom/screenreader/touch/люди/второйПК не проводились.
- Отдельный `critical-path.cjs` — **PASS**: новая ручная UIпубликация→анализ→fragment→human hypothesis→match→evidence→R2→досье/охват/период документа→signalCONFIRMEDv4→PDF39456bytes. Snapshot включает новый original asset/R2, score25/YELLOW, безCONFIRMEDR1. OCRкартинки проверен отдельно. PDF11страниц; extraction подтвердил DEMO/R2/disclaimer/новую формулировку и source label. Это внутренний контрольныйDEMOпроход, не внешний юридический acceptance.

**Найденный дефект:** несохранённая причина привязки пропадает при review selector A→B→A (`ReviewMaterial key={id}`, локальныйmatchReason). Воспроизведено без команд сохранения; известные64tests этот переход с draft не покрывают. Другие ключевые проблемы: скрытые mode этапы,6задач вСверке, selector100 вместо очереди, длинное досье. Исправления пока не внесены в соответствии с текущим запросом только на аудит/план. Исторический NEWcounter исправлен и проходит свежиеtests; повторно не объявлен багом.

**Изменённые файлы этого блока:** `PROJECT_STATUS.md`, `docs/UI_AUDIT.md`, `docs/UI_IMPLEMENTATION_PLAN.md`, `docs/DESIGN_SYSTEM.md`, `docs/UX_GUIDELINES.md`; локальные logs/captures/test scripts игнорируются. ADR не создавался: архитектурное решение не реализовано. Обнаружен historical drift FEATURE_SIGNALS/SUPPORTING_PDF/LEGAL_BASIS относительно актуального0.11контракта; помечен в аудите, исходные исторические документы здесь не переписаны.

**Остаётся OPEN:** approval S0–S2/пятизонной IA (это меняет согласованный16.10 simple-mode), коммерческийC-01, внешнийpositiveOCR+humanRU/KZ, реальный утверждённый реестр, человеческаяUX/предметнаяприёмка, второйПК/автономныйзапуск. До защиты21.10 рекомендуется18.10 минимальныйсрез,19.10 только при стабильности досье,20.10 стабилизация без новыхфункций. Точный cutoff/timezone организатора ещё требуется подтвердить; коммуникация от пользователя не отправлялась. Презентация/видео не создавались. **Следующий шаг — показать контрольную точкуA и дождаться утверждения; фазу2 не начинать.**

**Финальная самопроверка:** независимый read-only review уточнил `page_size≤100`, обязательные375px и конкретный S0 guard вместо обещания durable draft. Минимальный пакет с25%резервом и4–6чстабилизации — около **11–17 инженерных часов**. Пять изменённых Markdown читаются как UTF-8,48локальныхссылок существуют, scoped `git diff --check` PASS. Сравнение317начальныххешей подтвердило изменения только пяти перечисленных docs, приложение не менялось. Первый лист настоящего PDF отрендерен Poppler и визуально просмотрен; все11страниц визуально не проверялись. Локальная ProofPilot-проверка ограниченной сводки/арифметики прошла self-review; это не внешняя сертификация/Colosseum-исследование. Тестовый Compose и hostfrontend остановлены; четыре рабочих SAQконтейнера остались running (API/БДhealthy), временные browserвкладки закрыты. Логи/снимки/PDF сохранены ignored; сброс рабочейБД/seed/volumes не выполнялся.

## Короткий блок надёжности · 17.10.2026

Пользователь выделил15–18процентных пунктов лимита на быстро закрываемые задачи. Начало76%used, последнее чтение95%used: суммарный расход19пунктов, на1выше верхней границы; новые работы остановлены. Root — backup/docs/CI/build, отдельные агенты — recovery UI и readonly readiness, пути не пересекались. HEADe993dc8/прежний dirty diff сохранены, без commit/push.

**Закрыто:** URL-импорт хранит jobUUID вquery и восстанавливает GETpoll послеreload/Back/ссылки. НекорректныйID/чужойkind/ошибка чтения обрабатываются явно; новые команды только по действию аналитика. СтарыеPOST/GETответы не подменяют новуюстраницу/выбор; исходныйURL не записывается вstorage/query. Исправлен backup.KEY: поддерживает.html оригиналы с прежнимиpath/size/SHAguards; regression сначала воспроизвёл отказ. Новый stdlib scripts/check_readiness.py проверяетDocker/Linux/Compose/images/4контейнера/APIhealth+БД/storage/Tesseract/PDF/локальныйHTML безизменений/внешнихзапросов/секретов; tests9pass.

**Факты:** backup create/verify успешно: `.local/backups/20261016T221337Z-63f53e7a6c914a1795fdaca07d3a7bcf`; isolated restore24таблицы/1936audit/553Assets/66signals/42срешениями/44READY PDF. Отчёт `.local/restore-checks/20261016T221414Z-6b32eb0c52ce4ff39514d250db350def/result.json` verified=true. Первая незавершённая копия сохранена, рабочие API/worker возобновлены. Readiness `.local/readiness-20261017-final.json`:15PASS/1FAIL(local_auth_config), exit1 ожидаем: действующийHTTPSOrigin/Securecookie блокирует автономныйHTTPвход. Sharing не отключался; офлайн/второйПК не объявлены принятыми.

**Валидация:** tooling unittest37tests/1Windows skip, Ruff check/format4затронутыхscriptfiles passed. Frontend typecheck/scopedESLint/Prettier passed; productionbuild послефинальнойзащитыlatePOST и recreatefrontend с прежнимtunneloverride прошли, Healthy. Backend/БД/APIформы не менялись; полныйbackend711/18 — результат прошлогоэтапа, заново не запускался. Browser recovery tests добавлены; результат текущего прогона фиксируется отдельно, пока не объявляетсяPASS. ДокументыLOCAL_BACKUP/DEPLOYMENT/FEATURE_URL_IMPORT обновлены, readiness добавлен всуществующийCIlint; удалённыйCIне запускался. ДокументныеUTF8/210links/diffcheck прошли доэтойфинальнойфиксации.

**Итог browser:** на обновлённом публичномruntime `npx playwright test tests/open-sources.spec.ts -g 'import|job'` — **6 passed(28.0s)**. Провереныreload/Back/lateGET/invalid/404/явныйretry; прежнийsuccessсценарий повторил4ширины безoverflow и сохранилscreenshots. Новаяручнаявизуальнаяприёмка именно восстановленного состояния не выполнялась. Это уточняет предварительный статус проверки выше.

**Следующий шаг:** коммерческийC-01/positiveOCR+humanRU/KZ/реальныйреестр/UXлюдьми/второйПК остаютсяOPEN. Никакихновыхзадач воставшемсялимите.

## Завершённый этап — новый внешний baseline и rules-1.5 · 17.10.2026

По ответу пользователя «окей гоу» продолжен именно этап качества. Codex root сохранил текущую `main` от HEAD`e993dc8` и прежний dirty diff; commit/push не выполнялись. Независимый от production правил агент (fork без истории, только AGENTS/DATA_SOURCES) подготовил12новых лицензированных информационных HTML6RU/6KZ,10тем/2пары переводов,8новых явно DEMO имён. Его source/label/manifest сохранены до inference, агент правил/старых текстов/tests/predictions не читал. Второй агент проверил методику и реализовал evaluator/URL regression tests в выделенных test-файлах, не читая свежий корпус; root — production/evaluator/docs/runtime.

**Сохранённые измерения:** ignored `.local/publication-quality/fresh-2026-10-17/`. Manifest SHA`ae74d20ba7618d608279dfbc5e06b784fd575151db64a3f98564c38c80aed6ee`; labels SHA`cf68789e14e7673fe3928cc0f605ad14387e5e4bb3f9c507a8a9a9bb7c9de115`. Первый `baseline-rules-1.4.json` создан до просмотра результатов: RU4/6обработаны/TN4, KZ6/6/TN6;2RU URL_NOT_ALLOWED не превращены в true negative. После отдельной проверки robots/footer/layout добавлены только `/ru/news/press/<slug>` и `/ru/news/reviews/<slug>`; `paths-reviewed-rules-1.4.json` дал12/12, RU2FP/4TN, KZ0FP/6TN. После исправления `regression-rules-1.5.json`: RU0FP/6TN, KZ0FP/6TN; TP/FN0, precision/recall и matching top-1/top-3 null, известных targets и положительных рекламных примеров нет. Каждый запуск `run_valid=true`, inputs_changed_during_run=[]; ни один исходный отчёт/оригинал/label не перезаписан. После разбора это regression, не новый независимый holdout и не человеческая приёмка.

**Исправление/решения:** общий UNDER реагировал на отраслевые «строительство/строительных» и отключал ипотечное исключение. Новый узкий PROJECT_CONSTRUCTION в mortgage guard сохраняет явное строительство конкретного дома, название/alias, прямую оплату и платную бронь. `STAGE`, риск/R1–R6/ручные решения/matching не менялись; новые automatic/manual extraction — rules-1.5, старые данные не пересчитываются. Точечные RU-подрубрики сохраняют точный домен/HTTPS/DNS/IP/TLS/redirect/size/deadline; неизвестные/KZ-подрубрики, extra levels/query/encoding/category roots отклоняются. Новых зависимостей, API-форм, миграций или архитектуры нет; дополнительный ADR не требуется.

**Измерительный инструмент:** `scripts/evaluate_publications.py` использует snapshot manifest и pre-inference code SHA, проверяет байты перед parser и изменения manifest/оригиналов/кода после. Изменение даёт run_valid=false и ненулевой exit; ошибки parser остаются missing coverage. Output не перезаписывается до inference и защищён exclusive creation от гонки. Добавлены runtime Python/RapidFuzz, topic groups, matching top-1/top-3 по всем expected targets включая failures и no-target false-candidate rate; acceptance_established=false сохранён. CI lint расширен на этот runner; новый удалённый CI не запускался.

**Фактическая валидация:**

- Полный backend `../.venv/Scripts/python.exe -X utf8 -m pytest -q -rs` из backend — **711 passed,18 skipped (255.51s)**, лог `.local/quality-fresh-backend-final.log`. Пропуски — прежние Linux resource limits/Pango. После уточнения положительных fixtures с настоящим контекстом займа отдельно `pytest -q tests/test_extraction_payments.py tests/test_extraction_names.py tests/test_publication_evaluation.py` — **144 passed (0.38s)**.23evaluator tests включают сохранность baseline при гонке, mutation, знаменатели и переводные группы. URL policy/parser:22pure tests и3DB-сценария в полном прогоне.
- Backend Ruff check и format81files passed; runner Ruff check/format с `--config backend/pyproject.toml` passed. `python -m unittest discover -s scripts -p 'test_*.py' -q` — **27tests, OK/1skip** (26executed); ожидаемое сообщение `ru-01: failed(ValueError)` относится к проверяемому failure-case и не является ошибкой suite.
- Старый неизменный36-case synthetic OCR regression в изолированном Docker `--network none --read-only --cap-drop ALL`, без env/БД/storage: payment16TP/0FP/0FN/16TN, precision/recall100%, image matching24/24, CER157/6311, errors=[], inputs_changed_during_run=[], `--require-targets` exit0. Evidence `output/evaluation/rules-1.5-20261017/run`, лог `.local/quality-fresh-synthetic.log`. Это проверка отсутствия регрессии на изученном synthetic, не настоящая реклама.
- `docker compose build api worker` и recreate толькоapi/worker с прежним `.local/tunnel/compose.json` прошли, оба Healthy. Миграций/пересоздания БД/изменений frontend нет. Публичный HTTPS smoke `.local/verify_publication_quality.py`: два настоящих новых RU-path импорта, originals24919/2364textchars, SHA/private attachment/дедуп, отсутствующий автоматический анализ, затем явный rules-1.5/0PAYMENT, risk_unchanged=true/Secure cookies. Отчёт `.local/publication-quality-runtime.json`. Прежняя ссылка и frontend сохранены. Browser/UI/build frontend заново не запускались: слой представления не менялся.
- OpenAPI0.11.0-mvp JSON разобран,49операций сохранены; уточнены разрешённые формы URL. README/CHANGELOG/OCR_EVALUATION/DATA_SOURCES/FEATURE_URL_IMPORT/REMAINING_CHECKLIST и этот статус обновлены; UTF8/локальные links/diff проверены при завершении. Приватные corpus/reports/runtime script и synthetic output игнорируются Git/Docker. Секреты/внешние сообщения/Oracle/Render не затрагивались.

Финальная проверка документов:19Markdown прочитаны какUTF8,210локальных ссылок — missing=[], fences сбалансированы; `git -c core.safecrlf=false diff --check` passed. Предшествующий пользовательский diff сохранён;114dirty/untracked путей в общем checkout не объявляются изменениями только этого этапа.

**Открыто / точный следующий шаг:** получить один разрешённый настоящий положительный рекламный RU/KZ-набор с оригинальными изображениями и независимой человеческой предметной/KZ-разметкой, заморозить новый holdout до просмотра и измерить пропуски/ложные совпадения/OCR. В текущем12-case наборе только информационные отрицательные материалы одного издателя; 0FP не доказывает recall и не закрывает коммерческий C-01/внешнюю приёмку. Учебный8-name каталог не измеряет полноту реестра. Регулярный сбор, закрытый реестр/автоматическая применимость, UXлюдьми и второй ПК остаются OPEN. Улучшение достигнуто без новой AI-модели; источник позитивных материалов остаётся конкретной границей следующей приёмки.

## Завершённый этап — открытые источники, качество RU/KZ и следующий шаг · 17.10.2026

Пользователь поручил поэтапно закрывать импорт, реальное качество, временные открытые реестры и понятность досье; на вопрос об источнике ответил «Пока нет — продолжай с открытыми публикациями». Реализованы: разрешённый Primeminister.kz (CC BY 4.0) через защищённый URL transport → существующая leased queue → неизменный HTML/SHA + извлечённый текст/атрибуция → отдельный ручной анализ; операторский импорт PDF КЖК → версии/дата среза/поиск по страницам; сводка четырёх вопросов в досье. Коммерческий C-01/расписание/независимый holdout остаются открыты; сведения КЖК не превращаются в ACTIVE/R1/полноту.

Предыдущий запуск прервался до runtime-проверки/docs. Codex root продолжил текущий dirty checkout HEAD e993dc8 без reset/commit/push. Исследования источников, модуль реестра и offline evaluation выполнены агентами с раздельными путями; последняя проверка root: 168 passed/1 Windows skip (URL import, registry, publication evaluation, extraction, contract). rules-1.4 устраняет ипотечные отрицательные примеры и сохраняет явные требования/платную бронь/названия объектов; повторная оценка 1 RU + 1 KZ: FP0/TN1 на язык, precision/recall undefined, это уже regression, не независимый holdout и не OCR. Дата без timezone остаётся null.

**Runtime VERIFIED:** Docker build/recreate api/worker/frontend с прежним HTTPS origin прошли, аддитивные миграции применены. Реальная `.local/verify_open_sources.py` по публичному HTTPS:2RU/KZ публикации (1956/2161символов), оригинальные HTML/SHA/private attachment, повторные jobs вернули те же объявления, отдельный анализ rules-1.4 не создал PAYMENT_TERM; реальный PDF КЖК12стр/02.10.2026, SHA/скачивание/дедуп/page6ASYLYM/no-match, risk_unchanged=true, Secure cookies. Отчёт `.local/open-sources-runtime.json`. Первый PDF smoke выявил proxy413 из-за общего JSON лимита500KB, исправлен точный multipart path5MiB и добавлен настоящий600KB malformed regression (415). Источники/оригиналы/отчёты private ignored.

**Backend окончательный:** полный `pytest -q -rs` — **670 passed,18 skipped (226.62s)**; пропуски Linux/Pango явно перечислены, новая реестровая обработка отдельно прошла реальный Linux API. Предыдущий полный668pass/2fail/18skip выявил зависимость двух новых worker tests от оставшихся чужих queuedjobs в общей disposable-schema; исправлена изоляция приоритета именно их jobs, production queue не менялась. Ruff check/format81files passed. Контракт0.11.0-mvp валиден,49операций:48реализованы/1частична; существующий Threads статус означает реализацию preview, не live-доступ. `docker compose run --rm --no-deps api alembic check` с итоговым образом — No new upgrade operations detected; отдельная регистрация модели в Alembic metadata добавлена явно.

**Frontend:** typecheck/lint/format passed. Полный `SAQ_E2E_BASE_URL=<публичный origin> npm run test:e2e` — **59 passed/1 failed (9.1m)**: единственный отказ `release is not a function` в прежнем Threads fixture — busy появлялся до окончания настоящего CSRF GET и входа в mocked search handler. Тест ждёт handler через expect.poll, код Threads не менялся. После финальных CSS/mobile/topbar/пояснения real-vs-DEMO правок выполнены build/recreate и `npx playwright test tests/open-sources.spec.ts tests/threads-search.spec.ts` — **9 passed (38.8s)**, включая этот отказ и все5новых сценариев. Все60сценариев получили успешный результат в этих прогонах; полного60/60на последней косметической версии не заявляем.

**Визуально:**12проверок375/768/1024/1440 без page overflow повторены на финальной версии, screenshots `output/open-sources/`; просмотрены import1440/375, registry375, dossier375 до/после mobile dl. Реальный in-app browser в отдельной вкладке показал сохранённый PDF02.10.2026 и ASYLYM/page6 с границами. Пользовательская вкладка/введённая фраза не перезагружались. Общая метка уточнена для REAL/DEMO; новый screen-reader/200%zoom/UXлюдьми не выполнялись.

**Файлы/решения:** backend URL import/API/worker/storage/job input, отдельный open_registry/API/model/миграция и Alembic metadata; rules-1.4 и evaluator; frontend import/open-registry/dossier/proxy5MiB, E2E origin helper/tests. Контракт0.11.0-mvp, README/CHANGELOG, FEATURE_URL_IMPORT/FEATURE_OPEN_REGISTRY/DATA_SOURCES/OCR_EVALUATION/ARCHITECTURE/UX/UI/checklist/PLAN/REQUIREMENTS/DEPLOYMENT и ADR-011 обновлены.19Markdown UTF8/207локальныхссылокmissing0, git diff --check passed; новых dependencies и секретов нет, приватные artifacts исключены Git/Docker context. Финальный self-review исправил чрезмерный mortgage filter (сохранены известные названия/строительство/императивы) и повторное использование UI idempotency key после terminal.

Перед миграцией создана приватная копия `.local/backups/20261016T213042Z-a2480db07bf5400584bb0b7300c114da`; это создание, не новая проверка восстановления. Текущая ревизия БД c81d0e5f3472(head), `alembic check` — No new upgrade operations detected. Реестр PDF: источник khc.kz, состояние02.10.2026,12стр,883125bytes; header56 против54нумерованных строк, поэтому полноту не утверждать. Оригинал приватный `.local/open-registry/khc-2026-10-02.pdf`.

**Открыто / точный следующий этап:** получить разрешённые положительные рекламные материалы и новые независимые RU/KZ примеры с человеческой разметкой, затем измерить FN/FP/precision/recall и OCR. Два изученных отрицательных HTML-примера не закрывают эту приёмку. Регулярный сбор/коммерческие площадки, реальная автоматическая сверка по очереди/адресу/дате, внешний UX/domain review и второй ПК остаются OPEN. Приложение обновлено на прежней временной ссылке; новых аккаунтов/внешних сообщений/Oracle/Render/GitHub push не было. HEAD e993dc8+сохранённый dirty diff, без commit; все прежние изменения сохранены.

## Восстановление временной ссылки · 17.10.2026

Текущий адрес: https://stamp-whose-proceeds-budgets.trycloudflare.com. Прежний implications-real-deutschland-being больше не работает: DNS отсутствует, cloudflared сообщал Unauthorized: Tunnel not found после сетевого разрыва, хотя процесс был жив. Выполнены Stop и Start helper, локальная конфигурация восстановлена и затем переключена на новый HTTPS origin. Исправлена гонка чтения пустого log в PowerShell: regex вызывается только при наличии содержимого. Реальный Start после исправления прошёл, API healthy; БД/worker/frontend не перезапускались.

Повторная публичная проверка: login page 200, anonymous registry 401, login 200, registry 200/8 объектов, Secure cookies, invalid origin 403, logout 204. Доказательство обновлено в `.local/tunnel/verification.json`. Stop/Start теперь проверены фактически. Старые URL и проверки ниже — история. Full OCR/PDF и доступ с другого устройства отдельно не проверялись. Пользователь продолжает работу через новую HTTPS-ссылку; пароль в `.local/credentials.txt`, новых аккаунтов нет.

## Завершённый блок — временная публичная ссылка, 16.10.2026

По прямому выбору пользователя запущен Cloudflare Quick Tunnel: https://implications-real-deutschland-being.trycloudflare.com. API использует этот origin и Secure cookies через игнорируемый `.local/tunnel/compose.json`; приватная env сохранена. Пересоздан только API, healthy. БД/worker/frontend и Oracle/Render не изменялись. Auth/CSRF сохранены, новых аккаунтов нет.

Публичная проверка: /login 200, anonymous registry 401, login 200, authenticated registry 200 (8 объектов), Secure cookies, invalid origin 403, logout 204. Форма входа видна в браузере. Доказательство без секретов — `.local/tunnel/verification.json`. Добавлен `scripts/share_site.ps1` Start/Status/Stop; Status и повторный Start проверены без дублирования процесса. Stop/restart не выполнялись. README/DEPLOYMENT обновлены. Полный OCR/PDF по туннелю не повторялся; предыдущие 55 browser tests относятся к локальной сборке. Codex root, HEAD e993dc855da00fd5d65c980caeb53ba139d4ce92, без commit/push.

Ограничения: нужны включённые ПК/Docker/интернет/cloudflared, после перезапуска новый адрес. Во время sharing команды через localhost отклоняются по Origin; Stop восстанавливает локальный API. Следующий шаг — при необходимости отдельный viewer и проверка с другого устройства. Пароли не публиковались. Поиск постоянного хостинга ниже сохранён как история.

## В работе — публичное размещение, 16.10.2026

Пользователь разрешил публикацию и сообщил о наличии Render и Oracle; Oracle выбран для проверки существующей инфраструктуры, без создания платных ресурсов. Подготовлены `docker-compose.public.yml` (HTTPS origin/Secure cookies/restart, frontend остаётся loopback) и `docs/DEPLOYMENT.md`. `PUBLIC_HOST=saq.example.org docker compose -f docker-compose.yml -f docker-compose.public.yml config --quiet` и `git diff --check` passed; это только проверка конфигурации, не deploy. Локальная env/контейнеры не изменялись. Следующий шаг: проверить доступ и ресурсы Oracle, выбрать свободный адрес/порты, отдельно развернуть проект и проверить ссылку извне. Способ доступа посетителей ещё уточняется; auth/CSRF сохранены.

**Текущая проверка Oracle:** SSH с существующим deploy key и StrictHostKeyChecking=yes успешен; x86_64, 952 MiB RAM, около 390 MiB available, swap 0, свободно 21 GiB диска. Четыре LifecycleKASE контейнера работают, API/web/PostgreSQL healthy; 80/443 и loopback 3000 заняты. Локальный SAQ idle: frontend 216.6 + API 130.6 + worker 80.24 + DB 88.59 MiB (около 516 MiB), OCR требует дополнительного запаса. На сервер ничего не загружено/не запущено, конфигурация и соседние сервисы не менялись. Блокер текущего размещения — недостаточный запас RAM: пользователь выбирает другой Oracle, отдельное разрешение на остановку LifecycleKASE с сохранением данных, либо платный Render. Публичной ссылки SAQ пока нет.

## Завершение блока — простой интерфейс по мотивам Awwwards, 16.10.2026

**Поручение:** взять за основу дизайн/структуру Awwwards E-commerce, убрать лишнее и существенно упростить сайт. Исполнитель Codex root, без субагентов. HEAD `e993dc855da00fd5d65c980caeb53ba139d4ce92`, main; ранее существующий dirty diff сохранён, commit/push/внешний deploy не выполнялись.

**Результат:** простой вид по умолчанию, 3 основных раздела вместо 6; белая верхняя навигация; краткий обзор с главным действием и тремя карточками; реестр с поиском и карточками; два обязательных поля ввода текста, URL/дата раскрываются по желанию. Неактивная вкладка URL-импорта удалена. Карта/дополнительные фильтры, KPI, проверка/сигналы/сверка, формы документов/история/создание сигнала доступны через «Инструменты аналитика». Режим хранится локально, не изменяет роль. Переключение сохраняет введённые причины, текст и выбранные файлы. DEMO/UNKNOWN/доказательства/источники/даты и отдельные человеческие решения сохранены. Backend/API/формула/миграции в этом блоке не менялись.

**Референсы:** в браузере просмотрены Awwwards E-commerce, карточка Estudio Niksen и сам магазин. Использованы короткое меню, крупная типографика, спокойные интервалы и каталог. Бренд/изображения/торговые функции не копировались. UI UX Pro Max применён без persist; существующие токены и RU/KZ системные шрифты сохранены, dependencies не добавлены. Superdesign по заявленному пути отсутствовал; реализация выполнена в существующем Next.js проекте.

**Файлы блока:** `frontend/components/workspace.tsx`, `analysis-workspace.tsx`, `legal-basis-review.tsx`, `frontend/app/design-system.css`, `frontend/tests/support.ts`, новый `simple-interface.spec.ts`. Legacy regression helper явно включает подробный вид, новые тесты проверяют настоящий default. Документы: README/CHANGELOG, DESIGN_SYSTEM 1.2, UX_GUIDELINES, UI_COMPONENTS, UI_IMPLEMENTATION_PLAN, UI_AUDIT и этот статус. ADR не требовался: архитектура и API прежние.

**Проверки:** `docker compose build frontend` и `docker compose up -d --no-deps --wait frontend` passed, frontend healthy; API/worker/БД не перезапускались. Первый полный browser run — 53 passed / 2 failed из-за новых test timing/locator; исправления только тестов, focused rerun — 6 passed (17.9s). **Окончательный `npm run test:e2e` — 55 passed (2.7m)** на итоговой production-сборке, включая 49 прежних и 6 новых сценариев. `npm run typecheck`, `npm run lint`, `npm run format:check` — passed. `git diff --check` — passed; восемь обновлённых документов проверены на UTF-8 и локальные ссылки, пропусков нет. Все четыре локальных SAQ-контейнера работают. Backend suite повторно не запускался для presentation-only блока; предыдущие 605 passed/17 skipped относятся к предыдущей проверке. Browser tests создают обычные DEMO записи в локальной базе.

**Визуальная проверка:** 375/768/1024/1440 px для простого обзора/каталога/досье/upload; 16 наблюдений без page overflow, screenshots `output/simple-interface/`. Вручную просмотрены desktop/mobile обзор, mobile досье/upload и живой каталог. Исправлены бледное имя аккаунта и остаточная боковая тень active nav. Тест фактического контраста аккаунта ≥4.5. Подробные границы и исходные неудачные проверки — UI_AUDIT.

**Открыто / точный следующий шаг:** независимая UX-проверка с 3–5 людьми основных двух сценариев, затем правки по наблюдаемым затруднениям. Новые zoom 200%/screen-reader checks не выполнялись. Внешний collector/Threads live access/официальный реестр остаются отдельными открытыми задачами предыдущего блока; редизайн их не подключает. Функции сокращены в основном интерфейсе, данные и экспертные сценарии не удалены.

## Завершённый блок — продолжение незавершённой веб-интеграции Threads, 16.10.2026

Поручение: «войти в контекст и продолжи работу», затем «продолжи работу от туда от куда остановился прежний агент». Свежие файлы оказались новее предыдущего статуса: API/UI/config/контракт Threads уже были написаны, но не были отражены в завершённом блоке. Продолжена именно эта работа, прежний dirty diff сохранён. Исполнитель Codex root, без субагентов; исходный и итоговый HEAD `e993dc855da00fd5d65c980caeb53ba139d4ce92`, main. Commit/push/внешний deploy не выполнялись.

**Результат:** локально проверен отключённый по умолчанию ручной поиск-предпросмотр в `/monitoring`. Две операции status/search, контракт **0.10.0-mvp: 46 операций, 44 реализованы, 1 частична, 1 PLANNED**. Session/analyst/CSRF, один активный запрос на API-процесс и cooldown/Retry-After, предел веб-запроса 10 секунд. Источник не вызывается при просмотре статуса. Выдача временная, не создаёт Advertisement/Asset/кандидат/инцидент, не меняет риск/Signal/Telegram. Живой поиск не VERIFIED: CLI по-прежнему TOKEN_MISSING, веб-панель фактически DISABLED.

**Доработки продолжения:** исправлена гонка фокуса результата (requestAnimationFrame мог сработать до React commit; теперь effect после монтирования). Визуальная проверка обнаружила несуществующие panel-head/panel-body: заменены существующими panel-heading/padded без новых CSS/токенов. Добавлены API-регрессии непустой выдачи по OpenAPI, сохранения даты/текста, dedup/удаления paging-секрета и сброса ACCESS_VERIFIED после отказа; браузерные проверки Enter, восстановления TOKEN_MISSING/TOKEN_INVALID и четырёх ширин. Исправлены четыре import-order нарушения Ruff в затронутых тестах. Второй browser failure был только локатором: во время busy текст кнопки «Идёт поиск…», тест теперь проверяет её актуальное accessible name.

**Файлы блока:** ранее созданные `backend/app/api/threads.py`, `backend/app/config.py`, `backend/app/main.py`, `.env.example`, `contracts/openapi.yaml`, `frontend/components/threads-search.tsx`, интеграция в `monitoring-workspace.tsx`, `backend/tests/test_threads_api.py`, `test_contract.py`, `conftest.py`, `test_threads_search.py`, `frontend/tests/threads-search.spec.ts`. Продолжение изменило фокус/классы в ThreadsSearch, дополнило API/browser tests и восстановило Ruff-порядок imports; остальные ранее написанные функции сохранены.

**Фактическая валидация:**

- Из backend `../.venv/Scripts/python.exe -X utf8 -m pytest -q -rs` — **605 passed, 17 skipped, 197.59s**. Пропуски: Linux resource limits/Pango на Windows. Исходный focused transport/API/contract — 175 passed; после добавления регрессий API — 18 passed. Сеть Threads в тестах подменена/запрещена.
- Из корня `.venv/Scripts/python.exe -m ruff check backend/app backend/tests backend/alembic` и `ruff format --check` — passed, 72 файла. Явный `--config` из корня меняет определение first-party imports и давал ложный массовый diff; финальный запуск соответствует существующему CI, без этого override.
- Из frontend `npm run typecheck`, `npm run lint`, `npm run format:check` — passed; `docker compose -f docker-compose.yml -f docker-compose.dev.yml build api frontend` и отдельные frontend rebuild после исправлений — passed. Финальная production-сборка содержит `/monitoring`.
- `npm run test:e2e` — **49 passed (1.6m)**, включая настоящий OCR/PDF/ручные решения/monitoring и четыре Threads tests. Этот полный прогон был после исправления фокуса; после последующей замены только двух presentation classes выполнен `npx playwright test tests/threads-search.spec.ts` — **4 passed (9.7s)** и frontend checks. Полный прогон после двух классов не повторяли.
- Threads: реальный DISABLED, без search request; отдельно presentation mocks для успешной/пустой выдачи, ошибки, инертного HTML-текста, восстановления подключения. На 375/768/1024/1440 scrollWidth ≤ viewport для DISABLED и результатов. Итоговые screenshots `output/threads-preview/results-{375,1440}.png` визуально просмотрены; ранее просмотрен DISABLED mobile. Keyboard Enter → focus на результате подтверждён. Новый zoom 200%/screen reader/внешняя UX-приёмка не выполнялись.
- API/frontend локально пересозданы с `up -d --no-deps --wait`; worker и БД не перезапускались. До запуска Alembic уже был `b26f105d7c41 (head)`; итоговый `docker compose ... exec -T api alembic check` — No new upgrade operations detected. Новых миграций/зависимостей нет. Browser-набор добавляет обычные DEMO-материалы/решения; тестовые ответы Threads в БД не сохранялись.
- `git diff --check` passed. `.env`/токены не изменялись, внешних запросов Threads/сообщений/публикации не выполнялось.

**Документация/решения:** синхронизированы README, CHANGELOG, FEATURE_THREADS_SEARCH, ARCHITECTURE, PLAN, REMAINING_CHECKLIST, MONITORING_ALGORITHMS, UI_COMPONENTS, UX_GUIDELINES, UI_AUDIT. Описаны раздельные CLI/server token settings, настройка/timeout, временность preview, отсутствие гарантии idempotency, process-local quota и потеря статуса при рестарте. Применены Implement Feature и проектный UI UX Pro Max: recovery/role=alert, существующие компоненты/токены; новый дизайн/зависимости/ADR не требовались.

**Финальный контроль документов:** 11 документов прочитаны UTF-8, 168 локальных ссылок без пропусков, fences сбалансированы. OpenAPI разобран: 0.10.0-mvp, 46 операций. `git diff --check` passed; `.env`, CLI token path и output screenshots игнорируются Git. Четыре локальных SAQ-контейнера работают, API/БД healthy.

**Точный следующий шаг и блокер:** нужен токен официального Meta-приложения с фактическим `threads_keyword_search`; секрет только в игнорируемый локальный файл/серверную `.env`, не в чат. Выполнить один bounded запрос, подтвердить реальные поля/доступ/лимиты и условия хранения, затем реализовать доказательственное сохранение/дедуп/аудит и ручной запуск анализа. До этого не включать расписание и не объявлять C-01 закрытым. REAL-реестр, другие три канала, внешний OCR holdout и предметная приёмка остаются OPEN. Перед несколькими API workers нужны общий quota/lease и правила аудита/retention.

## Завершённый блок — исследование источников и Threads access spike, 16.10.2026

Поручение: «поищи инфу в интернете и в источниках и начни работу». Прочитаны свежие status/Git, инструкции, требования/план/архитектура, контрактный объём и ADR-008; применён Implement Feature. Состояние `main e993dc8` с прежним dirty diff сохранено, новых агентов в этом блоке не запускали, commit/push/deploy не выполнялись.

**Реализовано:** отдельный `backend/app/threads_search.py` и `scripts/search_threads.py`: offline status, один официальный keyword запрос TOP/RECENT, bounded response/deadline, проверка полей/дат/ссылок, dedup/конфликт, приватный отчёт с происхождением/хешем. Токен только `.local/threads-access-token.txt` → stdin → Bearer, ни URL, ни argv, ни raw error. Фиксированный graph.threads.net, reuse существующей DNS/IP-pinned TLS защиты, redirects/proxy/media/paging не исполняются. Новых dependencies/БД/API/UI/config изменений нет; основной runtime не перезапускался. Детали — [FEATURE_THREADS_SEARCH](docs/FEATURE_THREADS_SEARCH.md).

**Фактически проверено:** из backend `../.venv/Scripts/python.exe -X utf8 -m pytest -q tests/test_threads_search.py tests/test_url_fetcher.py` — **157 passed (2.68s)**; Ruff новых трёх Python-файлов passed. Первый прогон из корня дал 152 passed/один failure существующего subprocess-теста из-за cwd; правильный повтор из backend прошёл. Первоначальные lint import-order нарушения устранены, финальная проверка с `--config backend/pyproject.toml` passed. Live CLI `status` возвращает TOKEN_MISSING, токен/credentials не выдумывались и в сеть не передавались. Unit network запрещён. Предыдущий полный 543/17 и 45 browser не выдаётся за приёмку нового источника; UI/build/full backend повторно не нужны для не подключённого к runtime модуля и не запускались.

**Исследование:** официальный Threads endpoint/params подтверждены; Meta docs 429, app-review/квоты/TAG ещё неизвестны. Instagram — hashtagged media через Facebook Login/Professional+Page, общий keyword не подтверждён. TikTok Commercial API показывает EU/EEA, не KZ. Krisha п.5.3 требует письменный доступ. Через браузер наконец прочитан паспорт Ashyq и обнаружен CSV 1.1 MiB от 12.10.2026 с объектами долёвки/номерами разрешений/хешированными БИН; фактический HTTPS download заблокирован ошибкой проверки сертификата. Данные не скачаны, TLS не ослаблялся. Эти результаты и точные источники добавлены в [DATA_SOURCES](docs/DATA_SOURCES.md).

**Финальный контроль:** Ruff check/format трёх новых Python-файлов и `git diff --check` passed; восемь документов UTF-8, 126 локальных ссылок без пропусков, fences сбалансированы. Проверено игнорирование token/result paths. Повторный CLI status — TOKEN_MISSING, ожидаемый exit 2, сетевого обращения нет.

**Следующий шаг/блокеры:** получить Meta token/app с threads_keyword_search и выполнить один живой запрос, проверить ответ/permissions/limits, после этого включать доказательственное сохранение и интеграцию с сайтом, затем профили/пагинацию/расписание. User async вопрос о наличии Meta-доступа остаётся без ответа на момент фиксации; отсутствие ответа не даёт доступ. Ashyq требует исправного HTTPS либо предоставленного CSV и проверки схемы/лицензии/покрытия. REAL-реестр, полный C-01 и живые четыре канала остаются OPEN; raw search report не является Advertisement/Asset/инцидентом/R1. Документы README/CHANGELOG/PLAN/REMAINING_CHECKLIST/MONITORING_ALGORITHMS дополнены текущей границей.


## Завершённый блок — ручная DEMO-сверка и предварительные карточки VERIFIED, 16.10.2026

По поручению «гоу начнем реализовывать» завершён первый связный срез [MONITORING_ALGORITHMS](docs/MONITORING_ALGORITHMS.md): сохранённая публикация → независимый кандидат объекта → неизменяемая DEMO-версия списка → объяснимая историческая сверка → предварительная карточка → ручное решение/история. Доступен `/monitoring`, пункт «Сверка» и переход из оригинала публикации. Применены Implement Feature и repo UI UX Pro Max с действующим DESIGN_SYSTEM; generic Hero-рекомендация отклонена как не относящаяся к рабочему месту, точечный recovery-поиск применим.

**Границы VERIFIED:** проверен локальный ручной/DEMO-срез. Krisha/Threads/Instagram/TikTok, регулярный поиск/слова/теги, OAuth, автоматическое выделение полной идентичности, video/ASR, REAL-реестр и incident Telegram не подключены. Отсутствие доступа даёт REGISTRY_UNAVAILABLE (ожидание реестра), отсутствие применимой строки в пригодном полном DEMO-списке создаёт только предварительную карточку. REAL/DEMO разделены. Риск/R1–R6, текущие Signal и factor Telegram не меняются; внешняя предметная приёмка не заменяется тестами.

**Код/контракт:** `backend/app/monitoring.py`, `monitoring_dto.py`, `api/monitoring.py`, аддитивные models/main, `backend/tests/test_monitoring.py`, контрактные read-model проверки, миграция `b26f105d7c41` поверх `a91b76f2c305`. Восемь новых операций по шести путям; OpenAPI 0.9.0-mvp (44 операции: 42 реализованы, одна частична, collector PLANNED). `frontend/app/monitoring/`, `components/monitoring-workspace.tsx`, `lib/monitoring-types.ts`, `tests/monitoring.spec.ts`; существующие workspace/nav/mobile grid расширены минимально. Документы: [FEATURE_MONITORING_CASES](docs/FEATURE_MONITORING_CASES.md), [ADR-010](docs/decisions/ADR-010-preliminary-monitoring-cases.md), README/CHANGELOG/ARCHITECTURE/REQUIREMENTS/PLAN/REMAINING_CHECKLIST/MONITORING_ALGORITHMS/UI_COMPONENTS/UX_GUIDELINES/UI_AUDIT.

**Решения и review:** существующие auth/CSRF/Command/audit и PostgreSQL, без новых зависимостей/сервисов. Кандидат не требует фиктивных Property/Developer; неполная идентичность не объединяется по одному названию. Версии списка/сверки неизменяемы; гарантии и разрешения альтернативны, область и дата проверяются отдельно. Candidate lock и уникальность активной карточки защищают параллельные команды; expected_revision защищает решения. Независимый read-only review обнаружил конфликт ACTIVE/REVOKED одного документа: снимок теперь отклоняется до записи независимо от порядка, добавлены регрессии. Согласован порядок блокировок candidate → advertisement и candidate → incident. Новое совпадение не закрывает старый case без аналитика. Первый browser-прогон обнаружил ошибку exact-label селектора native select; исправлены только три тестовых локатора на accessible combobox, UI менять не потребовалось.

**Фактические проверки:**

- `../.venv/Scripts/python.exe -X utf8 -m pytest -q -rs` из backend — **543 passed, 17 skipped, 197.17s**; пропуски Windows относятся к Linux resource limits/Pango. В составе 29 monitoring-тестов: шесть исходов, применимость/город/очередь/даты, DEMO/REAL, дубли документа, auth/CSRF, конкурентность/idempotency, stale/rollback, новая версия/expiry и неизменность факторов/Signal/Telegram. Лог `.local/monitoring-backend-final.log`.
- Ruff check `app tests alembic` passed; format check 68 файлов passed. Frontend `npm run typecheck`, `npm run lint`, `npm run format:check` passed; дополнительный scoped прогон после исправления селекторов также passed.
- `docker compose -f docker-compose.yml -f docker-compose.dev.yml build api worker frontend` passed; локальный frontend `npm run build` passed, маршрут `/monitoring` включён. Затем `up -d --no-deps --wait api worker frontend` passed; рабочие SAQ-сервисы подняты с новой версией.
- До миграции `scripts/backup_local.py create` создал согласованную копию БД/storage: `.local/backups/20261016T141439Z-4d3597574cd74cf8903a1604092063f5`. Сразу после миграции fingerprints подтвердили **16 прежних прикладных таблиц без изменений, шесть новых пустых**, изменена только версия Alembic. Доказательство `.local/monitoring-migration-proof.json`; `docker compose exec -T api alembic check` — No new upgrade operations detected. Восстановление именно этой копии в этом блоке не запускалось; прежняя restore-проверка остаётся историческим результатом.
- `npx playwright test tests/monitoring.spec.ts` — **2 passed (6.5s)**; затем `npm run test:e2e` — **45 passed (1.4m)**. Первый новый тест использует настоящий API/БД и проверяет недоступный реестр → пустой полный DEMO-список → case/dedup → ожидание → новая версия с документом → ручное закрытие/история/неизменный риск. Второй — явные presentation mocks ошибок/задержки/фильтров/инертного текста. Лог `.local/monitoring-browser-final.log`.
- `node .local/monitoring-visual.mjs` — 375/768/1024/1440: scrollWidth равна ширине viewport, шесть nav links, pageerror=0, reduced-motion 0.00001s. Enter на anchor фокусирует раздел; native details открывается/закрывается клавиатурой, соседний несохранённый черновик сохраняется. Скриншоты 375/1440 просмотрены; `output/monitoring/`. Новый zoom 200%, screen reader и внешняя UX-приёмка не выполнялись; старые проверки не приписываются новому экрану.

**Финальная проверка документов:** `git diff --check` passed; 13 изменённых документов прочитаны как UTF-8, 164 локальные ссылки — missing=0, fences сбалансированы. JSON OpenAPI 0.9.0-mvp разобран: 44 операции, восемь monitoring. Проверено игнорирование `.env`, файла токена, приватных proof/log и скриншотов. Это проверка затронутого объёма, не полный security audit.

**Сохранность и исполнитель:** Codex root + ранее запущенные backend/frontend-агенты по непересекающимся writable paths, read-only review алгоритма. Исходная `main e993dc8`, прежний пользовательский dirty diff сохранён. Commit/push/внешний deploy не выполнялись. Резервная копия предшествует миграции и browser-тестам; тесты добавили только явно DEMO-материалы/версии/решения через обычные API, включая сохранённый промежуточный тестовый case. Telegram runtime сохранил enabled=true/include_demo=false, новый monitoring не отправлял сообщений. Secrets/env/backups/логи остаются игнорируемыми.

**Точный следующий шаг:** подтвердить доступ одного реального разрешённого рекламного источника (Threads access spike либо предоставленный API/экспорт), реализовать адаптер и фактическое сохранение оригинала, затем профиль слов/тегов, расписание/checkpoints/квоты. REAL-сверка ожидает предоставления и приёмки реестра после победы. C-01, внешний holdout, UX/предметная приёмка и второй ПК остаются OPEN. Коррекция/merge/split идентичности и Telegram для preliminary cases — отдельные последующие функции.

## Предшествующий блок — проектирование регулярного мониторинга, 16.10.2026

Пользователь уточнил новую цель: искать рекламу Krisha/Threads/Instagram/TikTok по ключевым словам/тегам, анализировать, сравнивать с утверждённым списком, при отсутствии создавать инцидент. На уточнение ответил: **реестр существует, доступа сейчас нет; он ожидается при победе**. Поручение «продолжить» относится к проработке алгоритмов. Реализация нового мониторинга/инцидентов не начата; текущие контракт/код/конфигурация/БД/работающий Telegram не менялись. Локальная main от e993dc8, прежний незакоммиченный diff сохранён, commit/push/deploy не выполнялись.

Создан [MONITORING_ALGORITHMS](docs/MONITORING_ALGORITHMS.md), статус PROPOSED: поиск по возможностям каждого источника, RU/KZ query-профили/классификация, версии/дубликаты/checkpoints, объект-кандидат вне имеющегося каталога, сопоставление имени/адреса/города/очереди/БИН, временная/областная сверка, предварительный incident lifecycle и отдельная приёмка реестра после доступа. Предложены WAITING_REGISTRY для REAL до доступа и изолированная DEMO-сверка; отсутствие строки не становится R1/юридическим выводом, веса и ручные guards сохраняются. Предварительная PROVISIONAL-идентичность может дать автоматическую карточку; подтверждённая связь для существующего evidence/R1/Signal остаётся ручной. Дедуп наблюдений отделён от повторной сверки при новом реестре, canonical merge/split и история описаны. Новая incident-модель/API/Telegram event types пока не реализованы и явно отделены от текущих Signal/factor outbox.

Два независимых read-only исследования выполнены параллельно по непересекающимся площадкам (основание — разные внешние API/условия). Проверены официальные Meta/Postman, TikTok docs и Krisha terms: Threads keyword search существует, Instagram Facebook Login описывает hashtagged media, общий keyword search не подтверждён; TikTok Research имеет ограничения eligibility/доступа/задержки, Krisha требует разрешения. Реальных API-запросов с credentials, импорта публикаций, login/CAPTCHA bypass и контактов с площадками не было. Часть Meta docs дала ограничения чтения, Postman напрямую вернул оболочку/not found, официальная поисковая индексация дала метод; точные квоты/scopes/app-review условия остаются UNKNOWN до access spike. Links/границы зафиксированы в документе, не обещаны четыре live-канала к 21 октября.

Отдельный read-only review алгоритма против текущих models/extraction/legal/notifications выявил и помог устранить три пробела проекта: early-return на unchanged блокировал новую сверку; предварительный target был неявно заблокирован ручным подтверждением; не был определён merge двух активных карточек. Исправлены только тексты алгоритма. Уточнены README/REQUIREMENTS/PLAN/REMAINING_CHECKLIST/DATA_SOURCES/FEATURE_URL_IMPORT, добавлено последующее примечание в исторический CUSTOMER_MEETING_QUESTIONS; предыдущие результаты/протокол сохранены. Проверки UTF-8/локальных ссылок/diff при завершении записываются отдельно; новые runtime/tests/build/browser в этом проектировании не запускались. Предыдущие 514/17 и 43 browser остаются результатами предшествующего блока, не проверкой новых алгоритмов.

**Проверка документации:** `git diff --check` passed (только существующие уведомления CRLF→LF), 9 затронутых Markdown прочитаны как UTF-8, 136 локальных ссылок — missing=0, fences сбалансированы. Mermaid-схема отдельно не рендерилась; браузерная/предметная приёмка нового проекта не выполнялась.

**Точный следующий шаг:** по предложенной очередности реализовать отдельные DEMO-кандидат/предварительный case и версионную сверку с приёмкой шести сценариев, затем один реальный разрешённый источник. Регион/частота/полное видео/ведомственный смысл инцидента ещё уточняются; краткий план первого блока дан в §11. После фактического доступа обследовать и принять контракт/покрытие/даты реестра, затем включать REAL-сверку. C-01, внешняя независимая приёмка и второй ПК остаются OPEN; автоматический R1 по not-found не вводится.

## Завершённый блок — исправления Dashboard и rules-1.3 VERIFIED, 16.10.2026

Пользователь согласовал ближайший блок («окей гоу»): исправить счётчик новых публикаций и конкретный пропуск условия оплаты, пока C-01 зависит от источника. Codex, локальная main от e993dc8; прежний UI/URL/history/Telegram diff сохранён. Dashboard и его новый тест выделены отдельному агенту с непересекающимися writable paths; основной агент реализовал extraction/версии, интеграционные/browser-регрессии и docs. Новый ручной сценарий PAYMENT_TERM, реестры и collector не добавлялись.

**Реализовано:** Dashboard new_advertisements считает только NEW с прежними фильтрами; независимая query для latest pending не сужается. Уточнено описание поля в OpenAPI без изменения формы DTO. `rules-1.3` распознаёт перевод с суммой для закрепления квартиры в RU/KZ, включая мягкие переносы; контекст назначения ограничен 120 символами до/после глагола. Проверяются отрицание назначения/необходимости, предупреждение, история, ноль и посторонний перевод; пустая строка остаётся границей. Гипотеза сохраняется как PENDING с исходными spans/суммой. Проверка гипотезы/привязки/доказательства/R2 по-прежнему отдельная, баллы не начисляются от одного анализа или доказательства. Новая версия записывается для обычного анализа и ручной расшифровки; старые extraction/решения/сигналы не пересчитываются, повторный анализ явный. Формула, роли, схема БД и зависимости не менялись; ADR не требуется.

**VERIFIED:** Dashboard regression до фикса — 5 failed/4 passed (9 вместо 5 NEW в основном случае), после фикса `pytest -q tests/test_dashboard.py tests/test_api.py` — **19 passed (13.54 s)**. Первые 5 новых положительных extraction-примеров падали до фикса; независимый review нашёл ещё 3 отрицания назначения и 2 мягких переноса, воспроизведены 5 failed/22 passed и исправлены. Финальный pure `pytest -q tests/test_extraction_payments.py tests/test_extraction_names.py` — **101 passed**. Итоговый полный Windows `..\.venv\Scripts\python.exe -X utf8 -m pytest -q -rs` из backend — **514 passed, 17 skipped (146.72 s)**; пропуски прежние: 2 Linux resource limits, 1 Pango и 14 supporting-PDF unit cases. API-регрессии проверяют новые RU/KZ гипотезы, отдельную проверку/доказательство и неизменность риска. Первоначальный полный прогон 507/17 предшествовал 7 edge cases и не выдан за итоговый.

Ruff check/format app/tests/alembic — passed, **63 files already formatted**. Первая слишком широкая команда включала неизменённый scripts/configure_telegram.py под backend-конфигурацией и дала E402/import-order/quote-format замечания вне текущего scope; скрипт не переформатирован, это не новое поведение бота и не часть заявления о backend lint. Финальные frontend `npm run typecheck`, `npm run lint`, `npx prettier --check tests/workspace.spec.ts tests/analysis.spec.ts` — passed. Код UI/дизайн не менялся, новый frontend build/ручной визуальный аудит не повторялись; обновлены только две browser-регрессии.

Финальные Docker build api/worker и `docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --no-deps --wait api worker` — passed; пересозданы только эти SAQ services, БД/volumes/frontend сохранены. Worker сообщает `tesseract-rus-kaz-eng+rules-1.3+rapidfuzz-1`, `alembic check` — No new upgrade operations detected. На этой сборке полный `npm run test:e2e` — **43 passed (1.3m)** с реальными OCR/сигналом/PDF/историей; путь R2 использует исправленную фразу и отдельные решения. Dashboard browser проверяет число и переход NEW. Дополнительная живая read-only API сверка после прогона: **Dashboard 40 = NEW list total 40**, всех материалов 183. Telegram status после E2E: enabled=true/include_demo=false/counts={}, тестовой авторассылки не было.

Повторён неизменённый 36-case synthetic OCR regression в Docker без сети/env/БД/storage: payment 16 TP/0 FP/0 FN/16 TN, image matching top-3 24/24, errors 0, proposed_targets_met=true, inputs_changed_during_run=[]. Evidence `output/evaluation/rules-1.3-final-20261016T165330`, детали в OCR_EVALUATION. Это прежний изученный набор, не внешний holdout. Приватные логи: `.local/correctness-{backend-final,build-final,browser-final,evaluation-final}.log`. Независимый финальный read-only review перепроверил 8 edge/control сценариев и spans, новых блокирующих дефектов не обнаружил.

Файлы блока: backend/app/api/properties.py, extraction.py, worker.py (только версия поверх прежней Telegram-интеграции); новый tests/test_dashboard.py, tests/test_extraction_payments.py, tests/test_analysis.py; frontend/tests/workspace.spec.ts и analysis.spec.ts; описание поля contracts/openapi.yaml. Обновлены README/CHANGELOG, ARCHITECTURE/OCR_EVALUATION/PLAN/REMAINING_CHECKLIST и примечание к историческому CUSTOMER_MEETING_QUESTIONS. Формат/UTF-8/локальные ссылки проверены при завершении. Новых secrets, commit/push/deploy нет; текущий diff не проверен удалённым CI.

**Точный следующий шаг:** разрешённый рекламный HTTPS URL и условия для C-01 → фактический sample/парсер/storage/jobs/UI/recovery. Если источник пока не предоставлен, подготовить новый независимый RU/KZ holdout и человеческую проверку по существующей методике. Право ручного добавления отсутствующего PAYMENT_TERM, внешняя UX/предметная приёмка, второй ПК, официальный реестр и универсальное сравнение остаются OPEN. DEMO-уведомления не включать ради обычных тестов.

## Предыдущая сверка — функциональные исправления при блокере C-01, 16.10.2026

По просьбе пользователя «продолжаем…что нам нужно ещё по сайту» повторно сверены Git (`main`, HEAD e993dc8, прежний dirty diff сохранён), README/requirements/plan/checklist, UI-документы, контракт и актуальные API/компоненты. Независимый read-only просмотр подтвердил: `backend/app/api/properties.py:100–119` считает все публикации в new_advertisements, а `frontend/components/workspace.tsx:556–565` подписывает KPI как новые/ожидающие анализа и ведёт в NEW. Чистый вызов extractor подтвердил пропуск PAYMENT_TERM для «Перечислите 500 000 тенге для закрепления квартиры за вами»; ручное создание отсутствующей гипотезы не реализовано (`api/analysis.py:258–261`, `api/reviews.py:359–369`). Исправление словаря и KPI доступны команде; полномочие нового ручного сценария остаётся вопросом заказчику №8. AST-просмотр API не нашёл import-url; контракт помечает его PLANNED, один защищённый transport не закрывает C-01.

Обновлены только PLAN/REMAINING_CHECKLIST/этот статус: Telegram больше не обозначен ожидающим BotFather; добавлены два конкретных внутренних исправления. UI UX Pro Max использован для точечной сверки recovery/error feedback; рекомендации не заменяют проектную дизайн-систему. Код/БД/конфигурация/сеть не менялись, новые тесты и браузер в этой сверке не запускались. Следующий самостоятельный шаг — KPI и словарный пропуск с регрессиями; C-01 остаётся первым открытым расширенным P0, ожидает разрешённого рекламного URL. Затем независимая приёмка, один реестр и сравнение источников; поиск/глобальная сортировка/очередь — последующие улучшения. Commit/push/deploy не выполнялись.

## Завершённый блок — Telegram-уведомления; личный канал VERIFIED, 16.10.2026

Исполнитель Codex, локальная `main` от `e993dc8`, весь прежний UI/URL/history diff сохранён. Пользователь явно поручил «уведы в телегу…создадим бота», затем сохранил токен и нажал Start по одноразовой ссылке. 16.10.2026 выполнены живые `configure_telegram.py check`, `pair`, `complete`, `test`: Telegram подтвердил бота **@SaqQurulusbot**, установленного webhook нет; личный чат проверен и привязан. Первый complete до Start не находил чат; повтор после действия владельца успешен. Приветствие и отдельный DEMO-тест приняты Bot API, **владелец подтвердил получение обоих сообщений**. Токен, код привязки и ID чата в документах не сохранены. Для независимой read-only проверки pairing/transport/outbox использован субагент без доступа к приватным файлам и сетевым вызовам; основание — проверка границ перед отправкой в реальный чат. Commit/push/внешний deploy не выполнялись.

**Живое подключение VERIFIED, 16.10.2026 около 16:32 UTC+5:** `docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --no-deps --force-recreate --wait api worker` завершился успешно; пересозданы только api/worker для применения приватной env. В обоих контейнерах Settings показывают enabled=true/include_demo=false/paired=true; API `/health` — 200, worker запущен. Локальный CLI status: enabled=true/include_demo=false/counts={}, исторической рассылки нет. `.env`, token и pairing файлы проверены через git check-ignore. В этом продолжении изменены только приватная конфигурация и текущие docs; новые исходники не менялись, полные тесты повторно не запускались. Живой test проверяет транспорт и получение, а не создаёт фактор и не проходит очередь: бизнес-триггер/outbox проверены автоматическими тестами ниже. DEMO-авторассылка остаётся выключенной, доставка требует работающего локального worker.

**Реализовано:** новое ручное CONFIRMED R1–R6 → транзакционный `telegram_notifications` outbox с уникальным factor/revision → существующий worker отправляет вне транзакции. Снимок содержит DEMO/объект/фактор/серверный балл/зону, дату оценки и время проверки UTC+5, event ID; свободные причины/PII/PDF не отправляются. Повтор CONFIRMED не создаёт новое событие, backfill нет; DEMO требует отдельного opt-in. Получатель закреплён, смена bot/chat или отозванный фактор отменяют отправку. 429/backoff/max attempts, cooldown канала; UNKNOWN после timeout/некорректного ответа/истёкшего lease не повторяется автоматически. Поздний worker не заменяет новое состояние. Транспорт — фиксированный Telegram HTTPS, TLS, без proxy/redirect/parse_mode/preview, bounded response, безопасные коды ошибок.

**Подключение/управление:** `scripts/configure_telegram.py` — check/pair/complete/test/status/retry/disable. Случайный одноразовый код на 10 минут, только private chat с совпавшим sender, без forwarded/via-bot; простого /start недостаточно. В .local хранится hash pairing code, токен — в игнорируемом файле/приватной .env, SecretStr; настройки пишутся атомарно, чужой webhook не удаляется. Retry UNKNOWN требует --allow-unknown и допускает дубль. Это бот уведомлений без runtime-команд, групп, многоадресных подписок, GUI, новой службы Windows или внешнего деплоя. Внешнее хранение данных для ведомственного пилота требует отдельного согласования.

**VERIFIED на финальном коде:** из backend `..\.venv\Scripts\python.exe -m pytest -q tests/test_telegram.py tests/test_contract.py tests/test_appeal.py` — **34 passed (13.92 s)**. Полный `..\.venv\Scripts\python.exe -m pytest -q -rs` — **476 passed, 17 skipped (133.94 s)** на Windows; пропуски 2 Linux resource limits, 1 native Pango и 14 supporting-PDF unit cases. Автотесты запрещают live Bot API; conftest дополнительно выключает Telegram даже при будущем локальном подключении. Проверены API-триггер/уникальность/rollback, два worker/fencing/lease, known failure/UNKNOWN/429/cooldown/limit, смена получателя, Unicode/limit/secret masking, private/one-time pairing и сохранность env. Первоначальный API-тест Telegram оставлял новый R4 перед старым тестом создания — исправлена уборка только созданного в test schema фактора, без изменения предметного кода.

Docker build api/worker passed, пересозданы только эти SAQ services. До миграции создан согласованный snapshot `.local/backups/20261016T110742Z-9d83c314bfbb49f79e09b6dd21b75392` после завершения тестов; более ранний черновой snapshot при параллельном изолированном прогоне не использован как доказательство. Новый restore-прогон не выполнялся. Миграция `a91b76f2c305` добавила одну таблицу: **17 public tables**, включая alembic_version. `.local/telegram-migration-proof.json`: хеши/количества всех **15 прежних прикладных таблиц совпали**, telegram rows=0; изменена только версия Alembic и добавлена пустая таблица. `docker compose exec -T api alembic check` — No new upgrade operations detected. БД/volumes не пересоздавались, другие проекты не затронуты.

Полный `npm run test:e2e` на обновлённом runtime — **43 passed (1.2m)**, включая реальный OCR, R1–R6, сигналы/PDF и историю. Frontend-код/дизайн в этом блоке не менялись, UI build/typecheck не повторялись. Ruff check/format backend/app/tests/alembic и configure_telegram — passed (63 files); git diff --check passed. Приватные логи: `.local/telegram-backend-final.log`, `.local/telegram-build-final.log`, `.local/telegram-browser-final.log`, `.local/telegram-pre-migration-backup.log`. Linux unit suite/живой Bot API/удалённый CI не запускались; browser PDF/OCR использовал Linux-контейнеры. Технические проверки не являются предметной приёмкой или Telegram read receipt.

Файлы блока: backend/app/config.py, models.py, api/reviews.py, worker.py; новые app/telegram.py, app/notifications.py; миграция a91b76f2c305; tests/conftest.py и новый tests/test_telegram.py; scripts/configure_telegram.py, .env.example; contract reviewRiskFactor description (новых endpoints нет). Документы: FEATURE_TELEGRAM, ADR-009, README/CHANGELOG/ARCHITECTURE/REQUIREMENTS/PLAN/REMAINING_CHECKLIST, ссылка из FEATURE_PROPERTY_HISTORY, этот статус. Новых dependencies нет; формула/роли/guards/OCR/исторические snapshots не менялись.

Независимая read-only проверка `scripts/configure_telegram.py`, `app/telegram.py`, `app/notifications.py`, `tests/test_telegram.py` и FEATURE_TELEGRAM завершена: блокирующих дефектов для текущего подключения не обнаружено; приватные файлы, сеть и тесты субагентом не использовались. Это дополнительный просмотр кода, не подтверждение доставки.

**Точный следующий шаг:** подключение личного Telegram завершено; при работе с реальными материалами новые подтверждённые R1–R6 попадут в очередь. Для отдельного контролируемого показа на DEMO при необходимости явно включить TELEGRAM_INCLUDE_DEMO и применить env только api/worker; не включать DEMO-авторассылку ради обычных browser-тестов. Основной следующий этап по согласованному плану — получить конкретный разрешённый рекламный HTTPS URL и условия для C-01, затем sample/parser/storage/jobs/retry/UI и проверка настоящего импорта. Независимое качество, реестры/сравнение и пилотная приёмка остаются отдельными задачами.

## Предыдущий блок — история объекта, 16.10.2026

Исполнитель Codex, локальная `main` от `e993dc8`. Пользователь согласовал продолжение после обсуждения истории/уведомлений/сравнения/UI. По согласованному порядку повторно проверен C-01: рекламного источника с разрешением по-прежнему нет; пользователь повторил 11 реестровых ссылок, уже включённых в DATA_SOURCES. Свежий web-read Ashyq/Homeportal вернул JS-оболочки; паспорт/экспорт/актуальность набора не установлены. Регистры не выданы за разрешённую рекламу. Пока блокер сохраняется, завершён отдельный блок истории объекта. Субагенты, commit/push/deploy не выполнялись; весь прежний незакоммиченный UI/URL diff сохранён.

**Реализовано:** общий `PropertyHistory` в досье и раскрываемом журнале review, понятные события/причины/авторы, сохранённые переходы статусов, код/смысл фактора и ссылки к материалам/основаниям/сигналам. Серверная пагинация по 10, `history_page` в URL, сохранение registry/материала и несохранённого ввода соседних форм, keyboard/focus, loading/empty/error/retry. Старые события не показываются под другой страницей/ошибкой. Существующий audit DTO дополнен текущим `actor_display_name` и `risk_code`, контракт обновлён явно; пакетные lookup без N+1. Новых таблиц/миграций/dependencies нет. Баллы/роли/правовые guards/snapshots не менялись. Историческое имя автора и произвольный прошлый балл не реконструируются.

**VERIFIED:** focused backend `..\.venv\Scripts\python.exe -m pytest -q tests/test_property_history.py tests/test_analysis.py tests/test_contract.py` из backend — **59 passed (31.47 s)**. Полный Windows `..\.venv\Scripts\python.exe -m pytest -q -rs` — **451 passed, 17 skipped (145.39 s)**; 2 Linux resource limits, 1 native Pango и 14 supporting-PDF unit cases не запускались в Windows. `npm run typecheck`, `npm run lint`, `npm run format:check` — passed; Ruff check/format — passed (58 файлов). Production Docker build api/worker/frontend и финальная frontend build passed; обновлены только эти SAQ services, БД/volumes не пересоздавались. Полный `npm run test:e2e` на финальной сборке — **43 passed (1.3m)**, включая реальные OCR/R1–R6/сигнал/PDF; `.local/history-backend.log`, `.local/history-browser-final.log`, `.local/history-frontend-final-build.log` — приватные логи.

`node .local/history-visual.mjs` — 375/768/1024/1440, overflow=0/pageerror=0, 10 серверных событий на странице; pagination focus и сохранение draft проверены, reduced-motion duration 0.00001s. Итоговые desktop/mobile скриншоты `output/history/dossier-{width}.png` визуально просмотрены (375 и 1440). Дополнительный page-scale=2 отделён от настоящего zoom: `node .local/history-zoom.mjs` — реальный вход через форму, временный Chromium profile, `chrome.tabs.setZoom(2)`, width=scrollWidth=720/DPR=2, Enter на ссылке истории фокусирует раздел, pageerror=0; `output/history/zoom200.png`. Это техническая проверка, не внешняя UX/WCAG/юридическая приёмка.

Промежуточные прогоны выявили неоднозначные page-wide status locators после добавления Pagination; уточнены по сообщению. Первый полный прогон оставил подтверждённые DEMO R2/R4 после раннего падения и один fetch оборвался при обновлении frontend. Только эти две узнаваемые тестовые записи Ертіс завершены обычным auditable REJECT через API, без SQL/reset/удаления исходников; весь финальный прогон после завершения сборки прошёл. Первый новый backend-test сравнивал текущее время в объекте без last_reviewed_at; fixture получил фиксированное время проверки. Ошибки не скрыты и не объявлены дефектами формулы.

Файлы блока: backend/app/analysis_dto.py, backend/app/api/reviews.py, backend/tests/test_property_history.py; contracts/openapi.yaml; frontend/components/property-history.tsx, workspace.tsx, analysis-workspace.tsx, lib/types.ts, app/design-system.css; frontend/tests/property-history.spec.ts, analysis.spec.ts, legal-basis.spec.ts, supporting-pdf.spec.ts. Обновлены README/CHANGELOG, REQUIREMENTS/PLAN/ARCHITECTURE/DATA_SOURCES/UX_GUIDELINES/UI_COMPONENTS/UI_AUDIT/REMAINING_CHECKLIST и этот статус; создан FEATURE_PROPERTY_HISTORY. Самопроверка: только два read-model поля контракта, предыдущие snapshots/guards/риск сохранены, внешние строки — text, ID ссылки из metadata валидируется. Значимого нового архитектурного выбора нет; ADR не нужен.

**Следующий шаг:** для C-01 получить конкретный разрешённый рекламный HTTPS URL с условиями; после него — sample/parser/storage/jobs/retry/UI и фактический импорт. Независимый RU/KZ holdout, предметная/UX-проверка и второй ПК остаются открыты. Предоставленные реестры исследовать по паспорту/выгрузке как отдельный P1; уведомления и универсальное сравнение планировать отдельными блоками. Из внутренних найденных аудитом проблем всё ещё OPEN ошибочный Dashboard counter и ручной путь для пропущенного условия оплаты. Текущий код не опубликован, удалённый CI этого diff не запускался.

Финальная проверка: UTF-8 12 документов/132 локальные Markdown-ссылки — missing=0; hash-сверка 122 прежних source paths ограничена 10 ожидаемыми изменениями этого блока, включая контракт. Новые файлы истории перечислены выше. Последние typecheck/lint/format, Ruff/format и `git diff --check` passed; api/db healthy, frontend/worker running.

## Аудит перед созвоном — 16.10.2026, 15:00

Исполнитель Codex; проверена локальная `main` от `e993dc8` с уже существовавшими незакоммиченными UI/URL изменениями. По отдельному поручению выполнен аудит без изменений продуктового кода, commit/push/deploy. Результат — [CUSTOMER_MEETING_QUESTIONS.md](docs/CUSTOMER_MEETING_QUESTIONS.md): сопоставление исходного PDF, аналитического DOCX, требований, архитектуры, API/БД, реализации и тестов; 15 основных и 8 дополнительных вопросов, внутренние задачи, повестка из 7 вопросов и пустой протокол решений.

Свежая проверка: из `backend` — `..\.venv\Scripts\python.exe -m pytest -q -rs`: **449 passed, 17 skipped (145.58 s)**; Linux/Pango/supporting-PDF пропуски раскрыты в аудите. Из `frontend` — `npm run typecheck` и `npm run lint`: passed. Ruff check/format для backend/app, backend/tests, backend/alembic: passed (57 файлов); `git diff --check`: passed. Browser/E2E, build, внешний OCR holdout и текущий remote CI заново не запускались. Backend-тесты используют изолированную временную schema; агрегаты рабочей БД проверены в `READ ONLY`.

Подтверждены требующие решения риски: точность дат и состав доказательств R1–R6, отсутствие ручного добавления пропущенной гипотезы оплаты, правила актуальности рекламы и распределение полномочий. Внутренний дефект Dashboard воспроизведён: показатель новых объявлений возвращает все 151 вместо 32 со статусом NEW; исправление не выполнялось. Автомониторинг/интеграция C-01 всё ещё отсутствуют, разрешённый источник не подтверждён. Полная готовность MVP/пилота не объявляется.

Изменения этого блока — только новый документ вопросов и эта запись. **Следующий шаг:** провести созвон, заполнить протокол реальными ответами, подтвердить источник/владельца данных и приоритеты до 21 октября; затем согласованные решения перенести в требования и план. До этого рекомендации аудита не являются принятыми решениями. Предыдущий технический checkpoint сохранён ниже.

## Технический checkpoint перед аудитом

Updated: 2026-10-16 (Asia/Qyzylorda). Текущий блок: подготовка защиты URL-импорта и исследование рекламных источников. Исполнитель Codex, branch main, исходная ревизия `e993dc8`; изменения локальные, commit/push/deploy не выполнялись. Перед началом уже существовал незакоммиченный UI-редизайн (21 tracked + 2 untracked файла); он сохранён. Презентация и видеозапись по-прежнему вне задачи.

## Текущий блок — транспорт URL-импорта; C-01 ещё не закрыт

Пользователь подтвердил поэтапное продолжение: URL-импорт → независимое качество/приёмка → один официальный реестр → остальные P1; отдельно аналитические расширения и pilot-hardening. Источник не выбран; пользователь явно поручил исследовать кандидатов. Перед изменениями прочитаны AGENTS/README/статус/требования/архитектура/план/ADR, код API/worker/storage/config/tests и planned import-url контракт; применён implement-feature. Субагенты не запускались.

Добавлен `backend/app/url_fetcher.py`: доверенная политика одного точного HTTPS-домена и поддеревьев путей, запрет ambiguous URL/traversal/credentials/ports, проверка всех DNS-адресов и каждого redirect, numeric-IP socket с обычной TLS/SNI проверкой, default 2 MiB/20 s/3 redirects, общий subprocess timeout (включая DNS и slow body). Proxy env/cookies/auth не используются; сжатые ответы отклоняются. Возвращаются оригинальные HTML-байты и транспортное происхождение; ошибки имеют стабильные коды/безопасные RU-сообщения/retryable, автоматических повторов нет. Нет новых зависимостей. Решение и ограничения — [ADR-008](docs/decisions/ADR-008-bounded-url-transport.md), детали — [FEATURE_URL_IMPORT](docs/FEATURE_URL_IMPORT.md).

**Граница реализации:** разрешённых источников по умолчанию нет. Модуль не подключён к API/worker; endpoint import-url остаётся PLANNED. Извлечение текста/даты, сохранение HTML/SHA в storage/БД, jobs/idempotency/retry/UI и фактический импорт ещё OPEN. Никакие рекламные страницы через новый модуль не загружались; fixture HTML — синтетический DEMO. API/БД/риск/роли/snapshots/Compose/frontend/dependency locks не менялись в этом блоке.

**Исследование:** публичное соглашение Krisha §5.3 требует письменного разрешения, Korter §5.3 запрещает scraping при отдельном условном исключении для robots-compliant программ; найденное BI-соглашение о loyalty не установило права на collector, повторные прямые запросы BI timeout. Robots не трактуется как самостоятельное разрешение. Среди трёх кандидатов разрешённый источник не подтверждён; [ссылки/наблюдения/объём будущего согласования](docs/DATA_SOURCES.md). Владельцам сайтов сообщения не отправлялись, реальные объявления/персональные данные в seed/Git не переносились.

**VERIFIED на финальном коде, Windows Python 3.12.3:** из backend `..\.venv\Scripts\python.exe -m pytest -q tests/test_url_fetcher.py` — **113 passed (1.38 s)**; затем `..\.venv\Scripts\python.exe -m pytest -q -rs` — **449 passed, 17 skipped (126.27 s)**. Пропуски перечислены pytest: 2 Linux resource-limit PDF parser, 1 native Pango render, 14 Linux supporting-PDF tests. Linux PDF повторно в этом блоке не запускался; исторические Linux/CI проверки ниже не выдаются за свежие. Предыдущий промежуточный полный прогон до последних transport cases — 439 passed/17 skipped, заменён финальным результатом 449/17.

Security/transport tests запрещают реальный DNS/network, используют настоящий HTTPResponse для framing, проверяют IPv4/IPv6/mixed DNS, rebinding между redirects, numeric socket/TLS hostname/cleanup, неоднозначные пути, запрет redirect, chunked/size/framing, безопасные error mappings. Есть настоящий subprocess rejection и kill-on-timeout. Это не live DNS/TLS проверка внешнего источника и не end-to-end приёмка collector.

Static validation: из корня `.venv\Scripts\python.exe -m ruff check backend/app backend/tests backend/alembic` и `... -m ruff format --check backend/app backend/tests backend/alembic` passed (57 файлов); `git diff --check` passed. Новые тесты автоматически входят в существующий CI через pytest, удалённый CI текущего diff не запускался. Frontend/build/browser не повторялись: продуктовый UI и существующий runtime в этом блоке не менялись. Docker ps показал только четыре SAQ-контейнера, api/db healthy; остановок/перезапусков/изменений volumes не было. Integration tests использовали существующую случайную test schema и временные assets, public/storage сохранены.

Файлы текущего блока: backend/app/url_fetcher.py, backend/tests/test_url_fetcher.py; docs/FEATURE_URL_IMPORT.md, docs/decisions/ADR-008-bounded-url-transport.md; дополнены README/CHANGELOG/REQUIREMENTS/ARCHITECTURE/DATA_SOURCES/PLAN/REMAINING_CHECKLIST и этот статус. Ранее существующие UI-изменения в общих документах сохранены. Самопроверка: scope/disabled default/error paths/TLS/timeout/retry/provenance проверены; source-specific parser и лишние абстракции не добавлялись. Финальная проверка UTF-8 — 12 файлов, локальных Markdown-ссылок — 120, отсутствующих целей нет.

**Точный следующий шаг:** получить или найти документированное разрешение на одну настоящую рекламную HTML-публикацию (предпочтительно сайт рекламодателя/партнёра), зафиксировать домен/пути/URL/условия/robots/дату проверки, затем проверить ограниченный образец. После этого подключить parser + исходник/SHA/даты + existing durable jobs/idempotency/audit + UI recovery и проверить фактический импорт. Без разрешения C-01 остаётся BLOCKED; частичная техническая реализация не закрывает MVP. Новый внешний RU/KZ holdout/KZ review, UX/предметная проверка, второй ПК/нагрузка и P1 остаются открытыми согласно PLAN.

## Предыдущий блок — Construction Intelligence / рабочее досье аналитика

Checkpoint этого предыдущего блока: исходная ревизия `e993dc8`, перед началом UI-работ дерево было чистым; изменения редизайна остались локальными, commit/push/deploy не выполнялись. Backend/API/БД/риск/роли/исторические снимки/dependency locks были сохранены.

По приложенному полному заданию выполнен редизайн действующих экранов, с текущим кодом/API вместо отдельного mock-приложения. Прочитаны правила/требования/статус/архитектура/UX/feature/ADR, существующие компоненты/DTO/OpenAPI/реестровые API/анализ/тесты. Экранная audit-матрица и пять публичных референсов записаны в UI_AUDIT; Awwwards не загрузился и не заявляется изученным. Локальный ui-ux-pro-max использован advisory, marketing/новые fonts/palette отвергнуты, DESIGN_SYSTEM остаётся master. Платных сервисов/новых dependencies/агентских задач нет.

Реализация: общая оболочка/typography/motion; обзор с пятью приоритетными объектами и явным охватом выборки/API KPI; активные фильтры/город/застройщик реестра; общий выбранный объект карты/таблицы с сохранением при list/map; контекстные возвраты из досье/публикации после reload; RiskSummary в досье и историческом сигнале; единые surfaces legal forms; серверные status filters/pagination рекламы, loading/error без старой очереди; review selection URL/Back/reload без autoanalyze; anchors фактов/решения/PDF/истории, выделение версии и подписи кодов. Оригиналы/даты/DEMO/UNKNOWN/правовые предупреждения сохранены; отдельные OCR/match/evidence/factor/signal decisions не объединялись. Новых серверных операций/расчёта риска нет.

**VERIFIED локально:** `npm run test:e2e` — **41 passed (1.3m)**, включая реальные OCR/R1–R6, исходный PDF, пересчёт/отклонение, stale revision, signal snapshots/решения/PDF. Шесть новых regressions и дополненный map test прошли. `node .local/redesign-capture.mjs after` — **66 observations** (10 authenticated routes + login, 320/375/768/1024/1440/1920), page overflow=0/pageerror=0. Основные screenshots desktop/mobile визуально просмотрены, не каждый из 66 кадров. До — 22 observations 375/1440; снимки не перезаписаны after-серией. `node .local/redesign-zoom.mjs`: реальный вход через форму, настоящий `chrome.tabs.setZoom(2)` шести экранов; zoom=2/DPR=2/viewport=scrollWidth=720, pageerror=0; Enter на карте и anchors досье/сигнала проверены. Это отдельный временный Chromium profile, не пользовательский браузер.

Static checks: `npm run typecheck`, `npm run lint`, `npm run format:check` passed; `npm audit --audit-level=high` — 0 vulnerabilities. Production `docker compose -f docker-compose.yml -f docker-compose.dev.yml build frontend` passed; обновлён только frontend через `up -d --no-deps frontend`. API/worker/db/volumes/storage и посторонние проекты сохранены. Backend pytest не повторялся: серверный код без diff. Первые focused 13/15 выявили изменившееся accessible name карты и неоднозначный alert locator; исправлено, финальные 41/41 включают оба. Первый responsive проход выявил ошибочный CSS selector; финальный повтор без дефекта.

Файлы: frontend/app/design-system.css, components/{workspace,analysis-workspace,signals-workspace,property-map,legal-basis-review,legal-absence-review,construction-review,appeal-review}.tsx, lib/{presentation,status-labels}.ts, tests/{redesign,map}.spec.ts. Обновлены README/CHANGELOG/DESIGN_SYSTEM/UX_GUIDELINES/UI_COMPONENTS/UI_IMPLEMENTATION_PLAN/UI_AUDIT/UX_UI_SPEC/FEATURE_MAP и этот статус. Значимого нового архитектурного решения нет, причины UI-решений в существующем master/audit, новый ADR/handoff не создавался. Evidence ignored: `.local/redesign-{before,after,zoom}.json`, `.local/redesign-{focused,browser-final,build-final}.log`, `output/redesign/{before,after}/`.

Финальная самопроверка: `git diff --check` passed; `.local/redesign-final-scan.py` проверил **23 UTF-8 файла / 79 локальных Markdown-ссылок**, известных локальных secrets/credential patterns и отсутствующих ссылок не найдено. Минимальный измеренный текст responsive-набора — **12 px**. Backend/contracts/compose/dependency locks без diff. Это ограниченный scan, не независимый полный security audit. Docker ps: четыре SAQ-контейнера, api/db healthy; browser panel для локального dashboard запрошен через open_in_codex (queued). Текущий Git diff сохранён локально, без commit/push.

Ограничения: техническая UI/E2E проверка не закрывает UX с 3–5 людьми, Windows screen reader, реальные touch devices и полную WCAG 2.2 AA приёмку. Token contrast проверен suite; отдельные новые rendered contrast/bundle bytes/CLS/load measurements не выполнялись. Декоративных API-запросов/внешних fonts нет. Server errors остаются существующими inline alerts, универсальная привязка ошибок к каждому полю не добавлялась. Dashboard ранжирует до 100 полученных объектов с явной оговоркой, review selector — первые 100 последних материалов; полный доступ к рекламе через серверную пагинацию. Поиск рекламы по тексту/глобальная сортировка не имитируются без API. Collector/внешний OCR holdout/KZ human review/реестровый импорт/второй ПК/предметная приёмка остаются открытыми.

Следующий шаг: внешняя UX/предметная проверка по UI_AUDIT с конкретными сценариями поиска/сопоставления/решения; при отдельной публикации — свежая сверка remote SHA/секретов и exact-SHA CI. Локальная реализация редизайна и технический прогон завершены; внешний CI текущего diff не запускался.

## Предыдущий блок — свежий backup и актуализация границ

По просьбе сохранить лимит выполнены только короткие технические задачи. Создание презентации/видеозаписи отменено пользователем, не возобновлять без новой просьбы. Незавершённый `scripts/record_demo.mjs` удалён до commit; продуктовый код не менялся. В ходе подготовки до отмены `verify_ocr.py` добавил два синтетических RU/KZ материала, исходники/гипотезы PENDING сохранены. Ни презентация, ни видеозапись не публиковались.

Свежие `scripts/backup_local.py create` и `verify` завершились exit 0. Снимок `deb4d23`: **16 таблиц, 3631 строка, 1093 audit events**. При изолированном восстановлении API скачал **335 Assets**, проверил **33 сигнала / 22 с решениями**, **22 исторических PDF assets / 22 READY PDF**; `verified=true`, `stage=complete`. Evidence: `.local/backup-current-{create,verify}.log`, `.local/backups/20261015T182805Z-2e8c2ae35f004ff4bc7eeb93264f33fc`, `.local/restore-checks/20261015T182838Z-8eeaa9ea84e549179a0ed5bb37d259b0/result.json`. Рабочая БД/volumes сохранены, API/worker возобновлены, временные контейнеры удалены, работают только четыре SAQ-контейнера. Backup/env остаются приватными и не входят в Git.

Согласованы текущая P0-матрица и следующий шаг с уже проверенными rules-1.2 и 35 browser tests. Обновлены существующие LOCAL_BACKUP/REMAINING_CHECKLIST и этот статус. Код/зависимости не менялись, прежний CI `f0a91c8` относится к текущему продуктовому коду; полный pytest/browser/build повторно не запускались. Проверки текущего блока: реальный create/restore/API/SHA/таблицы и финальный diff/локальные Markdown links. Следующий шаг: новый внешний OCR holdout/KZ review, UX/предметная приёмка, второй ПК или паспорт/разрешённый образец P1-реестра. Эти внешние проверки не объявляются закрытыми.

## Предыдущий блок — OCR/extraction rules-1.2

Исправлены переносы LF/CRLF и сокращение `тыс.`, добавлены резервирование/плата за бронь/«алдын ала төлеңіз», локальный исторический контекст и ближайшая сумма конкретного условия. Нулевой аванс не заимствует цену квартиры, `т/Т` не считается валютой. Длинный PAYMENT_TERM содержит фактический термин и сумму в своём ограниченном исходном фрагменте. Exact name/ЖК/ТК сохраняют приоритет; дополнительный fallback допускает только известные пары казахских букв зарегистрированных имён ≥6 букв, границы слова и PENDING с предупреждением. Новые automatic/manual extraction имеют rules-1.2; старые версии, решения и snapshots не переписываются. API/БД/зависимости/Tesseract/порог matcher/риск сохранены; ADR не требовался.

Замер неизменённого synthetic regression-корпуса: 36 images, 32/32 читаемых, 0 ошибок; payment TP/FP/FN/TN **16/0/0/16**, precision/recall **100%/100%**, image top-1/top-3 **24/24**. `--require-targets` exit 0; manifest и 36 image SHA совпали с alias-fix-v1, source hashes после запуска совпали с кодом. CER прежний **157/6311 (2,49%)**. Exact-text baseline top-3 **22/24**, 1/8 неизвестных объектов по-прежнему получает похожего кандидата. Это исправление правил на просмотренном наборе, **не независимая точность реальной рекламы**. Нужны новый внешний holdout и проверка KZ человеком.

Проверки: focused pytest **105 passed**; Ruff check/format всего backend passed; **27 tool unittests OK в Linux**; evaluator без сети/БД/env, read-only источники, ограниченные ресурсы. Пересобраны и обновлены только SAQ api/worker с обоими Compose-файлами и `--no-deps`; db/frontend/volumes сохранены. `scripts/verify_ocr.py` прошёл на реальных API/worker; полный локальный `npm run test:e2e` — **35 passed (1.2m)** с R1–R6, настоящим OCR, snapshots/PDF и responsive/keyboard checks. Полный Linux backend на отдельной случайной test schema — **353 passed (97.94s)**; test environment создан в /tmp отдельного временного контейнера, рабочие зависимости не менялись. Новых frontend изменений нет; отдельные lint/typecheck/build UI и ручная визуальная проверка не повторялись.

Read-only review отдельным агентом выявил и помог закрыть регрессии смешанного старого/нового предложения, запятой перед призывом, пустого абзаца с пробелами, Windows-переноса и обрезанного фрагмента. Исходный код и общий статус менял только основной агент. Файлы: backend/app/{extraction,worker}.py, backend/tests/test_extraction_{names,payments}.py, публичные report/cases rules-1.2 и существующие README/CHANGELOG/OCR_EVALUATION/ARCHITECTURE/PLAN/REMAINING_CHECKLIST/PROJECT_STATUS.

Evidence (ignored): `.local/evaluation-rules-1.2-{reviewed,backend,tools,build-reviewed,live-ocr,browser}.log`, `output/evaluation/rules-1.2-reviewed`. Публичные report/cases — `data/evaluation/results/2026-10-15/rules-1.2-*`; прежние отчёты не перезаписаны. Self-review и `git diff --cached --check` passed; проверены 13 UTF-8 файлов и 102 локальные Markdown-ссылки, совпадений известных локальных secrets/credential patterns 0. Source SHA публичного report совпали со staged Git-кодом. В worker подтверждён pipeline rules-1.2; работают только четыре SAQ-контейнера. Код опубликован в **`f0a91c861ca5668257c15d8d88d3eb11a61b6fbb`**; после push локальный/удалённый SHA совпали, дерево чистое. [GitHub CI 38783082453](https://github.com/temirkhanerbolatovich-coder/saq-qurylys/actions/runs/38783082453) точного SHA завершён **success** во всех трёх jobs. Из job logs прочитаны **353 backend passed (104.36s), 35 browser passed (52.4s), 27 tool tests OK**, Skill smoke, отсутствие новых upgrade operations, успешные frontend lint/typecheck/format/audit0/build/config test. CI-замер повторил payment 16/0/0/16 и top-3 24/24 при errors=0 и proposed_targets_met=true. Финальная фиксация — Markdown-only commit; повторная полная сборка для него пропускается workflow, source SHA report не изменились. Следующий продуктовый шаг: новый внешний holdout с правами/KZ-разметкой и UX/предметная приёмка; collector остаётся BLOCKED без разрешённого рекламного источника.

## Предыдущий блок — UX материала, review и сигналов

Код опубликован в **`8434d1b62c0825f45bf1c13bc04e407342fc8460`**; после push локальный/удалённый SHA совпали, дерево чистое. [GitHub CI 38779704092](https://github.com/temirkhanerbolatovich-coder/saq-qurylys/actions/runs/38779704092) для точного SHA **success** во всех трёх jobs. Из job logs подтверждены **294 backend passed (69.45s), 35 browser passed (40.2s), 27 tool tests OK**, offline Skill search passed, отсутствие новых upgrade operations и успешные frontend checks/build/audit0/config test. Финальная фиксация этого результата — Markdown-only commit; повторная сборка для него пропускается workflow. Следующий шаг — внешняя UX/предметная приёмка, а не повторная реализация текущего блока.

По просьбе продолжить реализацию UI/UX использованы текущие DESIGN_SYSTEM/UX_GUIDELINES/UI_COMPONENTS и установленный ui-ux-pro-max: локальные searches `progress steps navigation` и `form labels error feedback` дали применимые правила progress/labels/keyboard/submit feedback. До изменений показаны три проблемы и план. Новый визуальный стиль/библиотеки/генерация master не требовались.

Текстовая и файловая формы разделены на оригинал/происхождение и необязательный контекст; hints связаны с controls, текст имеет счётчик без noisy live region, файл показывает имя/размер и aria-invalid при oversize. После сохранения текста focus переходит к результату; primary Next Link ведёт сразу в review вместо двух переходов через карточку. Оригинал доступен отдельной secondary кнопкой; анализ автоматически не запускается.

Review имеет четыре anchor-этапа: оригинал/гипотезы/очередь/R2. Count использует только существующие CONFIRMED/CORRECTED/REJECTED review_status, не означает правовую готовность/баллы. Недоступные этапы объясняют прежние условия; архивная версия подписана, несохранённые причины при anchors остаются mounted. Повторный анализ — главное действие текущего материала, новая публикация доступна через раздел рекламы. Viewer видит ожидание аналитика и прежний read-only UI. Условия показа PaymentRisk вынесены без изменения в hasCurrentMatch; подтверждения/handlers/revisions/CSRF/idempotency сохранены.

Signals property_id/state/is_stale/page и signal_id хранятся в URL. Выбор/новая версия/history links сохраняют queue filters; Back/reload восстанавливают контекст. Смена фильтра сбрасывает page/id; reset возвращает focus первому select. Путь последнего завершённого запроса useData.resolvedPath позволяет скрыть прежнюю очередь во время нового фильтра/ошибки, поведение остальных callers сохранено. Снимок по ссылке вне текущей очереди явно подписан. API/данные/риск/миграции/dependency locks/Skill не менялись.

Финальные проверки: `npm run test:e2e` — **35 passed (1.1m)** с реальными OCR/R1–R6/сигналами/PDF; все пять новых UX regressions, включая viewer presentation mock, выполнены. Focused 5/5 (11.3s) выполнен до последней viewer-copy; полный прогон включает её. Первоначальные ошибки новых tests относились к преждевременному чтению URL/Back до завершения Next navigation; тестовые ожидания исправлены, существующие API assertions не ослаблены. `npm run typecheck`, `lint`, `format:check`, `npm audit --audit-level=high` (**0 vulnerabilities**) и production Compose build frontend passed. Обновлён только SAQ frontend с обоими Compose files/`--no-deps`; остальные SAQ services/volumes и посторонние проекты сохранены.

Повторены **28 authenticated + 4 login observations** на 375/768/1024/1440: page overflow=0, authenticated pageerror=0, min measured text=12. Финальные screenshots review desktop/mobile, text/file desktop/tablet/mobile и signals desktop визуально просмотрены; исправлены большие интервалы hints и competing primary на review. Keyboard/focus/contrast tests входят в полный suite; новый zoom/screen-reader/user test не выполнялся. Локальный backend pytest не повторялся: backend source не менялся. Это техническая UI-проверка, не внешняя приёмка.

Файлы: frontend/components/{workspace,analysis-workspace,signals-workspace}.tsx, app/design-system.css, tests/ux-flow.spec.ts. Обновлены README/CHANGELOG/DESIGN_SYSTEM/UX_GUIDELINES/UI_COMPONENTS/UI_IMPLEMENTATION_PLAN/UI_AUDIT/REMAINING_CHECKLIST и этот статус; новых handoff/ADR/dependencies нет, причина UI-решений записана в существующей системе. Evidence (ignored): `.local/ux-flow/{focused-final,browser-final,responsive-final,build-final}.log`, `.local/ui-design-after.json`, `output/design/after/*`. Self-review сохранности API/ролей/guards/draft/истории выполнен. Следующий шаг блока — финальный scan/commit/push и exact-SHA CI; затем внешние UX 3–5 людьми, screen reader и реальные touch devices. OCR quality/collector/реестровый импорт/второй ПК/защита остаются открыты.

Перед публикацией проверены **14 изменённых/новых UTF-8 файлов**, **84 локальные Markdown-ссылки**: известных локальных secrets и явных credential patterns не найдено; `git diff --check` passed. Backend/contracts/dependency locks/Skill без diff. После fetch HEAD=origin/main=`1577cac`. Это ограниченный scan, не полный security audit. Только четыре SAQ-контейнера работают; сторонние проекты не запускались.

## Предыдущий блок — UI/UX-инфраструктура и Skill

Новый master prompt разобран относительно уже реализованного дизайна; до изменений показаны краткий аудит/направление/план. Изучены оба UI UX Pro Max repo и их установка, публичные страницы шести UI-библиотек и доступные design references. Выбран один основной upstream commit `56ea9cf174ed86786187daa9de0e6247cb0747e4`; штатным skill-installer установлен subtree `.claude/skills/ui-ux-pro-max` в versioned `.agents/skills/ui-ux-pro-max`. Все 73 исходных файла совпали с pinned Git blob SHA; добавлены LICENSE/SOURCE.json/agents/openai.yaml. Сторонний install.sh прочитан, не запускался; fork Rpeng666 не установлен. Поиск использует Python stdlib; новых npm/pip dependencies/глобальных settings/hooks/services нет. Vendor whitespace сохранён с scoped attribute, Docker context исключает .agents. CI добавляет offline search smoke.

Два свежих `codex app-server --stdio` процесса через initialize → skills/list подтвердили ровно один **ui-ux-pro-max / scope repo / enabled=true**; второй с forceReload=false. Локальные domain/Next.js searches и два design-system preview выполнены без persistence. Нерелевантные hero/sales patterns/новые палитры/шрифты и generic Server Actions совет отклонены; DESIGN_SYSTEM остаётся единственным проектным master. Discovery/search проверены фактически, не только наличием SKILL.md. Git-tracked Skill доступен после clone другим агентам; личный disabled flag требует отдельной проверки на другом ПК.

Внедрены общие `Pagination` (реестр/сигналы, server metadata, disabled границы, polite page announcement) и `TableRegion` (сводка/реестр, focusable labelled scroll). Добавлен один reset q/zone/legal_status/page с сохранением view/других URL parameters и возвратом focus в search. Native search и H1–H6/font/spacing/shadow tokens дополняют прежний дизайн. Сортировка всего набора не имитируется сортировкой одной страницы; API не расширен. Отдельные OCR/match/фактор/сигнал, роли/CSRF/idempotency/revisions/snapshots сохранены.

Документация: созданы [UI_COMPONENTS](docs/UI_COMPONENTS.md) и [UI_IMPLEMENTATION_PLAN](docs/UI_IMPLEMENTATION_PLAN.md); дополнены DESIGN_SYSTEM/UX_GUIDELINES/UI_AUDIT/README/CHANGELOG/REMAINING_CHECKLIST. AGENTS закрепляет десять правил reuse/tokens/Skill/accessibility/browser/GitHub-agent handoff. UX_GUIDELINES описывает число действий по всем основным сценариям, как walkthrough-модель, не user testing. Reset трёх controls сокращён с 3 до 1 действия; юридически значимые подтверждения не сокращены. Подробная матрица Tailwind/shadcn/Radix/Lucide/MagicUI/Motion и границы доступа Mobbin/Pageflows — в UI_IMPLEMENTATION_PLAN. Второй handoff/status не создавался.

Фактические проверки: `npm run typecheck`, `lint`, `format:check`, `npm audit --audit-level=high` (**0 vulnerabilities**) и production `docker compose -f docker-compose.yml -f docker-compose.dev.yml build frontend` passed. Обновлён только SAQ frontend через `up -d --no-deps frontend`, db/api/worker/volumes и сторонние проекты сохранены. Focused `npx playwright test tests/ui-infrastructure.spec.ts tests/design-system.spec.ts` — **8 passed (12.8s)**; полный `npm run test:e2e` — **30 passed (54.2s)** с реальным OCR, R1–R6, сигналами/PDF. Повторены 28 authenticated + 4 login responsive observations на 375/768/1024/1440: нет page overflow, authenticated pageerror=0, min measured text=12. Дополнительно 4 filtered captures + RU/KZ row + signal pagination, pageerror=0; screenshots визуально просмотрены. Новый RU/KZ и pagination tests используют явно обозначенные presentation API mocks, остальные workflow реальны. FontFaceSet check не считается проверкой всех ОС. Backend source не менялся, локальный pytest не повторялся.

Evidence (ignored): `.local/ui-infrastructure/{focused,browser-full,build-final,responsive}.log`, `discovery{,-repeat}.json`, `*-result.txt`, `visual.json`, `output/design/reset-*.png`, `ru-kz-visible-375.png`, `pagination-signals-375.png`, свежие `after/*`. Изменения: frontend/app/design-system.css, components/{workspace,signals-workspace}.tsx, ui/{pagination,table-region}.tsx, tests/ui-infrastructure.spec.ts, .agents Skill, CI/.dockerignore/.gitattributes и документы. Следующий шаг блока — review/diff/секреты/ссылки, commit/push и exact-SHA GitHub CI. Не закрыты внешние UX 3–5 людьми/screen reader/touch devices и проектные OCR/collector/реестры/второй ПК/защита.

Блок опубликован в **`d2d9c6ba56e95d4d35fe7dfd3148060649175a25`**, после push локальный/удалённый SHA совпали, дерево чистое. Все 73 upstream blob SHA дополнительно проверены уже в Git commit — совпали. [GitHub CI 38768212690](https://github.com/temirkhanerbolatovich-coder/saq-qurylys/actions/runs/38768212690) точного SHA завершён **success** для frontend/backend/browser-e2e. Из job logs подтверждены **294 backend passed (101.24s), 30 browser passed (47.0s), 27 tool tests OK**, **repository UI skill search passed**, отсутствие новых upgrade operations и успешные frontend lint/typecheck/format/audit/build/config test. Финальная фиксация результатов — отдельный Markdown-only commit. Следующее действие: внешняя UX-проверка по UI_AUDIT/UX_GUIDELINES; техническая инфраструктура текущего master prompt завершена в указанном scope.

Перед публикацией: self-review компонентов/состояний/документации выполнен, `git diff --check` passed. Проверены **95 изменённых/новых UTF-8 файлов** (76 vendor source/license/metadata), **84 проектные локальные Markdown-ссылки**; известных локальных secrets и явных credential patterns не найдено. Vendor Markdown не интерпретируется как проектная документация, исходные ссылки сохранены. Все 73 upstream Git blob SHA повторно совпали; backend/contracts/dependency locks без diff. После fetch HEAD и origin/main совпали (`5bd0cca`). Работают только четыре SAQ-контейнера. Это ограниченный scan, не полный security audit; bundled vendor tests не запускались.

## Предыдущий блок — дизайн-система и UX

По запросу пользователя изучены frontend/роли/основные сценарии и публичные материалы shadcn, Radix, Lucide, Refactoring UI, NN/g, WCAG 2.2 и UI UX Pro Max. Локальная установка Pro Max не найдена; генератор не устанавливался и не запускался. До реализации показаны краткий аудит, визуальное направление «рабочее досье аналитика» и план. Сохранён существующий стек Next/React/Tailwind/Radix Slot/Lucide; новых dependencies нет. Зелёная навигация, тёплое светлое поле, графитовый текст, ограниченные семантические цвета, таблицы/разделители вместо одинаковых cards, спокойные 6/8 px скругления.

Реализованы tokens/типографика/состояния в design-system.css, общая KPI-полоса и рабочие маршруты, читаемые таблицы с расшифровкой R1–R6, русские статусы, пять разделов и профиль/выход на mobile. Добавлены skip-to-main, focusable table region/scope=col, anchor-навигация досье без unmount форм, видимое обоснование решения R1, focus выбранного сигнала и оригинала с возвратом к гипотезе. Сигналы используют очередь рядом с деталями на широком экране; формы/карта имеют увеличенные touch targets, экран входа компактный. Backend/контракт/roles/auth/CSRF/handlers решений/revisions/idempotency/исторические snapshots сохранены; баллы на клиенте не рассчитываются.

Проверки: `npm run test:e2e` — **27 passed (1.0m)** с реальными OCR/review/R1–R6/сигналами/PDF. После финальных visual-only изменений login/spacing/aria-busy повторены production Compose build frontend и `npx playwright test tests/design-system.spec.ts` — **5 passed (8.5s)**; ранее focused design+analysis **11 passed (22.8s)**. `npm run lint`, `typecheck`, `format:check` — passed; `npm audit --audit-level=high` — **0 vulnerabilities**. Повторены 7 authenticated routes × 4 ширины 375/768/1024/1440 и login на тех же ширинах: **32 наблюдения без page overflow**, 28 authenticated без pageerror, logout виден, измеренный рабочий текст минимум 12 px. Keyboard/skip/table scroll/досье/сохранение draft/selected focus/loading/empty/503 retry проверены. Viewer проверен только presentation mock auth/me, не новая серверная приёмка прав.

Контраст: 13 token pairs проходят text ≥4,5/control-focus ≥3; ограниченная выборка текстовых DOM nodes семи заполненных desktop-страниц даёт минимум 5,30:1. Настоящий Chromium zoom `setZoom(2)`/getZoom=2, DPR=2, viewport/scrollWidth=720/720, 8 real OSM responses HTTP200/8 markers; Enter/card/attribution доступны. Визуально просмотрены desktop/tablet/mobile screenshots; исправлены мелкие mobile actions, растянутые badges в очереди и пустой блок login. Это не полная WCAG 2.2 AA сертификация и не user/screen-reader testing. Отдельный локальный backend pytest не повторялся: backend не менялся; последний опубликованный CI `cba28ec` — 294 backend/22 browser/27 tooling.

Файлы: frontend/app/{layout.tsx,design-system.css}, components/{workspace,analysis-workspace,signals-workspace,legal-absence-review,property-map}.tsx, ui/button.tsx, lib/status-labels.ts, tests/design-system.spec.ts и три ожидаемые видимые status-строки в analysis.spec.ts. Созданы [DESIGN_SYSTEM](docs/DESIGN_SYSTEM.md), [UX_GUIDELINES](docs/UX_GUIDELINES.md), [UI_AUDIT](docs/UI_AUDIT.md); AGENTS требует их чтения перед frontend-задачами. README/UX_UI_SPEC/CHANGELOG/чеклист синхронизированы. Нового ADR нет: архитектура и зависимости сохранены; дизайн-решение/обоснование записаны в DESIGN_SYSTEM. Legacy globals.css остаётся для специализированных modules, дальнейшая консолидация — отдельный ограниченный refactor с теми же E2E.

Локальное evidence (ignored): `.local/design-{final-browser,focused-final,smoke-final,responsive-final,build,map-zoom}.log`, `.local/ui-design-{before,after}.json`, `.local/design-rendered-contrast.json`, `output/design/{before,after}` и `output/qa/map-zoom-200-*.png`. Пересоздан только SAQ frontend с обоими Compose-файлами и `--no-deps`; db/api/worker и volumes сохранены, сторонние проекты не запускались. Независимое read-only review diff/docs не выявило блокирующих замечаний. Перед публикацией `git diff --check` passed; проверены 20 изменённых/новых UTF-8 файлов, 71 локальная Markdown-ссылка, известных локальных secrets и явных credential patterns не найдено. Это ограниченный scan, не полный security audit. После fetch локальный HEAD и origin/main совпали (`59e870a`). Внешняя UX-проверка 3–5 людьми, screen reader, реальные touch devices и предметная приёмка остаются открыты.

Код опубликован в `53e9ef0264696e1a82757d44d516668bfc3af0dd`; после push локальный/удалённый SHA совпали, дерево чистое. [GitHub CI 38762778431](https://github.com/temirkhanerbolatovich-coder/saq-qurylys/actions/runs/38762778431) для точного SHA завершился **success** во всех трёх jobs: frontend/backend/browser-e2e. Из job logs прочитаны **294 backend passed (66.94s), 27 browser passed (38.2s), 27 tool tests OK**, frontend lint/typecheck/format/audit/build и config test. Реальный synthetic RU/KZ OCR fixture прошёл; evaluator повторил 80%/75%/18 из24, quality targets=false. Эти диагностические пределы не меняются дизайном. Финальный статус сохраняется отдельным Markdown-only commit; workflow пропускает такие изменения.

## Предыдущий блок — OCR evaluation и aliases

Добавлены [36 новых synthetic RU/KZ cases](data/evaluation/README.md), составленных отдельным агентом без чтения extractor/OCR/tests/seed. 32 читаемых, 16 положительных/16 отрицательных; 4 нечитаемых, каталог 8 вымышленных объектов; 24 known targets/8 unknown. Все тексты уникальны, названия каталога не совпадают с seed. Это ограниченная независимость разработки, не human/external acceptance. После просмотра ошибок корпус стал regression-набором.

`evaluate_ocr.py` вызывает production validate_image/recognize/extract/match_candidates, сохраняет оригиналы/manifest/raw OCR/все hypotheses/candidates, раздельные text/image метрики all/RU/KZ, coverage/CER/TP/FP/FN/TN и model/font/source SHA. Expected labels не передаются анализатору. No DB/API/settings/queue writes. Прогоны в disposable Linux Docker с network none/read-only/cap-drop, writable только output. До создания output проверяются Tesseract/models/font; output не перезаписывается, stage errors сохраняются. CI добавляет evaluator/tool tests и 14-day synthetic evidence artifact. Метрики диагностические; для quality gate нужен --require-targets.

Первичный baseline: **precision 80%, recall 75%, top-3 8/24**. Выявлен и исправлен узкий дефект exact registered aliases без префикса ЖК/ТК: matcher знал aliases, а extractor не выделял их. После исправления на **тех же 36 image SHA/manifest/labels**: **precision 80%, recall 75%, top-3 18/24 (75%)**, CER 157/6311 (2,49%), coverage 32/32, ошибок обработки 0; цели 90%/85%/90% **НЕ достигнуты**. RU top-3 12/12, KZ 6/12; все 4 unreadable без OCR/payment/candidates. Сохранены исходный и post-fix report/case records в [data/evaluation/results/2026-10-15](data/evaluation/results/2026-10-15). Версия новых автоматических/ручных extraction rules-1.1, прежние записи не переписываются. Остались historical false positives, сокращения/переносы и KZ-name OCR; подробный разбор IDs — [OCR_EVALUATION](docs/OCR_EVALUATION.md).

Проверки 15.10.2026: полный Linux `pytest -q -p no:cacheprovider` — **293 passed (119.72s)** в временном Compose API с read-only backend/contracts, dev venv в /tmp, отдельная случайная test schema; public/storage сохранены. Один дополнительный overlap regression добавлен после collection полного прогона: focused `pytest backend/tests/test_extraction_names.py -q` — **15 passed** на Windows. `python -m unittest discover -s scripts -p "test_*.py" -q` — **27 OK в Linux без skip**, Windows 27 OK / 1 symlink skip. `npm run test:e2e` — **22 passed (51.2s)** с обновлёнными API/worker и настоящим OCR/PDF. Ruff check/format backend (54 files) и двух новых scripts passed; build api/worker passed. Frontend source не менялся, отдельные lint/typecheck/frontend build не повторялись. Схема не менялась, alembic check отдельно не повторялся. Визуально просмотрены все 36 изображений на 6 contact sheets; 4 нечитаемых подтверждены видом изображения.

Docker был остановлен; запущен по прежнему прямому разрешению пользователя. После старта engine автоматически поднял SAQ worker с restart policy; явно запущены только существующие SAQ db/api/frontend, затем пересобраны api/worker. Чужие проекты не запускались; volumes не удалялись. Временные test/evaluation контейнеры удалены. Локальное evidence: `.local/evaluation-{baseline,alias-fix,backend,browser,tool-tests-linux,runtime-build}.log`, `output/evaluation/{baseline-v1,alias-fix-v1}`. Публичные synthetic reports/JSONL содержат только вымышленные данные, без credentials. Перед публикацией: независимое read-only ревью evaluator/docs/CI не нашло блокирующих ошибок; self-review diff выполнен. `git diff --check` passed, проверены 19 изменённых/новых UTF-8 файлов, JSON/JSONL, 82 локальных Markdown-ссылки; известных локальных secrets и явных credential patterns не найдено. Локальный и origin/main до публикации совпали. Код опубликован в `cba28ecea28ec6b60896981837d79249474a17a4`; локальный/удалённый SHA совпали. [GitHub CI 38756623850](https://github.com/temirkhanerbolatovich-coder/saq-qurylys/actions/runs/38756623850) exact SHA **success** для frontend/backend/browser-e2e. Job logs прочитаны через GitHub connector: **294 backend passed (101.46s), 22 browser passed (35.0s), 27 tool tests OK**. CI corpus также 36 cases, 80%/75%/18 из24, coverage 32/32, CER 157/6311, ошибок 0 и targets=false — совпало с локальным прогоном. Synthetic artifact `11983552716` сохранён на 14 дней (до 29.10.2026). Финальная фиксация — Markdown-only commit.

Документация: OCR_EVALUATION, corpus README, README/ARCHITECTURE/PLAN/REMAINING_CHECKLIST/CHANGELOG и этот статус. Нового ADR/зависимостей/API/миграций нет. Следующий шаг — targeted regression fixes оставшихся ошибок, затем новый holdout/проверка KZ носителем. Не считать завершёнными реальный collector, импорт госреестра, второй ПК, UX/предметную приёмку и защиту.

## Предыдущий блок — карта объектов

Реализована `/properties?view=map`: Leaflet 1.9.4, координаты из существующего API, серверные баллы/зоны, выбранная карточка и переход к полным сведениям. Поиск/зона/основание/страница общие со списком; переключение вида сохраняет URL. Добавлена явная пагинация, охват карты подписан как текущая страница. Непригодные координаты остаются в списке; ошибка тайла/JS не блокирует список, API-ошибка даёт retry без устаревших меток. Исправлена выявленная тестом активация метки Enter, поддержан Space. Публичные build args провайдера/атрибуции проходят проверку; default OSM, `disabled` отключает карту. Нет геокодирования, bulk/offline tiles, нового API и расчёта риска на клиенте. Устаревшая фраза об отсутствии OCR в обзоре заменена ссылкой на карту.

Проверки: `npx playwright test tests/map.spec.ts` — **5 passed**; `npm run test:e2e` — **22 passed (47.9s)** с настоящим OCR/PDF; `node --test scripts/test-map-config.mjs` — **1 test / 10 config cases passed**. `npm run lint`, `typecheck`, `format:check`, `npm audit --audit-level=high` (0 vulnerabilities) и production `docker compose -f docker-compose.yml -f docker-compose.dev.yml build frontend` passed. Обновлён только SAQ frontend через `up -d --no-deps frontend`; API/worker/db не пересоздавались. Backend source/миграции не менялись, отдельный локальный pytest не запускался. CI дополнен config test. Код опубликован в `718b28a43fe65d17fb24eef5f1290d850f007993`; локальный и удалённый main совпали. [GitHub run 38711042158](https://github.com/temirkhanerbolatovich-coder/saq-qurylys/actions/runs/38711042158) для точного SHA завершён **success**: frontend, backend и browser-e2e. Результат подтверждён GitHub API; job logs через публичный API недоступны, поэтому точные счётчики удалённого pytest не заявляются. Итоговая фиксация результата — отдельный Markdown-only commit.

Дополнительный живой просмотр: 8 OSM tile responses HTTP 200, 8 меток, нет предупреждений. Настоящий Chromium zoom через disposable extension `chrome.tabs.setZoom(2)`/`getZoom=2`, DPR=2, viewport/scrollWidth=720/720; keyboard/card/атрибуция доступны. Отдельный профиль закрыт, пользовательский браузер не менялся. Визуально просмотрены desktop, узкий режим и два screenshot при 200%. Evidence: `.local/map-focused.log`, `.local/map-full-browser.log`, `.local/map-build.log`, `.local/map-visual-result.json`, `output/qa/map-*.png` (ignored). Это не UX-приёмка 3–5 людьми. Перед публикацией: `git diff --check` passed; проверен 21 изменённый/новый UTF-8 файл, 75 локальных Markdown-ссылок, известных приватных значений и явных credential patterns не найдено. Самопроверка diff выполнена; API/формула/миграции сохранены.

Файлы: frontend/components/{property-map,workspace}.tsx, lib/{types,map-config}.ts, globals.css, dependency pins, Dockerfile/Compose/.env.example, tests/map.spec.ts, scripts/test-map-config.mjs и CI. Документация: [FEATURE_MAP](docs/FEATURE_MAP.md), README/ARCHITECTURE/UX/PLAN/CHANGELOG/checklist и этот статус. Это реализация существующего ADR-001; новое архитектурное решение не вводилось. Открыты collector, независимый OCR corpus, реестровый импорт P1, второй ПК, предметная/UX-приёмка и материалы защиты.

## Предыдущий блок — проверенное восстановление

По просьбе пользователя закрыть быстрые задачи при 25% остатка реализованы `scripts/backup_local.py create` и `verify`: короткая пауза только SAQ API/worker с возобновлением в finally, custom pg_dump, DB-referenced originals/PDF и манифест SHA/всех public-таблиц. Восстановление — только в UUID PostgreSQL 17.9 с network none/tmpfs, без рабочих volumes/портов; API из зафиксированного локального образа, восстановленный storage read-only, без seed/миграций/worker. Пути ограничены приватной `.local`, проверяются SHA/размеры и symlink/junction; cleanup только собственных точных CID. Автоматической перезаписи рабочей БД нет.

Фактически выполнены `python scripts/backup_local.py create` и `verify .local/backups/20261015T083816Z-d1fd756b7d1842bf9ea8ba7325c9b6ff`: **16 таблиц/1695 строк совпали**, включая **512 audit events**, скачан **171 Asset**, snapshots/decisions **9 сигналов** (6 с решениями), **6 прежних PDF assets и 6 READY PDF** через authenticated endpoint. Приватный результат `.local/restore-checks/20261015T083830Z-56226e04c5ac417598d378243cad21a1/result.json`: `verified=true`, `stage=complete`. Дамп 468000 байт; registered Assets суммарно 844206 байт (байты могут разделяться записями). SAQ API/worker возобновлены; работают прежние четыре контейнера, временные контейнеры удалены, чужие проекты не запускались.

Проверки инструмента: `python -m unittest discover -s scripts -p "test_*.py" -q` — на Windows 15 tests OK (1 symlink skip), в Linux контейнере **15 tests OK без пропусков**; Ruff check/format с backend/pyproject.toml и git diff --check passed. Проверены 10 UTF-8 файлов и 67 локальных Markdown-ссылок; известных локальных secrets и явных credential patterns в изменённых файлах нет. Backend/frontend не менялись; старые 279/17 не выдаются за новый локальный прогон. CI дополнен unittest и Ruff для инструмента. Код опубликован в `9d8bea3`; [GitHub run 38707574435](https://github.com/temirkhanerbolatovich-coder/saq-qurylys/actions/runs/38707574435) завершён **success** для backend/frontend/browser-e2e, новый шаг Check local backup tooling также success. Результат подтверждён GitHub API для точного SHA. Итоговая фиксация статуса — отдельный Markdown-only commit (без повторной CI-сборки). Документация: [LOCAL_BACKUP](docs/LOCAL_BACKUP.md), README/ARCHITECTURE/PLAN/CHANGELOG/чеклист и этот статус. Новых зависимостей/API/миграций/архитектурного решения нет. Копия содержит приватные DB-данные и не публикуется; внешний backup/retention/второй ПК и восстановление выполняющегося job остаются вне этой проверки.

## Предыдущий блок — источники данных

Пользователь предоставил 11 уникальных ссылок на реестры РК и Ashyq-набор. Создан [DATA_SOURCES](docs/DATA_SOURCES.md): исходные URL, наблюдавшийся доступ 15.10.2026, приоритет и оставшиеся условия. Прочитана публичная форма E-License по БИН/номеру/дате и официальное описание API data.egov.kz. Homeportal/Qazreestr/eQurylys при прямом чтении дали JS-оболочки; для части порталов наблюдались ошибки/timeout. У Ashyq прочитаны только заголовок набора и требование JavaScript; паспорт/выгрузка/охват/актуальность не установлены. Поиск конкретных компаний, авторизация, API-запросы, загрузки наборов и интеграции не выполнялись.

Реестровые ссылки больше не считаются отсутствующими. Следующий шаг для отдельного P1-импорта — проверить паспорт и условия выгрузки Ashyq или актуального набора data.egov.kz, затем ограниченный образец с происхождением и ручным сопоставлением. Рекламный C-01 остаётся BLOCKED: реестровый импорт не заменяет фактическую загрузку рекламного материала. Отсутствие строки/ошибка не дают R1; формула и процедуры review не изменены.

Файлы блока: docs/DATA_SOURCES.md, REQUIREMENTS/RESEARCH_REVIEW/REMAINING_CHECKLIST/PLAN/ARCHITECTURE, README и этот статус. Уточнены также оставшиеся устаревшие описания поддержки PDF и версии контракта в README/ARCHITECTURE по текущему коду и контракту 0.8.0-mvp. Проверки: одноразовый Python через stdin — 8 UTF-8 файлов, 67 локальных Markdown-ссылок существуют, все 11 исходных URL присутствуют, явных credential patterns в добавленном тексте нет; `git diff --check` passed. Независимая read-only проверка каталога не нашла фактических замечаний. Backend/frontend не менялись, runtime-тесты этого блока не запускались. Новый ADR не нужен: архитектурного изменения нет.

## Проверенный программный checkpoint — сигналы и исходные PDF

Docker запущен по явному разрешению пользователя. Работают только SAQ db/api/worker/frontend; сторонние проекты, включая AssetGuard, остались остановлены. Данные/volumes сохранены. Полный повтор предыдущего checkpoint 24b5c12: 192 backend passed (133.95s), 15 browser passed (38.2s), логи .local/signals-baseline-*.log. Прежний runtime BLOCKED закрыт этими проверками.

Реализованы /signals: immutable snapshot объекта, оснований, факторов, evidence и SHA-256 assets; DRAFT → CONFIRMED/RETURNED с причиной/автором/временем; версии без разветвлений; stale/optimistic revision/CSRF/roles/idempotency/audit. Решение автоматически ставит PDF своей ревизии в общую PostgreSQL очередь. Worker использует lease/claim token и revision fencing. PDF WeasyPrint 70.0: escaped server template, без внешних/file ресурсов, DejaVu RU/KZ, subprocess timeout, immutable content-hash asset. GET не создаёт jobs; failed/corrupt PDF можно явно перегенерировать. Старый draft PDF сохраняется отдельным asset.

Контракт 0.8.0-mvp: 36 операций = 34 implemented + 1 partial + 1 planned. Supporting upload принимает TXT/PNG/JPEG и passive PDF без изменения байтов/SHA. pypdf 6.20.1 проверяет все xref/objStm в bounded Linux subprocess: память 512 MiB, CPU/wall timeout до 10s, до 100 страниц по умолчанию, лимиты объектов/глубины/узлов и два слота на API process. Отказ до сохранения файла/Asset; API ожидает проверку в thread pool. Host Windows PDF получает 503; malformed header/EOF — 415. Формы/пароль/действия/вложения/внешние файлы отклоняются. Оригинал выдаётся только authenticated attachment, автоматический OCR PDF и баллы за upload отсутствуют. Новых endpoint или миграций нет.

Оставшийся partial у отдельного LegalBasis review намеренный: VERIFIED_ABSENT не выставляется одним документом, составной R1 уже реализован. Рекламный collector planned/BLOCKED; предоставленные реестровые источники исследуются отдельно. Полный P0 не принят. Добавлен GitHub job browser-e2e: fresh Compose, приватная конфигурация, права Linux storage, настоящий RU/KZ OCR и весь Playwright; Markdown-only commits не запускают полную сборку. Удалённый [CI для 20ab6f4](https://github.com/temirkhanerbolatovich-coder/saq-qurylys/actions/runs/38703582239) завершён **success**: backend **279 passed (69.59s)**, browser-e2e **17 passed** с настоящим RU/KZ OCR, frontend checks/build. Результаты прочитаны из job logs; cleanup disposable Compose завершён успешно.

## Проверки программного PDF/CI checkpoint

| Проверка | Фактический результат 15.10.2026 |
|---|---|
| Полный backend в Linux | Временный Linux test container Compose api, `pytest -q`, отдельная schema, source/contracts подключены read-only, зависимости dev во временном venv с system-site-packages, cache/pyc отключены — **279 passed (110.26s)**, `.local/supporting-pdf-final-backend-rerun.log`; public не сбрасывался |
| Полный browser | Из frontend `npm run test:e2e` — **17 passed (52.2s)**, `.local/supporting-pdf-final-browser.log`; реальные OCR/БД/review/сигналы/PDF/mobile |
| Focused проверки | Новый validator: 46 passed / 2 skipped на Windows; в полном Linux-прогоне все 48 выполнялись. Проверены active/escaped/unreferenced/objStm, шифрование, формы/вложения, лимиты/timeout/concurrency/protocol. API проверяет все 6 назначений, оригинал/SHA/idempotency/auth/scope и отдельный review/snapshot |
| Статика | Ruff check и format check — 53 файла; frontend typecheck/lint/format check passed |
| Миграции/зависимости | `alembic check`: новых upgrade operations нет; `pip check`: ошибок нет; `npm audit --audit-level=high`: 0 vulnerabilities |
| PDF | `output/pdf/signal-demo.pdf`, 10 страниц, около 37 KiB; DEMO/RU/KZ текстовые маркеры проверены; визуально просмотрены все 10 страниц на contact sheet, страницы 1 и 9 дополнительно в полном размере, читаемо/без перекрытий |
| Перед публикацией | Проверены 413 текущих/исторических Git blobs на известные secrets и явные credential patterns: 0 находок; это не полный security audit |
| GitHub/CI | Создан публичный [saq-qurylys](https://github.com/temirkhanerbolatovich-coder/saq-qurylys); `main` отправлена, локальный/удалённый SHA `dc595e24d9dc249448289b15948a590691abcbac` совпали. Первый [CI](https://github.com/temirkhanerbolatovich-coder/saq-qurylys/actions/runs/38696142426) завершён **success**: backend и frontend. В том первом прогоне browser E2E ещё не было; новый [CI 20ab6f4](https://github.com/temirkhanerbolatovich-coder/saq-qurylys/actions/runs/38703582239) включает 17 browser-тестов и все три job прошли. Workflow содержит PDF runtime dependencies и read-only permissions |

Новые файлы блока: backend/app/pdf_validation.py, backend/tests/test_pdf_validation.py и test_supporting_pdf.py, frontend/tests/supporting-pdf.spec.ts; обновлены 4 upload-формы, route/settings/dependency pins/OpenAPI/env/CI. Документация: FEATURE_SUPPORTING_PDF.md и ADR-007. Предыдущий сигнальный блок: backend/app/{signals,signal_dto,signal_pdf,pdf_render}.py, backend/app/api/{signals,signal_pdf}.py, модели/worker/jobs/settings, миграция e87f4d01a921, backend/tests/test_{signals,signal_pdf}.py, frontend/components/signals-workspace.tsx и frontend/tests/signals.spec.ts, контракт/env/Dockerfile/CI. Документация: [FEATURE_SIGNALS](docs/FEATURE_SIGNALS.md), [ADR-006](docs/decisions/ADR-006-immutable-signals-pdf.md), README/ARCHITECTURE/PLAN и [оставшийся чеклист](docs/REMAINING_CHECKLIST.md). Исходные PDF/DOCX/TZ не менялись; новые зависимости закреплены.

## Текущий P0 checklist

| Блок | Статус | Оставшаяся граница |
|---|---|---|
| Локальный реестр, DEMO 8/12, оригиналы, ручной ввод | VERIFIED локально | Другой ПК и предметная приёмка отдельно |
| OCR/гипотезы/matching/ручные R1–R6/риск/аудит | Функционально VERIFIED; quality OPEN | Rules-1.2: 36 synthetic regression cases, precision/recall 100%/100%, top-3 24/24; внешний holdout и KZ review ещё не приняты |
| Правовое основание и составной R1 | VERIFIED локально | PDF поддерживается по строгой политике; статус одного основания не заменяет составной R1 |
| Сигналы/версии/решения/PDF | VERIFIED локально | Retention, нагрузка и эксплуатационная приёмка отдельно; локальное восстановление проверено |
| Supporting PDF upload | VERIFIED в Linux Docker | Native Windows PDF 503; строгая политика отклоняет часть легитимных интерактивных/подписанных форм. Это не антивирус/очистка PDF |
| Карта | VERIFIED локально | Общие filters/page/card/fallback; 5 новых E2E, mobile/keyboard/200% zoom. Текущая страница, без геокодирования/offline tiles |
| Дизайн-система/UX | Реализовано и технически проверено локально | 35 browser tests, 32 responsive observations, keyboard/contrast/zoom; UX 3–5 людьми, screen reader и реальные устройства отдельно |
| Постоянная UI/UX-инфраструктура | Реализована и проверена локально | Repo Skill/search/Codex discovery, каталог/AGENTS, shared components, reset; входят в текущие 35 browser tests. Другой ПК/личные disabled settings отдельно |
| Источники реестров | Каталог проверен, интеграции OPEN | 11 ссылок предоставлены; паспорт/выгрузка/условия конкретного набора и реальный импорт не проверены |
| Рекламный collector C-01 | BLOCKED | Нужен подходящий рекламный URL/условия, SSRF/redirect/limits и реальный импорт; каталог реестров не закрывает C-01 |
| PostgreSQL+storage backup/restore | VERIFIED на текущем ПК | 16 таблиц, 1093 audit events, 335 Assets, 22 READY PDF; внешний backup, второй ПК и job recovery отдельно |
| Полная приёмка/публикация | IN PROGRESS | Второй ПК, UX 3–5 людьми, защита и сдаваемый SHA |

## Следующее конкретное действие

Новый внешний непросмотренный OCR holdout с правами и проверкой KZ-разметки человеком. Правила исторического контекста, тыс./переносов и KZ-названий уже исправлены и проверены в rules-1.2, повторять этот блок не нужно. Независимо: UX-проверка 3–5 людьми по UI_AUDIT/UX_GUIDELINES, screen reader/touch devices, второй чистый ПК и предметная приёмка. Для отдельного P1-реестра — паспорт/охват/разрешённый образец Ashyq либо data.egov.kz по DATA_SOURCES. Рекламный collector C-01 остаётся BLOCKED до подходящего рекламного URL/условий. Живой показ и сдаваемый SHA требуют подготовки команды; презентацию и видео пользователь исключил. Автопамять не перенастраивать: контекст сохранён здесь.

## История сессий

- 15.10.2026, Codex: от `1577cac` реализован UX «материал → review → сигналы»: прямой переход/focus, группы форм/hints/file size, четыре этапа review/actual count, URL context/history и отсутствие предыдущей очереди при новом фильтре. 35 final browser passed, static/build/audit0 и 32 responsive observations passed; backend/API/данные/guards сохранены. Код `8434d1b` опубликован; exact-SHA CI `38779704092` success: 294 backend/35 browser/27 tool и Skill smoke. Результат сохранён Markdown-only commit.

- 15.10.2026, Codex: от `5bd0cca` внедрены pinned repo UI UX Pro Max, два фактических Codex discovery/search, shared Pagination/TableRegion/reset, H1–H6 tokens, UI_COMPONENTS/UI_IMPLEMENTATION_PLAN и постоянные правила AGENTS. 30 browser / 8 focused, 32 responsive и visual RU/KZ passed; backend/API/данные/dependency locks сохранены. Код `d2d9c6b` опубликован; exact-SHA CI `38768212690` success: 294 backend/30 browser/27 tool и Skill smoke. Финальный статус — Markdown-only commit.

- 15.10.2026, Codex: от `59e870a` выполнены аудит/направление и дизайн-система рабочего досье; 27 browser, финальный UI smoke 5/5, 32 responsive observations, contrast/keyboard/real zoom, static/build passed. Код `53e9ef0` опубликован; exact-SHA CI `38762778431` success: 294 backend/27 browser/27 tooling. Backend/API/данные/риск сохранены. Документация и правило AGENTS добавлены; финальная фиксация статуса — Markdown-only commit.

- 15.10.2026, Codex: продолжение от ffaf5de; 36 synthetic cases/evaluator, baseline/alias fix 8→18 из24 top-3, quality targets OPEN; 293 Linux backend +15 focused,27 Linux tool,22 browser passed; код cba28ec и evidence опубликованы; CI 38756623850 success: 294 backend/22 browser/27 tooling, качество OPEN.

- 15.10.2026, Codex: продолжение от `0927727`; карта/пагинация/fallback, 5 новых E2E, 22 browser passed, 10 вариантов конфигурации, production build и live OSM/200% zoom. Документация обновлена; код `718b28a`, GitHub run `38711042158` success для всех трёх jobs.

15.10.2026, быстрые задачи при 25% лимита: реализована и фактически выполнена согласованная копия/изолированное восстановление PostgreSQL+storage с проверкой таблиц, аудита, снимков/решений и скачиванием сохранённых PDF. Рабочая БД не перезаписывалась, API/worker возобновлены; копия/восстановленные файлы/отчёт остаются в игнорируемой .local. Состояние и проверки описаны выше и в LOCAL_BACKUP. Скрипт и тесты добавлены в GitHub CI; публикация по ранее полученному разрешению, текущая ревизия — git log -1.

15.10.2026, источники РК: исследованы предоставленные пользователем публичные страницы, каталог из 11 исходных ссылок и условия дальнейшего исследования сохранены в DATA_SOURCES; требования/план/архитектура/исследование/чеклист/README синхронизированы. Программный код, контракт, исходные PDF/DOCX/TZ, данные и контейнеры не менялись. API и реестровый импорт не проверялись; C-01 остаётся рекламным collector. Проверки diff/ссылок прошли. Блок сохраняется отдельным Markdown-only commit по ранее полученному разрешению на GitHub push; до публикации origin/main = `4bf01c6`, ревизия самого блока — `git log -1`. Полная CI-сборка для Markdown-only изменений не запускается согласно workflow.

15.10.2026, публикация PDF/CI: code commit `20ab6f4` отправлен в origin/main; GitHub run `38703582239` success. Из job logs подтверждены 279 backend/17 browser и успешный RU/KZ OCR. Изменения статуса/чеклиста сохраняются отдельным Markdown-only commit; повторный CI не требуется и не запускается согласно paths-ignore. Локальные данные и секреты не публиковались.

15.10.2026, исходные PDF: добавлены bounded validation, формы и полный browser CI job. Первый Linux-прогон дал 273 passed / 6 failed из-за общего signed/client fixture в новом тесте анонимного доступа; после отдельного anonymous TestClient полный повтор дал 279 passed. Browser 17 passed. Production-контроль доступа не менялся. Новая зависимость pypdf закреплена; данные/volumes и сторонние остановленные проекты сохранены.

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
