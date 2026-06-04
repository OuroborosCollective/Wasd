# Cozy Asset Director Workflow Guide

## Overview

This guide explains how to use the **Cozy Asset Director** workflow for integrating Stitch-generated game assets into Arelorian's 2D client. The workflow enables auto-cropping and seamless live game integration.

---

## 🎯 Asset Categories

| Category | Description | Source | Target Directory |
|----------|-------------|--------|------------------|
| **models** | Character sprites, NPC animations | Stitch character sheets | `/2d-assets/game-assets/models/` |
| **effects** | Skill particles, combat FX | Stitch fx/particle sheets | `/2d-assets/game-assets/effects/` |
| **biomes** | Environment terrain tiles | Stitch biome/ground sheets | `/2d-assets/game-assets/biomes/` |
| **symbols** | UI icons, item graphics | Stitch icon/symbol sheets | `/2d-assets/game-assets/symbols/` |
| **weather** | Weather overlays, particles | Stitch weather sheets | `/2d-assets/game-assets/weather/` |

---

## 🚀 Quick Start

### 1. Generate Assets in Stitch

1. Open [Arelorian project](https://stitch.withgoogle.com/projects/5320982353793182486)
2. Create/select screen with game asset sprites
3. Export as PNG sprite sheet
4. Include corresponding JSON atlas metadata

### 2. Upload to GitHub Issue

1. Create or update GitHub issue (default: #1071)
2. Attach ZIP file containing:
   - PNG sprite sheets
   - JSON atlas metadata
   - (Optional) README with asset descriptions

### 3. Run Import Script

```bash
# Full import
node scripts/stitch-game-assets-importer.mjs

# Dry-run (verify without importing)
node scripts/stitch-game-assets-importer.mjs --dry-run

# With custom issue number
ISSUE_NUMBER=1080 node scripts/stitch-game-assets-importer.mjs
```

### 4. Auto-Crop with Cozy Asset Director

After import, use the Cozy Asset Director in-game or via admin panel:

```
/cozy-director --category=models --auto-crop --verify
/cozy-director --category=effects --frame=64x64
/cozy-director --category=biomes --tile-size=64
```

---

## 📁 Directory Structure

```
apps/client-2d/public/2d-assets/
├── manifest.json                    # Main asset manifest
├── stitch/                          # Stitch UI screens
├── game-assets/
│   ├── manifest.json               # Game assets manifest
│   ├── models/                     # Character/NPC sprites
│   │   ├── stitch_models_samurai/
│   │   │   ├── stitch_models_samurai.png
│   │   │   └── stitch_models_samurai.json
│   │   └── ...
│   ├── effects/                    # Combat/skill FX
│   ├── biomes/                     # Terrain tiles
│   ├── symbols/                    # UI icons
│   └── weather/                    # Weather overlays
└── credits/
    └── stitch-game-assets-provenance.md
```

---

## 🔧 Import Script Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `GITHUB_TOKEN` | GitHub API token | Required |
| `GITHUB_REPOSITORY` | Repository name | `Arelorian/Ouroboros` |
| `ISSUE_NUMBER` | Issue with asset ZIPs | `1071` |
| `STITCH_API_KEY` | Stitch MCP key (optional) | Not used |

### Category Detection

The importer uses pattern matching to detect asset categories:

```javascript
const CATEGORIES = {
  models: {
    patterns: ['character', 'npc', 'samurai', 'guard', 'hero'],
    tags: ['character', 'npc', 'sprite', 'animation'],
  },
  effects: {
    patterns: ['effect', 'fx', 'particle', 'spell', 'magic', 'slash'],
    tags: ['fx', 'particle', 'magic', 'combat'],
  },
  biomes: {
    patterns: ['biome', 'terrain', 'ground', 'forest', 'desert'],
    tags: ['terrain', 'environment', 'ground'],
  },
  symbols: {
    patterns: ['icon', 'symbol', 'item', 'armor', 'weapon', 'diamond'],
    tags: ['icon', 'ui', 'symbol', 'item'],
  },
  weather: {
    patterns: ['weather', 'rain', 'snow', 'storm', 'overlay'],
    tags: ['weather', 'particle', 'overlay'],
  },
};
```

---

## 🎨 Auto-Crop Configuration

### Per-Category Settings

| Category | Frame Size | Z-Height | Shadow | Notes |
|----------|------------|----------|--------|-------|
| models | 256x256 | 2 | yes | 4x4 animation grid |
| effects | 128x128 | 1 | optional | Particle sprites |
| biomes | 64x64 | 0 | none | Tiled terrain |
| symbols | 64x64 | 1 | none | UI icons |
| weather | 128x128 | 0 | none | Overlay particles |

### Crop Rules

```javascript
// Models: Character sprites
{
  frameSize: 256,
  grid: { cols: 4, rows: 4 },
  animations: ['idle', 'walk', 'attack', 'death'],
  anchor: { x: 0.5, y: 0.9 }
}

// Effects: Particle FX
{
  frameSize: 128,
  grid: { cols: 4, rows: 2 },
  animations: ['cast', 'impact', 'ambient'],
  anchor: { x: 0.5, y: 0.5 }
}

// Biomes: Tiles
{
  frameSize: 64,
  grid: { cols: 8, rows: 8 },
  type: 'tiled',
  collision: true
}

// Weather: Overlays
{
  frameSize: 128,
  grid: { cols: 4, rows: 4 },
  layer: 'overlay',
  blend: 'additive'
}
```

---

## 🔍 Verification Steps

### 1. Manifest Validation

```bash
# Check manifest entries
node scripts/validate-pixi-assets.mjs --check-game-assets

# Verify all assets are referenced
node scripts/check-integrity.mjs
```

### 2. Asset Loading Test

Open browser devtools and check:
- All PNG files load (no 404s)
- JSON atlas files parse correctly
- No console errors for missing assets

### 3. In-Game Verification

1. Connect to dev server
2. Navigate to area with imported assets
3. Verify:
   - [ ] Models render with correct animations
   - [ ] Effects play at correct positions
   - [ ] Biome tiles tile seamlessly
   - [ ] Symbols display in UI
   - [ ] Weather overlays blend correctly

---

## 📋 Workflow Checklist

- [ ] **Stitch**: Generate asset sprites in Stitch project
- [ ] **Organize**: Group by category (models/effects/etc)
- [ ] **Export**: Export as PNG + JSON atlas
- [ ] **Upload**: Attach ZIP to GitHub issue #1071
- [ ] **Import**: Run `stitch-game-assets-importer.mjs`
- [ ] **Verify**: Check manifest and asset loading
- [ ] **Crop**: Run Cozy Asset Director auto-crop
- [ ] **Test**: Verify in dev environment
- [ ] **Merge**: Submit PR with asset updates
- [ ] **Deploy**: Push to live when approved

---

## 🔗 Related Documentation

- [STITCH_MCP_INTEGRATION.md](./STITCH_MCP_INTEGRATION.md)
- [COZY_SPRING_IMPORT_POLICY.md](./COZY_SPRING_IMPORT_POLICY.md)
- [2D_CLIENT_DESIGN_SYSTEM.md](./2D_CLIENT_DESIGN_SYSTEM.md)
- [ASSET_IMPORT_GUIDE.md](./ASSET_IMPORT_GUIDE.md)

---

## ❓ Troubleshooting

### Missing JSON atlas

If PNG imports without JSON, the script synthesizes a grid layout:
```
[synthesized-grid] Generated 4x4 animation grid for missing atlas
```

### Category misclassification

Override using folder naming:
```
stitch_effects_fire_sprites/   → effects
stitch_models_samurai_ninja/   → models
stitch_biomes_forest_tiles/     → biomes
```

### Large file sizes

The importer automatically optimizes:
- PNGs are copied as-is (no recompression)
- JSON atlases are normalized
- Duplicates are deduplicated

---

**Last Updated**: 2026-06-04  
**Maintainer**: Cozy Asset Director Team  
**Stitch Project**: [Arelorian HUD Logo](https://stitch.withgoogle.com/projects/5320982353793182486)