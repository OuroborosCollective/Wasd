# Stitch Game Assets Inbox

This folder is for Stitch-generated game assets (models, effects, biomes, symbols, weather).

## Workflow

1. Generate assets in Stitch: https://stitch.withgoogle.com/projects/5320982353793182486
2. Export as PNG sprite sheets with JSON atlas metadata
3. ZIP the assets and upload to GitHub issue #1071
4. Run import script: `node scripts/stitch-game-assets-importer.mjs`

## Expected Asset Structure

```
stitch/
├── models/           # Character sprites, NPC animations (256x256 frames)
│   ├── samurai/
│   ├── mongolian/
│   └── medieval/
├── effects/          # Skill particles, combat FX (128x128 frames)
│   ├── fire/
│   ├── ice/
│   └── lightning/
├── biomes/           # Environment terrain tiles (64x64 tiles)
│   ├── forest/
│   ├── desert/
│   └── snow/
├── symbols/          # UI icons, item graphics (64x64 icons)
│   ├── icons/
│   └── items/
└── weather/          # Weather overlays, particles (128x128 overlays)
    ├── rain/
    └── snow/
```

## Categories

| Category | Frame Size | Description |
|----------|------------|-------------|
| models | 256x256 | Character sprites, NPC animations |
| effects | 128x128 | Skill particles, combat FX |
| biomes | 64x64 | Environment terrain tiles |
| symbols | 64x64 | UI icons, item graphics |
| weather | 128x128 | Weather overlays, particles |

## Import Script

```bash
node scripts/stitch-game-assets-importer.mjs --dry-run  # Verify without importing
node scripts/stitch-game-assets-importer.mjs              # Full import
```

Generated assets will be placed in:
- `apps/client-2d/public/2d-assets/game-assets/`

---

Last updated: 2026-06-04