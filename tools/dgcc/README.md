# DGCC

Run the repository-wide Design+Gameplay Consistency Contract gate.

## Usage

```bash
pnpm run dgcc
pnpm run dgcc:extreme
DGCC_FIX=1 pnpm run dgcc
```

Artifacts: `dgcc-artifacts/`

Modes also run `pnpm run check:interact` (GameConfig vs `packages/shared/src/utils/interaction.ts`).

The `unit` step runs `pnpm run test:dgcc` (a small Vitest slice). Set `DGCC_FULL_UNIT=1` to run the full `pnpm run test` suite instead.

The default `minimal` mode skips Playwright E2E for speed and environment independence; `extreme` runs `pnpm run test:e2e:ci` as well.

Extreme mode enables asset auto-fix (empty model subfolders) when permitted by the contract.
