# Приёмка новой локальной установки

Цель — повторить запуск из исходников с новыми секретами, пустыми PostgreSQL и
storage, затем получить новый DEMO материал, принять отдельные решения и скачать
архивный PDF. Изолированный стенд на том же компьютере проверяет этот рецепт;
требование O-08 о втором физическом ПК закрывается отдельным наблюдением.
Точные результаты, ревизия и сохранённые артефакты — [PROJECT_STATUS](../PROJECT_STATUS.md).

## Подготовка

Нужны Python 3.12+, Docker с Linux engine/Compose, Node.js 24 и свободный порт3090.
Для браузерной проверки нужны Chromium Playwright и Python-пакеты из
`backend/requirements-dev.txt`; для просмотра PDF — Poppler. Требования и права
storage на Linux/WSL описаны в [README](../README.md#первый-запуск-на-linuxwsl).

Используйте **отдельный Git clone** проверенного SHA ветки main. Полный исходный
срез интегрирован через [PR №5](https://github.com/temirkhanerbolatovich-coder/saq-qurylys/pull/5)
в merge-коммит 24811c2; старые SHA не эквивалентны ему. Выберите ревизию с успешным
CI и зафиксируйте git rev-parse HEAD. Не переносите
`.env`, `.local`, storage, output, node_modules, .next, .venv или чужие credentials.
Повторно использовать существующую рабочую папку или PostgreSQL volume нельзя.

Для параллельного стенда во всех Compose-командах указывайте один новый project:

```powershell
python scripts/configure_local.py --port 3090 --no-demo-seed
docker compose -p saq-acceptance-example build
docker compose -p saq-acceptance-example up -d --no-build --wait --wait-timeout 180
```

Имя `saq-acceptance-example` — пример: выберите ещё не использованное. Dev override
для этого рецепта не нужен: API/БД не публикуются на хосте. Другой порт сам по себе
не изолирует БД/storage. На Linux перед `up` подготовьте права новой папки по README,
добавив тот же `-p` к команде подготовки. Docker может использовать build cache;
такой запуск не доказывает установку всех зависимостей без кеша/интернета.

## Пустой запуск и сохранность конфигурации

Откройте localhost3090 и войдите с новыми данными из приватного
`.local/credentials.txt`. Секреты не включайте в отчёт. Проверьте:

- аналитик существует; реестр, материалы, кандидаты, сигналы, сохранённые профили
  и расписания пусты; в storage ещё нет файлов;
- схема обновлена до единственного Alembic head; создание аналитика не требует
  DEMO fixtures и не включает Threads, Telegram или расписания;
- повтор генератора отказывается перезаписывать любой из приватных файлов;
  после отказа их SHA совпадают с первоначальными;
- повторный запуск API сохраняет существующие учётную запись, пароль и роль.

`DEMO_SEED_ENABLED=false` не удаляет ранее внесённые записи. В native-режиме
отдельный bootstrap выполняется как `python -m app.seed --bootstrap-only`;
Compose выбирает его по флагу. Не меняйте flag на true на рабочей базе ради теста.

## Новый материал и отдельные решения

Из корня новой копии с активированным Python environment:

```powershell
$env:SAQ_ISOLATED_ACCEPTANCE = '1'
$env:SAQ_E2E_BASE_URL = 'http://localhost:3090'
python scripts/verify_ocr.py
cd frontend
npm ci
npx playwright install chromium
$env:SAQ_E2E_BASE_URL = 'http://localhost:3090'
$env:SAQ_ISOLATED_ACCEPTANCE = '1'
npx playwright test tests/zz-tz-v2-journey.spec.ts
cd ..
```

OCR проверяет два синтетических RU/KZ изображения через настоящий API/worker;
это smoke, а не независимое измерение точности. CSV-сценарий сам создаёт новый
DEMO источник/кандидата/досье; прежний seed ему не нужен. Он проверяет preview
без создания материала, commit без автоанализа/привязки/риска, исходные CSV/текст,
разные даты, самостоятельные привязку/гипотезу/фактор/сигнал и новую версию,
сохраняющую прежние snapshot/решения/PDF. UNKNOWN не превращается в R1.

Из напечатанной UUID-папки артефактов:

```powershell
python scripts/verify_intake_journey.py "output/qa/intake-journey-20261019/<UUID>"
pdftoppm -png "output/qa/intake-journey-20261019/<UUID>/signal-archived.pdf" "output/qa/intake-journey-20261019/<UUID>/page"
```

Просмотрите **каждую** страницу: DEMO/оговорка, UNKNOWN, R2/25, источник/даты,
цитата/SHA и пагинация должны читаться без обрезаний. Offline verifier не
обращается к приложению и не заменяет этот просмотр. Прежние UUID-папки сохраняйте.

## Перезапуск и завершение

```powershell
docker compose -p saq-acceptance-example restart
docker compose -p saq-acceptance-example up -d --no-build --wait --wait-timeout 180
```

После готовности заново войдите, откройте прежний deep link архивного сигнала и
материал. Повторно скачайте оригинальный текст и PDF. Сравните SHA с evidence.json,
snapshot и решения — с historical_signal. GET `/api/v1/signals/{id}`,
`/api/v1/signals/{id}/pdf` и `/api/v1/assets/{id}` должны вернуть прежние данные;
новая версия не заменяет архивную. Убедитесь, что расписания остались пустыми.

Остановите только свой project через `docker compose -p saq-acceptance-example stop`.
Данные, секреты, логи и артефакты оставьте для разбора; `down -v` не нужен.

Отдельно на рабочем штатном project проверьте свежую согласованную копию DB/storage
по [LOCAL_BACKUP](LOCAL_BACKUP.md). Этот инструмент намеренно проверяет identity
`saq-qurylys` и каталог рабочего checkout: не отключайте guard для другого QA project.
Restore выполняется в одноразовом изолированном окружении, не в рабочей БД.

Открытые внешние условия: второй физический ПК, независимая RU/KZ/OCR/UX и
предметная приёмка, согласованный конечный SHA с его CI и фактическая сдача.
Исходники/UI Social Monitoring V2 реализованы; live-доступ, полный P0 и внешняя приёмка остаются отдельными открытыми условиями.

## Полная browser-регрессия — отдельный стенд с DEMO

Полный набор включает старые сценарии, которым нужны восемь seed-объектов и два
OCR-материала. Для него подготовьте **ещё одну свежую копию**, новый Compose project
и пустые DB/storage; не используйте рабочую базу или уже пройденный пустой сценарий.
Остановите предыдущий QA, чтобы освободить3090. В новой копии конфигурация создаётся
с DEMO по умолчанию:

```powershell
python scripts/configure_local.py --port 3090
docker compose -p saq-browser-example up --build -d --wait --wait-timeout 180
$env:SAQ_ISOLATED_ACCEPTANCE = '1'
$env:SAQ_E2E_BASE_URL = 'http://localhost:3090'
python scripts/verify_ocr.py
cd frontend
npm ci
npx playwright install chromium
$env:SAQ_E2E_BASE_URL = 'http://localhost:3090'
$env:SAQ_ISOLATED_ACCEPTANCE = '1'
$env:SAQ_QUERY_PROFILES_LIVE = '1'
$env:SAQ_URL_SCHEDULES_LIVE = '1'
$env:PLAYWRIGHT_JSON_OUTPUT_FILE = '../output/qa/browser-results.json'
npx playwright test --output=../output/qa/browser-results --reporter=list,json
cd ..
docker compose -p saq-browser-example stop
```

Имя project тоже должно быть новым. На Linux/WSL перед стартом нужны права storage
из README. Запускайте после готовности frontend proxy. Конфигурация Playwright
читает credentials из `.env` именно этой копии; не подставляйте рабочий пароль.
workers1/retries0 сохраняют диагностическую ценность первого полного прогона.
Два typography A/B остаются opt-in и по умолчанию пропускаются. Остальные live
opt-in флаги выше включают реальные новые профили и OFF/enable/reload/disable
расписания; последняя проверка выключает своё расписание до назначенного срока.

После исправлений повторяйте весь набор на новой БД, сохранив первый result/log.
Сумма выбранных повторов не означает успешного полного прогона. Финальные
результаты/команды/известные ограничения записываются в PROJECT_STATUS/UI_AUDIT.
