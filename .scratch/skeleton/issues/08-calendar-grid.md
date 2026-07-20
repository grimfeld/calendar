# Render events on a calendar grid

Type: task
Status: resolved
Blocked by: 03, 06, 07

## Question

Build the basic calendar grid using the approach chosen in ticket 03, and show real events on it — completing the desktop half of the round-trip.

Do:

- Integrate the chosen calendar rendering (library or hand-roll from ticket 03) into the React app.
- Feed it events from `listEvents()` (ticket 07) so persisted events appear on the grid.
- Provide a minimal create path (a shadcn dialog/form → `createEvent()`) so a new event appears on the grid after save.
- Style it coherently with Tailwind/shadcn. Month view is enough; drag/recurrence/week-day views are out of scope.

Resolve when, on desktop, creating an event shows it on the calendar grid and it survives a reload (proving persistence). Answer notes any integration gotchas that ticket 09 (Android) should watch for.

## Answer

Schedule-X month grid renders PocketBase events, styled with the shadcn theme, and create-from-dialog updates the grid live. Verified end-to-end in the browser.

**Packages:** `@schedule-x/react` 4.1.0, `@schedule-x/calendar` 4.6.1, `@schedule-x/events-service` 4.6.1, `@schedule-x/theme-shadcn` 4.6.1, `temporal-polyfill` **0.3.0** (pinned — see below).

**Files:**
- `src/components/CalendarView.tsx` — `useCalendarApp` with month/week/day views (`defaultView: "month-grid"`), events passed at mount. Fetches from `listEvents()`, maps, renders `<ScheduleXCalendar>`.
- `src/lib/eventMap.ts` — `pbToScheduleX()`: PB record → Schedule-X event.
- `src/App.tsx` — full-height calendar + a shadcn `Dialog` create form (title + datetime-local). On create → `createEvent()` → bump reloadKey.
- `src/main.tsx` — imports `temporal-polyfill/global` (critical, below).

**Two non-obvious integration bugs fixed (the ticket-03 research was wrong about the v4 API):**
1. **v4 uses Temporal objects, not date strings.** `CalendarEventExternal.start/end` are `Temporal.ZonedDateTime` (timed) / `Temporal.PlainDate` (all-day) — NOT the `"YYYY-MM-DD HH:mm"` strings the ticket-03 asset described (that was v2/v3). Passing strings throws `Event start time needs to be a Temporal.ZonedDateTime or Temporal.PlainDate`.
2. **Schedule-X reads a GLOBAL `Temporal`.** Its dist references a free `Temporal` (= `globalThis.Temporal`). Desktop Chrome 2026 has it natively, so the grid rendered — but events built from the *imported* `temporal-polyfill` are a different class ⇒ `instanceof` fails silently (0 events) or throws. **Fix:** `import "temporal-polyfill/global"` in `main.tsx` (installs one global) + the mapper uses the **global** `Temporal`. Also pinned `temporal-polyfill@0.3.0` to match Schedule-X (unpinned pulled 1.0.1). ⇒ **Critical for ticket 09:** the Android WebView has NO native Temporal, so this global install is what makes the calendar work on Android at all.

**Live-refresh fix:** keying the calendar remount on `reloadKey` showed stale events (fetched `events` state lags the key by one render; `useCalendarApp` only reads events at mount). Fixed by keying on a `version` bumped *after* each fetch resolves, so events + key change together.

**Verification (browser, live PB):**
- 3 seed events rendered on the correct days (20/21/22 July) — shadcn-themed chips.
- Created "Dentist appointment" (24th) and "Team standup" (28th) via the dialog → each appeared on the grid **live, no reload**. Persistence confirmed by a full page reload showing them re-fetched from PB.

**Notes / follow-ups (not blocking the skeleton):**
- Event **times display in UTC** (the calendar's default zone), e.g. 09:00Z shows "9:00 AM". Local-time display is a polish item (full calendar UX is out of scope).
- Production JS bundle is ~536 kB (>500 kB Vite warning) — fine for a personal desktop/mobile app; code-split later if wanted.
- PB currently holds **5 events** (3 seed + 2 created here) — extra multi-day data, handy for ticket 09; trim via the admin UI if desired.
- `npm run build` passes; servers left stopped.
