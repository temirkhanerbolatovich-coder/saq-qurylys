# RU / KZ interface preference

`frontend/lib/locale.tsx` provides `LocaleProvider` and `useLocale()` with
`{ locale: 'ru' | 'kk', setLocale, t(ru, kk?) }`. The root layout mounts the
provider above the authenticated workspace, so changing language does not
remount editors or replace routes. `t` is synchronous and returns the authored
Kazakh string in `kk`, otherwise the Russian string. Shared exact copy mappings
from `ui-copy.ts`, `ui-copy-workspace.ts`, `ui-copy-workflows.ts` and `ui-copy-review.ts` fill omitted second arguments;
unknown copy falls back to Russian. This is not automatic translation.

The native RU/KZ selector stores only `saq-locale` in localStorage and updates
`document.documentElement.lang`. The initial server render is Russian; the
saved preference is read after hydration. Storage denial preserves a usable
current-session interface. Cross-tab preference updates use the storage event.
Language preference is independent of account credentials and review drafts.

Source publications, property names, analyst reasons, ISO timestamps and historical
snapshots are never translated by a DOM observer or rewritten in persistence.
Auth/API roles, request payloads and deep links do not depend on locale.

SQ-09 (20.10.2026): shared `date(value, locale?)` formats the same instant with
`ru-RU` or `kk-KZ`, retaining `Asia/Qyzylorda`. Missing or malformed timestamps
show localized unknown text. The optional explicit locale also works on the
server; the default reads the active document language with a Russian SSR
fallback. The provider sets `html.lang` before updating React state, including
saved preferences and storage events, so dates change in the same render.
Standalone comparison subscribes to the locale as well.

Map headings, marker/zoom ARIA, legend, coverage, unavailable tiles, selected
card and empty states use authored RU/KZ copy. Locale changes update Leaflet
labels in place without resetting selection or requesting tiles again. Original
property names, addresses and provider attribution remain verbatim. Coordinates
remain approximate project markers; missing coordinates keep objects in the list.
Legal mechanism choices and review controls use the same existing dictionaries.
Execution results and accessibility coverage are recorded in SQ_FIX_PROGRESS;
this change does not constitute independent linguistic or full WCAG acceptance.

The shell exposes five primary destinations with text, decorative20px Lucide
icons, aria-current and native links. The separate `/sources` catalog describes
implemented intake paths and their limits; it does not claim live connectivity
to closed databases. An original local SVG logo is shared by the wordmark and
favicon. No third-party brand asset, font or package is introduced.

`frontend/tests/shell-redesign.spec.ts` exercises language persistence and draft
continuity, navigation/keyboard, account errors and the catalog using labelled
HTTP presentation fixtures. This does not verify live external source access or
independent Kazakh editorial acceptance. Current execution results belong in
the shared UI audit and project status after the complete redesign is checked.

Local shell validation19.10.2026: four HTTP-fixture browser tests passed17.8s
on the isolated UI3080. RU at375/768/1024/1440 and KZ at375/1440 have no page
overflow; navigation targets remain at least44px and search/role stay visible.
Language switching and reload preserve the original RU/KZ draft and query;
storage denial and failed logout/auth retry are covered. RU375/1440 and
KZ1440 source-page screenshots were visually reviewed under
`output/qa/shell-redesign-20261019`. Typecheck and narrow ESLint/Prettier passed.
An AST comparison covers all326 static workspace copy keys across the base
and additional dictionaries. Independent linguistic acceptance remains open.

The review catalog additionally translates233 authored control/headline occurrences
in analysis/review/signals/monitoring. Some long specialist instructions retain
Russian fallback. Surrounding inline whitespace is preserved when looking up a
copy key. Mobile search is an explicit expandable form with Escape/focus restore.
