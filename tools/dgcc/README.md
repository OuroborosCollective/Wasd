# DGCC

Run the repository-wide Design+Gameplay Consistency Contract gate.

## Usage

```bash
pnpm run dgcc
pnpm run dgcc:extreme
DGCC_FIX=1 pnpm run dgcc
```

Artifacts: `dgcc-artifacts/`

The `unit` check runs `pnpm run test:dgcc` (fast content + login contract slice). For the full Vitest suite, run `pnpm run test`.

Optional: run `pnpm run check:interact` locally to verify `GameConfig.interactDistance` matches `shared/interaction.ts`.
