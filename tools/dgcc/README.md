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

`extreme` additionally runs `pnpm run audit:model-paths` after client and server builds (same gate as `ci:verify`).

Optional self-heal entrypoint (enables fixes by default): `bash tools/dgcc/selfheal-wrapper.sh`
