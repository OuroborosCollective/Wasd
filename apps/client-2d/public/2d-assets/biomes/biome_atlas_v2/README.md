# Biome Atlas v2.0 — Pixi.js Isometric 2.5D MMORPG

## Overview
- Tile Size: 128x64px (isometric diamond, 2:1 ratio)
- Total Tiles: 145 (65 base + 80 transitions)

## Pixi.js v8 Usage
```js
await Assets.load('biome_atlas/manifest.json');
const tile = Sprite.from('forest_ground_02');
```

## Seed Formulae
- Base: (biomeIndex*100+typeIndex)*9973+42
- Transition: (biomeAIndex*1000+biomeBIndex*100+transTypeIndex)*7919+137
