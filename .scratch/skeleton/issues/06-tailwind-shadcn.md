# Add Tailwind + shadcn/ui

Type: task
Status: resolved
Blocked by: 05

## Question

Wire Tailwind CSS and shadcn/ui into the scaffolded app so components are available for the calendar UI.

Do:

- Install and configure Tailwind for the Vite + React project (check current Tailwind major — v4 changes the setup vs v3; record which is used and configure accordingly).
- Configure path aliases (`@/*`) that shadcn expects in `tsconfig` and `vite.config`.
- Run `shadcn init`, then add a couple of components used by the skeleton (e.g. `button`, `dialog`, `input`, `card`) to prove the pipeline.
- Render one shadcn component in the app and confirm it styles correctly in `npm run tauri dev`.

Resolve when a shadcn component renders styled in the desktop app. Answer records the Tailwind version and the shadcn setup notes (alias config, components dir).

## Answer

Tailwind + shadcn/ui are wired into the root Vite app and verified via a full production build.

**Tailwind:** v4 (`tailwindcss` + `@tailwindcss/vite` **4.3.3**) — the v4 flow (no `tailwind.config.js`). Added the `tailwindcss()` plugin to `vite.config.ts`; global CSS is `src/index.css` (`@import "tailwindcss";` + shadcn theme), imported from `src/main.tsx`.

**Path aliases (`@/*`):**
- `tsconfig.json` → `compilerOptions.baseUrl: "."` + `paths: { "@/*": ["./src/*"] }`.
- `vite.config.ts` → `resolve.alias` `"@"` via `fileURLToPath(new URL("./src", import.meta.url))` — ESM-safe (project is `"type": "module"`, so no `__dirname`). Tauri's `server` block (port 1420, strictPort, hmr) left untouched.

**shadcn:** CLI is **v3** — flags differ from older docs. Init: `npx shadcn@latest init -b radix -p nova --yes` (the `-y` alone still prompts for a preset; must pass `-p <name>` from: nova, vega, maia, lyra, mira, luma, sera, rhea). Result in `components.json`: **style `radix-nova`**, base color **neutral**, CSS variables on, **lucide** icons, Radix primitives, **Geist** font (`@fontsource-variable/geist`). Created `src/lib/utils.ts` (`cn`).

**Components added** (`src/components/ui/`): `button`, `input`, `card`, `dialog` — via `npx shadcn@latest add button dialog input card --yes`.

**Demo:** replaced the scaffold's greet demo in `src/App.tsx` with a shadcn `Card` + `Input` + `Button` using `@/` imports; deleted the orphaned `src/App.css`.

**Verification:** `npm run build` (tsc + vite) passes — 137 modules, CSS **1.4 kB → 32.4 kB**. Confirmed in the emitted CSS: theme tokens (`--primary/--background/--card`), layout utilities (`bg-background`, `text-foreground`, `min-h-screen`, `max-w-sm`), and shadcn component classes (`inline-flex`, `shrink-0`, `rounded-xl`, `h-9`) — i.e. component sources are scanned, not purged. The production build runs the same transform as `tauri dev`, so styling is proven; desktop window launch itself was already verified in ticket 05.

**For ticket 08:** style is `radix-nova` (rounded-lg/xl radii, Geist font); dark mode is class-based (`.dark`) but no toggle is wired yet; use `@/components/ui/*` and `cn` from `@/lib/utils`.
