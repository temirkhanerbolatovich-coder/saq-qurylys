# Безопасность

Не размещайте secrets, cookies, PII, dumps или private storage в публичных issue/PR. Используйте GitHub Private vulnerability reporting, если включён; иначе сначала согласуйте приватный канал с владельцем. Публичный security email и SLA не установлены.

Сохраняйте authentication/roles/CSRF/Origin, input bounds, SSRF/redirect/TLS guards и resource limits. API/DB остаются внутри Docker сети. Demo-публикация не подтверждает production-ready.

CI проверяет tracked paths, локальные Markdown targets, JSON и ограниченные сигнатуры секретов без значений. Это не полный security audit и не универсальное обнаружение credentials.

[SECRET_CLEANUP](docs/SECRET_CLEANUP.md) описывает прежнюю утечку. Отзыв credentials на чужой установке и очистка старых PR/cache refs не подтверждены. Удаление текущего файла не заменяет ротацию. History rewrite и repository settings требуют отдельного согласования.
