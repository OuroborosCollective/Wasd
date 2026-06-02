# Cozy Spring Import Policy

Source: https://sakpix.itch.io/cozy-spring-asset-pack-top-down-pixel-art-tileset-300-assets

The purchased SakPix Cozy Spring pack is a top-down pixel-art tileset pack with 300+ real assets. Runtime must not treat every occupied 32x32 cell from a large sheet as a complete world prop.

## Import policy: "tilesets-as-tiles-props-as-extracted-objects"

### Extraction pipeline
- The Python script `scripts/extract-cozy-spring-objects.py` replaces `batch-import-cozy-spring.mjs`.
- It recursively unpacks nested ZIPs from `.asset-inbox/cozy-spring`.
- For each PNG sheet it detects the category and determines whether to treat it as a tileset or prop source.
- Tileset sheets are copied directly into `tilesets/` as tile sources.
- Prop sheets are processed by the **connected-components alpha mask extractor**:
  1. Build 2D occupancy mask from RGBA pixels (alpha > 8, reject near-white matte filler).
  2. 8-neighbour BFS to find connected component bounding boxes.
  3. Reject fragments with bounding-box area < 20 px² or w/h < 4 px.
  4. Reject giant components that occupy ≥ 95 % of the sheet.
  5. Merge nearby components (≤ 4 px apart) to keep object parts together.
  6. Extract each component as a padded PNG and write a manifest entry.
- Output: `apps/client-2d/public/assets/cozy-spring/manifest.json` (v3) with `tilesets`, `props`, `entries` maps.

### Correct usage
- Entries with `meta.usableAsTile === true` are tile sources (from tileset sheets).
- Entries with `meta.usableAsProp === true` and `meta.fragmentOnly === false` are individual prop objects (extracted sprites).
- `runtimeRole === 'propObject'` marks entries from connected-components extraction.
- `runtimeRole === 'tileSource'` marks original tileset sheets.

### Forbidden usage
- Do not render entire prop sheets as props (sheets must be extracted → individual sprites).
- Do not render arbitrary 32x32 sheet fragments as large props.
- Do not use white/pink matte filler cells as world props.
- Do not claim the pack has 21,940 finished props. That number came from a grid-slice over occupied cells and is not the finished-asset count.
- Entries with `meta.usableAsTile === true` must not be used as world props.
- Entries with `meta.fragmentOnly === true` must not be rendered as world props.

## Runtime binder guards
Updated `AssetBindingDirector` / `WorldPlanAssetBinder`:
- Prop candidates from Cozy Spring `props` map MUST pass:
  - `entry.meta?.usableAsProp === true`
  - `entry.meta?.fragmentOnly === false`
- Entries from tilesets with `meta.usableAsTile === true` are excluded from prop binding.
- Entries with bad term patterns in `src`/`id` remain filtered via `isBadRuntimeSheetEntry`.

## Workflow integration
- `.github/workflows/vps-docker-deploy.yml` installs `pip install pillow` before the import step.
- When `.asset-inbox/cozy-spring` exists on the runner, it runs the Python extraction and validates the manifest.
- Manifest must be present in `/2d/assets/cozy-spring/manifest.json` after deploy (validated by health check).
