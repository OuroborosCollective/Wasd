# Stitch 2.5D Asset Intake Pipeline

## Overview

The Stitch 2.5D asset intake pipeline transforms generated sprite atlas ZIP files into deterministic, runtime-ready game assets for the Areloria/WASD browser MMORPG.

**Why not Canva for runtime processing?**
- Canva is a marketing/design tool, not a runtime asset processor
- Runtime asset preparation must be deterministic and scriptable
- Canva cannot be automated in a CI/CD pipeline
- Canva outputs are not deterministic (export quality, compression vary)

**Accepted tooling for runtime processing:**
- Node.js with sharp (preferred for JS ecosystem)
- Python/Pillow (fallback, used in this pipeline)
- ImageMagick
- TexturePacker-compatible JSON output
- PixiJS/Babylon-compatible manifests

## Pipeline Flow

```
ZIP/Directory Input
  ↓
Inspect PNG files
  ↓
Classify assets (enemy, boss, hero, npc, vfx, tile, prop, item, ui, unknown)
  ↓
Validate PNG sheets (dimensions, grid detection)
  ↓
Alpha cleanup (checkerboard background → RGBA transparency)
  ↓
Slice frames deterministically (row-major, top-left to bottom-right)
  ↓
Generate TexturePacker/Pixi-compatible atlas JSON
  ↓
Generate Arelorian runtime manifest
  ↓
Quarantine bad sheets
  ↓
Create preview contact sheets
  ↓
Wire into /2d client
```

## Usage

### Command

```bash
python scripts/stitch-atlas-intake.py --input ./assets/raw/stitch/stitch_2.5d_enemy_sprite_atlas.zip
python scripts/stitch-atlas-intake.py --input ./.asset-inbox/stitch/biomes
python scripts/stitch-atlas-intake.py --input ./.asset-inbox/stitch --output ./assets/runtime/stitch
```

### With package.json script

```json
{
  "scripts": {
    "assets:stitch:intake": "python scripts/stitch-atlas-intake.py"
  }
}
```

```bash
pnpm run assets:stitch:intake -- --input ./assets/raw/stitch/stitch_2.5d_enemy_sprite_atlas.zip
```

## Input / Output Paths

```
assets/raw/stitch/                    # Input: ZIP or PNG directory
assets/runtime/stitch/                # Output: processed assets
  ├── manifest.json                   # Runtime manifest
  ├── report.json                     # Detailed processing report
  ├── enemy/                          # Categorized by type
  │   └── stitch_enemy_*/              # Per-asset directory
  │       ├── stitch_enemy_*.png       # Processed sheet
  │       ├── stitch_enemy_*.atlas.json
  │       └── stitch_enemy_*.preview.png
  ├── tile/
  ├── prop/
  ├── vfx/
  └── ...

assets/quarantine/stitch/            # Bad assets
  └── stitch_unknown_*/
      ├── original.png
      └── reason.json

apps/client-2d/public/2d-assets/stitch/  # Client-side manifest copy
  └── manifest.json
```

## Asset Classification

### Categories

| Category | Keywords |
|----------|----------|
| enemy | enemy, monster, skeleton, ghost, demon, beast, creature, ghoulish, ravager |
| boss | boss, king, lord, dragon, titan |
| hero | hero, warrior, knight, paladin, ranger |
| npc | npc, villager, merchant, guard |
| vfx | vfx, effect, magic, spell, fire, ice, lightning, burst, slash |
| tile | tile, floor, ground, grass, stone, dirt, path |
| prop | prop, decor, tree, rock, furniture, object, gate, pillar, vegetation |
| item | item, loot, pickup, treasure, chest |
| equipment_overlay | helmet, armor, weapon, shield, overlay |
| ui | ui, icon, button, panel, hud, menu |

### Unknown assets

Assets that cannot be classified are placed in the "unknown" category. Unknown assets do not fail the pipeline - they are processed normally.

## Deterministic Naming

Every processed asset has a stable ID:

```
stitch_{category}_{slug}
```

Examples:
- `stitch_enemy_skeleton_warrior`
- `stitch_boss_skeleton_king`
- `stitch_tile_crypt_floor`
- `stitch_prop_infernal_gate`
- `stitch_vfx_magic_burst`

Frame IDs:
```
{assetId}_frame_{indexPadded}
```

Example:
- `stitch_enemy_skeleton_warrior_frame_000`
- `stitch_enemy_skeleton_warrior_frame_001`

