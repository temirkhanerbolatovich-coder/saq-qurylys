# Инструкция владельцу компьютера frontend-разработчика

В опубликованном ZIP оказались пароли вашей локальной копии SAQ QURYLYS.
История main уже очищена, но пароли нужно заменить на вашем компьютере.
Codex не подключался к нему и ротацию не выполнял. Сохраните БД, документы,
незавершённые исходники и приватную конфигурацию.

## 1. Сохранить работающую установку

Ниже команды для существующего Docker Compose из README; выполняйте их в каталоге
именно своей работающей копии. Через `docker compose ps` и Mounts контейнера db
проверьте project, имя БД, роль и PostgreSQL volume. Не меняйте их. Если запускали
только UI, сначала установите, где работают его API/БД: менять доступы нужно там.
Для native PostgreSQL потребуется его существующее административное подключение.

Сохраните согласованный backup БД **и storage** и проверьте восстановление по
[LOCAL_BACKUP](LOCAL_BACKUP.md). Для подходящего локального Compose:

```powershell
python scripts/backup_local.py create
if ($LASTEXITCODE -ne 0) { throw 'Создание backup не подтверждено.' }
python scripts/backup_local.py verify .local/backups/ИМЯ_СОЗДАННОЙ_ПАПКИ
if ($LASTEXITCODE -ne 0) { throw 'Проверка восстановления не пройдена.' }
docker compose stop frontend worker api
if ($LASTEXITCODE -ne 0) { throw 'Остановка сервисов не подтверждена.' }
```

В `verify` подставьте фактическую папку из результата `create`. Дамп не сохраняет
PostgreSQL roles; исходники, `.env` и файл входа сохраните отдельно, не в GitHub.
Не продолжайте после ошибки backup/verify. На время обслуживания закончите
активные действия и остановите сервисы; БД/storage/volumes не удалять.

## 2. Заменить пароль БД и приватную конфигурацию

Подготовьте в приватном менеджере три разных случайных значения: пароль БД,
пароль аналитика и `SESSION_SECRET` не короче 32 символов. Hex пароль БД не требует
URL escaping. Не передавайте секреты в чат, Git, командные аргументы или логи.

Через прежнее административное подключение откройте psql:

```powershell
docker compose exec db psql -X -U ИМЯ_АДМИНИСТРАТИВНОЙ_РОЛИ -d ИМЯ_БАЗЫ
if ($LASTEXITCODE -ne 0) { throw 'Проверьте административное подключение.' }
```

В psql выполните `\password ИМЯ_РОЛИ_ПРИЛОЖЕНИЯ`, введите новый пароль скрыто
дважды, затем `\q`. Роль приложения берётся из `POSTGRES_USER`; без имени
`\password` меняет текущую административную роль, которая может быть другой.

В приватном `.env` согласованно замените `POSTGRES_PASSWORD`, пароль внутри
`DATABASE_URL`, `BOOTSTRAP_ANALYST_PASSWORD` и `SESSION_SECRET`. Имена/host/port/БД
сохраните. Compose собирает внутренний URL из `POSTGRES_*`, поэтому одной замены
host `DATABASE_URL` недостаточно. Пересоздайте только db с **тем же проверенным volume**:

```powershell
docker compose up -d --no-deps --force-recreate --wait db
if ($LASTEXITCODE -ne 0) { throw 'Готовность БД не подтверждена; приложение не запускать.' }
```

Это закрывает старые подключения и загружает новую env; пароль роли уже изменён
через psql. Переменная образа `POSTGRES_PASSWORD` сама существующую роль не меняет.
`down -v`, удаление volume и повторная инициализация не нужны.

## 3. Заменить существующий пароль аналитика и отозвать сессии

Новый env и повторный seed сохраняют старый hash. Следующая одноразовая транзакция
берёт новый пароль из **уже обновлённой** env API, меняет пароль существующего
аналитика, отзывает все web-сессии этой установки и добавляет audit event.
Проверьте соответствие существующего API-образа текущим моделям проекта.

