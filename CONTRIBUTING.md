# Работа с репозиторием SAQ QURYLYS

Frontend находится в `frontend/`, API/worker — в `backend/`, контракт — в
`contracts/openapi.yaml`. Не загружайте отдельные TSX/CSS/config файлы в корень
и не отправляйте ZIP проекта: GitHub не восстанавливает структуру папок по именам.
Код собирается из рабочих каталогов, а не из прикреплённых архивов.

Перед началом прочитайте AGENTS.md и PROJECT_STATUS.md. Для интерфейса также
нужны docs/DESIGN_SYSTEM.md, UX_GUIDELINES.md, UI_COMPONENTS.md и UI_AUDIT.md.

## Обычный порядок

Начинайте с чистого checkout; незавершённые изменения сначала сохраните отдельным
коммитом своей работы. Не применяйте reset/clean/force push для устранения конфликтов.

```powershell
git switch main
git pull --ff-only origin main
git switch -c codex/short-feature-name
```

Меняйте файлы по правильным путям, явно согласовывайте общие CSS/tokens/lockfiles
при одновременной работе. API/роли/риск/доказательства/снимки не меняются ради
новой компоновки. Если имя/путь конфликтует — сравните обе версии, не заменяйте
всю папку более старой копией.

Для frontend:

```powershell
cd frontend
npm ci
npm run typecheck
npm run lint
npm run format:check
node --test scripts/test-*.mjs
npm run build
npm start
```

Проверьте именно запуск после build. Browser E2E требуют локальный API/worker/БД
и тестовые fixtures; команды/настройки — README и проектный CI. Проверяйте реальные
страницы на375/768/1024/1440px, loading/error/empty и клавиатуру. Backend изменения
проверяются соответствующими pytest, Ruff и миграциями; не выдавайте static checks
за полный E2E или внешнюю приёмку.

После проверки обновите документацию/PROJECT_STATUS с фактическими результатами.
Перед коммитом из корня:

```powershell
git diff --check
git status --short
git add frontend/components/changed-file.tsx docs/changed-doc.md PROJECT_STATUS.md
python scripts/check_repository_hygiene.py
git diff --cached --check
git commit -m "feat: describe the concrete change"
git push -u origin codex/short-feature-name
```

Имена файлов в примере замените своими. Откройте PR в main, проверьте изменённые
пути и дождитесь CI. Слияние сохраняет чужие коммиты; не заменяйте main архивом.
Публикация/merge выполняются в рамках полученного разрешения на конкретный блок.

## После очистки истории 17.10.2026

Из старой истории main удалены две версии ZIP с приватной конфигурацией;
8 SHA изменились, весь текущий код сохранён. Не объединяйте прежние ветки с
очищенным main: merge может вернуть архив в историю. Не отправляйте старую
копию через `push --all` или `push --mirror`.

Сначала сохраните незавершённые исходники и приватные данные отдельно.
Создайте новый checkout рядом со старым, используя свободное имя каталога:

```powershell
git clone https://github.com/temirkhanerbolatovich-coder/saq-qurylys.git saq-qurylys-clean
cd saq-qurylys-clean
git switch -c codex/short-feature-name
```

Переносите только собственный diff по правильным путям, проверяйте его перед
коммитом. Старую `.git`, ZIP, storage и runtime outputs в новый source tree не
копируйте. Для продолжения работы сохранённые `.env`/storage подключаются отдельно
по README, остаются ignored; рабочие БД/volumes и старые каталоги не удаляются
автоматически. Установка, где использовались раскрытые пароли, требует отдельной
ротации и отзыва сессий. Подробности и подтверждённые границы — [SECRET_CLEANUP](docs/SECRET_CLEANUP.md).

## Приватные данные

`.env`, `.local`, storage, output, node_modules и результаты тестов остаются
локальными. В Git разрешён только пустой конфигурационный пример `.env.example`.
CI hygiene проверяет tracked пути без вывода содержимого приватных файлов;
это не универсальный поиск всех видов секретов.

Если секрет уже был опубликован, замените его в соответствующем runtime и отзовите
связанные сессии. Удаление файла следующим коммитом не удаляет его из истории.
Переписывание общей истории согласовывается с командой отдельно; локальные
рабочие БД/пароли не заменяются данными из чужого source ZIP.
