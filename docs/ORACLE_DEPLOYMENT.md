> Историческая installation note конкретной Oracle VM. Актуальный общий сценарий — [DEPLOYMENT](DEPLOYMENT.md). Упоминание release-manifest относится к частной серверной модификации helper; versioned backup_local.py требует Git metadata. Для новых VPS используйте Git checkout.

# Публикация SAQ QURYLYS в Oracle Cloud

20.10.2026: создана выделенная `saq-qurylys-prod`, публичный IP `161.33.201.25`.
Сайт работает: `https://saq-qurylys.161.33.201.25.nip.io`.
Внешняя приёмка auth/данных/OCR/PDF и stop/start services пройдена.
Фактический этап — [PROJECT_STATUS](../PROJECT_STATUS.md).

После входа/разрешения пользователя Oracle дважды отказал A1.Flex в Tokyo AD-1
с `Out of capacity`:2OCPU/12GB и1OCPU/6GB. Квоты были доступны, VM/IP не созданы.
Пользователь согласовал бесплатную E2.1.Micro для демонстрации. VM работает:
Ubuntu24.04 Minimal amd64,1GB RAM,45GiB filesystem; добавлен4GiB swap.
Готовые native amd64 images собираются локально и передаются по SSH, без build на VM.

Пользователь согласовал новую VM, бесплатный поддомен и перенос текущей пары
PostgreSQL + storage. Локальный сайт сохраняется. Работа идёт с накопленным diff,
поэтому прежнего Git SHA или clone опубликованного репозитория недостаточно:
перед передачей фиксируются SHA файлов конкретного release-архива.

## Размещение

Одна выделенная Linux VM: Docker Compose запускает PostgreSQL, API, worker,
frontend и Caddy. Снаружи доступны только Caddy 80/443 и административный SSH.
БД/API не публикуют порты; frontend доступен только через loopback и Docker network.
Авторизация, роли, Origin/CSRF, UNKNOWN, DEMO, формула риска и архивные снимки прежние.
Основная страница из интернета требует прежнего входа; публикация не делает
досье общедоступными и не включает отправку сигналов.

Первоначально рассматривалась Ubuntu24.04 LTS, A1.Flex ARM64,
до2OCPU/12GB RAM и50GB boot volume — **только при доступной квоте Always Free**.
На20.10.2026 официальные лимиты A1 —1500OCPU hours/9000GB hours в месяц,
эквивалент2OCPU/12GB, storage200GB суммарно. Остаток проверяется в аккаунте,
а не предполагается. Дефолтная платная shape не подходит. Micro1GB не считается
проверенной заменой для полной рабочей нагрузки. Выбранная Micro рассчитана
на небольшую демонстрацию; OCR/PDF и перезапуск проверяются на реальной VM.
[Oracle Always Free](https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm).

