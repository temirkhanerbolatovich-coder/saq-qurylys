# Linux VPS: установка, обновление и откат

Это руководство для собственного сервера Docker Compose. Критические шаги сначала выполнять на изолированном стенде. Рабочий deployment в рамках repository cleanup не изменяется. Фактически проверенные команды/ограничения этой ревизии — [REFACTOR_REPORT](REFACTOR_REPORT.md).

## Сценарии

| Сценарий | Compose | Назначение |
|---|---|---|
| Локальный | docker-compose.yml | Loopback UI3000, private API/DB, DEMO по умолчанию |
| Native dev | base + docker-compose.dev.yml | Дополнительно loopback PostgreSQL55432; не public server |
| VPS с proxy на хосте | base + docker-compose.public.yml | HTTPS Origin, Secure cookies, log rotation/restart; UI loopback |
| Выделенный VPS | base + public + docker-compose.https.yml | Caddy80/443 и persistent certificates |
| Загруженные amd64 images | предыдущие + docker-compose.prebuilt.yml | Требует SAQ_API_IMAGE/SAQ_FRONTEND_IMAGE и --no-build |
| Временный tunnel | scripts/share_site.ps1 | Зависит от компьютера/Docker/сети; отдельный локальный сценарий |

Public overlay не является reverse proxy сам по себе. Dev overlay на публичном сервере не применять. Prebuilt не универсален для ARM64: задаёт linux/amd64. [Oracle installation note](ORACLE_DEPLOYMENT.md) описывает конкретную Micro и исторические source-архивы; для новой установки используйте Git checkout ниже.

## Подготовка сервера

