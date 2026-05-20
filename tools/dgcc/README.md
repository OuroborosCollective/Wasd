# DGCC

Run the repository-wide Design+Gameplay Consistency Contract gate. Modes and checks live in `dgcc.contract.json`; each run writes `dgcc-artifacts/dgcc.report.json` plus per-step logs.

## Prerequisites

- One-time Playwright browser install (or let the e2e step install Chromium on each run):

```bash
pnpm run test:e2e:install
```

## Usage

```bash
pnpm run dgcc
pnpm run dgcc:extreme
DGCC_FIX=1 pnpm run dgcc
bash tools/dgcc/selfheal-wrapper.sh
```

The self-heal wrapper defaults to `DGCC_MODE=extreme` and `DGCC_FIX=1` so optional contract-driven fixes (for example empty model subfolders) apply.

Artifacts: `dgcc-artifacts/` (gitignored).

The `unit` check runs `pnpm run test:dgcc` (shared package tests, core-logic workspace, and a small set of server contract tests). Use `pnpm run test` for the full Vitest suite.

`extreme` mode runs the same checks as `minimal`, then `serverBuild` (no bundled client Vite step in the default contract, so DGCC stays green without optional workspace packages). For a full client production bundle, run `pnpm --prefix client run build` when your environment has all client dependencies.

## Optional checks

Add entries such as `checkInteract` to `modes.*.checks` in `dgcc.contract.json` to run `pnpm run check:interact` (server `GameConfig.interactDistance` vs `@wasd/shared` `INTERACT_DISTANCE`).
