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

## `events` collection

Public rules (list/view/create/update/delete = `""`) — deliberate, because the skeleton has no login. Fields:

| field | type | required |
|-------|------|----------|
| `title` | text (max 200) | yes |
| `start` | date | yes |
| `end` | date | no |
| `all_day` | bool | no |
| `description` | text | no |
| `created` | autodate | (auto) |

> ⚠️ Public write rules are for local dev only. The VPS deployment effort must lock these down (auth / API rules) before exposing PocketBase to the internet.
