# WASD Asset Tagging Skill

## Overview

This skill guides AI agents through the asset tagging workflow for Areloria's isometric 2D client. It ensures consistent semantic tagging across all imported assets.

## Quick Reference

### Tag Categories

| Category | Tags | Usage |
|----------|------|-------|
| **Semantic Type** | `building`, `npc`, `prop`, `tile`, `ui`, `character` | Primary classification |
| **Building Subtype** | `house`, `tower`, `inn`, `blacksmith`, `warehouse`, `castle` | Buildings only |
| **NPC Role** | `guard`, `merchant`, `healer`, `soldier`, `noble` | NPCs only |
| **Prop Type** | `tree`, `rock`, `bush`, `chest`, `fence`, `sign` | Props only |
| **Biome** | `forest`, `desert`, `snow`, `swamp`, `mountain`, `coastal` | Environment context |
| **Culture** | `nordic`, `imperial`, `tribal`, `arcane`, `desert`, `tropical` | Visual style |
| **Source** | `graphicriver`, `kenney`, `pipoya`, `assetpack01` | Asset origin |

### Required Tags for Each Asset

Every asset must have at minimum:
- `semantic_type`: building | npc | prop | tile | ui
- `biome`: One of the biome tags
- `source`: Origin source

## Asset Tagging Workflow

### 1. Import Phase

When importing new assets:

```bash
# Import from ZIP
node scripts/import-forest-biome-pack.mjs <asset-pack.zip>

# Auto-tag after import
node scripts/auto-tag-manifest.mjs
```

### 2. Manual Tagging

For manual tagging, update the asset manifest:

```json
{
  "id": "gr_iso_2_towers_cannon_tower_png",
  "src": "/2d/assets/buildings/tower.png",
  "kind": "tower",
  "group": "defensive",
  "tags": ["building", "tower", "defensive", "military", "isometric"],
  "biomeTags": ["forest", "plains"],
  "cultureTags": ["generic"],
  "source": "GraphicRiver"
}
```

### 3. Pattern Recognition

The system automatically recognizes these patterns:

| Pattern | Auto-Generated Tags |
|---------|---------------------|
| `*_tower*` | tower, defensive, military |
| `*_house*` | house, residential |
| `*_guard*` | guard, soldier, military |
| `*_merchant*` | merchant, trader, commerce |
| `gr_iso_*` | graphicriver, isometric, pixel-art |
| `*_snow*` | snow, winter, frozen |
| `*_forest*` | forest, woodland, green |

## Fallback Chains

When exact tag match fails, the system falls back through these chains:

### Buildings
```
tower → military_tower → defensive → building
house → hut → residential → building
inn → tavern → pub → social → building
```

### NPCs
```
guard → soldier → warrior → human → npc
merchant → trader → shopkeeper → commerce → npc
```

## Common Tasks

### Tag a new building asset

1. Identify the building type from filename
2. Add semantic tags: `building`, `<type>`, `isometric`
3. Add biome tags based on context
4. Verify fallback chain exists in `AssetFallbackChains.ts`

### Tag a new NPC asset

1. Identify NPC role from filename
2. Add semantic tags: `npc`, `<role>`, `character`
3. Add culture tags for visual style
4. Verify NPC fallback chain exists

### Add a new fallback chain

Edit `apps/client-2d/src/world/AssetFallbackChains.ts`:

```typescript
// For buildings
BUILDING_FALLBACK_CHAINS.myBuilding = ["my_building", "house", "building"];

// For NPCs  
NPC_FALLBACK_CHAINS.myRole = ["my_role", "civilian", "npc"];

// Or for GraphicRiver-specific patterns
GRAPHICRIVER_BUILDING_FALLBACKS.my_variant = ["my_variant", "building"];
```

## Score Weights

When binding assets, the scoring system uses these weights:

| Factor | Weight | Description |
|--------|--------|-------------|
| exactKind | 100 | Tag matches requested kind exactly |
| exactGroup | 50 | Group matches semantic type |
| patternMatch | 25 | Asset ID contains requested keyword |
| matchingTag | 15 | Tags overlap with query |
| sourceMatch | 20 | Recognized source (GraphicRiver, Kenney) |
| biomeTag | 20 | Biome context matches |
| isoMatch | 15 | Isometric style detected |

## GraphicRiver Asset Handling

GraphicRiver assets follow this naming pattern:
```
gr_iso_<count>_<category>_<variant>_<state>_<index>
```

Example: `gr_iso_2_towers_cannon_tower_png_lvl_1_cannon_attack_e_1`

Extract tags using:
```typescript
import { extractGraphicRiverVariant, isGraphicRiverAsset } from './AssetFallbackChains';

// Check if asset is from GraphicRiver
isGraphicRiverAsset("gr_iso_2_towers_cannon_tower_png") // true

// Extract variant name
extractGraphicRiverVariant("gr_iso_2_towers_cannon_tower_png") // "tower"
```

## SakPix Cozy Spring Asset Pack

Special handling for SakPix top-down pixel art tiles:
- Source: `SakPix_Cozy_Spring`
- Style tags: `cozy`, `spring`, `top-down`, `pixel-art`, `32x32`
- Category mapping automatic in `scripts/batch-import-cozy-spring.mjs`

Import command:
```bash
# Place ZIPs in .asset-inbox/cozy-spring/
# Then run:
node scripts/batch-import-cozy-spring.mjs
```

## Quality Checklist

Before committing tagged assets:
- [ ] All assets have minimum 3 tags
- [ ] Biome tags are accurate for the environment
- [ ] Fallback chains exist for all types
- [ ] No duplicate entries (check SHA256)
- [ ] Manifest validates (run `node scripts/validate-pixi-assets.mjs`)
- [ ] Assets render correctly in client-2d

## Troubleshooting

### Asset not binding to expected type

1. Check if tag exists in manifest
2. Verify fallback chain has the type
3. Add `patternMatch` scoring weight in `AssetBindingDirector.ts`
4. Run debug mode: `createAssetBindingDirector(manifest, true)`

### Duplicate entries appearing

1. Run deduplication: `node scripts/auto-tag-manifest.mjs`
2. Check SHA256 hash conflicts
3. Manually remove duplicate manifest entries

### Missing fallback for new type

1. Add to appropriate chain in `AssetFallbackChains.ts`
2. Rebuild manifest: `node scripts/auto-tag-manifest.mjs`
3. Test binding with debug mode enabled