# ADR-028: Явное происхождение даты публикации в evidence

Status: Accepted. Date: 2026-10-20.

## Context

Fallback publication → capture в рекламном evidence называл фиксацию датой
события. Архивные снимки не позволяют надёжно восстановить тип старой даты.

## Options Considered

1. Перезаписать существующие evidence/snapshots: разрушает историю.
2. Только переименовать подпись: новые снимки сохраняли бы неоднозначность.
3. Аддитивные output fields и явный legacy fallback без backfill.

## Decision

Вариант 3. Новые ADVERTISEMENT_FRAGMENT и ADVERTISEMENT_PUBLICATION сохраняют
`published_at` отдельно от `captured_at`; `date_basis` равен PUBLICATION либо
CAPTURE_ONLY. При неизвестной публикации event_at=null. Сервер копирует даты
источника независимо от клиентского event_at. Для старых записей отсутствующие
поля читаются как published_at=null/date_basis=LEGACY_UNSPECIFIED.

## Reasoning

Существующий JSONB details позволяет совместимое расширение без миграции или
редактирования исторических данных. Сравнение stale нормализует только новые
отсутствующие defaults на обеих сторонах; не обогащает архив текущими сведениями.

## Consequences

Контракт0.32.0 дополняет Evidence/EvidenceOut output. В UI/новых PDF публикация,
фиксация и неопределённая историческая дата различаются. Legal periods/review
dates/IDs берутся из frozen snapshot. PDF явно показывает confirmed/unknown
codes и ограничение GREEN. Готовые архивные PDF выдаются прежними bytes.

## Risks

Старую publication date нельзя установить только по прежнему event_at.
Неизвестный конец периода не означает бессрочную применимость. Формула риска,
R1/R2 date guards, роли и независимость решений не меняются.

## Future Work

SQ-11 отдельно расширяет provenance проверяющего; внешняя правовая/языковая
приёмка и политика хранения архивов остаются отдельными gates.
