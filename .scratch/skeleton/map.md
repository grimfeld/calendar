<!-- wayfinder:map -->
# Calendar app — walking skeleton

## Destination

A running Tauri app (**React + Vite + TypeScript, Tailwind, shadcn/ui**) that shows events on a **basic calendar grid**, where **one event round-trips** — create → persist → read back — against a **local Pocketbase**, running on **both desktop (macOS) and the Android phone**. No login.

## Notes

- **Execution map.** This overrides wayfinder's plan-only default: tickets *do* the work, not just decide it. Resolution of a task ticket means the work is done and demonstrable.
- **Fixed stack:** Tauri v2 · React + Vite + TypeScript · Tailwind CSS · shadcn/ui · Pocketbase (local for now, not the VPS).
- **Package manager is `npm`** (decided in ticket 05): pnpm 7.27 is broken on Node 22 (`ERR_INVALID_THIS`) and silently produced a Tauri v1 project. Use `npm run tauri ...` everywhere. App lives at the **repo root**, package/crate name `calendar`.
- **shadcn caveat:** shadcn/ui's `Calendar` is a date *picker*, not an event scheduler — a grid that renders events needs a scheduler library or a hand-roll (ticket 03 decides).
- **Suggested `events` schema** (confirm in ticket 02): `title` (text, req), `start` (date, req), `end` (date, req), `all_day` (bool), `description` (text, opt).
- **Android ↔ local Pocketbase** is the riskiest unknown (localhost on the phone ≠ the dev machine); ticket 04 de-risks it before ticket 09.
- Consult `docs/agents/issue-tracker.md` and `docs/agents/domain.md` for this repo's conventions.

## Decisions so far

<!-- one line per closed ticket: gist + link -->

- [Verify toolchain readiness](issues/01-verify-toolchain.md) — was **not** fully set up; upgraded Rust 1.67→1.97.1 + added 4 Android targets, so **desktop (ticket 05) is ready**. Android still needs NDK install + JDK 17+ (openjdk@21 already present) — deferred into ticket 09. Use emulator `Pixel_3a_API_33_arm64-v8a`.
- [Scaffold Tauri + React + Vite + TS app](issues/05-scaffold-tauri-react.md) — **Tauri v2** app scaffolded **at repo root**, named `calendar`. **Package manager is npm** (pnpm 7.27 is broken on Node 22 and pulled a Tauri v1 project — avoided). Versions: Tauri 2 / React 19 / Vite 7 / TS 5.8. `npm run tauri dev` verified launching the desktop window. Repo not git-init'd yet.
- [Add Tailwind + shadcn/ui](issues/06-tailwind-shadcn.md) — **Tailwind v4** (`@tailwindcss/vite`) + **shadcn v3** (style `radix-nova`, neutral, lucide, Geist) wired in. `@/*` alias set in tsconfig + vite (ESM `fileURLToPath`). Components `button/input/card/dialog` in `src/components/ui/`; `cn` in `src/lib/utils`. `App.tsx` now a shadcn demo. Verified via `npm run build` (theme tokens + utilities emitted). Note: shadcn CLI v3 needs `-p <preset>` or it prompts.
- [Stand up local Pocketbase + events collection](issues/02-local-pocketbase.md) — **PocketBase 0.39.8** at `pocketbase/`, serves `http://127.0.0.1:8090`. `events` collection (title req, start req, end/all_day/description opt; dates are `"YYYY-MM-DD HH:mm:ss.SSSZ"` strings). **Public API rules** (no login) — local-dev only, lock down for VPS. Schema is a tracked migration; binary+pb_data gitignored. Superuser `admin@calendar.local` in `pocketbase/README.md`. Seed event round-tripped. Server currently stopped — `cd pocketbase && ./pocketbase serve`.
- [Choose the calendar-rendering approach](issues/03-calendar-rendering-approach.md) — **Schedule-X** (MIT; runner-up FullCalendar v7). Decisive: official `@schedule-x/theme-shadcn` matches our radix-nova/Tailwind v4. Month/week/day free; drag+recurrence free ⇒ future headroom. Ticket 08 install: `@schedule-x/react@4 @schedule-x/calendar@4 @schedule-x/events-service@4 @schedule-x/theme-shadcn@4 temporal-polyfill`. Watch PB date mapping (space→`T`) + `temporal-polyfill` peer. See [asset](assets/03-calendar-rendering.md).
- [Reach local Pocketbase from the Android build](issues/04-android-reach-local-pocketbase.md) — **`adb reverse tcp:8090 tcp:8090`** ⇒ phone uses `http://127.0.0.1:8090` too (PB stays on 127.0.0.1, **no per-platform URL branch**). Loopback dodges WebView mixed-content blocking; still needs a **cleartext `network_security_config.xml`** wired into `AndroidManifest.xml`. CORS: no change (PB `*`). **Commit `src-tauri/gen/android/`** (init overwrites manifest). Base URL via `VITE_PB_URL`. Exact snippets in [asset](assets/04-android-network.md); folded into ticket 09.
- [Wire Pocketbase SDK: create + read events](issues/07-wire-pocketbase-sdk.md) — `pocketbase@0.27.0` SDK. Client + types + `listEvents`/`createEvent` in **`src/lib/pb.ts`** (import from `@/lib/pb`). `App.tsx` is a throwaway create-form+list (replaced in 08). **Verified end-to-end in browser**: mount-list, create→3 events, persisted across reload. Date caveat for 08: `start`/`end` use space not `T` → `.replace(" ","T")`. PB has 3 events on 07-20/21/22 for grid testing.
- [Render events on a calendar grid](issues/08-calendar-grid.md) — **Schedule-X v4** month grid, shadcn-themed, renders PB events; shadcn `Dialog` create updates the grid live. Files: `components/CalendarView.tsx`, `lib/eventMap.ts`, `App.tsx`. **Two v4 gotchas fixed** (ticket-03 asset was wrong): v4 events are **Temporal objects** not strings, and Schedule-X uses a **global `Temporal`** → `import "temporal-polyfill/global"` in `main.tsx` + pin `temporal-polyfill@0.3.0` (**essential for ticket 09** — Android WebView has no native Temporal). Verified in browser: seed events render, 2 created live + survive reload. Times show in UTC (polish, deferred). PB now has 5 events.

## Not yet specified

<!-- The destination is a skeleton, so the map is almost fully specified up front; little fog gathers toward it. -->

- Nothing outstanding — the way to the skeleton is fully ticketed. New fog would only appear if a resolution surprises us (e.g. the calendar-rendering choice or the Android network approach forces a follow-on ticket).

## Out of scope

Each item below sits *past* this map's destination — a **future wayfinder effort**, not fog of this map. Not started; listed so the boundary is explicit.

- **VPS deployment** — provisioning, domain, TLS, pointing the app at the remote Pocketbase.
- **Auth / API rules** — needed only once Pocketbase is internet-exposed.
- **Android notifications.**
- **Android home-screen widgets** — native Kotlin views, not something Tauri provides.
- **Tasks** as a concept distinct from events.
- **The full "life organization" feature set** and flexible scheduling.
- **Offline / sync.**
- **Full calendar UX** — drag-to-move, recurrence, week/day views, event editing beyond create+read.
