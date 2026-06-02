# Cozy Spring Import Policy

Source: https://sakpix.itch.io/cozy-spring-asset-pack-top-down-pixel-art-tileset-300-assets

The purchased SakPix Cozy Spring pack is a top-down pixel-art tileset pack with 300+ real assets. Runtime must not treat every occupied 32x32 cell from a large sheet as a complete world prop.

## Correct usage

- Terrain sheets may be used as tile sources.
- Real prop PNGs from the nested category ZIPs may be used as prop objects.
- Full object PNGs should be imported through `scripts/batch-import-cozy-spring.mjs`.
- Each imported prop entry must include `meta.usableAsProp: true` and `meta.fragmentOnly: false`.

## Forbidden usage

- Do not render arbitrary 32x32 sheet fragments as large props.
- Do not use white/pink matte filler cells as world props.
- Do not claim the pack has 21,940 finished props. That number came from a grid-slice over occupied cells and is not the finished-asset count.

## Inbox layout

The importer supports `.asset-inbox/cozy-spring` containing container ZIPs. It recursively extracts nested ZIPs and imports PNG files from the real category folders.

## Output

`apps/client-2d/public/assets/cozy-spring/manifest.json`

The manifest contains `tilesets`, `props`, and `entries` maps compatible with the client `AssetManifest` loader.
