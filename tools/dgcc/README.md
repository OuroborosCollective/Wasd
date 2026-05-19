# DGCC

Run the repository-wide Design+Gameplay Consistency Contract gate.

## Usage

```bash
pnpm run dgcc
pnpm run dgcc:extreme
DGCC_FIX=1 pnpm run dgcc
```

Artifacts: `dgcc-artifacts/`

First-time E2E (Playwright browser install): `pnpm run test:e2e:install`

Interact distance consistency (optional, not part of the default contract): `pnpm run check:interact`