**Rules:**
- No Math.random for runtime/gameplay asset IDs
- No Date.now in runtime manifest
- No UUIDs for asset IDs
- Stable sorted file traversal
- Stable sorted manifest entries
- Stable JSON formatting (2-space indent)

## Grid Detection

Supported sprite sheet sizes:

| Sheet Size | Grid | Frame Size |
|------------|------|------------|
| 1024×1024 | 8×8 | 128×128 |
| 768×768 | 6×6 | 128×128 |
| 512×512 | 4×4 | 128×128 |
| 1024×1024 | 16×16 | 64×64 |
| 512×512 | 8×8 | 64×64 |
| 256×256 | 4×4 | 64×64 |
| 1024×1024 | 4×4 | 256×256 |
| 768×768 | 3×3 | 256×256 |

Detection is deterministic - it tries each supported size in order and uses the first match.

## Alpha Cleanup

Many Stitch sheets are RGB with baked checkerboard backgrounds.

### Algorithm

1. Sample corner and edge pixels
2. Detect two primary background colors
3. Quantize to 8-level buckets
4. Identify the two most common color buckets
5. Create alpha mask: pixels close to either background color → transparent
6. All other pixels → opaque

### Thresholds

- Color distance < 60 (per channel sum) → background (transparent)
- Color distance >= 60 → foreground (opaque)

### Conservative Mode

If checkerboard cannot be reliably detected, the image is returned as-is (RGB mode preserved).

## Atlas JSON Format

Generated atlas JSON is TexturePacker/Pixi-compatible:

```json
{
  "meta": {
    "app": "areloria-stitch-atlas-intake",
    "version": 1,
    "image": "stitch_enemy_skeleton_warrior.png",
    "format": "RGBA8888",
    "size": { "w": 1024, "h": 1024 },
    "scale": "1",
    "assetId": "stitch_enemy_skeleton_warrior",
    "category": "enemy",
    "sourceSha256": "abc123...",
    "processedSha256": "def456..."
  },
  "frames": {
    "stitch_enemy_skeleton_warrior_frame_000": {
      "frame": { "x": 0, "y": 0, "w": 128, "h": 128 },
      "rotated": false,
      "trimmed": false,
      "spriteSourceSize": { "x": 0, "y": 0, "w": 128, "h": 128 },
      "sourceSize": { "w": 128, "h": 128 },
      "pivot": { "x": 0.5, "y": 0.82 }
    }
  }
}
```

### Pivot by Category

| Category | Pivot (x, y) |
|----------|--------------|
| enemy, boss, hero, npc | (0.5, 0.82) |
| vfx | (0.5, 0.5) |
| tile | (0.5, 0.5) |
| prop | (0.5, 0.9) |
| item, equipment_overlay, ui | (0.5, 0.5) |

## Quarantine Rules

An asset is quarantined if:
- Not a PNG file
- Cannot determine grid (unsupported dimensions)
- Cannot create usable alpha
- Image too small (< 64×64)
- Checkerboard remains above threshold after cleanup
- Transparent result becomes mostly empty (> 90% transparent)
- Frame count is zero
- File corrupt

### Quarantine Output

```
assets/quarantine/stitch/{assetId}/
  ├── original.png
  └── reason.json
```

### reason.json

```json
{
  "assetId": "stitch_unknown_bad_sheet",
  "sourcePath": "path/to/source.png",
  "reason": "invalid_grid",
  "warnings": [],
  "suggestedFix": "manual_crop_or_regenerate"
}
```

## Runtime Manifest

Generated at `assets/runtime/stitch/manifest.json` and copied to `apps/client-2d/public/2d-assets/stitch/manifest.json`.

```typescript
interface StitchRuntimeManifest {
  schemaVersion: 1;
  packId: "stitch_25d_atlas_pack_001";
  generatedBy: "scripts/stitch-atlas-intake.py";
  deterministic: true;
  assets: StitchRuntimeAsset[];
  quarantine: StitchQuarantineSummary[];
}

interface StitchRuntimeAsset {
  assetId: string;
  category: string;
  displayName: string;
  sourcePath: string;
  imagePath: string;
  atlasPath: string;
  previewPath: string;
  width: number;
  height: number;
  frameWidth: number;
  frameHeight: number;
  columns: number;
  rows: number;
  frameCount: number;
  pivot: { x: number; y: number };
  tags: string[];
  sourceSha256: string;
  processedSha256: string;
  status: "accepted";
}
```

