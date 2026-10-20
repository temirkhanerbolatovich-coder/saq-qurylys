# Участие в разработке

Прочитайте [README](README.md), [AGENTS](AGENTS.md), [статус](PROJECT_STATUS.md) и относящиеся FEATURE/ADR. Для UI обязательны DESIGN_SYSTEM/UX_GUIDELINES/UI_COMPONENTS/UI_AUDIT.

## Ветка и PR

Начните с согласованной ревизии в чистом checkout. Чужой diff сохраните; не reset/clean/force push. После интеграции нужной версии:

```sh
git switch main
git pull --ff-only origin main
git switch -c codex/short-feature-name
```

До отдельного merge полный подготовленный срез находится в codex/repository-cleanup. Старый main не эквивалентен этой ветке. PR не разрешает merge/deploy.

Scope минимальный и связный. При параллельной работе заранее разделить пути; не перезаписывать общий статус/tokens/lockfiles. API/роли/DEMO/REAL/риск/история сохраняются.

## Проверки и готовность

Команды — [DEVELOPMENT](docs/DEVELOPMENT.md). Backend: pytest на отдельной DB, Ruff, Alembic; frontend: lint/type/format, Node tests, build/start и isolated E2E. scripts проверяются целиком. После явного git add: git diff --cached --check и python scripts/check_repository_hygiene.py --staged. Новые пути/секреты проверить до staging.

Контракт меняется вместе с DTO/OpenAPI/types/tests/FEATURE. Significant решения — ADR. README — вход, DEVELOPMENT — работа, DEPLOYMENT — сервер, PROJECT_STATUS — checkpoint, archive — история. PR содержит проблему/результат, реальные проверки, scope и ограничения. Targeted retest не выдавать за единый full PASS.

Не возвращать старые ZIP/.git и не push --all/--mirror. [SECRET_CLEANUP](docs/SECRET_CLEANUP.md) сохраняет незакрытые вопросы ротации без значений.
