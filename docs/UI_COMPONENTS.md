# SAQ QURYLYS — каталог компонентов

## Согласованная композиция ·19.10

- DashboardPriority заменяет два представления очереди одним: серверные rows,
  limit3/5, LoadState/empty, те же ссылки в досье. До аналитических блоков.
- DashboardQueues: queue-stat Link с прежним accessible action name и описанием
  числа; пояснение details и retry — соседние controls, без вложенных кнопок.
- PropertyResults: прежние useData/TableRegion/PropertyCards/Pagination/Map;
  CSS выбирает desktop table или brief phone cards. Один GET, не два реестра.
- useRegistryContext при возврате исключает ссылки без rendered rectangles.
- DossierProgress: прежние callbacks/решения, действие первым; dossier-facts
  группирует dt/dd, локальные underline tabs используют прежний WorkspaceTabs.

## Стабилизация после аудита ·18.10

- GlobalSearch: одна mounted search form, mobile toggle с aria-expanded/controls,
  opening focus/Escape без очистки input; desktop visible, native submit прежний.
- PropertyRisk/propertyRiskContext: Zone и статус основания рядом в registry,
  property cards, dashboard, dossier; тот же helper в PropertyMap marker/selection.
- PropertiesView: два draft q/city, общий debounce350ms, Enter/reset/URL sync;
  существующий resolvedPath guard скрывает прежний ответ под новым URL.
- MonitoringView передаёт CandidateDetail готовый snapshotPicker: существующие
  snapshot page10, Field/native select, cached selected metadata, Pagination,
  LoadState/retry, manual UUID в details. Нового endpoint/компонентной библиотеки нет.
- LoadState retry имеет type=button, чтобы вложение в форму не отправляло её
  бизнес-команду. Pagination/button semantics прежние.

## Серверный поиск сигналов ·18.10

- SignalsView: q из URL в queuePath, native search form, submit/pagination pin
  выбранного signal_id; queueSearch — только draft ввода с восстановлением q.
- Удалён filteredQueueItems: items идут напрямую из server page. Guard resolvedPath,
  отдельно выбранный SignalCard, PropertyPicker/имена/retry прежние.
- signals-queue-search: scoped padding/margin и≥44px input/button, текущие tokens.

Контракт и границы — [поиск сигналов](FEATURE_SIGNAL_SEARCH.md).

## Приоритет рабочего обзора ·18.10

- DashboardView: listProperties order=work_priority,page_size5; использует порядок
  items напрямую, учитывает error до показа rows. SimpleDashboard показывает3.
- propertyNextAction: только подпись действия по имеющемуся статусу; order и
  comparePropertyWork удалены, сортировка принадлежит server listProperties.
- LoadState/Pagination/PropertyCards/Zone и семантический master прежние.
- priority-action: mobile grid с полноширинным пояснением, без новой оболочки.

Параметр и ограничения — [приоритет проверки](FEATURE_PROPERTY_PRIORITY.md).

## Структура объекта ·18.10

- PropertyStructure: одна read-only выборка родителей и двух paged списков,
  отдельные page states, key по текущему объекту, guard resolvedPath от stale page,
  native details, Link и существующие LoadState/Pagination. Фокус при листании
  остаётся на content region. Ошибка видна отдельно от empty и основного досье.
- PropertyReference/PropertyStructure: lightweight navigation DTO; Property type
  отражает уже существующие обязательные parent_id/level/aliases.
- propertyLevelLabels: PROJECT/PHASE/BUILDING → ЖК/очередь/корпус.

Контракт/границы — [структура объекта](FEATURE_PROPERTY_STRUCTURE.md).

## Поиск / signal picker ·18.10

- PropertyPicker: прежний match по умолчанию, filter mode для сигналов,
  optional isDemo (match call передаёт прежнюю категорию), native select ref
  для фокуса reset, IDs signal-property/match-property. Выбранная запись
  читается отдельно, не зависит от текущей search page.
- SignalsView: filter picker25 вместо select первых100; initial registry100
  остаётся источником total/ранее загруженных имён, не пределом выбора.
- useSignalPropertyNames: только отсутствующие имена текущих25сигналов,
  dedup/abort/local cache и error+retry; не влияет на сохранённый snapshot.
- PropertiesView: актуальный label/placeholder расширенного серверного поиска.

## Первый блок аудита18.10

