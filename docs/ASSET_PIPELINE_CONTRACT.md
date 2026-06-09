# Asset Pipeline Contract

## Overview

This document defines the contract for asset intake pipelines in the Areloria/WASD project. It establishes the rules, formats, and quality gates that all asset processing must follow.

## Core Principles

### 1. No Canva for Runtime Processing

Canva is a design/marketing tool and must NOT be used for runtime asset processing because:
- Non-deterministic output (export quality varies)
- Cannot be automated in CI/CD
- No programmatic access to processing
- Not designed for game asset workflows

**Canva acceptable uses:**
- Marketing preview materials
- Mood boards and design presentations
- Contact sheets for stakeholder review
- Store graphics and thumbnails

### 2. Determinism Rules

Every asset ID, path, and metadata must be deterministic:

**FORBIDDEN:**
- `Math.random()` for gameplay asset IDs
- `Date.now()` in runtime manifest
- `randomUUID()` for asset identification
- Non-deterministic file traversal order

**REQUIRED:**
- Content-based SHA-256 for identity
- Sorted file traversal (stable order)
- Sorted manifest entries
- Stable JSON formatting (2-space indent)

### 3. Quarantine-First Safety

Bad assets must not fail the pipeline:
- Unknown category → "unknown" category (not error)
- Invalid grid → quarantine with reason
- Corrupt file → quarantine with reason
- Pipeline fails only if ZERO assets accepted

### 4. No External Paid APIs for Processing

Asset processing must not depend on:
- Canva API (paid, not for runtime)
- Cloud image processing services
- External AI asset tools (unless explicitly requested)

**Allowed:**
- Local Python/Node.js processing (Pillow, sharp)
- ImageMagick CLI
- Open-source tools only

## Pipeline Interface

### Input

```typescript
interface PipelineInput {
  inputPath: string;           // ZIP file or directory path
  outputPath?: string;         // Default: ./assets/runtime/stitch
  packId?: string;             // Default: stitch_25d_atlas_pack_001
  quarantinePath?: string;     // Default: ./assets/quarantine/stitch
}
```

### Output

```typescript
interface PipelineOutput {
  manifest: string;            // Path to manifest.json
  report: string;             // Path to report.json
  contactSheet?: string;       // Path to contact-sheet.png
  quarantineDir: string;       // Path to quarantine directory
  stats: PipelineStats;
}

interface PipelineStats {
  totalProcessed: number;
  accepted: number;
  quarantined: number;
  byCategory: Record<string, number>;
}
```

## Asset Naming Contract

### Format

```
stitch_{category}_{slug}
```

### Rules

1. Lowercase only
2. Snake_case separators
3. No spaces, no special characters (except underscore)
4. Slug derived from original filename
5. Category prefix always present

### Examples

| Source Name | Asset ID |
|-------------|----------|
| skeleton_warrior.png | stitch_enemy_skeleton_warrior |
| infernal_gate.png | stitch_prop_infernal_gate |
| magic_burst.png | stitch_vfx_magic_burst |
| crypt_floor_tiles.png | stitch_tile_crypt_floor_tiles |

### Frame IDs

```
{assetId}_frame_{indexPadded}
```

- Zero-padded to 3 digits minimum
- Row-major order (top-left to bottom-right)
- Index = row * columns + column

## Category System

### Required Categories

| Category | Pivot (x, y) | Description |
|----------|--------------|-------------|
| enemy | (0.5, 0.82) | Hostile creatures |
| boss | (0.5, 0.82) | Elite enemies |
| hero | (0.5, 0.82) | Player characters |
| npc | (0.5, 0.82) | Non-player characters |
| vfx | (0.5, 0.5) | Visual effects |
| tile | (0.5, 0.5) | Ground/floor tiles |
| prop | (0.5, 0.9) | World objects |
| item | (0.5, 0.5) | Pickups/loot |
| equipment_overlay | (0.5, 0.5) | Wearable items |
| ui | (0.5, 0.5) | Interface elements |
| unknown | (0.5, 0.5) | Unclassified |

### Classification Rules

Classification is filename-based:
- Keywords matched against known terms
- First match wins
- Unknown → "unknown" category (not error)

## Grid Detection Contract

### Supported Configurations

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

### Detection Algorithm

1. Check if width === height (square sheets only)
2. Try each supported size in deterministic order
3. First match wins
4. No match → quarantine with "invalid_grid"

## Alpha Cleanup Contract

### Checkerboard Detection

1. Sample 8 corner/edge pixels
2. Quantize to 8-level buckets (per channel)
3. Identify two most common colors
4. Calculate average for each bucket

### Alpha Masking

| Condition | Action |
|-----------|--------|
| Pixel close to bg color 1 (< 60 sum dist) | Set alpha = 0 |
| Pixel close to bg color 2 (< 60 sum dist) | Set alpha = 0 |
| Otherwise | Keep alpha (or set to 255) |

### Failure Modes

| Scenario | Action |
|----------|--------|
| No checkerboard detected | Return as-is (no cleanup) |
| Cleanup removes too much (> 90%) | Quarantine |
| Cleanup leaves too much checkerboard | Keep result, add warning |

## Atlas JSON Contract

### Format

TexturePacker/Pixi-compatible JSON:

