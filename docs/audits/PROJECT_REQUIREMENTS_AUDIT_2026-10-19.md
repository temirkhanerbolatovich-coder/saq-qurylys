# SAQ QURYLYS — текущая сверка реализации с ТЗ

Дата:19.10.2026. Исполнитель: Codex. Основание: просьба пользователя провести
полный аудит проекта и перечислить реализованное, отсутствующее и следующие работы.
Это функциональная сверка требований/кода/сохранённых проверок и текущего runtime,
не новый полный прогон тестов, penetration test или внешняя предметная приёмка.
Код, рабочая БД, конфигурация и сервисы в ходе аудита не изменялись.

## Основания и актуальность

- CODEX_TZ.md и docs/REQUIREMENTS.md, матрица O-01–O-10/C-01–C-06.
- docs/SAQ_QURYLYS_UI_UX_TZ_v2_2026-10-19.md, принятые DESIGN_SYSTEM/UX решения.
- docs/SAQ_QURYLYS_Social_Monitoring_TZ_v2.md, FEATURE_SOCIAL_MONITORING_V2.
- Текущие backend/app, frontend/components, миграции, OpenAPI, CI workflow,
  PROJECT_STATUS, UI_AUDIT, OCR_EVALUATION, REMAINING_CHECKLIST и QA-артефакты.
- Git: codex/audit-workflow-fixes, HEAD b15608664f271367b3cc63505def5041f1c69117,
  большой накопленный modified/untracked diff. HEAD не представляет весь текущий код.
- Read-only runtime: четыре primary контейнера работают; DB revision ce78da56f249,
  properties25, advertisements44, signals0, url_schedules0. В live OpenAPI есть
  CSV/query-profiles/url-schedules; monitoring/dictionaries отсутствует.
  Нулевые signals/schedules означают отсутствие записей, не отсутствие функций.
- V2 persistence в исходниках/QA имеет revision df89eb67a350. Его установка на
  primary не выполнена. Утверждения старых разделов «V2 DEFERRED», «нет C-01»
  и «нет полного browser PASS» устарели и не описывают текущий итог.

## Основное ТЗ

| ID | Реализация | Остаток / граница |
|---|---|---|
| O-01 | Обзор, карта/реестр, материалы, проверка, риск, сигналы связаны через API | Удобство работы независимых пользователей не принято |
| O-02 | DEMO seed ≥8 объектов/≥12 материалов, сценарии A/B/C, отдельный bootstrap без DEMO | Проверить согласованный демонстрационный набор в окончательной поставке; текущая рабочая БД не DEMO-полигон |
| O-03 | Ручной текст/изображение/URL-метаданные, исходники, время получения, версии/SHA | Дата публикации остаётся null, если неизвестна |
| O-04 | Новый файл → Tesseract → правила извлечения/RapidFuzz → отдельная проверка человеком | Независимое качество реальных RU/KZ не подтверждено; LLM не подключена и не обязательна для этого сценария |
| O-05 | CONFIRMED R1–R6, веса35/25/10/15/10/5, dedup кодов, RED≥60 только с R1+R2 | Правовые процедуры требуют внешней предметной приёмки |
| O-06 | Явное подтверждение/возврат сигнала, автор/время/причина, версии | Автоматической отправки обвинительных выводов нет |
| O-07 | Исторический PDF сигнала; дополнительно выбираемый текущий отчёт досье и выгрузки | Физическая печать/машина защиты не приняты |
| O-08 | Docker/README/Alembic, проверенный локальный clean-start, restart и backup/restore | Второй физический ПК не проверен; частично закрыто |
| O-09 | DEMO, UNKNOWN, отдельные REAL/DEMO, защита секретов, provenance | Повторить hygiene/security проверку конечной сдаваемой ревизии |
| O-10 | Репозиторий/README/env example/seed/tests/описание ИИ имеются | Текущий diff не равен опубликованному SHA; окончательная версия, доступ жюри и сдача не подтверждены |
| C-01 | Ограниченный AN GROUPS/payment: URL → job → HTML/text/SHA, явный импорт и URL-расписание | Один точный источник, не общий обход и не поиск соцсетей; более широкий доступ отдельно |
| C-02 | Tesseract rus+kaz+eng, оригинал/OCR/ручная расшифровка раздельны | KZ OCR fidelity и внешний holdout открыты |
| C-03 | Название, условия оплаты, суммы/проценты, fragments, RapidFuzz-кандидаты | Нет универсального понимания/полных дат; address/BIN matching не реализован |
| C-04 | Next.js/FastAPI/PostgreSQL/Alembic/worker/WeasyPrint | Пилотная эксплуатация/HA не входят в реализованный MVP |
| C-05 | Dashboard, очередь отдельных решений, audit, версии сигналов | Внешняя UX/предметная приёмка открыта |
| C-06 | Backend/frontend/E2E и CI workflow реализованы | Свежий полный Linux-прогон и CI конечного SHA не подтверждены |

