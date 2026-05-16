# DGCC

Run the repository-wide Design+Gameplay Consistency Contract gate.

## Usage

```bash
pnpm run dgcc
pnpm run dgcc:extreme
DGCC_FIX=1 pnpm run dgcc
bash tools/dgcc/selfheal-wrapper.sh
```

`minimal` mode builds the server before E2E so `scripts/e2e-webserver.sh` can run `node server/dist/index.js`.

The `unit` step runs `pnpm run test:dgcc` (content validation + `@wasd/shared` tests). Use `DGCC_FULL_UNIT=1` to run the full `pnpm run test` suite instead.

Artifacts: `dgcc-artifacts/`
