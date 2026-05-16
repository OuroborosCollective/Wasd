# DGCC

Run the repository-wide Design+Gameplay Consistency Contract gate.

## Usage

```bash
pnpm run dgcc
pnpm run dgcc:extreme
DGCC_FIX=1 pnpm run dgcc
bash tools/dgcc/selfheal-wrapper.sh
```

E2E uses Playwright Chromium. Install browsers once (CI images should cache this):

```bash
pnpm run test:e2e:install
```

The `unit` check runs `pnpm run test:dgcc` (client unit tests plus server content validation tests). For the full Vitest suite, use `pnpm run test`.

Artifacts: `dgcc-artifacts/`
