# Onboarding & Technical Documentation

This file is a quick contributor onboarding guide for the **current** Areloria / WASD runtime.

For full status, read in this order:

1. `README_START_HERE.md`
2. `docs/PROJECT_STATUS_2026.md`
3. `docs/ROADMAP_TO_RELEASE.md`
4. `docs/DOCUMENTATION_INDEX.md`

---

## System requirements

- **Node.js:** 22.x recommended for production parity. The root package currently allows `>=18`, but deploy/runtime docs target Node 22.
- **pnpm:** use the version declared by `package.json` / Corepack. At the time of this refresh the repo declares `pnpm@11.5.0`.
- **Docker:** required for production-style VPS deploy testing.
- **Python:** only needed for specific helper scripts; it is not the main server runtime.

---

## Current architecture overview

The project is a pnpm workspace / monorepo.

- **3D client (`client/`):** Vite + TypeScript + Babylon.js.
- **2D client (`apps/client-2d/`):** PixiJS v7 + React UI.
- **Server (`server/`):** Node.js + TypeScript + Express + WebSocket (`ws`).
- **Simulation:** authoritative `WorldTick` at roughly 100 ms / 10 Hz.
- **Data:** `game-data/` JSON content, optionally published into `published-content/current`.
- **Auth:** Supabase JWT path with explicit guest/dev toggles.
- **Persistence:** `PERSISTENCE_DRIVER=auto|postgres|file`.
- **Optional services:** Redis, Soketi/Pusher-compatible services, Supabase/Postgres stack.

---

## Repository structure

```text
.
├── apps/
│   └── client-2d/          # PixiJS v7 + React 2D client
├── client/                 # Vite + Babylon.js 3D browser client
├── server/                 # Node/Express/WebSocket authoritative game server
├── packages/               # Shared/core packages
├── game-data/              # Authoritative JSON content
├── docs/                   # Current docs, architecture notes, roadmaps, archives
├── deploy/                 # VPS/env/deploy helper scripts
├── scripts/                # Guard, audit, sync, import, and validation scripts
└── .github/workflows/      # CI, deploy, verification, and automation workflows
```

---

## Setup

Enable Corepack and install dependencies from the repository root:

```bash
corepack enable
pnpm install
```

Build the active workspaces:

```bash
pnpm run build
```

Run architecture/monorepo/tick guards:

```bash
pnpm run guard:all
```

Targeted builds:

```bash
pnpm run build:2d
pnpm run build:3d
pnpm run build:web
pnpm --filter @wasd/server --if-present build
pnpm --filter @wasd/shared --if-present build
```

---

## Development commands

```bash
pnpm run dev:2d
pnpm run dev:3d
pnpm run dev:web
pnpm run dev:all
```

Use the package scripts as source of truth before adding new commands.

---

## Validation checklist before a PR

Minimum safe checks:

```bash
pnpm run build
pnpm run guard:all
pnpm --filter @wasd/server --if-present test
pnpm run assets:pixi:validate
pnpm run assets:pixi:validate-batches
```

For release-related changes, also run the determinism gate and relevant E2E/deploy verification workflows.

---

## Important rules

- Do not treat historical reconstruction packs as source of truth.
- Do not reintroduce hidden simulation nondeterminism (`Math.random()`, `Date.now()`, `new Date()`) into gameplay-result paths.
- Do not damage protected player-built or paid structures unless an explicit reviewed policy allows it.
- Keep `docs/PROJECT_STATUS_2026.md` and `docs/ROADMAP_TO_RELEASE.md` updated when behavior or release scope changes.
- Work in small PRs. Preserve the working foundation.
