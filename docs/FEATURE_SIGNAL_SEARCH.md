# Поиск по всей очереди сигналов

Локальный согласованный блок UX-06 от18.10.2026, база0bd2dfd.
Контракт0.18.0-mvp. Без push/publish/deploy.

## Пользовательский сценарий

«Поиск по всем сигналам» запускается кнопкой «Найти сигналы» или Enter.
Ввод сам по себе не фильтрует текущие25 записей и не вызывает запрос на каждую
клавишу. Поиск применяется сервером до pagination. Query q, фильтры и page
хранятся в URL, восстанавливаются при reload/Back/Forward. Новый запрос сбрасывает
page на1, сохраняет state/property_id/is_stale и открытый signal_id. Даже если
версия была выбрана по умолчанию, submit фиксирует её ID в ссылке.
Pagination также сохраняет открытый сигнал; выбор другой версии остаётся явным.
Смена предметных фильтров сохраняет прежний сценарий выбора первого результата;
«Сбросить фильтры» удаляет q/filters/page/selected и фокусирует selector объекта.

Loading/empty/error отражают текущий запрос. Старые строки не показываются как
результат нового поиска. Error имеет alert/retry; пустой поиск предлагает изменить
запрос. Открытый снимок и его reason draft не зависят от empty/error/pagination.
Если total>0, но запрошенная страница пуста, показан возврат на предыдущую
страницу, а не ложное сообщение об отсутствии совпадений во всей очереди.
Всего — server total с учётом q/filters. Ожидающие решения/устаревшие — честно
подписанные counts текущей страницы, не totals всего найденного набора.
Input/button≥44px, native form/label/Enter и существующие Button/LoadState/Pagination.

## API и семантика

Существующий `GET /api/v1/signals` принимает optional q≤300. Без q/с пустым после
trim поведение прежнее. Case-insensitive literal substring отдельно в полях:

- текущее Property.name и frozen snapshot.property.name;
- UUID сигнала, целиком или подстрока;
- русская метка версии, например «версия 2» (подстрока также найдёт «версия 20»);
- код состояния DRAFT/CONFIRMED/RETURNED или русская подпись состояния.

%, _ и backslash экранируются и ищутся буквально. Нет fuzzy/транслитерации,
поиска внутри PDF/evidence/decisions/произвольного JSON или склейки разных полей.
SQL использует bind parameters, JSON path только к сохранённому имени, EXISTS
по текущему имени без дублирования сигналов. Query+property_id+state ограничивают
строки до signal_view, прежний is_stale применяется до pagination. Порядок
created_at DESC, ID ASC, response Page[SignalOut] и roles/auth прежние.
За пределом длины422, без сессии401; analyst/viewer могут читать.

Поиск не переписывает snapshots/названия/решения/риск/аудит и не создаёт сигнал.
По старому имени можно найти историческую версию, даже если объект переименован;
в очереди остаётся текущее имя, сохранённые поля доступны в открытом снимке.

## Проверка и ограничения

test_signal_search.py: отдельные транзакционные synthetic PostgreSQL rows,
30версионная цепочка, ID за первой25страницей, current/frozen RU/KZ/case/trim,
status/version/literal special chars, сочетание фильтров/total/pages, auth/viewer,
unchanged snapshot/decisions/audit и неверная длина. test_contract сверяет q live.
Browser signal-search.spec.ts: явно presentation51 для pages/selected/error/
pending/Back/reload/reset/noPOST и реальный ID GET/responsive. UX-flow regression
теперь проверяет запрос на сервер вместо локального client filter.
Фактические прогоны — [UI_AUDIT](UI_AUDIT.md), [PROJECT_STATUS](../PROJECT_STATUS.md).

Нет нового endpoint/DTO/миграций/dependencies/индекса или изменения seed.
Прежний расчёт stale/views всех совпавших строк в памяти сохраняется; масштабная
SQL-оптимизация UX-16 и нагрузочная приёмка не закрыты. История версий в панели
по-прежнему читает первые100; этот блок меняет поиск очереди, не её отдельный
history endpoint. Независимая UX/предметная приёмка остаётся открытой.
