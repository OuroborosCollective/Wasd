# DGCC

Run the repository-wide Design+Gameplay Consistency Contract gate.

## Prerequisite

Install workspace dependencies from the repo root (`pnpm install`). DGCC runs Vitest at the root; without devDependencies such as `jsdom`, the unit step fails with opaque module errors.

## Usage

```bash
pnpm install
pnpm run dgcc
pnpm run dgcc:extreme
DGCC_FIX=1 pnpm run dgcc
bash tools/dgcc/selfheal-wrapper.sh
```

Artifacts: `dgcc-artifacts/`

The `minimal` / `extreme` modes also run `pnpm run check:interact` (GameConfig vs `shared/interaction.ts`).
