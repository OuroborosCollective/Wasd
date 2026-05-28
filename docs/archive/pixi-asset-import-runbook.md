# Pixi Asset Import Runbook

This runbook defines the safe staged workflow for importing Pixi/2D assets into the WASD / Arelorian client.

## Authority rule

Assets are visual-only. They must never define authoritative gameplay state.

Authoritative gameplay remains owned by:

- `WorldTick`
- `AREKernel`
- server registries
- networking handlers

## Safe import flow

1. Place downloaded asset files in `.asset-inbox/pixi` only.
2. Run `pnpm assets:pixi:scan-inbox`.
3. Resolve every scanner error before continuing.
4. Run `pnpm assets:pixi:plan`.
5. Confirm source metadata and download allowlist are consistent.
6. Run `pnpm assets:pixi:prepare`.
7. Normalize files into the correct `apps/client-2d/public/2d-assets` target folder.
8. Ensure every imported pack has a generated credit JSON.
9. Ensure every runtime asset is represented by a manifest entry.
10. Run `pnpm assets:pixi:validate`.
11. Commit only normalized runtime assets, manifests and credits.

## Hard rules

- Do not commit raw `.zip`, `.rar` or `.7z` files into runtime asset folders.
- Do not import from mirrored or unknown download sources.
- Do not import packs with `sourceVerified=false`.
- Do not bypass the download allowlist.
- Do not add gameplay logic to asset manifests.
- Do not let sprite placement create server-authoritative state.
- Do not change `WorldTick`, `AREKernel`, networking or server registries during asset-only PRs.

## Required commands

```bash
pnpm assets:pixi:scan-inbox
pnpm assets:pixi:plan
pnpm assets:pixi:prepare
pnpm assets:pixi:validate
```

## CI expectation

The Pixi asset workflow runs the safety chain:

```bash
pnpm assets:pixi:scan-inbox
pnpm assets:pixi:plan
pnpm assets:pixi:validate
```

`prepare` is intentionally not run in CI because it writes generated planning files and placeholders.

## Agent instructions

When an AI or no-code agent works on Pixi assets, it must:

1. Read this runbook first.
2. Read `public/archive/wasd-pixi-asset-packs.json`.
3. Read `docs/archive/pixi-first-batch-source-metadata.json`.
4. Read `docs/archive/pixi-first-batch-download-allowlist.json`.
5. Refuse to import unverified packs.
6. Keep all imported content visual-only.
7. Produce a small PR with no unrelated engine changes.

## First-batch status

The first batch is controlled by:

- `public/archive/wasd-pixi-asset-packs.json`
- `docs/archive/pixi-first-batch-source-metadata.json`
- `docs/archive/pixi-first-batch-download-allowlist.json`

`pixel-prototype-player` remains blocked until its exact official source URL is verified.

## Commit checklist

Before opening a PR, confirm:

- [ ] Inbox scanner passes.
- [ ] Dry-run plan passes.
- [ ] Validator passes.
- [ ] No raw archives are committed.
- [ ] Credits exist for imported packs.
- [ ] Manifests reference imported runtime assets.
- [ ] No server-authoritative gameplay files changed.
