# DGCC

Run the repository-wide Design+Gameplay Consistency Contract gate.

## Usage

```bash
pnpm run dgcc
pnpm run dgcc:extreme
DGCC_FIX=1 pnpm run dgcc
```

Artifacts: `dgcc-artifacts/`

The `minimal` / `extreme` modes also run `pnpm run check:interact` (GameConfig vs `packages/shared/src/utils/interaction.ts`). The `unit` step runs `pnpm run test:dgcc` (client + `@wasd/shared` Vitest). E2E uses `pnpm run build:e2e-web` then Playwright.
