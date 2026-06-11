# Stitch Asset Integration Analysis - 2026-06-11

## Executive Summary

The Stitch intake pipeline now separates runtime-safe assets from catalog and overview material:

```text
accepted       -> runtime manifest assets[]
manual_review  -> catalog / assembly / labeled sheets requiring crop/classify
reference_only -> screenshots / mobile overviews / collection references
quarantine     -> unreadable or invalid source material
```

The next integration target is no longer renaming everything into the main asset manifest. The safer architecture is:

```text
Stitch manifest accepted assets
→ AutonomousResonanceRouter
→ deterministic visual binding
→ /2d preview/proof
```

Manual-review and reference-only entries must stay visible to tooling but must not become gameplay sprites until reprocessed into accepted runtime sheets.

## Current State

### Runtime-safe accepted candidates

Accepted entries from the Stitch manifest may be routed by `AutonomousResonanceRouter` when their category and tags match the world vector.

Examples of desired runtime-safe names:

| Asset ID shape | Category | Frame expectation |
| --- | --- | --- |
| `stitch_enemy_undead_blade_walker_6x6_256` | enemy | 36 frames |
| `stitch_vfx_arelorian_elemental_spell_fx_6x6_256` | vfx | 36 frames |
| `stitch_equipment_overlay_crystal_armor_6x6_256` | equipment_overlay | 36 frames |
| `stitch_tile_swamp_marsh_ground_4x4_128` | tile | 16 frames |

The filename grid token, for example `6x6_256`, is the preferred deterministic hint for 1536×1536 sheets.

### Manual-review candidates

These should not become runtime sprites without human or scripted cropping/classification:

```text
house/building catalogs
NPC modular assembly catalogs
dungeon prop catalogs
multi-action labeled character sheets
mixed biome catalog sheets
```

### Reference-only candidates

These are useful for design, QA, or extraction planning, not runtime rendering:

```text
mobile overview screenshots
asset collection overview screenshots
catalog overview images
```

## Key Integration Fixes Applied

### 1. Intake now knows review states

`scripts/stitch_atlas_intake.py` now emits:

```text
manualReviewCount
referenceOnlyCount
manualReview[]
referenceOnly[]
```

This prevents catalog and overview material from being treated as accepted runtime truth.

### 2. Client Stitch manifest supports manifest-v2

`apps/client-2d/src/game/stitchAssetManifest.ts` supports:

```text
building category
accepted runtime assets
manualReview queue
referenceOnly queue
quarantine queue
manifest stats for all queues
```

The runtime helpers return only accepted assets.

### 3. AutonomousResonanceRouter is the binding path

`apps/client-2d/src/rendering/AutonomousResonanceRouter.ts` loads accepted Stitch assets and scores them against a world vector using integer weights.

Important safety behavior:

```text
score 0 -> fallback, not fake selected asset
tie score -> deterministic assetId ordering
manualReview/referenceOnly assets -> not supplied to runtime pool
```

## Why this is better than merging everything into the main asset manifest

The main manifest has broad filters that intentionally reject sheet/atlas/preview-like entries. Stitch assets are atlas products with their own manifest and frame metadata. Keeping Stitch separate avoids corrupting the main manifest while still allowing game rendering to query accepted Stitch assets.

Correct path:

```text
fetchStitchManifest()
→ manifest.assets only
→ AutonomousResonanceRouter.loadAssetPool(stitchAssets, mainAssets)
→ materializeEntity(worldVector)
→ /2d renderer consumes selected path/atlas
```

Incorrect path:

```text
copy raw catalog image into public assets
→ bypass manifest
→ hardcode sprite path
→ pretend it is runtime-ready
```

## Remaining Next Steps

1. Add a `/2d` debug/preview panel that shows:
   - accepted Stitch assets,
   - manualReview entries,
   - referenceOnly entries,
   - selected resonance binding for sample world vectors.

2. Wire the renderer to ask the router for specific entity classes:
   - enemy visual,
   - vfx visual,
   - building visual,
   - prop visual.

3. Add an asset extraction pass for manual-review catalog sheets:
   - crop catalog panels,
   - rename with explicit grid hints,
   - run intake again,
   - accept only validated runtime sheets.

4. Keep docs and wiki updated once `/2d` proof exists.

## ARE Safety Rule

```text
Raw image != runtime asset.
Runtime asset != gameplay truth.
Accepted manifest + deterministic binding + /2d proof = visual integration.
```
