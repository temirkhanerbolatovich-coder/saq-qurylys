# Ручное предложение платёжного фрагмента

SQ-04 дополняет проверку, когда правила пропустили PAYMENT_TERM. Точный текст/OCR
не перефразируется. В карточке публикации или `/review` аналитик раскрывает
«Предложить пропущенный фрагмент», выделяет цитату либо указывает Unicode codepoint
offsets, проверяет версию/источник и вводит причину. Сохранение создаёт только
MANUAL/PENDING. Границы, цитата, автор, дата и причина сохраняются в hypotheses/audit.

Другой analyst независимо подтверждает или отклоняет предложение с причиной.
Автор не может проверить своё; viewer только читает. CORRECT запрещён для MANUAL:
другой фрагмент предлагается отдельно. История остаётся в audit; повторное
отклонение инвалидирует зависимые подтверждения штатным способом.

Даже после CONFIRMED требуются отдельная привязка к объекту, evidence и решение R2.
False-negative допускается только при совпадении точного текста и authenticated
proposal/review audit, разных авторе/проверяющем и сохранённых причинах. Подмена
origin/флагов не заменяет журнал. AUTO payment_offer, DEMO/source/latest/date/legal/
revision guards и формула риска не изменены.

Контракт0.33.0: POST `/api/v1/extractions/{id}/manual-annotations` принимает
expected_revision, field=PAYMENT_TERM, quote, start_offset/end_offset, reason;
возвращает201 ExtractionOut. Конец не включается, цитата1–2000 символов, до100
ручных предложений на версию. Границы проверяются сервером, дубликат даёт409.
CSRF/session/analyst и Idempotency-Key обязательны. Ошибка сохраняет черновик;
refresh повторяет GET; retry с тем же payload сохраняет ключ команды.

Используется существующий JSON hypotheses: миграции/backfill не нужны. Старые
гипотезы читаются как AUTO; OCR/исходники/matches не заменяются.
[Модель и tradeoffs](decisions/ADR-029-independent-manual-payment-annotations.md).
В установке с одним analyst предложение ожидает второго уполномоченного
проверяющего. Самоутверждение не разрешается; аккаунты на рабочем сервере этим
этапом не создаются. Production rollout и предметная приёмка — отдельные операции.

Проверки: backend/tests/test_manual_annotation.py; frontend/tests/
sq-manual-annotation.spec.ts; opt-in sq-manual-live.spec.ts. Последний требует
изолированный runtime, дополнительный flag и выделенное DEMO-досье.
Точные receipts — [SQ_FIX_PROGRESS](implementation/SQ_FIX_PROGRESS.md).
