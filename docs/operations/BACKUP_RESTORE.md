# Согласованная копия БД и storage

PostgreSQL и assets восстанавливаются вместе. Дамп содержит учётные записи, sessions, решения и историю; storage — приватные документы/PDF. Копии не публикуются в Git/CI. Сохраняйте отдельно release SHA/images и secrets в защищённом хранилище. SHA подтверждает целостность, но не доверенность источника.

## Штатный helper

[LOCAL_BACKUP](../LOCAL_BACKUP.md): python scripts/backup_local.py create, затем verify PATH. Helper проверяет Compose identity saq-qurylys и working_dir текущего checkout, кратко pause-ит API/worker и сохраняет DB+зарегистрированные assets. Это возможно только при согласованном эксплуатационном окне; не запускать helper из другой папки ради доступа к чужому runtime.

Helper требует Git metadata для revision. Source-архив без .git и серверные частные модификации из Oracle note этим versioned helper не покрываются. Для новых VPS использовать Git checkout. Verify требует хотя бы один non-SIGNAL_PDF asset и audit rows: до первого материала пустая установка не подтверждается этим HTTP-покрытием. Проверяйте DB restore/count/schema отдельно, не создавайте фиктивные решения ради PASS.

## Ручная серверная копия

Рецепт ниже для подтверждённого собственного Git checkout с Compose base/public/https. Перед выполнением проверить pwd, project, volumes, наличие backup-диска и отсутствие прямых SQL writers. Для другого project/набора overlays исправить все команды согласованно. Рецепт сначала повторить на тестовом стенде; конкретное выполнение — [REFACTOR_REPORT](../REFACTOR_REPORT.md).

```bash
set -eu
cd /opt/saq-qurylys
backup_dir=".local/backups/manual-$(date -u +%Y%m%dT%H%M%SZ)"
umask 077
mkdir -p "$backup_dir"
git rev-parse HEAD > "$backup_dir/revision.txt"
# При ошибке возобновляется тот же project; предварительно оба сервиса должны работать.
trap 'docker compose -f docker-compose.yml -f docker-compose.public.yml -f docker-compose.https.yml start api worker' EXIT
docker compose -f docker-compose.yml -f docker-compose.public.yml -f docker-compose.https.yml stop api worker
docker compose -f docker-compose.yml -f docker-compose.public.yml -f docker-compose.https.yml exec -T db sh -c 'exec pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom' > "$backup_dir/database.dump"
sudo tar -C storage -cf "$backup_dir/storage.tar" .
sha256sum "$backup_dir/database.dump" "$backup_dir/storage.tar" > "$backup_dir/SHA256SUMS"
docker compose -f docker-compose.yml -f docker-compose.public.yml -f docker-compose.https.yml start api worker
trap - EXIT
```

Остановка исключает записи API/worker; frontend временно недоступен по API. Другие writers должны быть остановлены отдельно. Не копировать storage, пока пишет worker. При ошибке копия неполная; не принимать её за готовую. При изменённых schedules до возобновления убедиться в единственном исполнителе. Для большого storage требуется согласованный snapshot/maintenance вариант.

Этот ручной рецепт не экспортирует PostgreSQL global roles. Secrets не входят в dump-пакет как .env, но session/password hashes внутри БД чувствительны. Нужны шифрование, off-host перенос, retention и регулярные restore drills; автоматически они не настроены.

## Восстановление только в новое окружение

1. Проверить доверенность и SHA копии; не выполнять чужой pg_restore. Сохранить исходную копию без изменений.
2. Создать новый release checkout с прежним SHA, новый Compose project и пустой DB/storage. Сгенерировать отдельные DB/session secrets; не копировать посторонние tokens.
3. Запустить только новую DB. По существующей роли PostgreSQL выполнить:

```sh
docker compose -p saq-restore-example up -d --wait --wait-timeout 180 db
docker compose -p saq-restore-example exec -T db sh -c 'exec pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner --no-acl --exit-on-error' < /private/backup/database.dump
```

Команда предполагает отдельную папку с новым .env; project name заменить уникальным. На PowerShell не используйте двоичный pipeline Get-Content для dump: выполняйте через Bash/WSL или docker cp и pg_restore внутри контейнера.

4. Развернуть trusted storage.tar в новую пустую папку storage; проверить каждый asset size/SHA по БД/manifest, таблицы/count/hash и alembic revision. Нельзя запускать worker до проверки перенесённых jobs/leases/schedules.
5. Пароль пользователя хранится в восстановленной БД; BOOTSTRAP password его не сбрасывает. Согласовать действующий пароль приватно. Смена SESSION_SECRET сама по себе не отзывает sessions: чистка sessions относится только к восстановленной БД и отдельной административной процедуре.
6. Запустить совместимый API с DEMO_SEED_ENABLED=false. Startup применяет upgrade head, поэтому release должен соответствовать восстановленной схеме. Проверить login/данные/originals/archived PDF SHA, затем только согласованный worker.
7. Restart и повторное чтение доказывают persistence; переключение пользователей на новую установку — отдельное действие. Рабочие volumes/storage не заменяются.

Для восстановления всех таблиц/SHA и authenticated downloads предпочтителен существующий helper там, где его identity/coverage соответствует установке. Ручной restore без сравнений не означает приёмку.
