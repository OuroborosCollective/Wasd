# DGCC

Run the repository-wide Design+Gameplay Consistency Contract gate.

## Usage

```bash
pnpm run dgcc
pnpm run dgcc:extreme
DGCC_FIX=1 pnpm run dgcc
```

Artifacts: `dgcc-artifacts/`

- **minimal** runs a fast Playwright **health** check (`e2eHealth`); **extreme** runs the full E2E suite (`pnpm run test:e2e:ci`, including WebSocket smoke).

Optional interact-radius gate (not part of DGCC modes): `pnpm run check:interact` (aligns `GameConfig.interactDistance` with `packages/shared/src/utils/interaction.ts`).
