# DGCC

Run the repository-wide Design+Gameplay Consistency Contract gate.

## Usage

```bash
pnpm run dgcc
pnpm run dgcc:extreme
DGCC_FIX=1 pnpm run dgcc
```

Artifacts: `dgcc-artifacts/`

Modes also run `pnpm run check:interact` (GameConfig vs `shared/interaction.ts`). Playwright e2e starts the compiled server (`server/dist`) and expects a built client (`client/dist`), so DGCC runs `clientBuild` and `serverBuild` **before** `e2e`.

Self-heal (fixes on, extreme by default): `bash tools/dgcc/selfheal-wrapper.sh`