Основные кодовые доказательства: app/risk.py; api/{advertisements,analysis,reviews,
signals,signal_pdf,exports,properties}.py; worker.py; ocr.py; extraction.py;
seed.py; frontend/components/{workspace,analysis-workspace,review-queue,
signals-workspace}.tsx. Наличие модели/endpoint само по себе не считалось приёмкой.

## Дополнения, уже реализованные

- CSV: template/preview/commit/journal, версии оригиналов, дедуп, идемпотентность.
- Каталог источников и сохраняемая история ручного Threads preview.
- Конструктор RU/KZ1.0, серверные версии профилей и явное восстановление.
- Расписание точных разрешённых URL: OFF по умолчанию, enable/disable, квоты,
  backoff/история и восстановление; отсутствие созданных расписаний допустимо.
- Кандидат мониторинга → новое досье или связь с существующим, отмена ошибочной
  связи с историей; это отдельные команды, не автоидентификация V2.
- Ручная работа с официальными документами/КЖК PDF и предварительной сверкой.
  Автоматического подтверждённого полного REAL-реестра нет.
- Настоящие вкладки досье, сохранение фильтров/черновиков, поиск/пагинация,
  оболочка RU/KZ, иконки, PDF с выбором разделов, responsive/focus/reduced-motion.
- Telegram outbox/worker и личное подключение проверялись ранее; новая live
  доставка в этом аудите не выполнялась. Это не интеграция отправки в госорганы.

UI частичен по полному переводу длинных текстов, независимой KZ-редактуре,
screen-reader/full WCAG и UX-приёмке. Системный шрифт оставлен после A/B — это
допустимое решение по ТЗ, а не забытая установка Inter. Тёмная тема не принята
как обязательный master. Последнее исправление CSS карты находится в QA/исходниках.

## Social Monitoring V2 — отдельный незакрытый объём

| Требование | Факт | Что завершить |
|---|---|---|
| Оригинал/v2, SHA, schema, seed/hashtags | Реализовано | Не изменять исходники при дальнейшей интеграции |
| Версии/активация/audit | API/DB реализованы и QA проверены | UI активации и установка |
| Bounded query compiler, IDs/provenance/capabilities | Offline реализован | Полный редактор групп/custom/exclusions/project/phase и реальное исполнение |
| Context RU/KZ, negation/timing/amount/year/family-phase/P1–P3 | Чистые правила/CLI с регрессиями | Подключение к находкам; полные даты, сложный смешанный контекст, внешний holdout |
| Поисковые профили V2 | Immutable preview и история реализованы | UI, привязка к запуску по profile ID/revision |
| Threads | Ограниченный запрос одной страницы и журнал существуют | Подтверждённый доступ, V2 adapter/integration, пагинация/coverage/курсор |
| SocialCollector check_access/capabilities/search/normalize/health | Единого V2 контракта и полного pipeline нет | Минимальная интеграция существующего источника без дублирования инфраструктуры |
| Findings/version/dedup/last_seen/query_ids | Нет целостного V2 хранения/маршрута | ID+SHA/version, canonical URL, many-query provenance, import/analysis IDs |
| Неизвестный ЖК → candidate_object_id/resolution revision | Есть отдельная ручная подсистема кандидатов; V2 отдаёт гипотезу | Соединить эти сценарии, не создавать подтверждённый Property автоматически |
| Явный import finding → Advertisement/OCR/review | Нет V2 сценария | Повторное использование текущего импорта, идемпотентность и provenance |
| UI находок/P1–P3/false positives/manual priority/review set | Не реализован | Очередь/карточка/причины/аудит и фильтры |
| Search run SUCCESS/PARTIAL/FAILED/BLOCKED и полнота | Старый журнал имеет другой набор статусов/одну страницу | Явное совместимое отображение статусов без потери EMPTY/INTERRUPTED |
| Search scheduler, checkpoint, overlap window | Нет; имеющийся scheduler относится к URL | Отдельный P1 после доступа; квоты и restart на страницах |
| Второй источник/Meta/Instagram/TikTok/Krisha | Не подключены как V2 collectors | Проверка разрешённого доступа, затем P1; Telegram-сбор/ASR/кроссплатформенные кластеры P2 |
| REAL vs DEMO / WAITING_REGISTRY | Защитная логика есть; V2 контекст всегда WAITING_REGISTRY | Авторитетный датированный REAL-источник и ручная проверка соответствия |

