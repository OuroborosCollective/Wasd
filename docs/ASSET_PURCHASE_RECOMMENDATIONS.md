# Asset Purchase Recommendations for Areloria

This document outlines recommended asset packs to address current gaps in our visual coverage.

## Priority Asset Categories

### 1. NPC Characters

| Missing Tags | Recommended Packs |
|--------------|------------------|
| guard, soldier | Human Pack (RPG Character Pack) |
| merchant, trader | Merchant/Vendor Character Set |
| healer, priest | Cleric/Healer Character Pack |
| blacksmith | Craftsman Character Set |
| noble, lord | Royal/Noble Character Pack |
| child, kid | Child/Youth Character Pack |
| archer, ranger | Ranger/Archer Character Pack |

**Recommended Sources:**
- **itch.io**: RPG Character Pack, Fantasy RPG Character Mega Pack
- **GraphicRiver**: Isometric RPG Character Sets
- **Kenney.nl**: Free character assets (Public Domain)

### 2. Buildings & Structures

| Missing Tags | Recommended Packs |
|--------------|------------------|
| house, hut | Isometric House Pack, Medieval Building Kit |
| inn, tavern | Fantasy Town Kit, Medieval Buildings |
| workshop | Crafting Building Pack |
| warehouse | Storage Building Set |
| guard_post, watch_tower | Defensive Structures Pack |
| castle | Castle/Fortification Mega Pack |
| church, temple | Religious Building Pack |

**Recommended Sources:**
- **itch.io**: Isometric City Builder, Medieval Building Kit, Fantasy Town Kit
- **GraphicRiver**: Isometric Buildings Collection
- **Kenney.nl**: Abstract Platformer Pack (has basic buildings)

### 3. Biome Environment Tiles

| Missing Tags | Recommended Packs |
|--------------|------------------|
| snow, frozen | Winter/Arctic Environment Pack |
| swamp, marsh | Swamp/Wetland Tile Set |
| desert, sand | Desert Environment Pack |
| mountain, rocky | Mountain/Highland Tile Set |
| coastal, beach | Beach/Coastal Tile Set |

**Recommended Sources:**
- **itch.io**: Seasonal Biome Packs, Environment Tile Sets
- **GraphicRiver**: Isometric Nature Packs
- **Kenney.nl**: Seasonal Tilesets (winter, desert, etc.)

## Recommended Asset Sources

### Free Options (Public Domain / CC0)

| Source | URL | Content Types |
|--------|-----|---------------|
| Kenney.nl | https://kenney.nl/assets | Characters, buildings, tiles, props, UI |
| OpenGameArt | https://opengameart.org | Community-created game assets |
| LibreGameArt | https://libregameart.org | Historical/public domain game art |

### Paid Options (Recommended)

| Source | URL | Style | Price Range |
|--------|-----|-------|-------------|
| itch.io | https://itch.io/game-assets | Indie, RPG, Fantasy | $5-50/pack |
| GraphicRiver | https://graphicriver.net | Isometric, Pixel Art | $10-100/pack |
| GameDevMarket | https://gamedevmarket.net | Professional assets | $15-75/pack |
| Unity Asset Store | https://assetstore.unity.com | 3D and 2D | Free-$100 |
| Unreal Marketplace | https://unrealengine.com/marketplace | 3D assets | Free-$100 |

## Prioritized Shopping List

### High Priority (Essential for MVP)

1. **RPG Character Pack** - $15-25
   - Contains: guard, soldier, merchant, healer, blacksmith, noble
   - Style: Isometric, consistent with existing assets
   
2. **Isometric Building Kit** - $20-35
   - Contains: house, inn, workshop, warehouse, guard_post
   - Style: Match to GraphicRiver isometric style
   
3. **Medieval Environment Pack** - $15-25
   - Contains: biome tiles (grass, stone), roads, paths
   - Style: Isometric, 2D

### Medium Priority (Enhance Visuals)

4. **Winter/Snow Tile Set** - $10-20
5. **Desert/Wasteland Tile Set** - $10-20
6. **Castle/Fortification Pack** - $20-30
7. **Child/Youth NPC Pack** - $10-15

### Low Priority (Nice to Have)

8. Swamp/Wetland tiles - $10-15
9. Mountain/Highland tiles - $10-15
10. Coastal/Beach tiles - $10-15

## Budget Estimate

| Priority | Cost Range |
|----------|------------|
| High Priority | $50-85 |
| All Priority | $115-175 |
| Complete Coverage | $200-300 |

## Asset Style Guidelines

When purchasing assets, ensure they match:

1. **Style**: Isometric, pixel art, consistent tile size (64x64 or 128x128)
2. **Color Palette**: Warm medieval tones, avoid neon or modern styles
3. **Consistency**: Buy from same artist/pack for visual consistency
4. **Format**: PNG with transparency preferred
5. **Animation**: Character sprites should have walk/idle animations

## Checkout Process

1. Create account on preferred source (itch.io recommended)
2. Purchase high-priority packs first
3. Download and extract to `.asset-inbox/` directory
4. Run import script: `node scripts/import-forest-biome-pack.mjs <pack.zip>`
5. Tag assets: `node scripts/auto-tag-manifest.mjs`
6. Review in client-2d before committing

## Verification Checklist

Before purchasing, verify:
- [ ] Asset style matches existing isometric assets
- [ ] License allows commercial use
- [ ] PNG format with transparency
- [ ] Consistent tile size with existing assets
- [ ] No watermarks or attribution required in-game