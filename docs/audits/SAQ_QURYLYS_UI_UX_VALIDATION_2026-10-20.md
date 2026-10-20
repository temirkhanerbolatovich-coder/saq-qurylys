# SAQ QURYLYS — валидация завершения аудита · 20.10.2026

Приложение к [основному отчёту](SAQ_QURYLYS_UI_UX_AUDIT_2026-10-20.md). Исходники приложения не исправлялись. Все изменяющие тесты выполнены на новом disposable PostgreSQL; рабочие/QA БД, storage, расписания и внешние каналы не использовались. Браузерный обход опубликованного сайта был только для чтения.

## Новые проверки этой сессии

| Проверка | Фактический результат | Доказательство и граница |
|---|---|---|
| Полный backend suite | **1180 PASS / 20 SKIP / 0 FAIL**, exit 0, 520.18 s | [full-backend.log](assets/product-audit-completion-20261020/validation/full-backend.log). Свежий PostgreSQL, случайные контейнер/порт/пароль, только loopback; test schemas и собственный контейнер удалены |
| Перестановка PDF→legal | **1 PASS / 1 FAIL**, exit 1, 4.82 s | [order-reproduction.log](assets/product-audit-completion-20261020/validation/order-reproduction.log). Это ожидаемо воспроизведённый SQ-15, не зелёная проверка |
| Восемь legal cases отдельно | **8 PASS / 35 deselected**, exit 0, 13.66 s | [legal-recheck.log](assets/product-audit-completion-20261020/validation/legal-recheck.log); отдельная schema, точная/неизвестная/разная дата R1/R2 |
| Ruff | PASS, exit 0 | backend: python -B -m ruff check --no-cache .; результаты исполнителя в [backend-audit.md](assets/product-audit-completion-20261020/validation/backend-audit.md) |
| Ruff format | PASS, 139 files already formatted | backend: python -B -m ruff format --check --no-cache .; без изменения файлов |
| Alembic | Один head ef90fc78b461; upgrade head + check PASS | [migration-model-parity.log](assets/product-audit-completion-20261020/validation/migration-model-parity.log), No new upgrade operations detected. Свежая отдельная schema, рабочая БД не затронута |
| Frontend lint | PASS, exit 0 | frontend: npm run lint; diagnostics отсутствовали. Новые tool stdout не сохранялись на диск, полная длительность не измерена |
| Frontend typecheck | PASS, exit 0 | frontend: npm run typecheck -- --incremental false; без tsbuildinfo. Вывод только в tool stdout, длительность не измерена |
| Pure SQ-02/03/04 probes | Условия дефектов подтверждены | [pure-probes.json](assets/product-audit-completion-20261020/validation/pure-probes.json). HTML/parser без сети/БД; это не свежий native PDF render |
| Saved release source parity | 449 SHA совпали до итогового documentary update | [source-parity-completion.json](assets/product-audit-completion-20261020/validation/source-parity-completion.json). Сравнение с локально сохранённым manifest, не remote filesystem |
| Git diff --check | PASS | Проверка текущего накопленного tracked diff и заключительных audit docs; предупреждения CRLF сами по себе не ошибка whitespace |

Точная команда полного набора, cwd backend; окружение намеренно переопределено на disposable DATABASE_URL, синтетические session/bootstrap значения, Telegram/Threads OFF, PYTHONDONTWRITEBYTECODE=1:

~~~text
../.venv/Scripts/python.exe -B -m pytest -q -p no:cacheprovider --basetemp <scratch>/pytest-temp --tb=short -rs
~~~

Scratch: C:/Users/Админ/Documents/Codex/2026-10-20/ns/work/backend-audit. Пароли и строки подключения в отчёт не включены. Без подтверждённой изоляции эту команду на рабочей DATABASE_URL повторять нельзя: существующие API-тесты создают и изменяют данные.

Точная минимальная перестановка SQ-15:

~~~text
pytest tests/test_signal_pdf.py::test_pdf_get_is_read_only_and_queue_is_idempotent tests/test_legal_absence.py::test_matching_absence_and_payment_are_red_in_either_order[absence-first] -q -p no:cacheprovider --basetemp <scratch>/order-temp --tb=short -ra
~~~

Полный набор в обычном порядке зелёный, но эта перестановка воспроизводит зависимость общей очереди. Worker корректно берёт старый PDF job; helper ошибочно предполагает, что один process_one завершит именно новый ANALYZE. Не менять production FIFO для исправления теста.