## Что фактически проверено

- Последний backend:1153PASS/20SKIP/4ERROR,415.92s. Четыре ошибки setup/teardown
  двух CSV inputs вызваны длинным PYTEST_CURRENT_TEST на Windows; короткие IDs
  исправлены. Повтор CSV/V2/migration/profiles/contract:57PASS,30.90s. Это НЕ новый
  полностью зелёный единый прогон. Логи: .local/v2-storage-19ec5787/.
- V2 Docker smoke: registration→activation→profile→deactivation→API restart PASS;
  история/preview сохранены. Ruff check/format и diff check проходили.
- Последний сохранённый полный browser suite до V2 API:221PASS/2opt-inSKIP;
  отдельный новый DEMO CSV→review→signal→скачанный PDF и restart проверен.
- Предыдущая сверка primary:31 таблица/50 файлов/настройки неизменны.
- Аудит не повторял OCR/browser/security scans, не проверял live-права платформ,
  remote CI, юридическую актуальность источников и независимые UX-метрики.

## Приоритетный остаток

1. Завершить offline V2 P0: immutable findings → context → candidate resolution →
   явный импорт в existing review → UI. Критерий: новый ввод проходит всю цепочку,
   повтор не дублирует, изменение создаёт версию, история воспроизводима.
2. Отдельно проверить разрешённый Threads-доступ. При отсутствии оставить BLOCKED;
   закрывать offline P0 без ложного заявления о live acceptance.
3. Независимый RU/KZ holdout: relevance precision/recall, P1 precision, object/phase,
   duplicates/provenance/coverage. KZ разметка человеком; исправлять измеренные ошибки.
4. Зафиксировать candidate release: полный Linux backend (включая PDF/resource),
   frontend/build/browser, новый V2 E2E, hygiene/security и backup/restore.
5. Отдельно согласованно установить/опубликовать проверенную версию, подтвердить
   миграцию/сохранность рабочей базы и CI именно сдаваемого SHA.
6. Второй физический ПК, UX 3–5 людей, предметные процедуры R1/R5/R6, репетиция,
   доступ жюри, правила freeze и фактическая сдача. Видео/презентацию не возобновлять
   без новой просьбы: пользователь исключил их из текущей работы.
7. После P0: другие источники/search scheduling/near-duplicates; перед пилотом
   user management/SSO, TLS, retention, нагрузка, мониторинг и внешние backups.

Отдельный вопрос заказчику: возможность вручную создать пропущенную PAYMENT_TERM
гипотезу, если extractor её не предложил. Текущая процедура R2 требует проверенную
гипотезу; расширение полномочий нельзя молча подменять техническим исправлением.

Вывод: основное аналитическое MVP реализовано, но окончательная поставка и внешняя
приёмка не закрыты. V2 — работающий фундамент в исходниках/QA, не готовый сквозной
парсер. Промышленная готовность и автоматический мониторинг всех соцсетей не заявлены.