**No wall-clock timestamps in runtime manifest.** Use SHA-256 hashes for content identity.

## Client Integration

### stitchAssetManifest.ts

```typescript
import {
  fetchStitchManifest,
  getStitchAssetById,
  getStitchAssetsByCategory,
  getDefaultEnemySprite,
  getDefaultTileSprite,
  getDefaultVfxSprite,
  getDefaultPropSprite,
  stitchImageUrl,
} from "./game/stitchAssetManifest";
```

### Helper Functions

| Function | Description |
|----------|-------------|
| `fetchStitchManifest()` | Load manifest from `/2d-assets/stitch/manifest.json` |
| `getStitchAssetById(manifest, assetId)` | Get single asset by ID |
| `getStitchAssetsByCategory(manifest, category)` | Get all assets in category |
| `getDefaultEnemySprite(manifest)` | Get sample enemy asset |
| `getDefaultTileSprite(manifest)` | Get sample tile asset |
| `getDefaultVfxSprite(manifest)` | Get sample VFX asset |
| `getDefaultPropSprite(manifest)` | Get sample prop asset |
| `stitchImageUrl(manifest, asset)` | Build full URL for asset image |

## Cyber-Zen Preview Panel

`StitchAssetPreviewPanel.tsx` provides a debug/inspection UI:

- Dark panel with thin neon border (cyan/fire/violet/green accents)
- Displays sample assets: enemy, tile, vfx, prop
- Shows manifest stats: total assets, quarantined count
- Category breakdown
- Loading, error, and empty states

### Data-Test IDs

For E2E testing:
- `data-testid="stitch-asset-preview-panel"`
- `data-testid="stitch-asset-enemy-sample"`
- `data-testid="stitch-asset-tile-sample"`
- `data-testid="stitch-asset-vfx-sample"`
- `data-testid="stitch-asset-prop-sample"`
- `data-testid="stitch-asset-manifest-count"`
- `data-testid="stitch-asset-quarantine-count"`

## Quality Gates

### Acceptance Criteria

- [x] At least 1 enemy accepted
- [x] At least 1 tile accepted
- [x] At least 1 vfx accepted
- [x] At least 1 prop accepted
- [x] Manifest generated
- [x] Contact sheet generated
- [x] Quarantine report generated
- [x] /2d preview panel renders samples
- [x] Tests pass
- [x] Docs explain limitations

### Known Limitations

1. **Alpha cleanup is conservative** - may leave some checkerboard artifacts
2. **Grid detection limited** - only supports predefined sizes
3. **No animation metadata** - frames are sliced but animation timing not inferred
4. **Single category per asset** - cannot classify as both "enemy" and "prop"

## Verification Commands

```bash
# Run intake pipeline
python scripts/stitch-atlas-intake.py --input ./.asset-inbox/stitch/biomes --output ./assets/runtime/stitch

# Verify output
ls -la assets/runtime/stitch/
cat assets/runtime/stitch/manifest.json | python -m json.tool | head -50

# Check client manifest
cat apps/client-2d/public/2d-assets/stitch/manifest.json | python -m json.tool | head -30

# Build client
pnpm --filter @wasd/client-2d build

# Run E2E tests
pnpm run test:e2e:ci
```

## Next Steps

1. **Upload the LimeWire ZIP** to `assets/raw/stitch/` and re-run intake
2. **Extend grid detection** for non-standard sizes (16x16 at 64px, etc.)
3. **Add animation metadata** (fps, loop, direction hints)
4. **Integrate preview panel** into main HUD
5. **Add more categories** as needed
6. **Build contact sheet** for all accepted assets

## Files

| File | Description |
|------|-------------|
| `scripts/stitch-atlas-intake.py` | Main intake script |
| `scripts/stitch-atlas-report.mjs` | Report generation (optional) |
| `apps/client-2d/src/game/stitchAssetManifest.ts` | Client manifest loader |
| `apps/client-2d/src/ui/windows/StitchAssetPreviewPanel.tsx` | Preview UI |
| `apps/client-2d/src/ui/windows/stitchAssetPreviewPanel.css` | Panel styles |
| `docs/STITCH_2_5D_ASSET_INTAKE.md` | This documentation |
| `docs/ASSET_PIPELINE_CONTRACT.md` | Pipeline contract |
| `e2e/stitch-asset-preview.spec.ts` | E2E tests |