```powershell
@'
from sqlalchemy import create_engine, delete, select
from sqlalchemy.orm import Session
from app.config import Settings
from app.models import AuditEvent, LoginSession, User
from app.security import hash_password, verify_password

engine = None
try:
    settings = Settings(_env_file=None)
    engine = create_engine(settings.database_url, hide_parameters=True)
    with Session(engine) as db, db.begin():
        user = db.scalar(
            select(User)
            .where(User.username == settings.bootstrap_analyst_username)
            .with_for_update()
        )
        if user is None:
            raise RuntimeError("Existing analyst not found")
        if verify_password(settings.bootstrap_analyst_password, user.password_hash):
            raise RuntimeError("Password unchanged: update private configuration first")
        user.password_hash = hash_password(settings.bootstrap_analyst_password)
        removed = db.execute(delete(LoginSession)).rowcount
        db.add(AuditEvent(
            actor_id=user.id,
            action="LOCAL_CREDENTIAL_ROTATION",
            entity_type="user",
            entity_id=user.id,
            reason="Owner rotation after published source archive disclosure",
            details={"executor": "LOCAL_WORKSTATION_OWNER", "sessions_revoked": removed},
        ))
    print("Analyst password replaced; all web sessions revoked; audit committed.")
except Exception:
    raise SystemExit("Rotation not confirmed; keep services stopped and inspect privately.") from None
finally:
    if engine is not None:
        engine.dispose()
'@ | docker compose run --rm --no-deps -T api python -
if ($LASTEXITCODE -ne 0) { throw 'Ротация не подтверждена; сервисы не запускать.' }
```

Используются библиотеки существующего API-образа; API/worker/seed/миграции не
запускаются. Audit actor привязан к целевому аккаунту, а `executor` явно обозначает
локального владельца: это административная операция, не web-действие аналитика.
Обновите приватный `.local/credentials.txt` новым паролем аналитика.

При ошибке оставьте сервисы остановленными и исправьте согласованность конфигурации;
не возвращайте раскрытые пароли ради запуска. Смена `SESSION_SECRET` подписывает
новые CSRF, но сама не отзывает server sessions — поэтому удаление sessions обязательно.

## 4. Запустить, проверить и перейти на чистый Git

```powershell
docker compose up -d --no-deps --force-recreate --wait api worker frontend
if ($LASTEXITCODE -ne 0) { throw 'Запуск не подтверждён; проверьте установку приватно.' }
```

Обычный `restart` новую env не загружает. Проверьте новый вход, отказ старого
пароля и `401` для прежней web-сессии до нового входа. Через password-authenticated
TCP проверьте новый пароль БД и отказ старого; `pg_isready`/local trust этого
не подтверждают. Откройте прежний объект, исходный документ и PDF: они сохраняются.
Отчёт должен содержать только результаты, без паролей/cookie/URL с credentials.

Затем создайте новый clone по [CONTRIBUTING](../CONTRIBUTING.md), перенесите только
собственный diff и отдельно сохранённую приватную конфигурацию. Старый `.git`/ZIP
не переносить, старую ветку не сливать с очищенной историей. Рабочие БД/storage
сохранить; две копии приложения на одном volume одновременно не запускать.
Старые backups могут содержать прежний hash/сессии: после восстановления их снова
нужно отозвать и заменить пароль.

## Граница проверки

Инструкция составлена по текущим Compose/models/seed/auth. На компьютере
разработчика она не выполнялась; действующие пароли/сессии там не проверены.
Python-пример выполнен с текущими ORM/security в изолированном SQLite:
успех, отказ при прежнем пароле, отсутствие пользователя и полный rollback при
ошибке аудита — 4 PASS. Другой аккаунт/роль и контрольный документ сохраняются.
Это не PostgreSQL/Docker приёмка. Подробности — PROJECT_STATUS.
