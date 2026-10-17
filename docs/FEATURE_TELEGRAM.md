# Telegram-уведомления SAQ QURYLYS

Пользователь поручил добавить уведомления и создать бота 16.10.2026. Это дополнение U к проекту; исходный кейс O не требует Telegram. Рабочая реализация и успешная реальная доставка проверяются отдельно.

## Что отправляется

При ручном переходе R1–R6 из другого статуса в CONFIRMED API сохраняет уведомление в той же транзакции, что и решение. В сообщении: объект, код/смысл фактора, балл и зона на момент решения, дата оценки фактора, время проверки UTC+5, ID события и оговорка о рассмотрении специалистом. Красная зона показывается по существующей серверной формуле. Отдельное второе сообщение про ту же зону не создаётся.

Повтор команды с тем же Idempotency-Key и повторное сохранение уже CONFIRMED-фактора не создают новое уведомление. Отклонение и новое подтверждение — новое решение и новый ID. Старые подтверждённые факторы при включении Telegram не рассылаются задним числом. AI-гипотеза, загрузка документа и UNKNOWN не запускают уведомление о подтверждённом риске.

Для локального MVP поддержан **один явно привязанный личный чат на установку**. Группы и публичные каналы исключены. Персональные подписки разных сотрудников/организаций не реализованы. Тексты доказательств, причины со свободным вводом, персональные данные заявителей и PDF не отправляются. Название объекта — часть уведомления; внешнее хранение таких сведений в ведомственном пилоте требует согласования. DEMO всегда отмечен; автоматические DEMO-уведомления по умолчанию выключены, чтобы browser-тесты не отправляли десятки сообщений.

## Создать и подключить бота

