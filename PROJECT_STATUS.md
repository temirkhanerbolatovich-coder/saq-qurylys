# SAQ QURYLYS — текущий статус

## Repository cleanup · 21.10.2026 · IN_PROGRESS

Исполнитель: Codex, отдельный read-only reviewer deployment/security. Рабочая ветка codex/repository-cleanup в изолированном managed checkout. База b15608664f271367b3cc63505def5041f1c69117 плюс сохранённые 620 исходных файлов (401 tracked/219 новых); исходная рабочая папка/.env/DB/storage не изменяются.

Поручение пользователя: привести GitHub/репозиторий в порядок по полному ТЗ, сохранить бизнес-логику, данные, API/роли/OCR/PDF/историю. Отдельного merge/deploy разрешения нет. Подготовка ветки/PR входит в задачу.

## Продуктовый checkpoint

Контракт0.34.0; 16 миграций, head ef90fc78b461. Источники включают текущий Social Monitor V2 и SQ-01—SQ-15. Предыдущая сессия сообщила Linux1252PASS и browser307PASS/1FAIL/9SKIP + targeted1PASS; это исторические результаты, не единый зелёный full run cleanup.

Текущий production не обновлён этим cleanup. Live social access, принятый REAL-реестр, независимая RU/KZ/OCR/предметная/UX приёмка, второй физический ПК, масштабирование и автоматический off-host backup остаются открытыми.

## Завершённые блоки этой сессии

- Сохранён приватный source snapshot/manifest SHA до изменений; dirty исходники не потеряны.
- Создан пофайловый REPOSITORY_AUDIT с KEEP/MOVE/MERGE/REVIEW; доказанных REMOVE нет.
- Root README/архитектура/статус/deployment history сохранены в docs/archive; исходные PDF/DOCX moved в docs/reference с неизменным SHA.
- Добавляются тематические developer/API/deployment/operations/troubleshooting docs и навигация.
- E2E/OCR require disposable loopback/opt-in, caches исключены из Docker context, CI расширяется.

## Проверки и следующий шаг

Результаты cleanup вносятся в [REFACTOR_REPORT](docs/REFACTOR_REPORT.md). Следующий шаг: завершить CI/hygiene, Ruff scripts, ссылки и isolated Docker build/fresh install/backend/browser acceptance. До фактического результата PASS не заявляется.

История, полные старые ограничения и receipts сохранены в [архиве статуса](docs/archive/PROJECT_STATUS_2026-10-20.md). [SQ fixes receipt](docs/implementation/SQ_FIX_PROGRESS.md), [чеклист](docs/REMAINING_CHECKLIST.md), [аудит репозитория](docs/REPOSITORY_AUDIT.md).

21.10: tools101(1SKIP),Node20,lint/type/format/Ruff/hygiene/4Compose configs PASS; Docker build/start на новых DB/storage3093 и реальный RU/KZ OCR PASS. Full backend/browser выполняются; первое network timeout и harness missing scripts сохранены в REFACTOR_REPORT. Следующий шаг: завершить full runs, опубликовать branch/PR, проверить точный CI SHA и remote fresh clone.
