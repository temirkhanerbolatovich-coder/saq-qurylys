# Архитектурные решения

ADR сохраняют контекст, варианты, причины и последствия. Каждый действует в своей области; реализацию проверять по [PROJECT_STATUS](../../PROJECT_STATUS.md). Каталог содержит все решения ADR-001—ADR-029, сохранённые в этой ревизии.

| Решение | Назначение |
|---|---|
| [ADR-001](ADR-001-mvp-baseline.md) | Один backend и контролируемая обработка с проверкой человеком |
| [ADR-002](ADR-002-durable-analysis-review.md) | Версии OCR, lease очереди и пересмотр зависимого риска |
| [ADR-003](ADR-003-dated-legal-applicability.md) | Текущая применимость основания вычисляется при чтении |
| [ADR-004](ADR-004-dated-construction-evidence.md) | Датированные строительные сведения и отдельное решение по R3/R5/R6 |
| [ADR-005](ADR-005-dated-all-mechanism-absence.md) | R1 по датированному заключению обо всех трёх механизмах |
| [ADR-006](ADR-006-immutable-signals-pdf.md) | Неизменяемые сигналы и PDF конкретной ревизии решения |
| [ADR-007](ADR-007-bounded-passive-pdf-upload.md) | Ограниченная проверка исходного PDF без изменения оригинала |
| [ADR-008](ADR-008-bounded-url-transport.md) | Ограниченный HTTPS-транспорт до выбора источника |
| [ADR-009](ADR-009-telegram-outbox.md) | Telegram outbox после ручного подтверждения |
| [ADR-010](ADR-010-preliminary-monitoring-cases.md) | Предварительная сверка отдельно от правового решения |
| [ADR-011](ADR-011-open-information-and-register-documents.md) | открытые информационные публикации и справочный документ реестра |
| [ADR-012](ADR-012-derived-material-review-work.md) | вычисляемый остаток решений по материалу |
| [ADR-013](ADR-013-bounded-saved-text-comparison.md) | ограниченное сравнение сохранённых DB-текстов |
| [ADR-014](ADR-014-frontend-build-root-and-source-hygiene.md) | явная граница frontend сборки и только исходники в Git |
| [ADR-015](ADR-015-scoped-history-cleanup.md) | ограниченная очистка истории main от раскрытого ZIP |
| [ADR-016](ADR-016-read-only-record-pdf.md) | Производные PDF без изменения доказательств |
| [ADR-017](ADR-017-candidate-dossier-creation.md) | Явное создание досье из кандидата |
| [ADR-018](ADR-018-existing-dossier-candidate-link.md) | Связь кандидата с существующим досье |
| [ADR-019](ADR-019-candidate-link-correction.md) | Отмена ошибочной связи кандидата |
| [ADR-020](ADR-020-selectable-dossier-report.md) | Выбираемый отчёт текущего досье |
| [ADR-021](ADR-021-csv-material-intake.md) | Предпросмотр CSV и неизменяемые квитанции поступления |
| [ADR-022](ADR-022-durable-monitoring-runs.md) | История явных поисковых запусков |
| [ADR-023](ADR-023-versioned-monitoring-query-profiles.md) | Версии параметров поискового профиля |
| [ADR-024](ADR-024-reviewed-url-scheduling.md) | Управляемое расписание точных открытых URL |
| [ADR-025](ADR-025-monitoring-dictionary-history.md) | История словаря и сохранённые V2 профили |
| [ADR-026](ADR-026-versioned-monitoring-findings.md) | Версии находок и отдельный импорт в проверку |
| [ADR-027](ADR-027-single-vm-https-deployment.md) | Выделенная Oracle VM и HTTPS перед существующим frontend |
| [ADR-028](ADR-028-explicit-publication-date-provenance.md) | Явное происхождение даты публикации в evidence |
| [ADR-029](ADR-029-independent-manual-payment-annotations.md) | Независимая проверка ручного платёжного фрагмента |

Реорганизация docs не меняет архитектуру. Значимые новые решения оформлять с Context, Options Considered, Decision, Reasoning, Consequences, Risks, Future Work. При добавлении ADR обновляйте этот каталог; прежние решения и их историю сохраняйте.

[Каталог документации](../README.md), [архитектура](../ARCHITECTURE.md).