- ReviewQueuePanel: существующий review-queue module, общий native disclosure
  processing/actions очередей. Сохраняет mounted controls; выбранный материал
  рендерится отдельно и не размонтируется при сворачивании очереди.
- DashboardQueues: те же реальные ресурсы/счётчики/ссылки; пояснения в native details.
- PropertiesView/PropertyResults: фильтры и карта не зависят от detailed;
  detailed сохраняет выбор table/cards и прочих сведений.
- MonitoringView.openTool: раскрытие нужного инструмента после commit вкладки;
  сохранение candidate/drafts и возврат после выбора snapshot.
- assetPdfLabel: существующий presentation module, метка из имеющегося MIME;
  нет нового запроса или изменения контракта. Optional Asset.mime_type отражает
  уже существующий DTO и совместим с прежними presentation fixtures.

## Вкладки и PDF · U18.10.2026

- WorkspaceTabs / WorkspacePanel / useWorkspaceSection: общий native-button
  tablist, roving keyboard focus, URL section и legacy mapping. Все панели mounted,
  hidden только невыбранные. Next-integrated history предотвращает конкуренцию
  асинхронного replace старого hash с новым выбором.
- PropertyView: компактная шапка, шесть панелей, полный локальный документный
  фильтр/поиск/pages10, восстановление нужной страницы legacy document.
- MonitoringView: четыре панели, выбранный кандидат и вспомогательные source
  формы сохраняют ввод. Native disclosures внутри источников не заменяют tabs.
- ObjectRecords: существующие paged advertisements/signals по property_id,
  реальные даты/статусы, ссылки и PDF по записи; без выдуманной candidate-property связи.
- PdfDownload: GET, pending/error/retry, MIME/PDF signature, Blob download;
  без POST, print dialog или ложного success. Исходный PDF не преобразуется.
- PropertyHistory: PDF записи внутри native details после первого summary.

API/правила и пределы — [FEATURE_RECORD_PDF](FEATURE_RECORD_PDF.md).
Исторические milestones ниже не описывают текущие anchors как новые tabs.

## Локальная доработка после аудита · 18.10.2026

- PropertyPicker: существующие Button/Pagination/LoadState и native search/select.
  Результаты keyed по полному запросу; старые страницы не показываются при новом
  поиске/ошибке. Выбранный ID независим от страницы, PropertyDetail читается
  с AbortController; поздний ответ не подменяет новую выбранную запись.
  После поиска/перехода страницы фокус переходит к загруженному select;
  начальное открытие материала фокус не перехватывает.
- .dossier-document: native details с видимой сводкой и прежним LegalBasisDecision.
  ID #dossier-document-UUID участвует в существующем revealDossierTarget.
- useRegistryContext: один optional sessionStorage record с user/query/TTL,
  позицией и ссылкой фокуса, без содержимого документов/команд. Отдельный effect
  ожидает commit восстановленного selectedId перед фокусом; одинаковый href таблицы не подменяет
  источник перехода с карты. clearRegistryContext вызывается на logout/401.
- propertyNextAction/comparePropertyWork: порядок доступных действий обзора,
  не risk calculation и не имитация server-wide sort.

## Группировка monitoring · B3 · 18.10.2026

`MonitoringView` сохраняет queue/detail/incident/snapshot hooks и прежние команды.
Изменены порядок JSX и локальная навигация. `revealMonitoringTarget` открывает
native details ancestors и сразу фокусирует/прокручивает прежний target.
Навигация сохраняет hash history; matching hashchange после клика не переносит
фокус повторно поверх следующего нажатия. Modified click сохраняет native поведение.
Обработчик ограничен шестью известными section IDs. Выбор кандидата сохраняет
прежний candidate_id URL/focus и теперь явно прокручивает начало карточки.

OpenRegistry, ThreadsSearch и блок DEMO-версий обёрнуты `.monitoring-tool`, но
постоянно mounted: их state/refs/File inputs не копируются и не дублируются.
Данные загружаются прежними hooks, включая чтение при закрытом disclosure;
это не новый lazy-loading/network контракт. Формы и source components не менялись.
Scoped monitoring.css задаёт навигацию44px, header clearance и mobile wrapping.

## Локальные секции досье · B2/S3 · 18.10.2026

