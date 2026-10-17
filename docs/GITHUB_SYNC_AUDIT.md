# GitHub: совместимость публикации с frontend · 17.10.2026

**Продолжение:** после этого аудита пользователь разрешил интеграцию и push.
В `codex/integrate-frontend-backend` объединены frontend версии, исправлен Next root,
корневые uploads/ZIP исключены из нового дерева, добавлены CI hygiene/config tests.
Наша локальная конфигурация не совпадает с четырьмя раскрытыми секретами ZIP;
владелец другой копии должен заменить её доступы. История не переписывается.
Финальная проверка и ревизия публикации — [PROJECT_STATUS](../PROJECT_STATUS.md).
Ниже сохранён исходный аудит **до исправлений**, а не текущий запрет.

**Решение: текущий набор нельзя безопасно отправлять прямо в main.**
Git-объединение не конфликтует, но наблюдался сбой host production start;
новые frontend-материалы ещё не встроены в рабочую структуру и содержат
различающиеся версии. В опубликованном ZIP также обнаружены секреты конфигурации.
Это проверка и подготовка изолированной копии, не разрешение на push/merge/deploy.
Ничего не опубликовано, ветка/реальный index и файлы приложения не менялись.

## Проверенные ревизии

| Состояние | SHA |
|---|---|
| Общая база | `e993dc855da00fd5d65c980caeb53ba139d4ce92` |
| Локальный main | `f9db50bbed7e8ba1f2897a5d5151d47cef332216` |
| origin/main после свежего fetch | `986ca90a17188b0b4c9bd4116aafc05d845fea9b` |
| Пробное объединённое дерево, без commit/ref/index changes | `2284af7c6af5f3a76faed13af13cd9cd1f194dca` |

`git rev-list --left-right --count HEAD...origin/main` = **1 / 3**.
Обычный push локального main без синхронизации будет non-fast-forward;
force push уничтожит из main работу frontend и не допускается.

Три новых remote-коммита: `07fd9b2` (ZIP), `9003323` (отдельные файлы),
`986ca90` (обновлённый ZIP). Они **добавляют55путей в корень**, существующие
`frontend/` и backend-файлы относительно общей базы не меняют.
Это проверено diff от merge-base, а не ошибочным сравнением HEAD..origin/main,
в котором отсутствие нашего неопубликованного checkpoint выглядит как удаления.

Сравнение всех локальных изменений от базы, включая checkpoint, dirty и untracked:
141локальный путь,55remote, **пересечений0**. `git merge-tree --write-tree
--name-only HEAD origin/main` exit0. Совпадение текстов не заменяет runtime-проверку.
Состояние34dirty/untracked файлов на момент создания стенда наложено отдельно.
Наш checkpoint включает126файлов frontend/backend/docs и4миграции; будущий push
всего main нельзя описывать как публикацию только очереди, compare или AI tooling.

## Что фактически загружено по frontend

Корневые `workspace.tsx`, `analysis-workspace.tsx`, `design-system.css`,
`package.json`, `route.ts` и другие файлы сами по себе не заменяют приложение:

- Compose собирает `context: ./frontend` — `docker-compose.yml:52`.
- CI frontend запускается с `working-directory: frontend`.
- `frontend/app/layout.tsx` импортирует `@/components/workspace` и соседние CSS;
  alias `@/*` в `frontend/tsconfig.json` относится к каталогу frontend.
- В корневом наборе отсутствует требуемое расположение `app/components/lib`,
  а `package.json` ожидает `scripts/start.mjs`, хотя загружен корневой `start.mjs`.

Последний ZIP содержит363файла под `saq-qurylys-main/saq-qurylys-main/`,
из них54frontend-файла.12отличаются от активного remote frontend,
22 — от локального HEAD. В архиве есть отдельные изменения обзора, сигналов и карты:
`property-map.tsx`304строки против243в remote/корневом дубликате.
Корневой `signals-workspace.tsx`1348строк, архивный965; CSS и workspace также
различаются. Архивный статус говорит о работе в отдельной папке без `.git`;
заявленные там build/E2E не принимаются за новые выполненные проверки.

Нельзя предпочесть весь ZIP или весь корневой набор без слияния. Например,
корневые analysis/types/proxy не содержат части уже существующих возможностей:
persisted review drafts, pagination/filter/deep links, некоторых audit/pending
types, специального5MB лимита open-registry upload. Корневой workspace также
по-прежнему подменяет остаток решений processing-статусом READY_FOR_REVIEW.
Перенос поверх текущего frontend может вернуть эти ограничения.

## Наблюдавшийся сбой build → start

Корневой `package-lock.json` **влияет на Next.js**, даже когда корневые TSX не
импортируются. Next16.4 выбирает верхний lockfile как tracing/Turbopack root.
Это отдельно воспроизведено штатной `findRootDirAndLockFiles`, затем подтверждено
полным build из объединённой копии.

