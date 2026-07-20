# Choose the calendar-rendering approach

Type: research
Status: resolved

## Question

Decide how the basic calendar grid gets rendered, given the fixed stack (React + Vite + TS, Tailwind, shadcn/ui). shadcn's own `Calendar` is a date picker, not an event scheduler, so this needs a real decision.

Compare candidates for a personal, single-user skeleton:

- **Schedule-X** — modern, framework-adapters incl. React, month/week/day, actively maintained.
- **FullCalendar** — mature, feature-rich; heavier; check React wrapper + licensing for personal use.
- **react-big-calendar** — popular, lighter, less polished; needs a date lib (date-fns/moment).
- **Hand-roll** — a CSS-grid month view + a date lib (date-fns or Temporal). Most control, most work.

Judge on: React fit, bundle weight inside a Tauri webview, mobile/touch responsiveness (matters for the Android target in ticket 09), Tailwind/shadcn visual coherence, licensing for private use, and how much of the "full calendar UX" (out of scope now) it would unlock later without a rewrite.

Deliver a short markdown summary (linked as an asset) with a recommendation and the one runner-up. Resolve with the chosen approach + the install/integration outline ticket 08 will follow.

## Answer

**Chosen: Schedule-X.** Runner-up: FullCalendar v7. Full findings + comparison table + integration outline in the asset: [`assets/03-calendar-rendering.md`](../assets/03-calendar-rendering.md).

**Why Schedule-X** (`@schedule-x/react` 4.1.0 + `@schedule-x/calendar` 4.6.1, all **MIT**):
- Month/week/day views are **free**; premium only gates event-modal, drag-to-create, resource view, draw, sidebar — none needed for the skeleton.
- Peer-deps declare React `^19`; Preact-based, **mobile-first touch** (matters for the Android target).
- **Decisive factor:** ships an official **`@schedule-x/theme-shadcn`** (MIT) that consumes shadcn CSS vars and honors `.dark` — coheres with our radix-nova / Tailwind v4 setup instead of fighting it. FullCalendar has no first-party shadcn theme (manual `--fc-*` overrides).
- Free MIT drag-and-drop + recurrence plugins ⇒ future headroom (week/day/drag/recurrence) with no rewrite, no purchase.

**Rejected:** react-big-calendar 1.20.0 (heaviest — pulls moment/luxon/dayjs/globalize/lodash, weak touch); hand-roll with date-fns (lightest/most coherent but you build everything — only worth it if staying minimal forever).

**Install (for ticket 08):**
```
npm install @schedule-x/react@4 @schedule-x/calendar@4 @schedule-x/events-service@4 @schedule-x/theme-shadcn@4 temporal-polyfill
```

**Gotchas for ticket 08:**
- Both Schedule-X and FullCalendar v7 need a **`temporal-polyfill`** peer (Temporal isn't native in the 2026 WebViews).
- PocketBase date mapping: convert `"YYYY-MM-DD HH:mm:ss.SSSZ"` (space) → replace space with `T` before `new Date`; Schedule-X wants `"YYYY-MM-DD"` for all-day and `"YYYY-MM-DD HH:mm"` for timed events. `id` is required on events. (Details + React-19 mount pattern in the asset.)
- `@schedule-x/resize` had no license field in npm metadata — verify before ever adding resize (not needed for month create/read).
