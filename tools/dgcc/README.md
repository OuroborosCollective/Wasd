# DGCC

Run the repository-wide Design+Gameplay Consistency Contract gate.

## Usage

```bash
pnpm run dgcc
pnpm run dgcc:extreme
DGCC_FIX=1 pnpm run dgcc
```

Artifacts: `dgcc-artifacts/`

The `unit` step runs `pnpm run test:dgcc`, which executes `tools/dgcc/run-contract-unit.sh` (curated Vitest files that stay green in CI). Use `pnpm run test` for the full server, client, and portal suite.

The `minimal` / `extreme` modes also run `pnpm run check:interact` (GameConfig vs `shared/interaction.ts`).
