# Публичное размещение SAQ QURYLYS

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
