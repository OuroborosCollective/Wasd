# Pixi Asset Import Batch Template

Use this template for every real Pixi/2D asset import batch.

## Batch identity

- Batch name:
- Date:
- Author / agent:
- Pull request:

## Asset packs

| Pack ID | Source URL | License | Allowlisted | Source verified |
| --- | --- | --- | --- | --- |
|  |  |  |  |  |

## Target folders

| Pack ID | Target folder |
| --- | --- |
|  |  |

## Imported runtime files

List normalized runtime files only. Do not list raw archives.

```txt
apps/client-2d/public/2d-assets/...
```

## Manifest files

```txt
apps/client-2d/public/2d-assets/manifests/...
```

## Credit files

```txt
apps/client-2d/public/2d-assets/credits/...
```

## Commands executed

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

- [ ] Imported assets are visual/audio/UI content only.
- [ ] No gameplay state is defined by sprite placement.
- [ ] No asset manifest creates server-authoritative state.

## Core safety confirmation

- [ ] `WorldTick` unchanged.
- [ ] `AREKernel` unchanged.
- [ ] Server registries unchanged.
- [ ] Networking handlers unchanged.
- [ ] No unrelated engine files changed.

## Archive safety confirmation

- [ ] No `.zip` files committed to runtime asset folders.
- [ ] No `.rar` files committed to runtime asset folders.
- [ ] No `.7z` files committed to runtime asset folders.
- [ ] All imported files came from the allowlisted source URLs.

## Notes

Add any conversion, renaming, atlas-generation or compression notes here.
