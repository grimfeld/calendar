# Stand up local Pocketbase + events collection

Type: task
Status: resolved

## Question

Get a local Pocketbase instance running and define the `events` collection so the app has something to round-trip against. Independent of the app scaffold — can run in parallel with tickets 01/03/04.

Do:

- Download the Pocketbase binary (pin the version; record it) and run it locally (`./pocketbase serve`, default `http://127.0.0.1:8090`).
- Create the admin account; note where credentials live.
- Create an `events` collection. Confirm/adjust the suggested schema: `title` (text, required), `start` (date, required), `end` (date, required), `all_day` (bool), `description` (text, optional). Decide whether `end` is required for the skeleton or nullable.
- Since there's no login (personal app), decide the collection API rules for the skeleton — simplest is open list/view/create rules for local dev. Record the choice; note it's revisited when the VPS/auth effort happens (out of scope here).
- Add one seed event via the Pocketbase admin UI to prove the collection works.

Resolve with: Pocketbase version, base URL, the final `events` schema (field names + types the app will code against), and the API-rule choice.

## Answer

Local PocketBase is stood up, the `events` collection exists, and a seed event round-trips through the REST API. Lives at repo-root `pocketbase/` (see `pocketbase/README.md`).

**Version / URL:** PocketBase **0.39.8** (`darwin_arm64`), served at **`http://127.0.0.1:8090`** (admin UI `/_/`, records API `/api/collections/events/records`).

**Superuser:** `admin@calendar.local` / `calendaradmin2026`, created via `./pocketbase superuser create ...`. Stored in `pb_data` (gitignored). Local-only, not a real secret; documented in `pocketbase/README.md`.

**`events` schema** (what ticket 07 codes against — collection id `pbc_1687431684`):

| field | PB type | required | JSON shape returned |
|-------|---------|----------|---------------------|
| `id` | text (system) | auto | `string` (15-char) |
| `title` | text (max 200) | **yes** | `string` |
| `start` | date | **yes** | `string` e.g. `"2026-07-20 09:00:00.000Z"` |
| `end` | date | no | `string` (empty `""` if unset) |
| `all_day` | bool | no | `boolean` |
| `description` | text | no | `string` |
| `created` | autodate (onCreate) | auto | `string` |

Decision on `end`: **not required** (point/all-day events needn't have one). PB date fields serialize as `"YYYY-MM-DD HH:mm:ss.SSSZ"` strings, not ISO-T — ticket 07/08 must format accordingly (the JS SDK and calendar lib will need `new Date(...)` conversion).

**API rules:** all five (list/view/create/update/delete) set to **`""` (public)** — deliberate, since the skeleton has **no login**. This means the app needs no auth to CRUD events locally. ⚠️ Recorded as local-dev-only in the README; the VPS effort (out of scope) must lock these down before internet exposure.

**Reproducibility:** collection creation was auto-captured as a migration `pb_migrations/1784534331_created_events.js` (PB dev automigrate) — tracked in git; auto-applies on a fresh `serve`. Binary + `pb_data/` gitignored. Bootstrap steps in `pocketbase/README.md`.

**Verification:** health `200`; superuser auth OK; `POST /api/collections/events/records` created "First event" and `GET` listed it back (`totalItems: 1`).

**State for ticket 07:** server is currently **stopped** — start it with `cd pocketbase && ./pocketbase serve --http=127.0.0.1:8090`. App base URL for desktop: `http://127.0.0.1:8090`. (Android base URL is ticket 04/09's concern.)
