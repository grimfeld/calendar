# 03 — Calendar Rendering Approach (RESEARCH)

_Verified against primary sources on 2026-07-20 (npm registry, GitHub, official docs). Version/license facts below come from the npm registry `latest` metadata, not memory._

> **⚠️ Correction (added during ticket 08 implementation).** The "Map PocketBase events → Schedule-X" section below is **wrong for the installed v4**: Schedule-X **v4** takes **Temporal objects** (`Temporal.ZonedDateTime` / `Temporal.PlainDate`), NOT the `"YYYY-MM-DD HH:mm"` strings shown here (that was v2/v3). Also, Schedule-X reads a **global `Temporal`**, so you must `import "temporal-polyfill/global"` and build events from the *global* `Temporal` (see `src/lib/eventMap.ts` and ticket 08's answer). The library recommendation itself stands.

## Recommendation

**Pick: Schedule-X (`@schedule-x/react` 4.1.0 + `@schedule-x/calendar` 4.6.1, all MIT).** It is the best fit for this stack: month/week/day views are **fully free/MIT** (no premium gate for the views themselves), it lists **React `^19`** in its peer deps, it is Preact-based and mobile-first (touch drag/scroll is a design goal), and — decisively for this project — it ships an **official `@schedule-x/theme-shadcn` package (MIT, 4.6.1)** plus CSS-variable theming, so it coheres with the shadcn radix-nova look and `.dark` class theming instead of fighting Tailwind v4. Free MIT plugins for **drag-and-drop** and **event-recurrence** mean the "no rewrite later" constraint is satisfied without buying a license.

**Runner-up: FullCalendar v7 (`@fullcalendar/react` 7.0.1, MIT).** The most mature option; v7 is now **natively implemented in React** (no Preact wrapper), supports **React 17–19 with working SSR/StrictMode**, and keeps month/week/day/list views in the free MIT tier. It loses to Schedule-X only on Tailwind/shadcn coherence (you must override its `--fc-*` variables by hand — there is no first-party shadcn theme) and on being heavier. Choose it instead of Schedule-X only if you want the single most battle-tested engine and don't mind hand-theming.

## Comparison

| Criterion | **Schedule-X** ✅ pick | **FullCalendar v7** (runner-up) | **react-big-calendar** | **Hand-roll (CSS grid + date-fns)** |
|---|---|---|---|---|
| Core pkg / version | `@schedule-x/react` **4.1.0**, `@schedule-x/calendar` **4.6.1** | `@fullcalendar/react` **7.0.1** (+ `@fullcalendar/core` 7.0.1) | `react-big-calendar` **1.20.0** | `date-fns` **4.4.0** (or Temporal via `temporal-polyfill`) |
| License (views you need) | **MIT** — month/week/day all free | **MIT** — month/week/day/list all free | **MIT** | **MIT** (date-fns); your code |
| Premium gate | Only event-modal, drag-to-create, resource view, draw, sidebar (€479/yr or €999 lifetime). **None of the basic grid needs it.** | Resource/timeline **scheduler** views are premium (`@fullcalendar/react-scheduler`). Basic views free. | None | None |
| React 19 + Vite 7 | peer `react: ^16.7 \|\| ^17 \|\| ^18 \|\| ^19` ✅ | peer `react: ^17 \|\| ^18 \|\| ^19` ✅; native React (SSR/StrictMode fixed in v7) | peer `react: ^16.14 \|\| ^17 \|\| ^18 \|\| ^19` ✅ (added 2025) | N/A — your own components |
| Bundle weight in WebView | Light-ish; core built on bundled Preact + `temporal-polyfill` (peer). Per-view/plugin code-split. | Heavier engine; requires `temporal-polyfill` peer for all packages. | **Heaviest** — deps pull in `moment`, `moment-timezone`, `luxon`, `dayjs`, `globalize`, `lodash` transitively. | **Lightest** — date-fns is tree-shakeable; ship only what you import. |
| Mobile / touch (critical) | Mobile-first design; touch scroll + drag supported. | Good touch support, mature. | Weaker on touch; desktop-oriented. | Whatever you build (full control, but you own it). |
| Tailwind v4 / shadcn coherence | **Best of the libraries** — official `@schedule-x/theme-shadcn` (MIT) + CSS custom properties; honors a `.dark` class. | Themes via `--fc-*` CSS vars only; **no first-party shadcn theme**, manual mapping to radix-nova tokens. | Plain CSS you override manually; most Tailwind effort. | **Perfect** — it *is* your Tailwind/shadcn markup. |
| Future headroom (no rewrite) | Free MIT plugins: `@schedule-x/drag-and-drop` 3.7.3, `@schedule-x/event-recurrence` 4.6.1; week/day views built in. | rrule (`@fullcalendar/rrule` 7.0.1 MIT), drag/resize, week/day/list built in; scheduler needs paid license. | Drag/drop + week/day exist but dated API. | You build every future feature by hand. |

Notes / caveats found:
- `@schedule-x/resize` (3.7.3) returned **no `license` field** in registry metadata — treat its licensing as "verify before relying on resize"; the pick does not depend on it for month-view create/read.
- FullCalendar v6 `@fullcalendar/daygrid` (6.1.21) still exists, but **v7 moved standard views into `@fullcalendar/react/*` entrypoints** — follow v7 docs, not v6 tutorials.
- Both Schedule-X and FullCalendar v7 depend on **`temporal-polyfill`** (Temporal isn't yet native in WKWebView / Android System WebView in 2026). Vite 7 bundles it fine; just don't assume a global `Temporal`.

## Integration outline — Schedule-X (the pick)

### 1. Install (create + read, month view)
```bash
npm install @schedule-x/react@4 @schedule-x/calendar@4 \
  @schedule-x/events-service@4 @schedule-x/theme-shadcn@4 temporal-polyfill
# later, free headroom (optional, install when needed):
# npm install @schedule-x/drag-and-drop @schedule-x/event-recurrence
```
`@schedule-x/react` is the React 19 adapter; `@schedule-x/calendar` is the engine; `events-service` gives an imperative API to add/replace events; `theme-shadcn` is the shadcn-matching stylesheet; `temporal-polyfill` is a required peer.

### 2. Mount in React 19
```tsx
import { useCalendarApp, ScheduleXCalendar } from '@schedule-x/react'
import { createViewMonthGrid, createViewWeek, createViewDay } from '@schedule-x/calendar'
import { createEventsServicePlugin } from '@schedule-x/events-service'
import '@schedule-x/theme-shadcn/dist/index.css' // verify exact path against installed pkg

function CalendarView({ events }: { events: SxEvent[] }) {
  const eventsService = useMemo(() => createEventsServicePlugin(), [])
  const calendar = useCalendarApp({
    views: [createViewMonthGrid(), createViewWeek(), createViewDay()],
    defaultView: 'month-grid',
    events,
    plugins: [eventsService],
    // theme-shadcn honors light/dark via the .dark class on <html>
  })
  return <ScheduleXCalendar calendarApp={calendar} />
}
```
`useCalendarApp` returns a stable app instance; render it through `<ScheduleXCalendar>`. For create/read you can either pass `events` up front or call `eventsService.add(...)` / `eventsService.set(...)` after fetching from PocketBase.

### 3. Map PocketBase events → Schedule-X
PocketBase stores dates as strings like `"2026-07-20 09:00:00.000Z"` (space, not `T`). Schedule-X wants `"YYYY-MM-DD HH:mm"` for timed events (space-separated — convenient) and `"YYYY-MM-DD"` for all-day events. `id` is required and must be unique.

```ts
import type { CalendarEventExternal } from '@schedule-x/calendar'

const toSx = (start: string) => {
  const d = new Date(start.replace(' ', 'T')) // normalize PB space→T before new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  const day = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
  return { day, dt: `${day} ${p(d.getHours())}:${p(d.getMinutes())}` }
}

function pbToScheduleX(r: PbEvent): CalendarEventExternal {
  const s = toSx(r.start)
  const e = r.end ? toSx(r.end) : null
  return {
    id: r.id,
    title: r.title,
    description: r.description ?? undefined,
    start: r.all_day ? s.day : s.dt,
    end: r.all_day ? (e?.day ?? s.day) : (e?.dt ?? s.dt),
  }
}
```
Feed `events.map(pbToScheduleX)` into `useCalendarApp`, or `eventsService.set(mapped)` after a PocketBase fetch. For **create**, build the same object and `eventsService.add(evt)`, then persist to PocketBase (format `start`/`end` back to the PB `"YYYY-MM-DD HH:mm:ss.SSSZ"` shape).

### 4. Theming to shadcn radix-nova
- Import `@schedule-x/theme-shadcn` CSS. It is built to consume shadcn-style CSS variables and respects the `.dark` class, so it tracks your existing radix-nova tokens rather than shipping a competing palette.
- Any remaining gaps: Schedule-X also exposes its own CSS custom properties you can override in your global stylesheet to pin accent/border/background to your Tailwind v4 `@theme` variables. This is variable-override work, not a fork — it does **not** fight Tailwind.

### React 19 / Vite 7 gotchas found
- `temporal-polyfill` is a **required peer** of the calendar engine — install it or the build errors; do not assume a native `Temporal` in the WebView.
- The engine renders via bundled **Preact** internally; that's an implementation detail (no extra install) but explains why it stays light. React 19 StrictMode double-invoke is fine because `useCalendarApp` returns a stable instance — memoize the plugins (as above) so you don't recreate services each render.
- Vite 7 + `@tailwindcss/vite` v4: import the theme CSS in a module Vite processes; no PostCSS config needed.

## Future headroom (no rewrite)
- **Week / day views:** already created above (`createViewWeek()`, `createViewDay()`) — free, just add to `views` and a view-switcher.
- **Drag-to-move / resize:** add `@schedule-x/drag-and-drop` (MIT, 3.7.3) as a plugin; (`@schedule-x/resize` exists but its license field is unset — verify before shipping resize).
- **Recurrence:** `@schedule-x/event-recurrence` (MIT, 4.6.1) plugin.
- **Editing UI:** you can hand-build an edit dialog with shadcn `Dialog` + `eventsService.update()`; only the *prebuilt* event modal / drag-to-create are premium — you never need them.
- The one thing that would cost money is **resource/timeline scheduling** (multi-resource lanes) — not in scope and rarely needed for a single-user personal calendar.

## Sources
- Schedule-X repo & license: https://github.com/schedule-x/schedule-x
- Schedule-X React docs: https://schedule-x.dev/docs/frameworks/react
- Schedule-X premium (what's paid): https://schedule-x.dev/premium
- npm registry metadata (versions/licenses/peerDeps): `@schedule-x/react` 4.1.0, `@schedule-x/calendar` 4.6.1, `@schedule-x/theme-shadcn` 4.6.1, `@schedule-x/drag-and-drop` 3.7.3, `@schedule-x/event-recurrence` 4.6.1, `@fullcalendar/react` 7.0.1, `@fullcalendar/core` 7.0.1, `@fullcalendar/rrule` 7.0.1, `react-big-calendar` 1.20.0, `date-fns` 4.4.0 — via https://registry.npmjs.org/<pkg>/latest
- FullCalendar React docs & v7: https://fullcalendar.io/docs/react and https://v7.fullcalendar.io/changelog and https://v7.fullcalendar.io/temporal-polyfill
- FullCalendar React repo/releases: https://github.com/fullcalendar/fullcalendar-react
- react-big-calendar React 19 issue (resolved, peer dep updated): https://github.com/jquense/react-big-calendar/issues/2701
- react-big-calendar npm: https://www.npmjs.com/package/react-big-calendar
