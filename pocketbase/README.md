# Local PocketBase backend

Local dev backend for the calendar skeleton. **Not** the VPS (that's a later effort).

- **Version:** PocketBase 0.39.8 (`darwin_arm64`)
- **URL:** http://127.0.0.1:8090 (admin UI at `/_/`)
- **Schema:** the `events` collection is defined by the migration in `pb_migrations/` and auto-applies on first `serve`.

## Run

```sh
cd pocketbase
./pocketbase serve --http=127.0.0.1:8090
```

## Fresh-clone bootstrap

The binary and `pb_data/` are gitignored; `pb_migrations/` is tracked. On a new machine:

```sh
# 1. download the binary into this dir (see version above), then:
./pocketbase superuser create admin@calendar.local calendaradmin2026
./pocketbase serve            # applies pb_migrations → creates the `events` collection
```

## Superuser (local only)

`admin@calendar.local` / `calendaradmin2026` — stored in `pb_data` (gitignored). Not a real secret: this is a local, no-login personal instance. Rotate/replace before the collection is ever exposed on the VPS.

## Collections

All rules on `events` and `tasks` are `@request.auth.id != ""` — every operation requires a signed-in user from the built-in `users` auth collection (single personal account; the app has a login screen). Guests get empty lists and rejected writes.

To create the app user (locally or on fly.io): sign into the admin dashboard (`/_/`) as superuser → `users` collection → New record (email + password).

### `events`

A row with a non-empty `task` relation is a **TimeBlock** — a scheduled session of that task (see `docs/adr/0001`).

| field | type | required |
|-------|------|----------|
| `title` | text (max 200) | yes |
| `start` | date | yes |
| `end` | date | no |
| `all_day` | bool | no |
| `description` | text | no |
| `task` | relation → tasks (cascade delete) | no |
| `reminder` | number (minutes before start; 0 = none; all-day → 09:00 morning-of) | no |
| `created` | autodate | (auto) |

### `tasks`

| field | type | required |
|-------|------|----------|
| `title` | text (max 200) | yes |
| `notes` | text | no |
| `done` | bool | no |
| `created` | autodate | (auto) |

## Deployment (fly.io)

`Dockerfile` + `fly.toml` deploy to https://calendar-pb.fly.dev (app `calendar-pb`, region `fra`, volume `pb_data`). Migrations apply on boot. After first deploy: create the superuser and the app user (see above). The app points at it via `VITE_PB_URL=https://calendar-pb.fly.dev` (baked into CI-built APKs).
