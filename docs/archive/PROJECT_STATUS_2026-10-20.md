> Архив исходного состояния до repository cleanup 20.10.2026. Даты, результаты и команды ниже относятся к своим историческим версиям. Актуальный вход — [README](../../README.md), текущий статус — [PROJECT_STATUS](../../PROJECT_STATUS.md).

# SAQ QURYLYS — PROJECT STATUS

## SQ fixes ·20.10.2026 ·финальная задача закрыта

SQ-01—SQ-15 исправлены и проверены по этапам 0–7. Linux backend1252PASS;
последний полный browser307PASS/1FAIL/9SKIP, единственный debounce test исправлен
и адресный retest1PASS. Это полный прогон плюс retest, не единый зелёный запуск.
Финальные lint/typecheck/format PASS; build/Node18/Ruff/migrations/PDF проверки PASS.
Полные команды, файлы, история сбоев, таблица15SQ и внешние ограничения —
[SQ_FIX_PROGRESS](../implementation/SQ_FIX_PROGRESS.md), этап7.
Исполнитель Codex; HEAD b156086 + исходный diff + SQ0–7, NOT_COMMITTED.
Приватный manifest: `.local/sq-fixes-20261020/stage7-final-manifest.json`.
Push/deploy не выполнялись. Следующий шаг не запущен: пользователь попросил
закрыть последнюю задачу и остановиться. Production и внешняя приёмка требуют
отдельного продолжения; исторические записи ниже сохранены.

## SQ fixes ·20.10.2026 ·этап6 PASS

SQ-08: lazy first visit пяти вторичных panels с сохранением DOM/state и exactID
изоляцией. ActualNetwork8→4GET,17834→4217decodedbytes; p50latency234→260ms,
ускорение не заявляется. Browser46PASS39.8s,build/lint/type/formatPASS.
Файлы/команды/evidence/исправленные oldtest assumptions —
[SQ_FIX_PROGRESS](../implementation/SQ_FIX_PROGRESS.md).
Codex+scopedagents; b156086+исходныйdiff+SQ0–6,NOT_COMMITTED;безpush/deploy.
Следующий этап7: итоговая полная регрессия.

## SQ fixes ·20.10.2026 ·этап5 PASS

SQ-09: RU/KZ карта/даты/null/legalchoices; source/ISO/reasons сохранены.
Browser51PASS38.9s; Node3PASS; build/lint/type/formatPASS. Ошибкиfixtures исправлены
без ослабления guards. Доступные keyboard/focus/ARIA/lang/reflow checks пройдены;
fullWCAG/nativezoom/screenreader/независимаяязыковаяприёмка NOT_RUN.
Файлы/команды/evidence — [SQ_FIX_PROGRESS](../implementation/SQ_FIX_PROGRESS.md).
Codex+scopedagents; b156086+исходныйdiff+SQ0–5,NOT_COMMITTED;безpush/deploy.
Следующий этап6(SQ-08): Network baseline до lazy-panel изменений.

## SQ fixes ·20.10.2026 ·этап4 PASS

SQ-14: единый44px target token и меньше мобильных служебных отступов.
RU/KZ×6viewport: baseline12PASS, after12PASS; existing UI11PASS; build/format/diff
PASS. Изменены4CSS + dedicated browser test; docs DESIGN_SYSTEM/UI_AUDIT/журнал.
Mobile tabs выше на29–33px; длинное имя может выйти за первый экран.
Подробные файлы/команды/изолированный fixture rerun/NOT_RUN —
[SQ_FIX_PROGRESS](../implementation/SQ_FIX_PROGRESS.md).
Codex + scoped agents; HEADb156086 + исходныйdiff + SQ0–4, NOT_COMMITTED.
Рабочие данные/архивы не менялись, push/deploy не было. Следующий этап5(SQ-09).

## SQ fixes ·20.10.2026 ·этап3 PASS

SQ-06/07/10/11/12/13:6исключающихкатегорий;refreshwarning/GETretry/drafts;
одинсписокдокументовсreviewdrawer;frozenreviewers+legacyID;
actionableDRAFTcounter;directprovenanceвне100events. Контракт0.34,
безmigration/backfill. Backend69PASS3WindowsSKIP+reviewers8PASS;
Linux31PASS;browser39PASS41.9s,static/build/migrationcheckPASS.
Файлы/команды/исправленияtestfixtures/NOT_RUN —
[SQ_FIX_PROGRESS](../implementation/SQ_FIX_PROGRESS.md).
Codex+3scopedagents;HEADb156086+исходныйdiff+SQ0–3,NOT_COMMITTED,
безpush/deploy/рабочихDBопераций. Следующий этап4(SQ-14).

## SQ fixes ·20.10.2026 ·этап2 PASS

SQ-04:MANUAL/PENDING exactquote/Unicodeoffsets,authenticated audit,отдельный другой
analyst,штатный evidence→R2. SQ-05:sharedGETreader90s/proxy75s,отмена/timeout/
strictPDF/retryRU-KZ. Контракт0.33,безмиграции;ADR029. Backend151PASS;
browser26PASS+13PASS(реальный2analystpath/R2=25,R1UNKNOWN,originalSHA);
nativePDF+26s2PASS,Node13PASS,build/lint/type/formatPASS. Полные файлы,команды,
ограничения — [SQ_FIX_PROGRESS](../implementation/SQ_FIX_PROGRESS.md).
Исполнитель Codex+3scopedagents,baseb156086+накопленныйdiff+SQ0–2,NOT_COMMITTED.
Рабочие/productionданные/роли/PDFнеизменялись,деплоя/pushнебыло.
Следующий этап3:SQ-06/07/10/11/12/13.

## SQ fixes ·20.10.2026 ·этап1 PASS

SQ-01/02/03 реализованы: server-derived publication/capture/date_basis,
legacy read-only fallback без ложной staleness; frozen legal period/review
context; confirmed/unknown codes и GREEN disclaimer в новых PDF. Контракт0.32,
необязательные output fields,без миграции/backfill/изменения формулы/guards.
Backend167PASS/1WindowsSKIP91.04s;finalpure12PASS;Linux20PASS11.02s с native
archive bytes/SHA;browser14PASS21.3s,RU/KZ4viewport8screenshots;3nativePDF/9pages
проверены;Alembic upgrade/check,build/lint/typecheck/format/diff PASS.
Файлы,точные команды,промежуточные failures и NOT_RUN —
[SQ_FIX_PROGRESS](../implementation/SQ_FIX_PROGRESS.md). Исполнитель Codex
и2scoped agents,HEAD b156086+исходныйdiff+SQ0/1,NOT_COMMITTED.
Рабочие/production DB/архивы не менялись;push/deploy не было.
Следующий этап2:manual proposal→independent review и PDFtimeouts.

## SQ fixes ·20.10.2026 ·этап 0 PASS

Пользователь разрешил последовательное исполнение этапов0–7 по приложенному ТЗ.
Прогресс/точные команды/границы: [SQ_FIX_PROGRESS](../implementation/SQ_FIX_PROGRESS.md).
SQ-15 воспроизведён1PASS/1FAIL и исправлен в test-only cleanup общей disposable
очереди; production FIFO не менялся. Final focused113PASS/1WindowsSKIP77.19s;
baseline full1185PASS/20WindowsSKIP380.87s (до финального error-shape/API-case,
которые проверены focused). Backend Ruff/format140files,frontend lint/typecheck,
diff--checkPASS. Архивы/пользовательские DB/история не менялись. Изменены
backend/tests/conftest.py,новый test_queue_isolation.py и progress/эта запись.
Исполнитель Codex;HEAD b15608664f271367b3cc63505def5041f1c69117+исходный278-path
diff+перечисленные изменения,NOT_COMMITTED;push/deploy не выполнялись.
Следующий этап: SQ-01/02/03; внешняя/production приёмка отдельно.

## Продуктовый/UI–UX аудит · 20.10.2026 · завершён без исправлений

Завершён прерванный аудит по заданию «CODEX UI/UX ROAST & FULL PRODUCT AUDIT»:
[отчёт A–N](../audits/SAQ_QURYLYS_UI_UX_AUDIT_2026-10-20.md),
[15 проблем](../audits/SAQ_QURYLYS_UI_UX_ISSUES_2026-10-20.md),
[команды, результаты и границы](../audits/SAQ_QURYLYS_UI_UX_VALIDATION_2026-10-20.md).
Приоритеты: 0 P0 / 5 P1 / 9 P2 / 1 P3. Основные риски — смысл publication/capture
dates в evidence, временной контекст оснований, UNKNOWN в signal PDF, отсутствие
самостоятельного предложения пропущенного PAYMENT_TERM и client25s при server/proxy60/75s.

Свежий полный backend на новом disposable PostgreSQL: **1180 PASS / 20 SKIP /
0 FAIL**, 520.18 s. Windows SKIP требуют Linux PDF/Pango/resource limits. SQ-15
воспроизведён отдельно перестановкой двух тестов: 1 PASS / 1 FAIL; legal отдельно8PASS.
Ruff/format (139 файлов), Alembic upgrade/check, frontend lint/typecheck PASS.
Live read-only обход опубликованного сайта возобновлён: досье/диалог6размеров,
карта1440/390, основные разделы1440; Escape/focus return,22JPG. Full browser suite,
нагрузка, независимая RU/KZ/предметная/UX приёмка и второйПК не повторялись.

Исполнитель Codex; база b15608664f271367b3cc63505def5041f1c69117 + накопленный diff.
До итоговых documentary updates повторно совпали449/449SHA сохранённого release
manifest; remote filesystem не перечитывался. Изменены только audit docs/эта запись
и сохранены evidence. Runtime source, данные, API, роли, snapshots не менялись;
commit/push/deploy не выполнялись. Собственный временный test DB контейнер удалён,
рабочие/QA контейнеры не использовались. Следующий шаг — отдельно согласовать
связный batch исправлений SQ-01–05; аудит не разрешает реализацию автоматически.

## Oracle · PUBLISHED / demo acceptance VERIFIED ·20.10.2026

**Результат:** `https://saq-qurylys.161.33.201.25.nip.io`, отдельная бесплатная
E2.1.Micro `saq-qurylys-prod` в Tokyo,Ubuntu24.04 Minimal amd64,1GB RAM+4GiB swap.
Работает независимо от компьютера. Вход прежний; private access/session/CSRF,
UNKNOWN/DEMO/risk и исторические snapshots сохранены. Локальный primary и старый
assetguard-prod не обновлялись. Paid upgrade/services не включены. Исполнитель
Codex, base b15608664f271367b3cc63505def5041f1c69117+накопленный diff;
commit/push не выполнялись. История подготовки ниже сохранена как историческая.

**Выполнено:** Docker29.9.1/Compose5.6.0 из official repo; dedicated VCN;
OCI SSH только2.134.13.66/32,80/443internet. Native prebuilt API/worker/frontend,
Caddy pinned digest с persistent TLS volumes; DB/API/worker без опубликованных
портов, frontend loopback;10MB×3rotation. Keypair и known_hosts в ignored .local,
первый host key TOFU без независимой fingerprint проверки. Server.env новые
DB/session secrets, analyst login сохранён, seed/Threads/Telegram OFF.

**Данные:** до migration сравнились31table fingerprints/64AssetSHA. Только copied
1044sessions удалены; active jobs0/enabled schedules0. Миграции применены штатно.
Публично скачаны все64оригинала;3архивныхsignal snapshots/decisions/PDF SHA совпали.
Реальный server OCR двух маркированныхDEMO PNG RU/KZ PASS17.45s, по2PENDINGpayment
clauses/bbox, originalSHA identical; нет match/факторов/решений. После smoke
50advertisements/68assets,26properties/3signals; исходные данные сохранены.

**Приёмка:** TLS1.3/Let's Encrypt YE1 до18.01.2027,HTTP308→HTTPS;401anonymous,
403wrongOrigin,200login,Secure/HttpOnly/Strictcookie,logout204→me401. Browser
overview/map/DEMO100RED/documents/ParserV2 loaded. Полный stop/start всех5services,
повторный public auth/64files/3archives/full41pagePDF RU+KZ/досье unchanged/logout
PASS. PDF19.64sRU/20.05sKK. Выборочная visual inspection страниц1/2/10/41 обоихPDF
без glyph/clipping/table/footer дефектов. Извне22/80/443 OPEN,3000/5432/8000 CLOSED.
Финально running/unpaused/OOMfalse, нет queued jobs/включённых schedules.

**Необходимая runtime correction:** Micro не укладывалась в прежний12s document
wall timeout (изолированный renderer24.76s;CPU12s/address1GiB сохранены). Добавлен
DOCUMENT_PDF_TIMEOUT_SECONDS default12/max60 и PDF_PROXY_TIMEOUT_MS default15000/
max75000 только точныеGETPDF. На сервере60s/75000ms; остальные requests15s.
45s/50000ms дали один временный503 под последовательной нагрузкой и заменены
большим bounded запасом; это не гарантия параллельной ёмкости. Рендерить по одному.
Новые8backend+2proxy tests PASS; focused isolatedDB exports/dossier suite28PASS/
2Windows skips; Next compile/typecheck и оба native builds PASS, Ruff/format,
15generator tests, Compose exposure/logging assertions/hygiene/diff checks PASS.
Один попытанный прогон на старой QA-конфигурации не подключился к БД; заменён
новой disposable localhost-only DB, public/primary DB тестами не изменялись.

**Backup вне VM:** server-after-acceptance.tar.gz,1327575bytes,
SHA25612cbc77b74477b877401b9b47a7c0fe56162447d4ffc7d0f347a0721bfd27ccc.
Скачан по pinnedSSH сSHAпроверкой в privateACL
`.local/oracle-deploy-20261020/server-backup-local/`; исходная копия также сохранена.
Изолированное offline восстановление37tables/68HTTPassets/3historyPDF VERIFIED:
`.local/restore-checks/20261020T130915Z-548b55a40d5f4ca78690b676d06da4ad/result.json`;
receipt `.local/oracle-deploy-20261020/server-backup-restore.json`.
Первый server backup helper выявил отсутствие Git checkout: metadata теперь берётся
из переданного release manifest, все source identity/SHA guards сохранены.
Backup pause/resume отработал; неполная первая копия сохранена, не удалялась.

**Evidence/документация:** `.local/oracle-deploy-20261020/` содержит receipts,
source/image manifests, restore/public/OCR results, private logs и site-published.jpg;
никаких secrets/source archives в tracked Git. `docs/ORACLE_DEPLOYMENT.md`, ADR-027,
ARCHITECTURE, README,CHANGELOG актуализированы. Imagesmicro-v2 archiveSHA
1ca603299716824bbe3717b9c67302963d2fd48e9fa1411d3a0b2bf59b1d4bc9.

**Оставшиеся границы:** Micro — небольшая демонстрация, не нагрузочная/production
приёмка. Автоматический off-host backup/monitoring ещё не настроен; текущая ручная
копия проверена. Nip.io зависит от прежнегоIP; SSHCIDR обновляется при сменеclientIP.
Threads/Telegram остаются выключенными, ParserV2/source/P0 независимая предметная
приёмка не закрыта публикацией. Следующий шаг пользователя — открыть URL с прежним
входом и использовать сайт для презентации; дальнейшее развитие фиксировать отдельно.

## Oracle HTTPS · внешняя приёмка и PDF correction ·20.10.2026

Адрес `https://saq-qurylys.161.33.201.25.nip.io`, штатный TLS1.3/Let's Encrypt
YE1, expiry18.01.2027; HTTP308→HTTPS. Перед миграцией31table fingerprints/64Asset
SHA совпали. В copied DB очищены1044sessions, pending jobs0/enabled schedules0;
storage saq1000:1000. Migrated head,5services Running, OOMfalse/restarts0.
Публичные проверки:401anonymous,403wrongOrigin,200existinglogin,Secure/HttpOnly/
Strictcookie,64AssetdownloadsSHA,3historicalsignals snapshot/decisions/PDF SHA PASS.
Browser overview/map/DEMO100RED/documents/ParserV2 loaded. Ни чтение V2, ни вкладки
не запускали команды. Реальный OCR RU+KZ:17.45s суммарно,2PENDINGpayment clauses
на изображение,оригиналы identical;2новых DEMO materials созданы только на сервере,
не привязаны к объектам, факторы/решения не создавались.

Первый полный текущий dossier PDF503 по wall12s. Read-only diagnostic того же
child с неизменными CPU12s/address1GiB caps:24.76s,validPDF111726bytes,stderr0,
OOMfalse. Минимальное исправление: document_pdf_timeout_seconds default12 max60,
min с прежним pdf_timeout_seconds; opt-in PDF_PROXY_TIMEOUT_MS только точные GET
PDF routes, default15000 max75000, прочие requests15s. Для Micro45/50000.
Новые regressions8backend+2proxy PASS, native candidate-v2 backend/frontend
build PASS (Nextcompile/typecheck). Исправление ещё переносится, публичные
runtimePDF/restart acceptance пока не завершены. Данные/роли/risk/история прежние.
Исполнитель Codex, b156086+накопленныйdiff; commit/push не выполнялись.

## Oracle Micro · перенос продолжается ·20.10.2026

После двух capacity отказов A1 пользователь выбрал «Запускаем бесплатную Micro
для демонстрации». Создана новая `saq-qurylys-prod` E2.1.Micro Always Free,
Ubuntu24.04 Minimal amd64, IP161.33.201.25, private10.0.0.76, отдельная SAQ VCN.
Running и SSH VERIFIED; ключ отдельный, host key принят первым подключением
и сохранён в scoped known_hosts (TOFU, независимого fingerprint канала не было).
Docker29.9.1 / Compose5.6.0 из официального apt repo;4GiB swap, swappiness10.
Ни старый assetguard-prod, ни primary localhost не изменены. Paid upgrade OFF.
Перед стартом проверено: исходный backup всё ещё полностью совпадает с БД,
31таблица/64Asset; private backup archive SHA6c75221ad234ee153669daf4006366821b468716a1a163324dc68e65ec9474ac.
Добавлен `docker-compose.prebuilt.yml` (amd64, loaded image variables, never pull),
rotation всех services10MB×3. Удалены несуществующие env COLLECTOR/LLM flags;
они не выключали URL jobs. Generator tests15PASS. Runbook/ADR обновлены для Micro.
Изображения передаются по SSH; restore/TLS/public E2E ещё не VERIFIED.
Исполнитель Codex, b156086 + накопленный diff; commit/push не выполнялись.
Следующий шаг: проверить SHA на VM, восстановить пустую DB/storage, сравнить
fingerprints, очистить только copied sessions, проверить queued jobs/schedules,
затем migration/startup и публичные auth/OCR/PDF/browser/restart проверки.

## Oracle Cloud · подготовка публикации ·20.10.2026

Пользователь поручил начать публикацию и отдельно выбрал новую VM, бесплатный
поддомен и перенос текущих досье/материалов/PDF. Исполнитель Codex;
codex/audit-workflow-fixes, b156086 + сохранённый накопленный diff. Публикация
разрешена; VM/публичный URL/сертификат пока не созданы, commit/push не выполнялись.
В Chrome открыта Oracle Cloud вкладка470373679 (группа «☁️ SAQ Oracle»),
пользователь вошёл/подтвердил «вошел», затем разрешил «Да, создать и настроить»
для VM/SSH/80/443. Create A1.Flex2OCPU/12GB вернул **Out of capacity AD-1**.
Один ограниченный повтор с1OCPU/6GB дал ту же ошибку; fault domain automatic.
VM/IP не получены, paid alternatives не выбирались. В root есть только Tokyo
home region/AD-1. После первой попытки в selector VCN наблюдалась только прежняя
сеть, никаких её настроек не меняли. Wizard оставлен на Review1OCPU/6GB/error.
Пользователю предложен выбор: вторая бесплатная E2.Micro1GB со swap и локальными
prebuilt images для небольшой demo-нагрузки либо возвращение к A1 позже.
Ответ ещё ожидается; Micro не создаётся без этого выбора.

**Oracle preflight:** Tokyo/ap-tokyo-1 подтверждён как home region; Free Trial.
В root наблюдается только прежний assetguard-prod E2.Micro, он не изменялся.
Для новой `saq-qurylys-prod`: Ubuntu24.04 Minimal aarch642026.09.18-0,
A1.Flex Always Free-eligible2OCPU/12GB, стандартный boot46.6GB, новая
`saq-qurylys-vcn`/`saq-qurylys-public`, publicIPv4, in-transit encryption ON.
Проверка Limits(вкладка470373682): A1CPU/memory usage0; free storage200,
usage47/available153GB. Estimate показывает€1.85/month за boot без tier pricing;
по наблюдавшемуся использованию новый диск входит в free quota. Paid upgrade/
платные shapes/дополнительные volumes не включались. Реальная capacity ещё
не проверена запросом Create. Подготовлен RSA4096 key в ignored
`.local/oracle-deploy-20261020/ssh/saq-oracle-rsa`; private key не печатался,
Windows ACL inheritance снят, оставлены current user/System/Administrators.
Fingerprint `SHA256:rUfEtpGC8qKlSaF/jTz15ypxbkDT1jKJzJOmghd6p1U`;
в форме только public key. Review screenshots — oracle-vm-{review,specs}.jpg.
Ошибка второй попытки видна в oracle-capacity-error-small.jpg. Export локальных
amd64 images — `saq-qurylys-images-amd64.tar.gz`/image-package.json,242982776bytes,
SHA256`daacf3e0317f6051237d01c0774adb64e2fdcde501bb02f2f4e16deb67d49700`.
Это подготовка переносимых images без registry publication, не проверка Micro.

**Изменено:** `docker-compose.https.yml`, `deploy/Caddyfile`, public override
default DEMO_SEED=false, `scripts/configure_server.py` +6tests. HTTPS edge80/443,
DB/API/worker ports закрыты, frontend loopback, Secure cookie/HTTPS Origin,
official Caddy2.11.7 multiarch index digest pinned. Генератор новой server.env
не перезаписывает существующие secrets, переносит только analyst login для
восстановленной БД; DB/session secrets новые, integrations/seed OFF.
Продуктовый API/frontend/auth/risk не менялись; первичный runtime не обновлялся.
README, `docs/ORACLE_DEPLOYMENT.md`, ADR-027 объясняют topology/перенос/ограничения.

**Проверки:** `.venv/Scripts/python.exe -m unittest discover -s scripts
-p 'test_configure*.py' -v` —15PASS (9прежних +6новых); Ruff check/format PASS;
repository hygiene и targeted diff-check PASS. `docker build -t
saq-oracle-api:20261020-candidate -f backend/Dockerfile .` и аналогичный
frontend build PASS, включая Next production compile/typecheck. Новые tags
не заменяют рабочие images. Caddy `validate` actual pinned image/network none
PASS; private Compose render/assertions подтвердил5services, только edge80/443,
Secure/HTTPS и seed OFF. Это ещё не проверка TLS issuance/ARM64/внешнего доступа.

**Данные:** `scripts/backup_local.py create` создал trusted приватную копию
`.local/backups/20261020T115541Z-de01213f231042e48e416266c37a8851`.
Обычный `verify` PASS:31таблица/165audit events,64Asset downloads,
3сигнала/3решения/3архивных PDF. Отдельный
`.local/oracle-deploy-20261020/rehearse_upgrade.py` восстановил ту же копию,
проверил исходные fingerprint, затем выполнил candidate Alembic upgrade head
и заново скачал64файла/3архивных PDF с сохранностью snapshots/decisions/SHA.
Оригинальный dump/manifest и рабочие данные не подменялись. API/worker после
краткого backup pause наблюдались running/paused=false.

**Артефакты:** ignored `.local/oracle-deploy-20261020/`: source-archive +
per-file SHA manifest + known-local-secret scan (не полный security audit),
source-package.json, compose-check.json, upgrade-rehearsal.json, config-check/.
Backup verification: `.local/restore-checks/20261020T115728Z-0d30e9729c404826b48d1ebf0dab44c6/result.json`;
candidate restore: `.local/restore-checks/20261020T115928Z-f343f88e169442339481cf95a584938f/result.json`.
Никаких данных/секретов в source archive; приватная DB+storage передаётся отдельно.

**Точный следующий шаг:** получить pending выбор Micro/demo или A1/later.
Для Micro нужна x86 Ubuntu image вместо aarch64; проверить E2 remaining quota,
использовать prebuilt images, swap и actual memory/CPU/OCR/PDF приёмку. Не
использовать старую assetguard-prod и не выбирать платную shape. Для A1 не
запускать бесконечный retry/автоматизацию без отдельного запроса пользователя.
Далее SSH/Docker/source+trusted backup restore, сверка до миграции, очистка
старых login sessions только на серверной копии, проверка jobs/leases/schedules
перед worker, nip.io hostname/HTTPS и внешняя browser/OCR/PDF/restart приёмка.
Нельзя обещать бесплатность без проверки итоговой shape/квоты. Последние исходники
включают Parser V2 из QA; их сборка/миграция копии проверены, cloud-приёмка открыта.

## GIF для презентации ·20.10.2026

По явной просьбе пользователя записан настоящий рабочий localhost3000:
обзор → реестр/карта/поиск → досье → R1–R6 → исходная публикация → сохранённый
сигнал/архивный PDF → разделы отчёта/скачивание → источники → обзор.
Риск/сигналы показаны на существующем маркированном DEMO-досье; карта — текущая.
Parser V2 отдельного QA в запись не входит. Исполнитель Codex;
codex/audit-workflow-fixes, b156086 + прежний накопленный diff.

**Результат:** ignored `output/presentation-demo-20261020/`: зацикленные45s
GIF1280×720/12fps и light960×540/10fps, MP4 H.2641600×900/25fps без звука,
README и technical-details.json. Указатель/подсветка клика только в браузере
записи. Монтаж убирает загрузку и возвраты; кадры настоящего UI, без макетов.
Приложение/API/схема/config/business data не менялись, commit/push/deploy нет.

**Проверки:** `node .local/pitch-gif-20261020/record.mjs` —12экранов,
pageerror0, изменяющих API-команд0 (дополнительно блокировались),2PDF download
без ошибок/%PDF-сигнатуры. `.../preserve.mjs` —26досье: ID/revision/name/DEMO/
legal status/score/zone/confirmed codes совпали до и после. `.venv/Scripts/python.exe
.local/pitch-gif-20261020/encode.py` —полное декодирование MP4 и всех GIF-кадров,
539/449кадров,44.91/44.90s,loop0; контактные листы просмотрены. `git diff --check --
PROJECT_STATUS.md` PASS. Код продукта не менялся, build/unit/E2E повторно не
запускались. Артефакты/credentials/logs записи остаются ignored в `.local/`.

**Следующий шаг/ограничение:** вставить GIF или MP4 в презентацию и проверить
воспроизведение на компьютере выступления; файл презентации не предоставлен,
его вставка/настройки автозапуска этим блоком не проверены.

## Parser V2 · интерфейс и DEMO сценарий аналитика ·20.10.2026

По «да, давай продолжаем» реализован следующий связный UI-блок в исходниках и
изолированном QA. Исполнитель Codex; codex/audit-workflow-fixes,
b15608664f271367b3cc63505def5041f1c69117 + сохранённый накопленный diff.
Рабочий localhost3000 не обновлялся, commit/push/deploy не выполнялись.

**Изменено:** вкладка Parser V2 в существующем MonitoringView; прежний UI1.0
и links/IDs/черновики сохранены. Словарь/register/activate/history, версии V2
профилей, один keyword run, сохранённый run/capture, находки/server filters/pages,
версии/observations и exact-version TEXT_ONLY import в прежний Advertisement.
Каждый POST отдельный; GET/Enter/выбор/раскрытие ничего не запускают. Viewer
читает историю. Ошибки/409 сохраняют ввод и retry key; checkbox не хранится,
сбрасывается при reload/смене версии/observation. Старый ответ не показывается
под новым ID/версией. Исходник/DEMO/UNKNOWN/media/partial остаются видимыми.

**Файлы:** frontend/components/monitoring-v2{,-profile,-profile-editor,-feedback}.tsx,
monitoring-findings.tsx, monitoring-workspace.tsx, lib/monitoring-v2.ts,
app/monitoring/monitoring.css; tests/monitoring-v2.spec.ts,
zz-monitoring-v2-live.spec.ts и новое ожидание вкладки в monitoring-tools.spec.ts.
Backend/API/контракт/риск/миграции/dependencies не менялись. Прежние ui-ux-pro-max
и implement-feature применены; pdf использован для read-only проверки скачанного
файла. Нового ADR не требуется: прежние mounted panels/commands/DTO; ADR-026
и README/feature/architecture/requirements/plan/checklist/changelog/UI docs обновлены.

**QA:** Next production standalone + Docker API/worker/PostgreSQL, port3090;
API image5e4e5016a431292b510ef42c2df4f7ca0c4918b7fb4256558fa697884b152022.
Два immutable DEMO finding versions/observations созданы только в disposable DB.
Они не являются полученной выдачей Threads; внешний поиск выключен. Presentation
test отдельно моделирует успешный search/capture и ошибки. Actual API/worker
проверены: historical import→точные original bytes/SHA→отдельные candidate/dossier/
match/hypothesis/evidence/CONFIRMED R2→сигнал/скачанный архивный PDF. Балл0 до
решения и25 после, UNKNOWN без R1. Текст/DEMO/UNKNOWN/источник/SHA PDF проверены;
все3страницы отрисованы и просмотрены. Это не независимая предметная приёмка.

**Проверки:** первый targeted browser10PASS25.6s; после финальных правок
`.venv/Scripts/python.exe .local/v2-ui-20261020/e2e.py --v2-live --acceptance`
на новой QA БД — **233PASS/1FAIL/2SKIP,6.6m**, retries0. Все221прежних
исполняемых сценария прошли;2SKIP — opt-in typography A/B. Один новый тест
выбирал фразу до завершения смены профиля v1→current; в тест добавлено ожидание
загруженной версии2/2. Продуктовый код не менялся. Затем
`.../e2e.py monitoring-v2.spec.ts` — **11PASS11.6s**. Actual API/worker journey
и RU/KZ visual прошли в полном прогоне (7.7s/2.7s). В совокупности221прежний +
13новых сценариев проверены; один полностью зелёный повтор236tests не заявляется.

Финальный review origin изменён на **http://127.0.0.1:3090** с теми же исходниками/
Next BUILD_ID/API image/DB, чтобы не заменять cookie primary localhost. Команда
`.../e2e.py --v2-live monitoring-v2.spec.ts zz-monitoring-v2-live.spec.ts
-g 'actual QA|V2 reads|profile save|retry reuses|blocked source'` — **5PASS10.5s**:
повторены новые run/capture/import/error presentation и настоящий login/read-only
responsive.8сочетаний375/768/1024/1440:overflow0/POST0/pageerror0, Enter/Tab/focus PASS;
actual screenshots просмотрены. Typecheck/lint/format:check/build, repository
hygiene и diff-check PASS. Полный backend/unit повторно не запускался: серверный
код не менялся. Предыдущие backend результаты сохранены ниже.

Первый общий прогон остановлен: повторно использованная после DEMO journey QA
БД содержала9досье/score25 там, где старые tests ожидают8/score0. Создана новая
логическая БД saq_v2_ui_regression с исходным seed; прежняя QA БД сохранена.
Ожидания/риск не ослаблялись. Рабочие30прикладных таблиц и `.env`/credentials
совпадают с сохранённым до серверного V2 блока снимком20.10; все64Asset, включая
50non-DEMO, повторно проверены по размеру/SHA. Sessions отличаются как и в
предыдущем блоке, не объявляются неизменными.

Артефакты ignored `.local/v2-ui-20261020/`: full-browser.log,
full-browser-reused-db.log, fixture.json, journey/{result.json,signal-archived.pdf,
pdf-text.txt,pdf-page-*.png}, visual/{measurements.json,*.png},
primary-preservation.json, asset-preservation.json, acceptance-summary.json,
build-evidence.json, final-v2-browser.log, review-origin-smoke.log. Приватные
runtime.env/review.env/credentials.txt ignored, значения не выводились/не публиковались.
QA Next server3090 и api-review/worker-review/DB оставлены для просмотра;
прежние ненужные QA API/worker остановлены, данные/логи сохранены. Основные4сервиса
продолжают работать. Логин QA — `.local/v2-ui-20261020/credentials.txt`.

**Осталось:** finding-level resolution/priority/false-positive решения,
независимый RU/KZ holdout/разрешённый live доступ и retention, scheduler/paging/
другие платформы, отдельная установка проверенной версии на primary. Полный P0
не объявлен готовым. P2 DossierRiskStatistics ниже этим блоком не исправлялся.

## Parser V2 · находки/запуски/явный импорт ·20.10.2026 · исходники и QA

По «окей гоу начинай работу» завершён следующий согласованный серверный блок.
Исполнитель Codex; ветка codex/audit-workflow-fixes, база
b15608664f271367b3cc63505def5041f1c69117 + сохранённый накопленный diff.
Рабочий localhost3000 не обновлялся; commit/push/deploy не выполнялись.

**Результат:** один saved query V2 явно запускается через прежние Threads gate/
transport и MonitoringRun. Exact profile request/version/query IDs сохранены до
I/O; повторы не повторяют сеть. Отдельный capture принимает run ID, проверяет
сохранённую страницу/профиль/словарь и создаёт identity/immutable version/query
observations. Изменения и A→B→A сохраняют историю; запоздалый capture не вытесняет
более позднее наблюдение. Исторический run-фильтр показывает свою версию.
Import требует exact version+observation, причину и TEXT_ONLY acknowledgement;
однократно создаёт Advertisement NEW + Asset с provenance. Анализ/кандидат/
досье/match/evidence/R1–R6/сигнал не запускаются автоматически. Capture каждой
новой observation и импорт аудируются. Без доступа BLOCKED, без фиктивных данных.

**Файлы:** backend/app/{models,main,monitoring_findings}.py,
backend/app/api/{threads,monitoring_findings}.py,
backend/alembic/versions/ef90fc78b461_monitoring_findings.py,
backend/tests/{test_monitoring_findings,test_finding_migration,test_contract}.py,
contracts/openapi.yaml0.31.0. Новых dependencies/collector framework нет.
README/CHANGELOG/FEATURE_SOCIAL_MONITORING_V2/ARCHITECTURE/REQUIREMENTS/PLAN/
REMAINING_CHECKLIST обновлены; ADR-026 объясняет версии/историю/locks/импорт.

**Проверки:** `.venv/Scripts/python.exe .local/v2-findings-20261020/test.py
-q --tb=short -rs` — полный backend **1170PASS/20SKIP,514.54s** на отдельной
PostgreSQL. После правки запоздалого capture/добавления его regression тестов:
тот же runner с `tests/test_monitoring_findings.py tests/test_finding_migration.py
tests/test_monitoring_sources.py tests/test_threads_api.py tests/test_query_profiles.py
tests/test_monitoring_dictionaries.py tests/test_contract.py -q --tb=short` —
**78PASS92.06s**. Последний небольшой штрих аудита observation проверен отдельно:
`tests/test_monitoring_findings.py tests/test_finding_migration.py -q --tb=short`
— **16PASS19.30s**. Полный набор после этих финальных правок повторно не запускался.
Windows SKIP относятся к Linux/PDF resource checks; свежая полная Linux/PDF
приёмка не заявляется. Промежуточные падения исправляли отсутствующие test imports,
неактуальный contract и неверное предположение о пустой session-scoped QA БД.

Финальный `docker build -f backend/Dockerfile -t saq-v2-findings-20261020-api .`
PASS, SHA5e4e5016a431292b510ef42c2df4f7ca0c4918b7fb4256558fa697884b152022.
Изолированная production API: миграция ef90fc78b461, bootstrap-only/login/
dictionary/profile, blocked search и replay, capture отказ без успешной страницы,
пустые findings/materials, `alembic check` и restart preservation PASS.
Успешные source-ответы в pytest синтетические с transport stub; настоящего
live поиска/скрытого подключения не было. Browser/UI не менялись и не проверялись.
Ruff check/format всего backend, repository hygiene и git diff --check PASS.

**Сохранность:**30прикладных primary tables совпали с baseline; изменились только
sessions при том же числе1043, причина этого изменения в данном блоке отдельно
не установлена. `.env`/credentials SHA неизменны, все64Asset по размеру/SHA PASS
(50non-DEMO). Рабочие данные/сервисы сохранены. Артефакты без паролей в публичных
docs: `.local/v2-findings-20261020/` — focused-final.log, final-audit-tests.log,
full-backend-before-late-capture.log, build-audit-final.log, runtime-final-smoke.json,
primary-preservation.json, asset-preservation.json. Приватные env остаются ignored.
После QA временные сервисы остановлены; DB/логи сохранены.

**Ограничения/следующий шаг:** UI V2 в существующей зоне, явная ручная resolution
неизвестного объекта, priority/false-positive review и изолированный browser
end-to-end до human review/PDF. Один keyword/одна страница, media не скачиваются,
профиль OFFLINE не доказывает доступ. Holdout/разрешённый live доступ, общий
scheduler/paging/другие платформы и установка на primary остаются отдельными.
Полный P0 не объявлен завершённым. P2 статистики R1–R6 ниже этим блоком не исправлялся.

## Проход аналитика R1–R6 ·20.10.2026 · завершён с замечанием UI

Исполнитель Codex; b15608664f271367b3cc63505def5041f1c69117 + сохранённый
накопленный diff. По запросу пользователя проверен существующий localhost3000:
новый DEMO материал/досье, независимые R1–R6, подтверждение→отклонение→повторное
подтверждение каждого кода через UI, риск, аудит,3версии сигнала и скачанные PDF.
Все шесть:100/RED; без R1:65/YELLOW; без R2:75/YELLOW. Неполный R1 не создан,
R5<20п.п. и некорректные даты R6 отклонены.11risk unit tests PASS;
19negative API checks PASS. Snapshot/решения/байты PDFv1 сохранены после
пересмотра. Сигналv2 RETURNED с причиной; v3CONFIRMED и актуален, PDFготов.
Оба скачанных PDF по10страниц проверены по тексту и визуально на всех страницах.

Сохранность PASS:300исходных строк30таблиц неизменны, sessions исключены;
50non-DEMO Assets совпадают по размеру/SHA. Добавлены только отдельные DEMO
материалы и решения; они оставлены для просмотра. Настройки/образы не менялись.
Документация: [подробный протокол](../audits/R1_R6_ANALYST_ACCEPTANCE_2026-10-20.md),
UI_AUDIT. Приватные evidence `.local/r1-r6-20261020/`. Full browser/build/lint/
typecheck/внешняя предметная приёмка не запускались и не заявляются.
Нового кода/зависимостей/миграций/commit/push/deploy нет.

Открыт P2: DossierRiskStatistics дважды считает PENDING —5confirmed+1pending
показывает ещё1«Не установлены». Серверные баллы правильные. Следующий шаг:
отдельный минимальный UI-фикс семантики счётчика с regression-проверкой;
не менять backend unknown_codes. Разработка V2 и прежние внешние gates ниже
этой проверкой не завершены.

## Локальный запуск по запросу пользователя ·20.10.2026

Исполнитель Codex; ревизия b15608664f271367b3cc63505def5041f1c69117
+ сохранённые накопленные изменения. Запущен Docker Desktop и выполнен
`docker compose start --wait db api frontend worker`: PASS. Использованы
существующие контейнеры и том БД; пересборка и пересоздание не выполнялись.
Рабочий адрес — http://localhost:3000/login. Конфигурация и пароль не менялись.

Проверки: четыре сервиса работают; db/api healthy; `/login` и API `/health`
возвращают HTTP200. Через same-origin API проверены CSRF, вход существующего
аналитика, `/api/v1/auth/me`, HTTP200 рабочего места и выход проверочной сессии.
Пароль передан пользователю по его запросу; в документацию не записан.
Изменён только этот статус. Build/full tests/browser E2E не запускались;
новая установка V2, tunnel, commit/push не выполнялись. Блокеров запуска нет.
Следующий шаг: пользователь открывает локальный адрес и входит в рабочее место;
очередь разработки V2 ниже остаётся прежней.

## Social Monitoring V2 · словарь/активация/профили ·19.10.2026

По «окей, продолжаем» и «продолжи и закрой задачу» завершён связный блок
хранения словаря, явных активаций и V2 профилей в исходниках/изолированном QA.
Исполнитель Codex; ветка codex/audit-workflow-fixes, база
b15608664f271367b3cc63505def5041f1c69117 + сохранённый накопленный diff.
Commit/push/установка на primary не выполнялись.

**Изменения:** monitoring_dictionary_versions хранит exact v2/original bytes/SHA;
monitoring_dictionary_activations — журнал выбора/отключения с revision/автором/
причиной. Аналитик регистрирует только проверенный файл поставки и явно активирует
его; CSRF, idempotency, audit и optimistic concurrency сохранены. V2 profile
фиксирует dictionary ID/SHA и готовый preview/query IDs/activation metadata.
Смена словаря/чтение истории ничего не перекомпилирует. Старые list/detail по
умолчанию1.0; V2 требует dictionary_version=2.0, schema профиля менять нельзя.
Live sources/jobs/evidence/риск не запускаются.

**Файлы:** backend/app/{models,main,monitoring_dictionaries}.py,
backend/app/api/{monitoring_dictionaries,query_profiles}.py, backend/Dockerfile,
backend/alembic/versions/df89eb67a350_monitoring_dictionaries.py,
backend/tests/{test_monitoring_dictionaries,test_dictionary_migration}.py,
contracts/openapi.yaml (0.30.0). Поддерживающее исправление тестов: короткие
parametrized IDs в test_csv_import.py вместо огромных payload в переменной
PYTEST_CURRENT_TEST; import/format в затронутых Python файлах. Новых dependencies нет.

**Проверки:** полный backend через `.venv/Scripts/python.exe
.local/run-v2-storage-tests.py -q --tb=short` в отдельной PostgreSQL:
1153PASS/20SKIP/4ERROR за415.92s. Все новые V2 проверки прошли; ошибки setup/teardown
двух больших CSV случаев — Windows limit32767 для PYTEST_CURRENT_TEST. Исправлены
только имена сценариев. Повтор тем же runner:
`tests/test_csv_import.py tests/test_monitoring_dictionaries.py
tests/test_dictionary_migration.py tests/test_query_profiles.py tests/test_contract.py
-q --tb=short -rs`: **57PASS/0ERROR за30.90s**. Полный набор повторно не запускался.
Linux/PDF resource
checks, пропущенные на Windows, этим прогоном не подтверждены.

Production `docker build -f backend/Dockerfile` PASS. Новый изолированный образ
saq-v2-storage-19ec5787-api, image SHA
31b3a04546970448bd34ea71f43b1996decfcf0e965f15cf791de4202cd20da0.
`.local/smoke-v2-storage.py` PASS: миграции пустой QA БД, bootstrap-only, login,
register→activate→profile(3queries)→deactivate, guard1.0, restart API и неизменные
profile/history. Миграция сохраняет1.0 и запрещает downgrade с историей V2.
Ruff check/format backend и git diff --check PASS; browser не повторён, UI не менялся.
`.local/verify-v2-preservation.py` PASS: primary31таблица/50asset SHA/настройки и
оба исходных словаря неизменны. Артефакты `.local/v2-storage-19ec5787/`:
full-backend.log, focused.log, build.log, runtime-smoke.json, primary-preservation.json.
После проверки временные QA API/DB остановлены, данные/логи сохранены.

Обновлены README/CHANGELOG, FEATURE_SOCIAL_MONITORING_V2, PLAN/REQUIREMENTS/
ARCHITECTURE/REMAINING_CHECKLIST; ADR-025 объясняет bytes/history/locking,
совместимость1.0 и запрет потери истории при downgrade. Защита immutable — на
уровне API, не от администратора БД. Полный P0 не объявлен завершённым.
**Следующий шаг:** immutable findings с provenance/query IDs, связь с существующими
runs/import, затем UI/end-to-end. Независимый holdout и разрешённый live доступ —
отдельные незакрытые gates. Текущий рабочий сайт остаётся на прежней версии.

## Social Monitoring V2 · контекстный offline-срез ·19.10.2026

По «окей, давай продолжим» реализован следующий согласованный блок.
Исполнитель Codex; codex/audit-workflow-fixes, база b15608664f271367b3cc63505def5041f1c69117
+ сохранённый накопленный diff. Новый `social_context.py` даёт объяснимые
P1/P2/P3/NOT_RELEVANT/NEEDS_CONTEXT, точные исходные spans, слабую/сильную
географию, payment timing/negation/суммы, годы20XX, family/phase отдельно.
`scripts/analyze_social_text.py` позволяет проверить локальный UTF-8 без сети/БД.
Использованы существующие pure helpers extraction.py; сам extraction не менялся.
Новые сущности/evidence/риск/сбор/активация/primary runtime не затронуты.

**Проверки:** `cd backend; ../.venv/Scripts/python.exe -m pytest
 tests/test_social_context.py tests/test_social_dictionary.py
 tests/test_extraction_payments.py tests/test_extraction_payment_fields.py
 tests/test_extraction_names.py -q`:246PASS2.10s (54context/CLI +47dictionary +145legacy).
Все10входных review_examples пройдены. Hard negatives выявили и закрыли price-only,
банковский взнос, сданный дом, нулевую оплату и отрицательное перечисление.
Ruff check/format с backend/pyproject.toml для3новых Python файлов PASS;
git diff --check PASS. Full backend/browser не запускались: HTTP/UI/DB не менялись.

Обновлены FEATURE_SOCIAL_MONITORING_V2,README,CHANGELOG,REMAINING_CHECKLIST и PLAN.
Новых dependencies/миграций/контракта нет, ADR для этого pure rules-среза не нужен.
Исходные JSON/ТЗ сохранены. Продуктовая приёмка всего P0 ещё не завершена.
Правила ограничены лексикой, годы без полных дат, внешний географический список
неполон; сложные/смешанные объявления и независимое качество требуют проверки.
Результат всегда WAITING_REGISTRY, без фиктивного подтверждения identity/R1–R6.
**Следующий шаг:** version/activation history и v2-профили с immutable findings/
query IDs в существующих runs/import, затем UI/end-to-end. Не подменять исторические
версии1.0; live доступ и независимый holdout остаются отдельными gates.

## Social Monitoring V2 ·19.10.2026 · STARTED, первый offline-срез

Новое прямое поручение пользователя «гоу начнем работу над парсер V2» разрешило
начало разработки и заменило прежний DEFERRED. Исполнитель Codex; ветка
codex/audit-workflow-fixes, база b15608664f271367b3cc63505def5041f1c69117 + dirty diff.
[Gap-analysis, запуск и границы](../FEATURE_SOCIAL_MONITORING_V2.md).

Реализованы social_dictionary.py/social_queries.py и scripts/preview_social_queries.py:
Pydantic v1/v2, проверка SHA оригинала/всех исходных полей, неизменяемые bytes,
bounded RU/KZ queries, стабильныеID/provenance, отдельные keyword/hashtag, skipped
reasons/бюджет и честный ACCESS_UNVERIFIED.20seed/32tag сохранены; duplicate
Ust-Kamenogorsk фиксируется только в производной нормализации. Активации нет.
Текущий UI-помощник1.0/API/DB/worker/риск и исходные входные файлы не менялись.
Новых dependencies/migrations/HTTP endpoints нет; рабочий runtime не обновлялся.

Проверки: `cd backend; ../.venv/Scripts/python.exe -m pytest
 tests/test_social_dictionary.py -q`:47PASS1.20s,без DB fixtures. Ruff check/format
четырёх новых Python файлов PASS. Первый тестовый запуск выявил Windows-проблему
слишком длинных parametrized IDs: заменены короткими. Самопроверка исправила
кодировку generated Өскемен и добавила регрессию. Full backend/browser для
новых offline-модулей не повторялись; прежние1062/221 относятся к прежней версии.

Обновлены README/CHANGELOG,PLAN/REQUIREMENTS/ARCHITECTURE,REMAINING_CHECKLIST и
intake note; исходное ТЗ и оба JSON сохранены байтово. Отдельного архитектурного
ADR нет: этот срез не выбирает новую persistence/activation архитектуру.
**Следующий шаг:** контекстные RU/KZ rules, negation/timing/phase и10примеров+
hard negatives; затем существующие profiles/runs/import/UI. Весь P0 не завершён,
live сбор не включён, независимая оценка качества/второйПК/CI остаются открытыми.
Артефакты CLI: `.local/social-v2-20261019/{blocked,keyword,kk}.json`:
без capabilities0selected/86omitted, keyword25/61, KK budget10:10/46.
Во всех ACCESS_UNVERIFIED/NOT_ACTIVATED. SHA исходного ТЗ и обоих словарей
совпали с intake; git diff --check PASS. Commit/push не выполнялись.
Ниже — история; прежний DEFERRED описывает состояние до нового поручения.

## Полный browser-прогон текущего накопленного diff ·19.10.2026 · VERIFIED локально

Исполнитель Codex; `codex/audit-workflow-fixes`, база
`b15608664f271367b3cc63505def5041f1c69117` + сохранённый накопленный diff.
По «продолжай работу» завершён полный Playwright после CSV/профилей/URL-расписания.
Первый новый стенд `.local/browser-full-20261019/ac990e09/source` завершил
223tests:219PASS/2FAIL/2opt-inSKIP. Найдены карта y706.14 вместо <700 и устаревшее
ожидание5карточек источников после добавления AN GROUPS. Первый QA остановлен,
логи/volume/storage сохранены. По сумме отдельных повторов PASS не заявляется.

Минимальное исправление: `.map-context .map-note` использует свободную ширину
через flex:1/min-width:0 вместо max-width62ch. Геометрический тест не ослаблен.
Shell test проверяет все6названий, путь AN GROUPS и неизвестность даты/ЖК.
Текст/правовые оговорки/tokens/роли/API/риск/исторические snapshots не менялись.
DESIGN_SYSTEM/UX_GUIDELINES и рецепт CLEAN_INSTALL_ACCEPTANCE обновлены.

Финальный новый snapshot `.local/browser-full-20261019/cde186ad/source`, project
`saq-browser-cde186ad`,localhost3090:503исходных файла, новые secrets/DB/storage,
8DEMO +2synthetic OCR. Отдельный frontend production build PASS; API/worker
используют точные image IDs предыдущей принятой чистой сборки: backend не менялся.
Manifest синхронизирован с исправленным shell test; приватные файлы туда не входят.
Команда из source/frontend с SAQ_E2E_BASE_URL=http://localhost:3090,
SAQ_ISOLATED_ACCEPTANCE=1,SAQ_QUERY_PROFILES_LIVE=1,SAQ_URL_SCHEDULES_LIVE=1,
PLAYWRIGHT_JSON_OUTPUT_FILE=../../results.json:
`npx playwright test --output=../../test-results --reporter=list,json`.
Финальный итог **221PASS/0FAIL/2opt-inSKIP,384.557s**,workers1/retries0,flaky0.
Typography A/B — единственные пропуски. Оба прежних failure прошли в этом
едином запуске. Live query profiles/URL schedule/CSV→PDF также PASS.

Уже PASS: fresh npm ci156packages/audit0; frontend lint/typecheck/format:check;
2Node checks; форматирование нового test/CSS. Backend1062PASS относится к
предыдущему блоку с идентичным backend runtime, повторно не запускался.
На actual production image: карта y670.14 при1440x900;RU/KZ375/768/1024/1440
без page overflow, focus доступен, POST0. Четыре реальные screenshots RU/KZ
375/1440 просмотрены; OSM tiles в этих измерениях заменены пустыми, доступность
внешней подложки ими не проверялась. Длинные map-инструкции имеют прежний RU fallback.
Первичный и финальный логи/result сохранены в своих UUID-папках. Финальный
CSV→PDF: `source/output/qa/intake-journey-20261019/c22aaf68-351f-4d17-8a58-c3c97e85e0a3`.
`scripts/verify_intake_journey.py <folder>` PASS:3страницы,23318bytes,источники/
даты/SHA/DEMO/UNKNOWN/R2/25/KZ. Poppler отрисовал3PNG, все просмотрены без
обрезаний; warnings nameToUnicode из-за Cyrillic пути не мешали рендерингу.
Проверка PDF является технической DEMO-приёмкой, не юридической оценкой.

`primary-preservation.json`:31table fingerprints/2private files/50Asset SHA
не изменились;300runtime source files совпадают с принятым snapshot.
`check_repository_hygiene.py` PASS; отдельно проверены nonignored untracked paths.
Final test ESLint/typecheck/Prettier PASS; git diff --check PASS.
Оба QA project остановлены через compose stop, volumes/storage/evidence сохранены.
Рабочий localhost3000 не обновлялся: CSS-исправление пока в исходниках и QA image.
Новых зависимостей/миграций/контрактов нет, отдельный ADR не требуется.
Затронуты design-system.css,shell-redesign.spec.ts,PROJECT_STATUS,README,CHANGELOG,
DESIGN_SYSTEM,UX_GUIDELINES,UI_AUDIT,UI_IMPLEMENTATION_PLAN,REMAINING_CHECKLIST,
CLEAN_INSTALL_ACCEPTANCE; прежний accumulated diff сохранён, commit/push не делались.

**Следующий шаг:** согласовать установку проверенной версии на рабочий runtime
и конечный SHA/CI; затем приёмка на втором физическом ПК и независимая
RU/KZ/OCR/UX/предметная проверка, доступ жюри/freeze/сдача. Для текущего CI
флаги live profiles/schedules пока не заданы: их успешный результат здесь
относится к локальной явной команде, а не уже выполненному GitHub CI.
Parser Social Monitoring v2 остаётся DEFERRED до закрытия прежних этапов.

## Чистая локальная установка без DEMO ·19.10.2026 · VERIFIED локально

Исполнитель Codex; ветка `codex/audit-workflow-fixes`, база
`b15608664f271367b3cc63505def5041f1c69117` + сохранённый накопленный diff.
По «продолжи от туда от куда остановился» продолжена фактическая незавершённая
сборка `.local/clean-start-20261019/d721986d`, а не повторены уже закрытые URL
scheduler/CSV→PDF. Использован подготовленный snapshot502файлов, собственные
`.env`/credentials, пустые storage/БД и project `saq-clean-d721986d` на3090.
Рабочие образы/данные не заменялись. Это текущий компьютер, **не второй ПК O-08**.
Parser Social Monitoring v2 **DEFERRED**.

**Подготовленный до прерывания код.** Генератор `scripts/configure_local.py`
получил `--port`/`--no-demo-seed`, exclusive creation приватных файлов и отказ
при наличии любого из `.env`/credentials. Частичный сбой сохраняет файлы.
`backend/app/seed.py --bootstrap-only` создаёт только настроенного аналитика,
не читает DEMO fixtures; existing password/role/display_name сохраняются под
прежней transaction lock. Compose строго проверяет literal true/false и выполняет
bootstrap после миграций до healthy API. Это исправляет первый вход при
`DEMO_SEED_ENABLED=false`; контракт/риск/ручные решения/worker pipeline прежние.
Новых зависимостей, миграций или архитектурного решения нет; ADR не требуется.

**Наблюдённые проверки.**
- `docker compose -p saq-clean-d721986d build`, затем `up -d --no-build --wait
  --wait-timeout 180` из новой копии PASS. Сборка возобновлена после зависшего
  получения Debian packages; Docker cache использовался, cold/no-cache build
  не заявляется. До startup public tables0/storage0; после — только users1 и
  alembic_version1, остальные таблицы пусты, headce78da56f249. Настоящий вход,
  пустые properties/ads/signals/candidates/profiles/schedules и UI200 проверены.
  Все три секрета отличаются от primary; повтор генератора возвращает1,
  SHA обоих приватных файлов не меняются. initial.json/generator-preservation.json.
- Fresh `npm ci`:156packages/0vulnerabilities. Host Python/browser runtime
  использован существующий; новая установка Python/WSL/ОС не заявляется.
  `scripts/verify_ocr.py` через настоящий QA API/worker:2synthetic RU/KZ изображения,
  SHA оригиналов совпадают, по2PAYMENT_TERM с bbox/PENDING. CER0.0541/0.1026 —
  smoke этих картинок, не независимая приёмка OCR. source/output/qa/ocr-verification.json.
- Из source/frontend с SAQ_E2E_BASE_URL=http://localhost:3090 и
  SAQ_ISOLATED_ACCEPTANCE=1, `npx playwright test tests/zz-tz-v2-journey.spec.ts`
  — **1PASS,15.3s**. Новый CSV→отдельные решения→CONFIRMED R2/25 при UNKNOWN,
  новый сигнал и неизменность прежнего snapshot/решений/PDF. Ни одного seed
  объекта этому маршруту не требуется. Отдельный запуск
  `npx playwright test tests/csv-import.spec.ts tests/monitoring-query-profiles.spec.ts tests/monitoring-url-schedules.spec.ts tests/monitoring-sources.spec.ts tests/open-sources.spec.ts`
  — **24PASS,36.6s**, retries0. Включает presentation HTTP mocks; это не24внешние загрузки.
- Артефакты внутри новой копии:
  `source/output/qa/intake-journey-20261019/e18cd00c-e5f4-4cac-a444-0aa66cc8ecaf/`.
  Offline `scripts/verify_intake_journey.py` PASS; PDF3страницы/23457байт/SHA
  `b316e417a81fc3f1d9b17bb2a1cd7fff861af31912ff8de6e36bfb0ec9fe3951`.
  Poppler отрисовал все3PNG; каждая просмотрена: DEMO/UNKNOWN/R2/25,
  источники/разные даты/цитата/SHA/пагинация читаются, обрезаний не обнаружено.
- `python -m unittest discover -s scripts -p 'test_*.py' -v`:
  **89run/88PASS/1SKIP**, включая9новых generator cases. Ruff check/format
  scripts/configure_local.py/test_configure_local.py и отдельно из backend
  app/seed.py/tests/test_bootstrap.py PASS. Repository hygiene PASS;
  UTF-8 и локальные ссылки проверены; финальная сверка перечислена ниже.
- Полный PostgreSQL backend в отдельной test schema — **1062PASS,356.97s**,
  включая3новых bootstrap cases: пустой первый вход без fixtures, сохранность
  existing account и два одновременных bootstrap. Первый запуск
  остановлен при collection: runtime image намеренно не содержит scripts/contract/
  evaluation fixtures. В QA-контейнер добавлены только эти данные из snapshot,
  повтор: `docker compose -p saq-clean-d721986d exec -T -e APP_ORIGIN=http://localhost:3000 api python -m pytest -q -p no:cacheprovider`.
  Лог backend-full-with-fixtures.log. Test dependencies добавлены только в QA;
  production image состав/права приложения для запуска тестов не расширялись.
- `docker compose -p saq-clean-d721986d restart`, затем `up -d --no-build --wait
  --wait-timeout 180` PASS для всех4сервисов. После нового login повторно скачаны
  исходный текст и архивный PDF; их SHA совпали, snapshot/decisions равны
  historical_signal, schedules0. restart-verification.json. Прежний пароль
  работает; DEMO seed при restart не добавлен.

**Рабочие данные и восстановление.** С primary-before совпали **все31таблица**,
приватная конфигурация и50Asset SHA:25досье/44материала/50файлов, schedules0.
Свежий `python scripts/backup_local.py create`:
`.local/backups/20261019T170404Z-f6144eb8c6804734a480368e9d6f1f97`;
`verify <эта папка>` PASS в одноразовых offline containers,
`.local/restore-checks/20261019T170532Z-f684b2986e9748478a3376865c6392c6/result.json`:
31tables/97audit/50HTTP originals. В primary нет сигналов; historical PDF coverage
этого restore0, он не заменяет отдельный QA CSV/PDF маршрут. Первичные api/worker
были кратко приостановлены штатным backup tool и возобновлены.

**Документы/границы/следующий шаг.** Добавлен CLEAN_INSTALL_ACCEPTANCE; обновлены
README/CHANGELOG/REQUIREMENTS/PLAN/REMAINING_CHECKLIST и этот статус. В README
сверены фактический контракт0.29/76operations и исторические counts ВКО; старые
чек-листы помечены историей. Независимый read-only review config/seed/Compose
реальных дефектов не выявил; рабочие файлы другого исполнителя не менялись.
Чистый локальный bootstrap/CSV/PDF/restart блок технически завершён. QA остановлен
через `docker compose -p saq-clean-d721986d stop`, evidence/DB/storage/секреты
сохранены. Основные API/DB healthy, frontend/worker running; финальная сверка
primary31таблиц/50SHA/приватной конфигурации повторена после остановки QA.
Финальные git diff --check, UTF-8/локальные Markdown links PASS; frontend код
не менялся, новый общий lint/full browser suite не заявляется.
Далее — актуальный полный browser suite после последних функций,
второй физический ПК, независимая RU/KZ/OCR/UX/предметная приёмка и согласованный
конечный SHA/CI/сдача. Commit/push/merge/внешняя публикация не выполнялись.


## CSV → самостоятельные решения → архивный PDF ·19.10.2026 · VERIFIED технически

Исполнитель Codex; `codex/audit-workflow-fixes`, база
`b15608664f271367b3cc63505def5041f1c69117` + сохранённый накопленный diff.
По «окей гоу продолжаем» закрыта техническая сквозная приёмка нового **DEMO CSV**
через текущие UI/API/worker. Реальная реклама AN GROUPS не связывалась с ЖК и
не получала обвинительных факторов. Parser Social Monitoring v2 **DEFERRED**.

**Что изменилось.** Существующий `frontend/tests/zz-tz-v2-journey.spec.ts`
(имя от прежнего UI ТЗv2, не от parser-v2) теперь начинает маршрут с реального
CSV preview/commit в UI вместо прямого API создания материала. Проверяет точный
исходный CSV, отдельный сохранённый текст/SHA, даты/ссылку, отсутствие записей
после preview и автоматических анализа/привязки/риска после commit. Пакет
восстанавливается по deep link после reload; далее все решения через UI:
кандидат → новое досье → анализ → самостоятельная привязка → подтверждение
PAYMENT_TERM → evidence/PENDING R2 → отдельный CONFIRMED R2 (+25) → DRAFT
сигнал → отдельный CONFIRM → скачанный PDF. До подтверждения фактора score0;
legal UNKNOWN сохраняется, отсутствие основания не даёт R1. Создаётся следующая
версия сигнала, после чего прежние snapshot/decisions и PDF bytes совпадают
с сохранёнными; архивная версия доступна по прежнему deep link.

Проверка разрешена только при SAQ_ISOLATED_ACCEPTANCE=1 на localhost3090 либо
в одноразовом GitHub Actions runner на localhost3000 (текущий CI-сценарий сохранён).
Локальный3000 явно пропускается. Артефакты пишутся в новую UUID-папку, прежние
выводы теста не перезаписаны. Скрипт `scripts/verify_intake_journey.py` независимо
проверяет реальные скачанные PDF/CSV/TEXT по SHA, согласованности полей/дат,
DEMO/R2/25/UNKNOWN, кириллице/KZ, A4/page numbering и историческому JSON.
Он не обращается к приложению и не заменяет визуальную проверку страниц.

**Фактические проверки.**
- На изолированном QA3090 с прежним production frontend/worker:
  из frontend, SAQ_E2E_BASE_URL=http://localhost:3090 и SAQ_ISOLATED_ACCEPTANCE=1,
  `npx playwright test tests/csv-import.spec.ts tests/zz-tz-v2-journey.spec.ts tests/monitoring-sources.spec.ts tests/open-sources.spec.ts`
  — **18 PASS,32.7s,retries0**, `.local/open-source-20261019/intake-journey-accepted.log`.
  Сценарий создаёт только новые DEMO записи в отдельной БД; соседние проверки
  включают HTTP mocks для URL/status и настоящие CSV/source-history запросы.
  Не считать все18 реальными внешними загрузками. Сквозной сценарий — настоящий API/worker, без mocks.
- Артефакты итогового маршрута:
  `output/qa/intake-journey-20261019/bdc805f9-fcd9-4da4-8c0b-a5e867d6120d/`:
  evidence.json, точный intake-original.csv, original-downloaded.txt,
  signal-archived.pdf, pdf-verification.json, page-{1,2,3}.png и signal-{375,768,1024,1440}.png.
  PDF3страницы/23281байт, SHA
  `89ff5305dba30febced241e5550c9dd839119e96ce0cbcd9277dcc3c846a69a3`;
  `python scripts/verify_intake_journey.py <эта папка>` PASS. Все три итоговые
  страницы отрисованы Poppler и просмотрены: источник/разные даты/цитата/SHA,
  DEMO/оговорка, UNKNOWN/R1 и R2/25 читаются, обрезаний не обнаружено.
  Четыре viewport проверки проходят после готовности очереди. Ранее просмотрен
  реальный mobile снимок выбранной архивной версии; это не внешняя UX-приёмка.
- Отдельный negative check на копии артефактов отвергает изменённый CSV до
  записи verification.json. Оригинальные результаты сохранены. Защита3000
  отдельно проверена: **1 intentional SKIP**, intake-primary-guard.log, без записи.
- npm typecheck/lint, Prettier test file, Ruff check/format нового script с
  `--config backend/pyproject.toml`, git diff --check PASS. Приложение/renderer/
  API/контракт/миграции не менялись, новые builds/full backend/full browser suite
  не запускались. Прежние1059backend/28browser относятся к прошлому блоку.
- Рабочая БД до/после: **31 таблица полностью совпала по fingerprint**, включая
  sessions/audit;25досье/44материала/50Asset, schedule/run0/0 сохранены.
  intake-primary-before.json / intake-primary-preservation.json и повторная
  проверка после guard/финального E2E. QA остановлен, его данные/файлы оставлены.
  Primary API/DB healthy, frontend/worker running; рабочие образы не заменялись.

**Исправления проверки.** Дополнительное ожидание готовности очереди сначала
использовало ошибочный region locator:17PASS/1FAIL только в последнем ожидании
снимков после успешного PDF-маршрута. Уточнён фактический aria-label списка,
повторные18PASS завершены. Семантическая проверка PDF нормализует переносы строк;
Poppler выдал warnings nameToUnicode из-за пути bundled runtime с кириллицей,
но exit0/3PNG и ручной просмотр подтверждены. Это не изменение product-кода.

**Документация/границы/следующий шаг.** README, FEATURE_CSV_IMPORT, UI_AUDIT,
UI_IMPLEMENTATION_PLAN, REMAINING_CHECKLIST и этот статус обновлены; новых ADR
или зависимостей нет (pypdf уже в backend requirements). Технический DEMO CSV
маршрут закрыт. Реальный bounded URL→HTML/sha отдельно проверен прошлым блоком;
не выдавать сочетание двух проверок за подтверждение реальных факторов/сигнала.
Открыты независимая предметная проверка реальных объектов/источников, внешняя
RU/KZ/OCR/UX-приёмка, второй чистый ПК и финальный exact-SHA CI/handover.
Поисковое расписание с profile_id+revision остаётся P1 до официального доступа.
Следующий отдельный блок — актуальная сверка прежних gates и воспроизводимый
запуск/приёмка на чистой среде; parser-v2 не начинать автоматически. Commit/push,
merge, внешняя публикация или сообщения не выполнялись.


## Управляемое расписание открытых URL ·19.10.2026 · VERIFIED локально

Исполнитель Codex; ветка `codex/audit-workflow-fixes`, база
`b15608664f271367b3cc63505def5041f1c69117` + сохранённый накопленный diff.
По «гоу продолжаем» реализован следующий прежний блок. Использованы ранее
прочитанные implement-feature/ui-ux-pro-max и существующие компоненты/worker.
Лимит при возобновлении обновился; parser-v2 по поручению пользователя **DEFERRED**.

**Результат.** «Сверка → Источники → Расписание открытых страниц»: создание OFF,
явные включение/выключение, интервал60–10080минут, история с сохранённой ревизией
настройки и переходом к материалу. Первый срок now+interval; чтение, раскрытие,
reload и сохранение настройки не запускают импорт. Выключение останавливает
новые задания, уже поставленное может завершиться. Нельзя редактировать включённую
настройку. Ввод/UUID retry key изолированы по пользователю/сессии; ошибка/409/GET
не подменяют ввод. schedule_id и страницы сохраняют прочие выбранные ID/filters.
Viewer только читает. Новая штатная установка не создаёт и не включает расписания.

**Реализация.** Контракт0.29, миграция `ce78da56f249` послеbd67c945e138:
`url_schedules`/`url_schedule_runs`. Прежний worker делает короткий due-check под
PostgreSQL advisory/row locks; сеть выполняет прежний leased IMPORT_URL job.
Разные worker/рестарты не дублируют ожидающий run, пропущенные интервалы не
создают burst. Глобальная очередь10/дедуп прежние; источник проверяется повторно,
роль автора изменения — перед каждой постановкой. Бюджет новых **плановых
постановок** по source_id по умолчанию300с/12вчас, учитывает прежние ручные jobs.
Это не общий HTTP limiter: ручной endpoint и bounded lease retries прежние.
DEFERRED/QUEUE_FULL откладывает5минут; SOURCE_QUOTA — до освобождения бюджета;
FAILED даёт backoff, третья ошибка или BLOCKED выключают расписание. Старый run
не управляет новой ревизией настройки. Профиль не привязан искусственно к URL:
URL-коннектор не исполняет поисковые фразы. Threads scheduling остаётся OPEN.

**Проверки текущего блока.**
- Полный PostgreSQL backend: `docker compose --env-file .env -f .local/source-runs-20261019/compose.json exec -T -e APP_ORIGIN=http://localhost:3000 api python -m pytest -q -p no:cacheprovider` — **1059 PASS,351.26s**.
  Лог `.local/open-source-20261019/schedules-full-backend-final.log`.
  В том числе18новых schedule cases и contract/live consistency: OFF/read-only,
  permissions/CSRF/idempotency/revision, два worker, restart/leases/fencing,
  квоты/очередь/active job reuse/backoff/остановка и отсутствие автоанализа.
- Финальный browser: из frontend с SAQ_E2E_BASE_URL=http://localhost:3090 и
  SAQ_URL_SCHEDULES_LIVE=1, `npx playwright test tests/monitoring-url-schedules.spec.ts tests/zz-url-schedules-live.spec.ts tests/monitoring-tools.spec.ts tests/monitoring-sources.spec.ts tests/monitoring-drafts.spec.ts tests/monitoring-query-profiles.spec.ts`
  — **28 PASS,48.6s**, retries0, лог `schedules-browser-final.log`.
  Четыре новых presentation tests + live QA create/OFF/enable/reload/disable
  без импорта. История/длинные строки/ошибки/viewer/RU-KZ проверены mocks отдельно.
- Реальный внешний scheduler smoke только в QA: явные create/enable для точного
  AN GROUPS/payment, затем тестовое приближение next_run_at в отдельной БД и
  restart существующего worker. Один SUCCEEDED run/job; HTML176705байт,
  SHA `a696103f4ad7f7cbff070175925b435b98f54214551fa124cbb18650037bc4fb`;
  оригинал скачан и сопоставлен с Asset SHA, материал NEW/без match/analysis.
  После restart run остался один; настройка выключена. `schedules-real-source.json`
  и `schedules-real-verify.log`. Это не наблюдение суток работы по естественным
  часам и не подтверждение полноты/правового статуса рекламы.
- Рабочий localhost3000: **8 RU/KZ responsive наблюдений** 375/768/1024/1440,
  native summary Enter + Tab, без page overflow/pageerror/POST. Автоматически
  созданы только read/auth запросы; расписания и runs **0/0**. Скачаны50Asset,
  все SHA совпали;25досье/44материала/14ориентиров сохранены. В сравнении API
  игнорировалось только динамическое risk.as_of; DB fingerprints доказали
  неизменность27старых таблиц, кроме ожидаемых sessions/alembic_version.
  `schedules-primary-final.log`, `schedules-primary.json`, `schedules-preservation.json`.
- Docker build api/worker/frontend PASS; финальный frontend build после отступов/
  KZ pagination PASS. npm typecheck/lint, Prettier6затронутых frontend файлов,
  Ruff check/format9Python файлов и git diff --check PASS. Ручной просмотр
  снимков RU375 primary/KZ1440 history после последней сборки выполнен.
  Полный browser suite/dependency audit/внешняя UX-предметная приёмка не повторялись.

**Установка и восстановление.** На основном сайте установлены новые api/worker/
frontend через `docker compose up -d --no-build api worker frontend`; API/DB
healthy, все4сервиса running, схемаce78da56f249. Новые образы сохранены под
`saq-qurylys-{api,worker,frontend}:url-schedules-20261019`, точные IDs в
`schedules-installed-images.json`. URL allowlist/риск/ручные решения/исторические
PDF и рабочие данные не менялись. QA остановлен, логи/БД/файлы сохранены.

До установки: `.local/backups/20261019T143642Z-03cb55853fff40b5b375fb7cd9734a77`,
restore PASS `.local/restore-checks/20261019T143757Z-69f5c3955e67491898deba8a2a4dca7a/result.json`.
После установки: `.local/backups/20261019T144547Z-b9a73838ce054f22b48ad2fec43e2dfa`,
restore PASS `.local/restore-checks/20261019T144617Z-8e37788b946d45f699c6b0d4ac9a52ae/result.json`.
Rollback images сохранены с `:before-url-schedules-20261019`. Старый worker image
потерял локальный digest; retained API имеет тот же worker.py SHA и общий runtime.
Старый frontend из-за missing Docker content нельзя было tag/commit: сохранён
export/import snapshot с прежним runtime/CMD/USER, проверен HTTP200 на отдельном
порту3093, probe остановлен. `schedules-primary-before-images.json`,
`schedules-rollback-probe.json`. Локальный override `schedules-rollback-compose.json`
оставляет новую аддитивную схему, запускает старый API напрямую uvicorn, минуя
его Alembic (старая сборка не знает новую ревизию). Без восстановления/удаления БД.

**Исправления проверочного кода.** Первый полный прогон1058PASS/1FAIL ожидал
пустой source budget в общей тестовой schema; прежние ручные jobs верно дали
DEFERRED. Исправлена подготовка только concurrency case, security/quota не
ослаблялись; полный1059повтор завершён. Внешний smoke сначала использовал
несуществующий GET ad/assets; проверка исправлена на фактический ad.assets,
успешный реальный run/оригинал повторно прочитаны без второй загрузки. Первый
primary verifier сравнивал динамический risk.as_of; исправлен verifier, затем
выполнены стабильное сравнение и independent table/hash checks.

**Документы/решение/следующий шаг.** FEATURE_URL_SCHEDULES, ADR-024, .env.example,
README/CHANGELOG/REQUIREMENTS/ARCHITECTURE, связанные source/import/profile docs,
UI_COMPONENTS/UX_GUIDELINES/UI_AUDIT/UI_IMPLEMENTATION_PLAN/REMAINING_CHECKLIST
и этот статус обновлены. Новых зависимостей/сервисов нет. Ограничения: максимум100
URL, нет архива/retention, квота постановок не всех HTTP, уже поставленные jobs
не отменяются. Следующий отдельный блок — сквозная приёмка нового получения
до самостоятельных human review и immutable PDF; внешняя предметная/UX-приёмка
остаётся открытой. Search scheduling с profile_id+revision требует фактического
официального доступа Threads и отдельного согласованного среза. Parser-v2
не начинать до закрытия прежних этапов и свежего gap-analysis. Commit/push,
внешняя публикация/merge не выполнялись.


## 19.10.2026 · общая постановка URL в очередь перед расписанием

Исполнитель Codex; ветка `codex/audit-workflow-fixes`, база
`b15608664f271367b3cc63505def5041f1c69117` + сохранённый накопленный diff.
По «гоу» завершён ограниченный подготовительный блок: прежняя транзакционная
постановка URL выделена из HTTP route в `url_import.enqueue_url_import`.
Она повторно валидирует URL/source, использует тот же PostgreSQL advisory lock,
переиспользует QUEUED/RUNNING URL, ограничивает очередь 10 активными заданиями
и создаёт audit только для нового задания. Сама не выполняет HTTP и commit;
авторизация/CSRF/идемпотентность остаются у прежнего API caller. DTO/контракт,
схема БД, frontend и worker loop не менялись. Новых ADR/зависимостей нет.

**Проверено сейчас:** изолированный PostgreSQL QA, команда
`docker compose --env-file .env -f .local/source-runs-20261019/compose.json exec -T -e APP_ORIGIN=http://localhost:3000 api python -m pytest -q -p no:cacheprovider tests/test_url_queue.py tests/test_url_import.py tests/test_payment_import.py tests/test_contract.py`
— **57 PASS, 10.98s**. Лог `.local/open-source-20261019/queue-backend.log`.
Шесть новых случаев: запрещённый URL без записи; заполненная очередь допускает
повтор активного URL; три terminal states допускают новую явную попытку; две
реальные PostgreSQL транзакции получают один job и один audit. Внешний fetch
в тестах запрещён monkeypatch. Ruff check/format трёх затронутых Python файлов
и `git diff --check` PASS. Fullsuite/build/browser повторно не запускались:
поведение UI не менялось, этот код проверен в QA, **в рабочие images не установлен**.
Рабочая сборка/данные оставлены прежними; QA после тестов остановлен.

**Открыто:** управляемое расписание ещё не реализовано и не включено. Общий
enqueue не является временной квотой или scheduler. Следующий отдельный блок —
явные настройки расписания для точного разрешённого URL с default OFF,
межпроцессными квотами/backoff и durable историей; отдельная привязка
source/profile/revision только для коннектора, который действительно использует
запросы. Threads без доступа остаётся выключенным. Нужны проверки рестарта,
двух worker, отключения и отсутствия запуска при чтении настроек. Parser v2
по поручению пользователя остаётся DEFERRED. При проверке лимита осталось7%;
большой scheduler блок сознательно не начат ради запаса5–7%.

## Серверные профили запросов: версии/история/reload ·19.10.2026 · VERIFIED

Исполнитель Codex; `codex/audit-workflow-fixes`, базаb15608664f27 + накопленный
пользовательский diff сохранён. Использованы implement-feature/ui-ux-pro-max.
Закрыт прежний отдельный этап серверных параметров **помощника1.0**; новое ТЗ
парсера/v2JSON остаётся DEFERRED. Расписание не реализовано и не включено.

**Поведение.** В конструкторе фраз можно сохранить общий профиль команды, явно
применить его параметры и читать старые версии после reload. Снимок хранит имя,
parameters/compiled_queries, dictionary_version/SHA, автора/время. История не
перекомпилируется. Ожидаемая ревизия+row lock дают409 при параллельной правке;
прежний UUID command key даёт прежний ответ без дублирующей версии. Новая запись
версии остаётся отдельным явным действием, даже при одинаковых параметрах.
Чтение/выбор/применение/Enter не запускают Threads/import/worker/риск. Историческая
версия не перезаписывается; ошибку/409 исправляют без потери текущего ввода.
ID/revision профиля в URL сохраняют candidate/q/section и выбранные чужие ID.

**Код/контракт.** Контракт0.28: аддитивные GET list/detail?revision, POST create и
POST{id}/versions под /api/v1/monitoring/query-profiles. Authenticated read,
analyst/session/CSRF/UUID writes, валидация языка/темы/города/размеров/версии1.0.
Миграцияbd67c945e138 послеac56b834d027: monitoring_query_profiles и
monitoring_query_profile_versions (unique profile_id+revision); прежние таблицы
не меняют схему. Один JSON frontend/lib/monitoring-dictionary-v1.json для UI и
server compiler (явный COPY в backend image), не пользовательский source_dictionary
v1/v2. Новый backend query_profiles.py/API/tests; расширены models/main/Dockerfile.
Frontend MonitoringQueryProfiles расширяет текущий builder; общий hook команд
без смены поведения выделен из monitoring-workspace в lib/use-monitoring-command.
Архитектура/упаковка/история/границы — ADR-023 и FEATURE_QUERY_PROFILES.

**Фактические проверки.**
- Полный PostgreSQL backend на изолированном QA: compose
  `.local/source-runs-20261019/compose.json`, exec api, APP_ORIGIN=http://localhost:3000,
  `python -m pytest -q -p no:cacheprovider`: **1034PASS356.41s**, лог
  `.local/open-source-20261019/profiles-backend-verified.log`.
  Включены12новых profile cases:validation/auth/CSRF/viewer, snapshot/history,
  idempotency, конфликт и настоящая гонка двух POST, отсутствие поиска/решений.
- Final frontend cwd: SAQ_E2E_BASE_URL=http://localhost:3090,
  SAQ_QUERY_PROFILES_LIVE=1, `npx playwright test tests/monitoring-query-profiles.spec.ts
  tests/monitoring-queries.spec.ts tests/monitoring-drafts.spec.ts
  tests/monitoring-tools.spec.ts tests/monitoring-sources.spec.ts
  tests/zz-query-profiles-live.spec.ts`: **26PASS54.2s**, retries0,
  `profiles-browser-verified.log`. Старые draft/owner/logout/retry scenarios после
  извлечения hook сохранены. Полный browser suite заново не запускался.
- Opt-in real QA journey: UI createv1/savev2/reload/history/applyold, SHA общего
  JSON, API replay того жеUUID возвращаетv2; чужих POST/search нет.8responsive
  сочетаний RU/KZ375/768/1024/1440 без overflow. DEMO profiles созданы только в QA.
- Primary read-only `profiles-primary.cjs`:8RU/KZ responsive checks,0overflow/
  pageerrors/POST, q сохранён, Enter в параметрах не отправляет команду.
  Все50предыдущихassets скачаны и сверены по SHA;25досье/44материала/14точек прежние.
  Первичная теснота полей устранена tokens spacing, финальный mobile просмотрен.
- Docker build api/worker/frontend, npm typecheck/lint, Prettier9frontendfiles,
  Ruff check/format6Pythonfiles и git diff --check PASS.

Первый full backend1032PASS/2FAIL выявил ошибки новых тестовых условий: отсутствующий
обязательный CSRF header даёт422, а не403; два GETcsrf сменили cookie для первой
запросной гонки. Исправлены только fixtures: невалидный32символьный токен для403,
один действующий CSRF+разныеUUID для двух POST. Focused12PASS, затем полный1034PASS.
В новом browser тесте exact getByLabel для nested select заменён accessible
combobox locator и явным ожиданием региона; финальный26PASS. Один ранний QA
backend прогон прерван recreate контейнера; в итог не засчитывался. Защита app
не ослаблялась, production tests/DEMO-данные в рабочую БД не добавлялись.

**Установка/сохранность.** Local primary обновлён, DEMO_SEED_ENABLED=false.
Образы:api dcd1cfb0bfc7,worker4ff574f6fc4b,frontend fca9d47e9676; полныеSHA в
`profiles-installed-images.json`, API image tag `saq-qurylys-api:query-profiles-20261019`.
API/DB healthy,4сервиса running. `profiles-preservation.json`:25старыхтаблиц
побайтно по fingerprints неизменны, изменились только alembic_version/sessions;
новые2таблицы пусты. Сохранено25досье/44материала/50файлов; профили/версии в
primary не создавались автоматически. Миграция обычная, без перезаписи источников.
Backup перед установкой `.local/backups/20261019T134911Z-ff6f5270133349eb94d531c56e01c83f`,
restore PASS `.local/restore-checks/20261019T135517Z-3d1c7794f9a047f3b20e3735c6e70345/result.json`.
Backup после миграции `.local/backups/20261019T140234Z-51057fb3cd904baabf3a406c11a368c4`,
restore PASS `.local/restore-checks/20261019T140508Z-49857d7641fd4dd8bd27989f496d52ac/result.json`.
Restore проверялся изолированно; primary не восстанавливался поверх данных.
QA остановлен с сохранением volumes/evidence. Commit/push/внешней публикации нет.

**Документация/следующий шаг.** README/CHANGELOG/REQUIREMENTS/ARCHITECTURE,
FEATURE_MONITORING_QUERIES/FEATURE_MONITORING_SOURCES/FEATURE_QUERY_PROFILES,
ADR-023, UX_GUIDELINES/UI_COMPONENTS/UI_AUDIT/UI_PLAN/REMAINING_CHECKLIST актуализированы.
Дальше — управляемое расписание: явная source/profile/revision привязка, enabled/
disabled, квоты/backoff/история и restart на прежней очереди. Затем остаётся
сквозная приёмка нового получения до human review/PDF и независимая проверка
качества. Парсерv2 начинать только после закрытия прежних этапов. Сейчас нет
profile→ThreadsRun привязки, удаления/архива профилей, server preview или админки
словаря; несохранённый ввод помощника сбрасывается при reload, сохранённый снимок
применяется явно. Эти ограничения не скрыты под готовностью планировщика.

## Новое ТЗ Social Monitoring v2 изучено ·19.10.2026 · DEFERRED

По прямому поручению пользователя новое ТЗ парсера и JSON изучены и сохранены;
реализация начнётся после закрытия прежних этапов. Команды разработки внутри
вложенного документа сейчас не исполняются. Три оригинальных файла скопированы
побайтово в docs:ТЗv2/словарьv2/найденный исходныйсловарьv1. SHA совпадают;
JSON читается,22исходныхполя v1 сохранены в v2, заявленный SHA v1 подтверждён.
20ЖК/55алиасов/32хэштега/20seed(12RU+8KK),14геоалиасов/13unique casefold.
[Конспект, ограничения и порядок](../audits/SOCIAL_MONITORING_V2_INTAKE_2026-10-19.md).
Файлы сохранены как документация, не runtime-конфигурация. Код/API/БД/источники/
доступ/фоновые задания не менялись, build/E2E не запускались — это изучение.
Перед v2 сохраняются предыдущие открытые этапы: серверные параметры/версии,
управляемое расписание и сквозная приёмка материала до human review/PDF.

## Фразы RU/KZ1.0: отдельный UI-срез ·19.10.2026 · VERIFIED в указанном объёме

Codex; codex/audit-workflow-fixes, базаb15608664f27 + прежний diff сохранён.
Использованы implement-feature/ui-ux-pro-max, существующие Button/native controls.
Подготовка фраз на9алиасах города/региона,2языках и4темах оплаты; необязательный
ЖК, обязательный строительный контекст для коротких аббревиатур. Только явная
подстановка в черновик с возвратом фокуса; helper вне search form, Enter не
запускает поиск. API/DB/worker/скоринг/решения не менялись. Новые files:
frontend/lib/monitoring-queries.ts, components/monitoring-query-builder.tsx,
tests/monitoring-queries.spec.ts; расширены threads-search.tsx/monitoring.css.

Проверки: Docker frontend build, npm typecheck/lint, Prettier5files PASS.
QA: `SAQ_E2E_BASE_URL=http://localhost:3090 npx playwright test
 tests/monitoring-queries.spec.ts tests/monitoring-tools.spec.ts
 tests/monitoring-sources.spec.ts` —7PASS17.0s без retries. Покрыты RU/KZ/9алиасов/
темы/длина/дедуп/Unicode, Enter без POST при синтетически READY источнике,
вкладки/ID/q/focus. Начальная ошибка типов аргумента test helper исправлена,
финальный typecheck PASS. Backend tests не запускались: backend не изменялся.

Primary frontend установлен. `.local/open-source-20261019/queries-primary.cjs`:
8реальных responsive проверок RU/KZ375/768/1024/1440,0overflow/POST/pageerrors;
Threads фактически DISABLED, доступ не обходится. Mobile screenshot просмотрен.
`queries-preservation.json`:26таблиц неизменны, изменилась только auth session;
25досье/44материала/50assets, все50SHA проверены,14точек сохранены.
Резервная копия `.local/backups/20261019T131317Z-2caa045c9bca4caeb5a48e5014bd1d8e`,
restore PASS `.local/restore-checks/20261019T131416Z-43aa94ca17eb4392b53c041cc556a195/result.json`.
Docker Engine в начале проверки был остановлен; запущен Docker Desktop и только
существующие локальные SAQ services. QA остановлен с сохранением volumes.
Commit/push/внешней публикации нет. Подробности — FEATURE_MONITORING_QUERIES,
README/UI_AUDIT/UI_PLAN/UI_COMPONENTS/REMAINING_CHECKLIST обновлены.

Ограничение: это версия редакторских подсказок в клиенте, не серверный движок
поиска и не извлечение фактов. Новых материалов не получено. Параметры helper
сохраняются при смене вкладок, сбрасываются при reload. Следующий самостоятельный
блок: серверное сохранение версии/параметров запросов, затем явное включение/
отключение расписания, квоты/паузы/история на существующей очереди. Расписание
в этом блоке не реализовано и никакой фоновой автоматизации не создано.

## AN GROUPS: URL → job → сохранённый HTML ·19.10.2026 · VERIFIED в указанном объёме

Исполнитель Codex; ветка `codex/audit-workflow-fixes`, база `b15608664f27` +
накопленный diff. Прежние изменения сохранены; commit/push/внешней публикации нет.
Локальный сайт обновлён. Ниже прежний PARTIAL — история первого ручного наблюдения.

**Результат.** Существующий импорт принимает точный
`https://www.angroups.kz/payment`: аналитик явно нажимает кнопку, worker сохраняет
HTML/TEXT с URL/временем/SHA и provenance `angroups-payment-v1`/`COMMERCIAL_OFFER`.
На рабочем сайте создан материал `0363ba93-eed9-4426-96e2-c46c8bf7dded`, исходный
HTML SHA `a696103f4ad7f7cbff070175925b435b98f54214551fa124cbb18650037bc4fb`,
получен `2026-10-19T12:38:51.413500+00:00`. Лицензия null, дата публикации null,
ЖК/очередь не установлены. Старое ручное наблюдение82621268… сохранено отдельно.
Три мобильные карточки извлекаются без исправления противоречивого текста;
desktop может отличаться, полный HTML сохранён для сверки. Область извлечения
показана на форме и в карточке/анализе. Прежние специализированные RU fallback
формы остаются; новые пояснения доступны RU/KZ.

API DTO/роли/схема БД прежние; описание поддерживаемых URL в OpenAPI обновлено.
Сервер выбирает политику, сверяет source_id job, не принимает политику клиента.
AN: только точный путь без query, проверка каждого redirect до соединения.
Прежние DNS/IP/TLS/2MiB/20s/3redirects/очередь10/lease/claim/idempotency сохранены.
Повтор текста переиспользует прежний материал/HTML; изменение — отдельная версия.
Раскрытие/ввод/reload только читают; анализ/matching/факторы/сигнал не запускаются.
Прежний Primeminister продолжает работать отдельно с CC BY. Найденная визуально
ошибка «CC BY для любого HTML» исправлена и покрыта RU/KZ-регрессией обоих источников.

**Проверки.**
- Docker build api/worker/frontend PASS; final images в
  `.local/open-source-20261019/installed-images.json` (api d7a3bd708ec5,
  worker81152b7e9975, frontend4d843d276244). API/DB healthy, четыре сервиса running.
- На изолированном QA PostgreSQL: `python -m pytest -q -p no:cacheprovider
  tests/test_payment_import.py tests/test_url_import.py tests/test_url_fetcher.py
  tests/test_monitoring_sources.py tests/test_contract.py` — **178 PASS17.22s**.
  Exec: compose `.local/source-runs-20261019/compose.json`, api,
  APP_ORIGIN=http://localhost:3000. Новый источник/markup/shell/date/provenance,
  dedup/версии/failure/lease recovery/source mismatch; прежний transport/источник,
  права/CSRF/idempotency/контракт. Сеть в этих tests синтетическая. Полный backend
  suite заново не запускался; прежние1001PASS относятся к версии до этого блока.
- В frontend cwd: SAQ_E2E_BASE_URL=http://localhost:3090,
  `npx playwright test tests/open-sources.spec.ts tests/monitoring-sources.spec.ts
  tests/monitoring-tools.spec.ts` — **17 PASS33.6s**, retries0.
- `npm run typecheck`, `npm run lint`, Prettier7затронутыхфайлов,
  Ruff check/format6Python-файлов и `git diff --check` PASS.
- `.local/open-source-20261019/verify-live.cjs` — реальные QA и primary GET/import/
  download/reload/repeat PASS. 24наблюдения на каждом: import/sources/material,
  RU/KZ,375/768/1024/1440; page overflow0, pageerrors0, после явного UI POST
  раскрытие/reload других команд не отправляет. Новый job того же URL открывает
  прежние ad/HTML; одинаковый UUID возвращает тот же job. Скачанный HTML = SHA.
  Реальные mobile/desktop снимки просмотрены; ложная лицензия отсутствует.
- Первые технические прогоны исправлены: QA не содержит dev pytest после recreate,
  его установили только в disposable QA; backend env Origin и frontend cwd приведены
  к fixture. В live helper исключён вычисляемый risk.as_of из сравнения GET.
  Это не ослабление app/CSRF и не изменение предметных данных.

**Сохранность.** Primary25досье/44материала/50файлов/14точек, DEMO не добавлялось.
Все прежние43строки материалов равны до/после; прежние48assets скачаны и сверены
по SHA. Fingerprints21таблицы неизменны, включая объекты/риски/сигналы/реестры/
кандидатов; изменились только advertisements(+1),assets(+2),analysis_jobs(+2),
audit_events(+4),commands(+2),sessions(+1). MonitoringRun0, миграция прежняя
ac56b834d027. Evidence: primary-live.json, primary-provenance.json, preservation.json.
Backup перед установкой `.local/backups/20261019T122638Z-28ce0773a20d41a29af602fd40f59b13`,
restore PASS `.local/restore-checks/20261019T122734Z-643b210bd5474460a2a41151c149c0b3/result.json`.
Backup после импорта `.local/backups/20261019T124003Z-d875777dd17b4240bd10c312c907ce28`,
restore PASS `.local/restore-checks/20261019T124145Z-74167039e1e24c82bf55fc6a4a1c8c6b/result.json`.
Сохранён API image tag `saq-qurylys-api:payment-20261019`; QA остановлен, volumes
и evidence сохранены. Restore выполнялся в отдельном окружении, не поверх primary.

**Документы/границы.** README/FEATURE_URL_IMPORT/FEATURE_MONITORING_SOURCES,
REQUIREMENTS/ARCHITECTURE/ADR-008, UX_GUIDELINES/UI_COMPONENTS/UI_AUDIT/UI_PLAN,
REMAINING_CHECKLIST/research audit/CHANGELOG обновлены. Новых зависимостей и ADR
не потребовалось: расширен существующий transport/job flow. Технический C-01
явного получения одного коммерческого источника закрыт. Общий crawler, поиск
по нескольким площадкам, расписание, независимая предметная/UX-приёмка и полный
новый live-сценарий до human review/PDF не объявляются завершёнными. Следующий
блок Social Monitor — RU/KZ словарь и управляемое расписание с лимитами; внешнюю
проверку качества и применимости полученного материала сохранять отдельным этапом.

## Открытые источники: первый материал AN GROUPS ·19.10.2026 · PARTIAL

Codex; codex/audit-workflow-fixes, база b15608664f27; прежний diff сохранён.
Пользователь явно поручил начать получение открытых страниц. Прежняя трактовка
отсутствия отдельной лицензии как общего запрета была избыточной; вывод ниже
является историческим. Явные ограничения сайтов и сетевые проверки сохраняются.

Выполнен реальный GET https://www.angroups.kz/payment существующим bounded
SSRF/DNS/TLS transport: HTML176705 bytes, получен2026-10-19T12:17:06.720060+00:00.
SHA-256: a696103f4ad7f7cbff070175925b435b98f54214551fa124cbb18650037bc4fb.
HTML/fetch.json: `.local/open-source-20261019/`. Через существующий
session/CSRF API сохранено краткое наблюдение об условиях оплаты:
`82621268-b597-4599-9f14-1c2507498590`. Дата публикации null, ЖК/очередь
не установлены. В приложении TEXT наблюдения; HTML сохранён локально и
не выдан за прикреплённый оригинал. CC BY этому источнику не приписывается.

Проверка `.local/open-source-20261019/import.cjs` PASS: 201 create и повтор
с тем же UUID Idempotency-Key дают один ID; 42→43 материала, все прежние42
строки API равны до/после, REAL, published_at=null. Первый запрос с не-UUID
ключом корректно отклонён422; ключ исправлен. Анализ/match/решения не запускались.
Backup перед записью:
`.local/backups/20261019T121720Z-c38dfc8e4f0a49bb8bb59da89f931613`.
Восстановление этой копии здесь не проверялось. Код/API не менялся, build/full
suite и новая визуальная проверка не запускались.

C-01 PARTIAL: выполнен первый сбор и сохранено наблюдение; автоматического
рекламного адаптера ещё нет. Следующий шаг — точный `/payment` adapter для
существующего IMPORT_URL с HTML asset в приложении и отдельной provenance,
без фиктивной лицензии; parser/idempotency/failure/recovery проверки.
Работа ограничена этим блоком после показания93% расхода окна ради запаса5–7%.

## C-01: поиск открытого рекламного источника ·19.10.2026 · OPEN

Codex; ветка codex/audit-workflow-fixes, базаb15608664f27 + прежний diff сохранён.
Пользователь уточнил: официального доступа пока нет, ищем открытый источник.
Проверены открытые страницы AN GROUPS/payment, КӨКТЕМ, историческая реклама
Novy Bereg на YK.KZ, страницы YK.KZ about/contact и правила нескольких изданий.
Прямое открытие Altyn Uia вернуло502; поисковый сниппет не считается оригиналом.
Подтверждённого разрешения автоматического GET+архива нового рекламного
источника в проверенной выборке не найдено; общий запрет для AN/YK/КӨКТЕМ
также не заявляется. Статус PERMISSION_NOT_CONFIRMED, не APPROVED.

Конкретные URL/даты/условия/границы:
`docs/audits/AD_SOURCE_RESEARCH_2026-10-19.md`. AN GROUPS/payment — предложенный
кандидат, но не одобренный adapter. YK.KZ Novy Bereg21.12.2022 — исторический
образец, не текущие продажи/подтверждение нарушения. YK-news.kz — другой домен,
его ограничительные правила не переносятся на YK.KZ. Robots трёх кандидатов
web-инструментом не прочитан: UNKNOWN. Никакого обхода/рассылки запросов владельцам.

Offline `approved_url` проверка трёх candidate URLs:3PASS/URL_NOT_ALLOWED,
без network/DB; `.local/ad-source-research-20261019/allowlist-check.json`.
Первое исследовательское assert ожидало SOURCE_NOT_APPROVED; уточнён фактический
код URL_NOT_ALLOWED без изменения транспортной политики. git diff --check PASS.
Новых imports/config/API/миграций/сборок/установки нет; primary данные не трогались.
Проверки1001backend/11browser предыдущего установленного среза не повторялись
для docs-only работы. FEATURE_THREADS_SEARCH дополнен актуальным поведением
MonitoringRun, старое описание ephemeral preview помечено историческим.

Следующий шаг C-01: найти явную совместимую лицензию или получить согласование
одного конкретного источника; затем reviewed host/path adapter + прежние
IMPORT_URL jobs/lease + original/SHA/text + отдельная ручная проверка. До этого
не включать collector/scheduler и не объявлять C-01 закрытым. Отсутствие рекламы
или результата поиска не используется как R1. Commit/push не выполнялись.

## Social Monitor: источники и запуски установлены ·19.10.2026 · LOCAL VERIFIED

Codex; `codex/audit-workflow-fixes`, HEAD `b15608664f271367b3cc63505def5041f1c69117`
+ сохранённый накопленный diff. Закрыт следующий согласованный срез ТЗ:
`/monitoring?section=sources` — catalogue5методов/доступ/ошибка/прошлый успех;
`/monitoring?section=runs` — mounted история явных Threads попыток/результатов.
CSV/КЖК/информационный URL import сохраняют собственные механизмы и границы.

Backend: MonitoringRun, миграция `ac56b834d027` после `fb45a723c916`, begin/finish
с audit; намерение коммитится до внешнего I/O, terminal whitelist snapshot после.
Actor+command_key уникальны, advisory lock защищает конкурентный retry. Один ключ
не повторяет внешнее обращение. Без ключа прежний endpoint совместим и создаёт
новую попытку. EMPTY отличается от ERROR/BLOCKED; незавершённый RUNNING после30с
читается как INTERRUPTED без записи GET/автоматического retry. Сохранённый terminal
исход не заменяется при потерянном commit ack. Source quota пока process-local;
scale-out требует общей квоты/lease. Исторический успех не сертифицирует текущий token.
Новые GET sources/runs/detail, POST threads/search добавляет run_id; контракт0.27.
Новые catalogue/history RU/KZ, прежние ID/фильтры/черновики сохранены.

Финальная проверка на изолированном API8278/UI3090:
- `docker compose --env-file .env -f .local/source-runs-20261019/compose.json exec -T -e APP_ORIGIN=http://localhost:3000 api python -m pytest tests -q -p no:cacheprovider`:
  **1001PASS286.83с**, `.local/source-runs-20261019/backend-verified.log`.
- `SAQ_E2E_BASE_URL=http://localhost:3090 npx playwright test tests/monitoring-sources.spec.ts tests/threads-search.spec.ts tests/csv-import.spec.ts tests/monitoring-tools.spec.ts`:
  **11PASS26.7с** на финальном frontend image. Новый реальный QA disabled attempt503
  сохраняется; Back/reload/filters/candidate_id/q/mounted drafts/GETretry/no implicitPOST,
  XSS literal, RU/KZ375/768/1024/1440, overflow<=1px/table keyboard focus PASS.
  Browser success snapshots — presentation fixtures; network Threads/токен не тестировались.
- ESLint/tsc/Prettier PASS, Ruff check/format PASS, git diff --check PASS;
  Docker API/worker/frontend builds PASS. Скриншоты output/qa/source-runs-20261019;
  desktopRU1440catalog и mobileKK375run визуально просмотрены.
Первый full1000PASS/1FAIL317.62с был дефектом нового concurrency test: cookies
копировались до CSRF update. Исправление проверено11новыми тестами и единым
полным повтором выше. Более ранний9browserPASS/1FAIL был неоднозначным label
для select; role=combobox исправлен, финальный11-case запуск без retry.

Fresh backup перед установкой:
`.local/backups/20261019T114813Z-711e958a0c6d4b2a8aa2a3c7ce495114`, обычный restore
PASS `.local/restore-checks/20261019T114857Z-e649cd3ee8694b3f8543025e151ed25e/result.json`.
Все26primary таблиц совпали с копией до установки. Offline candidate upgrade+
47authenticated HTTP downloads PASS: `.local/source-runs-20261019/upgrade-rehearsal.json`,
restore-check `20261019T115149Z-2bf63e4f29144a978d77672cae17767d` (manifest не менялся).

Установка `docker compose up -d api worker frontend` PASS, seed выключен,
schemaac56b834d027. До browserlogin старые26таблиц сохранены по fingerprints
кроме alembic_version; после — кроме ожидаемой session авторизации. Новая
monitoring_runs пустая. `verify-primary.py` до/после и `primary-smoke.cjs` PASS:
25досье/42материала/47downloadSHA/14точек,5методов/история0, ThreadsDISABLED,
no page errors/POST при просмотре/раскрытии. Старые попытки не backfill-ились.
Primary375/1440 без overflow; screenshots output/qa/source-runs-installed-20261019.
Установленные config SHA: API `cf50cbe1b91a77c6bd404fb2eaa1918482e72eadad257171a3bf2b32fcb120e0`,
worker `12afddbe84e3992fb353752652fb008475ea7823f3da798bb4e2ffa7dea79319`,
frontend `96e6e89d92af65a25c6f30c20ac971183f14970934ec2d38c3b8894f747ef86d`.
API pin `saq-qurylys-api:source-runs-20261019`; старый CSV pin сохранён.
4primary services running (API/DB healthy),4QA остановлены с volumes сохранёнными.
После установки backup `.local/backups/20261019T115737Z-4fbfcd683dd5404d8142810cd64b2dad`
и обычный restore PASS `.local/restore-checks/20261019T115847Z-7a3ae88e3a4c43c38b608c2c1a9cf495/result.json`.

Документы: FEATURE_MONITORING_SOURCES, ADR-022, README, ARCHITECTURE, REQUIREMENTS,
UI_COMPONENTS/UX_GUIDELINES/UI_AUDIT/UI_IMPLEMENTATION_PLAN, CHANGELOG/checklist.
Новых dependencies/ролей/фоновых jobs нет. Старые длинные monitoring/Threads
инструкции частичноRU; внешняя языковая/предметная/WCAG приёмка не объявляется.
Новый источник рекламы/токен/расписание не подключались. Следующий отдельный блок:
проверить один разрешённый рекламный источник, затем явное сохранение материала
и сквозной путь нового RU/KZ текста до human review/неизменяемого PDF. После
доказанного получения — dictionary/scheduler через прежний worker/leases.
Commit/push/внешний deploy не выполнялись; пользовательские изменения сохранены.

## Social Monitor: CSV установлен ·19.10.2026 · LOCAL VERIFIED

Codex; `codex/audit-workflow-fixes`, база `b15608664f271367b3cc63505def5041f1c69117`
+ сохранённый накопленный diff. Закрыта установка первого среза Social Monitor:
на рабочем localhost:3000 доступен `/monitoring?section=imports` — шаблон,
предпросмотр, отдельное сохранение, immutable журнал и исходный CSV.
Миграция `fb45a723c916` применена. API/worker/frontend обновлены, DEMO seed выключен.

Финальная приёмка:
- `docker compose --env-file .env -f .local/csv-acceptance-20261019/compose.json exec -T -e APP_ORIGIN=http://localhost:3000 api python -m pytest tests -q -p no:cacheprovider`:
  **990 PASS**,276.91с; лог `.local/csv-acceptance-20261019/backend-final.log`.
  Это завершённый новый прогон; старый прерванный лог72% ниже — история.
- `SAQ_E2E_BASE_URL=http://localhost:3090 npx playwright test tests/csv-import.spec.ts tests/monitoring-tools.spec.ts`:
  **4 PASS**,12.2с на финальном image. CSV bytes/download .csv, explicit commit,
  duplicate receipt, reload/deep links, role/read-only, mounted drafts, no navigation POST,
  error focus и RU/KZ375/768/1024/1440 проверены. Overflow<=1px.
- `npm run lint`, `npm run typecheck`, `npm run format:check` — PASS.
  Ruff check затронутых Python-файлов, format четырёх новых файлов — PASS;
  `git diff --check` PASS. Финальный Docker build — PASS предыдущего шага;
  QA и primary frontend используют один image.
- Скриншоты финального UI `output/qa/csv-import-20261019`: desktopRU1440 и
  mobileKK375 визуально просмотрены; padding/empty error исправления подтверждены.
  Специализированные длинные RU-инструкции старого monitoring shell ещё не полностью
  переведены; CSV authored UI двуязычный. Внешняя языковая/WCAG приёмка отдельна.

Перед установкой fingerprint всех24таблиц совпал с предшествующей копией;
новая копия `.local/backups/20261019T104611Z-8e43368e890c48b4a3f5eeb87298e18e`.
Обычный verify этой копии восстановил24таблицы/92audit, но HTTP probe не стартовал:
Docker больше не содержал старый source API image6d9b45f6. Это не повреждение данных.
Сделана отдельная offline репетиция на новой сборке с миграцией, оригинальный
manifest не изменялся: `.local/csv-acceptance-20261019/rehearse-upgrade.py` PASS,
`upgrade-rehearsal.json`, restore-check `20261019T104937Z-931f75c32a8b4c7dab5c4652a641a2a9`.
Проверены восстановленная БД и authenticated HTTP downloads47исходников.

Установка: `docker compose up -d api worker frontend` PASS. До browser login
все старые таблицы кроме alembic_version побайтово эквивалентны по fingerprints.
После browser smoke — то же, кроме ожидаемой session авторизации. Обе новые
CSV-таблицы пусты; рабочий тест ничего не импортировал.
`verify-primary.py` до/после и `primary-smoke.cjs` PASS (private .local/csv-acceptance-20261019):
25досье/42материала/47downloadSHA/14координат, DEMO0, UNKNOWN/балл0;
предпросмотр реального пользовательского CSV20строк/19материалов/19DUPLICATE,
сохранены все ID, journal0. Нет бизнес-команд/ошибок страницы; только явный preview POST.
Скриншоты рабочего сайта `output/qa/csv-installed-20261019`,375/1440, overflow<=1px.

Установленные images (config SHA): API `8c869ca40352ab4ed856e967a03da22eca5d956da71220364e964e62294db9c8`,
worker `336f39d8949dbf4a9370e448c2c8810d344dd1abe905445055e12ede7afa490a`,
frontend `28ec8ac62c074117ddcfc5a4e66181152c6a0cf9dec7b84bb61613c21e0dddbf`.
API дополнительно сохранён под local tag `saq-qurylys-api:csv-20261019` для восстановления.
После установки создана новая рабочая копия
`.local/backups/20261019T105115Z-fde6bd6ab56f4e928560814f618e91b7`;
обычный `backup_local.py verify` PASS:
`.local/restore-checks/20261019T105219Z-fc82356989fc41548d280500c02030fe/result.json`.
Все4primary services running (API/DB healthy);4QA services остановлены, volumes сохранены.
Commit/push/внешний deploy не выполнялись. Старые пользовательские изменения сохранены.

Следующий отдельный блок: «Источники и запуски» по UI_IMPLEMENTATION_PLAN —
реальные состояния доступа/ошибки/последний успех, сохраняемая история ручных
запусков, затем один разрешённый рекламный источник. Автосбор соцсетей,
поисковый словарь и расписание остаются OPEN, CSV не выдаётся за их реализацию.

## Social Monitor: CSV intake ·19.10.2026 · IMPLEMENTED, установка OPEN

Codex; ветка `codex/audit-workflow-fixes`, HEAD `b15608664f271367b3cc63505def5041f1c69117`
+ сохранённый накопленный diff. Первый согласованный срез: CSV template/preview/
commit/journal в mounted вкладке «Импорт CSV». Новые backend csv_import.py,
api/csv_import.py, таблицы CsvImportBatch/CsvImportedMaterial, миграцияfb45a723c916;
контракт0.26.0. Frontend CsvImport, optional Pagination.statusLabel, RU/KZ.
Исходные CSV/тексты сохраняются, повторы используют прежние IDs, изменённые версии
не перезаписывают старые. Social audit20строк →19материалов. Нет network fetch,
auto analysis, создания досье, подтверждённых связей/факторов/сигналов.

Проверено на отдельной БД `.local/csv-acceptance-20261019/compose.json`
(API8277/UI3090, primary3000 не обновлялся):
- targeted pytest CSV+contract:32PASS (включая concurrent commit/rollback/CSRF/viewer).
- Playwright csv-import+monitoring-tools:4PASS до последних малых UI-правок
  (padding, скрытие пустого Notice, фокус ошибки, локализованная pagination).
- RU/KZ375/768/1024/1440: overflow<=1px, keyboard/table focus/tab/file retention;
  screenshot desktop просмотрен, выявленные padding/empty Notice исправлены.
- Docker build API/worker/frontend PASS; финальная frontend сборка PASS после
  фокуса ошибки. ESLint/tsc/Prettier PASS до последней правки фокуса; её build PASS.
- Ruff check PASS, format исправлен; git diff --check ранее PASS.
- Полный backend pytest запущен, на момент handoff лог72%, без итогового результата:
  `.local/csv-acceptance-20261019/backend-tests.log`, exec session19798.
  Не считать full suite VERIFIED. Финальный повтор E2E был прерван пользователем;
  `.last-run.json=passed` без привязанного итогового вывода не заменяет приёмку.

Backup `.local/backups/20261019T102751Z-53970efdf3b240acae605c125ae60d2c` создан;
restore PASS `.local/restore-checks/20261019T102853Z-6e8b1b17d6b44ad6a7bc9810f0926800/result.json`.
Рабочие25досье/42материала/47assets/14точек не менялись этим срезом;
свежий read-only fingerprint после установки ещё нужен. Primary schema остаётсяea34f612b805.
Собранные Docker tags уже новые, но primary containers не пересоздавались.
QA containers оставлены для завершения проверок; Windows dev3090 остановлен,
QA3090 теперь собранный frontend. Первые browser failures были dev reload loop
и неоднозначными test selectors; на собранном runtime исправлены/прошли.

Документы: FEATURE_CSV_IMPORT, ADR-021, README, REQUIREMENTS, ARCHITECTURE,
UI_COMPONENTS, UI_IMPLEMENTATION_PLAN, CHANGELOG. Исходное Social Monitor ТЗ
не означает закрытия автоматических коннекторов/расписания.
Ограничения: legacy URL lookup линейный; после DB rollback возможен orphan
content-addressed файл; исходный файл скачивается .csv, хранится внутренне .txt.

Следующий точный шаг: получить итог full pytest; повторить4E2E на3090 с финальным
image, lint/typecheck/format и визуально375/1440. После успеха сравнить primary
fingerprints с backup, `docker compose up -d api worker frontend` (без seed),
проверить schemafb45a723c916, старые строки/47SHA/25-42-14, preview реального
social CSV должен дать19повторов без записи. Обновить фактическую приёмку и
остановить QA. Commit/push/внешний deploy не выполнялись.
Лимит в конце показал98% использовано: требуемый запас5–7% не сохранился;
новые блоки не начинались. claude-mem observer недоступен, контекст записан здесь.

## Социальные наблюдения и карта ·19.10 · LOCAL VERIFIED

Codex; ветка `codex/audit-workflow-fixes`, база `b15608664f27` + прежний diff.
Добавлены оба пользовательских saq_oskemen_social_* файла: 20 строк сохранены
в 19 материалах (A01/A20 одной страницы Riverside объединены без потери фрагментов).
6 новых досье: Riverside, Altyn Uia III, Crystal, Dostar-City, Жаным,
Grand Residence / Dala SK. Последний — историческое наблюдение с неуточнённой
идентичностью. Существующие ID и строки сохранены. Итого25досье/42материала/47assets,
DEMO0. Статусы UNKNOWN, балл0; подтверждённые связи/факторы/сигналы не создавались.

14 проектных ориентиров получены из public map/JSON-LD Korter/Krisha; HTML/SHA,
URL/адрес/точность записаны в private plan и audit PROPERTY_LOCATION_IMPORTED.
Это не кадастровые границы или подтверждение конкретного корпуса. Без точек11:
ASYLYM, Престиж, ORDA, Айналайын, BELGRAVIA, BS HOLDING EASTON, PARK LINE,
RENESANS, Viva Park, Altyn Uia III, Grand Residence / Dala SK. Адреса спорны
или недостаточны; чужие очереди и центр города не подставлялись.

Backup `.local/backups/20261019T091703Z-2cfb7bf19f5a4a5b8f8163c2b76fbf32`;
restore PASS `.local/restore-checks/20261019T091744Z-f3610f0328e84152b1e97cf4368cccce/result.json`.
Offline rehearsal: default ROLLBACK и COMMIT PASS; primary dry-run/COMMIT PASS.
Все старые строки пяти затронутых таблиц сохранены (у properties только coords/revision);
fingerprints остальных таблиц совпали до browser login. Все47storage SHA проверены.
Инструмент `scripts/import_social_observations.py`: явный mapping/plan, backup+restore,
остановленные writers, unchanged fingerprints, deterministic IDs; повтор отклоняется.
Сырые CSV/MD остаются ignored .local. API/контракт/риск не менялись.

Проверки: `python -m unittest discover -s scripts -p test_import_social_observations.py`
3PASS; Ruff check/format PASS; frontend tsc/ESLint/Prettier PASS; Docker frontend build PASS.
Реальный authenticated browser `.local/social-import-20261019/browser.cjs`:25досье,
42материала,47asset downloads SHA,14markers на375/768/1024/1440, overflow0,
keyboard selection/deep links/publications/history PASS;0 business writes/page errors.
Текущий Riverside PDF GET200. Полный202-case suite после этого узкого изменения
не повторялся. Desktop screenshot просмотрен; OSM подложка загружалась частично,
доступность внешних tiles не гарантируется. Скриншоты/PDF: `output/qa/social-import-20261019`.
DEMO-подпись карты теперь условная; пояснение проектных ориентиров RU/KZ.
Skill search не дал точного map-uncertainty правила; применены проектные границы.
Рабочие4services running, rehearsal остановлен; commit/push/внешнего deploy не было.
Следующий шаг: уточнить11адресов/очередей и проверить первичные документы/посты
отдельными решениями аналитика. Предыдущая приёмка Master2.0 ниже — история.

## Master2.0 · редизайн по скриншотам Kompra ·19.10 · LOCAL VERIFIED

Codex. Пользователь разрешил полный редизайн по девяти скриншотам, RU/KZ и
упрощение UX. Ветка `codex/audit-workflow-fixes`, база `b15608664f27` + сохранённый
накопленный diff; старый stash не менялся. Commit/push/внешняя публикация не выполнялись.

Реализованы белая оболочка/собственный SVG/иконки/RU-KZ, источники на обзоре и
`/sources`, fact cards/источники/даты, шесть mounted tabs, цветная статистика R1–R6,
таблицы документов/публикаций и native боковые детали. ReportOptions выбирает
разделы и язык текущего PDF; сводка/оговорки обязательны, есть spinner/reduced-motion,
ошибка/GET-retry/отмена. Сохраняются дата R1 и результаты трёх правовых механизмов.
Материал строки импорта остаётся непроверенным наблюдением; следующий шаг ведёт
к его сохранённой записи, без автоматического подтверждения связи или фактора.

**Единый Playwright:202 PASS /0 FAIL /2 SKIP,616.1с, retries0/workers1.**
SKIP — отдельные opt-in typography A/B Chromium/Firefox, прежнее решение о системном
шрифте сохранено. Среда: новая `saq-redesign-verified-20261019`, API8267/UI3080,
свежие PostgreSQL/seed/storage. Команда из frontend: `SAQ_ISOLATED_ACCEPTANCE=1`,
`SAQ_E2E_BASE_URL=http://localhost:3080`, `npx playwright test --output=../.local/redesign-verified-20261019/test-results --reporter=list,json`.
Полный набор включает реальные workflows/OCR/решения/PDF и отдельно HTTP-presentation
fixtures; это не внешняя UX/предметная приёмка. Все276 source/config файлов неизменны
от старта набора до окончания: fingerprint `1d2b400ec847c99c9d7950e3467702ff7af705d02c271906589703ef2d05c358`.
Логи/JSON/manifest: `.local/redesign-verified-20261019/`.

Первый полный запуск200PASS/2FAIL/2SKIP13.1мин имел два устаревших селектора
(.dossier-facts и декоративный eyebrow). Они исправлены, отдельно2PASS, затем оба
пройдены в новом полном наборе выше. Промежуточные25PASS/mobile9PASS не подменяют
единый результат. Первый backend запуск с browser-origin3080 остановлен как
ошибка тестовой конфигурации; повтор с `APP_ORIGIN=http://localhost:3000`:
**966 PASS380.68с** в случайной schema. После финальной PDF-пагинации/перевода
системных UNKNOWN-заметок — **11report testsPASS14.48с**. Полный966 после этой
последней шаблонной правки повторно не запускался; реальные PDF проверены далее.
Typecheck/ESLint/Prettier, Ruff check/format104files, repository hygiene/diff-check
и Docker build API/worker/frontend PASS. Backup unit:15PASS/1opt-inSKIP.

Локальный рабочий runtime обновлён: API/worker/frontend/db running, API/db healthy,
schema `ea34f612b805`, DEMO_SEED_ENABLED=false. До/после совпали fingerprints
всех предметных таблиц; изменились только migration version и auth sessions.
Сохранены **19REAL-досье,23материала,28originals,DEMO0**. На рабочем API/Chromium
прочитаны все досье/материалы, скачаны28assets с SHA, проверены375/768/1024/1440
на overview/registry/dossier,24переключения вкладок, native боковой материал импорта,
RU/KZ и2реальныхPDF. Ноль business POST/pageerrors. PDF досье не изменяет snapshots.

Перед обновлением проверен backup `.local/backups/20261019T081958Z-54d4852ea480418da0e1e980f9fc043f`:
24таблицы/28originals и авторизованное HTTP-чтение совпали. Сигналов/исторических
PDF в очищенной REAL-базе нет: покрытие честно0, фиктивные решения не создавались.
На offline REAL-копии проверены миграции/данные/настоящие RU-KZ PDF по6страниц;
все12страниц отрендерены и просмотрены: без clipping/overlap, сохранены источники,
даты, SHA и оговорки. Рабочие UI-PDF также по6страниц отрендерены, выборочно просмотрены.
Production evidence: `primary-data-proof.json`, `production-read-check.json`,
`runtime.json` в каталоге приёмки; screenshots/PDF `output/qa/saq-redesign-real-20261019`.
Rollback images сохранены тегами `before-redesign-20261019`.

Свои QA API/worker/db и frontend3080 остановлены, volumes/storage сохранены;
рабочие четыре контейнера на localhost3000 оставлены запущенными. Документы:
DESIGN_SYSTEM/UX_GUIDELINES/UI_COMPONENTS/UI_AUDIT/UI_IMPLEMENTATION_PLAN,
FEATURE_DOSSIER_REPORT/FEATURE_LOCALE/LOCAL_BACKUP, README/CHANGELOG/ARCHITECTURE,
REMAINING_CHECKLIST, контракт0.25 и ADR-020. Новых runtime packages нет.

Границы: длинные специализированные инструкции частично остаются RU; независимая
языковая/UX/предметная приёмка, screen-reader/full WCAG, физическая печать и второй
ПК не подтверждены. C-01/права на коммерческий источник и закрытые интеграции
этим срезом не закрываются. Следующее действие: проверить точные объекты/очереди,
первичные разрешительные документы и оригинальные рекламные страницы; предметные
подтверждения выполнять раздельно. Полный редакторский KZ перевод — отдельный остаток.

## Единая приёмка ТЗv2 ·19.10 · LOCAL VERIFIED

Codex, независимое read-only ревью последних четырёх тестовых правок.
Ветка `codex/audit-workflow-fixes`, база `b15608664f27` + сохранённый diff;
старый B3 stash не менялся. В этом блоке production-код, API и тесты не менялись:
подтверждены накопленные исправления одним полным запуском без ручных повторов.

**Playwright: 189 PASS / 0 FAIL / 2 SKIP, 947.3с, retries=0, workers=1.**
Два SKIP — отдельные opt-in typography A/B для Chromium/Firefox; их прежние
проверки и решение оставить системный шрифт записаны в предыдущем блоке.
Набор смешанный: browser/runtime, HTTP-mock/presentation и parser-проверки.
Успешный набор не является внешней UX/предметной приёмкой или качеством real OCR.

Среда: новая изолированная PostgreSQL/хранилище проекта
`saq-clean-acceptance-20261019`, API8257, dev --webpack localhost3000.
Docker Desktop при старте был выключен; запущен штатным `docker desktop start`.
Предыдущие БД/storage не удалялись, коммерческие/social imports не запускались.
Перед suite `.venv/Scripts/python.exe scripts/verify_ocr.py` PASS: новые RU/KZ
syntheticPNG, по2 PAYMENT_TERM PENDING с bbox, original download byte-identical.

Команда из frontend: `SAQ_ISOLATED_ACCEPTANCE=1`,
`SAQ_E2E_BASE_URL=http://localhost:3000`,
`PLAYWRIGHT_JSON_OUTPUT_FILE=../.local/clean-acceptance-20261019/results.json`,
`npx playwright test --output=../.local/clean-acceptance-20261019/test-results --reporter=list,json`.
Прежний блокер единого clean fullsuite закрыт. Все4 прежних failures прошли здесь,
включая all-versions picker, pending filter и simple drafts/file/mode.
R4 delayed503/GETretry и legacy /review также PASS в этом же запуске.

Новый live маршрут: материал→кандидат→UNKNOWN-досье→анализ→отдельная привязка/
гипотеза→evidence/PENDINGfactor→CONFIRMEDR2→сигнал→отдельное подтверждение→PDF.
Риск25/толькоR2, legalUNKNOWN;10явных POST после setupad, originalbytes/SHA прежние.
Свежий PDF23006байт,3страницы отрендерены и просмотрены целиком: читаемые RU/KZ,
DEMO, оговорка, UNKNOWN, источник/даты/фрагмент/SHA; clipping/overlap не обнаружены.
Новая копия QA evidence/PDF/screenshots: `output/qa/clean-acceptance-20261019/journey/`.

`npm run typecheck`, `lint`, `format:check`, финальный `build` PASS.
Хеши246 файлов frontend/backend/contracts/scripts одинаковы во время QA и после
сборки; fingerprint `8b1f23d917a8a6ceb0307ab17d5d55bd3d413df2be88034020a400e5ef2f0a8a`.
Логи/JSON/manifest: `.local/clean-acceptance-20261019/`.
Полный backend955PASS331.98s относится к предыдущему блоку; сегодня не повторялся.

Следующий шаг: отдельно production/API-приёмка в разрешённой среде и
воспроизводимость на втором чистом ПК; официальный доступ/разрешённый рекламный
источник C-01, независимые RU/KZ/UX3–5/предметные проверки и финальный SHA/CI/сдача
остаются внешними/операционными этапами. Они не закрываются браузерными mocks.
Repository hygiene и git diff --check PASS. Свои dev/API/worker/db процессы
остановлены, новая и прежние БД/storage сохранены. Docker Engine оставлен
работающим; посторонние сервисы не останавливались. Commit/push/deploy не выполнялись.

## Предыдущие проверки · история

Финальные npm run typecheck/lint/format:check/build PASS; repository hygiene и git diff --check PASS. Свои QA/dev процессы остановлены, volumes/storage сохранены; commit/push/deploy не выполнялись.

19.10, финальное уточнение ТЗv2: общий прогон185PASS/4FAIL/2SKIP завершён.
Все4failures исправлены и отдельно повторены: signal-property-picker2PASS18.7s,
ux-flow pending-filter1PASS, simple-interface draft/file1PASS10.8s. Причины:
старые fixtures ожидали all-signals при новом work-default, devlauncher перед
skip-link и fixed count8 после создания новых DEMOдосье. Production для этих
4случаев не менялся; R4productionfix проверен в полном прогоне. Единый новый
fullsuite после последних test-only исправлений НЕ запускался; это точный следующий
шаг на новом isolated seed. Не объявлять общий cleanPASS по сумме повторов.
Команды/логи .local/{v2-signal-picker.log,v2-final-replay.log,v2-simple-replay.log}.

## ТЗv2 ·19.10 · итог локального блока

Codex, ветка codex/audit-workflow-fixes, база b156086 + сохранённый dirty diff;
старый B3 stash не менялся. Входной ТЗ сохранён в docs/SAQ_QURYLYS_UI_UX_TZ_v2_2026-10-19.md.
Master1.5/mounted tabs/API/роли/риск/исторические PDF сохраняются.

Изменено: bare /review начинает с нерешённых действий; явные queue=actions/
processing закрепляют режим, включая reset последнего фильтра. Старые query links
сохраняют processing и выбранный material ID. Lucide18px/stroke1.75 и подписи
всех5зон видимы на mobile, target≥44px. Новых dependencies/lockfile/font runtime нет.

Реальная гонка R4 после CONFIRM исправлена: следующий POST ждёт свежую factor
revision, доступен отдельный GET retry при задержке/503. Причина/evidence/retrykey
сохраняются. Детерминированный R4 delayed503/retry regression PASS12.9s.
2старых URL-import failures воспроизведены и исправлены в fixtures (повторный GET
StrictMode), production cancellation/requestKey корректны:9browser PASS27.2s.
Integrated-layout повтор PASS42.3s; очередь/nav9 PASS, новый nav icons1 PASS.
Первый полный прогон этого блока остановлен после79/191 (78PASS/1R4FAIL),
после исправления запущен новый отдельный fresh seed, без удаления старых QAданных.

Полный финальный fresh-seed browser: 185 PASS / 4 FAIL / 2 SKIP; 983.4s.
2 SKIP — opt-in typography A/B, выполненный отдельно: Chromium47.1s/Firefox33.9s PASS,
18KZглифов×400/500/600/700, лицензия/OFL/cmap/без fallback. Inter увеличил строки
на18.8–19.4%, форму mobile на3.3%; текущий шрифт сохранён по ТЗ0.3/3.2.
Полные парные screenshots/метрики — output/qa/typography-v2-20261019/RESULT.md.

Native Chromium zoom200: outer1440, inner1422→711, DPR1→2,
visualViewport.scale1/CSSzoom1/CDPzoom2;5зон+досье overflow0, controls доступны,
POSTнет. Corrected CDPPNG1422px, measurements/RESULT в output/qa/native-zoom200-v2-20261019.
14 read-only наблюдений7маршрутов375/1440: overflow0, видимого текста<12px нет.
Responsive375/768/1024/1440 и keyboard/focus/reduced-motion — browser regression.
Screen reader/полный WCAGаудит/OSпечать/Firefox nativezoom отдельно не проверялись.

Новый live UX-12: материал→кандидат→новое UNKNOWNдосье→анализ→отдельная привязка/
проверка гипотезы→evidence/PENDINGfactor→CONFIRMEDR2→DRAFTсигнал→CONFIRM→downloadPDF.
Риск25/толькоR2, legalUNKNOWN;10явных POSTпосле setupad, originalbytes/SHA неизменны.
PDF3страницы визуально просмотрены целиком: DEMO, UNKNOWN, источник/даты/SHA читаются.
Артефакты output/qa/tz-v2/journey (после fullsuite могут иметь новый UUID).
Реальный RU/KZ worker OCR на freshQA — verify_ocr.py PASS; syntheticнеholdout.

Финальные static/build команды и остановка QA фиксируются отдельной строкой ниже.
Backend в этом UIблоке не менялся:955PASS331.98s — проверка предыдущего блока.
Результаты нового fullsuite .local/tz-v2-verified/{browser.log,results.json,test-results};
миграции/seed выполнялись на новой PostgreSQL, не на рабочей БД. Commit/push/deploy нет.

Открытые внешние границы: C-01 (официальный доступ/право конкретного рекламного
импорта/recovery), независимый realRU/KZholdout и UX3–5/предметная приёмка,
production/API, второйПК/операционная репетиция и финальныйSHA/CI/сдача.
По запросу тегов Threads/Instagram/TikTok выполнен ограниченный web-indexпоиск,
проверяемых socialpermalinks не найдено, TikTokrobots не обходился; официальный
доступ и источники описаны в FEATURE_THREADS_SEARCH. Посты не импортированы.
P2 dark/Motion/AutoAnimate/новыеcharts не выдаются за выполненные обязательныеUIзадачи.
Следующий шаг — внешние входы/приёмка и отдельная публикация после разрешения;
при наличии FAIL сначала устранить указанные fullsuite сбои.

## Приёмка накопленного маршрута и исправление фильтров ·19.10 · LOCAL PARTIAL

Codex + независимые read-only проверки; ветка codex/audit-workflow-fixes,
база b156086, прежний diff/B3 stash сохранены. Приёмка выявила реальную гонку:
быстрые zone→map строили второй URL из устаревших searchParams и теряли зону.
PropertiesView теперь использует поддержанный Next native history.replaceState
и актуальный location.search; debounce уважает Back/Forward. API не менялся.
Добавлена детерминированная регрессия быстрых действий, текста/города, истории,
reload/reset. Поправлены тестовые exact-label locators textarea, проверки
одинаковых dev StrictMode GET и Tab с launcher Next. Предметные формы/ID сохранены.

Фактические проверки на новой изолированной PostgreSQL/worker:
- `.venv/Scripts/python.exe scripts/verify_ocr.py` PASS: новые RU/KZ PNG,
  по2 PAYMENT_TERM PENDING с bbox, скачанные оригиналы byte-identical.
  CER0.0541 RU/0.1026 KZ на этих2 synthetic изображениях; это не качество real/holdout.
- `SAQ_ISOLATED_ACCEPTANCE=1`, UI dev --webpack localhost3000/API8247:
  первоначальный `npx playwright test --reporter=list,json` остановлен по бюджету
  после97 из186:85 PASS/12 FAIL,89 не выполнены. Полный suite НЕ PASS.
- После правок `npx playwright test tests/audit-workflows.spec.ts
  tests/audit-stabilization.spec.ts tests/dashboard-priority.spec.ts
  tests/design-system.spec.ts tests/dossier-sections.spec.ts
  tests/monitoring-tools.spec.ts --reporter=list,json` —23 PASS129.0s.
  Девять первоначальных failures перепроверены; integrated-layout timeout при
  первом открытии signals и2 open-sources восстановления job остаются открыты.
- Финальный `npm run build` PASS; typecheck/lint/format:check, repository hygiene
  и `git diff --check` PASS. Backend не менялся;
  полный955 PASS331.98s относится к предыдущему завершённому блоку.
- Responsive375/768/1024/1440 и keyboard/roles проверены выбранными browser tests.
  Новый dossier brief375 screenshot визуально просмотрен; screen reader отдельно нет.

Доказательства локальные/ignored: .local/workflow-acceptance-20261019/{browser.log,
initial-failures,targeted.log,targeted-results.json,build.log}; output/qa/ocr-verification.json.
Собственные dev/API/worker/db процессы остановлены. БД/история отдельного
проекта saq-workflow-acceptance-20261019 сохранены.
Документы: UI_AUDIT/PLAN, REQUIREMENTS (F-10), functional audit/remaining checklist,
README/CHANGELOG/UX_GUIDELINES. В исходном аудите F-05=поиск, F-10=создание/связи.

Следующий точный шаг: воспроизвести tests/open-sources.spec.ts:266/311 (missing job
retry и late response/Back) и integrated-layout.spec.ts:6 на изолированной БД;
исправить подтверждённую причину, затем полный актуальный browser suite на свежем
seed. Не считать mock/выбранный прогон общей приёмкой. После — production/API,
второйПК/backup/внешние проверки. C-01 требует разрешённого коммерческого источника;
внешняя RU/KZ/UX/предметная приёмка и финальный SHA/CI/сдача остаются открыты.
Новых commit/push/deploy не было. Запрошенный запас лимита сохранён; новых блоков
в этой сессии не начинаем.

## Коррекция ошибочного LINKED и история ·19.10 · LOCAL VERIFIED

Codex, дополнительное независимое read-only ревью. Ветка codex/audit-workflow-fixes,
база b156086; прежний dirty diff и B3 stash сохранены. По «продолжаем» завершён
следующий отдельный блок: отмена ошибочного LINKED с причиной/confirmation и
последующий link отдельной командой. CREATED не отменяется и не переносится.
Публикации, сравнения, инциденты, правовые основания, факторы/риск и сигналы
остаются самостоятельными; ревизия фактов досье не меняется.

Контракт0.24: POST candidates/{id}/unlink-dossier с текущим property_id, версиями
кандидата/досье, reason/unlink_confirmed. Роль/CSRF/idempotency, candidate→property
locks, проверка текущего LINKED и атомарный аудит. Сохранены before_property_id,
две identity snapshots, наблюдения и previous_link_event_id. GET dossier-history
возвращает Page[AuditEventOut], default20/max100, все страницы candidate-scoped
CREATED/LINKED/UNLINKED независимо от текущего FK. Новая миграция не нужна.
Новые CREATED audit events получают полный provenance; старые записи не меняются.

UI: native details, причина scoped user/session/candidate/property/revision,
checkbox после reload/refresh пустой; pending блокирует поля,409 сохраняет ввод.
History обновляется по ревизии, показывает сохранённые имена/дату/аналитика/причину
и ID fallback старых событий. PropertyHistory получил русские названия действий
и переход к кандидату. При чужом unlink/relink форма пересоздаётся и ждёт точного
target ID; старый reason не переходит в новое решение, включая ABA к тому же ID.

Фактические проверки:
- Полный backend, изолированная PostgreSQL: QA compose exec api `python -m pytest
  -q -p no:cacheprovider` —955 PASS331.98s. Cycle/replay/conflicts, две версии,
  история/пагинация/снимки имён, CREATED, auth/role/CSRF, concurrency/ABA и rollback.
- Dev --webpack + QA API8247/UIlocalhost3000: monitoring-drafts,
  zz-candidate-dossier-live, functional-safety, material-search, signal-queue-views
  —34 PASS(2.5m),32 HTTP mocks +2 live API/browser. Live цикл link→unlink→link
  выполнен тремя явными UI-командами; оба CREATED-origin и публикации сохранены.
  Дополнительный финальный live capture/overflow —1 PASS15.8s.
- Form/history375/768/1024/1440 no page overflow. Form375/1440 и history375/1440
  просмотрены: output/qa/candidate-unlink-live-20261019/{form,history}-{width}.png.
  RU/KZ, native labels/keyboard, viewer, empty/error/conflict/success проверены;
  отдельного screen-reader аудита не было.
- Финальные typecheck/lint/format:check PASS; Ruff check/format --check PASS
  (101 files); repository hygiene/git diff --check PASS; финальный `npm run build`
  PASS. Dev UI остановлен перед сборкой; QA worker/api/db после проверок остановлены.
  Volumes/storage и учебные записи сохранены; рабочий сайт/БД не менялись.

Исправлены два выявленных дефекта до завершения: история оставалась старой после
сохранения (key revision); чужая перепривязка могла кратко соединять новый ID со
старым target snapshot (key relation/revision + ID guard + отдельный draft scope).
Оба защищены регрессиями; возврат назад в тесте ожидает нужный candidate URL.

Пути: backend api/monitoring.py, monitoring_dto.py, test_candidate_unlink.py,
test_contract.py и contract; frontend monitoring-workspace.tsx, property-history.tsx,
monitoring-drafts/live spec; README/CHANGELOG, REQUIREMENTS/ARCHITECTURE, UI docs,
functional audit, ADR-018 дополнен, ADR-019 создан. Новых dependencies/миграций нет.
Master1.5 сохранён. Commit/push/deploy не выполнялись.

Границы: merge, перенос происхождения CREATED и автоматическая коррекция связанных
предметных решений не реализованы. Полный browser suite, production/API, нагрузка
и независимая UX/предметная приёмка OPEN. Следующий шаг — приёмка накопленного
сценария материалов/досье и точный список оставшихся MVP-блокеров, без расширения merge.


## Связь кандидата с существующим досье ·19.10 · LOCAL VERIFIED

Исполнитель Codex, дополнительное read-only ревью без изменений файлов. Ветка
codex/audit-workflow-fixes, база b156086. Предыдущий dirty diff и B3 stash сохранены.
По «окей гооу» реализован следующий отдельный блок: аналитик выбирает досье общим
PropertyPicker, сравнивает две идентичности, вводит причину и явно подтверждает.
Раскрытие/поиск не отправляют команды. Черновик/ID по пользователю/сессии/кандидату
сохраняются; refresh выбранного досье сбрасывает checkbox, оставляя причину.
Во время отправки native fieldset блокирует оба набора полей. Успех даёт ссылку
на связанное досье, а досье — список кандидатов с property_id в URL.

Контракт0.23: linkCandidateDossier POST candidates/{id}/link-dossier, две ревизии,
reason/identity_checked; CandidateOut.property_link_kind, PropertyDetail linked_candidate_count,
GET candidates optional property_id. Миграция ea34f612b805 backfill CREATED,
partial unique источника создания, обычный индекс FK и check согласованности.
Downgrade отказывается при LINKED, сохраняя решения. Несколько кандидатов могут
ссылаться на одно досье; повторная связь/перепривязка/создание после связи запрещены.
source_candidate_id по-прежнему обозначает только CREATED. Count считает LINKED,
отфильтрованный список включает обе связи с явной подписью.

Команда проверяет analyst/CSRF/idempotency, версии и DEMO/город, атомарно пишет
связь и два audit events с идентичностями/версиями/наблюдениями. Ревизия фактов
досье не меняется. Публикации, основания, сравнения, инциденты, риск, сигналы и
уведомления не переносятся и не подтверждаются. Обоснование — ADR-018.

Проверки UI: dev --webpack + изолированный QA API8247/UIlocalhost3000,
отдельные DB volume/storage, внешние интеграции выключены. Playwright
monitoring-drafts, zz-candidate-dossier-live, functional-safety, material-search,
signal-queue-views —30 PASS(1.7m), из них28 HTTP mocks и2 реальных API/browser.
Live проверены создание и связь с сохранённым CREATED-origin, неизменной ревизией
досье и отдельными публикациями. Связь/причина после409/refresh/reload, новая
версия в команде, блокировка ввода при pending, viewer и обратный фильтр проверены.
Первый новый test исправлен: дождаться возврата к кандидату перед reload;
повторно смонтированное textarea проверять по доступной роли, а не по полному
textContent implicit label. Production/API не повторялся после прежнего auto-review.

Полный backend: QA Compose exec api `python -m pytest -q -p no:cacheprovider` —
945 PASS,293.79s. Включены миграции с backfill/check/partial unique и отказом
downgrade, auth/CSRF, версии, concurrency, rollback и контракт. Финальная
production-сборка `npm run build` PASS; typecheck/lint/format:check PASS;
Ruff check/format --check PASS(100 files), repository hygiene/git diff --check PASS.
Dev UI остановлен перед сборкой; после проверок QA worker/api/db остановлены,
volumes/storage и учебные записи сохранены. Рабочая БД/публичный сайт не менялись.

375/768/1024/1440 no page overflow. Live снимки375/1440 просмотрены:
output/qa/candidate-link-live-20261019/form-{width}.png. Native labels/forms/checkbox,
keyboard disclosure и RU/KZ переносы сохранены; screen reader отдельно не проверялся.

Пути: backend api/monitoring.py, api/properties.py, models/dto/monitoring_dto,
новая migration, tests/test_candidate_links.py/test_candidate_link_migration.py,
test_contract.py; frontend monitoring-workspace/workspace, monitoring.css,
types/monitoring-types, functional-safety.fixture, monitoring-drafts и live spec.
Обновлены contract, README/CHANGELOG, REQUIREMENTS/ARCHITECTURE, все тематические
UI docs, functional audit, ADR-017 дополнен и ADR-018 создан. Master1.5 прежний.
Новых зависимостей нет. Commit/push/deploy не выполнялись.

Ограничения: исправление ошибочной связи/unlink/relink/merge не реализованы.
Нормализованное равенство города не объединяет RU/KZ варианты автоматически.
Нагрузка, полный browser suite, production/API и внешняя приёмка OPEN.
Следующий шаг: независимая приёмка накопленного пути материалов/досье, затем
отдельное решение о безопасной коррекции ошибочной идентификации.


## F-10 · сквозная DEMO-проверка и исправления UI ·19.10

Codex; независимое read-only ревью без изменений файлов. Ветка
codex/audit-workflow-fixes, база b156086; накопленный diff и B3 stash сохранены.
Доведение предыдущего блока: исправлены поиск дублей по исходному имени кандидата
(автодобавленная очередь не ограничивает поиск) и ложная подпись «DEMO» при
отсутствии БИН. Форма досье использует существующую monitoring-fields: две колонки
от768px, одна ниже; обязательные поля пояснены. API0.22/master1.5 сохранены.

Реальный изолированный QA: saq-review-pdf-20261019, отдельные DB volume/storage,
API8247/UI localhost3000, внешние интеграции выключены. Dev Turbopack повторно
перезагружал страницу и не завершил login; dev с документированным --webpack
стабильно выполнил сценарии. Production start с API_INTERNAL_URL не повторялся.

Playwright: `SAQ_ISOLATED_ACCEPTANCE=1 SAQ_E2E_BASE_URL=http://localhost:3000`
и tests/functional-safety.spec.ts, monitoring-drafts.spec.ts,
zz-candidate-dossier-live.spec.ts, zz-material-search-live.spec.ts —
23 PASS (1.4m):21 HTTP-mock regression +2 live API/browser, без подмены ответов
в live-сценариях. Новый gated test создаёт только DEMO-материал/кандидата.
Полный backend: QA compose exec api `python -m pytest -q -p no:cacheprovider` —
934 PASS,273.43s; случайная test schema, миграции до head и очистка только этой
схемы. Финальные npm run build/typecheck/lint/format:check PASS. Repository hygiene
и git diff --check PASS. Полный browser suite этим продолжением не запускался.
Проверены Enter на summary без POST, восстановление формы, новое досье UNKNOWN,
provenance/обратный переход, отсутствие автоматического match и отдельное
подтверждение привязки через UI после анализа. Поиск/выбор объекта использует
общий серверный PropertyPicker. Поля/причины/выбранные ID и deep links сохранены.

Live форма и досье:375/768/1024/1440 без page overflow; снимки формы375/1440 и
досье375/1440 просмотрены. output/qa/candidate-dossier-live-20261019.
Длинные RU/KZ названия переносятся; input сохраняет полное значение.
Нагрузки, отдельного screen-reader аудита и внешней приёмки не было.

Файлы текущего продолжения: frontend/components/monitoring-workspace.tsx,
workspace.tsx; tests/monitoring-drafts.spec.ts, functional-safety.spec.ts,
новый zz-candidate-dossier-live.spec.ts; README/CHANGELOG, UI docs и ADR-017.
Тематические документы уточняют поиск дублей и границы DEMO/UNKNOWN; нового
архитектурного решения или зависимости нет. Commit/push/deploy не выполнялись.
Dev UI остановлен перед production-сборкой; QA worker/api/db остановлены после
проверок. Volumes/storage и созданные учебные записи сохранены. Рабочие DB/storage
и публичный сайт не использовались. Нерешённый production/API acceptance сохраняется.
Следующий функциональный блок: явная связь кандидата с существующим досье;
merge, исправление ошибочной идентичности и история остаются отдельными задачами.


## Досье из кандидата ·19.10 · LOCAL VERIFIED

Исполнитель: один Codex. Ветка codex/audit-workflow-fixes, база b156086;
предыдущий dirty diff и B3 stash@{0} сохранены. Реализован следующий F-10:
аналитик раскрывает форму кандидата, проверяет дубли, вводит объект/застройщика
и причину, явно подтверждает проверку и создаёт досье. Черновик scoped по
пользователю/сессии/кандидату; checkbox после reload требует нового подтверждения.
Раскрытие не отправляет команд. После успеха доступны переходы кандидат ↔ досье.

Контракт0.22: POST /api/v1/monitoring/candidates/{id}/dossier, CandidateOut.property_id,
PropertyDetail.source_candidate_id. Миграция d92e6a14f301 добавляет nullable unique FK.
Роль/CSRF/revision/idempotency, транзакция, защита точных нормализованных дублей,
консервативное переиспользование застройщика и audit происхождения. Город/DEMO
наследуются; PHASE с UNKNOWN стадией/правовым статусом. Публикации, факторы,
сигналы и уведомления команда не изменяет. Обоснование/ограничения — ADR-017.

Файлы блока: backend app/api/monitoring.py, api/properties.py, models.py, dto.py,
monitoring_dto.py; новая Alembic migration; tests/test_monitoring.py и test_contract.py;
frontend components/monitoring-workspace.tsx, workspace.tsx, lib/types.ts,
monitoring-types.ts и tests/monitoring-drafts.spec.ts; contracts/openapi.yaml.
Обновлены README/CHANGELOG, REQUIREMENTS/ARCHITECTURE, UI_AUDIT/PLAN/COMPONENTS,
UX_GUIDELINES/DESIGN_SYSTEM и функциональный аудит.

Фактические проверки:
- Изолированная PostgreSQL: `pytest -q -p no:cacheprovider tests/test_monitoring.py
  tests/test_contract.py tests/test_review_queue.py` — 92 PASS,46.38s. Миграции до
  head применены в случайной test schema; создание, provenance, replay, конкуренция,
  DEMO/REAL, конфликт БИН, роль/CSRF и rollback при injected audit failure проверены.
- Production3195 HTTP-mock Playwright: monitoring-drafts/material-search/
  signal-queue-views/functional-safety — 25 PASS,27.8s; analyst-composition —
  8 PASS,14.5s. Это проверка реального UI с подменёнными HTTP ответами.
- npm run build/typecheck/lint/format:check PASS; Ruff check и format --check backend
  PASS (97 files); repository hygiene и git diff --check PASS.
- Новая форма:375/768/1024/1440 без page overflow; скриншоты375/1440 просмотрены.
  Артефакты output/qa/candidate-dossier-20261019/form-{width}.png (локальные).
  Labels/native checkbox/details, viewer restrictions и восстановление RU/KZ ввода
  проверены автоматически; отдельного screen-reader аудита не было.
- Первые прогоны исправили ожидания тестов: PropertyDetail содержит вложенный
  property; отсутствующий CSRF header даёт422, неверный токен403; авария аудита
  превращается middleware в HTTP500. Финальный прогон полностью зелёный.

Ограничения: полный suite и интегрированный live browser/API smoke не выполнены.
Ранее auto-review заблокировал запуск frontend с API_INTERNAL_URL; обход не выполнялся.
Внешней UX/предметной приёмки нет. Создание не реализует merge/связь кандидата
с существующим объектом, исправление идентичности или автоматическую иерархию.
Нормализованный exact duplicate check не распознаёт все варианты адресов;
общий lock/чтение списка объектов и застройщиков требуют проверки до масштаба.
QA production3195 и контейнеры api/db остановлены после проверки; volumes/storage сохранены.
Следующий точный шаг: разрешённый интегрированный DEMO smoke «кандидат → новое
досье → отдельная привязка публикации», затем отдельный сценарий существующего
объекта/исправления идентификации. Commit/push/deploy не выполнялись.

## Область материалов / виды сигналов ·19.10 · LOCAL VERIFIED

Один Codex, база b156086/codex/audit-workflow-fixes, предыдущий dirty diff сохранён.
Закрыты ограниченные блоки: F-06 серверный DEMO/REAL режим библиотеки публикаций
и очереди обработки (optional is_demo, контракт0.21); F-07 начальный вид актуальных
DRAFT и явные кнопки всех/устаревших версий через прежние state/is_stale.
Выбранный signal_id, причины и старые deep links сохраняются. Выбор строки из
начального вида переносит его фильтры в URL. Переключение очередей материалов
сохраняет q/is_demo/ID/черновик. Новых команд, миграций, зависимостей нет.

Фактические проверки финального кода: изолированная PostgreSQL,
pytest tests/test_review_queue.py tests/test_contract.py -q -p no:cacheprovider:
52 PASS31.39s. Production3195: playwright material-search, signal-queue-views,
functional-safety, analyst-composition, monitoring-drafts — 32 PASS36.6s.
Браузер использовал HTTP mocks, не реальный API. npm build/typecheck/lint/
format:check PASS; Ruff check PASS. Начальный EBUSY сборки устранён остановкой
собственного старого production-процесса, повторная сборка успешна.
375/768/1024/1440 no page overflow автоматизировано; signals375/1440 просмотрены
визуально. Артефакты output/qa/queue-views-20261019 и material-search-20261019.
Новый контрактный тест сверяет is_demo с runtime OpenAPI. Тестовые гонки исправлены:
ожидание URL после select и отделение queue GET от dashboard summary GET.

Обновлены UI_AUDIT/PLAN/COMPONENTS/UX/DESIGN_SYSTEM, REQUIREMENTS/ARCHITECTURE,
README/CHANGELOG и functional audit. F-06 остаётся частичным: чистого нового
DEMO-сценария нет; F-07 не группирует последнюю версию каждого объекта.
Полный suite, live browser/API smoke, screen reader и независимая приёмка открыты.
На момент этого предыдущего блока создание объекта ещё не было реализовано;
актуальное продолжение описано в верхней записи статуса.
Commit/push/deploy не выполнялись. Рабочая история и прежний B3 stash сохранены.

Лимит: в предыдущем заходе не удалось сохранить запрошенные5–7% (последний ответ
usage tool был100% used). После явного «продолжи работу» текущий tool показал4%
used. Продолжение завершает начатый блок, не расходует весь новый остаток.


## Поиск материалов ·19.10.2026 · LOCAL VERIFIED / integration OPEN

Исполнитель: один Codex. База b156086/codex/audit-workflow-fixes; предыдущий
незакоммиченный F-02 сохранён. Пользователь «гоу» разрешил следующий отдельный
поисковый блок. Контракт0.20.0-mvp добавляет optional q≤300 в GET advertisements
и advertisements/review-queue. Регистронезависимая буквальная подстрока по
original_text/source_label; trim, пустой q игнорируется, %/_/backslash экранированы.
SQL-предикат до counts/action_totals/pagination, прежний порядок и фильтры.
OCR/гипотезы/URL/внешние источники в этот поиск не входят; миграций нет.

MaterialSearch объединяет native search form в библиотеке и двух очередях.
Enter/кнопка → URL q и первая страница; выбранные advertisement_id/extraction_id,
фильтры и черновик сохраняются. Очередь обработки теперь также передаёт уже
существующие property_id/from/to из URL в GET. Пустые результаты предлагают
изменить/сбросить запрос; ошибка допускает повтор. Новых бизнес-команд нет.
CSS использует прежние tokens, компактную форму без унаследованных отступов.
Master1.5, роли/риск/подтверждения/исторические снимки прежние.

Фактические проверки:
- Изолированный QA saq-review-pdf-20261019, текущие backend/contracts bind-mounted,
  PostgreSQL random test schema: pytest tests/test_review_queue.py tests/test_contract.py
  -q -p no:cacheprovider — 51 PASS34.36s. Включает7 новых search cases и contract test.
- Production localhost:3195: material-search.spec.ts — 4 PASS5.7s (финальный код).
  Ещё27 functional-safety/analyst-composition/monitoring-drafts прошли в выбранном
  прогоне. Полный browser/backend suite не запускался.
- npm run build/typecheck/lint/format:check, Ruff check/format, git diff --check
  и python scripts/check_repository_hygiene.py — PASS.
- 375/768/1024/1440: no page overflow в обоих видах очереди;375/1440 визуально
  просмотрены. Label/Enter/reset/error/retry, точный материал/версия/причина после
  reload, pagination и возврат из публикации проверены. Снимки:
  output/qa/material-search-20261019. Screen reader/внешняя приёмка не проводились.

Начальные тестовые ошибки исправлены: контрольная строка тоже содержала %;
alert Next.js требовал scoped locator; retry scenario теперь ждёт ответ именно
нового q, а не ошибку прежнего запроса. Новый live smoke zz-material-search-live
подготовлен, но gated SKIP: автоматическая проверка отклонила production start
с API_INTERNAL_URL тестового API — «blocked by policy», без подробностей.
Обход не выполнялся. Связка browser→live API этим блоком НЕ подтверждена.
Для QA потребовались --env-file .env и установка уже закреплённых requirements-dev
в отдельном API-контейнере; рабочая БД/источники не затронуты.

Пути: backend/app/api/advertisements.py, tests/test_review_queue.py/test_contract.py,
contracts/openapi.yaml; frontend material-search/review-queue/analysis-workspace/
workspace, design-system.css и новые material-search/zz-material-search-live tests.
Обновлены README/CHANGELOG, REQUIREMENTS/ARCHITECTURE и тематические UI docs/audit.
Новых зависимостей/ADR нет: расширено существующее SQL/URL-представление.
Открыто: live smoke, поиск OCR (отдельная семантика версий), нагрузочная проверка
на больших наборах, создание полноценного объекта и разделение архива/текущей
работы. Следующий блок — создание объекта из проверенного кандидата с отдельным
явным действием и сохранением происхождения; сначала сверить существующий контракт
и правила подтверждения. Push/deploy/commit не выполнялись.
После проверки собственный production3195 и QA api/db остановлены; volumes,
storage и снимки сохранены. Финальные lint/typecheck/format/Ruff/hygiene и
git diff --check повторно PASS после добавления live smoke и документации.


## F-02 · черновики сверки ·19.10.2026 · LOCAL VERIFIED / HTTP MOCK

Исполнитель: один Codex. Восстановлен контекст двух последних чатов «Составить
UX-аудит SAQ QURYLYS» и «Составить промпт для редизайна». Актуальная база —
`b156086`, `codex/audit-workflow-fixes`: B3, вкладки, согласованная композиция,
F-01/F-03 и F-08/F-09 уже присутствуют. Старые 15 локальных файлов B3 на
`codex/dossier-sections` сохранены вместе с untracked в `stash@{0}` с меткой
`B3 dossier-sections verified 2026-10-19 preserved before workflow continuation`.
Этот stash не применять поверх актуальной ветки без отдельного сравнения.

В monitoring-workspace.tsx сохранены публикация/причина сверки и состояние/причины
решения по инциденту с привязкой к пользователю, вкладке и точному субъекту.
DEMO-версия восстанавливается отдельно для кандидата; недоступная публикация
не подменяется. Общий useReviewDraft обеспечивает срок восстановления 12 часов,
очистку на logout/401 и fallback памяти. Fingerprint/ключ явного повтора команды
переживает reload, payload не сохраняется. Успех очищает соответствующий ввод,
ошибка сохраняет его. Команды используют актуальную серверную ревизию.
Небольшой статус у формы использует прежние компоненты/токены. API0.19/master1.5,
права, источники, риск, снимки и отдельные подтверждения сохранены.

Проверки на финальном коде: `npm run build`, `npm run typecheck`, `npm run lint`,
`npm run format:check` PASS. Production на localhost:3195:
`npx playwright test tests/monitoring-drafts.spec.ts tests/functional-safety.spec.ts tests/analyst-composition.spec.ts`
дал 26 PASS/1 FAIL: новый тест не раскрывал native details перед выбором версии.
После исправления сценария весь `tests/monitoring-drafts.spec.ts` — 8 PASS (9.6s);
итого все 27 выбранных сценариев прошли, остальные 19 не изменялись.
Новые проверки: reload, tabs/Back/кандидаты, изоляция пользователя/logout, viewer,
503/retry и стабильность ключа, 409/новая ревизия, исчезнувшая публикация,
ошибка storage и выбор версии до кандидата; навигация без POST.
Все API-ответы здесь синтетические: live backend/полный E2E/внешняя приёмка
в этом блоке не запускались. Ранее приведённые backend914 и live проверки — история.
375/768/1024/1440: автоматическая проверка page overflow PASS; снимки375/1440
просмотрены визуально, RU/KZ ввод/notice/формы доступны. Артефакты:
`output/qa/monitoring-drafts-20261019`. Новые тесты — monitoring-drafts.spec.ts.

Документы: UI_IMPLEMENTATION_PLAN/UI_AUDIT/UX_GUIDELINES/UI_COMPONENTS,
DESIGN_SYSTEM, functional audit, README/CHANGELOG. Новый ADR не требуется:
расширен существующий механизм без новой архитектуры/зависимостей.
Остаются: сохранение после reload форм создания кандидата/версии и поиска Threads;
поиск текста публикаций/очереди, создание полноценного объекта, разделение архива
и текущей работы, независимая приёмка. Следующий отдельный блок — серверный поиск
материалов с общим query/filter/page URL и сохранением точного материала/черновика.
Рабочая БД и внешние источники не использовались; commit/push/deploy не выполнялись.
`git diff --check` и `python scripts/check_repository_hygiene.py` PASS;
собственные dev/production QA-процессы остановлены, файлы и данные сохранены.


## F-08/F-09 · понятные задачи и PDF ·19.10.2026 · LOCAL VERIFIED

База ee6605e, codex/audit-workflow-fixes, на входе clean. Пользователь разрешил
продолжить и запустить нужные сервисы. Root: F-08/frontend/контракт/runtime;
агент: F-09 backend filenames/tests, затем независимый read-only review.
F-08: optional nullable r2_reviews.property_name точного target ID, один batch
SELECT по именам. Исторические ID/evidence/команды/draft scope/counts/порядок
прежние. UI явно показывает текущее реестровое имя и прежний объект; UUID
доступен вторым уровнем/fallback. STAGE переведён только при отображении,
сохранённый код и редактор прежние. Контракт0.19.0-mvp, master1.5.
F-09: PDF name включает тип, название, дату записи, полный ID и v/r сигнала.
Unicode/ASCII Content-Disposition и безопасный клиентский parser. Имя сигнала
только frozen snapshot; исходные/готовые PDF не переписываются. Неизвестный MIME
имеет нейтральную подпись с пояснением оригинала/копии. Риск/роли/решения прежние.

Проверки: полный Linux backend914 PASS239.49s; focused PDF38 PASS9.42s.
Selected frontend37 PASS/2 gated SKIP1.2m; затем оба live-сценария и настоящий
PDF3 PASS15.5s на явно изолированном стенде. Live проверяет анализ, явные решения,
перепривязку и отдельное отклонение прежнего R2. Production13 новых parser/
presentation tests PASS5.9s. Build/TypeScript/ESLint/Prettier/Ruff PASS.
Два R2-варианта на375/768/1024/1440 без page overflow;375/1440 просмотрены
визуально. Unicode/fallback/MIME/signature/error/retry, GET без бизнес-команд,
точные target/evidence и сохранность причин проверены. Полный browser suite и
внешняя приёмка не выполнялись. Снимки: output/qa/review-pdf-20261019;
реальный PDF — output/qa/tabs-pdf-20261018/property-report.pdf.

Docker Desktop запущен. QA saq-review-pdf-20261019: отдельный DB volume и
.local/review-pdf-20261019/storage, API8247/UI3000, внешние интеграции выключены.
Рабочие DB/storage не использовались. Полный pytest сначала не собрался из-за
отсутствующего mount scripts; QA-конфигурация исправлена, финальный run чистый.
Ruff readonly-cache заменён host Ruff. QA процессы остановлены; volumes/storage
сохранены. Туннель не запускался. Автозапущенные Docker worker рабочего стенда
и посторонний PostgreSQL остановлены перед QA, без удаления данных; рабочая
БД оставалась остановленной.

Основные пути: review_queue.py/analysis_dto.py/pdf_filenames.py/document_exports.py,
api/exports.py/signal_pdf.py; review-queue.tsx/analysis-workspace.tsx/pdf-download.tsx,
presentation.ts/types.ts, contract и связанные tests/docs. Команды: QA Compose
exec api python -m pytest -q -p no:cacheprovider; Playwright review-language-pdf,
review-queue, zz-review-queue-live, dossier-tabs, supporting-pdf, analyst-composition,
functional-safety (для двух live: SAQ_ISOLATED_ACCEPTANCE=1 на localhost).
npm run build/typecheck/lint/format:check; host Ruff check/format; repository
hygiene и git diff --check PASS. Конфигурация QA — локальный ignored
.local/review-pdf-20261019/acceptance.compose.json; в Git secrets не добавлены.

Автопроверка отклонила production start с адресом тестового API: только
«blocked by policy», без подробной причины. Повторного обхода нет: обычный
production start использован с полным HTTP-mock; реальная связка проверена на dev.
Отклонён также длинный shell-скрипт обновления docs; ограниченные изменения
документации внесены структурированным apply_patch. Это ограничения исполнения,
не провал сборки. Публикации/push/merge/туннеля нет.

Следующий шаг: F-02 — черновики сверки; затем независимая UX/предметная приёмка,
C-01 и второй ПК. Новый ADR не требуется: расширено существующее представление
и скачивание без новой архитектуры. Полная готовность проекта не заявляется.

## Согласованная композиция приложения ·19.10.2026 · LOCAL VERIFIED / PRESENTATION

Пользователь «окок» согласовал три макета. База a473941, ветка
codex/audit-workflow-fixes, на входе clean. Исполнитель Codex; отдельный
read-only review указал на focus скрытого дубля реестра и зависимые селекторы.
Перенесена композиция в реальные компоненты, без новой библиотеки/зависимостей.
Обзор: компактные независимые очереди и общая рабочая очередь сразу под ними,
3/5 объектов в кратком/подробном виде, прежний серверный порядок. Реестр: таблица
в обоих видах на desktop, полные карточки на телефоне в кратком виде; все шесть
столбцов и коды доступны. Длинные адреса переносятся; широкий набор прокручивается
в TableRegion. Возврат фокусирует видимую ссылку. Досье: подчёркнутые вкладки,
сгруппированные сведения, точное следующее действие первым в ходе проверки;
на узком экране эта панель предшествует сведениям. Sidebar — существующий
deep-green token с контрастным текстом/focus. Master1.5, API0.18 без изменений.

Код: workspace.tsx/design-system.css/use-registry-context.ts. Новый
analyst-composition.spec.ts (8 сценариев); обновлены presentation-селекторы
simple-interface/dashboard-priority и изоляция смены fixture-сессии в
functional-safety. Проверки: npm run build/typecheck/lint/format:check PASS.
git diff --check и scripts/check_repository_hygiene.py PASS.
Playwright analyst-composition + functional-safety: dev18 PASS31.6s до последнего
плотного кейса; финальная production-сборка19 PASS20.4s. Матрица двух режимов ×
трёх экранов ×375/768/1024/1440:24 скриншота без page overflow, клавиатура
Home/End, сохранение URL/q/page/map и visible focus; error/retry/empty, viewer,
все R1–R6 в плотной строке, прежние черновики/401/409/success. Составной сценарий
только читает mock API, без POST; прежние тесты отправляют команды только fixture.
Скриншоты output/qa/analyst-composition-20261019 просмотрены визуально, включая
исправленные переносы и отсутствие наложения риска/ссылки на375px.

Это frontend с синтетическими HTTP-ответами, не проверка рабочей БД/OCR/PDF.
Docker engine в этой сессии недоступен; полный прежний backend/browser suite
и внешняя приёмка не запускались. Первые проверки выявили ошибочный селектор
скриншота, dev StrictMode read-count и гонку при смене синтетической сессии;
исправлены тестовые предпосылки. Визуально найденные наложение и широкая строка
исправлены в CSS и покрыты assertions. Исторические CI ниже не новый результат.

Обновлены README/CHANGELOG/REQUIREMENTS, DESIGN_SYSTEM/UX_GUIDELINES,
UI_COMPONENTS/UI_AUDIT/UI_IMPLEMENTATION_PLAN, описание приоритета/макетов и
функциональный аудит. Нового ADR нет: архитектура/контракт/риск/auth/снимки/данные
прежние. Только локальный commit; push/deploy/публичный runtime не затрагивались.
Следующий шаг: F-08/09 — понятные исторические задачи и назначение PDF; затем
оставшаяся сохранность сверки F-02 и независимая UX/предметная приёмка.
Поиск материалов/новый CRUD/C-01/второй ПК остаются открытыми.

## Функциональный блок A и три макета ·19.10.2026 · LOCAL VERIFIED

Пользователь «окей гоу» согласовал начало исправлений. Один Codex; база1b6b4af,
codex/audit-workflow-fixes, на входе clean. F-01: новый материал использует
существующий useReviewDraft, user/session/TTL12h; legacy saq-ad-draft не
восстанавливается и очищается на logout/401. F-02 частично: причина SignalCard
привязана к signal_id, сохраняется на переходах/reload/409, очищается после
success; часть monitoring остаётся OPEN. F-03: DossierProgress открывает точный
pending-документ или R1/R3–R6 с focus, в том числе без публикаций; R2 прежний.

Код: workspace.tsx/signals-workspace.tsx/use-review-draft.ts; новые
functional-safety.fixture.ts/spec.ts.11 self-contained presentation tests:
dev13.8s PASS, production build9.9s PASS. Пять редакторов×четыре ширины без
page overflow, focus/keyboard target; legacy/logout/401, Storage fallback,
перерывы/версии/409/success и viewer. API ответы синтетические: рабочая БД,
бизнес-команды, OCR/PDF и внешние уведомления не затрагивались. Первый прогон
9PASS/2FAIL исправлен ожиданием URL commit перед Back; первый lint выявил одну
неиспользуемую test variable, исправлено. TypeScript/build/lint/format PASS.
Прежний полный backend/browser suite и внешняя приёмка заново не выполнялись.

[Макет трёх экранов](../prototypes/README.md): отдельный standalone HTML,
проектные tokens, DEMO, без API. Браузер375/768/1024/1440:12 наблюдений,
исправлен первоначальный overflow таблицы обзора; поиск/переходы/стрелки
вкладок и имитация решения проверены. Композиция ещё не перенесена в приложение.
Локальный просмотр: http://127.0.0.1:8137/prototype; файл открывается и без сервера.
Preview helper: node .local/functional-safety-20261019/preview.mjs, только
loopback/один HTML, без API. Изображения: output/qa/functional-safety-20261019.

Документация: README/CHANGELOG/UX_GUIDELINES/UI_AUDIT/UI_IMPLEMENTATION_PLAN,
функциональный аудит и prototypes/README. Master1.4/API0.18/auth/риск/снимки/
данные прежние; новых dependencies/ADR нет. Repository hygiene/diff check PASS.
Только локальный commit, без
push/deploy. Следующий шаг: согласование макетов, затем presentation-блок и
F-08/09; F-02 monitoring, поиск материалов, C-01 и внешние приёмки остаются OPEN.

## Аудит функционала ·19.10.2026 · LOCAL AUDIT / NO APP CHANGES

Пользователь попросил оценить функционал и продумать его удобство. Исполнитель:
один Codex, база849f04b, codex/audit-workflow-fixes, на входе clean. Подготовлен
[аудит 18 групп функций и 14 замечаний](../audits/SAQ_QURYLYS_FUNCTIONAL_AUDIT_2026-10-19.md).
Прочитаны актуальные UI/API/контракт, черновики и тесты; на рабочем HTTPS
прочитаны обзор/добавление/очередь/DEMO-review/сигнал/досье/сверка/источники.
Бизнес-команды, загрузки, генерация PDF, решения и внешние уведомления не запускались.

Новые CODE-находки: общий saq-ad-draft не очищается на logout/401 и не содержит
user/session; причина SignalCard в useState теряется при размонтировании/reload;
DossierProgress не учитывает код pending-фактора при выборе следующего действия.
Переключение аккаунтов и записывающие регрессии на рабочей БД не выполнялись.
Также подтверждены отсутствие q в рекламе/review-queue и create/update объекта
в текущем контракте. Кандидат сверки — доступный предварительный путь, не Property.

Предложены короткие исправления сохранности/навигации, затем единый рабочий
сценарий и макеты по референсам. Расширения требуют отдельного решения/контракта;
C-01, внешний holdout/предметная/UX-приёмка и второй ПК остаются OPEN.
Изменены только этот статус, UI_IMPLEMENTATION_PLAN и новый аудит; код/данные/
master/runtime прежние. Проверки PASS: ссылки/существование опор в коде,
Prettier нового документа и git diff --check. Новый функциональный прогон не запускался,
893backend/130browser ниже — историческая проверка опубликованного блока18.10.
Следующий шаг: согласованный короткий блок сохранности/точных переходов и локальные
макеты трёх экранов; масштабный рефакторинг и публикация в аудит не входят.

## Референсы сложных интерфейсов ·19.10.2026 · LOCAL RESEARCH

Пользователь предложил взять Kompra основой и найти готовые продукты с большим
числом функций. Исполнитель: один Codex; база f5c6387, ветка
codex/audit-workflow-fixes, на входе clean. Подготовлено [исследование реальных
продуктов](../audits/SAQ_QURYLYS_PRODUCT_REFERENCES_2026-10-19.md): публичная
карточка Kompra и переход «История изменений» наблюдались в браузере; Linear —
официальный экран и docs; Контур.Фокус/Sentry — официальные описания.
Закрытые кабинеты не реконструировались, демо Фокуса не загрузилось.

Рекомендована единая композиция на основе Kompra с рабочими очередями Linear;
пять зон/шесть вкладок уже существуют. Новые схемы обзора/реестра/досье и приоритет
до защиты — PROPOSED, не выполненное изменение UI. Изменены только новый документ,
UI_IMPLEMENTATION_PLAN и этот статус; runtime/API/риск/данные/master прежние,
push/deploy не выполнялись. Проверки PASS: git diff --check, три новые локальные
ссылки и Prettier нового документа. Историческое форматирование статуса/плана сохранено.
Функциональные тесты для исследовательских Markdown не запускались.

Следующий шаг: подготовить локальные макеты трёх экранов для визуального
согласования; широкий рефакторинг до согласования не начинать. Дальнейшие
UX-14/15, чистый DEMO/независимая приёмка и C-01/holdout/второйПК остаются OPEN.
Статус опубликованной версии и выполненные проверки ниже остаются историей
предыдущего блока, а не доказательством приёмки новых предложений.

## Все изменения опубликованы ·18.10.2026 · HTTPS VERIFIED / GITHUB PUBLISHED

Финальная проверка кода e690378: push CI
[39146844077](https://github.com/temirkhanerbolatovich-coder/saq-qurylys/actions/runs/39146844077)
success во всех3jobs: backend893PASS217.19s, browser130PASS3.8m, frontend checks/
build/audit PASS;74tooling tests выполнены. [PR №4](https://github.com/temirkhanerbolatovich-coder/saq-qurylys/pull/4)
создан и прикреплён к чату; его CI39146897325 также имеет success во всех3jobs.
Последующее изменение фиксирует только результаты в Markdown, без runtime/tests/
контракта/данных; повторное функциональное тестирование для этой записи не нужно.
Заключительный docs commit отправляется в ту же ветку, main без merge.

Разрешение пользователя: «опубликуй все изменения». Один Codex; ветка
codex/audit-workflow-fixes, main aefb72f не объединялся. Все исходные14локальных
коммитов до875e288 отправлены в GitHub, затем2f40242/4b8a665 исправили только
CI test fixtures/ожидания. Runtime app/backend/contracts/data с875e288 идентичны.
Новая публикация не означает закрытие UX10/5/5, C-01 или внешней приёмки.

Рабочий сайт: https://voice-cultures-brandon-independence.trycloudflare.com .
Туннель contacted-string-quiz-kinda был остановлен; штатный share_site.ps1 Start
создал новый и применил к API правильный HTTPS Origin/Secure cookie.
На входе db/api/frontend были остановлены; запущена прежняя DB, volumes/хранилище
сохранены. Перед установкой backup create/verify PASS:
.local/backups/20261018T163635Z-9b3940c63f384e0196f0b92e3a34b6c8,
restore .local/restore-checks/20261018T163742Z-f85441f9bf254c92bf3a437402236233/result.json.
Рабочая БД из backup не восстанавливалась и не заменялась QA schema.

Build api/worker/frontend PASS, runtime images:
saq-qurylys-api:publish-875e288 (api/worker),
saq-qurylys-frontend:publish-875e288. Установка прежними compose/dev/tunnel +
private candidate override, up -d --no-build --no-deps --wait api worker frontend.
После health/invariants проверки новые images также назначены стандартным
saq-qurylys-api/worker/frontend:latest; rollback-before-875e288 tags прежних image
IDs сохранены. Env file hash/DB container+image/mounts прежние; новых migration нет.

До auth smoke fingerprints24таблиц полностью совпали с backup;555Assets сохранены.
После auth smoke23таблицы совпали, только sessions изменены тестовыми входами
(один ранний helper завершился до logout); бизнес-данные/audit/сигналы не менялись.
Чужие сессии не удалялись. Fresh HTTPS Chromium public-smoke.cjs:
11страниц×375/768/1024/1440=44наблюдения, overflow/pageerrors/businesswrites0;
anonymous401/login200/Secure cookie/wrong Origin403/logout204 PASS.
6tabs dossier/4monitoring, mobile Escape/focus/draft, GREEN+UNKNOWN, readable
snapshot chooser, server search/work_priority/structure/signal q PASS.
Original Asset SHA и historical READY PDF SHA совпали с backup;3read-only PDF
properties/assets/signals21308/19477/25381bytes, PDF MIME/signature PASS.
Первый smoke helper ожидал tbody в кратком карточном виде; locator helper исправлен,
новый44PASS. Приложение ради этой проверки не менялось.

Локальная валидация runtime875e288 до публикации:130browser PASS3.9m,
build/typecheck/lint/format PASS. CI39145832806 выявил890backend PASS/3FAIL и
128browser PASS/2FAIL: global status count включал чужие записи, chooser зависел
от прошлых кандидатов/версий, reload выполнялся до URL reset. Исправлены тестовые
предусловия/ожидания; runtime неизменён. После test-only fixes4tests×3=12PASS36.3s,
backend signal/signals/PDF/exports/contract57PASS/1Windows Pango SKIP52.92s;
Ruff test check/format PASS, frontend typecheck/lint/format повторно PASS перед push.
Run4b8a665 дополнительно выявил формат длинной строки нового ожидания; Prettier
исправлен до текущей публикации. Итоговые зелёные CI/PR результаты указаны выше;
промежуточные красные проверки сохранены в GitHub и не считаются успешными.

Source publication preflight: ancestor/remote SHA, git diff --check, history
262new blobs на входе/274после исправлений prohibited paths/known-private-literals/token patterns PASS;
repository hygiene PASS. Secrets/env/DB/storage/images/logs в Git не отправляются.
Private evidence .local/publish-all-20261018 (preflight,before,build,apply,
pre/post-tunnel/post-smoke-invariants,public-smoke,GitHub logs); PNG
output/qa/publish-all-20261018. Docs README/CHANGELOG/DEPLOYMENT/UI_AUDIT/
сверка/этот статус обновлены, старые local-only записи ниже исторические.
Публикация завершена: исходники/документация в PR, runtime на HTTPS, код проверен,
backup/rollback сохранены. Main merge отдельно не выполняется. Следующая разработка — UX-14/15,
clean DEMO/независимая приёмка; source C-01/holdout/второйПК остаются OPEN.

## Публикация всех изменений ·18.10.2026 · IN PROGRESS

Уточнение после первого чистого CI39145832806:890backend PASS/3FAIL и128browser
PASS/2FAIL. Chooser precondition уже исправлен2f40242. Backend status-search
ожидал глобально ровно1совпадение, хотя другие тесты сохраняют сигналы с тем же
статусом; проверка теперь ограничена property_id своей fixture. Browser reset
перезагружал страницу до завершения router.replace, поэтому проверка теперь
дожидается q/city=null в URL. Runtime code/API/scoring не менялись. Повторённые
4новыеbrowser tests×3 →12PASS/36.3s. Ruff test check/format PASS; backend focused
и новый чистый CI проверяются перед окончательным отчётом публикации.

Пользователь явно разрешил «опубликуй все изменения»: GitHub source и обновление
рабочего сайта. Ветка codex/audit-workflow-fixes на входе875e288, clean;
origin/main aefb72f является ancestor.14локальных коммитов/95изменённых путей
отправлены отдельной веткой, remote SHA875e288 подтверждён. Main не объединялся.
Preflight:262новых history blobs, prohibited-path/known-private-literal/token
patterns PASS; source hygiene/diff PASS. Значения приватной конфигурации не выводились.

Рабочие db/api/frontend и tunnel были остановлены; worker работал. Запущена
прежняя DB без замены volume. Создана копия
.local/backups/20261018T163635Z-9b3940c63f384e0196f0b92e3a34b6c8;
backup create/verify PASS, отдельный restore report
.local/restore-checks/20261018T163742Z-f85441f9bf254c92bf3a437402236233/result.json.
Candidate API/worker/frontend images publish-875e288 собраны, rollback-before-875e288
tags сохранены; установка/HTTPS smoke ещё впереди. Env/storage/DB не подменялись.

При подготовке чистого CI обнаружена зависимость chooser test от кандидата/
версии предыдущих monitoring tests, которых нет в seed. Test теперь создаёт
собственного DEMO-кандидата существующим API и использует полный typed snapshot
presentation fixture; listener команд начинается после setup. Никакого сравнения/
изменения риска при выборе не выполняется. Связанные4tests PASS14.8s на QA;
typecheck/lint PASS. Runtime source не менялся. Чистый GitHub CI ещё выполняется.
Следующий шаг: установить candidate services с прежними mounts/БД, восстановить
HTTPS helper, проверить public read-only UI/API/PDF и fingerprints; завершить
docs, отправить final commit и создать PR без автоматического merge.

## Сверка ТЗ и стабилизация UI ·18.10.2026 · LOCAL VERIFIED / NOT DEPLOYED

Пользователь «гоу гоу», Codex root, один исполнитель; codex/audit-workflow-fixes,
базаa3afdf0, clean на входе. Новых агентских задач не создавалось.
Разрешён локальный commit; запрет push/publish/deploy сохраняется.

Завершён ограниченный frontend-блок UX-07/09/12/17:
- PropertyRisk/propertyRiskContext добавляет рядом с GREEN точный статус
  основания (UNKNOWN/PENDING/REJECTED); Zone/число/server calculation прежние.
  Registry/cards/dashboard/dossier/selected map и marker accessible name.
- GlobalSearch≤639px: native44px toggle, aria-expanded/controls, opening focus,
  Escape preventDefault сохраняет draft/возвращает focus, Enter ведёт в registry.
  Одна mounted форма, desktop visible. Compact shell/досье сохраняет статусы/
  юридическую оговорку/DEMO/полные вкладки; first fold360/768 ещё частичен.
- Snapshot chooser: native select/page10, label/город/дата, выбранная полнота/
  охват/истечение, cached metadata/ID вне страницы и при error/retry; UUID
  перенесён в details. Выбор не выполняет compare; REAL+DEMO запрет прежний.
  Reload по-прежнему сбрасывает snapshot/reason, manual ID не загружает metadata.
  Shared LoadState retry теперь type=button, без случайного submit формы.
- Registry q+city: общий debounce350ms, Enter/reset/URL/page/view/focus сохранены.
  Город остаётся точным текстовым фильтром, combobox не добавлялся.

Файлы: frontend workspace/monitoring-workspace/property-map/presentation/
design-system.css; новый tests/audit-stabilization.spec.ts. Backend/контракт0.18/
auth/бизнес-данные/риск/исторические снимки не менялись; dependencies/ADR нет.
Master1.4 и native controls/существующие UI primitives сохранены.
Docs: README/CHANGELOG, REQUIREMENTS, DESIGN_SYSTEM/UX_GUIDELINES/UI_COMPONENTS,
UI_IMPLEMENTATION_PLAN/UI_AUDIT/REMAINING_CHECKLIST и
[полная сверка ТЗ/20 замечаний](../audits/SAQ_QURYLYS_UI_UX_RECONCILIATION_2026-10-18.md).
Итог backlog:10 технически устранены,5 частично,5 open/deferred, не процент
готовности MVP. Исходный аудит860e033 сохранён исторически. Kompra documented
patterns отделены от недоступного приватного UI; новых private screens не изучали.

Фактические проверки на финальной сборке:
- node .local/tabs-pdf-20261018/build.cjs → npm run build PASS.
- npm run typecheck; npm run lint; npm run format:check → PASS.
- node .local/tabs-pdf-20261018/test.cjs tests/audit-stabilization.spec.ts
  tests/audit-workflows.spec.ts tests/monitoring.spec.ts tests/redesign.spec.ts
  tests/workspace.spec.ts →22PASS/41.4s.
- node .local/tabs-pdf-20261018/run.cjs full →130PASS/3.9m, workers1/retries0;
  API/worker/Linux OCR/PDF/review/historical R2, roles, draft/tab/URL regression.
  Лог audit-stabilization-full.log; related audit-stabilization-targeted.log.
- Новый chooser101 использует presentation response fixture; реальный compare
  отдельно покрыт monitoring.spec.ts. Fresh14real dossier observations:
  2вида×360/375/390/768/1024/1440/1920, overflow/errors/businessPOST0,
  reduced-motion. Ещё2real picker captures390/1440, те же нули. PNG просмотрены
  390/768/1440 dossier и390/1440 picker. artifacts output/qa/audit-stabilization-20261018.
- node .local/tabs-pdf-20261018/audit-stabilization-zoom.cjs → actual browser200%,
  getZoom2/DPR2/innerWidth720,6вкладок scrollWidth720. Full-page capture обрезал
  raster; локальный снимок viewport, измерения DOM до capture. Не CSS zoom.
- .venv/Scripts/python.exe scripts/check_repository_hygiene.py → PASS.
  .venv/Scripts/python.exe .local/tabs-pdf-20261018/validate-audit-stabilization.py
  →17source files PASS: strict UTF8/added local links/private literals (без вывода
  значений). git diff --check PASS, self-review scope/semantics/error paths PASS.

Первый related run19PASS/3FAIL: native Escape clearing; getByLabel locator с
option text (accessible combobox существует); mobile summary927px. Исправлены
preventDefault/role locator/spacing. Промежуточный3PASS/1FAIL875px; затем22PASS
и full130PASS. Нет переписывания факторов/удаления QA данных для прохождения.
Backend этим блоком не менялся и заново не прогонялся (предыдущийa3afdf0:
57PASS/1Windows native Pango PDF SKIP). Полный security/load/screen-reader audit,
независимые UX/предметная/внешний holdout и второйПК не выполнены этим блоком.

Runtime прежний: localpreview3227, QA API8227/PostgreSQL57667,
image saq-signal-search-api:local-20261018, QA project saq-tabs-pdf-20261018.
Config .local/tabs-pdf-20261018/signal-search-final.compose.json и отдельная
qa_signal_search_* schema/storage сохранены. Старая qa_search_* и прежние volumes
не удалялись, публичные images/tunnel не заменялись; frontend preview пересобран.
Все private configs/logs/captures ignored; credentials не включаются в commit.

Открытые границы: mobile fold360/768; UX-14/15 PDF labels/names, clean DEMO
UX-20; реальные hierarchy UX-04; понимание GREEN UX-07; reload выбора/reason
UX-12; SQL-scale UX-16; hidden reads UX-18/change summary UX-19.
Обязательные C-01/качество OCR/внешняя UX/предметная/второйПК/сдача не закрыты.
Следующий точный шаг: закончить UX-14/15 на имеющихся MIME/record metadata,
затем отдельный читаемый DEMO-набор и независимая репетиция основного сценария.
Для C-01 сначала требуется конкретный разрешённый рекламный источник; live
import до установления источника/разрешения не выполнять. Новую публикацию
делать только после отдельного разрешения пользователя.

## Поиск всей очереди сигналов ·18.10.2026 · LOCAL VERIFIED / NOT DEPLOYED

Пользователь «гоу», Codex root, один исполнитель; codex/audit-workflow-fixes,
база0bd2dfd, clean на входе. Новые агентские задачи не создавались.
Разрешён локальный блок/commit; запрет push/publish/deploy сохранён.

UX-06: optional q≤300 в существующем GET signals (контракт0.18.0-mvp).
SQL literal case-insensitive substring в current/frozen Property.name, signalUUID,
метке версии и state code/RU label; %,_,backslash literal, trim. Query/state/
property_id до signal_view, is_stale до pagination. Default ordering created_at DESC/
ID, роли/auth/response прежние. Поиск не читает произвольный JSON, PDF/evidence,
не создаёт и не переписывает snapshots/решения/риск/audit.

UI: native form label «Поиск по всем сигналам», запуск Button/Enter вместо client
фильтра25. q/page/filters в URL, submit сбрасывает page и фиксирует текущий
signal_id; pagination сохраняет выбранный снимок. Reload/Back восстанавливают q.
Pending/error/empty не подменяются прежней очередью и не закрывают выбранный
historical snapshot. Reset прежним сценарием очищает q/filters/page/selection
и фокусирует selector объекта. Draft ввода до submit локален; counts DRAFT/stale
подписаны текущей страницей, total всей server выборкой. Scoped form padding0/
input margin0 и targets≥44px; существующие tokens/Button/LoadState/Pagination.
Нет новых routes/DTO/dependencies/migrations/seed правок/архитектурного слоя/ADR.

Файлы: backend api/signals,test_signal_search,test_contract; contracts/openapi.yaml;
frontend signals-workspace,design-system.css,signal-search/ux-flow tests.
Docs: FEATURE_SIGNAL_SEARCH,README,CHANGELOG,REQUIREMENTS,ARCHITECTURE,
DESIGN_SYSTEM,UX_GUIDELINES,UI_COMPONENTS,UI_IMPLEMENTATION_PLAN,UI_AUDIT/этот статус.

Проверки: .venv python .local/tabs-pdf-20261018/signal-search-backend-tests.py →
**57PASS/1SKIP/46.80s** (search/signals/signalPDF/document exports/contract,
собственная случайная test schema QA PostgreSQL).30версий, ID вне25, current/frozen
RU/KZ/trim/case, literal%_backslash/SQL/JSON/length422, status/version, filters/stale/
total/pages/auth/viewer/unchanged snapshot/decisions/audit. Native Pango PDF skip
на Windows не считается Linux PDF-приёмкой; реальная генерация есть в browser suite.
Полная backend suite/нагрузка не повторялись. Ruff check/format94files PASS.
npm run build/typecheck/lint/format:check PASS. Первый browser10PASS/1FAIL показал
40px вместо44px у новой кнопки; scoped min-height44 исправлен. После пересборки
связанные11tests PASS34.1s. Первый full125PASS/1FAIL4.0m: исторический R2 test
отказал до действий, потому что в накопленной QA не осталось seed-объекта без R2.
Факторы не удалялись/не перезаписывались. Отдельная qa_signal_search_* schema и
новый acceptance_signal_search_storage подготовлены для чистого финального прогона;
прежняя qa_search_* и все исходные schema/storage сохранены. Уточнена подпись
пустой страницы с total>0, added regression; финальная сборка/typecheck/lint/format
PASS. Окончательный full на новой схеме **126PASS/3.6m**, workers1/retries0,
на финальной сборке с empty-page refinement. Реальный Linux OCR/PDF/review сохранён.
Матрица14наблюдений повторена в этом full, overflow/errors/businesscommands0.
Финальные diff/hygiene/UTF8/local-links/private-literal scan PASS.

Операционные ограничения: на входе daemon Docker и localpreview оказались
остановлены. Desktop запущен, image saq-signal-search-api:local-20261018 собран;
QA DB сначала не стартовала из-за Windows excluded ports55663–55762. Только QA
host mapping перенесён55667→57667; container db5432, volume/данные/qa_search_*
schema/storage/credentials сохранены. API8227 и preview3227 прежние. Конфиг
.local/tabs-pdf-20261018/signal-search-final.compose.json; имя схемы — ignored
signal-search-final-schema.txt. Public images/tunnel не заменены,
host exclusions не менялись, старые QA namespace/storage не удалялись.
Первый helper указал отсутствующий test_record_pdf.py: тесты не запускались;
исправлен на существующий test_document_exports.py. Попытка до запуска DB дала
7PASS/1SKIP/50setup errors подключения; после восстановления пройдены57 выше.
При чтении конфигурации один приватный QA compose ошибочно попал в технический
вывод инструмента; пользователь уведомлён. Конфиги/credentials не включаются в Git.

Fresh responsive14наблюдений реального ID-search:2режима×360/375/390/768/1024/
1440/1920, actual mode проверен, overflow/pageerror/businesscommands0, reduced-motion,
button≥44px. Вручную просмотреныform crops detailed1440/simple390 и2полных кадра;
остальные snapshots — автоматическая матрица. Presentation51 отдельно проверяет
страницу3/query/selected/error/pending/retry/Back/reload/reset/noPOST, не заявляется
реальной51записью проекта. Новые200%zoom/secondPC/независимая UX/предметная/масштабная
приёмка не выполнялись. Логи signal-search-backend-tests.log,signal-search-targeted.log,
signal-search-full.log,signal-search-exhausted-full.log,signal-search-db-unavailable.log
и captures output/qa/signal-search-20261018 ignored.

Открыто: UX-16 прежний stale/view all-match/N+1 в памяти, panel history100,
historical-R2 fixture требует fresh QA после повторных full и не должна
перезаписывать существующие факторы ради предусловия,
подтверждённое наполнение parent_id и независимая приёмка. Следующий этап —
финальная сверка оставшегося audit backlog с исходным ТЗ и стабилизация MVP к21октября:
отдельно обязательные blockers, качество демонстрационного наполнения и deferred
SQL-scale. Не выдавать технические regression за юридическую/пользовательскую приёмку.
Перед локальным commit — self-review/актуальные проверки и итог full, база0bd2dfd.

## Приоритет всего реестра ·18.10.2026 · LOCAL VERIFIED / NOT DEPLOYED

Пользователь «гоу», Codex root, один исполнитель; codex/audit-workflow-fixes,
базаbd78bba, clean на входе. Новые агентские задачи не создавались.
Разрешён локальный блок и commit; запрет push/publish/deploy сохранён.

UX-03: существующий GET properties принимает order=name(default)|work_priority,
контракт0.17.0-mvp. Все filtered current PropertyOut сортируются до pagination:
PENDING → UNKNOWN/REJECTED → остальные; затем NULL last_reviewed_at first,
более давняя дата, server score DESC, UUID ASC. Эффективный legal status берётся
из существующего server view; не raw status и не risk.as_of вместо даты проверки.
Default name/ID, фильтры/q/total/страницы, роли/auth и response schema прежние.
Dashboard получает5, simple показывает3 из этой выдачи; comparePropertyWork и
client order удалены. propertyNextAction оставляет только UI label.
Ошибка priority list имеет LoadState alert/retry, не false empty; другие очереди
доступны. При визуальном просмотре устранено сжатие mobile пояснения: scoped
priority-action≤639px grid, балл/ссылка в строке1, текст полной шириной в строке2.
Формула риска/решения/снимки/данные/seed не менялись. Нет новых endpoints/DTO,
dependency/migration/слоя; новый ADR не нужен. UX-16 остаётся: прежние all-view
расчёт/N+1 и сортировка в памяти не являются SQL-scale или нагрузочной приёмкой.

Файлы: backend app/api/properties.py,test_property_priority/test_contract;
contracts/openapi.yaml; frontend workspace,property-priority,design-system.css,
dashboard-priority/redesign/simple-interface/ux-stabilization tests.
Docs: FEATURE_PROPERTY_PRIORITY,README,CHANGELOG,REQUIREMENTS,ARCHITECTURE,
DESIGN_SYSTEM,UX_GUIDELINES,UI_COMPONENTS,UI_IMPLEMENTATION_PLAN,UI_AUDIT и этот статус.

Проверки: .venv python .local/tabs-pdf-20261018/priority-backend-tests.py →
**57PASS/50.62s** (priority/structure/search/dashboard/contract/API, своя случайная
test schema QA PostgreSQL).101filler перед важными записями, группировка по
действию, NULL/date/score/ID, стабильные страницы, filters/effective legal status,
unchanged detail/viewer/auth; live/manual order parameter полностью совпадает.
Ruff check/format backend PASS93files. npm run build/typecheck/lint/format:check PASS.
Browser related21PASS46.7s; full124PASS4.0m (workers1/retries0, реальный Linux QA
OCR/PDF/review); после mobile CSS и нового width regression final6PASS22.6s
(dashboard-priority/integrated-layout). Полный backend suite не повторялся:
серверный блок read-only ordering покрыт focused57 и полным браузерным regression.
Новый полный browser suite после только scoped mobile CSS не повторялся;
фактическая финальная сборка проверена6связанными tests/матрицей.
Git diff/hygiene/UTF8/local-links/private-literal scan PASS; это не security-аудит.

Responsive14наблюдений настоящего обзора:2режима×360/375/390/768/1024/1440/1920,
reduced-motion, overflow/pageerror/business commands0. После CSS матрица повторена;
пояснение mobile измеренно занимает≥90% action region. Вручную просмотрены4финальных
panel screenshots simple/detailed×390/1440. Synthetic205/error fixtures отдельно
проверяют UI trust/order/retry/empty, не объявляются реальными объектами проекта.
Большой server set — транзакционные synthetic PostgreSQL rows, не наполненный стенд.
Новые200%zoom/secondPC/независимая UX/предметная/нагрузочная приёмка не выполнялись.

Preview http://localhost:3227. Изменён только изолированный QA saq-tabs-pdf-20261018
API8227/DB55667, api/worker image saq-priority-api:local-20261018, конфиг
.local/tabs-pdf-20261018/priority.compose.json. Сохранены qa_search_* schema/storage
и прежние QA public schema/storage/credentials; public containers/tunnel не заменены.
Логи priority-backend-tests.log,priority-targeted.log,priority-full.log,
priority-final-targeted.log и captures output/qa/dashboard-priority-20261018 ignored.

Блокеров данного блока нет. OPEN: UX-06 серверный поиск сигналов, UX-16 SQL-scale,
подтверждённое наполнение parent_id и независимая приёмка. Точный следующий связный
блок — заменить поиск текущих25сигналов на серверный поиск по всему разрешённому
набору с контрактом/URL/page/error-state; сохранить frozen snapshots и роли.
Перед локальным commit — self-review и проверки выше, ревизия базыbd78bba.

## Навигация ЖК/очередей/корпусов ·18.10.2026 · LOCAL VERIFIED / NOT DEPLOYED

Пользователь «гоу», Codex root, один исполнитель; ветка codex/audit-workflow-fixes,
база9e7f195, Git clean на входе. Новые агентские задачи не создавались.
Граница: локальный код/QA/коммит, без push/publish/deploy и изменения публичных служб.

UX-04: GET properties/{id}/structure (контракт0.16.0-mvp) возвращает только
сохранённые parent_id relationships: bounded ancestors и независимые SQL pages
детей/соседей. Корни без parent не получают выдуманных siblings;103 ребёнка
не ограничены первыми100. В досье — уровень, цепочка ссылок и native disclosure;
Link сохраняет registry context, новое досье открывает «Обзор», Back/reload работают.
Ссылки DEMO отмечены отдельно. Риск/правовые основания/документы не наследуются.
Ошибка/retry связей отдельно от доступного досье; cycle/depth guards409.
Миграций/dependencies/редактора структуры/seed-правок нет; auth/роли/решения и
исторические snapshots прежние. Pages/disclosure локальны досье, после reload
начинаются сначала. Нового ADR нет: расширен существующий read-only API/primitives.

Файлы: backend app/api/properties.py,dto.py; test_property_structure/test_contract;
frontend PropertyStructure,workspace,types,presentation,design-system.css;
browser structure/fixture/responsive tests; контракт и актуальные docs.
Документация: FEATURE_PROPERTY_STRUCTURE,README,CHANGELOG,REQUIREMENTS,
ARCHITECTURE,DESIGN_SYSTEM,UX_GUIDELINES,UI_COMPONENTS,UI_IMPLEMENTATION_PLAN,UI_AUDIT.

Проверки: .venv python .local/tabs-pdf-20261018/structure-backend-tests.py →
**52PASS/43.90s** (structure/search/dashboard/contract/API, своя случайная test
schema в QA DB); Ruff check/format backend →PASS92files. Первый49PASS/1FAIL
исправлен в fixture: фиксирован last_reviewed_at, чтобы существующий динамический
risk.as_of не нарушал сравнение неизменности. Продуктовая формула не менялась.
Frontend npm run lint/format:check/typecheck и production build →PASS.
Typecheck после build повторён последовательно из-за временной гонки .next/types
при одновременном запуске; финальный прогон чистый. Browser targeted3PASS10.7s,
full119PASS3.8m (workers1/retries0), затем после semantic h2 refinement и
упрощения page handler новые4tests PASS21.4s на финальной сборке.
Полная backend suite заново не запускалась:52focused плюс полный browser
regression покрывают данный read-only блок. Git diff/hygiene/UTF8/local-links/
private-literal scan PASS; это не независимый security аудит.

Responsive:28presentation наблюдений2экрана×2режима×7размеров360/375/390/768/
1024/1440/1920 и4настоящего досье(2режима×390/1440). Overflow/pageerror/business
commands0, reduced-motion/native keyboard/ссылки≥44px. Вручную просмотрены4итоговых
снимка, остальное автоматическая матрица. Новых200%zoom/secondPC/UX с аналитиком/
нагрузочной приёмки не было. Полная структура — synthetic PostgreSQL transactions
и явно browser presentation fixture: текущие8seed parent_id=null,level=PHASE,
их данные не дополнялись предположениями из названий. Реальное наполнение OPEN.

Локальный просмотр http://localhost:3227. Только QA saq-tabs-pdf-20261018
API8227/DB55667 переведён на saq-structure-api:local-20261018; конфиг
.local/tabs-pdf-20261018/structure.compose.json. Сохранены прежняя qa_search_*
schema, storage, credentials и исходные QA public schema/storage. Публичные
контейнеры/tunnel не заменены. Логи structure-backend-tests.log,structure-full.log,
structure-targeted.log; screenshots output/qa/property-structure-20261018 ignored.

Блокеры данного блока: нет. Открыто: подтверждённое наполнение parent_id,
UX-03 глобальная приоритизация,UX-06 server signal q,UX-16 SQL-scale и внешняя
приёмка. Точный следующий связный блок — UX-03: заменить priority top5 из первых100
на серверную приоритизацию всего разрешённого набора с явным контрактом; сохранить
UNKNOWN/роли/исторические snapshots, локальную границу и текущую рабочую навигацию.
Перед локальным commit — self-review/проверки выше; ревизия базы9e7f195.

## Поиск реестра и выбор объекта сигнала · 18.10.2026 · LOCAL VERIFIED / NOT DEPLOYED

Продолжение согласованного аудита, пользователь «продолжи работу». Codex root,
один исполнитель, ветка codex/audit-workflow-fixes отcd10b84; на входе Git clean.
Сохранён запрет push/publish/deploy. Не создавались новые агентские задачи.

UX-02: существующий server q ищет literal case-insensitive substring по имени,
адресу, отдельным aliases, Developer.name/bin. Коррелированные EXISTS сохраняют
одну строку объекта; спецсимволы escaped, фильтры/order/pages прежние. Пустой q
в dashboard нормализован, не исключает публикации без привязки. Контракт0.15.0-mvp
явно фиксирует новые semantics q на properties и dashboard; маршруты/схемы прежние.

UX-05: общий PropertyPicker(mode=filter), page_size25 по всему разрешённому
реестру, выбранныйID вне search page/error/empty и после reload/Back. Match mode
сохраняет required isDemo и прежнюю отдельную human-привязку. Names текущих
сигналов вне initial100 дочитываются по ID с dedup/abort/cache/error/retry;
первоначальная страница100 больше не ограничивает выбор или названия очереди.
Server risk/роли/auth/решения/snapshot/миграции/dependencies не менялись.

Проверки: focused backend search/dashboard/API/contract **40PASS/40.42s**
(своя случайная schema существующей изолированной QA DB). Ruff check/format91files
PASS; frontend lint/typecheck/format:check/build PASS. Targeted browser13PASS,
первый full **115PASS/3.6m** до финального blank-q уточнения; окончательный full
на пересобранном runtime **115PASS/3.8m**. Retries0/workers1. Не запускалась вся
backend suite: серверное изменение ограничено read-only q; полный browser suite
проверяет прежний реальный Linux OCR/PDF/review, а новые backend tests — поиск.
Последующий full114PASS/1FAIL: historical-R2 test исчерпал свободные DEMO-объекты
без R2 после повторных прогонов; отказ предусловия до UI. Существующие факторы
не перезаписывались: подготовлены отдельная случайная schema/новый storage для
чистого финального набора. Это не исправление или обход продуктовых guards.
Чистый full112PASS/3FAIL дополнительно выявил зависимости старых audit/document
tests от ранее созданных candidate/signal/evidence. Теперь первые2теста создают
собственные записи через API, archive presentation явно задаёт evidence reference
без серверной команды. Повтор затронутых7PASS/14.5s. Эти правки только в tests.
Historical-R2 fixture после многих запусков всё ещё требует свежего QA namespace;
перезаписывать существующий фактор для её подготовки запрещено.
Финальные git diff --check, repository hygiene и changed-file UTF8/local-links/
private-literal scan PASS. Наблюдения и результаты не являются независимой
security/предметной приёмкой.

Fresh36наблюдений3экрана(registry search/signals filter/review picker)×2фактических
режима×6размеров360/390/768/1024/1440/1920: overflow/errors/business commands0.
Вручную просмотрены registry1440,signal picker1440/390,match picker390. Исправлены
унаследованные padding/margin только внутри picker; capture matrix повторена.
Внешняя UX-приёмка/secondPC/новый200%zoom/масштабная нагрузка не выполнялись.
101-й объект — browser presentation fixture, реальный server developer search
и PostgreSQL alias/BIN/special-character cases проверены отдельно. Имя-retry
также проверено503fixture. Новый общий поиск сигналов не добавлен (UX-06).

Локальный preview3227, изолированный QA saq-tabs-pdf-20261018 API8227/DB55667.
QA api/worker image saq-search-api:local-20261018, конфиг
.local/tabs-pdf-20261018/search-final.compose.json; отдельная qa_search_* schema
и новый acceptance_search_storage. Прежние QA schema/storage и credentials
сохранены, секреты не печатались. Working public services/tunnel не заменены.
Логи search-backend-tests.log/search-full.log и captures
output/qa/search-picker-20261018; helpers/private env ignored.

Docs: README/CHANGELOG/REQUIREMENTS/ARCHITECTURE/DESIGN_SYSTEM/UX_GUIDELINES/
UI_COMPONENTS/UI_IMPLEMENTATION_PLAN/UI_AUDIT, контракт. Нового ADR нет:
расширен существующий read-only query и переиспользован picker без нового слоя.
Открыто: UX-03 global priority,UX-04 связи очередей,UX-06 server signal q,
UX-16 масштабная SQL-оптимизация и внешняя приёмка. Следующий связный UI-блок —
явная навигация между реальными parent/phase/building, затем global priority
с отдельным измеримым контрактом. Официальный freeze21октября остаётся OPEN.
Ревизия проверки cd10b84+diff; окончательный local SHA — git log -1 этой ветки.

## Первый блок исправлений аудита · 18.10.2026 · LOCAL VERIFIED / NOT DEPLOYED

Пользователь согласовал начало исправлений после полного UI/UX-аудита.
Codex root, один исполнитель; ветка codex/audit-workflow-fixes от860e033.
На входе только untracked docs/audits из предыдущего задания; они сохранены.
Новых parallel agent tasks не создавалось. Работа и commit только локальные;
публичная установка/тunnel/рабочие Docker services не заменялись.

Сделано: фильтры/карта в обоих видах; общая mounted disclosure обеих очередей
при выбранном материале; компактные KPI с пояснениями по запросу; компактная
карта/мобильные filters; прямые source/registry tool transitions с раскрытием
после commit вкладки и возвратом к кандидату; analysis action в шапке материала;
ясные signal PDF actions и MIME-aware label источника в материале.
Изменены frontend components/CSS и presentation/types;
сервер/контракт/риск/роли/версии/зависимости не менялись. Новый ADR не требуется:
использованы прежние native controls, маршруты и semantic master1.4.

Проверки: npm run lint/typecheck/format:check PASS; production build через
node .local/tabs-pdf-20261018/build.cjs PASS. Финальный npm run test:e2e:
**113PASS/3.4m**, workers1/retries0. Первичный targeted25PASS/2FAIL,
затем related8PASS; ранний full прерван после68PASS/4FAIL на старых раскрытиях в review-workspace.
Исправлены общие test helpers/ожидания новой очереди. Журнал первого full сохранён
отдельно; никаких retry для скрытия отказов.

Свежая матрица108наблюдений9экранов×2вида×6размеров360/390/768/1024/1440/1920:
overflow/errors/business writes0, reduced-motion. Тайлы заменены presentation
подложкой, координаты/score из реального API. Вручную просмотрены5репрезентативных
экранов (map/dashboard/review/material1440,registry390). MapTop646–651px,
selected originalTop750–754px на1440×900. Не новый200%zoom/внешняя UX-приёмка.
Новый signal PDF labels test — fixture, реальный PDF download и OCR входят в suite.
Backend suite заново не запускалась; backend исходники не изменены.
Repository hygiene, git diff --check и changed-file UTF8/local-links/private-literal
scan PASS. Результаты сканов относятся к этому diff, не независимой security-приёмке.

Документация: README/CHANGELOG, DESIGN_SYSTEM/UX_GUIDELINES/UI_COMPONENTS/
UI_IMPLEMENTATION_PLAN/UI_AUDIT, исходные два отчёта docs/audits.
Точные closure/partial/open — UI_AUDIT; все20пунктов не объявляются закрытыми.
Остаются: server search/priority, связи очередей, paged signal picker, дальнейшая
mobile shell/повторная проверка/независимый аналитик и freeze21октября.
Следующий связный блок: paged signal property picker через существующий API,
затем отдельно согласованный server search/priority contract.

Текущий preview http://localhost:3227, прежний изолированный backend8227/DB55667,
credentials только .local/tabs-pdf-20261018/credentials.txt. Ревизия проверок:
860e033 плюс diff этого блока, конечный локальный SHA определяется git log -1
ветки codex/audit-workflow-fixes. Push/PR/merge/deploy не выполнялись.
Ниже — история предыдущих блоков, а не актуальная структура до/после.

## Вкладки и PDF по новому ТЗ · 18.10.2026 · LOCAL VERIFIED / NOT DEPLOYED

Codex root, один исполнитель. Ветка `codex/dossier-tabs-pdf`, база `1b47cc6`.
Пользователь разрешил реализацию настоящих вкладок и минимального backend PDF;
push/publish/deploy запрещены. Публичная установка остаётся на `e2dfefd`.

В коде: шесть mounted панелей досье и четыре мониторинга, одна видима; URL section,
клавиатура/legacy hash, компактное состояние, поиск/фильтр/пагинация документов,
списки публикаций/сигналов. Read-only PDF с exact original/frozen signal и
производными копиями, контракт0.14.0-mvp, ADR-016/FEATURE_RECORD_PDF.

Финальный full browser **109PASS/3.2m**, workers1/retries0. Frontend typecheck,
lint, format:check, production build PASS. Backend full820PASS/18Windows skips
до завершающего PDF provenance/layout, после него focused export+contract13PASS.
Ruff check/format90files PASS, repository hygiene/changed-file UTF8/local links/
private-literal scan PASS. Начальные100PASS/8FAIL и последующие focused отказы
задокументированы в UI_AUDIT; исправлены focus timing, history race и select label.

Реальные PDF:15видов (open-registry exact в APItests);16HTTP smoke downloads
включая исходный PDF byte-for-byte и изображение, плюс40DEMO-записей/18страниц.
Poppler visual samples и glyph bounds17PDF/90страниц — без выхода за страницу. Новый
текст→анализ→human hypothesis/match/evidence/R2→CONFIRMED signalv7→PDF39338bytes
проверен отдельно; R1 не подтверждён. PDF экспорт не меняет снимок/риски/источники.

Responsive375/768/1024/1440, RU/KZ, keyboard, legacylinks, reload/Back/Forward,
черновики/файлы/возврат в реестр PASS. Настоящий Chromium zoom200%:1440→720CSSpx,
DPR1→2, пять панелей overflow0. Дополнительные17captures: pageerrors/writes/overflow0.
Внешняя UX/предметная приёмка и проверка на втором компьютере не выполнены.

Стенд `saq-tabs-pdf-20261018`: loopback frontend3227/API8227/DB55667,
собственные volumes/image `saq-tabs-pdf-api:local-20261018`, внешние collectors off.
Прежний host preview3207 остановлен ради Windows build lock; рабочий Docker
frontend и данные не менялись. Secrets/helpers/logs только ignored
`.local/tabs-pdf-20261018`; артефакты `output/qa/tabs-pdf-20261018`.

Документация: DESIGN_SYSTEM/UX_GUIDELINES/UI_COMPONENTS/UI_AUDIT/PLAN/REQUIREMENTS,
README/CHANGELOG, FEATURE_RECORD_PDF и ADR-016. Ниже сохраняется история предыдущей
сессии; preview3207 больше не является текущим. Ревизия проверки: база1b47cc6 плюс
изменения этого локального блока. Код/контракт/проверки зафиксированы в локальном
`cd32183` (feat: add stateful dossier tabs and read-only PDF downloads).
Эта запись SHA оформлена отдельным documentation-only commit. Доступ к QA preview
сохранён в ignored `.local/tabs-pdf-20261018/credentials.txt`; secrets не в Git.
Следующий шаг: пользовательская приёмка на localhost3227, затем отдельно
согласованный freeze/publish. Push/PR/merge/deploy не выполнялись.

## Локальная доработка UI после аудита · 18.10.2026

**IMPLEMENTED / LOCAL VERIFIED / NOT DEPLOYED.** Пользователь разрешил
доработку при сохранении локально. Codex root, один исполнитель, ветка
codex/ui-stabilization-20261018, база b24531b. Входной diff предыдущего аудита
в PROJECT_STATUS/UI_AUDIT сохранён. Рабочий сайт остаётся на e2dfefd.

Сделано: native disclosure документов с видимыми номером/датой/статусом/областью/
периодом и mounted решениями; переход к ожидающему документу и document hash;
PropertyPicker с q/name/address, server pagination25 и DEMO/REAL filter; сохранение
выбранного ID вне страницы/при ошибке/reload; keyboard focus после поиска и
pagination; точный city filter; восстановление query/page/view/scroll/focus/marker
при возврате из досье; порядок обзора по доступному действию/давности, затем score.
Это порядок внутри загруженных100, без выдуманной срочности или глобального sort.
Backend/API/contracts/риск/роли/модели/миграции/dependencies не изменены.

Проверки: frontend typecheck/lint/format:check/build PASS; Node tests2PASS;
npm audit --audit-level=high:0vulnerabilities. Целевой набор26PASS; исправленный
возврат4повтора PASS. Финальный полный npm run test:e2e: **107passed/2.9m**,
workers1/retries0. Backend ../.venv/Scripts/python.exe -X utf8 -m pytest -q -rs:
**810passed/18skipped/329.07s** на Windows, собственной случайной schema отдельной
QA БД; skips — Linux resource/PDF. ruff check/format86files PASS. Browser suite
использует реальный Linux API/worker OCR/PDF; >100 picker dataset и error cases —
presentation fixtures, реальный новый текст→анализ→human hypothesis/match/R2→
CONFIRMED signal v7→PDF **39309bytes** проверен отдельно; original включён,
R1 не подтверждён. Это не независимая оценка качества OCR.

Responsive:13страниц×2вида×6ширин360/390/768/1024/1440/1920 =156наблюдений,
page overflow0/pageerrors0/business writes0; reduced-motion включён. Это
автоматическая матрица, не настоящий browser zoom200% и не внешняя UX-приёмка.
Скриншоты/JSON/PDF/logs — ignored output/qa/ux-stabilization-20261018 и
.local/ux-stabilization-20261018. Изначальный диагностический QA проект остановлен,
volumes сохранены. Итоговый отдельный saq-ux-final-20261018 и production host UI
на http://localhost:3207 оставлены для локального просмотра; backend8208/DB55648
слушают loopback. Доступ в private credentials.txt этого QA каталога, не в Git.

В первом полном прогоне105PASS/2FAIL тесты ожидали открытую новую disclosure и
прежний risk-first Dashboard; тесты обновлены. Следующий106PASS/1FAIL выявил
реальную гонку focus restoration; вместо ожидания нескольких кадров восстановление
теперь привязано к commit selectedId. Отдельные4повтора и финальные107PASS зелёные.
Начальные focused failures также выявили неуникальный source_label в старом тесте
и неверное предположение о наличии extraction у seed REVIEWED; выбор по ID и
реальный setup анализа сделали сценарии воспроизводимыми. Отказы не скрыты retry.

Пути:7production UI/helper/CSS,7tests и8существующих документов (README/CHANGELOG/
DESIGN_SYSTEM/UX_GUIDELINES/UI_COMPONENTS/UI_IMPLEMENTATION_PLAN/UI_AUDIT/статус).
Новый ADR не требуется: применены существующие компоненты/контракт. Локальный
commit разрешён ранее; push/PR/merge/deploy не выполняются. Рабочие Docker image
ui-b0-b3-e2dfefd/API/worker/DB и tunnel не заменены. Следующий шаг — внешний
аналитик/второй ПК/настоящий200%zoom, официальная freeze/сдаваемая версия;
KZ OCR fidelity и разрешённый коммерческий C01 остаются OPEN. Семь anchors
сохранены по согласованному плану; новый API search/sort и P2 — backlog.


## Аудит соответствия UI/UX ТЗ · 18.10.2026

Codex root, база b24531b, установленный UI e2dfefd. По повторному вложению
проверены ТЗ, код, документация, сохранённые public evidence и официальные
материалы Kompra. Матрица и источники — начало docs/UI_AUDIT.md.
Фазы0–1 выполнены; S0–S2/B0–B3 работают в ранее проверенном объёме;
полная приёмка редизайна/стабилизация остаётся открытой.
Конкретные остатки: длинный список legal_bases; семь anchors вместо tab panels;
выбор ЖК в review ограничен100; city filter/global sort/расширенный поиск;
priorityRows сортирует по score вместо действия/срочности; точный scroll/marker
при возврате и единая итоговая матрица размеров/200%zoom/независимый UX.
Kompra.kz и официальные статьи использованы как IA-референс; содержательный
аудит kompra.group и закрытого рабочего кабинета не подтверждён.
Свежие проверки: Git clean на входе, текущий код/тесты и public report прочитаны,
два сохранённых desktop capture просмотрены, CUA показал login, четыре Docker
сервиса работают.103E2E/44public observations — прежние результаты этой версии,
не новые прогоны. Код приложения/данные не менялись; commit/push/deploy нет.
Изменены только UI_AUDIT и этот статус. Следующий шаг — согласованный небольшой
срез документов/приоритета, затем итоговая приёмка; новые функции не начаты.


## B0–B3 установлены в рабочий frontend · 18.10.2026

**DEPLOYED / PUBLIC HTTPS VERIFIED; GITHUB NOT UPDATED.** Пользователь
«установи изменеия» разрешил установку. Codex root, ветка codex/monitoring-tools;
установленный UI source — e2dfefdf0bc830b2579a341033d90408d6f63b3c (включает
709a0be/f7e8358). Git на входе clean; исходники интерфейса не менялись.

Текущий адрес: **https://contacted-string-quiz-kinda.trycloudflare.com**. Старый туннель был остановлен;
`powershell -NoProfile -File scripts/share_site.ps1 -Action Start` восстановил
публикацию и пересоздал API с новым HTTPS APP_ORIGIN/Secure cookie. Образ API,
worker/DB и приватная .env сохранены. Старый honey-identity адрес исторический.
После восстановления снят baseline: дальнейшее обновление заменило только
frontend. API/worker/DB IDs/start times/image/environment hashes/mounts и
.env SHA-256 совпали до/после обновления и после smoke; origin также сохранён.

Новый Docker image `saq-qurylys-frontend:ui-b0-b3-e2dfefd`, image ID5199009d9fad…,
собран через существующие compose/dev/tunnel настройки и private image override.
Rollback tag прежнего image сохранён локально. Команда установки: `docker compose
-f docker-compose.yml -f docker-compose.dev.yml -f .local/tunnel/compose.json
-f .local/deploy-ui-b0-b3-20261018/frontend.compose.json up -d --no-build --no-deps
--wait frontend`. После проверки стандартный frontend:latest указывает на тот же
установленный image. Новых миграций, DB/storage replacements и изменения
backend/API/ролей/риска/снимков нет.

Публичный Chromium smoke:11страниц×375/768/1024/1440=**44наблюдения PASS**,
pageerrors0/page overflow0/business mutations0. Anonymous401/login200/Secure cookie,
чужой Origin403/logout204 PASS. Проверены семь разделов досье, новая группировка
«Сверки», восстановление причины R4 после menu return, сохранность Threads input
между блоками и очистка draft namespace после logout. SHA-256 существующего
исходного Asset совпал; сохранённый PDF200/%PDF-/62384bytes PASS.
Это read-only public smoke, не повтор103записывающих E2E на рабочей БД;103PASS
на отдельном стенде относятся к установленному исходному source. Полная backend
suite/remote CI/независимая OCR/UX/второй ПК этим действием не проверялись.
Первый private smoke ошибочно считал status пагинации незавершённой загрузкой;
уточнено ожидание загруженного server total, приложение не менялось. Финальный
повтор всех44наблюдений PASS. Вручную просмотрен текущий public monitoring capture.

Обновлены README/CHANGELOG/DEPLOYMENT/UI_AUDIT/UI_IMPLEMENTATION_PLAN и статус.
Evidence ignored `.local/deploy-ui-b0-b3-20261018` и
`output/qa/deploy-ui-b0-b3-20261018`; секреты/полные env не выводились и не входят
в Git. Финальная проверка6Markdown/132локальных ссылок/UTF-8 и четырёх приватных
literals без совпадений PASS; repository/candidate hygiene и `git diff --check`
PASS. Новый ADR не нужен: применён существующий frontend-only deployment.
Рабочие четыре сервиса и туннель оставлены включёнными; ссылка временная и зависит
от этого компьютера/сети. GitHub push/PR/merge не выполнялись. Следующий этап —
стабилизация сдаваемой версии, независимая UX/предметная приёмка и второй ПК;
KZ OCR fidelity и разрешённый коммерческий C01 остаются OPEN.

## B3: рабочий путь в «Сверке» · 18.10.2026

**IMPLEMENTED / LOCAL VERIFIED / NOT PUBLISHED.** Codex root, один исполнитель,
ветка `codex/monitoring-tools`, чистая базаf7e83581525819e5c97951efecbb63c263adabf9.
Пользователь «гоу» согласовал названный следующий блок; B0–B2 сохранены.

Порядок `/monitoring`: кандидаты → выбранная сверка → предварительные инциденты.
КЖК/Threads/DEMO-версии перенесены ниже в три native disclosure. Компоненты
постоянно mounted в одном экземпляре; причина сверки, snapshot ID, запрос Threads,
черновик DEMO-версии и выбранный File сохраняются при перемещении между блоками.
Это не новое восстановление monitoring-форм после полного reload. Старые IDs,
query filters/pages/candidate_id, права и ограничения REAL/DEMO сохранены.
Открытие источника не выполняет search/import/compare/review; прежние read hooks
продолжают работать и при закрытом disclosure. Ограничения реестра остаются над
очередью. Hash открывает нужный инструмент и фокусирует target; matching событие
после клика не перехватывает следующую клавишу. Modified click сохраняет native
поведение; header clearance120px desktop/24px mobile проверен геометрически.

Фактические проверки: frontend/ `npm run typecheck`, `npm run lint`,
`npm run format:check`, `node --test scripts/test-*.mjs` (2PASS), production
`npm run build` и standalone start PASS. Целевой E2E **17passed/25.2s**;
полный `npm run test:e2e` **103passed/3.0m**, exit0, workers1/retries0.
Отдельный Compose `saq-monitoring-tools-20261018`, новые DB/storage, loopback8197/
3197, внешние collectors/Threads/Telegram/LLM отключены. Два новых кейса:
настоящий DEMO-кандидат через API и сохранность локальных полей/File без команд;
viewer presentation fixture с HTTP503 справочного источника, deep hash/reload/
Back/keyboard,24target-проверки на375/768/1024/1440 и отсутствие page overflow.
Fixture роли/ошибки не доказывает серверную авторизацию или доступность источника.
Прежний настоящий workflow сравнения/версий/инцидента/идемпотентности/неизменного
риска прошёл, вместе с остальными R1–R6/OCR/history/queue/PDF regressions.

Первый targeted15PASS/2FAIL: двойной перенос фокуса по click+hashchange мешал
следующему Enter; устранено дублирование и ненужный отложенный focus. Второй тест
сравнивал динамический as_of для объектов без факторов; теперь сравнивает id/
score/zone/revision/confirmed/unknown/rules_version. Backend/guards не менялись.
Ранний Prettier check потребовал форматирования нового теста; итоговый PASS.

Новый непрерывный текст→analysis→human hypothesis→match→R2 capture/CONFIRM→
signal/CONFIRM→PDF PASS: version4, 37742bytes,
PDF200/%PDF-, новый оригинальный Asset в snapshot, R2=25, R1 не подтверждён.
Это не независимая OCR-оценка. Вручную просмотрены текущие Chromium captures1440/
375; таблица прокручивается внутри TableRegion. Интерактивный CUA, настоящий200%
zoom, screenreader и внешняя UX/предметная приёмка этим не подтверждаются.

Изменены monitoring-workspace.tsx/monitoring.css, три прежних browser tests и
новый monitoring-tools.spec.ts; README/CHANGELOG/DESIGN_SYSTEM/UX_GUIDELINES/
UI_COMPONENTS/UI_IMPLEMENTATION_PLAN/UI_AUDIT/этот статус. API/backend/contracts/
миграции/dependencies/расчёт риска/роли/immutable snapshots не менялись; полная
backend suite не повторялась. ADR не нужен: переставлены существующие primitives
и компоненты без новой архитектуры. Evidence ignored `.local/monitoring-tools-20261018`
и `output/qa/monitoring-tools-20261018`; приватная конфигурация не входит в Git.
Самопроверка14изменённых/новых файлов: UTF-8/147локальных Markdown-ссылок/три
приватных тестовых literals без совпадений PASS. Candidate path hygiene,
`python scripts/check_repository_hygiene.py` и `git diff --check` PASS.

После QA свой frontend/Compose остановлены с сохранением volumes; рабочие четыре
SAQ контейнера не пересобирались и оставлены работающими. Локальный коммит — по
прежней просьбе пользователя; push/merge/deploy/обновление публичного сайта не
выполняются. Следующий приоритет: стабилизация сдаваемой версии к21октября,
независимый аналитик/второй ПК, KZ OCR fidelity и разрешённый C01;103PASS не
закрывает эти задачи и не является полной внешней приёмкой MVP.

## B2/S3: семь разделов досье · 18.10.2026

**IMPLEMENTED / LOCAL VERIFIED / NOT PUBLISHED.** Codex root, один исполнитель;
ветка `codex/dossier-sections`, чистая база709a0be41c1d2f5af3c449c0af0a29f4b7f41a88.
Пользователь «гоу», затем «продолжи от туда от куда остановился» разрешил
продолжение названного этапа. Блок B0+B1 сохранён; повторной интеграции нет.

Досье распределено на обзор, основания, рекламу, факторы риска, доказательства,
историю и сигналы. Семь anchors доступны в обоих видах. Шапка, backend score,
UNKNOWN и ограничения остаются видимыми. Матрица R1–R6 показывает сохранённое
решение/дату/баллы/причину; отсутствующий фактор явно «Не зафиксирован».
«Проверить R…» раскрывает нужный редактор и переводит фокус; R2 остаётся у
публикации. Native disclosure форм постоянно mounted: ввод, File и retry state
сохраняются. Создание основания рядом с основаниями; в кратком виде есть
контекстная кнопка проверки/добавления. Доказательства читаются прежним
EvidenceItem по выбранной группе, с дедупом IDs; предварительного запроса всех
источников нет. История использует прежнюю пагинацию, сигналы — property_id URL
и прежний CreateSignalButton, без изменения immutable snapshots.

Исправлены две локальные детали: изменение identity UI mode setter не открывает
редактор заново при переключении вида; якоря оставляют место для sticky desktop
header. Проверяется не только activeElement, но и фактическое положение заголовка
ниже шапки. Старые dossier section IDs и #dossier-materials сохранены.

Финальные проверки source: frontend/ `npm run typecheck`, `npm run lint`,
`npm run format:check`, `node --test scripts/test-*.mjs` (2PASS), production
`npm run build` и standalone start — PASS. Полный `npm run test:e2e` на
`saq-sections-20261018`, отдельной новой DB/storage, loopback8197/3197:
**101passed / 3.1m**, exit0, workers1/retries0. Предыдущий101PASS/3.0m относится
к source до финального anchor clearance; не заменяет финальную проверку.
Два новых теста: настоящий analyst read-only сценарий с семью keyboard anchors,
collapse/File/draft/deep hash/reload/mode и неизменным risk; viewer presentation
fixture с отсутствующими командами, ленивыми evidence reads и четырьмя ширинами.
Viewer fixture не является серверной проверкой авторизации; прежние server/role
сценарии не менялись. Прежние R1–R6, 409/retry, queue, OCR, history и PDF — в101PASS.

Первый targeted run на повторно использованной B0 DB:25PASS/5FAIL. Четыре
ожидали0, но имели сохранённый после прежнего critical path R2=25; новая БД
изолирует исходный seed без reset/удаления старых volumes. Пятый — новый locator
по одинаковой DEMO-причине трёх факторов; уточнён по уникальному коду фактора.
Guards/допуски/расчёт риска для зелёных тестов не ослаблялись.

Непрерывный новый текст→analysis→human hypothesis→match→R2 capture/CONFIRM→
сигнал/CONFIRM→PDF PASS: version7, 39206bytes,
PDF200/%PDF-, новый Asset в snapshot, R2=25, R1 не подтверждён. Это текстовый путь;
отдельную оценку OCR качества он не заменяет. Responsive375/768/1024/1440 без page
overflow; фактическая видимость anchor target проверена. Вручную просмотрены
актуальные Chromium screenshots1440/375 и полный desktop dossier. Интерактивный
CUA/настоящий200%zoom/screenreader/внешний аналитик этим не подтверждаются.

Изменены PropertyView/CSS, editor IDs ConstructionFactor, тестовый helper и
соответствующие browser regressions; README/CHANGELOG/DESIGN_SYSTEM/UX_GUIDELINES/
UI_COMPONENTS/UI_IMPLEMENTATION_PLAN/UI_AUDIT/этот статус. Новый ADR не нужен:
презентационная группировка использует существующие primitives, API и runtime.
Backend/contracts/миграции/dependencies/формула/роли не менялись, полная backend
suite этим блоком не повторялась. Evidence ignored `.local/dossier-sections-20261018`
и `output/qa/dossier-sections-20261018`; конфигурация содержит только локальные
тестовые доступы и не включается в Git. Финальная самопроверка19изменённых/новых
файлов: UTF-8/146локальных Markdown-ссылок/три приватных тестовых literals без
совпадений PASS. `python scripts/check_repository_hygiene.py`, candidate path
hygiene и `git diff --check` PASS; QA artifacts и приватная конфигурация исключены.

Свой standalone frontend и Compose после QA остановлены с сохранением volumes;
рабочие четыре SAQ контейнера восстановлены без пересборки/замены конфигурации.
Локальный коммит — по прежней просьбе пользователя; push/merge/обновление
публичного сайта не выполняются. B3: группировка инструментов «Сверки» —
следующий отдельный срез. Независимая UX/предметная приёмка, второй ПК,
KZ OCR fidelity и разрешённый C01 остаются открытыми перед защитой21октября.

## B0+B1: сохранность форм досье · 18.10.2026

**IMPLEMENTED / LOCAL VERIFIED / NOT PUBLISHED.** Codex root, один исполнитель,
ветка `codex/dossier-drafts`, чистая база `d3c1a6f2328b25976c0d9a3a1dbde67a0ec93419`.
Продолжено после согласования пользователем следующего блока. Текущий master1.4,
точная очередь решений и интегрированный frontend сохранены; старый аудит не
использован как основание откатывать уже выполненную работу.

B0: формы R1/R4/R3/R5/R6, создания и проверки основания восстанавливают поля
после menu/Back/другого объекта/reload. Использован прежний review-draft runtime:
scoped sessionStorage, 12h при восстановлении, storage fallback, beforeunload.
File-объекты, выбранные новые evidence IDs и retry context остаются только в памяти
вкладки для SPA; после reload требуется повторный выбор файлов. Файловые байты
не сериализуются. Logout и auth/me401 очищают текст/память. Восстановление не
отправляет команд; документ и решение по-прежнему сохраняются отдельно.
Причина сохраняется перед каждой командой, включая немедленный review после
capture. Изменение только причины R4 не теряет новое доказательство; неподанные
новые материалы сохраняются и после отклонения старого фактора.

B1: endpoint точной очереди был готов на входе и не переписывался. R4 regression
проверяет ненулевой исходный риск Самал и сохранность остальных факторов,
а не предполагает нулевой общий score. Исправлена гонка только в проверке
геометрии диаграмм: два DOM-прямоугольника читаются за один проход с ожиданием.
Первый полный прогон98pass/1fail выявил эту гонку; промежуточный99pass не был
выдан за проверку последующих изменений. Последний прогон прерван остановкой
Docker после84PASS; после восстановления выполнен новый полный запуск:
**99 passed / 3.1m**, exit0, retries0, workers1.

Проверки окончательного source: frontend/ `npm run typecheck`, `npm run lint`,
`npm run format:check`, `node --test scripts/test-*.mjs` (2PASS), production
`npm run build` и запуск standalone — PASS. E2E на отдельном Compose
`saq-dossier-20261017`, новой DB/storage, loopback8197/3197: 4 новых draft cases,
прежние роли/keyboard/focus/queue/OCR/history/PDF — в полном99PASS. Из четырёх
новых: три используют реальные API (конфликт R4 инъецирован HTTP409), один
проверяет presentation fixture новой revision основания без отправки решения.
Это не проверка реального конкурентного изменения основания.

Отдельный непрерывный путь: новый ручной текст → worker analysis → human hypothesis →
match → R2 capture/CONFIRM → сигнал/CONFIRM → PDF200/%PDF-, **42213bytes**,
version13, R2=25, R1 не подтверждён, новый оригинальный Asset входит в snapshot.
RU/KZ OCR smoke на двух синтетических изображениях выполнен отдельно: байты
исходника совпали, гипотезы PENDING с bbox; это не независимая оценка качества OCR.
Ранее сняты четыре responsive-наблюдения375/768/1024/1440 без page overflow,
причина R4 сохранена; вручную просмотрены1440/375. Повтор CUA после восстановления
заблокирован browser URL policy; обход не выполнялся. Финальный автоматический
responsive/keyboard набор прошёл, CSS/layout не менялись.

Изменены: пять review/workspace компонентов, новый `use-dossier-form-draft` и
`DossierDraftNotice`, три browser test files; README/CHANGELOG, DESIGN_SYSTEM,
UX_GUIDELINES, UI_COMPONENTS, UI_IMPLEMENTATION_PLAN, UI_AUDIT и этот статус.
Нового ADR нет: расширен существующий локальный механизм. API/backend/contracts/
миграции/dependencies не менялись; полная backend suite этим блоком не повторялась.
Evidence: ignored `.local/dossier-drafts-20261017` и `output/qa/dossier-drafts-20261017`.
Финальная самопроверка18изменённых/новых файлов: UTF-8/144локальные Markdown-ссылки/
три приватных тестовых literals без совпадений; `python scripts/check_repository_hygiene.py`
и `git diff --check` PASS. Runtime secrets и QA artifacts в коммит не входят.
После проверки свой тестовый стенд остановлен с сохранением volumes; рабочие
четыре SAQ контейнера восстановлены без пересборки и замены конфигурации.
Локальный коммит сохраняет блок по прежней просьбе пользователя; push/merge/
обновление публичного сайта не выполняются.

Следующий UI-шаг: B2/S3 — семь локальных разделов досье с сохранением mounted
форм, затем B3 — распределение инструментов «Сверки». Эти этапы ещё не реализованы.
Независимая UX/предметная приёмка, KZ OCR fidelity и разрешённый C01 остаются
открытыми;99PASS не означает завершение всей подготовки к защите21октября.

## Продолжение: runtime восстановлен, KZ provenance проверен · 17.10.2026

**COMPLETED / TARGETED VERIFIED; KZ OCR FIDELITY OPEN.** Исходная интеграция
PR №3 уже завершена; повторная интеграция не нужна. Codex root, база
`aefb72f`, ветка `codex/verify-ocr-provenance`; помощник выполнил независимый
read-only разбор KZ ошибок и review двух тестов, замечаний нет.

При продолжении Docker Desktop и туннель оказались остановлены. Запущен Docker
и только четыре существующих SAQ сервиса, без сборки/замены образов/рабочих
volumes. Новый туннель штатным helper применил публичный origin к API;
приватная `.env` сохранена. Текущий адрес:
**https://honey-identity-approx-hotel.trycloudflare.com**. Прежний адрес ниже
исторический. Рабочие сервисы и туннель оставлены включёнными.

Проверка Chromium: 9 страниц × 375/768/1024/1440 px = **36 наблюдений PASS**,
0 overflow / 0 pageerrors / 0 business mutations. Anonymous401/login200/
Secure cookie/logout204, точная очередь, сравнение и SHA-256 скачанного
сохранённого Asset PASS. Это read-only runtime smoke, не повтор полного
записывающего E2E или внешняя UX-приёмка.

Четыре KZ strict ошибки — OCR `—` → `--`, а не неверные суммы/привязка к
другому условию. Повторная оценка сохранённых predictions воспроизвела
KZ raw11/11 и strict fragment/binding1TP/4FP/4FN; manifests, raw reports и
labels неизменны. Новый Tesseract-прогон не выполнялся. Добавлены регрессии
пунктуационной строгости и пути mocked TSV → worker → ручная дочерняя версия:
raw OCR/исходные байты/родитель/bbox сохраняются, новые offsets точны,
унаследованного bbox нет, гипотезы PENDING, retry идемпотентен, stale parent409.
Mocked OCR не доказывает качество распознавания изображения.

Фактические проверки: из backend/ `python -m pytest -q tests/test_analysis.py
tests/test_extraction_payment_fields.py tests/test_extraction_payments.py
tests/test_extraction_names.py tests/test_publication_evaluation.py` —
**230 passed / 27.94s** на отдельном PostgreSQL `127.0.0.1:55639`, private tmpfs;
после тестов контейнер остановлен. `python -m unittest discover -s scripts
-p "test_*.py" -v` — **74 tests OK / 1 Windows symlink skip**. Ruff check/
format двух тестовых файлов, repository hygiene и `git diff --check` PASS.
Локальные команды используют `.venv`; скриптовый Ruff — config backend/pyproject.toml.
Frontend/API/правила/контракт/миграции/dependencies не менялись; build и полная
backend/browser suite не повторялись. Evidence ignored
`.local/resume-verification-20261017`, captures `output/qa/resume-verification-20261017`.

Обновлены README, DEPLOYMENT, OCR_EVALUATION и REMAINING_CHECKLIST. Нового ADR
нет: production-поведение не меняется. Финальная проверка пяти Markdown/145
локальных ссылок/UTF-8 PASS; семь изменённых файлов проверены по четырём
локальным sensitive literals, совпадений0. Изменения сохранены локальным
коммитом в указанной ветке; GitHub push/merge и удалённый CI не выполнялись.
Этот блок закрывает восстановление и
проверку provenance, не точность KZ OCR. Следующий шаг: независимая RU/KZ
разметка разрешённых реальных примеров и проверка KZ-пунктуации; коммерческий
C01 по-прежнему требует разрешённого источника. claude-mem недоступен для новых
записей из-за отозванной авторизации; передача сохранена здесь.

## PR №3 опубликован; новый frontend установлен · 17.10.2026

**PUBLISHED / CI SUCCESS / PUBLIC HTTPS VERIFIED.** Проверенный merge
`dccc281bd281306c670b131708d9e7adaf4fe259` опубликован через
[PR №3](https://github.com/temirkhanerbolatovich-coder/saq-qurylys/pull/3)
в main `4552d44d67ba96c4b8a13e9b41e000e83bdbf117`; деревья совпали.
Входящий9691bf0 — ancestor main, история обеих сторон сохранена.
[PR CI](https://github.com/temirkhanerbolatovich-coder/saq-qurylys/actions/runs/39055627392)
и [push CI](https://github.com/temirkhanerbolatovich-coder/saq-qurylys/actions/runs/39055621564)
success во всех3jobs. Своя объединённая ветка удалена после ancestry check,
исходная `codex/ui-updates` сохранена; дальнейшую работу начинать от свежего main.
Повторный [CI на main4552d44](https://github.com/temirkhanerbolatovich-coder/saq-qurylys/actions/runs/39056051978)
также success во всех3jobs. Заключительный update меняет только документацию.

Оба полных локальных browser прогона95passed/2.6m; после визуальных исправлений
повторный28наблюдений PASS. Перед push352trackedфайла/8известных sensitive literals/
0совпадений,9Markdown/143ссылки/UTF-8/hygiene/diff-check PASS. Backend/API/данные/
миграции/dependencies не менялись. Подробности реализации и проверок — ниже.

Обновлён только frontend, прежний image сохранён для отката; кандидат назначен
также стандартному `saq-qurylys-frontend:latest`. API/worker/DB container IDs и
start times, env hash и URL остались прежними. HTTPS smoke9страниц×4ширины:
36наблюдений/0overflow/0pageerrors/0businesswrites; anonymous401/login200/
Secure cookie/logout204, очередь/comparison и скачанный Asset SHA-256 PASS.
Адрес прежний: https://casey-medicine-feed-bowl.trycloudflare.com.
Открытую вкладку с досье не перезагружали; новая версия доступна при обновлении.
Собственный acceptance остановлен, private volumes сохранены; работают только
4рабочихSAQсервиса. Evidence/rollback config ignored `.local/ui-integration-20261017`;
screenshots `output/qa/{ui-updates,working-site-ui-updates}`. README/UX/deployment/
GitHub audit обновлены. Следующий блок — независимая RU/KZ приёмка и KZ quotes;
рекламный C01 требует разрешённого источника. Ниже — ход работы до публикации.

## Интеграция новой frontend-ветки · 17.10.2026

**IMPLEMENTED / LOCAL VERIFIED / PUBLICATION NEXT.** Пользователь «гоу» согласовал безопасную интеграцию и обновление сайта. Codex root; база main `33173a0363bb454b5be48a75d730e1a5d8399930`, вход `9691bf0489ba1e5d5ecd207306e803e368e6bb8a`, ветка `codex/integrate-ui-updates`. Три конфликта разрешены выборочным переносом представления; история обоих родителей сохраняется, чужая ветка не переписывается.

Приняты карточки/детали публикаций, даты/версия/SHA, оформление text/file intake, заголовок материала review, инструкция сигналов и две диаграммы. Диаграммы явно ограничены первыми100/сервернымtotal; image+URL считается один раз, реальные processing statuses не заменяются выдуманными SUCCEEDED. Точные action totals остаются отдельной очередью. Пять зон, оба вида, URL/Back/reload, server pagination, drafts/idempotency, PropertyHistory, controlled map, comparison, роли/решения/исторические snapshots сохранены. Backend/контракт/миграции/dependencies/frozen data не менялись; нового ADR не требуется.

Первый targeted browser run:19passed/1failed — новый тест читал URL до завершения client navigation. Исправлено ожидание, без ослабления guards. Полный Linux API/worker/production frontend прогон:95passed/2.6m. Typecheck/ESLint/Prettier,2Nodechecks, Windows и Docker production builds PASS. Read-only осмотр7страниц×4ширины375/768/1024/1440:28наблюдений,overflow0/pageerrors0/businesswrites0. Captures375/1440 просмотрены вручную; исправлены full-row span диаграммы и группировка upload fields, caption≥12px/native links≥44px/существующие color tokens. Финальный полный повтор после визуальных исправлений:95passed/2.6m; повторный read-only осмотр28наблюдений PASS, logout204.

Стенд `saq-ui-acceptance-20261017-53b240`: новые private DB/storage volumes, loopback3199/8199/55629. Рабочие данные не используются в write tests; Docker frontend имеет отдельный tag. Config/logs ignored `.local/ui-integration-20261017`, screenshots `output/qa/ui-updates`. README/CHANGELOG, design/UX/components/plan/audit и GitHub audit обновлены. Следующий шаг: финальные проверки/secret scan → merge commit/push/PR/CI → обновление только рабочего frontend с прежним HTTPS override/read-only smoke; свой стенд остановить. KZ quotes/независимая RU-KZ приёмка/разрешённый C01 остаются OPEN.

## Сайт обновлён; rules-1.6 и review/comparison опубликованы · 17.10.2026

**PUBLISHED / CI SUCCESS / WORKING SITE VERIFIED.** Пользователь
согласовал восстановление сайта и следующие backend/UI блоки. Проверенный
коммит `6c2b8cda394e91d3c3f160c782049ee88527a2a9` из ветки
`codex/restore-site-ai-review-tools` объединён через [PR №2](https://github.com/temirkhanerbolatovich-coder/saq-qurylys/pull/2)
в main `d95c95daae6ec74404925ac8502f93c2612a0183` обычным merge, без переписывания истории.
Оба CI на исходном коммите зелёные: [PR](https://github.com/temirkhanerbolatovich-coder/saq-qurylys/actions/runs/39052856375)
и [push](https://github.com/temirkhanerbolatovich-coder/saq-qurylys/actions/runs/39052786775),
во всех трёх jobs frontend/backend/browser-e2e. После fetch и fast-forward
дерево main полностью совпало с проверенным коммитом. Codex root отвечает за
runtime/интеграцию, помощники — независимые extraction/queue/comparison области.
Повторный [CI на merge-коммите main](https://github.com/temirkhanerbolatovich-coder/saq-qurylys/actions/runs/39053400753)
также завершился success во всех трёх jobs. Собственная объединённая ветка
удалена после проверки ancestry; чужая `codex/ui-updates` сохранена.
Заключительный docs update:351trackedфайл/8известных literals/0совпадений,
5Markdown/114относительных ссылок/UTF-8/hygiene/diff-check PASS;
обычный push завершён, main чистый и синхронный с origin.
Сохранены frontend master1.4, API0.13/51operations, роли/риск/исторические решения;
новых dependencies/миграций нет. Next dev создал локальные frontend/AGENTS.md;
проверены поставленные Next Link/searchParams docs, инструкция сохраняется в Git.

**Реализовано:** rules-1.6 исправляет банковские false positives от общего отрицания
названия и сохраняет связанные сумму/процент одной фразы; новые extraction остаются
PENDING, старые не пересчитываются. `/review?queue=actions` и Dashboard используют
точные серверные totals; processing режим сохранён. Actions ведут к текущей версии,
исторический R2 имеет собственные target/factor/evidence/revision/idempotency/draft.
`/comparison` явно выбирает две публикации или extraction версии, показывает
bounded diff/исходники/даты/SHA; после выбора только GET, без бизнес-записей.

**Рабочий сайт:** восстановлен Docker Linux с существующим SAQ volume;
до startup/migrations получена согласованная копия и isolated restore PASS:
24 таблицы/1936 audit events/553 Assets/66signals/44READY PDF. Перед финальным
обновлением создан дополнительный backup. Рабочая env/БД/storage не заменялись.
Сначала поднят точный published f1ee219 snapshot, затем проверенные новые образы.
URL https://casey-medicine-feed-bowl.trycloudflare.com, HTTPS origin/Secure cookie
сохранены. Chromium smoke:12наблюдений dashboard/queue/comparison375/768/1024/1440,
overflow0/pageerror0, anonymous401/login200/logout204, business mutations0.
Скачанный существующий исходный Asset дополнительно сверен по SHA-256.
После публикации `/comparison` по HTTPS вновь ответил200; рабочие сервисы
оставлены включёнными. Адрес зависит от компьютера, Docker, интернета и туннеля.

**Проверки:** полный backend из backend/ —809passed/18WindowsLinuxPDFskips/377.33s;
первая команда из корня дала808pass/18skip/1fail из-за child module cwd, отдельный
повтор и полный правильный запуск PASS. Ruff app/tests/alembic check/format86files
PASS. Tooling unittest73tests/72pass/1Windows symlink skip PASS через venv;
system Python без зависимостей ранее дал import errors и не принят за результат.
Frontend typecheck/lint/format, production Docker build/start,2Nodechecks PASS.
На отдельной acceptance БД все77старых сценариев прошли; после исправления двух
тестовых ошибок все16новых presentation/live сценариев PASS. Финальная проверка
metadata/navigation layout —8passed/19.5s. Удалённый Linux CI после этих исправлений
завершился success во всех трёх jobs; точные локальные результаты приведены выше.

**ИИ качество:**172целевыхpytest/44evaluatorunittest PASS; frozen labels unchanged.
Offline Linux OCR v1/v2 безnetwork/DB: payment16/0/0/16 и8/0/0/4, top3 24/24 и10/10;
v2money11/0/0,percent4/0/0,value10/0/0,strictbinding6/4/4 из-за четырёх KZquotes.
CER2.49%/1.69%; оба acceptance=false. Это изученный synthetic regression, не
real-positive holdout/человеческая приёмка. Максимум одна сумма+один процент на
фразу; произвольные несколько платежей и KZ OCR нормализация не заявляются.

**Стенд/диагностика:** отдельный Compose `saq-acceptance-20261017-d68a0f` с портами
3199/8199/55629 и private named volumes. Первоначальные internal network/кириллический
bind не публиковали Windowsports/исказили path; заменены только test network/storage.
После замены storage создана новая согласованная testDB/storage pair: старый seed
указывал на прежние файлы (75pass/2fail), рабочая система не затрагивалась.
Все private logs/config/results лежат ignored `.local/site-refresh-20261017`;
старые тестовые тома/backup не удалялись. Стенд штатно остановлен;
работают только четыре сервиса рабочей SAQ установки.

**Документация:** README/CHANGELOG, architecture, AI/OCR audit, обе feature docs,
design/UX/components/plan/audit, deployment/checklist и этот статус синхронизируются.
CI включает write-smoke flag только одноразовому browser job; тесты требуютloopback.
Значимых новых архитектурных решений нет: используются ADR012/013 и прежний runtime.
Перед push проверены351trackedфайл и восемь известных sensitive literals:
совпадений0;16изменённых Markdown/217относительных ссылок/UTF-8/diff/hygiene PASS.
Frozen data и API contract не изменялись. Перед merge ещё раз проверены точные
SHA исходной ветки и main; чужая frontend-ветка не изменялась.

**Новая frontend-ветка:** при заключительном fetch обнаружена
`origin/codex/ui-updates` (`9691bf0489ba1e5d5ecd207306e803e368e6bb8a`, от f1ee219).
Её [CI39051315128](https://github.com/temirkhanerbolatovich-coder/saq-qurylys/actions/runs/39051315128)
имеет failures format:check и browser-e2e. Read-only merge preview с новым main
показал три конфликта: design-system.css, analysis-workspace.tsx, workspace.tsx.
Diff также удаляет useReviewDraft и серверную пагинацию прежней очереди.
Эта отдельная ветка сохранена и не объявляется установленной на сайте.
Следующий блок — интеграция её представления с сохранением действующих сценариев,
разбор её CI и повторная проверка; затем независимая RU/KZ приёмка качества.
C01/realRU-KZ/KZquotes/внешняяприёмка остаются OPEN. Пароли другойкопии/PRcache
из предыдущего инцидента владелец обрабатывает отдельно; они не объявляются закрытыми.

## Очистка GitHub завершена в доступном объёме · 17.10.2026

**PUBLISHED / MAIN SYNCHRONIZED / CI VERIFIED.** Опубликованы очищенный main
6059064 и документальный блок `1db8e95d8be8262864db8cd46fecb928443f0bf8`.
Свежий single-branch clone после обычного fast-forward подтвердил совпадение
с локальным деревом, отсутствие обеих ZIP blob и архивных путей во всей истории
main; `git fsck --full --strict` PASS. Сохранены исходные 38 коммитов плюс
документация; frontend/backend/контракт/миграции не менялись после зелёного
CI39045481388. Все три CI job success: 803 backend, 77 browser E2E, 73 tool tests,
2 Node checks, frontend checks/build/audit, OCR и migrations PASS.

Перед публикацией 1078 достижимых объектов HEAD проверены на восемь известных
текущих/раскрытых secret literals: 0 совпадений. Восемь Markdown, 113 links,
Python/PowerShell syntax, четыре изолированных SQLite сценария, hygiene/diff-check
PASS. Собственные две временные локальные ветки удалены после verified bundle;
остался только main, локальное/удалённое дерево синхронно и чистое. Приватные
старые backups, рабочие env/БД/storage сохранены. Этот заключительный update
меняет только PROJECT_STATUS и публикуется обычным fast-forward.

**Следующий шаг вне этой машины:** пользователь подтвердил отсутствие доступа
к компьютеру frontend-разработчика; владелец выполняет
[инструкцию ротации](../ROTATE_FRONTEND_WORKSTATION.md) и подтверждает отказ
старых паролей/сессий с сохранностью данных. PR №1/cache refs остаются старой
историей и требуют отдельной обработки владельцем/GitHub Support; обращение
не отправлялось. Полное удаление из GitHub/чужих клонов и отзыв доступов не заявляются.

## История main очищена и опубликована · 17.10.2026

**MAIN HISTORY PUBLISHED / FRESH CLONE VERIFIED / CI SUCCESS.** По разрешению
пользователя «продолжай» выполнен main-only force-with-lease:
`97d2bff842cabbd0e36417fc897a876d33e21bff` → `6059064572b64571f4e910d4483af167ef99bbdc`.
Сразу перед действием проверен точный remote SHA; новых веток/tags/open PR/forks
нет. Все 38 коммитов сохранены, изменены 8 SHA; текущий код полностью совпадает
с прежним. Другие удалённые refs не менялись; read-only `refs/pull/1/head` остался прежним.

**Наблюдавшаяся проверка:** новый remote clone `--bare --single-branch --branch main --no-tags`
содержит 38 commits и tree `e4fa6ca83e83173d839b7891d9281e6ffc6f770d`, совпадающий
с деревом до очистки; `rev-list --objects main` не содержит архивных путей,
`cat-file -e` не находит обе ZIP blob, `git fsck --full --strict` PASS. Приватные
результаты: `.local/history-cleanup-20261017/publication.json`,
`fresh-main-verification.json`. Полный [CI39045481388](https://github.com/temirkhanerbolatovich-coder/saq-qurylys/actions/runs/39045481388)
на 6059064 завершился success во всех трёх jobs: 803 backend/143.83s,
77 browser E2E/1.9m, 73 tool tests, 2 Node checks; frontend audit 0 vulnerabilities,
lint/typecheck/format/build, hygiene, OCR и migration upgrade/check PASS.

Локальная рабочая копия переведена на очищенный main без reset/clean; прежние
main/подготовительная ветка сохранены в verified private bundle. Перенесены только
два документальных коммита cherry-pick без старых родителей. Обновлены README,
CONTRIBUTING, SECRET_CLEANUP, GITHUB_SYNC_AUDIT, ADR-014 и этот статус; принято
новое решение ADR-015. Документы публикуются обычным fast-forward после проверок;
backend/frontend/контракт/данные/.env/службы не изменялись.

По просьбе пользователя добавлена отдельная инструкция ROTATE_FRONTEND_WORKSTATION
с последовательностью backup → пароль существующей роли БД → новая private env →
одноразовая транзакция password_hash/sessions/audit → проверка старых/новых доступов.
Пример транзакции проверен с текущими ORM/security в изолированном SQLite:
успех отзывает две сессии/сохраняет другой аккаунт и контрольный документ;
неизменённый пароль/нет пользователя/ошибка audit оставляют исходные hash/сессии.
Все четыре сценария PASS, синтаксис Python и пяти PowerShell блоков PASS;
0 подключений к рабочим БД. Восемь Markdown проверены: UTF-8 PASS,
113 относительных ссылок/0 missing; известных текущих/раскрытых secret literals
нет. Repository hygiene и `git diff --check` PASS. После очистки main удаляются
только две собственные временные локальные ветки после проверки сохранённого
bundle; незавершённые пользовательские файлы и приватные backups не удаляются.
Это не проверка PostgreSQL/Docker или машины разработчика. Отчёт:
`.local/history-cleanup-20261017/rotation-example-verification.json`.

**Открыто:** пользователь подтвердил запуск старой копии на компьютере
frontend-разработчика и отсутствие доступа к нему. По просьбе пользователя
подготовлена [инструкция владельцу](../ROTATE_FRONTEND_WORKSTATION.md),
ротация удалённо не выполнена; PR/cache refs требуют отдельной обработки владельцем/GitHub
Support. Никаких обращений/сообщений не отправлялось. Команде перейти на очищенные
клоны по CONTRIBUTING, не объединять старую историю. Точный следующий шаг —
завершить публикацию документации, затем владельцу выполнить ротацию на своей машине.

## Очистка истории: разрешение на применение · 17.10.2026

После конкретного отчёта о сохранности исходников, изменении восьми SHA и
вопроса о публикации пользователь ответил «продолжай». Codex применяет это
разрешение к подготовленному main-only обновлению: `97d2bff` → `6059064` с
точным force-with-lease. Повторная проверка remote не обнаружила новых веток,
тегов или коммитов main; candidate fsck PASS. На момент этой записи обновление
ещё не выполнено. Ротация чужой установки и обращение в Support этим разрешением
не объявляются выполненными; runtime пока не установлен. Никаких merge старой
истории или mirror push; локальные пользовательские данные сохраняются.

## Раскрытые доступы: локальная подготовка очистки · 17.10.2026

**LOCAL CANDIDATE VERIFIED / NOT PUBLISHED / CREDENTIAL REVOCATION OPEN.**
После согласия пользователя заняться раскрытым ZIP исполнитель Codex подготовил
изолированный remote mirror и приватный verified bundle в ignored
`.local/history-cleanup-20261017/`. Проверены обе версии ZIP: один набор четырёх
секретов; `.local/credentials.txt` содержит тот же пароль аналитика. Все четыре
отличаются от текущего локального `.env`. Целевая машина старой копии пока
не установлена; рабочая конфигурация/БД/службы не менялись. Запрошено уточнение
владельца runtime; отзыв не заявляется выполненным.

git-filter-repo 2.47.0 удалил только архивный путь в candidate: сохранены все
38 commits, изменены 8 SHA. Исходный main `97d2bff842cabbd0e36417fc897a876d33e21bff`,
candidate `6059064572b64571f4e910d4483af167ef99bbdc`. Текущие деревья полностью
равны `e4fa6ca83e83173d839b7891d9281e6ffc6f770d`; все исторические деревья
равны за исключением ZIP. Metadata/messages/parent topology сохранены;
у 4 затронутых исходных коммитов подписи gpgsig не сохраняются при rewrite.
`git fsck --full --strict` PASS; exact-secret scan всех 1057 достижимых объектов
candidate — 0 совпадений, обе ZIP blob отсутствуют; положительные контроли по обоим
оригинальным архивам PASS. На отдельном локальном bare remote проверены успешное
обновление main с точным lease и отказ при устаревшем lease. Это репетиция,
GitHub main/PR refs не менялись. Build/E2E неизменённого приложения не повторялись.

Read-only независимый аудит: remote содержит main и read-only `refs/pull/1/head`,
0 forks по API, других branches/tags нет. Замена main не удалит PR/cache refs;
сведения для GitHub Support собраны локально, не отправлялись. Generic push
candidate отключён. Документы текущего блока: README, этот PROJECT_STATUS,
[SECRET_CLEANUP](../SECRET_CLEANUP.md). Решение о перезаписи общей истории ещё
не принято; действующее согласование команды — ADR-014.
Документация: UTF-8 PASS, проверены 102 относительные ссылки/0 missing,
известные текущие/раскрытые секреты в трёх Markdown отсутствуют; repository
hygiene и `git diff --check` PASS. Изменены только три документа.

**Следующий шаг:** определить runtime раскрытых доступов и выполнить там
согласованную ротацию роли БД, существующего password_hash, всех server sessions
и private env. Перед force-with-lease публикацией очищенной истории требуется
подтвердить готовность команды перейти на новые SHA и повторно проверить remote.
Сейчас только локальная ветка `codex/prepare-secret-cleanup`; никаких deploy,
удалений пользовательских артефактов или переписывания GitHub не выполнено.

## GitHub: согласованная интеграция frontend и публикация · 17.10.2026

**POST-MERGE VERIFIED.** Повторный [CI main39043777565](https://github.com/temirkhanerbolatovich-coder/saq-qurylys/actions/runs/39043777565) на mergebdab80a завершился **success по всем3jobs**:803backend/116.32s,77browser/1.9m,73tooltests,frontend checks/build иmigrationcheck. Следующий main0ac49cc менял только README/UI_AUDIT/PROJECT_STATUS; исходники совпадают с проверенным приложением. Локальный/удалённыйmain синхронизированы, дерево чистое,55rootartifacts отсутствуют, hygienePASS. Собственная mergedfeaturebranch удалена локально/удалённо после проверки ancestry вmain; исходная история/PR1 сохранены. Этот заключительный update также только документация, runtime/данные не меняет.

**COMPLETED / PUBLISHED TO MAIN.** [PR1](https://github.com/temirkhanerbolatovich-coder/saq-qurylys/pull/1) объединён после зелёного полногоCI точной ревизии `d5516267152dbaad6dd6de068792b8c6fe8068c9`; merge в main — `bdab80a5c846c5b593187583a670cf87cabcdb56`. Локальный main обновлён только fast-forward, origin/main совпал, product tree merge совпадает с проверенной PRревизией. [CI39043383017](https://github.com/temirkhanerbolatovich-coder/saq-qurylys/actions/runs/39043383017): все3jobs **success**, **803backend tests/109.80s**, **77browser E2E/1.9m**, **73tool tests**, **2Node tests**, frontend dependency audit/lint/typecheck/format/build, обаOCRcorpora, hygiene иmigration upgrade/check PASS. Все прежние локальные backend/AI/UX изменения опубликованы вместе с интегрированнымfrontend. Нет runtime deploy/force push/history rewrite/изменения рабочейБД.

**Разрешение и checkpoints.** Пользователь после аудита явно поручил привести GitHub в порядок, совместить frontend и опубликовать наши изменения. Это разрешение заменяет прежний запрет публикации для данного блока. Создана ветка `codex/integrate-frontend-backend`; сохранены исходные35dirty/untracked файлов, binary patches,55remote additions и очищенная выборка54frontend файлов ZIP в ignored `.local/github-integration-20261017`. Секреты не выводятся и не попадают в новые source artifacts. Checkpoint сохраняет предыдущие backend/AI/UX результаты. Интеграция сохраняет API/роли/риск/ручные решения/исторические snapshots; глобальный новый дизайн не изобретается. История Git не переписывается, force push не применяется.

**Итог и оставшиеся границы:** активныйfrontend находится только в frontend/;55ошибочныхкорневыхпутей исключены, rootlockfile отсутствует, git hygiene PASS и trackedsecret scan338files/0matches. Доступы текущейлокальнойкопии отличаются от раскрытогоZIP; чужие раскрытые пароли/сессии должен заменить владелец соответствующейкопии. СтарыйZIP остаётся в прежнихкоммитах; очистка общейистории требует согласования команды, не выполнена. Фактический UIдизайн master1.4, документы/CONTRIBUTING/ADR014 синхронизированы. Независимыйreview команды/fixtures/source mapping и визуальнаяQA не нашли оставшихся blockers. Стенд штатно остановлен; рабочаяPostgreSQLслужба/данные не менялись. Следующий продуктовыйблок — измеренныеAI банковскиеFP/mixedmoney+percent, затем разрешённые реальныеRU/KZ изображения/человеческаяразметка; внешнийUX/реестр/C01остаютсяOPEN.

**LOCAL INTEGRATION VERIFIED / REMOTE CI NEXT.** Сохранённый backend/AI/UX commit `6f78d52` объединён с origin986ca90 без конфликтов. Намеренные различия двухfrontend-вариантов перенесены в workspace/property-map/signals-workspace/design-system.css; сохранены5зон, досье/формы/history/review drafts, API/риск/роли, URLfilters/pagination/revisions/PDFpolling.Все55remote additions убраны с ошибочных корневых путей (54frontend/config/test/download artifacts и ZIP): все55исключены из будущего текущего дерева, исходники/история и ignored backup сохранены. Next tracing/Turbopack root явно frontend; новый настоящий config-loader test предотвращает parentlock regression. CI guard отвергает private/generated files/source archives и rootfrontend, `/*.zip` ignored. [ADR-014](../decisions/ADR-014-frontend-build-root-and-source-hygiene.md), UI master1.4/UX/components/plan/audit, README/CHANGELOG обновлены.

**Фактические проверки перед push:** native PostgreSQL18 только собственный retained loopback55617/UTC, случайные backendtestschemas и новая отдельная `saq_frontend_integration_20261017` база для API8199/frontend3199/worker. Рабочая БД/.env/storage/службы не менялись. Backend `pytest -q -rs` — **785passed/18skipped/253.77s** (Linux resource/Pango); `alembic check` отдельнойruntimeБД — PASS. Tooling unittest discovery — **73tests,72passed/1skipped** (Windows symlink privileges). Backend Ruff app/tests/alembic PASS85files; scoped11tooling Ruff check/format PASS. Frontend typecheck/lint/format PASS; node scripts test2/2 PASS (mapconfig + realNext parentlock config); production build PASS, `.next/standalone/server.js` существует, штатныйstart поднялся, GETcsrf200. Docker недоступен, Linux PDF/E2E проверяются удалённымCI, контроль не ослаблялся.

**Browser/визуально:** финальный целевой Playwright6files — **26passed/34.8s**, включая dashboard/map/signals375/768/1024/1440, overflow0, keyboard/contrast/role/loading/error/empty, draft/URL/conflict reason. Новый regression проверяет не только pageoverflow, но и отсутствиеclip уworkflow links/отдельное размещениеsummarylabels/numbers. Все12screenshots сохранены в ignored output/qa/integration; после QA просмотрены desktopdashboard/signals и mobilemap/signals, устранены railclip и mismatchsummaryclasses. Тестовый maplayer — localSVG, не liveOSM. В первомпрогоне голомуseed не хваталоREADY/signals (12pass/3fail/10notrun); явно созданы realOCR RU/KZ fixtures и DEMOdraft, затем25pass. При финальномповторе исправлены2ошибкистенда/новоготеста (startreadiness и несуществующийCSSselector), итог26pass выше. Всеfailedlogs сохранены в `.local/github-integration-20261017`; productAPI/labels ради проверок не менялись. Полный Linuxbrowserнабор ожидаетCI.

**Граница секретов:** четыре `.env` значения из опубликованногоZIP **не совпадают** с актуальными локальными POSTGRES_PASSWORD/DATABASE_URL/SESSION_SECRET/BOOTSTRAP_ANALYST_PASSWORD; локальные доступы не менялись без необходимости. Другаяruntimeкопия не подключена: её владелец должен заменить раскрытые доступы/отозватьсессии. Новыйsource tree не содержитZIP/.env/credentials/storage/output. Старыеblob/history остаются: это раскрытый residualrisk, не утверждение полногоотзыва/очисткиистории.

**Публикация интеграционной ветки:** mergecommit `f560bf093ae2674951a518de99c95609140d7883` отправлен в origin/codex/integrate-frontend-backend; создан [PR1](https://github.com/temirkhanerbolatovich-coder/saq-qurylys/pull/1), прикреплён к текущему чату. Main пока986ca90. До push просканированы338trackedфайлов на совпадения текущих/раскрытых секретов и ограниченные privatekey/token signatures:0matches; UTF-8 десятиdocs/132локальные ссылки0missing, hygiene/diffcheckPASS. Независимый финальный review exactf560bf0 не нашёл blockers и подтвердил preservationcommands/fixtures. Native API/worker/frontend остановлены по проверенным собственнымPID, отдельныйPostgreSQLcluster штатно остановлен; чужаяPostgreSQLслужба осталасьRunning. Runtime/privatefiles сохраненыignored.

**Первый remote CI:** PRrun39043174512 начал Linuxbackend/browser, frontend остановился только на Prettier нового integrated-layout теста: последняя смена selector была после локальногоformat. Исправлено форматирование без изменения assertions/поведения; локальные frontend format/typecheck/lint повторноPASS. CONTRIBUTING закрепляет правильные sourceпути/ветки/PR и проверкуbuild→start; новый commit требует нового полногоCI передmain. Ошибка не скрывается успешными предыдущими локальными прогонами.

## GitHub: проверка безопасной публикации при новом frontend · 17.10.2026

**AUDIT COMPLETE / DIRECT PUSH NOT READY.** Пользователь попросил проверить новые изменения GitHub и возможность публикации без повреждения frontend. Выполнены только fetch/read/API GET, изолированная копия и проверки; push/merge/pull/stash/reset/новых веток/commit/deploy не выполнялись. HEAD/main сохранён `f9db50bbed7e8ba1f2897a5d5151d47cef332216`, новый origin/main `986ca90a17188b0b4c9bd4116aafc05d845fea9b`, база `e993dc855da00fd5d65c980caeb53ba139d4ce92`; ahead1/behind3. Прежние34dirty/untracked файла сохранены. Исполнитель root; отдельное основание двух read-only помощников — независимый анализ frontend imports/API/root selection и безопасная инвентаризация ZIP без вывода секретов. Они продуктовые файлы не меняли. В этой сессии добавлены только [GITHUB_SYNC_AUDIT](../GITHUB_SYNC_AUDIT.md) и текущая запись статуса.

**Remote/объединение:** три новых upload-коммита добавляют55путей в корень (54отдельных frontend/config/test файла и ZIP); существующий frontend/backend от общей базы не менялся. Локальные141пути от базы, включая checkpoint/dirty/untracked, с remote не пересекаются. `git merge-tree --write-tree --name-only HEAD origin/main` exit0, tree `2284af7c6af5f3a76faed13af13cd9cd1f194dca`; реальный index/локальная ветка не менялись. Прямой push main без синхронизации non-fast-forward, force push не допускается. GitHub API:0открытых PR, heads толькоmain; CI986ca90 run39033732564 success по3jobs. Он проверяет активный frontend/DockerE2E remote SHA, а не архив или наш кандидат.

**Конкретный blocker:** объединённое committed дерево безопасно извлечено в ignored `.local/github-publish-audit-20261017/candidate`, поверх скопированы34dirty/untracked файла (без изменения исходников/index), отдельно установлен npm CI без scripts. В candidate/frontend `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm run build` — **PASS**. Но `npm run start` на отдельном PORT3199 — **FAIL/exit1/MODULE_NOT_FOUND**: новый корневой package-lock выбирается Next16.4 как tracing/Turbopack root, сборка создаёт `.next/standalone/frontend/server.js`, а start.mjs ищет `.next/standalone/server.js`. Подтверждены manifest.relativeAppDir/frontend root и отсутствующий/существующий файл, независимый review исключил артефакт вложенной `.local` копии. Сервер не запустился, процессов не осталось. Docker context ./frontend не включает rootlockfile; свежий Docker/runtime/E2E/БД/миграции этим аудитом не проверены. Логи/summary — в `.local/github-publish-audit-20261017/`; product frontend/.next и рабочая БД не менялись.

**Сохранение frontend/security:** новые rootTSX/CSS сами не заменяют frontend/. Последний ZIP содержит363файла,54frontend,12отличаются от активного remote и22отHEAD; root uploads — другая версия карты/сигналов/CSS, не полная копия ZIP. Blanketcopy вернёт часть старых ограничений review/pagination/types/proxy. В опубликованном архиве есть заполненный .env и .local/credentials.txt, конфигурационные секреты отличаются отexample, плюс72storage/30output файлов; значения нигде не выводились. Доступы следует считать раскрытыми и заменить владельцем; удаление ZIP новым коммитом не уберёт историю. Смена/отзыв/очистка истории не выполнялись. Наши два новых GET/AI tools не меняют прежние41paths/105schemas относительноHEAD; относительноremote checkpoint шире, поэтому это не полная runtime-приёмка.

**Следующий точный шаг:** сохранить обе frontend-версии без секретов, отдельно интегрировать нужные UI-изменения в правильные пути с сохранением currentfeatures; устранить rootlockfile/tracing-root/start mismatch и повторить build+start/E2E. Владелец меняет раскрытые доступы, затем согласованное удаление архива/очистка истории. Только после отдельного разрешения — синхронизация/feature branch/PR, свежий remoteSHA/diff/secret/migration checks. Публикация этой проверкой не разрешена и не выполнена; технического основания обещать безопасный main push сейчас нет.

**Финальная проверка аудита:** повторный ls-remote вернул тот же986ca90; UTF-8 двух документов/33локальные ссылки PASS, missing0; `git diff --check` PASS. Отчёт отделяет0Gitконфликтов,4успешные frontend проверки, наблюдавшийся hoststartfailure, исторический remoteCI и непроверенную интеграцию новых вариантов UI. Исходные PDF/DOCX/TZ, приложения/ветка/index/службы и прежние dirty изменения сохранены.

## ИИ: offline оценка полей и исходных фрагментов · 17.10.2026

**IMPLEMENTED / OFFLINE VERIFIED / EXTERNAL QUALITY ACCEPTANCE OPEN.** Пользователь согласовал следующий блок после аудита («окей гоу»): оценка amount/currency/percent и связи с PAYMENT_TERM/источником, с сохранением прежних baselines. Вход/выход HEAD `f9db50bbed7e8ba1f2897a5d5151d47cef332216`, ветка main, прежние dirty queue/compare/UX сохранены. Исполнитель root; отдельное основание помощников — независимый review семантики метрик, создание только нового JSON regression и отдельно поведенческих тестов. Пути разделены; общие evaluators/документы/статус редактировал root. Commit/push/deploy/платные API не выполнялись, публикация остаётся запрещена.

**Результат:** оба offline evaluator поддерживают manifests1/2, новые reports2 с manifest_schema_version. Общий scorer считает multiset-value и строгую source binding отдельно, Decimal, currency/percent, TP/FP/FN, coverage, raw fragment validity и RU/KZ; ошибки inference сохраняются FN, дубли не дают лишние TP, нулевые знаменатели null. V1 остаётся not_annotated/scores=null, labels из predictions не создаются. HTML v2 проверяет frozen reference против parser. Source hashes включают общий scorer; старые выходы не перезаписываются. Решение о whitespace-only alignment/точной цитате и его ограничения описаны в [OCR_EVALUATION](../OCR_EVALUATION.md); это оценка диагностики, не semantic/legal verdict и не новый порог приёмки.

**Пути:** scripts/evaluation_fields.py, evaluate_ocr.py, evaluate_publications.py, test_evaluation_fields.py, test_evaluate_ocr.py; backend/tests/test_publication_evaluation.py; data/evaluation/ru-kz-fields-v2.json; .github/workflows/ci.yml; OCR_EVALUATION/AI_REQUIREMENTS_AUDIT/REMAINING_CHECKLIST, README/CHANGELOG/этот статус. Нет новых dependencies, миграций/изменения API. Production extraction/OCR/worker, риск/ручные решения и frontend source/CSS/tests не менялись; `git diff --name-only HEAD -- frontend backend/app/extraction.py backend/app/ocr.py backend/app/worker.py` пуст. Исходный ru-kz-v1.json совпадает с HEAD (Git blob d1281d931b76ad66f3b91c50a0eb44fe66993bde).

**Фактические проверки:** из корня `.venv/Scripts/python.exe -X utf8 -m unittest discover -s scripts -p 'test_*.py' -v` — **69tests,68passed/1skipped,0.261s** (Windows symlink privileges; `.local/field-tool-tests-final.log`). Из backend `../.venv/Scripts/python.exe -X utf8 -m pytest -q tests/test_publication_evaluation.py tests/test_extraction_payments.py tests/test_extraction_names.py` — **148passed/0.54s**. Ruff check + format --check шести изменённых Python файлов PASS. Новые проверки покрывают v1/null, v2/frozen reference, неправильные деньги/quote/offsets, неверную фразу, дубли, failures FN, Decimal, OCR prefix/whitespace/substitution и неизменность predictions при смене labels. Полный backend/браузер/build/удалённый CI не запускались: product code не менялся; CI workflow подготовлен локально.

**Наблюдаемые результаты:** новый authored synthetic14cases (12readable,6RU/6KZ,8positive/4negative;2unreadable) — image/text money11TP/0FP/0FN, percent4/2/0, payment_value8/4/2; strict image payment_binding5/7/5, text8/4/2. Document payment8TP/2FP/0FN/2TN; all12/12coverage, rawfragment23/23валидны, errors=[], inputs_changed=[]. Найдены два банковских FP и два mixed money+percent с потерей money; KZ strict fragments чувствительны к ошибкам символов/пунктуации OCR (KZ binding1TP/5FP/4FN против RU4/2/1). Labels не менялись под результат, правила не исправлялись. Агентская разметка требует human/KZ проверки;14cases не выполняют прежний30caseпротокол, `acceptance_established=false`.

**Сохранённые прогоны:** `output/evaluation/fields-v2-20261017/configured-run` exit0; прежний36casev1 — `output/evaluation/fields-v1-compat-20261017/configured-run`, `--require-targets` exit0, payment16/0/0/16, image top3 24/24,1/8unknown falsecandidate, structured scores=null. Native CER128/6311≈2.03% против исторического Docker157/6311 не является улучшением алгоритма: runtime иной. Внешние12HTMLv1 также12/12,TN12/FP0,nullfields, `.local/publication-quality/fresh-2026-10-17/fields-v1-compat-20261017.json` exit0. Прежние baseline/manifest/labels/reports сохранены; новые directories исключены из Git.

**Финальная самопроверка:** UTF-8 шести документов/135локальных ссылок PASS, missing0; YAML workflow parse PASS; source hashes обоих финальных OCR reports совпадают с текущими файлами, исторический rules1.5 report остался schema1. Ограниченный secret-signature scan8изменённых source/test/data/CI файлов —0совпадений (не полный security audit). `git diff --check` PASS. Независимый read-only review scorer/integrations/labels и соответствия docs реальным JSON не нашёл существенных ошибок; value-only TP нигде не объявлен доказательством binding или реальной приёмки. Новая архитектура/провайдер/ADR не требовались: protocol tradeoffs записаны в существующем OCR_EVALUATION.

**Стенд/сбои:** Docker daemon недоступен, БД/сервисы не запускались. Использован установленный Tesseract5.4 native Windows, Arial и отдельные `.local/field-evaluation-tessdata` rus/kaz/eng из официального tessdata_fast commit87416418657359cb625c412a48b6e1d6d41c29bd (SHA в report), configs/tsv из установленного Tesseract. .env/настройки приложения не менялись. Первый preflight не декодировал кириллический путь при PythonUTF8: исправлено чтение native metadata в системной кодировке, добавлен regression test. Следующий первый сохранённый OCR run имел14ошибок OCR_OUTPUT_LIMIT из-за отсутствия configs/tsv в отдельном каталоге моделей; config добавлен только в локальный стенд. Ошибочные отчёты/логи `field-evaluation-{v1,v2}*.log` и directories `run` сохранены, успешные результаты записаны в новые configured-run.

**Следующий точный шаг:** отдельным связным блоком разобрать измеренные банковские FP и mixed money+percent, добавить предметные regressions и версию новых анализов, сохраняя ручные решения/историю; затем новые разрешённые positive/negative RU/KZ изображения и замороженная независимая человеческая разметка. KZ/fragment boundaries проверить человеком, не ослаблять метрики ради зелёного отчёта. Коммерческий C-01, REAL-реестр и внешняя приёмка не закрыты. Frontend подключается своим исполнителем; перед любой будущей публикацией повторно проверить remote SHA и пересечения.

## ИИ: сверка с исходным ТЗ · 17.10.2026

**AUDIT COMPLETE / QUALITY ACCEPTANCE OPEN.** Пользователь попросил пройти ИИ-функционал по ТЗ, пока frontend в работе. Перечитаны исходный PDF кейса (6стр, SHA `14335e6be4f866722d6c741888e1bafcb2fd01fc7f75150d611aa415053ce6da`, релевантные страницы2–6, стр4 отрендерена/визуально проверена), CODEX_TZ, актуальные pipeline/контракты, evaluators и сохранённые JSON. Исполнитель root; read-only помощник независимо проверил реализацию/quality gaps, ничего не редактировал. Программный код, frontend, API, модели, БД и runtime не менялись; прежний dirty queue/compare/UX сохранён, HEAD `f9db50bbed7e8ba1f2897a5d5151d47cef332216`. Commit/push/deploy не выполнялись.

**Вывод:** O §6 требует хотя бы один содержательный AI-сценарий на новых данных с фрагментом/гипотезой/ручным решением; OCR+анализ явно приведён как пример. C §1.4 допускает rules и относит LLM кP1. Текущее ядро Tesseract RU/KZ→rules1.5→RapidFuzz→review реализовано; это не LLM/универсальный NER. PROPERTY_NAME/PAYMENT_TERM/AMOUNT/STAGE создаются, COMPLETION_DATE/LEGAL_DOCUMENT только предусмотрены DTO; адрес/БИН/готовность автоматически не извлекаются. confidence=null допустим при честной маркировке, similarity не вероятность. Recovery при полном пропуске PAYMENT_TERM ограничен существующим guard; вопрос ручного создания остаётся отдельным продуктовым решением.

**Документ:** [AI_REQUIREMENTS_AUDIT](../AI_REQUIREMENTS_AUDIT.md) — матрица O/C→код/тесты→реальные ограничения, качество, разделение обязательного/P1 и точный следующий блок. Сохранённый rules1.5 synthetic report совпадает с текущими4source SHA: payment100%/100%, image top3 24/24, CER≈2,49%,1/8unknown false candidate — изученный regression. Внешний HTML12/12, FP0/TN12, все отрицательные; precision/recall/top3=null, human/KZ/realpositive/image acceptance не установлена. Evaluators пока не измеряют все суммы/валюты/проценты и связь с точным условием. В этой сессии `pytest -q tests/test_extraction_payments.py tests/test_extraction_names.py` — **121passed/0.16s**; новый OCR/E2E/benchmark не запускался, прежний backend-pass не выдаётся за accuracy.

**Следующий конкретный блок предложен:** расширить существующее offline evaluation до amount/currency/percent и привязки к PAYMENT_TERM/фрагменту с новой версией labels/report, не переписывая старые baselines. Затем разрешённые positive/negative RU/KZ изображения с замороженной человеческой разметкой и новый holdout. LLM/семантические поля — отдельный P1 по измеренной необходимости. Фронтенд не менять, публикацию ждать; C-01/реальный реестр/внешняя предметная приёмка не закрыты.

**Самопроверка аудита:** UTF-8 двух изменённых документов и35локальных ссылок PASS, missing0; `git diff --check` PASS. Независимый финальный review не нашёл существенных ошибок/завышенных заявлений. Исходные PDF/DOCX/TZ и файлы кода не менялись этим аудитом. Приватный rendered source — ignored `.local/ai-requirements-audit/case-page-4.png`.

## Backend: сравнение сохранённых публикаций · 17.10.2026

**IMPLEMENTED / BACKEND INTERNALLY VERIFIED.** Пользователь поручил проверить frontend на GitHub, затем уточнил: фронтенд пока локальный, ждать публикации и продолжать независимую работу; последнее steering — «нужно продолжить работу». Начатый compare-блок завершён без frontend source/CSS/test изменений и без commit/push/deploy. Ветка main, HEAD `f9db50bbed7e8ba1f2897a5d5151d47cef332216`. Ранее изменённые UX-документы/queue-блок сохранены. Исполнитель root, read-only помощник независимо проверил семантику/контракт, финальных blockers не нашёл.

**GitHub-проверка перед продолжением:** fetch/ls-remote показали origin/main `e993dc855da00fd5d65c980caeb53ba139d4ce92`, только main; PR-search не вернул PR. Локальный HEAD на один checkpoint впереди,126файлов frontend/backend/docs; его публикация не равна публикации одного queue/compare-блока. Пользователь запретил публикацию до появления frontend. Remote/local UI consumers статически совместимы с очередью, но пока её не вызывают. Это snapshot проверки, не обещание неизменности remote; перед будущей публикацией повторить fetch/diff и интеграционные проверки.

**Результат:** `GET /api/v1/advertisements/compare`, контракт **0.13.0-mvp**. Два явно выбранных original_text либо исторических extraction.analysis_text, provenance/даты/revisions/source Asset и SHA выбранного DB-текста, exact line diff с сохранением RU/KZ/emoji/LF/CRLF. Отдельный TEXT_UNAVAILABLE; no implicit OCR/last-version fallback; проверка DEMO/REAL и принадлежности версии/исходника. Предел100000символов/1000строк на сторону проверяется до equality, без обрезки. Нет внешней сети, записи в БД/аудит, нового entity matching/дублей/риска/сигнала/Telegram. [Контракт подключения/ограничения](../FEATURE_PUBLICATION_COMPARISON.md), [ADR-013](../decisions/ADR-013-bounded-saved-text-comparison.md).

**Пути:** backend/app/publication_comparison.py, analysis_dto.py, api/advertisements.py, tests/test_publication_comparison.py, tests/test_contract.py, contracts/openapi.yaml; FEATURE_PUBLICATION_COMPARISON/ADR-013, README/ARCHITECTURE/REQUIREMENTS/REMAINING_CHECKLIST/CHANGELOG и статус. Нет миграций/новых dependencies. Текстовые лимиты не ограничивают всю историю Assets; SHA DB-текста не заявлен проверкой текущего файла в storage. Изображения/PDF/семантические кластеры и frontend — отдельные блоки.

**Финальные проверки:** из backend `../.venv/Scripts/python.exe -X utf8 -m pytest -q -rs` — **781 passed /18 skipped /216.10s**. Пропуски относятся к Linux resource limits/Pango и перечислены в `.local/comparison-full-final.log`. Целевой `pytest -q -rs tests/test_publication_comparison.py tests/test_review_queue.py tests/test_contract.py` — **72 passed /46.18s**, включая33comparison cases. Ruff check/format backend/app+tests+alembic PASS,85files. Старые41paths/105schemas структурно неизменны, только2новых paths и6schemas (queue+compare); AST-сравнение5старых advertisement handlers —0изменений. UTF-8 девяти документов/141локальная ссылка PASS; дополнительно status+comparison-doc links32/0missing, diff --check PASS. Ограниченный secret-signature scan8source/contract файлов —0совпадений, не полный security audit. Frontend source diff относительно HEAD пуст, browser E2E/production runtime/нагрузка большого набора не запускались.

Первый focused дал68passed/4errors из-за гигантских параметрических test IDs, переполнивших Windows env32767; product API не вызывался для этих4setup/teardown errors. IDs исправлены на короткие без изменения boundary assertions, добавлены2source-asset regression cases. Итоговые focused/full выше прошли. Один локальный stdlib smoke на1000чередующихся строках занял0.053s; это не нагрузочная приёмка API/Asset history.

**Стенд и следующий шаг:** отдельный native PostgreSQL18 кластер127.0.0.1:55617 повторно запущен из retained ignored `.local/review-queue-20261017-pg` с UTC; рабочая PostgreSQL-служба/БД/volumes не менялись. Tests использовали случайные schemas/rollback. После проверок собственный кластер штатно остановлен; retained ignored файлы/логи `.local/comparison-*.log` сохранены, посторонняя PostgreSQL-служба осталась Running. Следующий шаг — frontend-исполнителю отдельно подключить оба API и проверить browser transitions. Публикация остаётся запрещена; после появления frontend повторно проверить SHA/пересечения. Внешний рекламный доступ, RU/KZ holdout, REAL-реестр, второйПК/предметная приёмка остаются открыты.

## Backend: точная очередь нерешённых действий · 17.10.2026

**IMPLEMENTED / BACKEND INTERNALLY VERIFIED.** Пользователь согласовал следующий независимый backend-блок («окей гоу») при параллельной frontend-работе. Вход: main, HEAD `f9db50bbed7e8ba1f2897a5d5151d47cef332216`, сохранены семь ранее изменённых документов UX/status. Исполнитель root; отдельное основание read-only помощника — независимая проверка бизнес-семантики/регрессий очереди без конкурирующих правок файлов. Помощник не менял файлы и не запускал сервисы; финальных blockers не нашёл. Commit/push/deploy этим блоком не выполнялись.

**Результат:** новый `GET /api/v1/advertisements/review-queue`, контракт **0.12.0-mvp**. Для последних extraction READY_FOR_REVIEW/REVIEWED возвращает REVIEW_HYPOTHESES / REVIEW_MATCH / CREATE_PAYMENT_EVIDENCE / REVIEW_R2, IDs/revisions, конкретные targets, фильтры и точные totals до pagination. Один достаточный payment evidence завершает соответствующую часть после свежего ручного R2; отрицательная исправленная бронь не требует невыполнимого evidence. Связанный исторический PENDING R2 остаётся задачей после исправления текста/привязки. Свежесть terminal R2 проверяется по аудитам гипотезы и значимой привязки, включая ранее REJECTED. GET не меняет status, риск, решения, сигнал/PDF, audit и Telegram. Нулевой остаток не означает human/source/legal acceptance.

**Пути:** backend/app/review_queue.py, api/advertisements.py, analysis_dto.py, tests/test_review_queue.py, tests/test_contract.py; contracts/openapi.yaml; FEATURE_REVIEW_QUEUE/ADR-012, README/ARCHITECTURE/REQUIREMENTS/REMAINING_CHECKLIST/CHANGELOG и этот статус. Frontend source/CSS/его тесты и чужие UX-документы этим backend-блоком не изменялись. Миграций/dependencies/нового внешнего доступа нет. [Контракт подключения и границы](../FEATURE_REVIEW_QUEUE.md).

**Финальные проверки:** из backend `../.venv/Scripts/python.exe -X utf8 -m pytest -q -rs` — **748 passed /18 skipped /202.69s**. Пропуски Linux resource limits/Pango перечислены в логе. После добавления live-response contract assertion целевой `pytest -q -rs tests/test_review_queue.py tests/test_contract.py tests/test_dashboard.py` — **48 passed /37.71s**, включая37новых queue tests. Ruff check/format всего backend/app+tests — PASS (74 files); UTF-8 семи изменённых feature-документов и134локальные ссылки — PASS, missing0; diff --check PASS. Ограниченный secret-signature scan6source/contract файлов —0совпадений, не полный security audit.

Первый focused42pass/29.69s и expanded37queuepass предшествовали окончательным регрессиям. Первоначальный full: **740 passed /2 failed /18 skipped /198.18s**. Две исходные проверки provenance/registry падали из-за собственного нового PostgreSQL-кластера, сериализовавшего timestamptz как +05:00 вместо Z. Настроен UTC только у disposable кластера, production/config приложения не менялись; итоговый полный прогон выше прошёл. Приложение не объявляется проверенным с произвольным DB timezone на основании этой настройки тестового стенда.

**Стенд:** Docker daemon недоступен; использованы установленные PostgreSQL18 binaries для собственного loopback-кластера на127.0.0.1:55617 в ignored `.local/review-queue-20261017-pg`, отдельные случайные test schemas и rollback/savepoints. После тестов кластер штатно остановлен. Комбинированная команда stop/remove была отклонена автоматической проверкой (`blocked by policy`, без уточнения причины); выполнена только отдельная остановка, ignored файлы сохранены. Посторонняя PostgreSQL-служба осталась Running; рабочая БД/volumes не менялись. Логи — ignored `.local/review-queue-{focused,expanded,full,full-final,focused-final}.log`. Linux PDF/resource/Pango, браузерный E2E и production runtime этим backend-блоком не проверены.

**Следующий шаг:** frontend-исполнителю подключить новый endpoint вместо подмены READY total числом решений и проверить переходы/ошибки/фильтры; пока существующий экран и dashboard сами не переключаются. Стоимость расчёта зависит от всего filtered набора/history (batch, без N+1; OCR/text не загружаются для подсчёта); нагрузочная проверка большого реестра остаётся перед пилотом. C-01/внешний RU/KZ holdout/реестровый доступ/второй ПК/предметная приёмка не закрыты этим изменением.

## Повторный аудит и продолжение контекста · 17.10.2026

**AUDIT COMPLETE / следующая реализация предложена к утверждению.** По новому запросу перечитано повторно приложенное Kompra ТЗ: его SHA совпадает с исходным. На входе `main`, HEAD **f9db50bbed7e8ba1f2897a5d5151d47cef332216**, clean tree. S0–S2 уже реализованы; стартовая команда ТЗ снова ограничивает текущую работу фазами0–1. Исполнитель Codex root, без новых субагентов. Новый commit/push/deploy не выполнялся; прежнее разрешение на checkpoint завершено предыдущим коммитом.

**Подтверждённые находки:** причина R4 теряется при досье→реестр→то же досье, без предупреждения; защита S0 относится только к review. READY total отражает обработку, а не точный остаток решений: новый материал после signal/PDF остаётся READY_FOR_REVIEW. В досье действия/история зависят от общего режима; подробная страница8483px на текущих данных. В «Сверке» кандидаты начинаются на y1325 при viewport1000, после источников. Picker привязки всё ещё first100. Полная матрица с файлами/доказательствами — верхний [UI_AUDIT](../UI_AUDIT.md).

**Свежие проверки:** `npm run typecheck`, `npm run lint`, `npm run format:check` PASS; из backend `../.venv/Scripts/python.exe -X utf8 -m pytest -q -rs` с APP_ORIGIN localhost3000 и тестовыми cookie-настройками процесса — **711passed,18skipped,266.23s** (случайная test schema, skips Linux limits/Pango). Production3107 `SAQ_E2E_BASE_URL=http://localhost:3107 npm run test:e2e`: первый прогон72pass/1fail, повтор73pass2.2m. Первый тест R4 ожидает score0, но предыдущий critical path оставил R2=25; test-isolation gap не исправлен и не скрывается успешным повтором. Повтор сделан после штатных cleanup остальных тестов, без reset seed/volumes.

**Новый критический путь:** text→analysis→fragment→human hypothesis→match→evidence→R2→досье→CONFIRMED signal v14→PDF43763bytes PASS; snapshot содержит новый original asset/R2, безCONFIRMEDR1. Новый PDF постранично визуально не проверялся. Production build не повторяли: приложение не менялось, используется успешная сборка предыдущего блока той же ревизии; свежий E2E проверяет её. Свежая ручная проверка досье/реестра/сверки и375/1440; предыдущие112responsive наблюдений не выдаются за новый прогон. Настоящий200%zoom/screenreader/внешняя приёмка остаются OPEN.

**Референсы:** в live browser повторно проверены публичные Kompra services/advanced search; официальные материалы карточки/профиля/источников прочитаны с датами и маркировкой DOCUMENTED. Закрытые экраны не реконструировались. Снимки/JSON/PDF — ignored `output/ux-followup-2026-10-17/`, логи — `.local/ux-followup-2026-10-17/`. Сохраняется local preview3107 и отдельный DEMO Compose из предыдущего блока; рабочая версия3000 и её данные не пересоздавались.

**Изменены только документы:** PROJECT_STATUS, UI_AUDIT, UI_IMPLEMENTATION_PLAN, DESIGN_SYSTEM, UX_GUIDELINES, UI_COMPONENTS, UX_UI_SPEC. Исправлены устаревшие текущие описания3/6пунктов/будущихbreadcrumbs/отсутствующего URL-import; история предыдущих решений сохранена. Палитра/master1.3/API/источники приложения не менялись. Рекомендуемый следующий блок **B0+B1**: сохранность форм досье, независимый от общего нуля R4-тест, точная подпись READY queue (2.5–5.5ч разработки +25%резерв, стабилизация отдельно). Затем отдельно выбрать S3-досье или группировку сверки; не брать всё сразу. До21.10 остаются также C-01/внешнийOCR/второйПК/UX/предметная приёмка. Полный acceptance не заявлен.

**Самопроверка документации:** все7 изменённых Markdown читаются как UTF-8;62локальные ссылки существуют; `git diff --check` PASS. `git diff --name-only` подтверждает отсутствие application/test/config изменений. Новых source файлов нет. Локальная документация остаётся незакоммиченной для просмотра; точный следующий шаг — решение пользователя по B0+B1 из контрольной точки B.

## Утверждённый UX-пакет S0–S2 завершён · 17.10.2026

**IMPLEMENTED / INTERNALLY VERIFIED.** После аудита пользователь разрешил начало («окей гоу начинаем»), затем попросил завершить работу из-за лимита и сделать локальный commit. Реализован только согласованный S0–S2; масштабная перегруппировка досье S3 и optional S4 не начинались. Исторические отметки «ожидает утверждения» ниже относятся к предыдущей контрольной точке.

**Изменено:** пять постоянных зон в обоих видах, зелёная навигация, breadcrumbs и вложенная «Сверка»; компактный рабочий обзор с четырьмя очередями по реальным серверным totals и отдельными состояниями отказа. Review использует серверную пагинацию status/page/page_size, явный выбор материала и устойчивую прямую ссылку; оригинал показывает источник, URL и даты публикации/получения. Сохранение причин, гипотез, OCR-правок и R2 разделено по пользователю/вкладке/материалу/версии. Черновики восстанавливаются при переходах и reload через sessionStorage; logout/401 очищают namespace, недоступное storage даёт явный memory-only fallback. Срок 12 часов проверяется при восстановлении, не фоновым удалением. Файлы и исходный OCR автоматически не сохраняются; изменённый пользователем текст хранится в пределах вкладки. Автоматических решений нет, повторы команд сохраняют idempotency key; конфликт 409 не удаляет ввод.

**Границы:** backend, OpenAPI, роли, риск, рабочая БД и опубликованный runtime этим UX-пакетом не менялись. Досье и остальные существующие возможности сохранены; перегруппировка шести инструментов внутри `/monitoring` остаётся следующим отдельным срезом. Picker объекта в review по-прежнему ограничен первыми 100, ограничение раскрыто в UI. Legacy CSS/крупные компоненты не переписывались.

**Фактическая валидация окончательного source:**

- Frontend: `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm run build` — PASS. Backend Ruff check/format — PASS.
- Backend: `../.venv/Scripts/python.exe -X utf8 -m pytest -q -rs` из `backend` — **711 passed, 18 skipped, 277.41s**. Skips относятся к Windows/Linux resource limits/Pango. Tooling unittest — **37 tests, OK (skipped=1)**.
- Production frontend + изолированный API/worker/PostgreSQL: `SAQ_E2E_BASE_URL=http://localhost:3107 npm run test:e2e` — **73 passed, 2.3m**. В первом production прогоне 71/73: два новых теста имели неоднозначный alert locator из-за Next route announcer; исправлена область locator до `main`, итоговый полный прогон зелёный. Предварительный dev-прогон не используется как доказательство приёмки.
- OCR smoke `scripts/verify_ocr.py` на двух новых RU/KZ synthetic изображениях — PASS; реальные worker/download/bbox и отдельные PENDING payment clauses. Это не внешний holdout и не экспертная оценка качества.
- Отдельный контрольный UI-проход: новая публикация → анализ → фрагмент → ручная гипотеза → match → evidence → R2 → досье → **CONFIRMED signal v7 → PDF 41238 bytes**, PASS. Snapshot содержит новый original asset и R2, без CONFIRMED R1. Предыдущие исторические сигналы не переписывались.
- **112 автоматических наблюдений**: 8 маршрутов × 2 вида × 7 ширин (360/375/390/768/1024/1440/1920), page overflow **0**, page errors **0**. Лично визуально просмотрены desktop обзор/review и mobile review/досье. Keyboard/reduced-motion и viewer входят в E2E. Реальный 200% zoom, screenreader и внешняя UX-приёмка остаются OPEN.

**Документация/исполнители:** root — shell/dashboard/CSS/navigation tests, проверки и документы; помощник — review/draft helper и focused regression; независимый помощник — read-only review commit scope. Обновлены DESIGN_SYSTEM (master 1.3), UX_GUIDELINES, UI_COMPONENTS, UI_IMPLEMENTATION_PLAN, UI_AUDIT, README, CHANGELOG и три устаревшие ссылки на контракт/загрузку PDF. Архитектура/API не изменены, новый ADR не требовался.

**Контрольная точка Git:** ветка `main`, родитель `e993dc855da00fd5d65c980caeb53ba139d4ce92`. Сохранены baseline 317 SHA/status/diff в ignored `.local/ux-implementation-2026-10-17/`. Локальный commit по просьбе пользователя включает согласованный UX-пакет и сохранённые ранее незакоммиченные MVP-блоки (URL import, Threads/Telegram, monitoring, open registry/history, migrations, backup/readiness); эти блоки не приписываются текущему UI-пакету. Выборочное сохранение одного frontend оставило бы отсутствующие зависимости. Commit SHA сообщается в итоговом ответе; push/deploy не выполняются.

**Финальная самопроверка:** сравнение baseline подтвердило отсутствие изменений backend/contracts этим UX-пакетом. Проверены UTF-8 документов и 127 локальных Markdown-ссылок — отсутствующих нет. Staged source: 126 файлов, известных private-key/GitHub/AWS/OpenAI/Telegram secret signatures — 0 совпадений; `.env`, `.local`, output, runtime/venv не включены. Это ограниченный signature scan, не сертификация безопасности. `git diff --cached --check` PASS после удаления одной лишней пустой строки EOF в ранее незакоммиченном документе вопросов заказчику. Read-only review не нашёл блокеров для связного локального checkpoint.

**Стенд/свидетельства:** ignored `.local/ux-implementation-2026-10-17/` — логи команд/critical path/compose; `output/ux-s0-s2-2026-10-17/` — observations/screenshots/PDF. Для просмотра оставлены локальный production frontend `http://localhost:3107` и отдельные три контейнера `saq-ux-s0-s2-20261017` (DB tmpfs, API, worker; отдельный storage; Threads/Telegram отключены). Четыре рабочих контейнера/данные/tunnel не пересоздавались. Эта локальная проверка не означает обновление публичного сайта.

**Следующий шаг:** показать сохранённый результат пользователю; S3 только отдельным утверждённым блоком при наличии времени. До защиты 21.10 приоритет — внешняя RU/KZ/UX/предметная приёмка, второй ПК/автономный запуск и стабилизация. Коммерческий C-01, разрешённый реальный реестр и внешняя OCR-оценка остаются незакрытыми; полный MVP acceptance этим checkpoint не заявлен. Новые функции остановлены по просьбе пользователя, презентация/видео не создавались.

## Фазы 0–1 Kompra-inspired UX · 17.10.2026

**AUDIT COMPLETE / IMPLEMENTATION AWAITS APPROVAL.** По приложенному ТЗ изучены текущий проект и публичный Kompra; код/CSS/API/БД приложения не менялись. Исполнитель Codex root; два помощника только читали frontend и backend/контракт. Ветка `main`, HEAD `e993dc855da00fd5d65c980caeb53ba139d4ce92`, сохранён прежний dirty блок (58 modified tracked,61 untracked entry). В ignored `.local/ux-audit-2026-10-17/` сохранены317SHA-256/status/binary diff. Commit/push/deploy не выполнялись; статус прошлых сессий ниже сохранён.

**Результат:** [UI_AUDIT](../UI_AUDIT.md) содержит AS-IS,5главных проблем, сравнительную матрицу Kompra→SAQ, источники/даты/OBSERVED–DOCUMENTED–INFERRED, baseline/ограничения. [UI_IMPLEMENTATION_PLAN](../UI_IMPLEMENTATION_PLAN.md) —5зон, композиция review/досье, Keep/Refactor/Defer, paths/ownership/API/риски/оценки/план17–21.10. В DESIGN_SYSTEM/UX_GUIDELINES добавлены явно **неутверждённые предложения**; действующий master1.2 сохранён. Предложен первый пакет S0–S2: draft safety, постоянные5зон, server-paged review/provenance,5.5–8.5ч+проверка. Более рискованный S3 досье и optional S4 реестр отдельно. Начинать после явного approval пользователя; прежние маршруты/возможности сохраняются.

**Kompra:** browser лично показал public search/advanced filters/breadcrumb/services grouping/source-unavailable banner; изучены официальный guide карточки/PDF/источников, описание monitoring и публичный screenshot профиля. Платный кабинет/настройки/настоящий PDF Kompra не проверялись, Group в browser пустой. Реальные адаптации — IA/progressive disclosure, а не перенос юридических категорий или новых сервисов.

**Свежие проверки текущего dirty source:**

- Frontend `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm run build` — PASS. Рабочий production frontend не пересоздавался; host build использован отдельно.
- Backend `../.venv/Scripts/python.exe -X utf8 -m pytest -q -rs` из backend — **711 passed,18 skipped (290.28s)**. Test-schema случайная; skips Windows/Linux resource limits/Pango, не скрытые PASS.
- E2E `SAQ_E2E_BASE_URL=http://localhost:3107 npm run test:e2e` — **64 passed (2.0m)**. Для сохранности рабочего seed создан изолированный local API/worker/PostgreSQL tmpfs/storage + production frontend. Исходники backend read-only, внешние Threads/Telegram в этом стенде выключены; рабочие четыре контейнера/данные/tunnel не менялись.
- `APP_ORIGIN=http://localhost:3107 .venv/Scripts/python.exe -X utf8 scripts/verify_ocr.py` — PASS, новые RU/KZsynthetic изображения, download bytes совпали, по2PENDINGpayment сbbox. Не external holdout/приёмка качества.
-96наблюдений:8маршрутов×2режима×6ширин360/390/768/1024/1440/1920, overflow0/pageerror0. Снимки после загрузки и JSON — ignored `output/ux-audit-2026-10-17/`. Визуально просмотрены desktop обзор/review/сверка и mobile досье; остальные снимки — автоматическая фиксация, не ручная проверка всех96. Keyboard/reduced-motion входят в64E2E; новый реальный200%zoom/screenreader/touch/люди/второйПК не проводились.
- Отдельный `critical-path.cjs` — **PASS**: новая ручная UIпубликация→анализ→fragment→human hypothesis→match→evidence→R2→досье/охват/период документа→signalCONFIRMEDv4→PDF39456bytes. Snapshot включает новый original asset/R2, score25/YELLOW, безCONFIRMEDR1. OCRкартинки проверен отдельно. PDF11страниц; extraction подтвердил DEMO/R2/disclaimer/новую формулировку и source label. Это внутренний контрольныйDEMOпроход, не внешний юридический acceptance.

**Найденный дефект:** несохранённая причина привязки пропадает при review selector A→B→A (`ReviewMaterial key={id}`, локальныйmatchReason). Воспроизведено без команд сохранения; известные64tests этот переход с draft не покрывают. Другие ключевые проблемы: скрытые mode этапы,6задач вСверке, selector100 вместо очереди, длинное досье. Исправления пока не внесены в соответствии с текущим запросом только на аудит/план. Исторический NEWcounter исправлен и проходит свежиеtests; повторно не объявлен багом.

**Изменённые файлы этого блока:** `PROJECT_STATUS.md`, `docs/UI_AUDIT.md`, `docs/UI_IMPLEMENTATION_PLAN.md`, `docs/DESIGN_SYSTEM.md`, `docs/UX_GUIDELINES.md`; локальные logs/captures/test scripts игнорируются. ADR не создавался: архитектурное решение не реализовано. Обнаружен historical drift FEATURE_SIGNALS/SUPPORTING_PDF/LEGAL_BASIS относительно актуального0.11контракта; помечен в аудите, исходные исторические документы здесь не переписаны.

**Остаётся OPEN:** approval S0–S2/пятизонной IA (это меняет согласованный16.10 simple-mode), коммерческийC-01, внешнийpositiveOCR+humanRU/KZ, реальный утверждённый реестр, человеческаяUX/предметнаяприёмка, второйПК/автономныйзапуск. До защиты21.10 рекомендуется18.10 минимальныйсрез,19.10 только при стабильности досье,20.10 стабилизация без новыхфункций. Точный cutoff/timezone организатора ещё требуется подтвердить; коммуникация от пользователя не отправлялась. Презентация/видео не создавались. **Следующий шаг — показать контрольную точкуA и дождаться утверждения; фазу2 не начинать.**

**Финальная самопроверка:** независимый read-only review уточнил `page_size≤100`, обязательные375px и конкретный S0 guard вместо обещания durable draft. Минимальный пакет с25%резервом и4–6чстабилизации — около **11–17 инженерных часов**. Пять изменённых Markdown читаются как UTF-8,48локальныхссылок существуют, scoped `git diff --check` PASS. Сравнение317начальныххешей подтвердило изменения только пяти перечисленных docs, приложение не менялось. Первый лист настоящего PDF отрендерен Poppler и визуально просмотрен; все11страниц визуально не проверялись. Локальная ProofPilot-проверка ограниченной сводки/арифметики прошла self-review; это не внешняя сертификация/Colosseum-исследование. Тестовый Compose и hostfrontend остановлены; четыре рабочих SAQконтейнера остались running (API/БДhealthy), временные browserвкладки закрыты. Логи/снимки/PDF сохранены ignored; сброс рабочейБД/seed/volumes не выполнялся.

## Короткий блок надёжности · 17.10.2026

Пользователь выделил15–18процентных пунктов лимита на быстро закрываемые задачи. Начало76%used, последнее чтение95%used: суммарный расход19пунктов, на1выше верхней границы; новые работы остановлены. Root — backup/docs/CI/build, отдельные агенты — recovery UI и readonly readiness, пути не пересекались. HEADe993dc8/прежний dirty diff сохранены, без commit/push.

**Закрыто:** URL-импорт хранит jobUUID вquery и восстанавливает GETpoll послеreload/Back/ссылки. НекорректныйID/чужойkind/ошибка чтения обрабатываются явно; новые команды только по действию аналитика. СтарыеPOST/GETответы не подменяют новуюстраницу/выбор; исходныйURL не записывается вstorage/query. Исправлен backup.KEY: поддерживает.html оригиналы с прежнимиpath/size/SHAguards; regression сначала воспроизвёл отказ. Новый stdlib scripts/check_readiness.py проверяетDocker/Linux/Compose/images/4контейнера/APIhealth+БД/storage/Tesseract/PDF/локальныйHTML безизменений/внешнихзапросов/секретов; tests9pass.

**Факты:** backup create/verify успешно: `.local/backups/20261016T221337Z-63f53e7a6c914a1795fdaca07d3a7bcf`; isolated restore24таблицы/1936audit/553Assets/66signals/42срешениями/44READY PDF. Отчёт `.local/restore-checks/20261016T221414Z-6b32eb0c52ce4ff39514d250db350def/result.json` verified=true. Первая незавершённая копия сохранена, рабочие API/worker возобновлены. Readiness `.local/readiness-20261017-final.json`:15PASS/1FAIL(local_auth_config), exit1 ожидаем: действующийHTTPSOrigin/Securecookie блокирует автономныйHTTPвход. Sharing не отключался; офлайн/второйПК не объявлены принятыми.

**Валидация:** tooling unittest37tests/1Windows skip, Ruff check/format4затронутыхscriptfiles passed. Frontend typecheck/scopedESLint/Prettier passed; productionbuild послефинальнойзащитыlatePOST и recreatefrontend с прежнимtunneloverride прошли, Healthy. Backend/БД/APIформы не менялись; полныйbackend711/18 — результат прошлогоэтапа, заново не запускался. Browser recovery tests добавлены; результат текущего прогона фиксируется отдельно, пока не объявляетсяPASS. ДокументыLOCAL_BACKUP/DEPLOYMENT/FEATURE_URL_IMPORT обновлены, readiness добавлен всуществующийCIlint; удалённыйCIне запускался. ДокументныеUTF8/210links/diffcheck прошли доэтойфинальнойфиксации.

**Итог browser:** на обновлённом публичномruntime `npx playwright test tests/open-sources.spec.ts -g 'import|job'` — **6 passed(28.0s)**. Провереныreload/Back/lateGET/invalid/404/явныйretry; прежнийsuccessсценарий повторил4ширины безoverflow и сохранилscreenshots. Новаяручнаявизуальнаяприёмка именно восстановленного состояния не выполнялась. Это уточняет предварительный статус проверки выше.

**Следующий шаг:** коммерческийC-01/positiveOCR+humanRU/KZ/реальныйреестр/UXлюдьми/второйПК остаютсяOPEN. Никакихновыхзадач воставшемсялимите.

## Завершённый этап — новый внешний baseline и rules-1.5 · 17.10.2026

По ответу пользователя «окей гоу» продолжен именно этап качества. Codex root сохранил текущую `main` от HEAD`e993dc8` и прежний dirty diff; commit/push не выполнялись. Независимый от production правил агент (fork без истории, только AGENTS/DATA_SOURCES) подготовил12новых лицензированных информационных HTML6RU/6KZ,10тем/2пары переводов,8новых явно DEMO имён. Его source/label/manifest сохранены до inference, агент правил/старых текстов/tests/predictions не читал. Второй агент проверил методику и реализовал evaluator/URL regression tests в выделенных test-файлах, не читая свежий корпус; root — production/evaluator/docs/runtime.

**Сохранённые измерения:** ignored `.local/publication-quality/fresh-2026-10-17/`. Manifest SHA`ae74d20ba7618d608279dfbc5e06b784fd575151db64a3f98564c38c80aed6ee`; labels SHA`cf68789e14e7673fe3928cc0f605ad14387e5e4bb3f9c507a8a9a9bb7c9de115`. Первый `baseline-rules-1.4.json` создан до просмотра результатов: RU4/6обработаны/TN4, KZ6/6/TN6;2RU URL_NOT_ALLOWED не превращены в true negative. После отдельной проверки robots/footer/layout добавлены только `/ru/news/press/<slug>` и `/ru/news/reviews/<slug>`; `paths-reviewed-rules-1.4.json` дал12/12, RU2FP/4TN, KZ0FP/6TN. После исправления `regression-rules-1.5.json`: RU0FP/6TN, KZ0FP/6TN; TP/FN0, precision/recall и matching top-1/top-3 null, известных targets и положительных рекламных примеров нет. Каждый запуск `run_valid=true`, inputs_changed_during_run=[]; ни один исходный отчёт/оригинал/label не перезаписан. После разбора это regression, не новый независимый holdout и не человеческая приёмка.

**Исправление/решения:** общий UNDER реагировал на отраслевые «строительство/строительных» и отключал ипотечное исключение. Новый узкий PROJECT_CONSTRUCTION в mortgage guard сохраняет явное строительство конкретного дома, название/alias, прямую оплату и платную бронь. `STAGE`, риск/R1–R6/ручные решения/matching не менялись; новые automatic/manual extraction — rules-1.5, старые данные не пересчитываются. Точечные RU-подрубрики сохраняют точный домен/HTTPS/DNS/IP/TLS/redirect/size/deadline; неизвестные/KZ-подрубрики, extra levels/query/encoding/category roots отклоняются. Новых зависимостей, API-форм, миграций или архитектуры нет; дополнительный ADR не требуется.

**Измерительный инструмент:** `scripts/evaluate_publications.py` использует snapshot manifest и pre-inference code SHA, проверяет байты перед parser и изменения manifest/оригиналов/кода после. Изменение даёт run_valid=false и ненулевой exit; ошибки parser остаются missing coverage. Output не перезаписывается до inference и защищён exclusive creation от гонки. Добавлены runtime Python/RapidFuzz, topic groups, matching top-1/top-3 по всем expected targets включая failures и no-target false-candidate rate; acceptance_established=false сохранён. CI lint расширен на этот runner; новый удалённый CI не запускался.

**Фактическая валидация:**

- Полный backend `../.venv/Scripts/python.exe -X utf8 -m pytest -q -rs` из backend — **711 passed,18 skipped (255.51s)**, лог `.local/quality-fresh-backend-final.log`. Пропуски — прежние Linux resource limits/Pango. После уточнения положительных fixtures с настоящим контекстом займа отдельно `pytest -q tests/test_extraction_payments.py tests/test_extraction_names.py tests/test_publication_evaluation.py` — **144 passed (0.38s)**.23evaluator tests включают сохранность baseline при гонке, mutation, знаменатели и переводные группы. URL policy/parser:22pure tests и3DB-сценария в полном прогоне.
- Backend Ruff check и format81files passed; runner Ruff check/format с `--config backend/pyproject.toml` passed. `python -m unittest discover -s scripts -p 'test_*.py' -q` — **27tests, OK/1skip** (26executed); ожидаемое сообщение `ru-01: failed(ValueError)` относится к проверяемому failure-case и не является ошибкой suite.
- Старый неизменный36-case synthetic OCR regression в изолированном Docker `--network none --read-only --cap-drop ALL`, без env/БД/storage: payment16TP/0FP/0FN/16TN, precision/recall100%, image matching24/24, CER157/6311, errors=[], inputs_changed_during_run=[], `--require-targets` exit0. Evidence `output/evaluation/rules-1.5-20261017/run`, лог `.local/quality-fresh-synthetic.log`. Это проверка отсутствия регрессии на изученном synthetic, не настоящая реклама.
- `docker compose build api worker` и recreate толькоapi/worker с прежним `.local/tunnel/compose.json` прошли, оба Healthy. Миграций/пересоздания БД/изменений frontend нет. Публичный HTTPS smoke `.local/verify_publication_quality.py`: два настоящих новых RU-path импорта, originals24919/2364textchars, SHA/private attachment/дедуп, отсутствующий автоматический анализ, затем явный rules-1.5/0PAYMENT, risk_unchanged=true/Secure cookies. Отчёт `.local/publication-quality-runtime.json`. Прежняя ссылка и frontend сохранены. Browser/UI/build frontend заново не запускались: слой представления не менялся.
- OpenAPI0.11.0-mvp JSON разобран,49операций сохранены; уточнены разрешённые формы URL. README/CHANGELOG/OCR_EVALUATION/DATA_SOURCES/FEATURE_URL_IMPORT/REMAINING_CHECKLIST и этот статус обновлены; UTF8/локальные links/diff проверены при завершении. Приватные corpus/reports/runtime script и synthetic output игнорируются Git/Docker. Секреты/внешние сообщения/Oracle/Render не затрагивались.

Финальная проверка документов:19Markdown прочитаны какUTF8,210локальных ссылок — missing=[], fences сбалансированы; `git -c core.safecrlf=false diff --check` passed. Предшествующий пользовательский diff сохранён;114dirty/untracked путей в общем checkout не объявляются изменениями только этого этапа.

**Открыто / точный следующий шаг:** получить один разрешённый настоящий положительный рекламный RU/KZ-набор с оригинальными изображениями и независимой человеческой предметной/KZ-разметкой, заморозить новый holdout до просмотра и измерить пропуски/ложные совпадения/OCR. В текущем12-case наборе только информационные отрицательные материалы одного издателя; 0FP не доказывает recall и не закрывает коммерческий C-01/внешнюю приёмку. Учебный8-name каталог не измеряет полноту реестра. Регулярный сбор, закрытый реестр/автоматическая применимость, UXлюдьми и второй ПК остаются OPEN. Улучшение достигнуто без новой AI-модели; источник позитивных материалов остаётся конкретной границей следующей приёмки.

## Завершённый этап — открытые источники, качество RU/KZ и следующий шаг · 17.10.2026

Пользователь поручил поэтапно закрывать импорт, реальное качество, временные открытые реестры и понятность досье; на вопрос об источнике ответил «Пока нет — продолжай с открытыми публикациями». Реализованы: разрешённый Primeminister.kz (CC BY 4.0) через защищённый URL transport → существующая leased queue → неизменный HTML/SHA + извлечённый текст/атрибуция → отдельный ручной анализ; операторский импорт PDF КЖК → версии/дата среза/поиск по страницам; сводка четырёх вопросов в досье. Коммерческий C-01/расписание/независимый holdout остаются открыты; сведения КЖК не превращаются в ACTIVE/R1/полноту.

Предыдущий запуск прервался до runtime-проверки/docs. Codex root продолжил текущий dirty checkout HEAD e993dc8 без reset/commit/push. Исследования источников, модуль реестра и offline evaluation выполнены агентами с раздельными путями; последняя проверка root: 168 passed/1 Windows skip (URL import, registry, publication evaluation, extraction, contract). rules-1.4 устраняет ипотечные отрицательные примеры и сохраняет явные требования/платную бронь/названия объектов; повторная оценка 1 RU + 1 KZ: FP0/TN1 на язык, precision/recall undefined, это уже regression, не независимый holdout и не OCR. Дата без timezone остаётся null.

**Runtime VERIFIED:** Docker build/recreate api/worker/frontend с прежним HTTPS origin прошли, аддитивные миграции применены. Реальная `.local/verify_open_sources.py` по публичному HTTPS:2RU/KZ публикации (1956/2161символов), оригинальные HTML/SHA/private attachment, повторные jobs вернули те же объявления, отдельный анализ rules-1.4 не создал PAYMENT_TERM; реальный PDF КЖК12стр/02.10.2026, SHA/скачивание/дедуп/page6ASYLYM/no-match, risk_unchanged=true, Secure cookies. Отчёт `.local/open-sources-runtime.json`. Первый PDF smoke выявил proxy413 из-за общего JSON лимита500KB, исправлен точный multipart path5MiB и добавлен настоящий600KB malformed regression (415). Источники/оригиналы/отчёты private ignored.

**Backend окончательный:** полный `pytest -q -rs` — **670 passed,18 skipped (226.62s)**; пропуски Linux/Pango явно перечислены, новая реестровая обработка отдельно прошла реальный Linux API. Предыдущий полный668pass/2fail/18skip выявил зависимость двух новых worker tests от оставшихся чужих queuedjobs в общей disposable-schema; исправлена изоляция приоритета именно их jobs, production queue не менялась. Ruff check/format81files passed. Контракт0.11.0-mvp валиден,49операций:48реализованы/1частична; существующий Threads статус означает реализацию preview, не live-доступ. `docker compose run --rm --no-deps api alembic check` с итоговым образом — No new upgrade operations detected; отдельная регистрация модели в Alembic metadata добавлена явно.

**Frontend:** typecheck/lint/format passed. Полный `SAQ_E2E_BASE_URL=<публичный origin> npm run test:e2e` — **59 passed/1 failed (9.1m)**: единственный отказ `release is not a function` в прежнем Threads fixture — busy появлялся до окончания настоящего CSRF GET и входа в mocked search handler. Тест ждёт handler через expect.poll, код Threads не менялся. После финальных CSS/mobile/topbar/пояснения real-vs-DEMO правок выполнены build/recreate и `npx playwright test tests/open-sources.spec.ts tests/threads-search.spec.ts` — **9 passed (38.8s)**, включая этот отказ и все5новых сценариев. Все60сценариев получили успешный результат в этих прогонах; полного60/60на последней косметической версии не заявляем.

**Визуально:**12проверок375/768/1024/1440 без page overflow повторены на финальной версии, screenshots `output/open-sources/`; просмотрены import1440/375, registry375, dossier375 до/после mobile dl. Реальный in-app browser в отдельной вкладке показал сохранённый PDF02.10.2026 и ASYLYM/page6 с границами. Пользовательская вкладка/введённая фраза не перезагружались. Общая метка уточнена для REAL/DEMO; новый screen-reader/200%zoom/UXлюдьми не выполнялись.

**Файлы/решения:** backend URL import/API/worker/storage/job input, отдельный open_registry/API/model/миграция и Alembic metadata; rules-1.4 и evaluator; frontend import/open-registry/dossier/proxy5MiB, E2E origin helper/tests. Контракт0.11.0-mvp, README/CHANGELOG, FEATURE_URL_IMPORT/FEATURE_OPEN_REGISTRY/DATA_SOURCES/OCR_EVALUATION/ARCHITECTURE/UX/UI/checklist/PLAN/REQUIREMENTS/DEPLOYMENT и ADR-011 обновлены.19Markdown UTF8/207локальныхссылокmissing0, git diff --check passed; новых dependencies и секретов нет, приватные artifacts исключены Git/Docker context. Финальный self-review исправил чрезмерный mortgage filter (сохранены известные названия/строительство/императивы) и повторное использование UI idempotency key после terminal.

Перед миграцией создана приватная копия `.local/backups/20261016T213042Z-a2480db07bf5400584bb0b7300c114da`; это создание, не новая проверка восстановления. Текущая ревизия БД c81d0e5f3472(head), `alembic check` — No new upgrade operations detected. Реестр PDF: источник khc.kz, состояние02.10.2026,12стр,883125bytes; header56 против54нумерованных строк, поэтому полноту не утверждать. Оригинал приватный `.local/open-registry/khc-2026-10-02.pdf`.

**Открыто / точный следующий этап:** получить разрешённые положительные рекламные материалы и новые независимые RU/KZ примеры с человеческой разметкой, затем измерить FN/FP/precision/recall и OCR. Два изученных отрицательных HTML-примера не закрывают эту приёмку. Регулярный сбор/коммерческие площадки, реальная автоматическая сверка по очереди/адресу/дате, внешний UX/domain review и второй ПК остаются OPEN. Приложение обновлено на прежней временной ссылке; новых аккаунтов/внешних сообщений/Oracle/Render/GitHub push не было. HEAD e993dc8+сохранённый dirty diff, без commit; все прежние изменения сохранены.

## Восстановление временной ссылки · 17.10.2026

Текущий адрес: https://stamp-whose-proceeds-budgets.trycloudflare.com. Прежний implications-real-deutschland-being больше не работает: DNS отсутствует, cloudflared сообщал Unauthorized: Tunnel not found после сетевого разрыва, хотя процесс был жив. Выполнены Stop и Start helper, локальная конфигурация восстановлена и затем переключена на новый HTTPS origin. Исправлена гонка чтения пустого log в PowerShell: regex вызывается только при наличии содержимого. Реальный Start после исправления прошёл, API healthy; БД/worker/frontend не перезапускались.

Повторная публичная проверка: login page 200, anonymous registry 401, login 200, registry 200/8 объектов, Secure cookies, invalid origin 403, logout 204. Доказательство обновлено в `.local/tunnel/verification.json`. Stop/Start теперь проверены фактически. Старые URL и проверки ниже — история. Full OCR/PDF и доступ с другого устройства отдельно не проверялись. Пользователь продолжает работу через новую HTTPS-ссылку; пароль в `.local/credentials.txt`, новых аккаунтов нет.

## Завершённый блок — временная публичная ссылка, 16.10.2026

По прямому выбору пользователя запущен Cloudflare Quick Tunnel: https://implications-real-deutschland-being.trycloudflare.com. API использует этот origin и Secure cookies через игнорируемый `.local/tunnel/compose.json`; приватная env сохранена. Пересоздан только API, healthy. БД/worker/frontend и Oracle/Render не изменялись. Auth/CSRF сохранены, новых аккаунтов нет.

Публичная проверка: /login 200, anonymous registry 401, login 200, authenticated registry 200 (8 объектов), Secure cookies, invalid origin 403, logout 204. Форма входа видна в браузере. Доказательство без секретов — `.local/tunnel/verification.json`. Добавлен `scripts/share_site.ps1` Start/Status/Stop; Status и повторный Start проверены без дублирования процесса. Stop/restart не выполнялись. README/DEPLOYMENT обновлены. Полный OCR/PDF по туннелю не повторялся; предыдущие 55 browser tests относятся к локальной сборке. Codex root, HEAD e993dc855da00fd5d65c980caeb53ba139d4ce92, без commit/push.

Ограничения: нужны включённые ПК/Docker/интернет/cloudflared, после перезапуска новый адрес. Во время sharing команды через localhost отклоняются по Origin; Stop восстанавливает локальный API. Следующий шаг — при необходимости отдельный viewer и проверка с другого устройства. Пароли не публиковались. Поиск постоянного хостинга ниже сохранён как история.

## В работе — публичное размещение, 16.10.2026

Пользователь разрешил публикацию и сообщил о наличии Render и Oracle; Oracle выбран для проверки существующей инфраструктуры, без создания платных ресурсов. Подготовлены `docker-compose.public.yml` (HTTPS origin/Secure cookies/restart, frontend остаётся loopback) и `docs/DEPLOYMENT.md`. `PUBLIC_HOST=saq.example.org docker compose -f docker-compose.yml -f docker-compose.public.yml config --quiet` и `git diff --check` passed; это только проверка конфигурации, не deploy. Локальная env/контейнеры не изменялись. Следующий шаг: проверить доступ и ресурсы Oracle, выбрать свободный адрес/порты, отдельно развернуть проект и проверить ссылку извне. Способ доступа посетителей ещё уточняется; auth/CSRF сохранены.

**Текущая проверка Oracle:** SSH с существующим deploy key и StrictHostKeyChecking=yes успешен; x86_64, 952 MiB RAM, около 390 MiB available, swap 0, свободно 21 GiB диска. Четыре LifecycleKASE контейнера работают, API/web/PostgreSQL healthy; 80/443 и loopback 3000 заняты. Локальный SAQ idle: frontend 216.6 + API 130.6 + worker 80.24 + DB 88.59 MiB (около 516 MiB), OCR требует дополнительного запаса. На сервер ничего не загружено/не запущено, конфигурация и соседние сервисы не менялись. Блокер текущего размещения — недостаточный запас RAM: пользователь выбирает другой Oracle, отдельное разрешение на остановку LifecycleKASE с сохранением данных, либо платный Render. Публичной ссылки SAQ пока нет.

## Завершение блока — простой интерфейс по мотивам Awwwards, 16.10.2026

**Поручение:** взять за основу дизайн/структуру Awwwards E-commerce, убрать лишнее и существенно упростить сайт. Исполнитель Codex root, без субагентов. HEAD `e993dc855da00fd5d65c980caeb53ba139d4ce92`, main; ранее существующий dirty diff сохранён, commit/push/внешний deploy не выполнялись.

**Результат:** простой вид по умолчанию, 3 основных раздела вместо 6; белая верхняя навигация; краткий обзор с главным действием и тремя карточками; реестр с поиском и карточками; два обязательных поля ввода текста, URL/дата раскрываются по желанию. Неактивная вкладка URL-импорта удалена. Карта/дополнительные фильтры, KPI, проверка/сигналы/сверка, формы документов/история/создание сигнала доступны через «Инструменты аналитика». Режим хранится локально, не изменяет роль. Переключение сохраняет введённые причины, текст и выбранные файлы. DEMO/UNKNOWN/доказательства/источники/даты и отдельные человеческие решения сохранены. Backend/API/формула/миграции в этом блоке не менялись.

**Референсы:** в браузере просмотрены Awwwards E-commerce, карточка Estudio Niksen и сам магазин. Использованы короткое меню, крупная типографика, спокойные интервалы и каталог. Бренд/изображения/торговые функции не копировались. UI UX Pro Max применён без persist; существующие токены и RU/KZ системные шрифты сохранены, dependencies не добавлены. Superdesign по заявленному пути отсутствовал; реализация выполнена в существующем Next.js проекте.

**Файлы блока:** `frontend/components/workspace.tsx`, `analysis-workspace.tsx`, `legal-basis-review.tsx`, `frontend/app/design-system.css`, `frontend/tests/support.ts`, новый `simple-interface.spec.ts`. Legacy regression helper явно включает подробный вид, новые тесты проверяют настоящий default. Документы: README/CHANGELOG, DESIGN_SYSTEM 1.2, UX_GUIDELINES, UI_COMPONENTS, UI_IMPLEMENTATION_PLAN, UI_AUDIT и этот статус. ADR не требовался: архитектура и API прежние.

**Проверки:** `docker compose build frontend` и `docker compose up -d --no-deps --wait frontend` passed, frontend healthy; API/worker/БД не перезапускались. Первый полный browser run — 53 passed / 2 failed из-за новых test timing/locator; исправления только тестов, focused rerun — 6 passed (17.9s). **Окончательный `npm run test:e2e` — 55 passed (2.7m)** на итоговой production-сборке, включая 49 прежних и 6 новых сценариев. `npm run typecheck`, `npm run lint`, `npm run format:check` — passed. `git diff --check` — passed; восемь обновлённых документов проверены на UTF-8 и локальные ссылки, пропусков нет. Все четыре локальных SAQ-контейнера работают. Backend suite повторно не запускался для presentation-only блока; предыдущие 605 passed/17 skipped относятся к предыдущей проверке. Browser tests создают обычные DEMO записи в локальной базе.

**Визуальная проверка:** 375/768/1024/1440 px для простого обзора/каталога/досье/upload; 16 наблюдений без page overflow, screenshots `output/simple-interface/`. Вручную просмотрены desktop/mobile обзор, mobile досье/upload и живой каталог. Исправлены бледное имя аккаунта и остаточная боковая тень active nav. Тест фактического контраста аккаунта ≥4.5. Подробные границы и исходные неудачные проверки — UI_AUDIT.

**Открыто / точный следующий шаг:** независимая UX-проверка с 3–5 людьми основных двух сценариев, затем правки по наблюдаемым затруднениям. Новые zoom 200%/screen-reader checks не выполнялись. Внешний collector/Threads live access/официальный реестр остаются отдельными открытыми задачами предыдущего блока; редизайн их не подключает. Функции сокращены в основном интерфейсе, данные и экспертные сценарии не удалены.

## Завершённый блок — продолжение незавершённой веб-интеграции Threads, 16.10.2026

Поручение: «войти в контекст и продолжи работу», затем «продолжи работу от туда от куда остановился прежний агент». Свежие файлы оказались новее предыдущего статуса: API/UI/config/контракт Threads уже были написаны, но не были отражены в завершённом блоке. Продолжена именно эта работа, прежний dirty diff сохранён. Исполнитель Codex root, без субагентов; исходный и итоговый HEAD `e993dc855da00fd5d65c980caeb53ba139d4ce92`, main. Commit/push/внешний deploy не выполнялись.

**Результат:** локально проверен отключённый по умолчанию ручной поиск-предпросмотр в `/monitoring`. Две операции status/search, контракт **0.10.0-mvp: 46 операций, 44 реализованы, 1 частична, 1 PLANNED**. Session/analyst/CSRF, один активный запрос на API-процесс и cooldown/Retry-After, предел веб-запроса 10 секунд. Источник не вызывается при просмотре статуса. Выдача временная, не создаёт Advertisement/Asset/кандидат/инцидент, не меняет риск/Signal/Telegram. Живой поиск не VERIFIED: CLI по-прежнему TOKEN_MISSING, веб-панель фактически DISABLED.

**Доработки продолжения:** исправлена гонка фокуса результата (requestAnimationFrame мог сработать до React commit; теперь effect после монтирования). Визуальная проверка обнаружила несуществующие panel-head/panel-body: заменены существующими panel-heading/padded без новых CSS/токенов. Добавлены API-регрессии непустой выдачи по OpenAPI, сохранения даты/текста, dedup/удаления paging-секрета и сброса ACCESS_VERIFIED после отказа; браузерные проверки Enter, восстановления TOKEN_MISSING/TOKEN_INVALID и четырёх ширин. Исправлены четыре import-order нарушения Ruff в затронутых тестах. Второй browser failure был только локатором: во время busy текст кнопки «Идёт поиск…», тест теперь проверяет её актуальное accessible name.

**Файлы блока:** ранее созданные `backend/app/api/threads.py`, `backend/app/config.py`, `backend/app/main.py`, `.env.example`, `contracts/openapi.yaml`, `frontend/components/threads-search.tsx`, интеграция в `monitoring-workspace.tsx`, `backend/tests/test_threads_api.py`, `test_contract.py`, `conftest.py`, `test_threads_search.py`, `frontend/tests/threads-search.spec.ts`. Продолжение изменило фокус/классы в ThreadsSearch, дополнило API/browser tests и восстановило Ruff-порядок imports; остальные ранее написанные функции сохранены.

**Фактическая валидация:**

- Из backend `../.venv/Scripts/python.exe -X utf8 -m pytest -q -rs` — **605 passed, 17 skipped, 197.59s**. Пропуски: Linux resource limits/Pango на Windows. Исходный focused transport/API/contract — 175 passed; после добавления регрессий API — 18 passed. Сеть Threads в тестах подменена/запрещена.
- Из корня `.venv/Scripts/python.exe -m ruff check backend/app backend/tests backend/alembic` и `ruff format --check` — passed, 72 файла. Явный `--config` из корня меняет определение first-party imports и давал ложный массовый diff; финальный запуск соответствует существующему CI, без этого override.
- Из frontend `npm run typecheck`, `npm run lint`, `npm run format:check` — passed; `docker compose -f docker-compose.yml -f docker-compose.dev.yml build api frontend` и отдельные frontend rebuild после исправлений — passed. Финальная production-сборка содержит `/monitoring`.
- `npm run test:e2e` — **49 passed (1.6m)**, включая настоящий OCR/PDF/ручные решения/monitoring и четыре Threads tests. Этот полный прогон был после исправления фокуса; после последующей замены только двух presentation classes выполнен `npx playwright test tests/threads-search.spec.ts` — **4 passed (9.7s)** и frontend checks. Полный прогон после двух классов не повторяли.
- Threads: реальный DISABLED, без search request; отдельно presentation mocks для успешной/пустой выдачи, ошибки, инертного HTML-текста, восстановления подключения. На 375/768/1024/1440 scrollWidth ≤ viewport для DISABLED и результатов. Итоговые screenshots `output/threads-preview/results-{375,1440}.png` визуально просмотрены; ранее просмотрен DISABLED mobile. Keyboard Enter → focus на результате подтверждён. Новый zoom 200%/screen reader/внешняя UX-приёмка не выполнялись.
- API/frontend локально пересозданы с `up -d --no-deps --wait`; worker и БД не перезапускались. До запуска Alembic уже был `b26f105d7c41 (head)`; итоговый `docker compose ... exec -T api alembic check` — No new upgrade operations detected. Новых миграций/зависимостей нет. Browser-набор добавляет обычные DEMO-материалы/решения; тестовые ответы Threads в БД не сохранялись.
- `git diff --check` passed. `.env`/токены не изменялись, внешних запросов Threads/сообщений/публикации не выполнялось.

**Документация/решения:** синхронизированы README, CHANGELOG, FEATURE_THREADS_SEARCH, ARCHITECTURE, PLAN, REMAINING_CHECKLIST, MONITORING_ALGORITHMS, UI_COMPONENTS, UX_GUIDELINES, UI_AUDIT. Описаны раздельные CLI/server token settings, настройка/timeout, временность preview, отсутствие гарантии idempotency, process-local quota и потеря статуса при рестарте. Применены Implement Feature и проектный UI UX Pro Max: recovery/role=alert, существующие компоненты/токены; новый дизайн/зависимости/ADR не требовались.

**Финальный контроль документов:** 11 документов прочитаны UTF-8, 168 локальных ссылок без пропусков, fences сбалансированы. OpenAPI разобран: 0.10.0-mvp, 46 операций. `git diff --check` passed; `.env`, CLI token path и output screenshots игнорируются Git. Четыре локальных SAQ-контейнера работают, API/БД healthy.

**Точный следующий шаг и блокер:** нужен токен официального Meta-приложения с фактическим `threads_keyword_search`; секрет только в игнорируемый локальный файл/серверную `.env`, не в чат. Выполнить один bounded запрос, подтвердить реальные поля/доступ/лимиты и условия хранения, затем реализовать доказательственное сохранение/дедуп/аудит и ручной запуск анализа. До этого не включать расписание и не объявлять C-01 закрытым. REAL-реестр, другие три канала, внешний OCR holdout и предметная приёмка остаются OPEN. Перед несколькими API workers нужны общий quota/lease и правила аудита/retention.

## Завершённый блок — исследование источников и Threads access spike, 16.10.2026

Поручение: «поищи инфу в интернете и в источниках и начни работу». Прочитаны свежие status/Git, инструкции, требования/план/архитектура, контрактный объём и ADR-008; применён Implement Feature. Состояние `main e993dc8` с прежним dirty diff сохранено, новых агентов в этом блоке не запускали, commit/push/deploy не выполнялись.

**Реализовано:** отдельный `backend/app/threads_search.py` и `scripts/search_threads.py`: offline status, один официальный keyword запрос TOP/RECENT, bounded response/deadline, проверка полей/дат/ссылок, dedup/конфликт, приватный отчёт с происхождением/хешем. Токен только `.local/threads-access-token.txt` → stdin → Bearer, ни URL, ни argv, ни raw error. Фиксированный graph.threads.net, reuse существующей DNS/IP-pinned TLS защиты, redirects/proxy/media/paging не исполняются. Новых dependencies/БД/API/UI/config изменений нет; основной runtime не перезапускался. Детали — [FEATURE_THREADS_SEARCH](../FEATURE_THREADS_SEARCH.md).

**Фактически проверено:** из backend `../.venv/Scripts/python.exe -X utf8 -m pytest -q tests/test_threads_search.py tests/test_url_fetcher.py` — **157 passed (2.68s)**; Ruff новых трёх Python-файлов passed. Первый прогон из корня дал 152 passed/один failure существующего subprocess-теста из-за cwd; правильный повтор из backend прошёл. Первоначальные lint import-order нарушения устранены, финальная проверка с `--config backend/pyproject.toml` passed. Live CLI `status` возвращает TOKEN_MISSING, токен/credentials не выдумывались и в сеть не передавались. Unit network запрещён. Предыдущий полный 543/17 и 45 browser не выдаётся за приёмку нового источника; UI/build/full backend повторно не нужны для не подключённого к runtime модуля и не запускались.

**Исследование:** официальный Threads endpoint/params подтверждены; Meta docs 429, app-review/квоты/TAG ещё неизвестны. Instagram — hashtagged media через Facebook Login/Professional+Page, общий keyword не подтверждён. TikTok Commercial API показывает EU/EEA, не KZ. Krisha п.5.3 требует письменный доступ. Через браузер наконец прочитан паспорт Ashyq и обнаружен CSV 1.1 MiB от 12.10.2026 с объектами долёвки/номерами разрешений/хешированными БИН; фактический HTTPS download заблокирован ошибкой проверки сертификата. Данные не скачаны, TLS не ослаблялся. Эти результаты и точные источники добавлены в [DATA_SOURCES](../DATA_SOURCES.md).

**Финальный контроль:** Ruff check/format трёх новых Python-файлов и `git diff --check` passed; восемь документов UTF-8, 126 локальных ссылок без пропусков, fences сбалансированы. Проверено игнорирование token/result paths. Повторный CLI status — TOKEN_MISSING, ожидаемый exit 2, сетевого обращения нет.

**Следующий шаг/блокеры:** получить Meta token/app с threads_keyword_search и выполнить один живой запрос, проверить ответ/permissions/limits, после этого включать доказательственное сохранение и интеграцию с сайтом, затем профили/пагинацию/расписание. User async вопрос о наличии Meta-доступа остаётся без ответа на момент фиксации; отсутствие ответа не даёт доступ. Ashyq требует исправного HTTPS либо предоставленного CSV и проверки схемы/лицензии/покрытия. REAL-реестр, полный C-01 и живые четыре канала остаются OPEN; raw search report не является Advertisement/Asset/инцидентом/R1. Документы README/CHANGELOG/PLAN/REMAINING_CHECKLIST/MONITORING_ALGORITHMS дополнены текущей границей.


## Завершённый блок — ручная DEMO-сверка и предварительные карточки VERIFIED, 16.10.2026

По поручению «гоу начнем реализовывать» завершён первый связный срез [MONITORING_ALGORITHMS](../MONITORING_ALGORITHMS.md): сохранённая публикация → независимый кандидат объекта → неизменяемая DEMO-версия списка → объяснимая историческая сверка → предварительная карточка → ручное решение/история. Доступен `/monitoring`, пункт «Сверка» и переход из оригинала публикации. Применены Implement Feature и repo UI UX Pro Max с действующим DESIGN_SYSTEM; generic Hero-рекомендация отклонена как не относящаяся к рабочему месту, точечный recovery-поиск применим.

**Границы VERIFIED:** проверен локальный ручной/DEMO-срез. Krisha/Threads/Instagram/TikTok, регулярный поиск/слова/теги, OAuth, автоматическое выделение полной идентичности, video/ASR, REAL-реестр и incident Telegram не подключены. Отсутствие доступа даёт REGISTRY_UNAVAILABLE (ожидание реестра), отсутствие применимой строки в пригодном полном DEMO-списке создаёт только предварительную карточку. REAL/DEMO разделены. Риск/R1–R6, текущие Signal и factor Telegram не меняются; внешняя предметная приёмка не заменяется тестами.

**Код/контракт:** `backend/app/monitoring.py`, `monitoring_dto.py`, `api/monitoring.py`, аддитивные models/main, `backend/tests/test_monitoring.py`, контрактные read-model проверки, миграция `b26f105d7c41` поверх `a91b76f2c305`. Восемь новых операций по шести путям; OpenAPI 0.9.0-mvp (44 операции: 42 реализованы, одна частична, collector PLANNED). `frontend/app/monitoring/`, `components/monitoring-workspace.tsx`, `lib/monitoring-types.ts`, `tests/monitoring.spec.ts`; существующие workspace/nav/mobile grid расширены минимально. Документы: [FEATURE_MONITORING_CASES](../FEATURE_MONITORING_CASES.md), [ADR-010](../decisions/ADR-010-preliminary-monitoring-cases.md), README/CHANGELOG/ARCHITECTURE/REQUIREMENTS/PLAN/REMAINING_CHECKLIST/MONITORING_ALGORITHMS/UI_COMPONENTS/UX_GUIDELINES/UI_AUDIT.

**Решения и review:** существующие auth/CSRF/Command/audit и PostgreSQL, без новых зависимостей/сервисов. Кандидат не требует фиктивных Property/Developer; неполная идентичность не объединяется по одному названию. Версии списка/сверки неизменяемы; гарантии и разрешения альтернативны, область и дата проверяются отдельно. Candidate lock и уникальность активной карточки защищают параллельные команды; expected_revision защищает решения. Независимый read-only review обнаружил конфликт ACTIVE/REVOKED одного документа: снимок теперь отклоняется до записи независимо от порядка, добавлены регрессии. Согласован порядок блокировок candidate → advertisement и candidate → incident. Новое совпадение не закрывает старый case без аналитика. Первый browser-прогон обнаружил ошибку exact-label селектора native select; исправлены только три тестовых локатора на accessible combobox, UI менять не потребовалось.

**Фактические проверки:**

- `../.venv/Scripts/python.exe -X utf8 -m pytest -q -rs` из backend — **543 passed, 17 skipped, 197.17s**; пропуски Windows относятся к Linux resource limits/Pango. В составе 29 monitoring-тестов: шесть исходов, применимость/город/очередь/даты, DEMO/REAL, дубли документа, auth/CSRF, конкурентность/idempotency, stale/rollback, новая версия/expiry и неизменность факторов/Signal/Telegram. Лог `.local/monitoring-backend-final.log`.
- Ruff check `app tests alembic` passed; format check 68 файлов passed. Frontend `npm run typecheck`, `npm run lint`, `npm run format:check` passed; дополнительный scoped прогон после исправления селекторов также passed.
- `docker compose -f docker-compose.yml -f docker-compose.dev.yml build api worker frontend` passed; локальный frontend `npm run build` passed, маршрут `/monitoring` включён. Затем `up -d --no-deps --wait api worker frontend` passed; рабочие SAQ-сервисы подняты с новой версией.
- До миграции `scripts/backup_local.py create` создал согласованную копию БД/storage: `.local/backups/20261016T141439Z-4d3597574cd74cf8903a1604092063f5`. Сразу после миграции fingerprints подтвердили **16 прежних прикладных таблиц без изменений, шесть новых пустых**, изменена только версия Alembic. Доказательство `.local/monitoring-migration-proof.json`; `docker compose exec -T api alembic check` — No new upgrade operations detected. Восстановление именно этой копии в этом блоке не запускалось; прежняя restore-проверка остаётся историческим результатом.
- `npx playwright test tests/monitoring.spec.ts` — **2 passed (6.5s)**; затем `npm run test:e2e` — **45 passed (1.4m)**. Первый новый тест использует настоящий API/БД и проверяет недоступный реестр → пустой полный DEMO-список → case/dedup → ожидание → новая версия с документом → ручное закрытие/история/неизменный риск. Второй — явные presentation mocks ошибок/задержки/фильтров/инертного текста. Лог `.local/monitoring-browser-final.log`.
- `node .local/monitoring-visual.mjs` — 375/768/1024/1440: scrollWidth равна ширине viewport, шесть nav links, pageerror=0, reduced-motion 0.00001s. Enter на anchor фокусирует раздел; native details открывается/закрывается клавиатурой, соседний несохранённый черновик сохраняется. Скриншоты 375/1440 просмотрены; `output/monitoring/`. Новый zoom 200%, screen reader и внешняя UX-приёмка не выполнялись; старые проверки не приписываются новому экрану.

**Финальная проверка документов:** `git diff --check` passed; 13 изменённых документов прочитаны как UTF-8, 164 локальные ссылки — missing=0, fences сбалансированы. JSON OpenAPI 0.9.0-mvp разобран: 44 операции, восемь monitoring. Проверено игнорирование `.env`, файла токена, приватных proof/log и скриншотов. Это проверка затронутого объёма, не полный security audit.

**Сохранность и исполнитель:** Codex root + ранее запущенные backend/frontend-агенты по непересекающимся writable paths, read-only review алгоритма. Исходная `main e993dc8`, прежний пользовательский dirty diff сохранён. Commit/push/внешний deploy не выполнялись. Резервная копия предшествует миграции и browser-тестам; тесты добавили только явно DEMO-материалы/версии/решения через обычные API, включая сохранённый промежуточный тестовый case. Telegram runtime сохранил enabled=true/include_demo=false, новый monitoring не отправлял сообщений. Secrets/env/backups/логи остаются игнорируемыми.

**Точный следующий шаг:** подтвердить доступ одного реального разрешённого рекламного источника (Threads access spike либо предоставленный API/экспорт), реализовать адаптер и фактическое сохранение оригинала, затем профиль слов/тегов, расписание/checkpoints/квоты. REAL-сверка ожидает предоставления и приёмки реестра после победы. C-01, внешний holdout, UX/предметная приёмка и второй ПК остаются OPEN. Коррекция/merge/split идентичности и Telegram для preliminary cases — отдельные последующие функции.

## Предшествующий блок — проектирование регулярного мониторинга, 16.10.2026

Пользователь уточнил новую цель: искать рекламу Krisha/Threads/Instagram/TikTok по ключевым словам/тегам, анализировать, сравнивать с утверждённым списком, при отсутствии создавать инцидент. На уточнение ответил: **реестр существует, доступа сейчас нет; он ожидается при победе**. Поручение «продолжить» относится к проработке алгоритмов. Реализация нового мониторинга/инцидентов не начата; текущие контракт/код/конфигурация/БД/работающий Telegram не менялись. Локальная main от e993dc8, прежний незакоммиченный diff сохранён, commit/push/deploy не выполнялись.

Создан [MONITORING_ALGORITHMS](../MONITORING_ALGORITHMS.md), статус PROPOSED: поиск по возможностям каждого источника, RU/KZ query-профили/классификация, версии/дубликаты/checkpoints, объект-кандидат вне имеющегося каталога, сопоставление имени/адреса/города/очереди/БИН, временная/областная сверка, предварительный incident lifecycle и отдельная приёмка реестра после доступа. Предложены WAITING_REGISTRY для REAL до доступа и изолированная DEMO-сверка; отсутствие строки не становится R1/юридическим выводом, веса и ручные guards сохраняются. Предварительная PROVISIONAL-идентичность может дать автоматическую карточку; подтверждённая связь для существующего evidence/R1/Signal остаётся ручной. Дедуп наблюдений отделён от повторной сверки при новом реестре, canonical merge/split и история описаны. Новая incident-модель/API/Telegram event types пока не реализованы и явно отделены от текущих Signal/factor outbox.

Два независимых read-only исследования выполнены параллельно по непересекающимся площадкам (основание — разные внешние API/условия). Проверены официальные Meta/Postman, TikTok docs и Krisha terms: Threads keyword search существует, Instagram Facebook Login описывает hashtagged media, общий keyword search не подтверждён; TikTok Research имеет ограничения eligibility/доступа/задержки, Krisha требует разрешения. Реальных API-запросов с credentials, импорта публикаций, login/CAPTCHA bypass и контактов с площадками не было. Часть Meta docs дала ограничения чтения, Postman напрямую вернул оболочку/not found, официальная поисковая индексация дала метод; точные квоты/scopes/app-review условия остаются UNKNOWN до access spike. Links/границы зафиксированы в документе, не обещаны четыре live-канала к 21 октября.

Отдельный read-only review алгоритма против текущих models/extraction/legal/notifications выявил и помог устранить три пробела проекта: early-return на unchanged блокировал новую сверку; предварительный target был неявно заблокирован ручным подтверждением; не был определён merge двух активных карточек. Исправлены только тексты алгоритма. Уточнены README/REQUIREMENTS/PLAN/REMAINING_CHECKLIST/DATA_SOURCES/FEATURE_URL_IMPORT, добавлено последующее примечание в исторический CUSTOMER_MEETING_QUESTIONS; предыдущие результаты/протокол сохранены. Проверки UTF-8/локальных ссылок/diff при завершении записываются отдельно; новые runtime/tests/build/browser в этом проектировании не запускались. Предыдущие 514/17 и 43 browser остаются результатами предшествующего блока, не проверкой новых алгоритмов.

**Проверка документации:** `git diff --check` passed (только существующие уведомления CRLF→LF), 9 затронутых Markdown прочитаны как UTF-8, 136 локальных ссылок — missing=0, fences сбалансированы. Mermaid-схема отдельно не рендерилась; браузерная/предметная приёмка нового проекта не выполнялась.

**Точный следующий шаг:** по предложенной очередности реализовать отдельные DEMO-кандидат/предварительный case и версионную сверку с приёмкой шести сценариев, затем один реальный разрешённый источник. Регион/частота/полное видео/ведомственный смысл инцидента ещё уточняются; краткий план первого блока дан в §11. После фактического доступа обследовать и принять контракт/покрытие/даты реестра, затем включать REAL-сверку. C-01, внешняя независимая приёмка и второй ПК остаются OPEN; автоматический R1 по not-found не вводится.

## Завершённый блок — исправления Dashboard и rules-1.3 VERIFIED, 16.10.2026

Пользователь согласовал ближайший блок («окей гоу»): исправить счётчик новых публикаций и конкретный пропуск условия оплаты, пока C-01 зависит от источника. Codex, локальная main от e993dc8; прежний UI/URL/history/Telegram diff сохранён. Dashboard и его новый тест выделены отдельному агенту с непересекающимися writable paths; основной агент реализовал extraction/версии, интеграционные/browser-регрессии и docs. Новый ручной сценарий PAYMENT_TERM, реестры и collector не добавлялись.

**Реализовано:** Dashboard new_advertisements считает только NEW с прежними фильтрами; независимая query для latest pending не сужается. Уточнено описание поля в OpenAPI без изменения формы DTO. `rules-1.3` распознаёт перевод с суммой для закрепления квартиры в RU/KZ, включая мягкие переносы; контекст назначения ограничен 120 символами до/после глагола. Проверяются отрицание назначения/необходимости, предупреждение, история, ноль и посторонний перевод; пустая строка остаётся границей. Гипотеза сохраняется как PENDING с исходными spans/суммой. Проверка гипотезы/привязки/доказательства/R2 по-прежнему отдельная, баллы не начисляются от одного анализа или доказательства. Новая версия записывается для обычного анализа и ручной расшифровки; старые extraction/решения/сигналы не пересчитываются, повторный анализ явный. Формула, роли, схема БД и зависимости не менялись; ADR не требуется.

**VERIFIED:** Dashboard regression до фикса — 5 failed/4 passed (9 вместо 5 NEW в основном случае), после фикса `pytest -q tests/test_dashboard.py tests/test_api.py` — **19 passed (13.54 s)**. Первые 5 новых положительных extraction-примеров падали до фикса; независимый review нашёл ещё 3 отрицания назначения и 2 мягких переноса, воспроизведены 5 failed/22 passed и исправлены. Финальный pure `pytest -q tests/test_extraction_payments.py tests/test_extraction_names.py` — **101 passed**. Итоговый полный Windows `..\.venv\Scripts\python.exe -X utf8 -m pytest -q -rs` из backend — **514 passed, 17 skipped (146.72 s)**; пропуски прежние: 2 Linux resource limits, 1 Pango и 14 supporting-PDF unit cases. API-регрессии проверяют новые RU/KZ гипотезы, отдельную проверку/доказательство и неизменность риска. Первоначальный полный прогон 507/17 предшествовал 7 edge cases и не выдан за итоговый.

Ruff check/format app/tests/alembic — passed, **63 files already formatted**. Первая слишком широкая команда включала неизменённый scripts/configure_telegram.py под backend-конфигурацией и дала E402/import-order/quote-format замечания вне текущего scope; скрипт не переформатирован, это не новое поведение бота и не часть заявления о backend lint. Финальные frontend `npm run typecheck`, `npm run lint`, `npx prettier --check tests/workspace.spec.ts tests/analysis.spec.ts` — passed. Код UI/дизайн не менялся, новый frontend build/ручной визуальный аудит не повторялись; обновлены только две browser-регрессии.

Финальные Docker build api/worker и `docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --no-deps --wait api worker` — passed; пересозданы только эти SAQ services, БД/volumes/frontend сохранены. Worker сообщает `tesseract-rus-kaz-eng+rules-1.3+rapidfuzz-1`, `alembic check` — No new upgrade operations detected. На этой сборке полный `npm run test:e2e` — **43 passed (1.3m)** с реальными OCR/сигналом/PDF/историей; путь R2 использует исправленную фразу и отдельные решения. Dashboard browser проверяет число и переход NEW. Дополнительная живая read-only API сверка после прогона: **Dashboard 40 = NEW list total 40**, всех материалов 183. Telegram status после E2E: enabled=true/include_demo=false/counts={}, тестовой авторассылки не было.

Повторён неизменённый 36-case synthetic OCR regression в Docker без сети/env/БД/storage: payment 16 TP/0 FP/0 FN/16 TN, image matching top-3 24/24, errors 0, proposed_targets_met=true, inputs_changed_during_run=[]. Evidence `output/evaluation/rules-1.3-final-20261016T165330`, детали в OCR_EVALUATION. Это прежний изученный набор, не внешний holdout. Приватные логи: `.local/correctness-{backend-final,build-final,browser-final,evaluation-final}.log`. Независимый финальный read-only review перепроверил 8 edge/control сценариев и spans, новых блокирующих дефектов не обнаружил.

Файлы блока: backend/app/api/properties.py, extraction.py, worker.py (только версия поверх прежней Telegram-интеграции); новый tests/test_dashboard.py, tests/test_extraction_payments.py, tests/test_analysis.py; frontend/tests/workspace.spec.ts и analysis.spec.ts; описание поля contracts/openapi.yaml. Обновлены README/CHANGELOG, ARCHITECTURE/OCR_EVALUATION/PLAN/REMAINING_CHECKLIST и примечание к историческому CUSTOMER_MEETING_QUESTIONS. Формат/UTF-8/локальные ссылки проверены при завершении. Новых secrets, commit/push/deploy нет; текущий diff не проверен удалённым CI.

**Точный следующий шаг:** разрешённый рекламный HTTPS URL и условия для C-01 → фактический sample/парсер/storage/jobs/UI/recovery. Если источник пока не предоставлен, подготовить новый независимый RU/KZ holdout и человеческую проверку по существующей методике. Право ручного добавления отсутствующего PAYMENT_TERM, внешняя UX/предметная приёмка, второй ПК, официальный реестр и универсальное сравнение остаются OPEN. DEMO-уведомления не включать ради обычных тестов.

## Предыдущая сверка — функциональные исправления при блокере C-01, 16.10.2026

По просьбе пользователя «продолжаем…что нам нужно ещё по сайту» повторно сверены Git (`main`, HEAD e993dc8, прежний dirty diff сохранён), README/requirements/plan/checklist, UI-документы, контракт и актуальные API/компоненты. Независимый read-only просмотр подтвердил: `backend/app/api/properties.py:100–119` считает все публикации в new_advertisements, а `frontend/components/workspace.tsx:556–565` подписывает KPI как новые/ожидающие анализа и ведёт в NEW. Чистый вызов extractor подтвердил пропуск PAYMENT_TERM для «Перечислите 500 000 тенге для закрепления квартиры за вами»; ручное создание отсутствующей гипотезы не реализовано (`api/analysis.py:258–261`, `api/reviews.py:359–369`). Исправление словаря и KPI доступны команде; полномочие нового ручного сценария остаётся вопросом заказчику №8. AST-просмотр API не нашёл import-url; контракт помечает его PLANNED, один защищённый transport не закрывает C-01.

Обновлены только PLAN/REMAINING_CHECKLIST/этот статус: Telegram больше не обозначен ожидающим BotFather; добавлены два конкретных внутренних исправления. UI UX Pro Max использован для точечной сверки recovery/error feedback; рекомендации не заменяют проектную дизайн-систему. Код/БД/конфигурация/сеть не менялись, новые тесты и браузер в этой сверке не запускались. Следующий самостоятельный шаг — KPI и словарный пропуск с регрессиями; C-01 остаётся первым открытым расширенным P0, ожидает разрешённого рекламного URL. Затем независимая приёмка, один реестр и сравнение источников; поиск/глобальная сортировка/очередь — последующие улучшения. Commit/push/deploy не выполнялись.

## Завершённый блок — Telegram-уведомления; личный канал VERIFIED, 16.10.2026

Исполнитель Codex, локальная `main` от `e993dc8`, весь прежний UI/URL/history diff сохранён. Пользователь явно поручил «уведы в телегу…создадим бота», затем сохранил токен и нажал Start по одноразовой ссылке. 16.10.2026 выполнены живые `configure_telegram.py check`, `pair`, `complete`, `test`: Telegram подтвердил бота **@SaqQurulusbot**, установленного webhook нет; личный чат проверен и привязан. Первый complete до Start не находил чат; повтор после действия владельца успешен. Приветствие и отдельный DEMO-тест приняты Bot API, **владелец подтвердил получение обоих сообщений**. Токен, код привязки и ID чата в документах не сохранены. Для независимой read-only проверки pairing/transport/outbox использован субагент без доступа к приватным файлам и сетевым вызовам; основание — проверка границ перед отправкой в реальный чат. Commit/push/внешний deploy не выполнялись.

**Живое подключение VERIFIED, 16.10.2026 около 16:32 UTC+5:** `docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --no-deps --force-recreate --wait api worker` завершился успешно; пересозданы только api/worker для применения приватной env. В обоих контейнерах Settings показывают enabled=true/include_demo=false/paired=true; API `/health` — 200, worker запущен. Локальный CLI status: enabled=true/include_demo=false/counts={}, исторической рассылки нет. `.env`, token и pairing файлы проверены через git check-ignore. В этом продолжении изменены только приватная конфигурация и текущие docs; новые исходники не менялись, полные тесты повторно не запускались. Живой test проверяет транспорт и получение, а не создаёт фактор и не проходит очередь: бизнес-триггер/outbox проверены автоматическими тестами ниже. DEMO-авторассылка остаётся выключенной, доставка требует работающего локального worker.

**Реализовано:** новое ручное CONFIRMED R1–R6 → транзакционный `telegram_notifications` outbox с уникальным factor/revision → существующий worker отправляет вне транзакции. Снимок содержит DEMO/объект/фактор/серверный балл/зону, дату оценки и время проверки UTC+5, event ID; свободные причины/PII/PDF не отправляются. Повтор CONFIRMED не создаёт новое событие, backfill нет; DEMO требует отдельного opt-in. Получатель закреплён, смена bot/chat или отозванный фактор отменяют отправку. 429/backoff/max attempts, cooldown канала; UNKNOWN после timeout/некорректного ответа/истёкшего lease не повторяется автоматически. Поздний worker не заменяет новое состояние. Транспорт — фиксированный Telegram HTTPS, TLS, без proxy/redirect/parse_mode/preview, bounded response, безопасные коды ошибок.

**Подключение/управление:** `scripts/configure_telegram.py` — check/pair/complete/test/status/retry/disable. Случайный одноразовый код на 10 минут, только private chat с совпавшим sender, без forwarded/via-bot; простого /start недостаточно. В .local хранится hash pairing code, токен — в игнорируемом файле/приватной .env, SecretStr; настройки пишутся атомарно, чужой webhook не удаляется. Retry UNKNOWN требует --allow-unknown и допускает дубль. Это бот уведомлений без runtime-команд, групп, многоадресных подписок, GUI, новой службы Windows или внешнего деплоя. Внешнее хранение данных для ведомственного пилота требует отдельного согласования.

**VERIFIED на финальном коде:** из backend `..\.venv\Scripts\python.exe -m pytest -q tests/test_telegram.py tests/test_contract.py tests/test_appeal.py` — **34 passed (13.92 s)**. Полный `..\.venv\Scripts\python.exe -m pytest -q -rs` — **476 passed, 17 skipped (133.94 s)** на Windows; пропуски 2 Linux resource limits, 1 native Pango и 14 supporting-PDF unit cases. Автотесты запрещают live Bot API; conftest дополнительно выключает Telegram даже при будущем локальном подключении. Проверены API-триггер/уникальность/rollback, два worker/fencing/lease, known failure/UNKNOWN/429/cooldown/limit, смена получателя, Unicode/limit/secret masking, private/one-time pairing и сохранность env. Первоначальный API-тест Telegram оставлял новый R4 перед старым тестом создания — исправлена уборка только созданного в test schema фактора, без изменения предметного кода.

Docker build api/worker passed, пересозданы только эти SAQ services. До миграции создан согласованный snapshot `.local/backups/20261016T110742Z-9d83c314bfbb49f79e09b6dd21b75392` после завершения тестов; более ранний черновой snapshot при параллельном изолированном прогоне не использован как доказательство. Новый restore-прогон не выполнялся. Миграция `a91b76f2c305` добавила одну таблицу: **17 public tables**, включая alembic_version. `.local/telegram-migration-proof.json`: хеши/количества всех **15 прежних прикладных таблиц совпали**, telegram rows=0; изменена только версия Alembic и добавлена пустая таблица. `docker compose exec -T api alembic check` — No new upgrade operations detected. БД/volumes не пересоздавались, другие проекты не затронуты.

Полный `npm run test:e2e` на обновлённом runtime — **43 passed (1.2m)**, включая реальный OCR, R1–R6, сигналы/PDF и историю. Frontend-код/дизайн в этом блоке не менялись, UI build/typecheck не повторялись. Ruff check/format backend/app/tests/alembic и configure_telegram — passed (63 files); git diff --check passed. Приватные логи: `.local/telegram-backend-final.log`, `.local/telegram-build-final.log`, `.local/telegram-browser-final.log`, `.local/telegram-pre-migration-backup.log`. Linux unit suite/живой Bot API/удалённый CI не запускались; browser PDF/OCR использовал Linux-контейнеры. Технические проверки не являются предметной приёмкой или Telegram read receipt.

Файлы блока: backend/app/config.py, models.py, api/reviews.py, worker.py; новые app/telegram.py, app/notifications.py; миграция a91b76f2c305; tests/conftest.py и новый tests/test_telegram.py; scripts/configure_telegram.py, .env.example; contract reviewRiskFactor description (новых endpoints нет). Документы: FEATURE_TELEGRAM, ADR-009, README/CHANGELOG/ARCHITECTURE/REQUIREMENTS/PLAN/REMAINING_CHECKLIST, ссылка из FEATURE_PROPERTY_HISTORY, этот статус. Новых dependencies нет; формула/роли/guards/OCR/исторические snapshots не менялись.

Независимая read-only проверка `scripts/configure_telegram.py`, `app/telegram.py`, `app/notifications.py`, `tests/test_telegram.py` и FEATURE_TELEGRAM завершена: блокирующих дефектов для текущего подключения не обнаружено; приватные файлы, сеть и тесты субагентом не использовались. Это дополнительный просмотр кода, не подтверждение доставки.

**Точный следующий шаг:** подключение личного Telegram завершено; при работе с реальными материалами новые подтверждённые R1–R6 попадут в очередь. Для отдельного контролируемого показа на DEMO при необходимости явно включить TELEGRAM_INCLUDE_DEMO и применить env только api/worker; не включать DEMO-авторассылку ради обычных browser-тестов. Основной следующий этап по согласованному плану — получить конкретный разрешённый рекламный HTTPS URL и условия для C-01, затем sample/parser/storage/jobs/retry/UI и проверка настоящего импорта. Независимое качество, реестры/сравнение и пилотная приёмка остаются отдельными задачами.

## Предыдущий блок — история объекта, 16.10.2026

Исполнитель Codex, локальная `main` от `e993dc8`. Пользователь согласовал продолжение после обсуждения истории/уведомлений/сравнения/UI. По согласованному порядку повторно проверен C-01: рекламного источника с разрешением по-прежнему нет; пользователь повторил 11 реестровых ссылок, уже включённых в DATA_SOURCES. Свежий web-read Ashyq/Homeportal вернул JS-оболочки; паспорт/экспорт/актуальность набора не установлены. Регистры не выданы за разрешённую рекламу. Пока блокер сохраняется, завершён отдельный блок истории объекта. Субагенты, commit/push/deploy не выполнялись; весь прежний незакоммиченный UI/URL diff сохранён.

**Реализовано:** общий `PropertyHistory` в досье и раскрываемом журнале review, понятные события/причины/авторы, сохранённые переходы статусов, код/смысл фактора и ссылки к материалам/основаниям/сигналам. Серверная пагинация по 10, `history_page` в URL, сохранение registry/материала и несохранённого ввода соседних форм, keyboard/focus, loading/empty/error/retry. Старые события не показываются под другой страницей/ошибкой. Существующий audit DTO дополнен текущим `actor_display_name` и `risk_code`, контракт обновлён явно; пакетные lookup без N+1. Новых таблиц/миграций/dependencies нет. Баллы/роли/правовые guards/snapshots не менялись. Историческое имя автора и произвольный прошлый балл не реконструируются.

**VERIFIED:** focused backend `..\.venv\Scripts\python.exe -m pytest -q tests/test_property_history.py tests/test_analysis.py tests/test_contract.py` из backend — **59 passed (31.47 s)**. Полный Windows `..\.venv\Scripts\python.exe -m pytest -q -rs` — **451 passed, 17 skipped (145.39 s)**; 2 Linux resource limits, 1 native Pango и 14 supporting-PDF unit cases не запускались в Windows. `npm run typecheck`, `npm run lint`, `npm run format:check` — passed; Ruff check/format — passed (58 файлов). Production Docker build api/worker/frontend и финальная frontend build passed; обновлены только эти SAQ services, БД/volumes не пересоздавались. Полный `npm run test:e2e` на финальной сборке — **43 passed (1.3m)**, включая реальные OCR/R1–R6/сигнал/PDF; `.local/history-backend.log`, `.local/history-browser-final.log`, `.local/history-frontend-final-build.log` — приватные логи.

`node .local/history-visual.mjs` — 375/768/1024/1440, overflow=0/pageerror=0, 10 серверных событий на странице; pagination focus и сохранение draft проверены, reduced-motion duration 0.00001s. Итоговые desktop/mobile скриншоты `output/history/dossier-{width}.png` визуально просмотрены (375 и 1440). Дополнительный page-scale=2 отделён от настоящего zoom: `node .local/history-zoom.mjs` — реальный вход через форму, временный Chromium profile, `chrome.tabs.setZoom(2)`, width=scrollWidth=720/DPR=2, Enter на ссылке истории фокусирует раздел, pageerror=0; `output/history/zoom200.png`. Это техническая проверка, не внешняя UX/WCAG/юридическая приёмка.

Промежуточные прогоны выявили неоднозначные page-wide status locators после добавления Pagination; уточнены по сообщению. Первый полный прогон оставил подтверждённые DEMO R2/R4 после раннего падения и один fetch оборвался при обновлении frontend. Только эти две узнаваемые тестовые записи Ертіс завершены обычным auditable REJECT через API, без SQL/reset/удаления исходников; весь финальный прогон после завершения сборки прошёл. Первый новый backend-test сравнивал текущее время в объекте без last_reviewed_at; fixture получил фиксированное время проверки. Ошибки не скрыты и не объявлены дефектами формулы.

Файлы блока: backend/app/analysis_dto.py, backend/app/api/reviews.py, backend/tests/test_property_history.py; contracts/openapi.yaml; frontend/components/property-history.tsx, workspace.tsx, analysis-workspace.tsx, lib/types.ts, app/design-system.css; frontend/tests/property-history.spec.ts, analysis.spec.ts, legal-basis.spec.ts, supporting-pdf.spec.ts. Обновлены README/CHANGELOG, REQUIREMENTS/PLAN/ARCHITECTURE/DATA_SOURCES/UX_GUIDELINES/UI_COMPONENTS/UI_AUDIT/REMAINING_CHECKLIST и этот статус; создан FEATURE_PROPERTY_HISTORY. Самопроверка: только два read-model поля контракта, предыдущие snapshots/guards/риск сохранены, внешние строки — text, ID ссылки из metadata валидируется. Значимого нового архитектурного выбора нет; ADR не нужен.

**Следующий шаг:** для C-01 получить конкретный разрешённый рекламный HTTPS URL с условиями; после него — sample/parser/storage/jobs/retry/UI и фактический импорт. Независимый RU/KZ holdout, предметная/UX-проверка и второй ПК остаются открыты. Предоставленные реестры исследовать по паспорту/выгрузке как отдельный P1; уведомления и универсальное сравнение планировать отдельными блоками. Из внутренних найденных аудитом проблем всё ещё OPEN ошибочный Dashboard counter и ручной путь для пропущенного условия оплаты. Текущий код не опубликован, удалённый CI этого diff не запускался.

Финальная проверка: UTF-8 12 документов/132 локальные Markdown-ссылки — missing=0; hash-сверка 122 прежних source paths ограничена 10 ожидаемыми изменениями этого блока, включая контракт. Новые файлы истории перечислены выше. Последние typecheck/lint/format, Ruff/format и `git diff --check` passed; api/db healthy, frontend/worker running.

## Аудит перед созвоном — 16.10.2026, 15:00

Исполнитель Codex; проверена локальная `main` от `e993dc8` с уже существовавшими незакоммиченными UI/URL изменениями. По отдельному поручению выполнен аудит без изменений продуктового кода, commit/push/deploy. Результат — [CUSTOMER_MEETING_QUESTIONS.md](../CUSTOMER_MEETING_QUESTIONS.md): сопоставление исходного PDF, аналитического DOCX, требований, архитектуры, API/БД, реализации и тестов; 15 основных и 8 дополнительных вопросов, внутренние задачи, повестка из 7 вопросов и пустой протокол решений.

Свежая проверка: из `backend` — `..\.venv\Scripts\python.exe -m pytest -q -rs`: **449 passed, 17 skipped (145.58 s)**; Linux/Pango/supporting-PDF пропуски раскрыты в аудите. Из `frontend` — `npm run typecheck` и `npm run lint`: passed. Ruff check/format для backend/app, backend/tests, backend/alembic: passed (57 файлов); `git diff --check`: passed. Browser/E2E, build, внешний OCR holdout и текущий remote CI заново не запускались. Backend-тесты используют изолированную временную schema; агрегаты рабочей БД проверены в `READ ONLY`.

Подтверждены требующие решения риски: точность дат и состав доказательств R1–R6, отсутствие ручного добавления пропущенной гипотезы оплаты, правила актуальности рекламы и распределение полномочий. Внутренний дефект Dashboard воспроизведён: показатель новых объявлений возвращает все 151 вместо 32 со статусом NEW; исправление не выполнялось. Автомониторинг/интеграция C-01 всё ещё отсутствуют, разрешённый источник не подтверждён. Полная готовность MVP/пилота не объявляется.

Изменения этого блока — только новый документ вопросов и эта запись. **Следующий шаг:** провести созвон, заполнить протокол реальными ответами, подтвердить источник/владельца данных и приоритеты до 21 октября; затем согласованные решения перенести в требования и план. До этого рекомендации аудита не являются принятыми решениями. Предыдущий технический checkpoint сохранён ниже.

## Технический checkpoint перед аудитом

Updated: 2026-10-16 (Asia/Qyzylorda). Текущий блок: подготовка защиты URL-импорта и исследование рекламных источников. Исполнитель Codex, branch main, исходная ревизия `e993dc8`; изменения локальные, commit/push/deploy не выполнялись. Перед началом уже существовал незакоммиченный UI-редизайн (21 tracked + 2 untracked файла); он сохранён. Презентация и видеозапись по-прежнему вне задачи.

## Текущий блок — транспорт URL-импорта; C-01 ещё не закрыт

Пользователь подтвердил поэтапное продолжение: URL-импорт → независимое качество/приёмка → один официальный реестр → остальные P1; отдельно аналитические расширения и pilot-hardening. Источник не выбран; пользователь явно поручил исследовать кандидатов. Перед изменениями прочитаны AGENTS/README/статус/требования/архитектура/план/ADR, код API/worker/storage/config/tests и planned import-url контракт; применён implement-feature. Субагенты не запускались.

Добавлен `backend/app/url_fetcher.py`: доверенная политика одного точного HTTPS-домена и поддеревьев путей, запрет ambiguous URL/traversal/credentials/ports, проверка всех DNS-адресов и каждого redirect, numeric-IP socket с обычной TLS/SNI проверкой, default 2 MiB/20 s/3 redirects, общий subprocess timeout (включая DNS и slow body). Proxy env/cookies/auth не используются; сжатые ответы отклоняются. Возвращаются оригинальные HTML-байты и транспортное происхождение; ошибки имеют стабильные коды/безопасные RU-сообщения/retryable, автоматических повторов нет. Нет новых зависимостей. Решение и ограничения — [ADR-008](../decisions/ADR-008-bounded-url-transport.md), детали — [FEATURE_URL_IMPORT](../FEATURE_URL_IMPORT.md).

**Граница реализации:** разрешённых источников по умолчанию нет. Модуль не подключён к API/worker; endpoint import-url остаётся PLANNED. Извлечение текста/даты, сохранение HTML/SHA в storage/БД, jobs/idempotency/retry/UI и фактический импорт ещё OPEN. Никакие рекламные страницы через новый модуль не загружались; fixture HTML — синтетический DEMO. API/БД/риск/роли/snapshots/Compose/frontend/dependency locks не менялись в этом блоке.

**Исследование:** публичное соглашение Krisha §5.3 требует письменного разрешения, Korter §5.3 запрещает scraping при отдельном условном исключении для robots-compliant программ; найденное BI-соглашение о loyalty не установило права на collector, повторные прямые запросы BI timeout. Robots не трактуется как самостоятельное разрешение. Среди трёх кандидатов разрешённый источник не подтверждён; [ссылки/наблюдения/объём будущего согласования](../DATA_SOURCES.md). Владельцам сайтов сообщения не отправлялись, реальные объявления/персональные данные в seed/Git не переносились.

**VERIFIED на финальном коде, Windows Python 3.12.3:** из backend `..\.venv\Scripts\python.exe -m pytest -q tests/test_url_fetcher.py` — **113 passed (1.38 s)**; затем `..\.venv\Scripts\python.exe -m pytest -q -rs` — **449 passed, 17 skipped (126.27 s)**. Пропуски перечислены pytest: 2 Linux resource-limit PDF parser, 1 native Pango render, 14 Linux supporting-PDF tests. Linux PDF повторно в этом блоке не запускался; исторические Linux/CI проверки ниже не выдаются за свежие. Предыдущий промежуточный полный прогон до последних transport cases — 439 passed/17 skipped, заменён финальным результатом 449/17.

Security/transport tests запрещают реальный DNS/network, используют настоящий HTTPResponse для framing, проверяют IPv4/IPv6/mixed DNS, rebinding между redirects, numeric socket/TLS hostname/cleanup, неоднозначные пути, запрет redirect, chunked/size/framing, безопасные error mappings. Есть настоящий subprocess rejection и kill-on-timeout. Это не live DNS/TLS проверка внешнего источника и не end-to-end приёмка collector.

Static validation: из корня `.venv\Scripts\python.exe -m ruff check backend/app backend/tests backend/alembic` и `... -m ruff format --check backend/app backend/tests backend/alembic` passed (57 файлов); `git diff --check` passed. Новые тесты автоматически входят в существующий CI через pytest, удалённый CI текущего diff не запускался. Frontend/build/browser не повторялись: продуктовый UI и существующий runtime в этом блоке не менялись. Docker ps показал только четыре SAQ-контейнера, api/db healthy; остановок/перезапусков/изменений volumes не было. Integration tests использовали существующую случайную test schema и временные assets, public/storage сохранены.

Файлы текущего блока: backend/app/url_fetcher.py, backend/tests/test_url_fetcher.py; docs/FEATURE_URL_IMPORT.md, docs/decisions/ADR-008-bounded-url-transport.md; дополнены README/CHANGELOG/REQUIREMENTS/ARCHITECTURE/DATA_SOURCES/PLAN/REMAINING_CHECKLIST и этот статус. Ранее существующие UI-изменения в общих документах сохранены. Самопроверка: scope/disabled default/error paths/TLS/timeout/retry/provenance проверены; source-specific parser и лишние абстракции не добавлялись. Финальная проверка UTF-8 — 12 файлов, локальных Markdown-ссылок — 120, отсутствующих целей нет.

**Точный следующий шаг:** получить или найти документированное разрешение на одну настоящую рекламную HTML-публикацию (предпочтительно сайт рекламодателя/партнёра), зафиксировать домен/пути/URL/условия/robots/дату проверки, затем проверить ограниченный образец. После этого подключить parser + исходник/SHA/даты + existing durable jobs/idempotency/audit + UI recovery и проверить фактический импорт. Без разрешения C-01 остаётся BLOCKED; частичная техническая реализация не закрывает MVP. Новый внешний RU/KZ holdout/KZ review, UX/предметная проверка, второй ПК/нагрузка и P1 остаются открытыми согласно PLAN.

## Предыдущий блок — Construction Intelligence / рабочее досье аналитика

Checkpoint этого предыдущего блока: исходная ревизия `e993dc8`, перед началом UI-работ дерево было чистым; изменения редизайна остались локальными, commit/push/deploy не выполнялись. Backend/API/БД/риск/роли/исторические снимки/dependency locks были сохранены.

По приложенному полному заданию выполнен редизайн действующих экранов, с текущим кодом/API вместо отдельного mock-приложения. Прочитаны правила/требования/статус/архитектура/UX/feature/ADR, существующие компоненты/DTO/OpenAPI/реестровые API/анализ/тесты. Экранная audit-матрица и пять публичных референсов записаны в UI_AUDIT; Awwwards не загрузился и не заявляется изученным. Локальный ui-ux-pro-max использован advisory, marketing/новые fonts/palette отвергнуты, DESIGN_SYSTEM остаётся master. Платных сервисов/новых dependencies/агентских задач нет.

Реализация: общая оболочка/typography/motion; обзор с пятью приоритетными объектами и явным охватом выборки/API KPI; активные фильтры/город/застройщик реестра; общий выбранный объект карты/таблицы с сохранением при list/map; контекстные возвраты из досье/публикации после reload; RiskSummary в досье и историческом сигнале; единые surfaces legal forms; серверные status filters/pagination рекламы, loading/error без старой очереди; review selection URL/Back/reload без autoanalyze; anchors фактов/решения/PDF/истории, выделение версии и подписи кодов. Оригиналы/даты/DEMO/UNKNOWN/правовые предупреждения сохранены; отдельные OCR/match/evidence/factor/signal decisions не объединялись. Новых серверных операций/расчёта риска нет.

**VERIFIED локально:** `npm run test:e2e` — **41 passed (1.3m)**, включая реальные OCR/R1–R6, исходный PDF, пересчёт/отклонение, stale revision, signal snapshots/решения/PDF. Шесть новых regressions и дополненный map test прошли. `node .local/redesign-capture.mjs after` — **66 observations** (10 authenticated routes + login, 320/375/768/1024/1440/1920), page overflow=0/pageerror=0. Основные screenshots desktop/mobile визуально просмотрены, не каждый из 66 кадров. До — 22 observations 375/1440; снимки не перезаписаны after-серией. `node .local/redesign-zoom.mjs`: реальный вход через форму, настоящий `chrome.tabs.setZoom(2)` шести экранов; zoom=2/DPR=2/viewport=scrollWidth=720, pageerror=0; Enter на карте и anchors досье/сигнала проверены. Это отдельный временный Chromium profile, не пользовательский браузер.

Static checks: `npm run typecheck`, `npm run lint`, `npm run format:check` passed; `npm audit --audit-level=high` — 0 vulnerabilities. Production `docker compose -f docker-compose.yml -f docker-compose.dev.yml build frontend` passed; обновлён только frontend через `up -d --no-deps frontend`. API/worker/db/volumes/storage и посторонние проекты сохранены. Backend pytest не повторялся: серверный код без diff. Первые focused 13/15 выявили изменившееся accessible name карты и неоднозначный alert locator; исправлено, финальные 41/41 включают оба. Первый responsive проход выявил ошибочный CSS selector; финальный повтор без дефекта.

Файлы: frontend/app/design-system.css, components/{workspace,analysis-workspace,signals-workspace,property-map,legal-basis-review,legal-absence-review,construction-review,appeal-review}.tsx, lib/{presentation,status-labels}.ts, tests/{redesign,map}.spec.ts. Обновлены README/CHANGELOG/DESIGN_SYSTEM/UX_GUIDELINES/UI_COMPONENTS/UI_IMPLEMENTATION_PLAN/UI_AUDIT/UX_UI_SPEC/FEATURE_MAP и этот статус. Значимого нового архитектурного решения нет, причины UI-решений в существующем master/audit, новый ADR/handoff не создавался. Evidence ignored: `.local/redesign-{before,after,zoom}.json`, `.local/redesign-{focused,browser-final,build-final}.log`, `output/redesign/{before,after}/`.

Финальная самопроверка: `git diff --check` passed; `.local/redesign-final-scan.py` проверил **23 UTF-8 файла / 79 локальных Markdown-ссылок**, известных локальных secrets/credential patterns и отсутствующих ссылок не найдено. Минимальный измеренный текст responsive-набора — **12 px**. Backend/contracts/compose/dependency locks без diff. Это ограниченный scan, не независимый полный security audit. Docker ps: четыре SAQ-контейнера, api/db healthy; browser panel для локального dashboard запрошен через open_in_codex (queued). Текущий Git diff сохранён локально, без commit/push.

Ограничения: техническая UI/E2E проверка не закрывает UX с 3–5 людьми, Windows screen reader, реальные touch devices и полную WCAG 2.2 AA приёмку. Token contrast проверен suite; отдельные новые rendered contrast/bundle bytes/CLS/load measurements не выполнялись. Декоративных API-запросов/внешних fonts нет. Server errors остаются существующими inline alerts, универсальная привязка ошибок к каждому полю не добавлялась. Dashboard ранжирует до 100 полученных объектов с явной оговоркой, review selector — первые 100 последних материалов; полный доступ к рекламе через серверную пагинацию. Поиск рекламы по тексту/глобальная сортировка не имитируются без API. Collector/внешний OCR holdout/KZ human review/реестровый импорт/второй ПК/предметная приёмка остаются открытыми.

Следующий шаг: внешняя UX/предметная проверка по UI_AUDIT с конкретными сценариями поиска/сопоставления/решения; при отдельной публикации — свежая сверка remote SHA/секретов и exact-SHA CI. Локальная реализация редизайна и технический прогон завершены; внешний CI текущего diff не запускался.

## Предыдущий блок — свежий backup и актуализация границ

По просьбе сохранить лимит выполнены только короткие технические задачи. Создание презентации/видеозаписи отменено пользователем, не возобновлять без новой просьбы. Незавершённый `scripts/record_demo.mjs` удалён до commit; продуктовый код не менялся. В ходе подготовки до отмены `verify_ocr.py` добавил два синтетических RU/KZ материала, исходники/гипотезы PENDING сохранены. Ни презентация, ни видеозапись не публиковались.

Свежие `scripts/backup_local.py create` и `verify` завершились exit 0. Снимок `deb4d23`: **16 таблиц, 3631 строка, 1093 audit events**. При изолированном восстановлении API скачал **335 Assets**, проверил **33 сигнала / 22 с решениями**, **22 исторических PDF assets / 22 READY PDF**; `verified=true`, `stage=complete`. Evidence: `.local/backup-current-{create,verify}.log`, `.local/backups/20261015T182805Z-2e8c2ae35f004ff4bc7eeb93264f33fc`, `.local/restore-checks/20261015T182838Z-8eeaa9ea84e549179a0ed5bb37d259b0/result.json`. Рабочая БД/volumes сохранены, API/worker возобновлены, временные контейнеры удалены, работают только четыре SAQ-контейнера. Backup/env остаются приватными и не входят в Git.

Согласованы текущая P0-матрица и следующий шаг с уже проверенными rules-1.2 и 35 browser tests. Обновлены существующие LOCAL_BACKUP/REMAINING_CHECKLIST и этот статус. Код/зависимости не менялись, прежний CI `f0a91c8` относится к текущему продуктовому коду; полный pytest/browser/build повторно не запускались. Проверки текущего блока: реальный create/restore/API/SHA/таблицы и финальный diff/локальные Markdown links. Следующий шаг: новый внешний OCR holdout/KZ review, UX/предметная приёмка, второй ПК или паспорт/разрешённый образец P1-реестра. Эти внешние проверки не объявляются закрытыми.

## Предыдущий блок — OCR/extraction rules-1.2

Исправлены переносы LF/CRLF и сокращение `тыс.`, добавлены резервирование/плата за бронь/«алдын ала төлеңіз», локальный исторический контекст и ближайшая сумма конкретного условия. Нулевой аванс не заимствует цену квартиры, `т/Т` не считается валютой. Длинный PAYMENT_TERM содержит фактический термин и сумму в своём ограниченном исходном фрагменте. Exact name/ЖК/ТК сохраняют приоритет; дополнительный fallback допускает только известные пары казахских букв зарегистрированных имён ≥6 букв, границы слова и PENDING с предупреждением. Новые automatic/manual extraction имеют rules-1.2; старые версии, решения и snapshots не переписываются. API/БД/зависимости/Tesseract/порог matcher/риск сохранены; ADR не требовался.

Замер неизменённого synthetic regression-корпуса: 36 images, 32/32 читаемых, 0 ошибок; payment TP/FP/FN/TN **16/0/0/16**, precision/recall **100%/100%**, image top-1/top-3 **24/24**. `--require-targets` exit 0; manifest и 36 image SHA совпали с alias-fix-v1, source hashes после запуска совпали с кодом. CER прежний **157/6311 (2,49%)**. Exact-text baseline top-3 **22/24**, 1/8 неизвестных объектов по-прежнему получает похожего кандидата. Это исправление правил на просмотренном наборе, **не независимая точность реальной рекламы**. Нужны новый внешний holdout и проверка KZ человеком.

Проверки: focused pytest **105 passed**; Ruff check/format всего backend passed; **27 tool unittests OK в Linux**; evaluator без сети/БД/env, read-only источники, ограниченные ресурсы. Пересобраны и обновлены только SAQ api/worker с обоими Compose-файлами и `--no-deps`; db/frontend/volumes сохранены. `scripts/verify_ocr.py` прошёл на реальных API/worker; полный локальный `npm run test:e2e` — **35 passed (1.2m)** с R1–R6, настоящим OCR, snapshots/PDF и responsive/keyboard checks. Полный Linux backend на отдельной случайной test schema — **353 passed (97.94s)**; test environment создан в /tmp отдельного временного контейнера, рабочие зависимости не менялись. Новых frontend изменений нет; отдельные lint/typecheck/build UI и ручная визуальная проверка не повторялись.

Read-only review отдельным агентом выявил и помог закрыть регрессии смешанного старого/нового предложения, запятой перед призывом, пустого абзаца с пробелами, Windows-переноса и обрезанного фрагмента. Исходный код и общий статус менял только основной агент. Файлы: backend/app/{extraction,worker}.py, backend/tests/test_extraction_{names,payments}.py, публичные report/cases rules-1.2 и существующие README/CHANGELOG/OCR_EVALUATION/ARCHITECTURE/PLAN/REMAINING_CHECKLIST/PROJECT_STATUS.

Evidence (ignored): `.local/evaluation-rules-1.2-{reviewed,backend,tools,build-reviewed,live-ocr,browser}.log`, `output/evaluation/rules-1.2-reviewed`. Публичные report/cases — `data/evaluation/results/2026-10-15/rules-1.2-*`; прежние отчёты не перезаписаны. Self-review и `git diff --cached --check` passed; проверены 13 UTF-8 файлов и 102 локальные Markdown-ссылки, совпадений известных локальных secrets/credential patterns 0. Source SHA публичного report совпали со staged Git-кодом. В worker подтверждён pipeline rules-1.2; работают только четыре SAQ-контейнера. Код опубликован в **`f0a91c861ca5668257c15d8d88d3eb11a61b6fbb`**; после push локальный/удалённый SHA совпали, дерево чистое. [GitHub CI 38783082453](https://github.com/temirkhanerbolatovich-coder/saq-qurylys/actions/runs/38783082453) точного SHA завершён **success** во всех трёх jobs. Из job logs прочитаны **353 backend passed (104.36s), 35 browser passed (52.4s), 27 tool tests OK**, Skill smoke, отсутствие новых upgrade operations, успешные frontend lint/typecheck/format/audit0/build/config test. CI-замер повторил payment 16/0/0/16 и top-3 24/24 при errors=0 и proposed_targets_met=true. Финальная фиксация — Markdown-only commit; повторная полная сборка для него пропускается workflow, source SHA report не изменились. Следующий продуктовый шаг: новый внешний holdout с правами/KZ-разметкой и UX/предметная приёмка; collector остаётся BLOCKED без разрешённого рекламного источника.

## Предыдущий блок — UX материала, review и сигналов

Код опубликован в **`8434d1b62c0825f45bf1c13bc04e407342fc8460`**; после push локальный/удалённый SHA совпали, дерево чистое. [GitHub CI 38779704092](https://github.com/temirkhanerbolatovich-coder/saq-qurylys/actions/runs/38779704092) для точного SHA **success** во всех трёх jobs. Из job logs подтверждены **294 backend passed (69.45s), 35 browser passed (40.2s), 27 tool tests OK**, offline Skill search passed, отсутствие новых upgrade operations и успешные frontend checks/build/audit0/config test. Финальная фиксация этого результата — Markdown-only commit; повторная сборка для него пропускается workflow. Следующий шаг — внешняя UX/предметная приёмка, а не повторная реализация текущего блока.

По просьбе продолжить реализацию UI/UX использованы текущие DESIGN_SYSTEM/UX_GUIDELINES/UI_COMPONENTS и установленный ui-ux-pro-max: локальные searches `progress steps navigation` и `form labels error feedback` дали применимые правила progress/labels/keyboard/submit feedback. До изменений показаны три проблемы и план. Новый визуальный стиль/библиотеки/генерация master не требовались.

Текстовая и файловая формы разделены на оригинал/происхождение и необязательный контекст; hints связаны с controls, текст имеет счётчик без noisy live region, файл показывает имя/размер и aria-invalid при oversize. После сохранения текста focus переходит к результату; primary Next Link ведёт сразу в review вместо двух переходов через карточку. Оригинал доступен отдельной secondary кнопкой; анализ автоматически не запускается.

Review имеет четыре anchor-этапа: оригинал/гипотезы/очередь/R2. Count использует только существующие CONFIRMED/CORRECTED/REJECTED review_status, не означает правовую готовность/баллы. Недоступные этапы объясняют прежние условия; архивная версия подписана, несохранённые причины при anchors остаются mounted. Повторный анализ — главное действие текущего материала, новая публикация доступна через раздел рекламы. Viewer видит ожидание аналитика и прежний read-only UI. Условия показа PaymentRisk вынесены без изменения в hasCurrentMatch; подтверждения/handlers/revisions/CSRF/idempotency сохранены.

Signals property_id/state/is_stale/page и signal_id хранятся в URL. Выбор/новая версия/history links сохраняют queue filters; Back/reload восстанавливают контекст. Смена фильтра сбрасывает page/id; reset возвращает focus первому select. Путь последнего завершённого запроса useData.resolvedPath позволяет скрыть прежнюю очередь во время нового фильтра/ошибки, поведение остальных callers сохранено. Снимок по ссылке вне текущей очереди явно подписан. API/данные/риск/миграции/dependency locks/Skill не менялись.

Финальные проверки: `npm run test:e2e` — **35 passed (1.1m)** с реальными OCR/R1–R6/сигналами/PDF; все пять новых UX regressions, включая viewer presentation mock, выполнены. Focused 5/5 (11.3s) выполнен до последней viewer-copy; полный прогон включает её. Первоначальные ошибки новых tests относились к преждевременному чтению URL/Back до завершения Next navigation; тестовые ожидания исправлены, существующие API assertions не ослаблены. `npm run typecheck`, `lint`, `format:check`, `npm audit --audit-level=high` (**0 vulnerabilities**) и production Compose build frontend passed. Обновлён только SAQ frontend с обоими Compose files/`--no-deps`; остальные SAQ services/volumes и посторонние проекты сохранены.

Повторены **28 authenticated + 4 login observations** на 375/768/1024/1440: page overflow=0, authenticated pageerror=0, min measured text=12. Финальные screenshots review desktop/mobile, text/file desktop/tablet/mobile и signals desktop визуально просмотрены; исправлены большие интервалы hints и competing primary на review. Keyboard/focus/contrast tests входят в полный suite; новый zoom/screen-reader/user test не выполнялся. Локальный backend pytest не повторялся: backend source не менялся. Это техническая UI-проверка, не внешняя приёмка.

Файлы: frontend/components/{workspace,analysis-workspace,signals-workspace}.tsx, app/design-system.css, tests/ux-flow.spec.ts. Обновлены README/CHANGELOG/DESIGN_SYSTEM/UX_GUIDELINES/UI_COMPONENTS/UI_IMPLEMENTATION_PLAN/UI_AUDIT/REMAINING_CHECKLIST и этот статус; новых handoff/ADR/dependencies нет, причина UI-решений записана в существующей системе. Evidence (ignored): `.local/ux-flow/{focused-final,browser-final,responsive-final,build-final}.log`, `.local/ui-design-after.json`, `output/design/after/*`. Self-review сохранности API/ролей/guards/draft/истории выполнен. Следующий шаг блока — финальный scan/commit/push и exact-SHA CI; затем внешние UX 3–5 людьми, screen reader и реальные touch devices. OCR quality/collector/реестровый импорт/второй ПК/защита остаются открыты.

Перед публикацией проверены **14 изменённых/новых UTF-8 файлов**, **84 локальные Markdown-ссылки**: известных локальных secrets и явных credential patterns не найдено; `git diff --check` passed. Backend/contracts/dependency locks/Skill без diff. После fetch HEAD=origin/main=`1577cac`. Это ограниченный scan, не полный security audit. Только четыре SAQ-контейнера работают; сторонние проекты не запускались.

## Предыдущий блок — UI/UX-инфраструктура и Skill

Новый master prompt разобран относительно уже реализованного дизайна; до изменений показаны краткий аудит/направление/план. Изучены оба UI UX Pro Max repo и их установка, публичные страницы шести UI-библиотек и доступные design references. Выбран один основной upstream commit `56ea9cf174ed86786187daa9de0e6247cb0747e4`; штатным skill-installer установлен subtree `.claude/skills/ui-ux-pro-max` в versioned `.agents/skills/ui-ux-pro-max`. Все 73 исходных файла совпали с pinned Git blob SHA; добавлены LICENSE/SOURCE.json/agents/openai.yaml. Сторонний install.sh прочитан, не запускался; fork Rpeng666 не установлен. Поиск использует Python stdlib; новых npm/pip dependencies/глобальных settings/hooks/services нет. Vendor whitespace сохранён с scoped attribute, Docker context исключает .agents. CI добавляет offline search smoke.

Два свежих `codex app-server --stdio` процесса через initialize → skills/list подтвердили ровно один **ui-ux-pro-max / scope repo / enabled=true**; второй с forceReload=false. Локальные domain/Next.js searches и два design-system preview выполнены без persistence. Нерелевантные hero/sales patterns/новые палитры/шрифты и generic Server Actions совет отклонены; DESIGN_SYSTEM остаётся единственным проектным master. Discovery/search проверены фактически, не только наличием SKILL.md. Git-tracked Skill доступен после clone другим агентам; личный disabled flag требует отдельной проверки на другом ПК.

Внедрены общие `Pagination` (реестр/сигналы, server metadata, disabled границы, polite page announcement) и `TableRegion` (сводка/реестр, focusable labelled scroll). Добавлен один reset q/zone/legal_status/page с сохранением view/других URL parameters и возвратом focus в search. Native search и H1–H6/font/spacing/shadow tokens дополняют прежний дизайн. Сортировка всего набора не имитируется сортировкой одной страницы; API не расширен. Отдельные OCR/match/фактор/сигнал, роли/CSRF/idempotency/revisions/snapshots сохранены.

Документация: созданы [UI_COMPONENTS](../UI_COMPONENTS.md) и [UI_IMPLEMENTATION_PLAN](../UI_IMPLEMENTATION_PLAN.md); дополнены DESIGN_SYSTEM/UX_GUIDELINES/UI_AUDIT/README/CHANGELOG/REMAINING_CHECKLIST. AGENTS закрепляет десять правил reuse/tokens/Skill/accessibility/browser/GitHub-agent handoff. UX_GUIDELINES описывает число действий по всем основным сценариям, как walkthrough-модель, не user testing. Reset трёх controls сокращён с 3 до 1 действия; юридически значимые подтверждения не сокращены. Подробная матрица Tailwind/shadcn/Radix/Lucide/MagicUI/Motion и границы доступа Mobbin/Pageflows — в UI_IMPLEMENTATION_PLAN. Второй handoff/status не создавался.

Фактические проверки: `npm run typecheck`, `lint`, `format:check`, `npm audit --audit-level=high` (**0 vulnerabilities**) и production `docker compose -f docker-compose.yml -f docker-compose.dev.yml build frontend` passed. Обновлён только SAQ frontend через `up -d --no-deps frontend`, db/api/worker/volumes и сторонние проекты сохранены. Focused `npx playwright test tests/ui-infrastructure.spec.ts tests/design-system.spec.ts` — **8 passed (12.8s)**; полный `npm run test:e2e` — **30 passed (54.2s)** с реальным OCR, R1–R6, сигналами/PDF. Повторены 28 authenticated + 4 login responsive observations на 375/768/1024/1440: нет page overflow, authenticated pageerror=0, min measured text=12. Дополнительно 4 filtered captures + RU/KZ row + signal pagination, pageerror=0; screenshots визуально просмотрены. Новый RU/KZ и pagination tests используют явно обозначенные presentation API mocks, остальные workflow реальны. FontFaceSet check не считается проверкой всех ОС. Backend source не менялся, локальный pytest не повторялся.

Evidence (ignored): `.local/ui-infrastructure/{focused,browser-full,build-final,responsive}.log`, `discovery{,-repeat}.json`, `*-result.txt`, `visual.json`, `output/design/reset-*.png`, `ru-kz-visible-375.png`, `pagination-signals-375.png`, свежие `after/*`. Изменения: frontend/app/design-system.css, components/{workspace,signals-workspace}.tsx, ui/{pagination,table-region}.tsx, tests/ui-infrastructure.spec.ts, .agents Skill, CI/.dockerignore/.gitattributes и документы. Следующий шаг блока — review/diff/секреты/ссылки, commit/push и exact-SHA GitHub CI. Не закрыты внешние UX 3–5 людьми/screen reader/touch devices и проектные OCR/collector/реестры/второй ПК/защита.

Блок опубликован в **`d2d9c6ba56e95d4d35fe7dfd3148060649175a25`**, после push локальный/удалённый SHA совпали, дерево чистое. Все 73 upstream blob SHA дополнительно проверены уже в Git commit — совпали. [GitHub CI 38768212690](https://github.com/temirkhanerbolatovich-coder/saq-qurylys/actions/runs/38768212690) точного SHA завершён **success** для frontend/backend/browser-e2e. Из job logs подтверждены **294 backend passed (101.24s), 30 browser passed (47.0s), 27 tool tests OK**, **repository UI skill search passed**, отсутствие новых upgrade operations и успешные frontend lint/typecheck/format/audit/build/config test. Финальная фиксация результатов — отдельный Markdown-only commit. Следующее действие: внешняя UX-проверка по UI_AUDIT/UX_GUIDELINES; техническая инфраструктура текущего master prompt завершена в указанном scope.

Перед публикацией: self-review компонентов/состояний/документации выполнен, `git diff --check` passed. Проверены **95 изменённых/новых UTF-8 файлов** (76 vendor source/license/metadata), **84 проектные локальные Markdown-ссылки**; известных локальных secrets и явных credential patterns не найдено. Vendor Markdown не интерпретируется как проектная документация, исходные ссылки сохранены. Все 73 upstream Git blob SHA повторно совпали; backend/contracts/dependency locks без diff. После fetch HEAD и origin/main совпали (`5bd0cca`). Работают только четыре SAQ-контейнера. Это ограниченный scan, не полный security audit; bundled vendor tests не запускались.

## Предыдущий блок — дизайн-система и UX

По запросу пользователя изучены frontend/роли/основные сценарии и публичные материалы shadcn, Radix, Lucide, Refactoring UI, NN/g, WCAG 2.2 и UI UX Pro Max. Локальная установка Pro Max не найдена; генератор не устанавливался и не запускался. До реализации показаны краткий аудит, визуальное направление «рабочее досье аналитика» и план. Сохранён существующий стек Next/React/Tailwind/Radix Slot/Lucide; новых dependencies нет. Зелёная навигация, тёплое светлое поле, графитовый текст, ограниченные семантические цвета, таблицы/разделители вместо одинаковых cards, спокойные 6/8 px скругления.

Реализованы tokens/типографика/состояния в design-system.css, общая KPI-полоса и рабочие маршруты, читаемые таблицы с расшифровкой R1–R6, русские статусы, пять разделов и профиль/выход на mobile. Добавлены skip-to-main, focusable table region/scope=col, anchor-навигация досье без unmount форм, видимое обоснование решения R1, focus выбранного сигнала и оригинала с возвратом к гипотезе. Сигналы используют очередь рядом с деталями на широком экране; формы/карта имеют увеличенные touch targets, экран входа компактный. Backend/контракт/roles/auth/CSRF/handlers решений/revisions/idempotency/исторические snapshots сохранены; баллы на клиенте не рассчитываются.

Проверки: `npm run test:e2e` — **27 passed (1.0m)** с реальными OCR/review/R1–R6/сигналами/PDF. После финальных visual-only изменений login/spacing/aria-busy повторены production Compose build frontend и `npx playwright test tests/design-system.spec.ts` — **5 passed (8.5s)**; ранее focused design+analysis **11 passed (22.8s)**. `npm run lint`, `typecheck`, `format:check` — passed; `npm audit --audit-level=high` — **0 vulnerabilities**. Повторены 7 authenticated routes × 4 ширины 375/768/1024/1440 и login на тех же ширинах: **32 наблюдения без page overflow**, 28 authenticated без pageerror, logout виден, измеренный рабочий текст минимум 12 px. Keyboard/skip/table scroll/досье/сохранение draft/selected focus/loading/empty/503 retry проверены. Viewer проверен только presentation mock auth/me, не новая серверная приёмка прав.

Контраст: 13 token pairs проходят text ≥4,5/control-focus ≥3; ограниченная выборка текстовых DOM nodes семи заполненных desktop-страниц даёт минимум 5,30:1. Настоящий Chromium zoom `setZoom(2)`/getZoom=2, DPR=2, viewport/scrollWidth=720/720, 8 real OSM responses HTTP200/8 markers; Enter/card/attribution доступны. Визуально просмотрены desktop/tablet/mobile screenshots; исправлены мелкие mobile actions, растянутые badges в очереди и пустой блок login. Это не полная WCAG 2.2 AA сертификация и не user/screen-reader testing. Отдельный локальный backend pytest не повторялся: backend не менялся; последний опубликованный CI `cba28ec` — 294 backend/22 browser/27 tooling.

Файлы: frontend/app/{layout.tsx,design-system.css}, components/{workspace,analysis-workspace,signals-workspace,legal-absence-review,property-map}.tsx, ui/button.tsx, lib/status-labels.ts, tests/design-system.spec.ts и три ожидаемые видимые status-строки в analysis.spec.ts. Созданы [DESIGN_SYSTEM](../DESIGN_SYSTEM.md), [UX_GUIDELINES](../UX_GUIDELINES.md), [UI_AUDIT](../UI_AUDIT.md); AGENTS требует их чтения перед frontend-задачами. README/UX_UI_SPEC/CHANGELOG/чеклист синхронизированы. Нового ADR нет: архитектура и зависимости сохранены; дизайн-решение/обоснование записаны в DESIGN_SYSTEM. Legacy globals.css остаётся для специализированных modules, дальнейшая консолидация — отдельный ограниченный refactor с теми же E2E.

Локальное evidence (ignored): `.local/design-{final-browser,focused-final,smoke-final,responsive-final,build,map-zoom}.log`, `.local/ui-design-{before,after}.json`, `.local/design-rendered-contrast.json`, `output/design/{before,after}` и `output/qa/map-zoom-200-*.png`. Пересоздан только SAQ frontend с обоими Compose-файлами и `--no-deps`; db/api/worker и volumes сохранены, сторонние проекты не запускались. Независимое read-only review diff/docs не выявило блокирующих замечаний. Перед публикацией `git diff --check` passed; проверены 20 изменённых/новых UTF-8 файлов, 71 локальная Markdown-ссылка, известных локальных secrets и явных credential patterns не найдено. Это ограниченный scan, не полный security audit. После fetch локальный HEAD и origin/main совпали (`59e870a`). Внешняя UX-проверка 3–5 людьми, screen reader, реальные touch devices и предметная приёмка остаются открыты.

Код опубликован в `53e9ef0264696e1a82757d44d516668bfc3af0dd`; после push локальный/удалённый SHA совпали, дерево чистое. [GitHub CI 38762778431](https://github.com/temirkhanerbolatovich-coder/saq-qurylys/actions/runs/38762778431) для точного SHA завершился **success** во всех трёх jobs: frontend/backend/browser-e2e. Из job logs прочитаны **294 backend passed (66.94s), 27 browser passed (38.2s), 27 tool tests OK**, frontend lint/typecheck/format/audit/build и config test. Реальный synthetic RU/KZ OCR fixture прошёл; evaluator повторил 80%/75%/18 из24, quality targets=false. Эти диагностические пределы не меняются дизайном. Финальный статус сохраняется отдельным Markdown-only commit; workflow пропускает такие изменения.

## Предыдущий блок — OCR evaluation и aliases

Добавлены [36 новых synthetic RU/KZ cases](../../data/evaluation/README.md), составленных отдельным агентом без чтения extractor/OCR/tests/seed. 32 читаемых, 16 положительных/16 отрицательных; 4 нечитаемых, каталог 8 вымышленных объектов; 24 known targets/8 unknown. Все тексты уникальны, названия каталога не совпадают с seed. Это ограниченная независимость разработки, не human/external acceptance. После просмотра ошибок корпус стал regression-набором.

`evaluate_ocr.py` вызывает production validate_image/recognize/extract/match_candidates, сохраняет оригиналы/manifest/raw OCR/все hypotheses/candidates, раздельные text/image метрики all/RU/KZ, coverage/CER/TP/FP/FN/TN и model/font/source SHA. Expected labels не передаются анализатору. No DB/API/settings/queue writes. Прогоны в disposable Linux Docker с network none/read-only/cap-drop, writable только output. До создания output проверяются Tesseract/models/font; output не перезаписывается, stage errors сохраняются. CI добавляет evaluator/tool tests и 14-day synthetic evidence artifact. Метрики диагностические; для quality gate нужен --require-targets.

Первичный baseline: **precision 80%, recall 75%, top-3 8/24**. Выявлен и исправлен узкий дефект exact registered aliases без префикса ЖК/ТК: matcher знал aliases, а extractor не выделял их. После исправления на **тех же 36 image SHA/manifest/labels**: **precision 80%, recall 75%, top-3 18/24 (75%)**, CER 157/6311 (2,49%), coverage 32/32, ошибок обработки 0; цели 90%/85%/90% **НЕ достигнуты**. RU top-3 12/12, KZ 6/12; все 4 unreadable без OCR/payment/candidates. Сохранены исходный и post-fix report/case records в [data/evaluation/results/2026-10-15](../../data/evaluation/results/2026-10-15). Версия новых автоматических/ручных extraction rules-1.1, прежние записи не переписываются. Остались historical false positives, сокращения/переносы и KZ-name OCR; подробный разбор IDs — [OCR_EVALUATION](../OCR_EVALUATION.md).

Проверки 15.10.2026: полный Linux `pytest -q -p no:cacheprovider` — **293 passed (119.72s)** в временном Compose API с read-only backend/contracts, dev venv в /tmp, отдельная случайная test schema; public/storage сохранены. Один дополнительный overlap regression добавлен после collection полного прогона: focused `pytest backend/tests/test_extraction_names.py -q` — **15 passed** на Windows. `python -m unittest discover -s scripts -p "test_*.py" -q` — **27 OK в Linux без skip**, Windows 27 OK / 1 symlink skip. `npm run test:e2e` — **22 passed (51.2s)** с обновлёнными API/worker и настоящим OCR/PDF. Ruff check/format backend (54 files) и двух новых scripts passed; build api/worker passed. Frontend source не менялся, отдельные lint/typecheck/frontend build не повторялись. Схема не менялась, alembic check отдельно не повторялся. Визуально просмотрены все 36 изображений на 6 contact sheets; 4 нечитаемых подтверждены видом изображения.

Docker был остановлен; запущен по прежнему прямому разрешению пользователя. После старта engine автоматически поднял SAQ worker с restart policy; явно запущены только существующие SAQ db/api/frontend, затем пересобраны api/worker. Чужие проекты не запускались; volumes не удалялись. Временные test/evaluation контейнеры удалены. Локальное evidence: `.local/evaluation-{baseline,alias-fix,backend,browser,tool-tests-linux,runtime-build}.log`, `output/evaluation/{baseline-v1,alias-fix-v1}`. Публичные synthetic reports/JSONL содержат только вымышленные данные, без credentials. Перед публикацией: независимое read-only ревью evaluator/docs/CI не нашло блокирующих ошибок; self-review diff выполнен. `git diff --check` passed, проверены 19 изменённых/новых UTF-8 файлов, JSON/JSONL, 82 локальных Markdown-ссылки; известных локальных secrets и явных credential patterns не найдено. Локальный и origin/main до публикации совпали. Код опубликован в `cba28ecea28ec6b60896981837d79249474a17a4`; локальный/удалённый SHA совпали. [GitHub CI 38756623850](https://github.com/temirkhanerbolatovich-coder/saq-qurylys/actions/runs/38756623850) exact SHA **success** для frontend/backend/browser-e2e. Job logs прочитаны через GitHub connector: **294 backend passed (101.46s), 22 browser passed (35.0s), 27 tool tests OK**. CI corpus также 36 cases, 80%/75%/18 из24, coverage 32/32, CER 157/6311, ошибок 0 и targets=false — совпало с локальным прогоном. Synthetic artifact `11983552716` сохранён на 14 дней (до 29.10.2026). Финальная фиксация — Markdown-only commit.

Документация: OCR_EVALUATION, corpus README, README/ARCHITECTURE/PLAN/REMAINING_CHECKLIST/CHANGELOG и этот статус. Нового ADR/зависимостей/API/миграций нет. Следующий шаг — targeted regression fixes оставшихся ошибок, затем новый holdout/проверка KZ носителем. Не считать завершёнными реальный collector, импорт госреестра, второй ПК, UX/предметную приёмку и защиту.

## Предыдущий блок — карта объектов

Реализована `/properties?view=map`: Leaflet 1.9.4, координаты из существующего API, серверные баллы/зоны, выбранная карточка и переход к полным сведениям. Поиск/зона/основание/страница общие со списком; переключение вида сохраняет URL. Добавлена явная пагинация, охват карты подписан как текущая страница. Непригодные координаты остаются в списке; ошибка тайла/JS не блокирует список, API-ошибка даёт retry без устаревших меток. Исправлена выявленная тестом активация метки Enter, поддержан Space. Публичные build args провайдера/атрибуции проходят проверку; default OSM, `disabled` отключает карту. Нет геокодирования, bulk/offline tiles, нового API и расчёта риска на клиенте. Устаревшая фраза об отсутствии OCR в обзоре заменена ссылкой на карту.

Проверки: `npx playwright test tests/map.spec.ts` — **5 passed**; `npm run test:e2e` — **22 passed (47.9s)** с настоящим OCR/PDF; `node --test scripts/test-map-config.mjs` — **1 test / 10 config cases passed**. `npm run lint`, `typecheck`, `format:check`, `npm audit --audit-level=high` (0 vulnerabilities) и production `docker compose -f docker-compose.yml -f docker-compose.dev.yml build frontend` passed. Обновлён только SAQ frontend через `up -d --no-deps frontend`; API/worker/db не пересоздавались. Backend source/миграции не менялись, отдельный локальный pytest не запускался. CI дополнен config test. Код опубликован в `718b28a43fe65d17fb24eef5f1290d850f007993`; локальный и удалённый main совпали. [GitHub run 38711042158](https://github.com/temirkhanerbolatovich-coder/saq-qurylys/actions/runs/38711042158) для точного SHA завершён **success**: frontend, backend и browser-e2e. Результат подтверждён GitHub API; job logs через публичный API недоступны, поэтому точные счётчики удалённого pytest не заявляются. Итоговая фиксация результата — отдельный Markdown-only commit.

Дополнительный живой просмотр: 8 OSM tile responses HTTP 200, 8 меток, нет предупреждений. Настоящий Chromium zoom через disposable extension `chrome.tabs.setZoom(2)`/`getZoom=2`, DPR=2, viewport/scrollWidth=720/720; keyboard/card/атрибуция доступны. Отдельный профиль закрыт, пользовательский браузер не менялся. Визуально просмотрены desktop, узкий режим и два screenshot при 200%. Evidence: `.local/map-focused.log`, `.local/map-full-browser.log`, `.local/map-build.log`, `.local/map-visual-result.json`, `output/qa/map-*.png` (ignored). Это не UX-приёмка 3–5 людьми. Перед публикацией: `git diff --check` passed; проверен 21 изменённый/новый UTF-8 файл, 75 локальных Markdown-ссылок, известных приватных значений и явных credential patterns не найдено. Самопроверка diff выполнена; API/формула/миграции сохранены.

Файлы: frontend/components/{property-map,workspace}.tsx, lib/{types,map-config}.ts, globals.css, dependency pins, Dockerfile/Compose/.env.example, tests/map.spec.ts, scripts/test-map-config.mjs и CI. Документация: [FEATURE_MAP](../FEATURE_MAP.md), README/ARCHITECTURE/UX/PLAN/CHANGELOG/checklist и этот статус. Это реализация существующего ADR-001; новое архитектурное решение не вводилось. Открыты collector, независимый OCR corpus, реестровый импорт P1, второй ПК, предметная/UX-приёмка и материалы защиты.

## Предыдущий блок — проверенное восстановление

По просьбе пользователя закрыть быстрые задачи при 25% остатка реализованы `scripts/backup_local.py create` и `verify`: короткая пауза только SAQ API/worker с возобновлением в finally, custom pg_dump, DB-referenced originals/PDF и манифест SHA/всех public-таблиц. Восстановление — только в UUID PostgreSQL 17.9 с network none/tmpfs, без рабочих volumes/портов; API из зафиксированного локального образа, восстановленный storage read-only, без seed/миграций/worker. Пути ограничены приватной `.local`, проверяются SHA/размеры и symlink/junction; cleanup только собственных точных CID. Автоматической перезаписи рабочей БД нет.

Фактически выполнены `python scripts/backup_local.py create` и `verify .local/backups/20261015T083816Z-d1fd756b7d1842bf9ea8ba7325c9b6ff`: **16 таблиц/1695 строк совпали**, включая **512 audit events**, скачан **171 Asset**, snapshots/decisions **9 сигналов** (6 с решениями), **6 прежних PDF assets и 6 READY PDF** через authenticated endpoint. Приватный результат `.local/restore-checks/20261015T083830Z-56226e04c5ac417598d378243cad21a1/result.json`: `verified=true`, `stage=complete`. Дамп 468000 байт; registered Assets суммарно 844206 байт (байты могут разделяться записями). SAQ API/worker возобновлены; работают прежние четыре контейнера, временные контейнеры удалены, чужие проекты не запускались.

Проверки инструмента: `python -m unittest discover -s scripts -p "test_*.py" -q` — на Windows 15 tests OK (1 symlink skip), в Linux контейнере **15 tests OK без пропусков**; Ruff check/format с backend/pyproject.toml и git diff --check passed. Проверены 10 UTF-8 файлов и 67 локальных Markdown-ссылок; известных локальных secrets и явных credential patterns в изменённых файлах нет. Backend/frontend не менялись; старые 279/17 не выдаются за новый локальный прогон. CI дополнен unittest и Ruff для инструмента. Код опубликован в `9d8bea3`; [GitHub run 38707574435](https://github.com/temirkhanerbolatovich-coder/saq-qurylys/actions/runs/38707574435) завершён **success** для backend/frontend/browser-e2e, новый шаг Check local backup tooling также success. Результат подтверждён GitHub API для точного SHA. Итоговая фиксация статуса — отдельный Markdown-only commit (без повторной CI-сборки). Документация: [LOCAL_BACKUP](../LOCAL_BACKUP.md), README/ARCHITECTURE/PLAN/CHANGELOG/чеклист и этот статус. Новых зависимостей/API/миграций/архитектурного решения нет. Копия содержит приватные DB-данные и не публикуется; внешний backup/retention/второй ПК и восстановление выполняющегося job остаются вне этой проверки.

## Предыдущий блок — источники данных

Пользователь предоставил 11 уникальных ссылок на реестры РК и Ashyq-набор. Создан [DATA_SOURCES](../DATA_SOURCES.md): исходные URL, наблюдавшийся доступ 15.10.2026, приоритет и оставшиеся условия. Прочитана публичная форма E-License по БИН/номеру/дате и официальное описание API data.egov.kz. Homeportal/Qazreestr/eQurylys при прямом чтении дали JS-оболочки; для части порталов наблюдались ошибки/timeout. У Ashyq прочитаны только заголовок набора и требование JavaScript; паспорт/выгрузка/охват/актуальность не установлены. Поиск конкретных компаний, авторизация, API-запросы, загрузки наборов и интеграции не выполнялись.

Реестровые ссылки больше не считаются отсутствующими. Следующий шаг для отдельного P1-импорта — проверить паспорт и условия выгрузки Ashyq или актуального набора data.egov.kz, затем ограниченный образец с происхождением и ручным сопоставлением. Рекламный C-01 остаётся BLOCKED: реестровый импорт не заменяет фактическую загрузку рекламного материала. Отсутствие строки/ошибка не дают R1; формула и процедуры review не изменены.

Файлы блока: docs/DATA_SOURCES.md, REQUIREMENTS/RESEARCH_REVIEW/REMAINING_CHECKLIST/PLAN/ARCHITECTURE, README и этот статус. Уточнены также оставшиеся устаревшие описания поддержки PDF и версии контракта в README/ARCHITECTURE по текущему коду и контракту 0.8.0-mvp. Проверки: одноразовый Python через stdin — 8 UTF-8 файлов, 67 локальных Markdown-ссылок существуют, все 11 исходных URL присутствуют, явных credential patterns в добавленном тексте нет; `git diff --check` passed. Независимая read-only проверка каталога не нашла фактических замечаний. Backend/frontend не менялись, runtime-тесты этого блока не запускались. Новый ADR не нужен: архитектурного изменения нет.

## Проверенный программный checkpoint — сигналы и исходные PDF

Docker запущен по явному разрешению пользователя. Работают только SAQ db/api/worker/frontend; сторонние проекты, включая AssetGuard, остались остановлены. Данные/volumes сохранены. Полный повтор предыдущего checkpoint 24b5c12: 192 backend passed (133.95s), 15 browser passed (38.2s), логи .local/signals-baseline-*.log. Прежний runtime BLOCKED закрыт этими проверками.

Реализованы /signals: immutable snapshot объекта, оснований, факторов, evidence и SHA-256 assets; DRAFT → CONFIRMED/RETURNED с причиной/автором/временем; версии без разветвлений; stale/optimistic revision/CSRF/roles/idempotency/audit. Решение автоматически ставит PDF своей ревизии в общую PostgreSQL очередь. Worker использует lease/claim token и revision fencing. PDF WeasyPrint 70.0: escaped server template, без внешних/file ресурсов, DejaVu RU/KZ, subprocess timeout, immutable content-hash asset. GET не создаёт jobs; failed/corrupt PDF можно явно перегенерировать. Старый draft PDF сохраняется отдельным asset.

Контракт 0.8.0-mvp: 36 операций = 34 implemented + 1 partial + 1 planned. Supporting upload принимает TXT/PNG/JPEG и passive PDF без изменения байтов/SHA. pypdf 6.20.1 проверяет все xref/objStm в bounded Linux subprocess: память 512 MiB, CPU/wall timeout до 10s, до 100 страниц по умолчанию, лимиты объектов/глубины/узлов и два слота на API process. Отказ до сохранения файла/Asset; API ожидает проверку в thread pool. Host Windows PDF получает 503; malformed header/EOF — 415. Формы/пароль/действия/вложения/внешние файлы отклоняются. Оригинал выдаётся только authenticated attachment, автоматический OCR PDF и баллы за upload отсутствуют. Новых endpoint или миграций нет.

Оставшийся partial у отдельного LegalBasis review намеренный: VERIFIED_ABSENT не выставляется одним документом, составной R1 уже реализован. Рекламный collector planned/BLOCKED; предоставленные реестровые источники исследуются отдельно. Полный P0 не принят. Добавлен GitHub job browser-e2e: fresh Compose, приватная конфигурация, права Linux storage, настоящий RU/KZ OCR и весь Playwright; Markdown-only commits не запускают полную сборку. Удалённый [CI для 20ab6f4](https://github.com/temirkhanerbolatovich-coder/saq-qurylys/actions/runs/38703582239) завершён **success**: backend **279 passed (69.59s)**, browser-e2e **17 passed** с настоящим RU/KZ OCR, frontend checks/build. Результаты прочитаны из job logs; cleanup disposable Compose завершён успешно.

## Проверки программного PDF/CI checkpoint

| Проверка | Фактический результат 15.10.2026 |
|---|---|
| Полный backend в Linux | Временный Linux test container Compose api, `pytest -q`, отдельная schema, source/contracts подключены read-only, зависимости dev во временном venv с system-site-packages, cache/pyc отключены — **279 passed (110.26s)**, `.local/supporting-pdf-final-backend-rerun.log`; public не сбрасывался |
| Полный browser | Из frontend `npm run test:e2e` — **17 passed (52.2s)**, `.local/supporting-pdf-final-browser.log`; реальные OCR/БД/review/сигналы/PDF/mobile |
| Focused проверки | Новый validator: 46 passed / 2 skipped на Windows; в полном Linux-прогоне все 48 выполнялись. Проверены active/escaped/unreferenced/objStm, шифрование, формы/вложения, лимиты/timeout/concurrency/protocol. API проверяет все 6 назначений, оригинал/SHA/idempotency/auth/scope и отдельный review/snapshot |
| Статика | Ruff check и format check — 53 файла; frontend typecheck/lint/format check passed |
| Миграции/зависимости | `alembic check`: новых upgrade operations нет; `pip check`: ошибок нет; `npm audit --audit-level=high`: 0 vulnerabilities |
| PDF | `output/pdf/signal-demo.pdf`, 10 страниц, около 37 KiB; DEMO/RU/KZ текстовые маркеры проверены; визуально просмотрены все 10 страниц на contact sheet, страницы 1 и 9 дополнительно в полном размере, читаемо/без перекрытий |
| Перед публикацией | Проверены 413 текущих/исторических Git blobs на известные secrets и явные credential patterns: 0 находок; это не полный security audit |
| GitHub/CI | Создан публичный [saq-qurylys](https://github.com/temirkhanerbolatovich-coder/saq-qurylys); `main` отправлена, локальный/удалённый SHA `dc595e24d9dc249448289b15948a590691abcbac` совпали. Первый [CI](https://github.com/temirkhanerbolatovich-coder/saq-qurylys/actions/runs/38696142426) завершён **success**: backend и frontend. В том первом прогоне browser E2E ещё не было; новый [CI 20ab6f4](https://github.com/temirkhanerbolatovich-coder/saq-qurylys/actions/runs/38703582239) включает 17 browser-тестов и все три job прошли. Workflow содержит PDF runtime dependencies и read-only permissions |

Новые файлы блока: backend/app/pdf_validation.py, backend/tests/test_pdf_validation.py и test_supporting_pdf.py, frontend/tests/supporting-pdf.spec.ts; обновлены 4 upload-формы, route/settings/dependency pins/OpenAPI/env/CI. Документация: FEATURE_SUPPORTING_PDF.md и ADR-007. Предыдущий сигнальный блок: backend/app/{signals,signal_dto,signal_pdf,pdf_render}.py, backend/app/api/{signals,signal_pdf}.py, модели/worker/jobs/settings, миграция e87f4d01a921, backend/tests/test_{signals,signal_pdf}.py, frontend/components/signals-workspace.tsx и frontend/tests/signals.spec.ts, контракт/env/Dockerfile/CI. Документация: [FEATURE_SIGNALS](../FEATURE_SIGNALS.md), [ADR-006](../decisions/ADR-006-immutable-signals-pdf.md), README/ARCHITECTURE/PLAN и [оставшийся чеклист](../REMAINING_CHECKLIST.md). Исходные PDF/DOCX/TZ не менялись; новые зависимости закреплены.

## Текущий P0 checklist

| Блок | Статус | Оставшаяся граница |
|---|---|---|
| Локальный реестр, DEMO 8/12, оригиналы, ручной ввод | VERIFIED локально | Другой ПК и предметная приёмка отдельно |
| OCR/гипотезы/matching/ручные R1–R6/риск/аудит | Функционально VERIFIED; quality OPEN | Rules-1.2: 36 synthetic regression cases, precision/recall 100%/100%, top-3 24/24; внешний holdout и KZ review ещё не приняты |
| Правовое основание и составной R1 | VERIFIED локально | PDF поддерживается по строгой политике; статус одного основания не заменяет составной R1 |
| Сигналы/версии/решения/PDF | VERIFIED локально | Retention, нагрузка и эксплуатационная приёмка отдельно; локальное восстановление проверено |
| Supporting PDF upload | VERIFIED в Linux Docker | Native Windows PDF 503; строгая политика отклоняет часть легитимных интерактивных/подписанных форм. Это не антивирус/очистка PDF |
| Карта | VERIFIED локально | Общие filters/page/card/fallback; 5 новых E2E, mobile/keyboard/200% zoom. Текущая страница, без геокодирования/offline tiles |
| Дизайн-система/UX | Реализовано и технически проверено локально | 35 browser tests, 32 responsive observations, keyboard/contrast/zoom; UX 3–5 людьми, screen reader и реальные устройства отдельно |
| Постоянная UI/UX-инфраструктура | Реализована и проверена локально | Repo Skill/search/Codex discovery, каталог/AGENTS, shared components, reset; входят в текущие 35 browser tests. Другой ПК/личные disabled settings отдельно |
| Источники реестров | Каталог проверен, интеграции OPEN | 11 ссылок предоставлены; паспорт/выгрузка/условия конкретного набора и реальный импорт не проверены |
| Рекламный collector C-01 | BLOCKED | Нужен подходящий рекламный URL/условия, SSRF/redirect/limits и реальный импорт; каталог реестров не закрывает C-01 |
| PostgreSQL+storage backup/restore | VERIFIED на текущем ПК | 16 таблиц, 1093 audit events, 335 Assets, 22 READY PDF; внешний backup, второй ПК и job recovery отдельно |
| Полная приёмка/публикация | IN PROGRESS | Второй ПК, UX 3–5 людьми, защита и сдаваемый SHA |

## Следующее конкретное действие

Новый внешний непросмотренный OCR holdout с правами и проверкой KZ-разметки человеком. Правила исторического контекста, тыс./переносов и KZ-названий уже исправлены и проверены в rules-1.2, повторять этот блок не нужно. Независимо: UX-проверка 3–5 людьми по UI_AUDIT/UX_GUIDELINES, screen reader/touch devices, второй чистый ПК и предметная приёмка. Для отдельного P1-реестра — паспорт/охват/разрешённый образец Ashyq либо data.egov.kz по DATA_SOURCES. Рекламный collector C-01 остаётся BLOCKED до подходящего рекламного URL/условий. Живой показ и сдаваемый SHA требуют подготовки команды; презентацию и видео пользователь исключил. Автопамять не перенастраивать: контекст сохранён здесь.

## История сессий

- 15.10.2026, Codex: от `1577cac` реализован UX «материал → review → сигналы»: прямой переход/focus, группы форм/hints/file size, четыре этапа review/actual count, URL context/history и отсутствие предыдущей очереди при новом фильтре. 35 final browser passed, static/build/audit0 и 32 responsive observations passed; backend/API/данные/guards сохранены. Код `8434d1b` опубликован; exact-SHA CI `38779704092` success: 294 backend/35 browser/27 tool и Skill smoke. Результат сохранён Markdown-only commit.

- 15.10.2026, Codex: от `5bd0cca` внедрены pinned repo UI UX Pro Max, два фактических Codex discovery/search, shared Pagination/TableRegion/reset, H1–H6 tokens, UI_COMPONENTS/UI_IMPLEMENTATION_PLAN и постоянные правила AGENTS. 30 browser / 8 focused, 32 responsive и visual RU/KZ passed; backend/API/данные/dependency locks сохранены. Код `d2d9c6b` опубликован; exact-SHA CI `38768212690` success: 294 backend/30 browser/27 tool и Skill smoke. Финальный статус — Markdown-only commit.

- 15.10.2026, Codex: от `59e870a` выполнены аудит/направление и дизайн-система рабочего досье; 27 browser, финальный UI smoke 5/5, 32 responsive observations, contrast/keyboard/real zoom, static/build passed. Код `53e9ef0` опубликован; exact-SHA CI `38762778431` success: 294 backend/27 browser/27 tooling. Backend/API/данные/риск сохранены. Документация и правило AGENTS добавлены; финальная фиксация статуса — Markdown-only commit.

- 15.10.2026, Codex: продолжение от ffaf5de; 36 synthetic cases/evaluator, baseline/alias fix 8→18 из24 top-3, quality targets OPEN; 293 Linux backend +15 focused,27 Linux tool,22 browser passed; код cba28ec и evidence опубликованы; CI 38756623850 success: 294 backend/22 browser/27 tooling, качество OPEN.

- 15.10.2026, Codex: продолжение от `0927727`; карта/пагинация/fallback, 5 новых E2E, 22 browser passed, 10 вариантов конфигурации, production build и live OSM/200% zoom. Документация обновлена; код `718b28a`, GitHub run `38711042158` success для всех трёх jobs.

15.10.2026, быстрые задачи при 25% лимита: реализована и фактически выполнена согласованная копия/изолированное восстановление PostgreSQL+storage с проверкой таблиц, аудита, снимков/решений и скачиванием сохранённых PDF. Рабочая БД не перезаписывалась, API/worker возобновлены; копия/восстановленные файлы/отчёт остаются в игнорируемой .local. Состояние и проверки описаны выше и в LOCAL_BACKUP. Скрипт и тесты добавлены в GitHub CI; публикация по ранее полученному разрешению, текущая ревизия — git log -1.

15.10.2026, источники РК: исследованы предоставленные пользователем публичные страницы, каталог из 11 исходных ссылок и условия дальнейшего исследования сохранены в DATA_SOURCES; требования/план/архитектура/исследование/чеклист/README синхронизированы. Программный код, контракт, исходные PDF/DOCX/TZ, данные и контейнеры не менялись. API и реестровый импорт не проверялись; C-01 остаётся рекламным collector. Проверки diff/ссылок прошли. Блок сохраняется отдельным Markdown-only commit по ранее полученному разрешению на GitHub push; до публикации origin/main = `4bf01c6`, ревизия самого блока — `git log -1`. Полная CI-сборка для Markdown-only изменений не запускается согласно workflow.

15.10.2026, публикация PDF/CI: code commit `20ab6f4` отправлен в origin/main; GitHub run `38703582239` success. Из job logs подтверждены 279 backend/17 browser и успешный RU/KZ OCR. Изменения статуса/чеклиста сохраняются отдельным Markdown-only commit; повторный CI не требуется и не запускается согласно paths-ignore. Локальные данные и секреты не публиковались.

15.10.2026, исходные PDF: добавлены bounded validation, формы и полный browser CI job. Первый Linux-прогон дал 273 passed / 6 failed из-за общего signed/client fixture в новом тесте анонимного доступа; после отдельного anonymous TestClient полный повтор дал 279 passed. Browser 17 passed. Production-контроль доступа не менялся. Новая зависимость pypdf закреплена; данные/volumes и сторонние остановленные проекты сохранены.

15.10.2026: после разрешения пользователя восстановлен Docker, проверен R1 baseline 192/15; реализованы сигналы/PDF и проведены итоговые 217/16, source checks и PDF QA. Работают только SAQ-контейнеры, сторонние остановленные проекты не запускались. Пользователь отдельно разрешил создать GitHub-репозиторий и выполнить push; репозиторий создан, завершение публикации фиксируется следующим обновлением статуса.

<details>
<summary>Предыдущие checkpoints: история до реализации сигналов (прежние BLOCKED и будущие этапы не описывают текущий статус)</summary>

## Исторический checkpoint R1 (состояние до текущего блока)

### Статус R1

Updated: 2026-10-15 (Asia/Qyzylorda). Последний блок: датированная проверка всех механизмов/R1 и временная согласованность R1/R2. Финальная полная runtime-проверка BLOCKED.
Branch: main. Текущую ревизию см. `git log -1`; удалённый репозиторий не настроен, push/deploy не выполнялись.
Owner: Codex; реализация и продолжение разрешены пользователем. Общие подтверждения повторно не нужны.

## Текущее состояние

**Реестр, OCR/review, ручные R1–R6 и датированное правовое основание реализованы локально. Полный P0 ещё не завершён.** Адрес приложения при работающем runtime: http://localhost:3000. На момент финального checkpoint Docker daemon недоступен, localhost:3000 не отвечает; контейнеры/volumes/public не сбрасывались, daemon и сторонние контейнеры повторно не запускались. Логин/пароль только в игнорируемом `.local/credentials.txt`, не печатать и не вводить в DOM автотестов.

Рабочий путь: новый текст или PNG/JPEG/TXT → сохранённый оригинал/SHA-256/происхождение → явный анализ → durable PostgreSQL job/worker → Tesseract RU/KZ + правила + RapidFuzz → гипотезы/offsets/bbox → ручная проверка/исправление → точная привязка ЖК → доказательство → отдельное решение R2 → серверный риск/аудит. Ни OCR, ни matching сами не начисляют баллы.

Seed: 8 DEMO-объектов и 12 исходных публикаций; новые browser/OCR/restart DEMO-записи добавлены отдельно, seed их не сбрасывает. Синтетические A/B/C (35/yellow, 70/red, 10/green) сохранены предыдущими проверками; реальной проверкой они не являются. Успешные browser-сценарии до финального guard оставили историю по DEMO Ертіс с итоговыми отклонёнными R1–R6/0; по Самал добавлено evidence без изменения исходного R2/балла. Последняя попытка browser-прогона не дошла до входа из-за недоступного runtime.

Целевой контракт 0.6.0-mvp: **36 операций = 27 полностью реализованы + 2 частично + 7 PLANNED**, проверено по implementation metadata. Частичны supporting upload без PDF и review отдельного LegalBasis без VERIFIED_ABSENT; составной R1 проходит отдельный LEGAL_ABSENCE_REVIEW. Текущий блок — docs/FEATURE_LEGAL_ABSENCE.md и ADR-005. Новый R1 хранит точный absence_as_of и не устанавливает бессрочный текущий VERIFIED_ABSENT; PropertyOut.legal_absence_as_of показывает дату отдельно. Совместное CONFIRMED R1/R2 допускается только при известной published_at проверенной оплаты, точно совпадающей с моментом отсутствия; guard действует в обоих порядках под property lock.

## P0 checklist

| Блок | Статус | Проверено / файлы | Осталось |
|---|---|---|---|
| Architecture/API | IN PROGRESS | 36 целевых операций с честным implementation status; OpenAPI и live schema tests | Реализовать оставшиеся операции и весь объём частичных сценариев |
| Seed 8/12 | VERIFIED | Аддитивный seed; A/B/C из БД, источники и DEMO | Не выдавать за реальную проверку |
| Новый материал/происхождение | VERIFIED для текста/PNG/JPEG/TXT | Байт-в-байт оригинал, SHA-256, время сервера, nullable published_at, idempotency | Разрешённый collector отдельно |
| Один permitted collector | BLOCKED | Пользователь ответил: разрешённого сайта пока нет | Домен/URL, условия и реальный допустимый импорт; manual не закрывает пункт |
| PostgreSQL jobs/worker | VERIFIED локально | SKIP LOCKED, lease/claim token, ограниченные попытки, fencing, queued job пережил замену API/worker | Нет heartbeat/HA/нагрузочной приёмки |
| OCR RU/KZ | VERIFIED на двух новых синтетических баннерах | Tesseract 5.3.0 + rus/kaz/eng, реальные bbox, originals SHA; scripts/verify_ocr.py | Независимый image corpus ≥30, сложные/нечитаемые изображения и метрики |
| Extraction/matching | IN PROGRESS | Правила/30 text cases, generic RapidFuzz candidates, ручной выбор | Независимые precision/recall/top-3; качество на реальных материалах |
| Human review/audit | IN PROGRESS: реализация R1–R6 доступна, финальный runtime BLOCKED | Версии, review value, причины/server actor, stale 409, before/after, R3 invalidation; R1 проверка трёх механизмов и двусторонних конфликтов | Повтор полного прогона после восстановления Docker, сигналы и предметная приёмка |
| Risk R1–R6 | IN PROGRESS | Все веса/зоны и A/B/C; ручные R1–R6; exact-instant guard R1/R2 проверен focused-тестами | Финальный полный regression, предметная приёмка и snapshots |
| Legal basis | IN PROGRESS | Typed valid/rejected review и самостоятельный R1; источник/дата/период; применимые VERIFIED_VALID/PENDING блокируют R1 | Финальная runtime-проверка, внешняя предметная приёмка, PDF |
| Dashboard/registry/review | IN PROGRESS | Реальные API, фильтры, карточки, split original/hypotheses, audit; mobile no overflow | Карта, keyboard/200% zoom, UX с 3–5 людьми |
| Signals/PDF | NOT STARTED | Честно обозначены будущим этапом | Snapshot/decision/revision/PDF/оговорка/шрифты |
| Полный E2E/второй ПК/CI | BLOCKED для финального runtime-прогона | До финального guard: 184 backend/15 browser; после: 42 focused + 1 legacy отдельно; source checks выполнены | Повтор 192 backend/15 browser после восстановления Docker; полный P0, другой ПК, GitHub CI, backup/restore, freeze SHA |

## Выполненные проверки

| Проверка | Реальный результат |
|---|---|
| Backend PostgreSQL | До финального joint-date guard: **184 passed**. После guard: **42 focused passed** (45.74s), затем отдельный root legacy case **1 passed / 42 deselected**. Итог полного запуска 192 был потерян при смене задач и не считается подтверждённым. Повторный `pytest -q` с `.local/r1-final-pytest.log` остановлен без итогов при недоступном Docker/PG; **BLOCKED**. `--collect-only -q`: **192 tests collected**, это не успешный прогон. Fixture использует случайную schema, public не очищался |
| Concurrency/recovery | Две одновременные гипотезы/факторы одной revision дают 200/409; устаревшее ORM-состояние перечитывается после lock; late worker не публикует второй результат |
| API/errors/security | Roles/CSRF/Origin, чужие IDs/DEMO scope, точный фрагмент, idempotency, invalid/truncated/MIME images, streamed body limit, unavailable/timeout OCR с сохранением оригинала |
| OpenAPI | Валидатор документа и schemas реальных job/extraction/match/evidence/risk/legal/audit responses |
| Миграции | Исходная + `996510abee9b` + `c4f1a903b812`; Alembic check: No new upgrade operations detected |
| Backend quality | Ruff check/format (41 source/test files), pip check и Alembic — без ошибок до смены runtime. Новые финальные попытки не подменяют эти source результаты |
| Frontend | Production build, typecheck, lint, format:check прошли до смены runtime; npm audit ранее дал **0 vulnerabilities**, в блоке R1 повторно не запускался |
| Browser Docker | До финального joint-date guard **15 passed**, включая R1, прежние R2–R6/OCR/mobile сценарии. Финальный запуск после guard с `.local/r1-final-browser.log`: **15 failed из-за ECONNREFUSED localhost:3000**, Docker engine pipe отсутствует. Это инфраструктурный **BLOCKED**, не подтверждение regression продукта и не финальный passed |
| OCR smoke | Новый RU и KZ PNG вне seed: по 2 payment clauses/PENDING с bbox, original SHA идентичен; output/qa/ocr-verification.json |
| OCR observations | CER RU 0.0541 / KZ 0.1026 на **двух чистых синтетических баннерах**, без заявления production accuracy. Потеря казахской диакритики явно показана |
| Actual queue restart | Worker остановлен, новый PNG job сохранён QUEUED; API/worker пересозданы из новой сборки; SUCCEEDED, ровно одна версия, original SHA сохранён. `.local/queue-restart-check.json` |
| Visual QA | Просмотрены review-ocr.png / review-r2.png; источники, статус, предупреждение и действия читаемы |
| Retained state | Существующие public данные/исходные документы сохранены; credentials и runtime artifacts игнорируются Git |

Системные OCR-пакеты фактически установлены в Docker: tesseract 5.3.0-2, rus/kaz/eng 1:4.1.0-2. Apt packages не pinned по digest; Python/JS lock-файлы закреплены. GitHub CI не выполнялся: remote отсутствует. OCR failure/fencing unit-тесты используют управляемую замену распознавания; реальные RU/KZ задания проверены отдельно.

## Решения и ограничения

- PostgreSQL queue и worker из одной backend-сборки, без Redis/Celery: достаточно для объёма MVP; ADR-002.
- Raw OCR и оригинал не перезаписываются. Исправление расшифровки — дочерняя версия; review — отдельное значение и аудит.
- Изменение используемой гипотезы снимает зависимый CONFIRMED R2; исправление расшифровки или привязки снимает зависимые R2/R3 в PENDING. Новый автоматический анализ сам не меняет уже проверенные факторы.
- Текущий риск, уникальный фактор property/code; исторический as_of чтения пока возвращает 400. Дата оценки R1/R3/R5/R6 отделена от reviewed_at. Новый R1 требует точного совпадения as_of с absence_as_of документа, а совместная пара R1/R2 — с известной published_at хотя бы одного проверенного источника оплаты. Неизвестная дата не заменяется captured_at. Формула/веса сохранены; это консервативная контекстная проверка до подтверждения, не historical replay.
- R1 сохраняет проверку трёх проектных механизмов и причины каждого результата; UNKNOWN/NOT_FOUND/UNAVAILABLE не доказывают отсутствие. Применимые VERIFIED_VALID/PENDING документы блокируют создание/подтверждение R1; обратное подтверждение основания при CONFIRMED R1 той же области/даты даёт 409. Новый R1 не создаёт sticky VERIFIED_ABSENT; legal_absence_as_of показывает историческую дату отдельно. Legacy DEMO-агрегат снимается при явном пересмотре старого R1. Подлинность/полнота/правовая достаточность остаются предметом человека; ADR-005.
- Один календарный день R3 и строгие дата/ключ/методика R5 — консервативная политика MVP, а не правовая норма. Разные SHA не доказывают подлинность/независимость; существенность R6 оценивает человек. ADR-004.
- Нет quotas/retention/антивируса, SSO/admin password UI/distributed rate limiting, HA/heartbeat, backup/restore acceptance. Orphan content-hash файл при DB rollback возможен. DB audit не криптографически неизменяемый.
- 30 текстовых регрессий не являются независимым benchmark. Два новых OCR-баннера не заменяют ≥30 image corpus или реальную предметную проверку.
- Proxy ограничивает PNG/JPEG body 10 MiB + 64 KiB overhead. При изменении backend MAX_UPLOAD_BYTES выше этого нужно синхронизировать proxy.
- Diagnostic repr настроек показал локальный DB password: repr секретов отключён, пароль заменён и env/контейнеры обновлены. В Git секреты не добавлялись. Предыдущий риск DOM/trace уже закрыт API-auth автотестами.

## Следующее конкретное действие

Сначала после восстановления Docker пользователем: проверить SAQ runtime, не поднимая посторонние сервисы, повторить `pytest -q` (192 collected) в случайной test schema и `npm run test:e2e` (15 tests) с сохранением итоговых логов. Полный final regression R1 сейчас BLOCKED; не объявлять его завершённым по старым 184/15 или сумме focused-тестов. После успешного checkpoint следующий продуктовый блок — snapshots/решения сигналов и PDF. PDF supporting documents и их безопасная обработка остаются отдельной задачей. Collector BLOCKED до разрешённого источника.

## Продолжение сессии

Сначала прочитать AGENTS/этот статус/docs среза 02 и R1, `git status`, `git log`, текущие файлы/tests. Не сбрасывать public/volume/storage или пользовательские изменения. Все up команды dev окружения — с `-f docker-compose.yml -f docker-compose.dev.yml`, чтобы не потерять порт 55432. На этом checkpoint daemon недоступен; его запуск оставлен пользователю, сторонние остановленные контейнеры не поднимать. Не делать новую сборку ради перезапуска уже собранного runtime. Перед frontend build останавливать host standalone server, если он есть. Не печатать `.env`/credentials. Не публиковать/не деплоить без явного запроса.

История: 05dbbfc — первый срез, 2ecc6ba — его checkpoint; текущий OCR/review commit см. git log. Исходные PDF/DOCX/CODEX_TZ/шаблон статуса не изменены. Публикация в GitHub, внешний deploy, отправка материалов и юридическая приёмка не выполнялись.

## Быстрые задачи после 9ab92bf · 14.10.2026

Закрыто: UTF-8 TXT upload до 100000 символов через существующую файловую форму; сохраняются исходные BOM/CRLF/байты и SHA, правила выполняются без OCR. Проверяются кодировка, пустой текст, бинарные controls, размер и MIME. UNKNOWN стадия теперь «Не проверена»; R4/R5/R6 имеют собственные подписи. Новых зависимостей/миграций/архитектурных решений нет.

Проверки этой задачи: **78 backend passed**, **8 browser passed** на обновлённом Docker-приложении; Ruff check/format, frontend lint/typecheck/format:check; Docker build/up (включает production Next build), git diff --check. Browser-проверка UNKNOWN/R5 использует подмену ответа только для представления, не изменяет решения БД. Npm audit и второй ПК в этой короткой задаче повторно не запускались. README/контракт/changelog и срез 02 обновлены. Следующая крупная задача и блокер collector прежние. Пользователь попросил ограничиться быстрыми задачами из-за остатка лимита.

## Коллективное обращение / R4 · 15.10.2026

Закрыт самостоятельный путь: analyst upload документа TXT/PNG/JPEG → неизменяемый source_details (ЖК/дата/источник/методология/число заявителей) → COLLECTIVE_APPEAL evidence → PENDING R4/0 → отдельное CONFIRMED +15 либо REJECTED 0, с revision/аудитом. Подлинность/полномочия заявителей — предмет ручной проверки, не OCR-вердикт. PDF и остальные виды документов пока не поддерживаются. Ни загрузка, ни количество заявителей сами не подтверждают риск.

Аддитивная миграция c4f1a903b812 добавляет nullable assets.source_details, старые исходники не меняет. Контракт: 36 операций, 22 полностью, 4 частично (asset upload/R2/R4), 10 PLANNED. Ранее указанный PARTIAL_R2 объём расширен, описание первоначального среза историческое.

Проверено: **85 backend passed**, **9 browser passed**, Docker build/up (production Next build), Ruff check/format, frontend lint/typecheck/format, Alembic check (No new upgrade operations detected). Проверки включают чужой ЖК, подмену клиентом source/count, дату в будущем, одного заявителя, пустую методологию, роль viewer, stale 409, загрузку только attachment и полный R4 +15 → 0. Browser оставляет историю R4 по DEMO Ертіс с отклонённым фактором. README/changelog/контракт и docs/FEATURE_COLLECTIVE_APPEAL.md обновлены. Новых пакетов нет, ADR не нужен: сохранены существующие SQL/JSON/idempotency/actor patterns. Внешний CI, security audit зависимостей и другой ПК в этой задаче не выполнялись.

Следующая задача: PDF supporting documents и typed legal basis review; затем R1/R3/R5/R6 guards. Сигналы/PDF-экспорт/карта/collector открыты; collector по-прежнему без разрешённого источника. Большие блоки в текущий короткий бюджет не включены.

## Правовое основание и применимость · 15.10.2026

Закрыт следующий связный сценарий: документ LEGAL_BASIS с immutable source → PENDING LegalBasis + LEGAL_DOCUMENT evidence → отдельная VERIFIED_VALID/REJECTED проверка на дату → актуальная применимость/фильтр/аудит. Три механизма из проектной модели; конкретный ЖК/очередь без наследования. Новые подтверждения требуют номера/даты/начала периода, собственного evidence и сохранённого оригинала с верным SHA. Риск при создании/проверке не начисляется, отклонение и истечение не подтверждают отсутствие основания. VERIFIED_ABSENT и ручной R1 пока 422. Противоречие с CONFIRMED R1 того же периода/ЖК блокируется 409; автоматического снятия R1 нет.

AssetUpload теперь принимает purpose=LEGAL_BASIS или default COLLECTIVE_APPEAL. Для обращения по-прежнему нужны ≥2 заявителя; для основания count запрещён. Старые обращения без purpose поддерживаются. Файлы TXT/PNG/JPEG, PDF пока не добавлен. LegalBasis.evidence_ids/verification_as_of — явные контрактные добавления. Существующие JSON-таблицы используются без новой миграции. Новый текущий контракт: **36 операций = 24 полностью доступны + 5 частично + 7 PLANNED**.

Текущий legal status объекта вычисляется из подтверждённых документов/периодов при чтении; фильтр и dashboard используют тот же результат. Истёкший документ не оставляет действующий VERIFIED_VALID без cron. Синтетическая seed-гарантия без периода/явные seed-статусы сохранены как legacy; это не новая правовая приёмка. Подлинность/отзыв во внешнем реестре автоматически не проверяются. Read-time вычисление сейчас использует дополнительные запросы на объект, допустимо для 8 DEMO; batch оптимизация перед большим реестром. ADR-003 фиксирует этот выбор.

Проверено: **105 backend passed** на отдельной PostgreSQL schema, **10 browser passed** на Docker до последнего уточнения текста/сворачивания новой формы; изменённый legal browser-сценарий проверен отдельно после обновления сборки. Backend regression включает periods/expiry/multiple docs, 3 mechanisms, role/DEMO/чужой документ, idempotency, wrong period/type/company, missing original и границу суток UTC/Asia-Qyzylorda, conflict R1 и concurrent review 200/409. Legal workflow: PENDING → valid → reload → reject, неизменный риск/R1 отсутствует, audit и mobile no overflow. Ruff check/format, frontend lint/typecheck/format, Docker build/up (Next production build), OpenAPI/live DTO, Alembic check и pip check прошли. Внешний CI, второй ПК, актуальная юридическая экспертиза и dependency security audit в этом этапе не проводились.

README/архитектура/план/changelog/контракт обновлены; новая документация docs/FEATURE_LEGAL_BASIS.md и docs/decisions/ADR-003-dated-legal-applicability.md. Визуально просмотрен output/qa/legal-basis-review.png. Автотесты оставляют дополнительные DEMO-карточки/историю оснований по DEMO Алтай, итог — документы отклонены; seed A/B/C не сбрасывался.

Следующий блок: PDF supporting documents и безопасная обработка, либо самостоятельные typed evidence/guards R3/R5/R6; затем полноценная проверка отсутствия механизмов/R1 и разрешение противоречий. Сигналы со snapshots/решением/PDF, карта, разрешённый collector, большой независимый OCR corpus, backup/restore и GitHub CI ещё открыты. Collector BLOCKED: пользователь не предоставил разрешённый источник. Никаких push/deploy/внешних сообщений не выполнялось.

## Документы строительства и R3/R5/R6 · 15.10.2026

Завершён связный блок: upload самостоятельного TXT/PNG/JPEG с purpose и типовыми датированными фактами → неизменяемый source snapshot → evidence → PENDING фактор/0 → отдельное подтверждение/отклонение → серверный балл/ревизия/аудит. R3 требует известной даты рекламы, проверенной привязки версии и отдельного UNDER_CONSTRUCTION документа; один и тот же оригинал нельзя использовать дважды. R5 требует DECLARED/VERIFIED с разными SHA, общей областью/методикой/календарным днём и абсолютной разницей ≥20 п.п. R6 сохраняет плановый срок, состояние и при необходимости фактическую сдачу; существенность обосновывает аналитик. Порог дней не придуман. Date-only сравнения — Asia/Qyzylorda. Один день R3 и строгое сравнение R5 явно обозначены как консервативные продуктовые ограничения MVP (ADR-004), без заявления правовой достаточности.

Дата оценки as_of отделена от серверного reviewed_at. Изменение привязки/расшифровки снимает зависимый CONFIRMED R3 в PENDING. Сервер копирует факты из исходного документа, проверяет доступность/SHA/дату/область/DEMO; поля стройки нельзя подставить в R2 или обращение. Новых таблиц/миграций/зависимостей нет. Контракт 0.5.0-mvp по-прежнему **36 = 24 fully + 5 partial + 7 planned**. Ручной R1 и отсутствие всех правовых механизмов пока 422.

В UI добавлены три формы и показ типовых фактов в evidence. При частичном сбое успешные upload/evidence и idempotency keys повторно используются в памяти текущей страницы. После reload незавершённая форма не восстанавливается; файлы/evidence сохраняются. Общие поля стадии/готовности карточки автоматически не перезаписываются, датированные факты видны в доказательствах. При общей проверке обнаружена и исправлена гонка R2: до успешной загрузки текущего фактора сохранение/решения блокируются, при ошибке доступен retry. Regression удерживает ответ объекта и доказывает отсутствие повторного POST createfactor.

Проверено: **149 backend passed** (`pytest -q`, отдельная PostgreSQL schema, public сохранён), **44 focused construction passed**, **14 browser passed** на новой Docker-сборке. Проверки включают 19.99/20 п.п. и 80.1–60.1, неправильные роли/область/методику/даты/DEMO, одинаковые оригиналы R3/R5, future/unknown публикацию, новую версию без match, invalidation, недоступный оригинал, viewer, idempotency/stale audit. Browser R3 +10→0, R5 +10→0 с искусственным 503 второго evidence и повтором без новых upload, R6 +5→0, реальные OCR и старые workflows; тест R2 ожидания загрузки не меняет seed-фактор Самал. После финального уточнения текста предупреждения о готовности обновлены API/worker, R5 browser workflow повторён отдельно: **1 passed**.

Ruff check/format, frontend lint/typecheck/format:check, Docker build/up (Next production build), Alembic check (No new upgrade operations detected), pip check, OpenAPI/live DTO и git diff --check пройдены. Скан известных локальных secret values по tracked/new nonignored файлам — без совпадений; это не полноценный security audit. Внешний CI, второй ПК, dependency audit и предметная приёмка в этом этапе не выполнялись. Снимок output/qa/construction-r5.png просмотрен; mobile overflow test прошёл. Сторонний AssetGuard остался остановленным, исходные документы сохранены.

Обновлены README/архитектура/план/changelog/контракт/этот статус; новые docs/FEATURE_CONSTRUCTION_REVIEW.md и docs/decisions/ADR-004-dated-construction-evidence.md. Изменения сохраняются локальным commit, ревизия — `git log -1`; remote отсутствует, push/deploy не выполнялись. Следующее действие: полный самостоятельный сценарий отсутствия всех механизмов/R1 с датой/областью/противоречиями, затем сигналы со snapshots/решением/PDF. PDF supporting documents, карта, независимые OCR метрики/предметная проверка, backup/restore/CI открыты. Collector остаётся BLOCKED без разрешённого источника.

## Датированная проверка всех механизмов / R1 · 15.10.2026

Реализован самостоятельный LEGAL_ABSENCE_REVIEW: upload TXT/PNG/JPEG → immutable source с property/scope/absence_as_of/event_at и результатом/причиной каждого механизма → evidence → PENDING R1/0 → отдельное CONFIRMED/+35 либо REJECTED/0 с revision/аудитом. Проверяются KZHK_GUARANTEE, BANK_WITH_MIO_PERMIT и FRAME_WITH_MIO_PERMIT. Неполные, NOT_FOUND/UNAVAILABLE/UNKNOWN материалы сохраняются, но не подтверждают R1. Требуется ровно одно evidence, охватывающее все три DOCUMENTED_ABSENT, и точное совпадение as_of фактора с absence_as_of документа; ретроспективная дата допустима, дата документа не предшествует ей. Это проектная процедура проверки сохранённых материалов, без автоматической правовой квалификации или внешнего доказательства.

Применимые VERIFIED_VALID/PENDING основания той же очереди и даты блокируют R1; проверяются период и дата выдачи документа. Обратное подтверждение действующего основания при CONFIRMED R1 требует явного разрешения противоречия. Новый R1 не выставляет sticky VERIFIED_ABSENT; legal_absence_as_of показывает историческую дату отдельно. Явный пересмотр legacy R1 снимает старый бессрочный DEMO-агрегат. Подтверждение одного LegalBasis по-прежнему не поддерживает VERIFIED_ABSENT: отклонение отдельного документа не исключает все механизмы.

При проверке нового RED-сценария обнаружено некорректное сочетание отсутствия за 2020 год и рекламы без известной даты, полученной в 2026 году. Исправлен backend guard до подтверждения: R1/R2 могут быть одновременно CONFIRMED только при известной published_at хотя бы одного проверенного источника оплаты, точно совпадающей с instant R1; оба порядка подтверждения защищены property lock. Моменты разных TZ сравниваются как одно событие, разные секунды одного дня не считаются совпадением. Формула/веса не менялись; R2/R3 без R1 продолжают прежний путь. Guard новых решений не является миграционной перепроверкой сохранённых seed-состояний или полным historical replay.

Файлы блока: backend/app/legal_absence.py, backend/app/{analysis_dto,construction,dto,legal,views}.py, backend/app/api/{reviews,legal_bases}.py; backend/tests/test_legal_absence.py; frontend/components/legal-absence-review.tsx и workspace.tsx, frontend/lib/types.ts, frontend/tests/legal-absence.spec.ts; contracts/openapi.yaml; docs/FEATURE_LEGAL_ABSENCE.md и docs/decisions/ADR-005-dated-all-mechanism-absence.md; README/CHANGELOG/ARCHITECTURE/PLAN/FEATURE_LEGAL_BASIS/этот статус. Новых таблиц, миграций и зависимостей нет. Контракт **36 = 27 fully + 2 partial + 7 planned** проверен по metadata.

Проверки разделены по версии, без подмены потерянного результата:

1. До финального joint-date guard корневой агент получил **184 backend passed** и **15 browser passed**; source build/typecheck/lint/format, Ruff (41 files), OpenAPI, Alembic и pip check прошли. Browser R1 проверил неполное UNKNOWN → сохранённый материал/0 → полную проверку → PENDING/0 → +35 → reload → отклонение/0, аудит и mobile. Эти результаты относятся к состоянию до последнего guard.
2. После exact-date guard независимый `pytest tests/test_legal_absence.py -q` дал **42 passed in 45.74s**. Проверены совпадение дат в обоих порядках, эквивалентный UTC instant, unknown/другой год/+1 секунда с 409 и неизменным прежним подтверждением. После последних audit/legacy уточнений корневой агент выполнил отдельный case: **1 passed / 42 deselected**. Итогового прогона всех 43 R1 cases вместе не заявляем.
3. Финальные полные 192/backend и 15/browser были запущены в прежних сессиях без сохранённых логов; после смены задачи polling вернул Unknown process id. Их результат неизвестен и **не записан как passed**.
4. Повтор с сохранением логов в `.local/r1-final-pytest.log` и `.local/r1-final-browser.log` выявил остановленный Docker daemon: отсутствует dockerDesktopLinuxEngine pipe, localhost:3000/PG недоступны. Playwright завершился **15 failed / ECONNREFUSED**, pytest остановлен без итогового результата. Это инфраструктурный **BLOCKED**, а не доказанный regression продукта. `pytest --collect-only -q` сохранил **192 tests collected** в `.local/r1-final-collect.log`; collection не заменяет выполнение. Ручной запуск daemon/посторонних сервисов не выполнялся, public/volumes не удалялись.

Перед локальным сохранением повторены проверки текущего source: `.venv\Scripts\python.exe -m ruff check backend/app backend/tests backend/alembic` — passed; `ruff format --check` — 41 files already formatted; frontend `npm run typecheck`, `npm run lint`, `npm run format:check` — passed. Скан известных локальных secret values по tracked/new nonignored файлам — без совпадений; это ограниченная проверка, не полный security audit. Независимый read-only review и `git diff --check` пройдены. Попытка Ruff через системный Python выявила отсутствие модуля; успешные проверки выполнены проектным `.venv` по README, зависимости не менялись.

Текущий checkpoint оставляет финальную runtime validation неполной. После восстановления Docker пользователем нужно повторить полный `pytest -q` в отдельной schema и `npm run test:e2e` с логами, затем обновить статус фактическими итогами. Исторические результаты выше сохранены как этапы, не переписаны в новую приёмку. Изменения R1 прошли review и сохраняются локальным commit корневым агентом, ревизия — `git log -1`; удалённый remote/push/deploy отсутствуют. Следующий продуктовый блок после проверки — snapshots/решения сигналов/PDF; supporting PDF, collector, карта, независимая предметная/юридическая приёмка и полный P0 остаются открыты.

</details>


## 19.10.2026 — рабочие данные ВКО вместо DEMO

По явному запросу владельца удалены 232 DEMO-публикации, 8 DEMO-досье и зависимые учебные записи; DEMO-проверяющий удалён. Реальные 4 публикации Primeminister.kz, документ КЖК, учётная запись аналитика сохранены. Импортированы 19 PROJECT-досье: 15 строк перечня и 4 рекламных кандидата; 19 материалов-наблюдений. Итого 19 досье, 23 материала. CSV/XLSX пары сверены по всем строкам; дополнительные листы сохранены в исходном пакете, не превращены в новые нарушения. Застройщики не установлены: индивидуальные placeholders, БИН отсутствует. Статусы UNKNOWN, координаты/стадия/даты публикации не выдуманы. Нет новых факторов, сигналов, подтверждённых связей, анализа или уведомлений. Все четыре рекламные строки содержат «Не доказано текущее нарушение».

Исполнитель: Codex. Базовая ревизия b156086; ветка codex/audit-workflow-fixes, накопленный dirty diff сохранён, commit/push не выполнялись. Primary остаётся на прежнем образе API и схеме c81d0e5f3472: незавершённые изменения приложения не развёрнуты. API/frontend запущены локально; UI-вёрстка не менялась, новая визуальная/responsive-приёмка не выполнялась.

Проверки: `backup_local.py create` и `verify` PASS (24 таблицы, 555 assets, исторические PDF); пробная транзакция ROLLBACK и применение на offline-клоне PASS; применение primary PASS; все is_demo-счётчики 0. Авторизованные HTTP-проверки: 19 досье/историй, 23 материала, скачивание 19 новых assets с SHA-256 PASS; все текущие файлы assets проверены. 3 regression unittest PASS, Ruff check/format PASS, repository hygiene и git diff --check PASS. Исходный файл gov.kz независимо не подтверждён: сохранена атрибуция пользовательского пакета; правовая/внешняя предметная приёмка открыта. Полный E2E повторно не запускался.

Операционные файлы: scripts/replace_demo_data.py, scripts/test_replace_demo_data.py, docker-compose.yml, .env.example. DEMO_SEED_ENABLED=false в приватном .env исключает повторное заполнение при старте; strict gate true/false проверен на shell-заглушках. Исходники и SHA: `.local/vko-replacement-20261019/imported/`; доказательства `.local/vko-replacement-20261019/final-counts.json`. Проверенный backup до замены: `.local/backups/20261019T070305Z-4a40d923b3e84d008b3946531ac138b4`. Скопированные в backup DEMO-файлы удалены из рабочего storage, актуальные originals сохранены. Архивы QA и backup сохранены.

Следующий шаг: предметно проверить точные объекты/очереди, первичные разрешительные документы и исходные рекламные страницы; подтверждать OCR/identity/основание/фактор отдельно. Не присваивать R1 по отсутствию строки в перечне.