Бесплатный hostname после получения IPv4:
`saq-qurylys.<PUBLIC_IPV4>.nip.io`. DNS указывает на IP без регистрации нового
аккаунта. Caddy получает/обновляет отдельный сертификат и перенаправляет HTTP
на HTTPS. Есть зависимость от стороннего DNS, доступности IP и CA rate limits;
смена IP меняет этот адрес. При необходимости позже используется собственный DNS.
[nip.io](https://nip.io/), [Caddy HTTPS](https://caddyserver.com/docs/automatic-https).

## Сервер и конфигурация

1. В Oracle выбрать home region, Always Free-compatible image/shape и проверить
   итоговую стоимость/квоты. Использовать отдельный SSH keypair. Создать новую VM,
   а не переиспользовать чужую машину или ранее остановленные проекты.
2. Проверить fingerprint SSH через доверенный канал, подключиться штатным SSH.
   В выполненной установке использован TOFU: первый ED25519 host key сохранён
   в отдельном known_hosts; независимой сверки fingerprint не было. Последующие
   подключения требуют точного совпадения ключа. SSH ограничен OCI CIDR текущего
   клиента `2.134.13.66/32`; при смене провайдера/IP обновить только эту запись
   через Oracle Console, сохраняя key authentication.
   Установить Docker Engine/Compose из [официального Ubuntu apt repository](https://docs.docker.com/engine/install/ubuntu/).
   Не выполнять convenience `curl | sh`, не очищать чужие Docker volumes.
3. Передать подготовленный source-архив с манифестом и приватную проверенную
   резервную копию только на эту VM по SSH. Исходная `.env`, сторонние tokens,
   `.local`, generated outputs и `.git` не входят в source-архив.
4. Разместить release в `/opt/saq-qurylys`; private backup — в `.local/`,
   каталог с правами0700, `.env`/credentials/dump —0600.

Для **пустой новой установки** с новыми analyst credentials:

```bash
python3 scripts/configure_server.py --public-host saq.example.org
```

Для **переноса существующей БД** генератор запускается в отдельной папке release
до передачи на сервер; `--credentials-from` указывает на приватную `.env`
существующего локального сайта. На сервер переносится только созданная новая
server `.env`, а не исходный файл:

```bash
python3 scripts/configure_server.py --public-host saq.example.org --credentials-from /private/source.env
```

Скрипт сохраняет только прежние analyst username/password, чтобы пароль совпадал
с хешем восстановленной БД. DB password и session/CSRF secret генерируются заново.
Threads/Telegram выключены; их tokens и прочие внешние credentials не переносятся.
URL jobs/расписания не имеют общего env-выключателя и проверяются в БД до worker.
`DEMO_SEED_ENABLED=false`, cookie Secure,
Origin HTTPS. Имеющиеся `.env` и server-credentials не перезаписываются.
Secrets не выводятся в stdout. На Windows дополнительно ограничить ACL приватных
файлов; POSIX mode сам по себе не устанавливает Windows ACL.

## Восстановление и первый запуск

Выполняется только в новой пустой DB, с проверкой manifest/SHA и отсутствия
других данных. Существующий сервер не перезаписывается. Во всех командах одна
комбинация файлов:

```bash
docker load -i .local/saq-qurylys-images-amd64.tar.gz
docker compose -f docker-compose.yml -f docker-compose.public.yml -f docker-compose.https.yml -f docker-compose.prebuilt.yml pull db caddy
docker compose -f docker-compose.yml -f docker-compose.public.yml -f docker-compose.https.yml -f docker-compose.prebuilt.yml up -d --no-build --pull never --wait db
```

Перед `docker load` проверить SHA архива и архитектуру из image-package manifest.
В новой server `.env` задать `SAQ_API_IMAGE` и `SAQ_FRONTEND_IMAGE` точным
загруженным tag/digest. Prebuilt override требует amd64 и запрещает pull этих
образов; build-секции базового Compose сохраняются, поэтому `--no-build` обязателен.
Остальные images официальные. Логи всех пяти services ограничены10MB ×3.

На Micro первый полный отчёт досье вернул503 по прежнему wall deadline12s.
Изолированное read-only измерение того же renderer с прежними CPU/address caps
дало24.76s/валидный PDF111726bytes, без OOM. Для этого сервера настроены
Сначала45s/50000ms дали один временный503 при последовательной нагрузке.
Окончательно заданы `DOCUMENT_PDF_TIMEOUT_SECONDS=60` и `PDF_PROXY_TIMEOUT_MS=75000`.
Ожидание proxy расширяется только для GET PDF; остальные запросы, включая Threads,
сохраняют15s. Defaults12s/15s, CPU12s и address-space1GiB renderer не повышаются.
Длинная операция использует прежние2renderer slots; Micro принимается только
для небольшой демонстрационной нагрузки. После stop/start публичные full41page
отчёты RU/KZ скачались за19.64/20.05s, досье не изменилось. Формировать по одному;
нагрузочный тест и гарантированная пропускная способность не заявляются.

До старта API/worker восстановить trusted `database.dump` через `pg_restore
--no-owner --no-acl --exit-on-error` и зарегистрированные файлы storage. Сравнить
число/SHA строк всех таблиц и size/SHA каждого Asset с исходным manifest.
После совпадения удалить старые login sessions **только в восстановленной БД**;
смена `SESSION_SECRET` не отменяет session tokens автоматически. Локальные
учётные записи/сессии не затрагиваются. Настроить владельца storage штатному
пользователю `saq` API image; рабочие контейнеры не запускать как root.

Сначала API применяет Alembic и выполняет только `--bootstrap-only`; исходный
dump/manifest сохраняется отдельно без переписывания. До запуска worker проверить
перенесённые jobs/leases и URL schedules: включённое расписание не должно начать
повторный сбор одновременно с оставленным локальным worker. Решение о единственном
исполнителе/включении расписаний фиксируется отдельно, без изменения архивов.
После проверки стартуют остальные services:

```bash
docker compose -f docker-compose.yml -f docker-compose.public.yml -f docker-compose.https.yml -f docker-compose.prebuilt.yml up -d --no-build --pull never --wait
```

`docker-compose.dev.yml` на публичном сервере не применять. `docker compose config`
без `--quiet` может вывести environment secrets — такой вывод хранить только приватно.
Порты80/443 разрешаются в OCI NSG/security list и host firewall; SSH ограничивается
административными адресами. Не открывать5432/8000/3000 наружу. Docker published
ports могут обходить UFW; поэтому ограничения заданы также в Compose/OCI.

## Приёмка и откат

- Проверить DNS/IP, публичный доверенный сертификат и HTTP→HTTPS, без `-k` или
  отключения проверки TLS. Подключиться из внешнего браузера, а не только с VM.
- Anonymous private API401; вход200; Secure cookie; неверный Origin403;
  logout инвалидирует сессию. Перенесённый пароль работает, secrets не отображаются.
- Проверить реестр/карту, досье/DEMO/UNKNOWN/R1–R6, материалы, сигнал, исходники и
  каждый существующий архивный PDF по SHA, не заменяя его новым рендером.
- Точечно проверить UI Parser V2 на настоящей восстановленной схеме; внешний
  Threads остаётся выключенным без официального доступа.
- OCR/PDF job smoke выполнять только на явно маркированном DEMO материале;
  не создавать решения о реальных организациях ради теста.
- Проверить restart services и повторное чтение прежних файлов/снимков. Резервную
  копию оставить и локально вне VM; определить регулярное внешнее хранение отдельно.

До успешной приёмки не раздавать адрес как готовый результат. При ошибке остановить
только новый server project, сохранить логи/данные и исправить его; локальная
инсталляция остаётся исходной. Не применять `down -v`, reset/clean или автоматический
откат старого образа поверх уже мигрировавшей БД. Повторное восстановление — в
другую пустую DB из неизменённого dump. [Локальная копия](LOCAL_BACKUP.md).

## Фактическая приёмка20.10.2026

- Micro amd64, Docker29.9.1/Compose5.6.0,5services;4GiB swap. API/worker/frontend
  nonroot. Новая VCN, OCI только22 с client/32 и80/443 с internet; отдельный SSH key.
  Извне22/80/443 доступны,3000/5432/8000 недоступны. Логи10MB×3 на каждом service.
- DNS→161.33.201.25, trusted TLS1.3/Let's Encrypt YE1 (истекает18.01.2027), HTTP308.
  Anonymous401, wrongOrigin403, прежний вход200,Secure/HttpOnly/Strict cookie,
  logout204→me401. Авторизация для данных сохранена.
- Перед миграцией совпали31таблица/64файла;1044copied sessions удалены;
  queued/running0,enabled schedules0. После миграции все64Asset скачаны извне
  с прежними SHA,3historicalsignal snapshots/decisions/PDF не изменились.
- Реальный upload→worker OCR RU+KZ→PENDING hypotheses→скачанный оригиналSHA PASS,
  17.45s на два учебных PNG. Созданы2DEMO материала; нет match/факторов/решений.
- Browser overview/map/DEMO100RED/documents/ParserV2 прочитаны на новом сервере.
  После полного stop/start повторены auth/all64originals/3archives/fullPDF RU+KZ/
  неизменность досье/logout; всё PASS. Визуально проверены страницы1/2/10/41
  обоих скачанных отчётов; кириллица/казахские glyphs, таблицы и footer без дефектов.
- Новые deadline regressions8backend+2proxy PASS; вместе с exports/dossier
  regressions в отдельной disposable DB28PASS/2Windows skips. Native Docker builds
  backend/frontend PASS; Next compile/typecheck PASS, Ruff/format/hygiene PASS.

Локальный сайт и старый assetguard-prod сохранены. Публичная установка не включает
Threads/Telegram, автоматические расписания, внешнюю предметную приёмку или весь
P0 ParserV2. Регулярный автоматический off-VM backup/monitoring пока не настроен;
исходная восстановленная и текущая серверная копии сохранены вне VM.
Post-deploy backup37tables/68assets скачан по SSH сSHAпроверкой и восстановлен
локально в offline disposable containers, включая68HTTPdownloads/3historicalPDF.
SHA архива12cbc77b74477b877401b9b47a7c0fe56162447d4ffc7d0f347a0721bfd27ccc;
receipt/restore evidence — PROJECT_STATUS. Backup helper server revision берёт
из release-manifest, поскольку публикация выполнена архивом без Git checkout;
это baseSHA+полные fileSHA, не утверждение чистого Git HEAD на сервере.
Не менять IP/shape перед презентацией без проверки адреса и TLS.