`PropertyView` сохраняет существующий компонент/роут, семь native anchors и
семантические section IDs. Старые #dossier-summary/#dossier-bases/#dossier-factors/
#dossier-history/#dossier-materials сохранены. Добавлены advertisements/evidence/
signals и editor-R1/R3/R4/R5/R6. `revealDossierTarget` открывает native details
ancestors и переносит фокус после изменения вида; не remount и не submit.
Длинные формы остаются одним экземпляром. ConstructionFactor получил стабильный
editor ID/tabIndex без изменения capture/review. UI mode setter читается из ref:
смена его identity не должна заново открывать редактор при переключении вида.

Прежний `EvidenceItem` обслуживает одну выбранную группу факторов/оснований;
дедуп IDs действует в показе/счётчике, не переписывает backend evidence. Нет новой
коллекции, глобального API или компонента tabs. Button/Link/native select/details,
DossierProgress, PropertyHistory и CreateSignalButton переиспользованы.

## Черновики форм досье · 18.10.2026

`useDossierFormDraft` (`frontend/lib/use-dossier-form-draft.ts`) расширяет существующий
`useReviewDraft`, а не вводит второй storage runtime: native input/select/textarea
с ID собираются внутри одной scoped области, controlled поля восстанавливаются
явным callback каждого предметного компонента. В scope не включается версия
риска: 409 не должен удалять причину. Для решения документа scope содержит его ID;
действующая версия берётся из API, автоматического повтора нет.

`containerProps` содержит ref и capture обработчик; `checkpoint()` сохраняет поля
перед командой. `saved()` вызывается только после успешной команды без оставшегося
нового capture; отклонение старого фактора не стирает его незагруженные материалы.
`decisionFieldIds` отличает изменение причины R4 от изменения исходного документа.
`remember()` сохраняет выбранные новые evidence IDs, дату/полноту R1, retry refs/results и
выбранные File только в памяти вкладки; logout/401 вызывают `clearDossierFormDrafts`
вместе с прежним `clearReviewDrafts`. Files восстанавливаются через native FileList,
содержимое не записывается в sessionStorage. После reload требуется явный повторный выбор.
`DossierDraftNotice` (`frontend/components/dossier-draft-notice.tsx`) использует
существующие notice/muted tokens и role=status/alert: восстановление, отсутствующий
файл и отказ storage различаются; пустая форма не получает лишних предупреждений.
R1/R3/R5/R6 сохраняют независимые capture/review guards и серверные проверки.

## Компоненты входящего ui-updates · 17.10.2026

`DashboardPublicationOverview` в workspace.tsx читает ограниченный catalog через useData и переиспользует LoadState/empty/error/retry. Каждый источник считается один раз, точные review totals остаются в DashboardQueues. Карточки и intake forms расширяют существующие views/native controls; новой библиотеки/API нет. Master1.4 сохраняется.

17.10.2026: `RemainingReviewQueue` / `QueueR2Decision` в review-queue.tsx
переиспользуют useData/useReviewDraft и существующие команды. ReviewView
переключает action queue и старый processing список; DashboardQueues использует
review total. `PublicationComparisonView` / SourcePicker / ComparisonResult
в publication-comparison.tsx обслуживают `/comparison`: серверный каталог,
явные версии, metadata и bounded diff. Составные компоненты не заменяют
общие primitives и не считают риск на клиенте.

Интеграция17.10: существующие Providers/Workspace получили GlobalSearch и светлую
оболочку без второй навигации; DashboardView использует прежние очереди и новые
analytics panels с backend totals. PropertyMap сохраняет Leaflet client boundary,
controlled selection и таблицу, добавляет instruction/coverage/selected facts.
SignalsView/SignalCard переиспользуют Button/Notice/LoadState/Pagination/RiskSummary
и native details: page-local search не заменяет серверные фильтры. Новых UI или
state dependencies нет. Дизайн master1.4, результаты проверок — UI_AUDIT/PROJECT_STATUS.

Дополнение S0–S2, 17.10.2026: `Providers` в workspace.tsx содержит постоянные пять зон, контекстный `WorkspaceContext` и локальную навигацию «Проверки». `DashboardHeading`/`DashboardQueues` используют существующие PageTitle/Link/LoadState и реальные summary/list API. `ReviewView` в analysis-workspace.tsx переиспользует Pagination/LoadState/native details/select; queue и selected material независимы. `useReviewDraft`/`clearReviewDrafts` в lib/use-review-draft.ts — общий локальный draft для четырёх review-форм, TTL при восстановлении, память при storage failure и auth cleanup. Это не API/persistence серверных решений. Стили `.analyst-workspace`, `.action-queues`, `.review-queue-*`, `.review-provenance` используют прежние tokens. Новых dependencies нет.

