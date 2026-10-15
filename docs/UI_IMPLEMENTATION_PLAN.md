# SAQ QURYLYS — внедрение и поддержка UI/UX

Продолжение существующей системы, без нового handoff-файла. Текущая ревизия/фактические результаты — [PROJECT_STATUS](../PROJECT_STATUS.md). Главные правила — [DESIGN_SYSTEM](DESIGN_SYSTEM.md), [UX_GUIDELINES](UX_GUIDELINES.md), [UI_COMPONENTS](UI_COMPONENTS.md), [UI_AUDIT](UI_AUDIT.md).

## Проверяемые этапы

Этапы 1–6 выполнены в заявленном scope. Код `d2d9c6b`, [CI 38768212690](https://github.com/temirkhanerbolatovich-coder/saq-qurylys/actions/runs/38768212690) success: 294 backend / 30 browser / 27 tool tests, Skill search и frontend checks/build. Точная история/команды — PROJECT_STATUS. Внешняя UX/предметная приёмка не заменяется этим CI.

| Этап | Объём | Критерий |
|---|---|---|
| 1. Исследование | Требования/архитектура, роли analyst/viewer, frontend/API/risk/test inventory, прежний аудит и свежий Git | Не повторять завершённый редизайн; сохранить backend/контракт/данные |
| 2. Skill | Один upstream UI UX Pro Max, pinned source, stdlib scripts, repo scope | Проверка хешей, search smoke и настоящий Codex skills/list enabled=true |
| 3. Компоненты | Общая Pagination в реестре/сигналах, TableRegion, tokens H1–H6, сброс фильтров | Native semantics, прежние URL/handlers/score, отсутствие ложной global sorting |
| 4. Постоянные инструкции | Все шесть запрошенных документов/AGENTS, библиотечная матрица, сценарии и число действий | Новому агенту понятны источник истины, переиспользование и границы |
| 5. Проверка | Focused/full browser, static/build/audit, 4 ширины, RU/KZ/console/визуальный просмотр | Записать команды/результаты и ограничения в существующий статус |
| 6. Передача | Diff/секреты/ссылки, разрешённый GitHub push, exact-SHA CI | Локальный/удалённый SHA совпадают; user testing отдельно |

## Установка Skill и совместимость Codex

Выбран [nextlevelbuilder/ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill/tree/56ea9cf174ed86786187daa9de0e6247cb0747e4), commit `56ea9cf174ed86786187daa9de0e6247cb0747e4`, subtree `.claude/skills/ui-ux-pro-max`. Он установлен в `.agents/skills/ui-ux-pro-max` штатным skill-installer с явными ref/dest. 73 исходных файла сверены с Git blob SHA; LICENSE сохранён. Локальные дополнения только SOURCE.json, LICENSE и agents/openai.yaml; исходные scripts/data/SKILL не менялись. Python уже установлен; npm CLI, shell installer, OS software, services и hooks не устанавливались.

Исследован также [Rpeng666 Codex fork](https://github.com/Rpeng666/ui-ux-pro-max-skill-codex/tree/5c02e4c57e8dce4451f65c0dd50eab6b4a4ed3e6). Его install.sh прочитан и не запускался: он копирует основной и шесть дополнительных Skills в `.codex/skills`, без защиты существующего назначения. Более свежий upstream уже содержит Codex platform config для `.agents/skills`; второй вариант дублировал бы возможности и добавлял не относящиеся к задаче Skills.

Проверено: runtime search/core/design_system/reasoning_contract используют Python standard library, CSV и локальный поиск; сетевых вызовов/установок/запуска shell в search path не найдено. `--persist` может создавать файлы по output-dir, поэтому здесь не используется. Статическая проверка не является полной независимой security-экспертизой всего upstream. Не запускать bundled tests/другие скрипты автоматически без изучения их scope.

Обнаружение проверено свежим `codex app-server --stdio` через initialize → skills/list для корня проекта: ровно один `ui-ux-pro-max`, scope=repo, enabled=true, путь `.agents/skills/ui-ux-pro-max/SKILL.md`. Это локальный discovery-запрос без model turn и без передачи проектных данных. Проверка должна повторяться после обновления Codex/Skill; активный каталог текущего чата может обновиться на следующем ходе.

Повторено в ещё одном свежем процессе с forceReload=false: тот же единственный включённый repo Skill. Upstream files содержат 46 строк с trailing whitespace; они сохранены без правок для совпадения pin/hash. `.gitattributes` отключает whitespace diagnostics только для vendor-папки, не для собственного кода; `.dockerignore` исключает `.agents` из runtime image context. CI выполняет offline domain-search smoke на versioned пакете. Наличие Skill не означает одобрение всех его рекомендаций.

[Официальная документация Codex](https://learn.chatgpt.com/docs/build-skills) определяет `.agents/skills` как repo-discovery путь. Файлы включены в Git, поэтому после clone и нового запуска Codex они остаются доступны другим агентам. Глобальные настройки, другие проекты и учётная запись не менялись. Если Skill отключён личной настройкой, agent сообщает об этом; наличие Git-файлов не отменяет локальный disabled flag.

Команды из корня проекта (Python 3, зависимости pip не нужны):

```powershell
python .agents/skills/ui-ux-pro-max/scripts/search.py "filter chips wrap" --domain ux
python .agents/skills/ui-ux-pro-max/scripts/search.py "form accessibility navigation" --stack nextjs
```

Для чистого компьютера обычного `git clone` достаточно: Skill уже versioned. Если его намеренно не перенесли, восстановить единственный pinned вариант штатным установщиком Codex; не запускать эту команду поверх существующего назначения:

```powershell
python "$env:USERPROFILE/.codex/skills/.system/skill-installer/scripts/install-skill-from-github.py" --repo nextlevelbuilder/ui-ux-pro-max-skill --ref 56ea9cf174ed86786187daa9de0e6247cb0747e4 --path .claude/skills/ui-ux-pro-max --dest .agents/skills --method download
```

Повторная установка не нужна. Обновление — отдельный reviewed diff с новым pin, изучением executable changes и browser regression. Не запускать чужие auto-sync workflows. В Claude-примерах upstream `${CLAUDE_PLUGIN_ROOT}` заменить абсолютным путём к установленному Skill; root проекта и root Skill различаются.

## Как применены рекомендации

Выполнены локальные domain/Next.js searches и design-system preview без persistence. Первый запрос `filter reset clear` вернул в том числе нерелевантный stacking context; после одного уточнения `filter chips wrap` проверены правила переноса, native button/aria-state и static badge semantics. Это подтверждает семантику/перенос controls, но не является доказательством сокращения времени работы.

Design-system preview `construction compliance dashboard`, затем уточнение `enterprise internal data dashboard`, вернули Minimalism & Swiss style, но marketing Hero-Centric/Enterprise Gateway с sales CTA. Эти композиции и предложенные новые палитры/внешние шрифты отвергнуты как неподходящие рабочему приложению. Принятая проектная система не перезаписана, второй MASTER.md не создан. Рекомендация Next.js Server Actions также не применена: имеющийся FastAPI/CSRF/idempotency контракт важнее generic stack hint. Link/scroll guidance согласуется с существующей реализацией.

## Матрица библиотек

| Решение | Совместимость / решение |
|---|---|
| [Tailwind CSS](https://tailwindcss.com/docs/theme) | Уже 4.3.3 + PostCSS, совместим с текущим Next. Сохраняем; источник семантических tokens — design-system.css |
| [shadcn/ui](https://ui.shadcn.com/docs/installation/next) | Подход owned components/Radix/CVA применим. Существующий Button и новые Pagination/TableRegion остаются исходниками проекта; CLI init не запускался, сторонние шаблоны не копировались. Это не утверждение полной установки shadcn registry |
| [Radix Primitives](https://www.radix-ui.com/primitives/docs/overview/accessibility) | Уже Slot 1.5.0; сохраняем. Dialog/DropdownMenu подключать только при реальном complex interaction и проверке focus/labels; native select/details сейчас достаточны |
| [Lucide React](https://lucide.dev/guide/react) | Уже 1.57.0, именованные imports. Сохраняем функциональные SVG icons; декоративный icon рядом с текстом не должен повторно озвучиваться |
| [Magic UI](https://magicui.design/docs) | React-совместимые copied components, но декоративные hero/effects не решают нынешние сценарии аналитика. Не добавлен |
| [Motion](https://motion.dev/docs/react-accessibility) | React-совместим, полезен при значимой сложной анимации. В текущих формах/таблицах нет такого сценария; не добавлен. CSS reduced-motion сохранён |

Новых npm/runtime dependencies нет; package.json/package-lock и backend requirements не менялись.

## Референсы и границы доступа

Прочитаны публичные страницы [Mobbin](https://mobbin.com), [Linear features](https://linear.app/features), [Untitled UI](https://www.untitledui.com), [Refactoring UI](https://refactoringui.com/), [NN/g heuristics](https://www.nngroup.com/articles/ten-usability-heuristics/). Использованы принципы иерархии, видимых действий, плотных таблиц, повторяемых controls и явной обратной связи. Чужой бренд/макет не копируется. Закрытые Mobbin flows и платные Figma/book assets не просмотрены. Pageflows и отдельная NN/g progressive-disclosure страница не загрузились через доступный web-инструмент; их содержимое не заявляется изученным. Простое постепенное раскрытие опирается на существующие native details и проверенный сценарий, а не на выдуманные результаты исследования.

## Передача между агентами

При санкционированной параллельной работе: отдельная `codex/` ветка на область, сверка fresh main, явный список файлов. Один ответственный собирает tokens/AGENTS/status; изменение общей палитры/типографики обсуждается до интеграции. Не overwrite lockfile/чужой dirty tree, не использовать reset/clean. PR описывает пользовательский trigger, новое поведение, API-preservation и фактические проверки. Merge требует отдельного разрешения. Состояние/блокеры всегда в PROJECT_STATUS; этот документ — workflow, не второй журнал сессий.
