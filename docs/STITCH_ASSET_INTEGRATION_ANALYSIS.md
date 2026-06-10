# Stitch Asset Integration Analysis - 2026-06-10

## Executive Summary

The new deterministic Stitch assets from the June 2026 manual drop are **available in the client manifest** but face **integration challenges** with the existing asset binding system. Three assets contain "sheet" in their filename which would trigger the `isBadRuntimeSheetEntry` filter if they were added to the main `AssetManifest`.

## Current State

### New Stitch Assets (5 total - all accepted)

| Asset ID | Category | Frames | Filename Issue |
|----------|----------|--------|----------------|
| `stitch_enemy_undead_blade_walker_square_sheet` | enemy | 36 | ⚠️ contains "sheet" |
| `stitch_equipment_overlay_crystal_armor_modular_sheet` | equipment_overlay | 36 | ⚠️ contains "sheet" |
| `stitch_npc_eldritch_modular_gothic_assembly_catalog` | npc | 36 | ✅ clean |
| `stitch_prop_eldritch_modular_gothic_dungeon_assets_catalog` | prop | 36 | ✅ clean |
| `stitch_vfx_arelorian_elemental_spell_fx_square_sheet` | vfx | 36 | ⚠️ contains "sheet" |

## Hardcoded Design Elements Found

### 1. Sample Asset IDs (stitchAssetManifest.ts:82-85)

```typescript
const SAMPLE_ENEMY_ID = "stitch_enemy_skeleton_warrior";
const SAMPLE_TILE_ID = "stitch_tile_crypt_floor";
const SAMPLE_VFX_ID = "stitch_vfx_magic_burst";
const SAMPLE_PROP_ID = "stitch_prop_infernal_gate";
```

**Status**: ✅ OK - Has fallback logic to `getFirstAssetByCategory()` if exact ID not found.

### 2. NPC Flow Sprites (gameAssetsManifest.ts:68-163)

Hardcoded 14 specific character sprites for game classes:
- warrior, mage, archer, rogue, cleric, ranger, paladin, necromancer, berserker, bard

**Status**: ✅ OK - These are specific game character classes, NOT generic NPC sprites. The new Stitch assets are modular assembly catalogs, not character replacements.

### 3. Loot Visual Mapping (LootRenderer.ts:77-97)

```typescript
private readonly VISUAL_SPRITES: Record<string, string> = {
  weapon_base_0: "loot_dagger",
  // ... etc
};
```

**Status**: ✅ OK - Separate loot icon system, not related to Stitch assets.

### 4. Asset Fallback Chains (AssetFallbackChains.ts)

NPC fallback chains use generic tags like "guard", "soldier", "civilian". The new Stitch NPC asset (`stitch_npc_eldritch_modular_gothic_assembly_catalog`) won't match these tags.

**Status**: ⚠️ NEEDS ATTENTION - Fallback chains need updating for new asset categories.

### 5. Main Manifest Filtering (assetManifest.ts:270-293)

The `isBadRuntimeSheetEntry()` function filters out assets containing "sheet", "atlas", "preview" etc. 

**Status**: ⚠️ BLOCKS INTEGRATION - 3 of 5 new Stitch assets contain "sheet" in filename.

## Recommended Fixes

### Fix 1: Update Filename Convention for Stitch Assets

Rename files to avoid "sheet" in filename:
- `stitch_enemy_undead_blade_walker_square_sheet.jpg` → `stitch_enemy_undead_blade_walker_square.jpg`
- `stitch_equipment_overlay_crystal_armor_modular_sheet.png` → `stitch_equipment_overlay_crystal_armor_modular.png`
- `stitch_vfx_arelorian_elemental_spell_fx_square_sheet.png` → `stitch_vfx_arelorian_elemental_spell_fx_square.png`

### Fix 2: Extend Fallback Chains for Stitch Assets

Add Stitch-specific tags to NPC/Enemy/Prop fallback chains:

```typescript
// In AssetFallbackChains.ts
export const NPC_FALLBACK_CHAINS: Record<NpcRole, readonly string[]> = {
  // ... existing chains
  // Add Stitch-specific patterns
};

// Add enemy fallback chain for Stitch assets
export const ENEMY_FALLBACK_CHAINS = {
  undead: ["undead", "skeleton", "zombie", "enemy"],
  blade_walker: ["blade_walker", "undead", "enemy"],
  // ...
};
```

### Fix 3: Integrate Stitch Manifest into Main Asset System

Option A: Merge Stitch manifest into main `AssetManifest`:
```typescript
// In loadAssetManifest() - add Stitch assets
const stitchManifest = await fetchStitchManifest();
if (stitchManifest) {
  // Convert StitchRuntimeAsset[] to AssetEntry[] and merge
}
```

Option B: Keep separate but add binding hooks:
- Add `getStitchAssetByCategory()` to world rendering
- Use Stitch assets for specific entity types (enemies, VFX)

## Current Architecture: Separate Pipelines

The codebase has **two parallel asset systems**:

1. **Main Asset System** (`assetManifest.ts`, `AssetBindingDirector.ts`)
   - Loads: `/2d-assets/manifest.json`, cozy-spring, graphicriver, etc.
   - Used for: tiles, props, buildings, characters, weapons
   - Filter: `isBadRuntimeSheetEntry()` blocks "sheet" filenames

2. **Stitch Asset System** (`stitchAssetManifest.ts`)
   - Loads: `/2d-assets/stitch/manifest.json`
   - Used for: StitchAssetPreviewPanel only
   - No filtering based on filename

**The Stitch system is designed as a separate pipeline** - it doesn't interfere with the main asset system, but also doesn't integrate with it.

## Next Steps

1. **Rename files** to remove "sheet" from filenames (or update isBadRuntimeSheetEntry to allow stitch_ prefixed)
2. **Update re-import script** to strip "sheet" from future Stitch assets
3. **Decide integration strategy**: Merge pipelines or keep separate
4. **Add VFX/Enemy rendering** using Stitch manifest for game entities

## Conclusion

The new Stitch assets are **not blocked by hardcoded design** - they have a separate pipeline. However, to use them in actual game rendering (enemies, VFX, equipment overlays), the Stitch manifest needs to be integrated into the main asset binding system, or the game rendering code needs to specifically query the Stitch manifest.

The `isBadRuntimeSheetEntry` filter in the main manifest would block 3 of 5 new assets if they were added to the main manifest - this needs to be fixed either by renaming files or updating the filter to allow `stitch_` prefixed assets.