# Calendar

A personal calendar app — a [Tauri v2](https://tauri.app) desktop + Android application with a [PocketBase](https://pocketbase.io) backend. Fill your schedule with events and tasks, with a flexible, low-friction UI.

> **Status: walking skeleton.** Events round-trip (create → persist → read) on a calendar grid against a local PocketBase, on desktop. Android, the VPS backend, notifications, widgets, and tasks are planned — see the map in [`.scratch/skeleton/`](.scratch/skeleton/map.md).

## Stack

- **Tauri v2** (Rust shell) — desktop (macOS) + Android
- **React 19 + Vite 7 + TypeScript**
- **Tailwind CSS v4** + **shadcn/ui** (radix-nova)
- **Schedule-X** v4 calendar grid
- **PocketBase** 0.39 (local for now; a dedicated VPS is a later effort)

## Prerequisites

- [Rust](https://rustup.rs) (stable), [Node](https://nodejs.org) 20+, and the [Tauri v2 prerequisites](https://tauri.app/start/prerequisites/)
- For Android: Android Studio + SDK/NDK, JDK 17+ (see `.scratch/skeleton/issues/09-android-round-trip.md`)

## Run

```sh
# 1. Backend — local PocketBase (see pocketbase/README.md for first-time setup)
cd pocketbase && ./pocketbase serve --http=127.0.0.1:8090

# 2. App — desktop
npm install
npm run tauri dev

# Frontend only (browser, for quick UI work)
npm run dev
```

The app reads the backend URL from `VITE_PB_URL` (default `http://127.0.0.1:8090`).

## Layout

- `src/` — React frontend (`lib/pb.ts` PocketBase client, `components/CalendarView.tsx` calendar)
- `src-tauri/` — Tauri (Rust) shell
- `pocketbase/` — local PocketBase binary (gitignored) + schema migrations
- `.scratch/skeleton/` — the build plan (wayfinder map + tickets)

## License

Personal project — not currently licensed for reuse.
