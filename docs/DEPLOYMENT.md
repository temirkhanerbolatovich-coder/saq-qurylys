# Публичное размещение SAQ QURYLYS

## Все накопленные изменения ·18.10.2026

По явному запросу «опубликуй все изменения» обновлены API, worker и frontend.
Текущий адрес: **https://voice-cultures-brandon-independence.trycloudflare.com**.
Прежний contacted-string-quiz-kinda туннель был остановлен; новый создан штатным
`scripts/share_site.ps1 -Action Start`, HTTPS Origin/Secure cookie сохранены.
Ссылка требует работающего компьютера, Docker и сети; это временный tunnel, не VPS.

На входе db/api/frontend были остановлены, worker работал. Восстановлена прежняя
DB; до установки создана копия
`.local/backups/20261018T163635Z-9b3940c63f384e0196f0b92e3a34b6c8`.
`backup_local.py create/verify` PASS, restore в отдельных временных контейнерах.
Рабочую БД из копии не восстанавливали. Прежние image IDs сохранены tags
`saq-qurylys-{api,worker,frontend}:rollback-before-875e288`; не удалять до приёмки.

Candidate images собраны из875e288:
`saq-qurylys-api:publish-875e288` (API/worker) и
`saq-qurylys-frontend:publish-875e288`. Установка — прежние compose/dev/tunnel
файлы + private candidate image override, `up -d --no-build --no-deps --wait
api worker frontend`. После локальной health/data проверки candidate также
помечены стандартными api/worker/frontend latest, затем helper применил новый
публичный Origin. Приватная `.env`, DB container/image/volume и storage mounts
сохранены. Новых миграций между рабочим backend и этим срезом нет.
Позднейшие2f40242/4b8a665 меняют только тесты/статус, runtime875e288 им соответствует.

До публичных auth-проверок fingerprints всех24таблиц совпали с backup,555Assets
сохранены. После HTTPS smoke совпали23таблицы; sessions изменились ожидаемо от
тестовых входов, бизнес-таблицы/audit/сигналы/источники прежние. Чужие сессии
не удалялись. Полный DB/storage образ не подменялся QA schema или seed fixtures.

Публичный Chromium:11страниц×375/768/1024/1440=44наблюдения, overflow0,
pageerrors0/businesswrites0; anonymous401/login200/Secure cookie/wrong Origin403/
logout204. Проверены новые tabs6/4, GREEN+UNKNOWN, mobile focus/Escape/draft,
читаемый выбор версии, серверные поиск/priority/structure/signals. Исходный Asset
SHA и historical READY PDF SHA из backup совпали; read-only PDF properties/assets/
signals фактически вернули21308/19477/25381bytes с PDF signature.
Первый smoke helper ошибочно ожидал tbody в кратком карточном виде; исправлен
только locator helper, повторный44PASS. Это не ошибка рабочего списка.

