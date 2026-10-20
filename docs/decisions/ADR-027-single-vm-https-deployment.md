# ADR-027: Выделенная Oracle VM и HTTPS перед существующим frontend

Status: Accepted; deployed on dedicated Micro and public acceptance verified20.10.2026.
Date: 2026-10-20.

## Context

Пользователь поручил публикацию в своём Oracle, новую VM, бесплатный поддомен
и перенос текущих DB/storage. Рабочий локальный сайт и накопленный diff нужны
для сохранения данных и демонстрации. Исторический tunnel не является VPS hosting.

## Options Considered

1. Оставить локальный tunnel: зависит от компьютера пользователя.
2. Managed frontend/database/storage: больше отдельных сервисов и секретов.
3. Одна выделенная Linux VM с прежним Compose и отдельным TLS reverse proxy.

## Decision

Вариант3: существующие PostgreSQL/API/worker/frontend плюс Caddy официального
multiarch image2.11.7 с зафиксированным registry digest. Существующий public
override задаёт HTTPS Origin и Secure cookies; отдельный https override добавляет
только edge80/443, volumes сертификатов и restart. DB/API ports остаются закрыты.
Предварительный DNS — nip.io по публичному IPv4, без отдельной регистрации.

## Reasoning

Сохраняются текущие API/auth/roles/data/risk/PDF semantics и проверенная модель
DB+файлы. Единственное runtime уточнение — ограниченное время ожидания read-only
PDF на throttled Micro, без изменения CPU/address caps или данных. Единый reverse
proxy решает TLS issuance/renewal и редирект, а не самописный certificate job.
Пакет файлов с SHA включает непубликованный код; прежний Git HEAD недостаточен.

## Consequences

После двух отказов A1 по capacity пользователь выбрал бесплатную E2.1.Micro
для демонстрации. Native amd64 images собраны на компьютере, передаются по SSH
с SHA manifest и запускаются через prebuilt override/`--no-build`. VM1GB получает
4GiB swap. Это ограниченная демонстрационная ёмкость; фактические OCR/PDF пики
проверяются отдельно, сборки на Micro не выполняются. Все логи ротируются.

Один сервер — единая точка отказа. Данные и сертификаты сохраняются в отдельных
storage/volumes; off-VM backup нужен отдельно. Restore проверяется до миграции,
candidate отдельно мигрирует копию без изменения оригинального dump. Existing
analyst login сохраняется, DB/session secrets новые; старые login sessions
очищаются только на новой серверной копии, поскольку hash сессии не зависит
от SESSION_SECRET. Новое DEMO-наполнение и внешние integrations выключены.

## Risks

Micro PDF приёмка обнаружила фактическое wall24.76s при прежнем API cutoff12s.
Добавлены ограниченные configurable wall deadlines document1..60s (default12)
и proxy1..75000ms (default15000) только GET PDF. Micro использует60s/75000ms;
CPU12s/address1GiB/renderer slots2 и15s прочих запросов сохраняются.
Это не повышение размера/сложности разрешённых документов; долгие параллельные
рендеры остаются ограничением Micro. Результат проверяется через публичный frontend.

Квоты/остаток и capacity Always Free неизвестны до входа в аккаунт. Нужен native
ARM64 build/runtime test, если выбрана A1. Выпуск TLS зависит от DNS/80/443/CA.
Free DNS и ephemeral public IP не дают собственного стабильного домена.
Одновременный запуск worker на двух копиях не должен удвоить включённый сбор.
Требуется проверка перенесённых jobs/leases/schedules перед стартом server worker.

## Future Work

Внешняя HTTPS/browser/OCR/PDF и stop/start приёмка пройдена. Далее регулярные encrypted
off-host backups/restore drills, собственный DNS при необходимости, мониторинг
и эксплуатационные ограничения публичного пилота. Публикация не закрывает
независимую предметную/RU-KZ/источниковую приёмку продукта.