```json
{
  "meta": {
    "app": "areloria-stitch-atlas-intake",
    "version": 1,
    "image": "{assetId}.png",
    "format": "RGBA8888",
    "size": { "w": 1024, "h": 1024 },
    "scale": "1",
    "assetId": "stitch_enemy_skeleton_warrior",
    "category": "enemy",
    "sourceSha256": "abc123...",
    "processedSha256": "def456..."
  },
  "frames": {
    "{assetId}_frame_000": {
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

### Frame Order

Row-major, top-left to bottom-right:
- index = row * columns + column
- Frame 000 = top-left
- Frame 001 = one to the right
- ...
- Frame 007 = end of first row
- Frame 008 = start of second row

## Quarantine Contract

### Trigger Conditions

| Condition | Reason |
|-----------|--------|
| Not a PNG | "not_png" |
| Cannot detect grid | "invalid_grid" |
| Image < 64×64 | "too_small" |
| Result > 90% transparent | "mostly_empty" |
| File corrupt | "corrupt" |
| Frame count = 0 | "zero_frames" |

### Quarantine Output

```
{quarantinePath}/{assetId}/
  ├── original.png    # Original file
  └── reason.json     # Quarantine reason
```

### reason.json Format

```json
{
  "assetId": "stitch_unknown_bad_sheet",
  "sourcePath": "path/to/source.png",
  "reason": "invalid_grid",
  "warnings": [],
  "suggestedFix": "manual_crop_or_regenerate"
}
```

## Manifest Contract

### Runtime Manifest

```typescript
interface StitchRuntimeManifest {
  schemaVersion: number;        // Always 1
  packId: string;               // e.g., "stitch_25d_atlas_pack_001"
  generatedBy: string;           // e.g., "scripts/stitch-atlas-intake.py"
  deterministic: boolean;         // Always true
  assets: StitchRuntimeAsset[];  // Sorted by category, assetId, sourcePath
  quarantine: StitchQuarantineSummary[];
}
```

### Asset Entry

```typescript
interface StitchRuntimeAsset {
  assetId: string;              // Deterministic ID
  category: string;             // Classification category
  displayName: string;         // Human-readable name
  sourcePath: string;          // Original path
  imagePath: string;           // Relative to output dir
  atlasPath: string;            // Relative to output dir
  previewPath: string;          // Relative to output dir
  width: number;               // Sheet width
  height: number;               // Sheet height
  frameWidth: number;           // Individual frame width
  frameHeight: number;          // Individual frame height
  columns: number;              // Grid columns
  rows: number;                 // Grid rows
  frameCount: number;           // columns * rows
  pivot: { x: number; y: number };
  tags: string[];               // e.g., [category]
  sourceSha256: string;         // Original file hash
  processedSha256: string;     // Processed file hash
  status: "accepted";
}
```

### Sorting Rules

Manifest entries sorted by:
1. category (ascending)
2. assetId (ascending)
3. sourcePath (ascending)

### NO Timestamps

The runtime manifest must NOT contain:
- `generatedAt` (wall-clock time)
- `processedAt`
- Any other timestamp

Use `sourceSha256` and `processedSha256` for identity.

## Client Integration Contract

### Manifest Loader

```typescript
async function fetchStitchManifest(): Promise<StitchRuntimeManifest | null>
```

- Fetches from `/2d-assets/stitch/manifest.json`
- Returns null on failure
- No caching by default (cache: no-store)

### Helper Functions

| Function | Returns |
|----------|---------|
| `getStitchAssetById(manifest, assetId)` | `StitchRuntimeAsset \| undefined` |
| `getStitchAssetsByCategory(manifest, category)` | `StitchRuntimeAsset[]` |
| `getDefaultEnemySprite(manifest)` | `StitchRuntimeAsset \| undefined` |
| `getDefaultTileSprite(manifest)` | `StitchRuntimeAsset \| undefined` |
| `getDefaultVfxSprite(manifest)` | `StitchRuntimeAsset \| undefined` |
| `getDefaultPropSprite(manifest)` | `StitchRuntimeAsset \| undefined` |

## Testing Contract

### Unit Tests

```typescript
// manifest generation is stable
// asset IDs are deterministic
// grid detection works for 1024x1024
// grid detection works for 768x768
// invalid grid quarantines
// RGB checkerboard cleanup produces RGBA
// manifest entries are sorted
// atlas frame count matches columns * rows
// no duplicate asset IDs
// client manifest loader returns sample assets
```

### E2E Tests

```typescript
// /2d boots
// stitch asset preview panel appears
// manifest count > 0
// enemy sample visible
// tile sample visible
// vfx sample visible
// prop sample visible
// quarantine count visible
// no boot fatal overlay
```

### Data-Test IDs

| Test ID | Element |
|---------|---------|
| `stitch-asset-preview-panel` | Main panel container |
| `stitch-asset-enemy-sample` | Enemy asset card |
| `stitch-asset-tile-sample` | Tile asset card |
| `stitch-asset-vfx-sample` | VFX asset card |
| `stitch-asset-prop-sample` | Prop asset card |
| `stitch-asset-manifest-count` | Asset count display |
| `stitch-asset-quarantine-count` | Quarantine count display |

## Documentation Contract

### Required Documentation

| Document | Contents |
|----------|----------|
| `STITCH_2_5D_ASSET_INTAKE.md` | Full pipeline documentation |
| `ASSET_PIPELINE_CONTRACT.md` | This contract |

### Documentation Must Include

- [x] Why Canva is not used for runtime processing
- [x] How to run the intake
- [x] Input ZIP path
- [x] Output paths
- [x] Naming convention
- [x] Manifest schema
- [x] Atlas JSON schema
- [x] Quarantine rules
- [x] Alpha cleanup limitations
- [x] Cyber-Zen preview UI
- [x] Test IDs
- [x] Known limitations
- [x] Next steps

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1 | 2026-06-09 | Initial contract |