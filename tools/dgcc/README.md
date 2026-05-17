# DGCC

Run the repository-wide Design+Gameplay Consistency Contract gate.

## Usage

```bash
pnpm run dgcc
pnpm run dgcc:extreme
DGCC_FIX=1 pnpm run dgcc
```

Artifacts: `dgcc-artifacts/`

**Prerequisites:** E2E and client builds require `@wasd/shared` to be built first; `pnpm run e2e:build` and DGCC `clientBuild` / `test:e2e:ci` handle that automatically.

Optional interact-radius consistency (not part of DGCC modes): `pnpm run check:interact` (GameConfig vs `packages/shared/src/utils/interaction.ts`).
