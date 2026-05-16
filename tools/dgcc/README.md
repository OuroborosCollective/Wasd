# DGCC

Run the repository-wide Design+Gameplay Consistency Contract gate.

## Usage

```bash
pnpm run dgcc
pnpm run dgcc:extreme
DGCC_FIX=1 pnpm run dgcc
```

Artifacts: `dgcc-artifacts/`

`minimal` mode runs lint, interact-distance check, Playwright smoke, content validation, and static audits. It does **not** run the Vitest suite (use `pnpm run test` or `pnpm run ci:verify` for that). `extreme` includes unit tests and client/server builds.
