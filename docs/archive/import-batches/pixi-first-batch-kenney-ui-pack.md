# Pixi Import Batch: kenney-ui-pack

This is the first real Pixi asset import batch stub for WASD / Arelorian.

No binary assets are imported in this stub.

## Batch identity

- Batch name: pixi-first-batch-kenney-ui-pack
- Date: 2026-05-28
- Author / agent: Arelorian asset pipeline
- Pull request: TBD

## Asset packs

| Pack ID | Source URL | License | Allowlisted | Source verified |
| --- | --- | --- | --- | --- |
| kenney-ui-pack | https://kenney.nl/assets/ui-pack | CC0 | yes | yes |

## Target folders

| Pack ID | Target folder |
| --- | --- |
| kenney-ui-pack | apps/client-2d/public/2d-assets/ui/kenney-ui-pack |

## Imported runtime files

No runtime binary files imported yet.

```txt
TBD
```

## Manifest files

```txt
apps/client-2d/public/2d-assets/manifests/pixi-dev-hub-first-batch.json
apps/client-2d/public/2d-assets/manifests/pixi-dev-hub-import-plan.json
```

## Credit files

```txt
apps/client-2d/public/2d-assets/credits/kenney-ui-pack.json
```

## Commands executed

Planned command sequence:

```bash
pnpm assets:pixi:scan-inbox
pnpm assets:pixi:plan
pnpm assets:pixi:prepare
pnpm assets:pixi:validate
```

## CI status

- [ ] Pixi asset workflow passed.
- [ ] No validator errors.
- [ ] No inbox scanner errors.

## Visual-only confirmation

- [x] Imported assets are visual/audio/UI content only.
- [x] No gameplay state is defined by sprite placement.
- [x] No asset manifest creates server-authoritative state.

## Core safety confirmation

- [x] `WorldTick` unchanged.
- [x] `AREKernel` unchanged.
- [x] Server registries unchanged.
- [x] Networking handlers unchanged.
- [x] No unrelated engine files changed.

## Archive safety confirmation

- [x] No `.zip` files committed to runtime asset folders.
- [x] No `.rar` files committed to runtime asset folders.
- [x] No `.7z` files committed to runtime asset folders.
- [x] All future imported files must come from the allowlisted source URL.

## Next step

Use this batch document when the actual normalized UI files are imported.

The binary import must remain blocked until:

1. the official source download is performed outside runtime folders,
2. files are staged in `.asset-inbox/pixi`,
3. files are normalized into the target folder,
4. credits and manifests are generated,
5. `pnpm assets:pixi:validate` passes.
