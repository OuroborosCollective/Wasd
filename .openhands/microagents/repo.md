# OpenHands Repository Instructions — Wasd / Areloria

You are working inside a production-oriented browser MMORPG monorepo. Your job is to move the project closer to a releasable, stable, user-useful state.

## Prime Directive

Do not fake progress.

- No mock truth path
- No fake snapshots
- No UI that invents runtime truth
- No placeholder success states
- No auto-merge
- No destructive rewrite unless clearly required by the issue

Create real code changes that can be reviewed in a Draft Pull Request.

## Project Overview

Wasd / Areloria is a browser MMORPG monorepo:
- `server/`: Express + WebSocket authoritative game server
- `client/`: Vite + Babylon.js rendering client (3D)
- `apps/client-2d/`: PixiJS v7 + React UI (2D isometric)
- `game-data/`: content source (quests, NPCs, dialogue, world objects/scenes)
- `apps/api/`: API services

Primary source-of-truth docs:
- `README.md`
- `docs/PROJECT_STATUS_2026.md`
- `docs/ROADMAP_TO_RELEASE.md`
- `docs/DOCUMENTATION_INDEX.md`

## Architecture Rules

A UI may display truth.
A UI must not create truth.

Prefer real sources:
- repository files
- workflow runs
- build logs
- type-check results
- test results
- runtime validation reports
- deterministic calculations
- persisted snapshots created from real input

Avoid:
- random fake metrics
- hardcoded green states
- console-only success
- empty service wrappers that claim success
- broad rewrites without tests
- hidden state that cannot be inspected

## Development Style

Make the smallest strong change that moves the project closer to release.

Prefer:
- TypeScript-safe code
- deterministic helpers
- clear error states
- fail-closed behavior
- human-readable logs
- Android WebView compatibility
- tablet and phone friendly UI
- accessible labels
- resilient async handling
- defensive parsing
- no brittle DOM scraping when React/runtime state is available

## Validation Order

Before finalizing a task, try to run the strongest available validation in this order:

1. `pnpm install` — package manager install check
2. `npx tsc --noEmit` — typecheck
3. `npx eslint server/src client/src` — lint
4. `npx vitest run` — unit tests
5. `pnpm run build` — build
6. Focused tests for touched files
7. Workflow-specific checks if present

If a command is unavailable, explain that clearly in the PR body.

## GitHub Workflow Rules

Open a Draft Pull Request only.
Do not merge.
Do not close issues unless the workflow explicitly handles it.
Do not delete unrelated files.
Do not change secrets.
Do not print secrets.
Do not weaken CI to make a run green.
Do not replace failing validation with `|| true`.

## Release-Oriented Improvements

When an issue is broad, prioritize improvements that help release readiness:

- Remove boot blockers
- Fix type errors
- Fix broken imports
- Fix mobile layout blockers
- Improve repo loading reliability
- Improve draft PR publishing flow
- Improve workflow status visibility
- Improve error reporting
- Improve runtime validation coverage
- Improve tests for critical paths
- Reduce fragile side effects

## WASD ARE Truth Rules

Green state is only valid through real causality.

A green status must come from actual runtime or validation evidence:
- command exit code
- workflow conclusion
- parsed real report
- deterministic runtime calculation
- actual repository/file result
- actual API result

If truth is unknown, show unknown.
If blocked, show blocked.
If degraded, show degraded.
Never show green because it feels nice.

## Android-first UX Rules

Assume the user may operate from Android tablet or phone.

Prefer:
- copy-paste friendly output
- compact navigation
- responsive layout
- safe touch targets
- no desktop-only assumptions
- no hover-only controls
- readable logs and state panels
- graceful handling of narrow widths

## Project-Specific Commands

```bash
# Install dependencies
pnpm install

# Build all workspaces
pnpm run build

# Run tests
pnpm run ci:verify

# Lint
npx eslint server/src apps/client-2d/src

# Server dev (stable mode with embedded Vite)
npx tsx server/src/index.ts

# Build @wasd/shared first if Vite shows import errors
pnpm -C packages/shared build

# Content validation
pnpm run validate --prefix server

# Model path audit
pnpm run audit:model-paths
```

## Key Directories

- `server/src/` — Game server (Express + WebSocket)
- `apps/client-2d/src/` — 2D isometric client (PixiJS v7 + React)
- `client/src/` — 3D client (Babylon.js + Vite)
- `server/game-data/` — Content (quests, NPCs, dialogue)
- `packages/shared/` — Shared code between client/server
- `docs/` — Project documentation
- `deploy/` — VPS deployment configs
- `scripts/` — Build and maintenance scripts

## Forbidden Shortcuts

Never use:
- `npm install || true`
- `pnpm install || true`
- `npm test || true`
- `pnpm test || true`
- fake generated success output
- fake API success
- fake workflow pass
- fake runtime snapshot
- artificial progress percentages without real source
- silent catch blocks that hide real failures
- `|| true` to bypass failing validation

## Preferred Outcome

A good result is not "many files changed".

A good result is:
- one real blocker removed
- one real feature made safer
- one release path made clearer
- one runtime truth source connected
- one validation added
- one Draft PR that a human can review with confidence

## PR Body Requirements

Every PR should explain:
- what changed
- why it helps release readiness
- what validation was run
- what could not be validated
- any remaining risks
- whether any generated behavior is scaffold-only or fully connected
