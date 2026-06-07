# ARELogic Live System Contract

## Scope

This contract hardens the live client route truth without changing gameplay semantics.

## Rules

- The 2D source lives in `apps/client-2d`.
- The public 2D route is `/2d`.
- Health exposes entrypoint truth through `/health/client-entrypoints`.
- This contract does not alter `LiveGameplaySnapshot` schema.
- This contract does not move client authority into the browser.

## Determinism

- No `Math.random` for gameplay.
- No `Date.now` for gameplay progression.
- No fake route source paths.
- No client-side gameplay outcomes.
- Server remains authoritative.

## Validation

Run:

```bash
pnpm guard:entrypoints
pnpm guard:all
pnpm run test:e2e -- --grep "Live System Contract"
```

## Follow-up work

Snapshot v2, WorldTick ports and SelfHeal signals should be split into separate PRs. Do not merge those contracts into this guard PR.
