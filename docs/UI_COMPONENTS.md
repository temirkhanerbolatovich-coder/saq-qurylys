# SAQ QURYLYS — каталог компонентов

Это карта существующего UI для повторного использования, а не список будущих заглушек. Визуальные правила — [DESIGN_SYSTEM](DESIGN_SYSTEM.md), сценарии — [UX_GUIDELINES](UX_GUIDELINES.md). Перед созданием компонента проверить этот каталог и `rg` по `frontend/components`.

## Базовые компоненты

| Элемент | Реализация | Контракт и применение |
|---|---|---|
| Button | `frontend/components/ui/button.tsx` | CVA + Radix Slot; `default`, `outline`, `ghost`, `danger`, native disabled/aria-busy. Для навигации `asChild` + Next Link. В формах явно указывать type у действий, которые не submit |
| Pagination | `frontend/components/ui/pagination.tsx` | `page`, `pageSize`, `total` берутся из серверного результата; `onPageChange`, доступное имя `label`. Границы disabled, номер объявляется polite status. Используется в реестре и сигналах; тексты предыдущей/следующей кнопок настраиваются |
| TableRegion | `frontend/components/ui/table-region.tsx` | Подписанная focusable scroll region, `label` и native table в children. Столбцы не скрываются, заголовки scope=col; применяется к реестру и сводке |
| Notice | `frontend/components/workspace.tsx` | Inline ошибка `role=alert`; сообщения должны объяснять действие пользователя. Не использовать для нейтрального loading или постоянно повторяющегося polling |
| LoadState | тот же файл | `error` + `retry`, иначе status «Загрузка данных…». Сетевой retry не должен повторять принятие решения человеком |
| PageTitle | тот же файл | eyebrow/h1/description и существующее analyst action. Не создавать второй h1 или автоматически доступное viewer действие |
| Demo / Zone | тот же файл | Явная DEMO-метка; серверные score/zone с текстом. UNKNOWN не даёт красного, зелёный не означает безопасность |
| statusLabel | `frontend/lib/status-labels.ts` | Русская видимая подпись; значение API не меняется. Неизвестный код сохраняется как fallback, чтобы не скрыть новое состояние |

```tsx
import { Pagination } from "@/components/ui/pagination";
import { TableRegion } from "@/components/ui/table-region";

<TableRegion label="Объекты — таблица с горизонтальной прокруткой">
  <table>{/* caption при необходимости, thead/th scope=col, tbody */}</table>
</TableRegion>;

<Pagination
  label="Страницы результатов"
  page={result.page}
  pageSize={result.page_size}
  total={result.total}
  onPageChange={changePage}
/>;
```

Компонент пагинации не получает URL/API/роль и не делает fetch: ими управляет экран. Registry сохраняет фильтры/вид в URL; signals сохраняет существующую модель локальных фильтров. Это не изменение бизнес-процесса. Caller решает, скрывать ли paginator при единственной странице. Пустая выборка — страница 1 из 1; недоступная страница после изменения данных не маскируется выдуманными строками.

## Native patterns и составные области

| Pattern | Где сейчас | Правила |
|---|---|---|
| Input / Textarea | login, новый текст, review-формы | Видимый label/htmlFor, required/maxLength/type, helper через aria-describedby. Native validation остаётся; серверная проверка обязательна. На mobile font 16 px |
| Select | фильтры реестра/сигналов, очереди review | Native select; варианты хранят API values, видимые подписи русские. Не подключать custom select без конкретной нужды |
| Filters / Search | PropertiesView | URL q/zone/legal_status, общий list/map/page; сброс одним button удаляет эти фильтры и page, сохраняет view и остальные URL-параметры. Пустая строка поиска не требует повторного submit |
| Navigation / Sidebar | Providers | Пять разделов, aria-current, роль/выход на всех ширинах, skip link. Регион в topbar — контекст, не интерактивная breadcrumb |
| Breadcrumb / Back | Link «К реестру», «К рекламе» в досье | Реальные ссылки с понятным родителем. Будущий многоуровневый путь — nav aria-label + ol и aria-current=page; не выдавать статический регион за breadcrumb |
| Tabs / View switch | native links text/file, кнопки list/map | Сейчас это переходы и toggle group aria-pressed; не присваивать role=tab без roving focus/tabpanel/keyboard-контракта |
| Card / Panel | .panel, .padded, .compact | Документальная поверхность; выбирать по содержимому, а не оборачивать всё одинаковыми cards. KPI остаются полосой, таблица — строками |
| Dossier sections | PropertyView | Anchor targets с tabIndex=-1, forms не unmount; черновик причины не теряется при переходе по разделам |
| Details / disclosure | R1 и construction forms | Native details/summary, Enter/Space. Причина отдельного решения R1 постоянно видна; сохранение материала и решение разделены |
| Notifications / Success | role=alert/status и inline notice | Важный результат остаётся рядом с действием; никаких исчезающих единственных подтверждений. Toast runtime не установлен |
| Empty / Error / Loading | PropertyTable/LoadState/очереди | Объяснение, действующие фильтры, retry для запроса, актуальная стадия операции. Не скрывать фильтры при пустом результате |
| Dialog / Menu | блокирующий dialog сейчас не требуется | Не реализован и не выдаётся за готовый компонент. При подтверждённом сценарии — Radix Dialog/DropdownMenu, title/description, Escape, focus return/trap, проверка клавиатурой; не подключать ради каталога |

Сложные предметные модули переиспользуются целиком: `LegalAbsenceReview`, `LegalBasisCreate/Decision`, `AppealReview`, `ConstructionReview`, `CreateSignalButton`, `PropertyMap`. Их проверки даты/области/revision и отдельные подтверждения не превращать в общую «кнопку одобрить всё».

## Как добавить компонент

1. Назвать пользовательскую задачу и проверить существующий pattern.
2. Расширить компонент, если совпадают семантика/ответственность; не объединять разные доменные решения из-за похожего CSS.
3. Использовать tokens, native semantics и Next Link для переходов; новый dependency обосновать.
4. Проверить states/keyboard/mobile/длинные RU/KZ и ошибку; добавить meaningful regression при риске.
5. Обновить эту таблицу и UI_AUDIT/PROJECT_STATUS. В проекте нет отдельного Storybook: примеры проверяются на настоящих экранах и в browser tests.
