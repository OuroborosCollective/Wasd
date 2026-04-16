# DGCC

Run the repository-wide Design+Gameplay Consistency Contract gate.

## Usage

```bash
pnpm run dgcc
pnpm run dgcc:extreme
DGCC_FIX=1 pnpm run dgcc
```

Artifacts: `dgcc-artifacts/`

The `minimal` / `extreme` modes also run `pnpm run check:interact` (GameConfig vs `shared/interaction.ts`).

E2E: by default DGCC runs `pnpm run test:e2e:reliable` locally (Chromium browser only, no `apt` system deps). In CI (`CI=true`) it uses `test:e2e:ci` (`playwright install --with-deps`). Override with `DGCC_E2E_SCRIPT=test:e2e:ci`.
