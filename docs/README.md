# Документация SAQ QURYLYS

## Первый запуск и работа

[README проекта](../README.md), [DEVELOPMENT](DEVELOPMENT.md), [CLEAN_INSTALL_ACCEPTANCE](CLEAN_INSTALL_ACCEPTANCE.md), [TROUBLESHOOTING](TROUBLESHOOTING.md), [CONTRIBUTING](../CONTRIBUTING.md).

## Архитектура и API

[ARCHITECTURE](ARCHITECTURE.md), [API](API.md), [OpenAPI](../contracts/openapi.yaml), [полный каталог ADR](decisions/README.md), [REQUIREMENTS](REQUIREMENTS.md), [CODEX_TZ](../CODEX_TZ.md).

## Deployment и операции

[DEPLOYMENT](DEPLOYMENT.md), [BACKUP_RESTORE](operations/BACKUP_RESTORE.md), [LOCAL_BACKUP](LOCAL_BACKUP.md), [Oracle installation note](ORACLE_DEPLOYMENT.md), [SECURITY](../SECURITY.md), [SECRET_CLEANUP](SECRET_CLEANUP.md).

## Продуктовые сценарии

Это каталог документации, а не перечень принятых функций. Реализацию, внешние условия и ограничения проверяйте по [текущему статусу](../PROJECT_STATUS.md) и соответствующему руководству.

| Сценарий и руководство |
|---|
| [Коллективное обращение / R4](FEATURE_COLLECTIVE_APPEAL.md) |
| [Ручная проверка стадии, готовности и задержки: R3/R5/R6](FEATURE_CONSTRUCTION_REVIEW.md) |
| [Импорт материалов CSV](FEATURE_CSV_IMPORT.md) |
| [Выбираемый PDF-отчёт по досье](FEATURE_DOSSIER_REPORT.md) |
| [R1: датированная проверка отсутствия правовых оснований](FEATURE_LEGAL_ABSENCE.md) |
| [Правовое основание: документ и датированная проверка](FEATURE_LEGAL_BASIS.md) |
| [RU / KZ interface preference](FEATURE_LOCALE.md) |
| [Ручное предложение платёжного фрагмента](FEATURE_MANUAL_ANNOTATION.md) |
| [Карта объектов](FEATURE_MAP.md) |
| [Предварительная сверка рекламы — первый срез](FEATURE_MONITORING_CASES.md) |
| [Подготовка поисковых фраз](FEATURE_MONITORING_QUERIES.md) |
| [Источники и история запусков Social Monitor](FEATURE_MONITORING_SOURCES.md) |
| [Открытый документ КЖК: версии и поиск](FEATURE_OPEN_REGISTRY.md) |
| [История объекта](FEATURE_PROPERTY_HISTORY.md) |
| [Приоритет проверки объектов](FEATURE_PROPERTY_PRIORITY.md) |
| [Структура ЖК, очередей и корпусов](FEATURE_PROPERTY_STRUCTURE.md) |
| [Сравнение сохранённых публикаций и версий текста](FEATURE_PUBLICATION_COMPARISON.md) |
| [Сохранённые поисковые профили](FEATURE_QUERY_PROFILES.md) |
| [PDF сохранённых материалов](FEATURE_RECORD_PDF.md) |
| [Остаток решений по материалам](FEATURE_REVIEW_QUEUE.md) |
| [Поиск по всей очереди сигналов](FEATURE_SIGNAL_SEARCH.md) |
| [Сигналы и PDF](FEATURE_SIGNALS.md) |
| [Social Monitoring V2 — словари, профили и контекстные правила](FEATURE_SOCIAL_MONITORING_V2.md) |
| [Исходные PDF-документы](FEATURE_SUPPORTING_PDF.md) |
| [Telegram-уведомления SAQ QURYLYS](FEATURE_TELEGRAM.md) |
| [Threads — проверка доступа и ограниченный поиск](FEATURE_THREADS_SEARCH.md) |
| [Импорт открытых страниц по ссылке](FEATURE_URL_IMPORT.md) |
| [Регулярное получение подключённых открытых страниц](FEATURE_URL_SCHEDULES.md) |
| [Импорт пользовательского пакета ВКО](FEATURE_VKO_IMPORT.md) |

## UX, исследования и качество

[DESIGN_SYSTEM](DESIGN_SYSTEM.md), [UX_GUIDELINES](UX_GUIDELINES.md), [UI_COMPONENTS](UI_COMPONENTS.md), [UI_AUDIT](UI_AUDIT.md), [UI_IMPLEMENTATION_PLAN](UI_IMPLEMENTATION_PLAN.md), [OCR_EVALUATION](OCR_EVALUATION.md), [MONITORING_ALGORITHMS](MONITORING_ALGORITHMS.md).

[Источники данных](DATA_SOURCES.md), [обзор исследования](RESEARCH_REVIEW.md), [аудит требований к AI](AI_REQUIREMENTS_AUDIT.md), [вопросы заказчику](CUSTOMER_MEETING_QUESTIONS.md), [прототипы и их ограничения](prototypes/README.md).

## Статус, evidence и источники

[PROJECT_STATUS](../PROJECT_STATUS.md), [шаблон нового checkpoint](../PROJECT_STATUS_TEMPLATE.md), [REMAINING_CHECKLIST](REMAINING_CHECKLIST.md), [REPOSITORY_AUDIT](REPOSITORY_AUDIT.md), [REFACTOR_REPORT](REFACTOR_REPORT.md). audits/ хранит датированные проверки, implementation/ — implementation receipts, data/evaluation/ — versioned synthetic evidence.

[Первичные источники](reference/README.md), [прежний README](archive/README_2026-10-20.md), [полная прежняя история статуса](archive/PROJECT_STATUS_2026-10-20.md). Исторические команды/результаты относятся к своим SHA; они не заменяют текущие инструкции/проверки.
