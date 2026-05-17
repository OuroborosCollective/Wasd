# DGCC

Run the repository-wide Design+Gameplay Consistency Contract gate.

## Usage

```bash
pnpm run dgcc
pnpm run dgcc:extreme
DGCC_FIX=1 pnpm run dgcc
```

Artifacts: `dgcc-artifacts/`

## What runs in `minimal` mode

- **unit** — `pnpm run test:dgcc` (client Vitest suite; fast and stable in CI without optional backend services).
- For the full monorepo suite including server tests, run `pnpm run test` separately.

The **e2e** step runs `pnpm run test:e2e:ci`, which builds `@wasd/shared`, the Vite client, and the transpiled server before Playwright (production server serves `client/dist`, including `e2e-smoke.html`).

The `minimal` / `extreme` modes also run `pnpm run check:interact` (GameConfig vs `packages/shared/src/utils/interaction.ts`).