20 SKIP: dossier real PDF — 2; open-registry PDF decoding — 1; PDF validation/resource limits — 2; signal native Pango — 1; supporting-document PDF inspection/resource limits — 14. Свежий Windows-прогон не подтверждает эти Linux-проверки. Их прежние runtime receipts отмечены отдельно в основном отчёте.

## Новые браузерные наблюдения

Через Chrome/CUA открыт опубликованный HTTPS-сайт под существующей analyst-сессией. Не вводились новые credentials, не создавались материалы/решения/задания, не включались источники/расписания, не запускались поиск и формирование PDF. Выбор метки, смена вкладки и открытие диалога меняли только интерфейс. Новая временная вкладка освобождается по окончании; viewport reset выполнен.

| Область | Размеры и результат | Ограничение |
|---|---|---|
| DEMO-досье | 360×800, 390×844, 768×1024, 1024×768, 1440×900, 1920×1080. На всех scrollWidth = clientWidth; все 6 tabs присутствуют | Только выбранное досье/его обзор, не все наборы данных/состояния |
| Диалог отчёта | Те же 6 размеров; находится в viewport, собственная прокрутка body; Escape закрывает, фокус возвращается на «Скачать отчёт» | Generate/download не выполнялся; полная keyboard trap/screen reader проверка не выполнена |
| Карта | 1440×900 и 390×844; выбор метки открыл объект/UNKNOWN/досье; page overflow отсутствует на390 | Не проверялись все zoom/tiles failures и большие spatial datasets |
| Основные разделы | Dashboard, advertisements, review, signals, monitoring на1440; каталог sources; Parser V2 | Проверены загрузка/видимые состояния и навигация, не все формы и ошибки |
| Внешние подключения | Threads показывает OFF/нет токена; V2 пустая очередь объяснена без вывода «рекламы нет» | Live search и source API заново не вызывались |
| Консоль | Captured error/warn logs пусты в конце обхода | Относится к данной вкладке/обходу, не ко всем возможным состояниям |

[Досье: численные измерения](assets/product-audit-completion-20261020/responsive-dossier.json), [диалог](assets/product-audit-completion-20261020/responsive-dialog.json), [маршруты](assets/product-audit-completion-20261020/routes-readonly.json), [консоль](assets/product-audit-completion-20261020/browser-console.json). Сохранено 22 JPG, включая шесть размеров досье и диалога, основные разделы и карту. Скриншот с mobile keyboard в имени не является доказательством полного focus trap; клавиатурный эксперимент не дал надёжного результата для этого утверждения.

Показанные при первоначальной навигации loading-состояния не объявлялись поломкой. В Sources/Parser V2 выполнено повторное чтение после загрузки данных. Ошибка обращения к чужой занятой вкладке устранена созданием своей вкладки; не является дефектом продукта. Ошибка автоматизации getByRole с неподдерживаемым level устранена явным h1; не является дефектом сайта.

## Предыдущий этап того же аудита

Прочитаны .local/product-audit-20261020/validation/VALIDATION_SUMMARY.md и receipts:

- Focused backend: **199 PASS / 8 FAIL / 3 SKIP**, все восемь legal отдельно **8 PASS**, минимальная перестановка **1 PASS / 1 FAIL**. Не превращать эту совокупность в зелёный focused run.
- **17 mocked presentation PASS**, final frontend image, disposable frontend с API_INTERNAL_URL на неработающий адрес и intercept fixtures; это не live backend E2E.
- Node proxy tests: **2 PASS**; source manifest **449/449**; OpenAPI operation parity **89 documented / 89 actual**, без missing/extra/mismatched operation IDs. Эта parity не заменяет semantic contract/security testing.
- Линтеры/типизация предыдущего этапа PASS; 4.75s/19.11s относятся к нему, не к новым запускам этой сессии.

Новые сборки приложения, полный browser suite, security penetration, production load test, независимый holdout OCR, роли в живом браузере, полный WCAG/языковой аудит и второй физический ПК не выполнялись. Последний прежний полный browser result был 233 PASS / 1 FAIL / 2 SKIP с последующими focused повторами, а не единый новый final browser PASS.

## Финальная граница

Код и установленное приложение не исправлялись. Созданы/уточнены только audit Markdown, ссылки в PROJECT_STATUS и копии доказательств/скриншотов. Исходный dirty diff сохранён; commit/push/deploy и удаление пользовательских данных не выполнялись. Финальный documentation/link/source check приложен как audit-package-check.json; изменения после baseline449 ограничены документами аудита/статусом, runtime source не менялся.
