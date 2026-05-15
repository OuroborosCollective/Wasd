# DGCC

Run the repository-wide Design+Gameplay Consistency Contract gate.

## Modes

- **minimal** (default for `pnpm run dgcc`): lint, interact-distance check, E2E, content validate, asset/ws/ui smoke checks. Skips the full Vitest suite so the gate stays usable while server tests are being stabilized.
- **extreme** (`pnpm run dgcc:extreme`): minimal checks plus full `pnpm run test`, client build, and server build.

## Usage

```bash
pnpm run dgcc
pnpm run dgcc:extreme
DGCC_FIX=1 pnpm run dgcc
bash tools/dgcc/selfheal-wrapper.sh
```

Artifacts: `dgcc-artifacts/` (gitignored).

The `minimal` / `extreme` modes also run `pnpm run check:interact` (GameConfig vs `shared/interaction.ts`).
