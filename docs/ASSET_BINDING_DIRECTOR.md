# Deterministic Asset Binding Director

This document defines how Areloria turns accepted asset manifests into visible `/2d` world graphics without hardcoding sprite paths or inventing client-side gameplay truth.

## Prime rule

```text
Raw image != runtime asset.
Runtime asset != gameplay truth.
Accepted manifest + deterministic binding + /2d proof = visual integration.
```

## Current implementation anchor

The active client-side binding implementation is:

```text
apps/client-2d/src/rendering/AutonomousResonanceRouter.ts
```

It consumes accepted assets from:

```text
apps/client-2d/src/game/stitchAssetManifest.ts
```

and scores them against a logical world vector.

## Data flow

```text
scripts/stitch_atlas_intake.py
→ assets/runtime/stitch/manifest.json
→ apps/client-2d/public/2d-assets/stitch/manifest.json
→ fetchStitchManifest()
→ AutonomousResonanceRouter.loadAssetPool()
→ materializeEntity(worldVector)
→ /2d renderer selects sprite/atlas
```

## Runtime queues

Only accepted assets are runtime candidates.

```text
assets[]         -> accepted runtime assets
manualReview[]   -> tooling/crop/classify queue
referenceOnly[]  -> reference/design/QA only
quarantine[]     -> invalid or unsafe source material
```

Manual-review and reference-only entries must never be rendered as gameplay sprites directly.

## World vector example

```ts
const worldState = {
  baseType: "enemy",
  season: "neutral",
  decayLevel: "none",
  culture: "undead",
  biome: "dungeon",
};

const result = autonomousResonanceRouter.materializeEntity(worldState);
```

Expected output shape:

```ts
{
  assetId: "stitch_enemy_undead_blade_walker_6x6_256",
  path: "/2d-assets/stitch/enemy/...png",
  resonanceScore: 1500,
  matchedVectors: ["baseType", "season", "culture"],
  fallback: false
}
```

## Determinism rules

The router must:

```text
- use integer scores only,
- never call Math.random(), Date.now() or performance.now(),
- never mutate server/gameplay state,
- return fallback for score 0,
- break score ties deterministically by assetId/category/path,
- cache by stable world-state key.
```

## Recommended naming for accepted runtime sheets

Use explicit grid hints when the sheet is truly sliceable:

```text
stitch_enemy_undead_blade_walker_6x6_256.png
stitch_vfx_arelorian_elemental_spell_fx_6x6_256.png
stitch_equipment_overlay_crystal_armor_6x6_256.png
stitch_building_stone_village_house_4x4_256.png
```

Catalog and assembly sources should stay manual-review until cropped into runtime sheets.

## Next `/2d` proof

A complete visual integration should add a debug panel that displays:

```text
accepted asset count
manualReview count
referenceOnly count
quarantine count
sample world vectors
selected assetId
score and matched vectors
preview image/atlas frame
```

This is the bridge from “asset is in the repo” to “asset is visible in the game”.
