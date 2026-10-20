# Диагностика

Начните с docker compose ps и logs --tail 100 api worker frontend. Не публикуйте compose config без --quiet: он может раскрыть environment. Логи с пользовательскими данными передавайте приватно после редактирования.

| Симптом | Проверка и действие |
|---|---|
| Docker address pools exhausted | Не prune чужие сети. Проверить все network IPAM и выбрать непересекающуюся подсеть только для собственного QA override; это настройка окружения |
| Docker unavailable | docker info, Linux engine/WSL2, доступ пользователя; не system prune |
| Port занят | Windows Get-NetTCPConnection -LocalPort 3000; Linux ss -ltn; другой порт генератором в новой копии |
| API unhealthy | DB health и API logs; /health выполняет SELECT 1 |
| DB auth error | Приватно сверить POSTGRES_* и DATABASE_URL; env образа не меняет пароль роли существующего volume |
| Storage permission | Подготовить владельца новой папки по README; не chmod -R 777 |
| Alembic drift/heads | heads/history на исходниках; check тестовой БД; не stamp production для сокрытия ошибки |
| Нет rus/kaz OCR | worker tesseract --list-langs; штатный backend image и language packages |
| PDF/Pango error | Linux libraries/fonts; native Windows не покрывает POSIX limits |
| PDF timeout | Сверить API/worker/proxy deadlines и очередь; тяжёлые Micro отчёты последовательно |
| Job QUEUED | Worker logs, одна DB/storage, lease; не запускать тестовый worker над рабочей очередью |
| Next build/start | Node24, npm ci, frontend root; остановить свой standalone до build |
| E2E safety отказал | Отдельная копия/.env/DB/storage, loopback3090 и opt-in до OCR/Playwright |
| HTTPS403 | APP_ORIGIN, Secure cookie, proxy; не ослаблять CSRF |
| Генератор отказался | .env/credentials сохранены; новая папка либо приватная ручная корректировка |

## Без записи

```sh
docker compose ps
docker compose logs --tail 100 api worker frontend
docker compose exec -T api python -c "import urllib.request; print(urllib.request.urlopen('http://127.0.0.1:8000/health').status)"
docker compose exec -T worker tesseract --list-langs
```

check_readiness.py относится к штатному локальному project. verify_ocr, pytest, seed и browser E2E создают записи.

[DEPLOYMENT](DEPLOYMENT.md) описывает обновление/откат, [BACKUP_RESTORE](operations/BACKUP_RESTORE.md) — данные. Сначала сохранить evidence; восстановление — в новую пустую DB/storage.