Дополнение17.10.2026: `DossierProgress` внутри workspace использует PropertyDetail и native dl/links; `UrlImportView` в url-import.tsx переиспользует Auth/Notice/PageTitle/Button и job API; `OpenRegistry` в open-registry.tsx переиспользует useData/LoadState/upload, native details/select и тот же Button. Формы версии и поиска взаимоисключены при busy. Новый UI-framework, modal или библиотека состояний не добавлены. Browser presentation-проверки — `open-sources.spec.ts`, runtime — PROJECT_STATUS.

Дополнение 16.10.2026 — простой каталог: `InterfaceMode`/`useInterfaceMode` в workspace.tsx задаёт только предпочтение отображения с безопасным fallback при недоступном storage. `SimpleDashboard` использует существующие summary/registry запросы, `PropertyCards` — серверный Risk, Demo/Zone, factorLabels и propertyDossierUrl. Карточки переиспользуются обзором и реестром. Кнопки — существующий Button; необязательный контекст — native details, без библиотек. `LegalBasisDecision.showControls` скрывает смонтированные controls отдельно от `writable`, чтобы переключение вида не меняло роль и не теряло ввод.

Дополнение 16.10.2026: `ThreadsSearch` (`frontend/components/threads-search.tsx`) встроен в MonitoringWorkspace и использует Button/Notice/LoadState/useData, native form/input/select и existing monitoring styles. Показывает статус подключения, одну временную выдачу и recovery; API/конфигурация — [FEATURE_THREADS_SEARCH](FEATURE_THREADS_SEARCH.md). Результат фокусируется после React commit через effect, без гонки requestAnimationFrame с монтированием заголовка.

Дополнение 16.10.2026: `MonitoringWorkspace` (`frontend/components/monitoring-workspace.tsx`) и route `/monitoring` расширяют существующие PageTitle, Notice, LoadState, Demo, Button, Pagination, TableRegion, useAuth/useData. Локальные candidate/snapshot/compare/review forms используют native labels/fieldset/details, не создают вторую UI-библиотеку. Очередь/фильтры/выбор сохранены в URL, resolvedPath исключает старую выдачу; ошибки команды сохраняют её ключ, 409 сохраняет обоснование и предлагает обновление. Показаны пределы последних 100 материалов/20 сверок/карточек. Семантический CSS — `frontend/app/monitoring/monitoring.css`; шестой пункт подробной навигации «Сверка», mobile grid в три колонки. [Границы](FEATURE_MONITORING_CASES.md), фактическая визуальная проверка — UI_AUDIT.

Это карта существующего UI для повторного использования, а не список будущих заглушек. Визуальные правила — [DESIGN_SYSTEM](DESIGN_SYSTEM.md), сценарии — [UX_GUIDELINES](UX_GUIDELINES.md). Перед созданием компонента проверить этот каталог и `rg` по `frontend/components`.

## Базовые компоненты

`PropertyHistory` (`frontend/components/property-history.tsx`) — общая пагинируемая хронология досье и раскрываемого журнала review. Читает существующий audit API с двумя дополнительными полями; использует Button/Pagination/LoadState/useData и семантические tokens. Сохранённые статусы/причины показываются без реконструкции балла, fallback не теряет неизвестный код. `history_page` сохраняет контекст URL; соседние формы не размонтируются. Границы — [FEATURE_PROPERTY_HISTORY](FEATURE_PROPERTY_HISTORY.md).

Дополнение 16.10.2026: `RiskSummary` в workspace.tsx переиспользуется досье/сигналами, получает только серверный Risk и отображает score/zone/confirmed_codes/revision/as_of с оговоркой. `frontend/lib/presentation.ts` хранит единые подписи факторов/зон и `propertyDossierUrl` с фиксированным локальным путём и закодированным registry query. PropertyMap получает выбранный ID/onSelect от PropertyResults, таблица показывает тот же выбор. Pagination теперь используется и в рекламе с фактическими server metadata. Native legal forms выделены `.legal-review`; новый конкурентный form/component runtime не добавлен. Notice/evidence используют единые motion tokens и reduced-motion.

