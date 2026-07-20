# Wire Pocketbase SDK: create + read events

Type: task
Status: resolved
Blocked by: 05, 02

## Question

Connect the app to the local Pocketbase instance and prove the data path independent of the calendar UI: create an event and read events back.

Do:

- Add the official `pocketbase` JS SDK. Create a single client module pointing at the local base URL (from ticket 02); keep the base URL configurable per platform in anticipation of ticket 04/09.
- Define a TypeScript type for the event matching the ticket-02 schema.
- Implement `createEvent()` and `listEvents()` against the `events` collection.
- Drive them from a throwaway button/list in the app (real calendar grid comes in ticket 08) to demonstrate: click → record appears in Pocketbase → list reflects it after refetch.

Resolve when an event created in the app persists to local Pocketbase and reads back. Answer records the client module location and the event type/API surface ticket 08 will consume.

## Answer

The app talks to local PocketBase via the official SDK and a full create→persist→read round-trip was demonstrated in the running UI.

**SDK:** `pocketbase@0.27.0` (compatible with PB 0.39.8).

**Client module: `src/lib/pb.ts`** — the API surface ticket 08 consumes:
- `pb` — a configured `PocketBase` client. `pb.autoCancellation(false)` (React StrictMode double-invokes effects → avoids the duplicate list request being aborted).
- `PB_URL` — `import.meta.env.VITE_PB_URL ?? "http://127.0.0.1:8090"` (per ticket 04: identical URL on desktop + Android via `adb reverse`, so no per-platform branch).
- `interface EventRecord { id, title, start, end, all_day, description, created }` — all strings except `all_day: boolean`. `start`/`end` are PB date strings `"YYYY-MM-DD HH:mm:ss.SSSZ"` (space, not `T`); `end` is `""` when unset.
- `interface NewEvent { title, start, end?, all_day?, description? }`.
- `listEvents(): Promise<EventRecord[]>` — `getFullList({ sort: "start" })`.
- `createEvent(data: NewEvent): Promise<EventRecord>`.

**Demo UI:** `src/App.tsx` is a throwaway shadcn form (Input + datetime-local + Button) and list — replaced by the real calendar grid in ticket 08. It sends `new Date(datetimeLocalValue).toISOString()` for `start`; PB accepts the ISO-`T` form and stores it normalized to the space form.

**Verification (all passed):**
- `npm run build` (tsc + vite) — SDK types compile; app bundles (JS 229→269 kB with SDK).
- Live SDK round-trip via a temp node script using the same SDK calls: list 1→2, created record read back.
- **End-to-end in the browser** (Vite dev + live PB, driven via Chrome): initial `listEvents()` rendered 2 events on mount; submitting the form created "UI round-trip test" → list became **3 events** and the row appeared; **survived a page reload** (re-fetched from PB, proving real persistence, not React state). shadcn styling rendered correctly.

**State for ticket 08:**
- Import `listEvents`, `createEvent`, `EventRecord`, `NewEvent`, `PB_URL` from `@/lib/pb`.
- **Date mapping caveat:** `EventRecord.start/end` use a space, not `T` — Schedule-X needs `start.replace(" ", "T")` before `new Date(...)`, and its own `"YYYY-MM-DD HH:mm"` / `"YYYY-MM-DD"` formats (see ticket 03 asset).
- PB DB currently holds **3 events on 2026-07-20/21/22** (one seed + two test rows) — handy multi-day data for rendering the month grid. Delete via the admin UI if a clean slate is wanted.
- Servers left **stopped**: `cd pocketbase && ./pocketbase serve` and `npm run dev` (or `npm run tauri dev`).
