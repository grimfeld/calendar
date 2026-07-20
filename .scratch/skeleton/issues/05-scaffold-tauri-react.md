# Scaffold Tauri + React + Vite + TS app

Type: task
Status: resolved
Blocked by: 01

## Question

Create the Tauri v2 project with a React + Vite + TypeScript frontend, and confirm it runs on desktop. This is the foundation the UI and backend-wiring tickets build on.

Do:

- Scaffold with `create-tauri-app` (or `pnpm create tauri-app`) selecting the **React + TypeScript (Vite)** template. Record the exact command and versions chosen.
- Verify `pnpm tauri dev` opens a desktop window rendering the default app.
- Commit-ready project structure in the repo root (this repo is currently empty — decide the layout: app at root vs a subfolder). Note: `git init` if version history is wanted.
- Do **not** add Android yet (that's ticket 09) and do **not** add Tailwind/shadcn yet (ticket 06).

Resolve when `pnpm tauri dev` runs a blank desktop app cleanly. Answer records the project layout and the Tauri/React/Vite versions.

## Answer

Scaffolded a **Tauri v2** React+Vite+TS app at the **repo root** (app files coexist with `CLAUDE.md`, `docs/`, `.scratch/`). Renamed from `calendar-scaffold` → **`calendar`** throughout (npm name, Rust crate `calendar` + lib `calendar_lib`, `productName`/window title `Calendar`, identifier `com.paulperson.calendar`).

**Package manager decision: npm** (not pnpm). The installed **pnpm 7.27 is broken on Node 22** (`ERR_INVALID_THIS`, fixed only in pnpm 8.6+) — it silently pulled a stale `create-tauri-app` and generated a **Tauri v1** project first (v1 has no mobile → would kill ticket 09). Re-scaffolded with `npm create tauri-app@latest ... --template react-ts --manager npm -y` (create-tauri-app 4.6.2). All downstream tickets updated pnpm→npm.

**Versions:** Tauri `2` (cli/api `^2`, runtime 2.11.5), React `19.1`, Vite `7.3`, TypeScript `5.8`, `@tauri-apps/plugin-opener ^2`. Config is schema-v2 (`devUrl` http://localhost:1420, `frontendDist ../dist`).

**Verification (all passed):**
- `npm install` — clean, 0 vulnerabilities.
- `npm run build` — Vite frontend built (`dist/`).
- `cargo check` in `src-tauri` — full Tauri v2 dep tree + `calendar` crate compiled (31.8s).
- `npm run tauri dev` — compiled the dev binary and reached `Running \`target/debug/calendar\`` (desktop window launched, no panics). Process then stopped cleanly.

**Layout:** app at repo root — `package.json`, `index.html`, `vite.config.ts`, `src/` (React), `src-tauri/` (Rust). `.gitignore` present. **Repo is not a git repo yet** — run `git init` if version history is wanted (not done; out of this ticket's scope).

**For ticket 06:** default `src/App.tsx` still has the scaffold greet demo; Tailwind/shadcn not added yet. Path aliases (`@/*`) not yet configured.