Копия создана в ignored `.local/github-publish-audit-20261017/candidate`:
`git archive` объединённого дерева, безопасная tar extraction, затем overlay34
локальных файлов; ни stash, ни pull/merge в рабочем checkout не выполнялись.
`npm ci --ignore-scripts --prefer-offline --no-audit --no-fund` завершился exit0.

| Проверка в candidate/frontend | Наблюдавшийся результат |
|---|---|
| `npm run typecheck` | PASS |
| `npm run lint` | PASS |
| `npm run format:check` | PASS |
| `npm run build` | PASS, предупреждение о выборе корневого package-lock.json |
| `.next/standalone/server.js` | Отсутствует |
| `.next/standalone/frontend/server.js` | Создан |
| `npm run start`, отдельный PORT3199 | **FAIL, exit1, MODULE_NOT_FOUND** |

`frontend/scripts/start.mjs:7` ожидает `.next/standalone/server.js`, поэтому
успешная компиляция не даёт работоспособный host start. Сервер не запустился,
процесса после проверки не осталось. Docker context `./frontend` не включает
родительский lockfile, поэтому этот конкретный root-selection механизм там
отсутствует; свежая Docker-сборка и Docker/browser E2E не выполнялись.

Логи: `.local/github-publish-audit-20261017/frontend-{typecheck,lint,format,build,start}.log`;
ревизии/overlay — `summary.json`. Исходное приложение и его `.next` не пересобирались.

## Backend/API

Новые queue/compare изменения относительно локального HEAD добавляют два GET
и DTO, не меняя AST существующих declarations advertisements/analysis DTO.
Все41прежних paths/105schemas контракта относительно HEAD структурно сохранены;
добавлены `/advertisements/review-queue` и `/advertisements/compare`.
Uploaded UI вызывает прежние advertisement/extraction/match/analyze маршруты,
новые GET пока не использует. AI evaluators не входят в production UI pipeline.

Относительно более старого remote контракта изменения шире: добавлены monitoring
и реализован прежде PLANNED URL-import; прочие изменения существующих paths —
описания audit/Telegram, Dashboard — уточнение смысла счётчика, AuditEvent —
два необязательных поля. Нельзя на основании сравнения только двух новых GET
объявлять весь126file checkpoint принятым. В этой сессии backend/миграции и
полный сквозной сценарий заново не запускались; прежние прогоны — PROJECT_STATUS.

GitHub REST API показал0открытых PR, только main в heads; [CI для986ca90](https://github.com/temirkhanerbolatovich-coder/saq-qurylys/actions/runs/39033732564)
завершился success по backend/frontend/browser-e2e. Этот CI проверял активный
`frontend/` и Docker E2E той ревизии, а не распакованный ZIP, корневые TSX или
наш кандидат. Его успех не опровергает воспроизведённый host start failure.

## Опубликованный ZIP: конфиденциальность

В архиве есть **`.env` и `.local/credentials.txt`**, заполненные значения
POSTGRES_PASSWORD/DATABASE_URL/SESSION_SECRET/BOOTSTRAP_ANALYST_PASSWORD
отличаются от `.env.example`; файл credentials содержит подпись пароля.
Значения не выводились в чат, логи или этот документ. По именам настроек
других внешних API-токенов не обнаружено; это не полный secret scan.
Также присутствуют72storage-файла и30output-файлов, которым не место в source ZIP.

Эти доступы следует считать раскрытыми и заменить владельцем. Новый коммит с
удалением ZIP не удалит уже опубликованную версию из истории. Замена секретов,
удаление архива/очистка GitHub history и отзыв сессий этой проверкой не выполнялись;
переписывание истории требует отдельного согласованного действия с командой.
Frontend-исходники из ZIP нужно предварительно сохранить без env/credentials/data.

## Безопасный следующий порядок

1. Сохранить обе версии frontend в локальных копиях/ветках; перенести из ZIP
   только проверенные исходники, исключив секреты, storage и outputs.
2. Согласовать рабочую версию карты/сигналов/CSS и выполнить трёхстороннее
   слияние в `frontend/`, сохраняя текущие API/роли/черновики/доказательства.
3. Устранить неоднозначность root lockfile: правильное расположение проекта
   либо явно заданный frontend tracing/Turbopack root. Повторить **build и start**,
   затем browser E2E с backend; успешного build недостаточно.
4. Синхронизировать на отдельной `codex/` ветке с актуальным origin/main,
   сохранить55remote путей до осознанной интеграции, проверить миграции/контракт,
   полный diff, отсутствие секретов и чистоту будущего набора публикации.
5. Публиковать ветку/PR только после отдельного разрешения пользователя и свежей
   проверки remote SHA. Обычного force push/замены main не применять.

Итог: наши новые backend API/tooling сами по себе не перезаписывают55remote
добавлений, но безопасная публикация всего текущего состояния пока не подтверждена.
Потребуется исправить наблюдённый start failure, сохранить и интегрировать работу
frontend и отдельно устранить раскрытие конфигурации. До этого push не выполняется.
