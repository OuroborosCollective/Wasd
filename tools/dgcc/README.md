# DGCC

Run the repository-wide Design+Gameplay Consistency Contract gate.

## Usage

```bash
pnpm run dgcc
pnpm run dgcc:extreme
DGCC_FIX=1 pnpm run dgcc
bash tools/dgcc/selfheal-wrapper.sh
```

`minimal` mode runs lint, unit tests, Playwright smoke, content validation, asset folder audit, WebSocket smoke files, and a small HTML accessibility check. `extreme` adds client and server production builds.

Before the first Playwright run on a machine, install browsers once:

```bash
pnpm run test:e2e:install
```

Faster checks without E2E:

```bash
pnpm run ci:verify
```

That runs lint, unit tests, `check:interact` (GameConfig vs `packages/shared/src/utils/interaction.ts`), and content validation.

Artifacts: `dgcc-artifacts/`
