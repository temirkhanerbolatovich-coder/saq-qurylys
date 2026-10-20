# API и совместимость

Контракт — [contracts/openapi.yaml](../contracts/openapi.yaml). Он хранит JSON-синтаксис, допустимый для YAML/OpenAPI 3.1. Исходный снимок cleanup: версия0.34.0, 78 paths.

FastAPI публикует /docs и /openapi.json внутри API. В Compose API не открыт наружу; UI обращается через Next same-origin /api/v1. Runtime schema доступна внутри контейнера. Не открывайте API публично ради Swagger.

## Аутентификация

Session хранится сервером, cookie HttpOnly. Получить GET /api/v1/auth/csrf, затем передать X-CSRF-Token и точный Origin для login/изменяющей команды. Предметные команды обычно требуют UUID Idempotency-Key и expected_revision; обязательные поля — в конкретном operation. Viewer читает, analyst выполняет разрешённые команды.

401 — session, 403 — роль/Origin/CSRF, 409 — конфликт ревизии/idempotency, 422 — validation. Ошибка не должна превращаться в подтверждённый факт.

Пример чтения после входа; placeholder заменить только приватно:

```sh
curl --fail --cookie "saq_session=<PRIVATE_SESSION>" http://localhost:3000/api/v1/properties
curl --fail http://localhost:3000/api/v1/auth/csrf
```

Реальные cookies/tokens не сохранять в shell history, docs, CI или issue.

## Группы

| Группа | Назначение |
|---|---|
| auth | CSRF, login/me/logout |
| properties/dashboard | Реестр, структура, история, риск, текущий отчёт |
| advertisements | TXT/upload, очередь/поиск, исходники, анализ/версии |
| reviews/legal-bases | Гипотезы, match, evidence, факторные/правовые решения |
| signals/exports/assets | Historical snapshots, решения, saved PDF/private files |
| monitoring | Источники/кандидаты, CSV, runs, profiles/dictionaries/findings |
| import-url/url-schedules | Разрешённые URLs, jobs, явно включаемое расписание |
| threads/open-registry | Bounded adapters; доступ/приёмка отдельно |

## Изменение контракта

Проверить DTO/routes и tests. Additive nullable output требует ясной semantics; удаление/переименование/смена обязательности требует compatibility решения. Старые snapshots/даты/авторы не backfill-ятся ради новой формы.

Обновить OpenAPI, frontend types, контрактные tests, version и FEATURE/ADR при необходимости. Выполнить validation и runtime response tests на отдельной БД. Наличие operation не подтверждает доступность внешней интеграции.
