# DGCC

Run the repository-wide Design+Gameplay Consistency Contract gate.

## Usage

```bash
pnpm run dgcc
pnpm run dgcc:extreme
DGCC_FIX=1 pnpm run dgcc
```

Artifacts: `dgcc-artifacts/`

Both modes run `pnpm run check:interact` (GameConfig vs `packages/shared/src/utils/interaction.ts`).

The `extreme` mode additionally runs `modelPathsAudit` (`pnpm run audit:model-paths`), which requires synced GLB assets under `client/public` (see `scripts/sync-world-assets.mjs`).

## Unit scope

- **minimal** (default): runs `pnpm run test:dgcc` (content validation, interaction parity, model-path audit unit coverage).
- **extreme**: runs the full `pnpm run test` Vitest suite.
- Override: `DGCC_FULL_UNIT=1` forces the full suite in minimal mode; `DGCC_FULL_UNIT=0` forces the subset in extreme mode.