1. В официальном [@BotFather](https://t.me/BotFather) выполнить `/newbot`, указать имя SAQ QURYLYS и свободный username с окончанием `bot`. Создание учётной записи выполняет владелец Telegram. [Официальная инструкция](https://core.telegram.org/bots/faq#how-do-i-create-a-bot).
2. Сохранить только токен в `.local/telegram-bot-token.txt`. `.local/` и `.env` игнорируются Git. Не вставлять токен в чат, README, командную строку, screenshot или public frontend env. Файл токена сохраняется после подключения; исходный секрет пользователя автоматически не удаляется.
3. Из корня проекта:

```powershell
.venv\Scripts\python.exe scripts/configure_telegram.py check
.venv\Scripts\python.exe scripts/configure_telegram.py pair
```

`check` сверяет getMe/getWebhookInfo и выводит только username. Чужой установленный webhook не удаляется автоматически. `pair` создаёт случайную одноразовую ссылку на 10 минут; в приватном `.local/telegram-pairing.json` хранится хеш кода. Откройте ссылку своим Telegram и нажмите Start. Обычный `/start` без кода не даёт доступ к уведомлениям.

4. Завершить привязку:

```powershell
.venv\Scripts\python.exe scripts/configure_telegram.py complete
```

Команда проверяет код, private chat, совпадение отправителя с ID чата, отсутствие forwarded/via-bot сообщения и идентичность бота. Токен/ID получателя атомарно сохраняются в приватном `.env` с `TELEGRAM_ENABLED=true`; прочая конфигурация сохраняется. При смене существующего бота/чата требуется явный `complete --replace`. Код одноразовый, повтор complete не отправляет приветствие заново. Приветствие отправляется только найденному личному чату; принятие Telegram и фактическое получение владельцем различаются.

5. После сборки текущего backend применить конфигурацию только SAQ api/worker:

```powershell
docker compose -f docker-compose.yml -f docker-compose.dev.yml build api worker
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --no-deps --force-recreate --wait api worker
.venv\Scripts\python.exe scripts/configure_telegram.py test
```

`test` отправляет отдельное явно DEMO-сообщение и не изменяет факторы или баллы. Подтвердите, что сообщение действительно пришло в Telegram. Успешный getMe, HTTP 200 или статус контейнера сами по себе не доказывают получение. Проверка test не подменяет тест бизнес-триггера/очереди.

## Конфигурация

| Переменная | Значение по умолчанию / назначение |
|---|---|
| TELEGRAM_ENABLED | false; при true нужны валидный token и привязанный private chat |
| TELEGRAM_BOT_TOKEN | пусто; SecretStr, в repr/пользовательских ошибках не раскрывается |
| TELEGRAM_CHAT_ID | пусто; только положительный числовой ID личного чата |
| TELEGRAM_INCLUDE_DEMO | false; включать осознанно для отдельного контролируемого демо |
| TELEGRAM_TIMEOUT_SECONDS | 10, диапазон 1–15; сетевой timeout Bot API |
| TELEGRAM_MAX_ATTEMPTS | 3, диапазон 1–5; только заведомо неуспешные ответы Telegram |
| TELEGRAM_WEB_BASE_URL | пусто; необязательный HTTPS URL опубликованного интерфейса без credentials/query/fragment |

Без публичного адреса сообщение предлагает открыть локальный SAQ → Объекты → История. Ссылка localhost с телефона на сервер разработчика не подставляется. Изменения `.env` требуют пересоздания api/worker; файлы приложения/БД не переносятся в платные сервисы. Нужны исходящие DNS/HTTPS к api.telegram.org, входящие порты/webhook не нужны.

## Очередь и отказоустойчивость

`telegram_notifications` — транзакционный outbox, ключ уникальности `factor:<id>:<revision>`. Сохраняются текст снимка, исходный bot_id/chat_id, фактор/ревизия, попытки, срок следующей попытки, claim/lease, состояние, message_id и безопасный код ошибки. Токена в таблице нет. Миграция `a91b76f2c305` добавляет таблицу, существующие записи не переписывает.

Существующий worker обрабатывает OCR/PDF и одну отправку между заданиями. HTTP выполняется после commit claim, вне транзакции подтверждения фактора. SKIP LOCKED и claim token защищают один event от двух worker; поздний worker не заменяет более новое состояние. Перед отправкой проверяются закреплённый получатель и текущий CONFIRMED фактора; отозванный фактор/сменившийся чат дают CANCELLED. При изменении после этой проверки сообщение остаётся историческим снимком с датами, а не гарантией текущего статуса.

- QUEUED → SENDING → SENT — Telegram подтвердил message_id ожидаемого чата. Это принятие API, не read receipt.
- Ответ Telegram `ok=false`, 429 — повтор после `retry_after`, максимум сутки ожидания; cooldown распространяется на очередь этого bot/chat, в том числе после исчерпания попыток отдельного события. Неизвестный/слишком большой retry_after даёт FAILED/TG_429_MANUAL и останавливает этот канал до ручного retry после проверки. Известный server error — задержка 30 секунд. Число попыток ограничено. Проверка недавней успешной отправки ограничивает обычную работу одного worker примерно одним сообщением в секунду; при нескольких worker возможны краткие bursts и действует обработка 429.
- 4xx/неподходящий запрос/исчерпанные попытки — FAILED.
- Сетевой timeout, некорректный/слишком большой ответ, неоднозначный результат либо истёкший SENDING lease — UNKNOWN. Автоматического повтора нет: Telegram мог уже принять sendMessage. Exactly-once доставка не обещается.
- Пока Telegram выключен, очередь не отправляется. Длительная OCR/PDF-операция или остановка Docker задерживает доставку; SLA/независимый sender-сервис не реализованы.

Транспорт: stdlib HTTPS, обычная TLS-проверка, фиксированный api.telegram.org, POST JSON, без proxy env и redirects; ответ не больше 64 KiB, исходные Telegram descriptions/URL исключений не попадают в логи/ошибки. Сообщение plain text, без HTML/Markdown и web preview, максимум 4096 UTF-16 units. Платная рассылка не включается.

## Контроль, повтор и выключение

```powershell
.venv\Scripts\python.exe scripts/configure_telegram.py status
.venv\Scripts\python.exe scripts/configure_telegram.py retry <notification-uuid>
.venv\Scripts\python.exe scripts/configure_telegram.py retry <notification-uuid> --allow-unknown
.venv\Scripts\python.exe scripts/configure_telegram.py disable
```

`status` показывает только counts/последние IDs/state/attempt/error_code, без токена, текста сообщений и ID чата. Это локальный административный CLI с доступом к приватной БД, без нового публичного API. `retry` работает только для FAILED/UNKNOWN; SENT не повторяется. Для UNKNOWN сначала проверить чат, затем осознанно указать `--allow-unknown`: дубль возможен и сохранит ID исходного события. Старый получатель остаётся закреплённым. `disable` меняет env; пересоздайте api/worker для применения. В Telegram можно заблокировать бота.

Runtime-поллинг команд `/status`/`stop`, webhook, автозапуск Windows, отдельный сервис, много получателей и GUI управления подпиской не добавлены. `/start <код>` обрабатывает только процедура подключения. Это бот уведомлений, не AI-ассистент и не орган принятия решений.

## Проверка

Из backend: `..\.venv\Scripts\python.exe -m pytest -q tests/test_telegram.py tests/test_contract.py`. Проверяются реальный review endpoint и outbox, idempotency/reconfirmation, rollback, UTF-8, privacy, два worker, lease/fencing, 429/backoff/max attempts, FAILED/UNKNOWN, отмена/смена получателя, one-time private pairing и сохранность env. Автоматические тесты запрещают live Telegram, общий conftest выключает отправку даже при локально подключённом боте.

Реальная регистрация/getMe/привязка/получение сообщения записываются отдельно в PROJECT_STATUS после фактической проверки. Официальные контракты: [sendMessage/getUpdates/error parameters](https://core.telegram.org/bots/api), [одноразовый start parameter](https://core.telegram.org/bots/features#deep-linking). Решение — [ADR-009](decisions/ADR-009-telegram-outbox.md).