| Элемент | Реализация | Контракт и применение |
|---|---|---|
| Button | `frontend/components/ui/button.tsx` | CVA + Radix Slot; `default`, `outline`, `ghost`, `danger`, native disabled/aria-busy. Для навигации `asChild` + Next Link. В формах явно указывать type у действий, которые не submit |
| Pagination | `frontend/components/ui/pagination.tsx` | `page`, `pageSize`, `total` берутся из серверного результата; `onPageChange`, доступное имя `label`. Границы disabled, номер объявляется polite status. Используется в реестре и сигналах; тексты предыдущей/следующей кнопок настраиваются |
| TableRegion | `frontend/components/ui/table-region.tsx` | Подписанная focusable scroll region, `label` и native table в children. Столбцы не скрываются, заголовки scope=col; применяется к реестру и сводке |
| Notice | `frontend/components/workspace.tsx` | Inline ошибка `role=alert`; сообщения должны объяснять действие пользователя. Не использовать для нейтрального loading или постоянно повторяющегося polling |
| LoadState | тот же файл | `error` + `retry`, иначе status «Загрузка данных…». Сетевой retry не должен повторять принятие решения человеком |
| useData resolvedPath | тот же файл | Метаданные пути последнего завершённого запроса. Очередь сигналов показывает data/error только при совпадении с текущим queuePath; прежние строки не выдают за результат нового фильтра. Поведение остальных callers сохранено |
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

Компонент пагинации не получает URL/API/роль и не делает fetch: ими управляет экран. Registry сохраняет фильтры/вид в URL; signals сохраняет property_id/state/is_stale/page и выбранный signal_id в URL. Смена фильтра сбрасывает страницу/выбор, переход к версии и history links сохраняет фильтры; Back/reload восстанавливает контекст. Caller решает, скрывать ли paginator при единственной странице. Пустая выборка — страница 1 из 1; недоступная страница после изменения данных не маскируется выдуманными строками.

## Native patterns и составные области

| Pattern | Где сейчас | Правила |
|---|---|---|
| Input / Textarea | login, новый текст, review-формы | Видимый label/htmlFor, required/maxLength/type, helper через aria-describedby. Native validation остаётся; серверная проверка обязательна. На mobile font 16 px |
| Select | фильтры реестра/сигналов, очереди review | Native select; варианты хранят API values, видимые подписи русские. Не подключать custom select без конкретной нужды |
| Filters / Search | PropertiesView | URL q/zone/legal_status, общий list/map/page; сброс одним button удаляет эти фильтры и page, сохраняет view и остальные URL-параметры. Пустая строка поиска не требует повторного submit |
| Navigation / Header | Providers | Пять постоянных зон в обоих видах, aria-current, роль/выход на всех ширинах, skip link. `/monitoring` входит в «Проверку»; вложенная навигация «Материалы / Сверка» |
| Breadcrumb / Back | WorkspaceContext; Link «К реестру», «К рекламе» | Реальный родитель досье/оригинала/сверки. «К реестру» переносит закодированный registry query; точная позиция прокрутки и selected map marker отдельно не сохраняются этим helper |
| Tabs / View switch | native links text/file, кнопки list/map | Сейчас это переходы и toggle group aria-pressed; не присваивать role=tab без roving focus/tabpanel/keyboard-контракта |
| Card / Panel | .panel, .padded, .compact | Документальная поверхность; выбирать по содержимому, а не оборачивать всё одинаковыми cards. KPI остаются полосой, таблица — строками |
| Dossier sections | PropertyView | Anchor targets с tabIndex=-1; переключение вида и якорей сохраняет mounted формы. Уход с маршрута — отдельная граница: потеря R4 reason воспроизведена в повторном аудите, защита review drafts сюда пока не перенесена |
| Review steps | ReviewMaterial в analysis-workspace.tsx | Четыре навигационных этапа: оригинал/гипотезы/объект/R2. Счётчик из существующих review_status; отсутствующий шаг объяснён, не фиктивно завершён. Anchor targets с tabIndex=-1, inputs остаются mounted; прогресс не начисляет баллы |
| Intake form sections | NewAdvertisementView / FileUploadView | Две читаемые группы: оригинал+происхождение, необязательный контекст. Связанные hints, счётчик текста без noisy live updates, выбранные имя/размер и aria-invalid при oversize. Сохранение текста фокусирует результат; основной Next Link ведёт прямо в review, анализ остаётся отдельным действием |
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