Код отправлен в отдельную GitHub-ветку `codex/audit-workflow-fixes`, main без merge.
Первый чистый CI выявил fixture/race ошибки тестов, исправленные2f40242/4b8a665:
собственный DEMO-кандидат/typed snapshot в chooser, property scope status-search,
ожидание URL reset до reload. Runtime code не менялся. Финальный результат CI
e690378: [CI39146844077](https://github.com/temirkhanerbolatovich-coder/saq-qurylys/actions/runs/39146844077)
success во всех3jobs,893backend PASS217.19s и130browser PASS3.8m;
[PR №4](https://github.com/temirkhanerbolatovich-coder/saq-qurylys/pull/4) создан,
не объединён. Публичный smoke не заменяет записывающий E2E.
Локально до публикации full browser130PASS; после test-only fixes12PASS repeated,
backend57PASS/1Windows native-Pango SKIP52.92s; Linux PDF подтверждён выше.

Приватные evidence/config/logs: `.local/publish-all-20261018/`, public PNG
`output/qa/publish-all-20261018/` — ignored. Исходный аудит/открытые требования
не закрыты фактом установки; [сверка20пунктов](audits/SAQ_QURYLYS_UI_UX_RECONCILIATION_2026-10-18.md).
Старые адреса и утверждения о неопубликованном срезе ниже исторические.

## Установлен интерфейс B0–B3 · 18.10.2026

Текущий адрес: **https://contacted-string-quiz-kinda.trycloudflare.com**. Прежний туннель был
остановлен; штатный share_site.ps1 Start создал новый и применил к API публичный
origin/Secure cookie. .env/образы backend/worker и рабочие DB/storage сохранены.
После этого baseline API/worker/DB IDs/start times/env hashes/mounts не менялся:
обновлён только frontend из source e2dfefd, включая709a0be/f7e8358.

Docker candidate `saq-qurylys-frontend:ui-b0-b3-e2dfefd`, image5199009d9fad…,
установлен прежними compose/dev/tunnel файлами и private image override через
`up -d --no-build --no-deps --wait frontend`. Прежний image сохранён rollback tag
в .local/deploy-ui-b0-b3-20261018/rollback-tag.txt. После успешной проверки новый
image также помечен `saq-qurylys-frontend:latest`; future standard startup использует
его. Не удалять rollback image до завершения приёмки. Приватная конфигурация/QA
не входят в Git, новых миграций и изменения business state не требовалось.

Публичный Chromium:11страниц×4ширины=44PASS, overflow0/pageerrors0/businesswrites0;
anonymous401/login200/Secure cookie/wrong Origin403/logout204, новые секции/
черновик/группировка, прежний Asset SHA и PDF62384bytes PASS.
Это read-only smoke;103browser E2E проверены ранее отдельно на изолированной БД,
не на рабочей установке. Полный статус/границы — PROJECT_STATUS. Новый source
ещё не опубликован через GitHub; установка сайта и GitHub-публикация различаются.
Сервисы и временный туннель включены. Старые URL ниже исторические.

## Текущее восстановление · 17.10.2026

После остановки Docker Desktop восстановлены прежние четыре SAQ сервиса
без build и замены данных/образов. Новый туннель запущен через штатный
`scripts/share_site.ps1 -Action Start`; публичный origin и Secure cookie
применены helper, приватная `.env` не менялась. Текущий адрес:
**https://honey-identity-approx-hotel.trycloudflare.com**. Прежние адреса ниже
исторические; актуальная локальная ссылка всегда в `.local/tunnel/url.txt`.

Свежий Chromium smoke: 9 страниц × 4 ширины = 36 наблюдений, overflow0,
pageerrors0, business mutations0. Вход/Secure cookie/anonymous401/logout204,
очередь/сравнение и SHA-256 существующего скачанного Asset PASS. Сквозной
записывающий E2E и новый OCR этим не проверялись. Сервисы и туннель включены;
ссылка требует работающего компьютера, Docker и сети. Evidence и границы —
[PROJECT_STATUS](../PROJECT_STATUS.md).

## Frontend-only обновление PR №3 · 17.10.2026

Установлен проверенный frontend из main4552d44 после зелёного PR/push CI.
API/worker/DB container IDs/start times, env hash и URL сохранены. Кандидат прошёл
95browser tests на отдельных DB/storage; прежний image сохранён private rollback
tag, кандидат назначен также стандартному `saq-qurylys-frontend:latest`.
Обновлён только frontend прежними compose/dev/tunnel файлами с
`--no-build --no-deps --wait`; новых миграций/конфигурации нет. HTTPS smoke9страниц
на4ширинах:36наблюдений без overflow/pageerrors/businesswrites; login/Secure cookie/
queue/comparison/скачанный Asset SHA/logout PASS. Собственный acceptance остановлен,
рабочая установка включена. Открытая вкладка получает новую версию при обновлении;
текущий временный URL остаётся ниже. Старые блоки ниже относятся к прежним срезам.

## Восстановление и обновление сайта · 17.10.2026

Docker Desktop вновь запущен; восстановлены только существующие SAQ сервисы.
PostgreSQL volume/рабочая `.env`/storage сохранены. До обновления создана копия
`.local/backups/20261017T160600Z-7e8c40f6772d428284d87f3e03996da0`; её изолированное
восстановление подтвердило 24 таблицы, 1936 audit events, 553 скачанных Assets,
66 сигналов и 44 READY PDF. Непосредственно перед обновлением сохранена ещё одна
согласованная копия `.local/backups/20261017T170528Z-ca3fd046e0de4d5287d3cc40b945a753`.

Текущий временный адрес: **https://casey-medicine-feed-bowl.trycloudflare.com**.
Проверен настоящим Chromium через HTTPS после обновления API/worker/frontend:
login200/Secure cookie, anonymous registry401, logout204; 12 наблюдений
dashboard/queue/comparison на375/768/1024/1440, overflow0/pageerrors0.
После входа браузер выполнял только GET; бизнес-записей smoke не создавал.
Существующий исходный Asset дополнительно скачан и проверен по SHA-256.
Новые backend/UI блоки сначала проверены на отдельной БД/storage и loopback портах.
Этот стенд остановлен; четыре рабочих SAQ сервиса и туннель оставлены включёнными.
Код опубликован через [PR №2](https://github.com/temirkhanerbolatovich-coder/saq-qurylys/pull/2),
main `d95c95d`; новая отдельная `codex/ui-updates` пока не включена.

Поднятые сервисы используют новые rules-1.6 и UI; Origin/Secure cookies сохранены
через прежний tunnel override. Это временная публикация с компьютера, не VPS.
Старый адрес ниже — исторический, больше не является текущей ссылкой.
Реальные записывающие приёмочные тесты требуют `SAQ_ISOLATED_ACCEPTANCE=1` и
loopback: не включать этот флаг для рабочей/публичной установки.

Дополнение17.10.2026: во время обновления открытых источников перестроены api/worker/frontend, применены аддитивные миграции, сохранены текущий URL и HTTPS origin. Перед миграцией создана локальная копия. Проверки по публичному origin включили реальные HTML/PDF загрузки, а не только login. При обновлении уже работающего туннеля после `docker compose build api worker frontend` использовать тот же override:

```powershell
docker compose -f docker-compose.yml -f docker-compose.dev.yml -f .local/tunnel/compose.json up -d --no-deps --wait api worker frontend
```

Для существующих browser E2E при активном sharing из каталога frontend: `$env:SAQ_E2E_BASE_URL=(Get-Content ../.local/tunnel/url.txt -Raw).Trim()` перед `npm run test:e2e`. Локальный default остаётся localhost3000. Серверные auth/Origin/CSRF не ослабляются; helpers отправляют фактический origin. E2E создают учебные записи, поэтому запуск относится к согласованному MVP-контру. Короткий502 во время пересоздания frontend не означает потерю данных; дождаться healthy перед проверкой.

## Проверка готовности компьютера · 17.10.2026

Из корня: `python scripts/check_readiness.py --report .local/readiness-new.json`. Read-only stdlib CLI проверяет Docker Linux/Compose/локальные образы, принадлежность и состояние четырёх контейнеров, API health/БД, чтение storage, Tesseract rus/kaz/eng, PDF в памяти и localhost login HTML. Ничего не устанавливает/перезапускает, не меняет данные/auth, не обращается к внешним сервисам и не печатает env/credentials. Timeout5–60сек на команду; существующий JSON не перезаписывается. Exit0 — предпосылки пройдены,1 — блокер/непроверенное,2 — ошибка CLI/вывода.

Фактический `.local/readiness-20261017-final.json`:15PASS/1FAIL. Блокер `local_auth_config` ожидаем: текущие публичный HTTPS Origin и Secure cookies не разрешают локальный HTTP-вход. Для автономного показа сначала выполнить обычный Stop helper ниже, затем повторить диагностику; скрипт сам sharing не отключает. Это не реальная проверка автономного входа/OCR/PDF-сценария/записи storage/целостности файлов/второго ПК. Cloudflare, импорт сайтов, тайлы, Threads и Telegram помечаются NOT_CHECKED и требуют сети. Ссылку можно продолжать использовать в текущем режиме.

## Активный Cloudflare Tunnel · 16.10.2026

Пользователь выбрал временную публикацию с компьютера. Текущая ссылка, проверена 17.10.2026: https://stamp-whose-proceeds-budgets.trycloudflare.com. Предыдущий адрес утрачен после сетевого разрыва (Tunnel not found); живой процесс не гарантирует доступность. Предварительная инструкция VPS ниже остаётся альтернативой, не описанием текущего размещения.

cloudflared 2026.9.1 работает фоновым процессом Windows с HTTP/2 на localhost:3000. Игнорируемый каталог `.local/tunnel/` содержит PID/start time, URL, логи и Compose override. Приватная `.env` не изменена. Override задаёт API публичный APP_ORIGIN и SESSION_COOKIE_SECURE=true. Пересоздан только API; auth/CSRF сохранены. Данные остаются локально, запросы проходят через Cloudflare.

Управление из PowerShell в корне проекта:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/share_site.ps1 -Action Status
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/share_site.ps1 -Action Stop
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/share_site.ps1 -Action Start
```

Stop проверяет PID и время старта cloudflared, затем восстанавливает локальную конфигурацию API. Start требует работающего Docker/проекта на порту 3000 и получает новый URL. Уже запущенный туннель повторно не создаётся. Helper рассчитан на текущий локальный Compose с dev override; автозапуск Windows и режим сна не меняет.

Пока sharing включён, вход и команды выполняйте через HTTPS URL: localhost-Origin не разрешён. После Stop снова используйте localhost. Пересоздание API без tunnel override вернёт локальный origin; в этом случае остановите и заново запустите helper.

Посетителю нужны ссылка и учётная запись. Действующие credentials аналитика находятся в `.local/credentials.txt` и дают право изменений. Новых пользователей не создано; гостевой доступ не включён. Для широкой демонстрации следует отдельно создать viewer. Пароль аналитика не публиковать вместе со ссылкой.

Проверено публичным HTTPS-клиентом повторно 17.10.2026: login page 200; anonymous registry 401; login 200; authenticated registry 200, 8 объектов; Secure cookies; посторонний Origin 403; logout 204. Доказательство без секретов: `.local/tunnel/verification.json`. Status и повторный Start проверены без дублирования процесса; Stop и новый Start проверены при восстановлении. Исправлено чтение ещё пустого log при запуске. Полный OCR/PDF по туннелю не повторялся.

Ссылка зависит от включённых компьютера, интернета, Docker и cloudflared; после перезапуска адрес меняется. Quick Tunnels не гарантируют uptime: [Cloudflare](https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/).

## Предварительная подготовка VPS

Статус 16.10.2026: публикация запрошена пользователем. Подготовлена конфигурация одного Linux-сервера с Docker Compose; проверен существующий Oracle, но целевой сервер, домен и доступ посетителей ещё требуют выбора. Доступный Oracle имеет 952 MiB RAM, около 390 MiB available и работает с LifecycleKASE; локальный SAQ idle занимает около 516 MiB. Совместный запуск не выполнялся из-за недостаточного запаса памяти. Публичной рабочей ссылки ещё нет. Локальная конфигурация не изменена.

## Почему сервер

Приложению нужны Next.js, FastAPI, постоянный PostgreSQL и worker с Tesseract/Pango. API и worker используют один каталог исходников/PDF. Один сервер сохраняет существующую архитектуру. Размещение только frontend не обеспечивает рабочий сценарий. Раздельные облачные сервисы потребуют общего объектного хранилища или другой организации файлов.

Render Free не поддерживает persistent disk, Railway free credit ограничен; бесплатный постоянный запуск всего набора не подтверждён. Существующий VPS можно использовать после проверки свободных ресурсов, места, портов и соседних приложений. Оплачиваемые ресурсы не создавать без согласованного бюджета.

## Развёртывание на выбранном сервере

1. Выделить отдельный каталог проекта. Передать проверенный исходный код без `.env`, `.local`, `storage`, тестовых результатов и `node_modules`. Текущий локальный checkout содержит неопубликованные изменения: clone текущего GitHub сам по себе не переносит новый интерфейс. Не переносить локальную базу автоматически; свежий запуск создаёт DEMO seed.
2. В новом каталоге выполнить `python3 scripts/configure_local.py`. Он создаёт отдельные случайные секреты и не перезаписывает существующую конфигурацию. Ограничить чтение `.env` и `.local/credentials.txt` владельцем (`chmod 600`). Пароль аналитика не публиковать вместе со ссылкой.
3. В приватную `.env` добавить `PUBLIC_HOST` — только DNS hostname, без схемы/пути; выбрать свободный `APP_PORT`, например 3000. Для согласованности прямых команд также задать `APP_ORIGIN=https://<hostname>` и `SESSION_COOKIE_SECURE=true`. Публичный override принудительно использует эти HTTPS-настройки в API и worker.
4. Подготовить каталог `storage` по Linux-инструкции README, с владельцем UID/GID пользователя `saq` из собранного образа. Не менять рекурсивно права чужих каталогов. Обеспечить постоянный диск и резервное копирование БД вместе с исходниками; существующая процедура — `scripts/backup_local.py`.
5. Собрать и запустить:

```sh
docker compose -f docker-compose.yml -f docker-compose.public.yml config --quiet
docker compose -f docker-compose.yml -f docker-compose.public.yml up --build -d --wait
```

Не подключать `docker-compose.dev.yml`: БД не должна публиковать порт. Frontend остаётся на `127.0.0.1:${APP_PORT}`, API и PostgreSQL внутри Docker. Override добавляет restart policy для восстановления после перезапуска сервера; сам Docker также должен запускаться при загрузке ОС.

6. Настроить DNS на сервер и HTTPS reverse proxy. Если Caddy уже обслуживает другие сайты, добавить отдельный site block, сохранив существующие. Проверить конфигурацию перед reload; не заменять общий Caddyfile. Пример для Caddy на хосте, порт должен совпадать с APP_PORT:

```caddyfile
saq.example.org {
    reverse_proxy 127.0.0.1:3000
}
```

`saq.example.org` — пример, не готовый адрес. Для автоматического сертификата нужны корректный DNS, доступные порты 80/443 и постоянное хранилище сертификатов. Если proxy находится в контейнере, его localhost не является хостом: адрес upstream определяется фактической сетью отдельно.

## Доступ и приёмка ссылки

Текущая версия требует вход: публичного guest-view и регистрации нет. Роль viewer реализована, но интерфейса самостоятельного создания пользователей нет. Способ выдачи доступа выбирается до передачи ссылки. Не превращать общий пароль аналитика в публичную гостевую учётную запись и не выключать auth/CSRF ради демонстрации.

После публикации проверить извне: доверенный TLS и HTTP→HTTPS; страницу входа; Secure/HttpOnly cookies; вход и CSRF на фактическом origin; реестр; загрузку DEMO TXT/PNG → реальный worker → ручную проверку → PDF. После перезапуска проверить сохранность записи и исходного файла. Убедиться, что порты API/БД закрыты извне. Результат и точный адрес записать в PROJECT_STATUS; `config --quiet` и локальная сборка не являются проверкой публичной доступности.

Известное ограничение текущего login throttle: Next proxy не передаёт клиентский IP, API видит адрес proxy и считает неудачные попытки совместно. Для небольшой закрытой демонстрации это защищает от перебора, но может временно ограничить вход другим посетителям. Перед открытой массовой регистрацией нужны отдельное решение по доверенному proxy/IP, ограничения нагрузки и управление пользователями.

## Источники

- [Docker Compose в production](https://docs.docker.com/compose/how-tos/production/)
- [Caddy automatic HTTPS](https://caddyserver.com/docs/automatic-https)
- [Render Free: ограничения](https://render.com/docs/free), [persistent disks](https://render.com/docs/disks)
- [Railway trial/free credits](https://docs.railway.com/pricing/free-trial)

Проверены 16.10.2026; условия провайдеров могут измениться.