Нужны Linux x86_64/arm64, Git, Python3.12+, Docker Engine и Compose plugin (2.35+ для config --no-env-resolution, [release note](https://github.com/docker/compose/releases/tag/v2.35.0)). Размеры CPU/RAM/disk зависят от PDF/OCR/данных; Micro подходит только для небольшой демонстрации, нагрузочные гарантии не подтверждены. Подготовьте отдельного оператора с SSH keys, регулярные обновления ОС, firewall и постоянный диск.

Установка Docker зависит от дистрибутива; следуйте [официальной инструкции Docker Engine](https://docs.docker.com/engine/install/). Не исполняйте curl|sh и не добавляйте непроверенные пакеты. Версии проверить docker version и docker compose version. Команды установки пакетов для всех Linux-дистрибутивов этим проектом не тестировались.

Откройте80/443 для HTTPS и ограничьте SSH административными адресами. Не открывайте5432/8000/3000 наружу; published Docker ports могут обходить UFW. DNS A/AAAA должен указывать на сервер. Проверьте свободные80/443 и совместимость с уже работающим proxy.

## Клонирование и secrets

```sh
git clone https://github.com/temirkhanerbolatovich-coder/saq-qurylys.git /opt/saq-qurylys
cd /opt/saq-qurylys
git switch codex/repository-cleanup
git rev-parse HEAD
python3 scripts/configure_server.py --public-host saq.example.org
chmod 600 .env .local/server-credentials.txt
```

saq.example.org заменить своим DNS. Для воспроизводимого release зафиксировать проверенный commit SHA, затем git switch --detach VERIFIED_SHA. Состояние публикации и согласованного merge — PROJECT_STATUS.

Генератор создаёт независимые DB/session secrets, HTTPS Origin/Secure cookie, DEMO_SEED_ENABLED=false и отключённые Threads/Telegram. Existing .env не перезаписывается. Пароль аналитика хранится только в .local/server-credentials.txt. Для восстановления прежней БД порядок credentials описан в [BACKUP_RESTORE](operations/BACKUP_RESTORE.md).

Обязательные POSTGRES_DB/USER/PASSWORD, DATABASE_URL, SESSION_SECRET, bootstrap credentials и APP_ORIGIN/Secure cookie должны быть согласованы. DATABASE_URL для API/worker Compose строится из POSTGRES_*; direct native CLI читает .env. PDF/OCR limits, карта и зарезервированные параметры документированы комментариями [.env.example](../.env.example). Изменение Next public build args требует rebuild.

## Сборка, storage и запуск

На выделенном host используется полный Caddy overlay:

```sh
docker compose -f docker-compose.yml -f docker-compose.public.yml -f docker-compose.https.yml config --quiet
docker compose -f docker-compose.yml -f docker-compose.public.yml -f docker-compose.https.yml build
mkdir -p storage
docker compose -f docker-compose.yml -f docker-compose.public.yml -f docker-compose.https.yml run --rm --no-deps --user root --entrypoint chown api saq:saq /app/storage
docker compose -f docker-compose.yml -f docker-compose.public.yml -f docker-compose.https.yml up --no-build -d --wait --wait-timeout 300
```

Права настраиваются только для новой папки. API/worker исполняются как saq; frontend как node. PostgreSQL хранится в named volume, assets в ./storage; Caddy имеет собственные volumes. Не down -v, не prune.

API сначала alembic upgrade head, затем bootstrap-only. Поэтому восстановление в пустую DB выполняется до старта API/worker. Ошибка миграции останавливает API; не скрывать её stamp.

Для proxy на хосте убрать HTTPS overlay и добавить site block в существующий proxy, предварительно проверив конфигурацию и сохранив другие сайты. Upstream — 127.0.0.1:APP_PORT. Caddy в контейнере использует frontend:3000.

## Приёмка

```sh
docker compose -f docker-compose.yml -f docker-compose.public.yml -f docker-compose.https.yml ps
docker compose -f docker-compose.yml -f docker-compose.public.yml -f docker-compose.https.yml exec -T api python -c "import urllib.request; print(urllib.request.urlopen('http://127.0.0.1:8000/health').status)"
curl --fail --head https://saq.example.org
```

Проверить извне доверенный TLS/HTTP→HTTPS, login, Secure/HttpOnly cookies, anonymous401, wrong Origin403, реестр/досье/скачанные исходники и архивные PDF. Проверка DEMO upload→OCR→review→PDF на public deployment является записью и требует отдельного согласования; общий E2E guard намеренно отказывает public origin.

После согласованного restart заново проверить данные и SHA. /health проверяет API+DB, а состояние worker/OCR/PDF и внешние источники требуют отдельных наблюдений. Установить независимый monitoring, regular encrypted off-host backup и retention до реального пилота.

## Обновление

1. Зафиксировать old SHA, Compose project, config hashes и old image IDs. Сохранить API/frontend images локальными rollback tags; не использовать latest как единственный rollback.
2. Сделать согласованный DB+storage backup и проверить восстановление отдельно. Закончить активные решения и определить единственного worker/scheduler.
3. В отдельном checkout собрать и проверить new SHA на новой DB и восстановленной копии; проверить миграции/контракт/PDF. Новые dependency/runtime и schema должны быть совместимы.
4. Только после разрешения оператора остановить целевые api/worker, перейти на проверенный SHA и обновить только api/worker/frontend с прежними volumes/config. Команда up API применит миграции.
5. Проверить health/auth/данные/asset SHA, запуск worker и archived PDF. Записать SHA/image IDs/результат в статус; backup и старые образы сохранить.

Автоматический restart не является обновлением env; контейнеры перечитывают env при пересоздании. Ни одна инструкция не разрешает мигрировать реальную БД в рамках cleanup.

## Откат

Если схема не менялась и совместимость подтверждена — вернуть сохранённые old images с прежними volumes/config, проверить health и данные. Если миграции были применены, старый image нельзя автоматически направлять в новую схему.

При несовместимой схеме восстановить pre-update backup в другую пустую DB/storage, запустить совместимый old SHA отдельно без seed, проверить SHA/решения/архивы, затем согласовать переключение. Downgrade и восстановление поверх рабочей БД автоматически не выполняются. Возможная потеря новых после backup записей требует отдельного решения.

[Backup/restore](operations/BACKUP_RESTORE.md), [troubleshooting](TROUBLESHOOTING.md). Полный прежний deployment-журнал — [архив](archive/DEPLOYMENT_2026-10-20.md).
