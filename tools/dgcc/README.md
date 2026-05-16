# DGCC

Run the repository-wide Design+Gameplay Consistency Contract gate.

## Usage

```bash
pnpm run dgcc
pnpm run dgcc:extreme
DGCC_FIX=1 pnpm run dgcc
```

Artifacts: `dgcc-artifacts/`

Modes and check lists live in `tools/dgcc/dgcc.contract.json`. For interact-radius alignment (GameConfig vs `shared/interaction.ts`), run `pnpm run check:interact` separately.

The `unit` check runs `pnpm run test:dgcc` (client tests plus `validate-content-core`). For the full Vitest suite, use `pnpm run test`.
