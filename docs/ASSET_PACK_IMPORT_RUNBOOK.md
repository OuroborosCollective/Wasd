# Asset Pack Import Runbook

## Overview

This runbook describes the standard process for importing new asset packs into Areloria's client-2d project.

## Prerequisites

- Asset pack in ZIP format
- PNG files with transparency
- Consistent tile size with existing assets (64x64 or 128x128 recommended)
- Commercial-use license or public domain

## Import Process

### Step 1: Prepare the Pack

1. Download asset pack to `.asset-inbox/` directory
2. Extract and inspect structure
3. Verify file format (PNG preferred)
4. Note naming convention used

### Step 2: Choose Import Method

**Option A: Biome Pack** (forest, desert, snow, etc.)
```bash
node scripts/import-forest-biome-pack.mjs <pack.zip> [destination]
```

**Option B: Custom Import Script**
Create a new import script based on `scripts/import-forest-biome-pack.mjs`:
```bash
cp scripts/import-forest-biome-pack.mjs scripts/import-<pack-name>.mjs
# Edit the script for your pack's structure
```

**Option C: Manual Import**
1. Copy files to `apps/client-2d/public/assets/<category>/<pack>/files/`
2. Create manifest.json with entries
3. Add source tags

### Step 3: Run Auto-Tagging

```bash
# Preview changes
node scripts/auto-tag-manifest.mjs --dry-run

# Apply changes
node scripts/auto-tag-manifest.mjs
```

### Step 4: Validate Assets

```bash
node scripts/validate-pixi-assets.mjs
```

### Step 5: Test in Client

1. Start the client: `npx tsx server/src/index.ts`
2. Navigate to the area using the new assets
3. Verify rendering and fallback behavior

## Asset Manifest Structure

Each imported pack needs a `manifest.json`:

```json
{
  "version": 1,
  "id": "<pack_id>",
  "source": "<original_pack_name>",
  "biome": "<biome_if_applicable>",
  "generatedAt": "<ISO_DATE>",
  "deterministic": true,
  "entries": {
    "<asset_id>": {
      "id": "<asset_id>",
      "src": "/2d/assets/<path>/file.png",
      "kind": "<building|npc|prop|tile>",
      "group": "<subtype>",
      "tags": ["tag1", "tag2", "isometric"],
      "biomeTags": ["forest"],
      "cultureTags": ["generic"],
      "source": "<source_name>",
      "bytes": 1234,
      "sha256": "<hash>"
    }
  }
}
```

## Tagging Standards

### Required Tags

Every asset must have:
- `kind`: `building` | `npc` | `prop` | `tile` | `ui`
- `source`: Origin source name
- At least one semantic tag

### Tag Categories

| Category | Tags |
|----------|------|
| **Buildings** | `house`, `tower`, `inn`, `blacksmith`, `warehouse`, `castle`, `wall` |
| **NPCs** | `guard`, `merchant`, `healer`, `soldier`, `noble`, `farmer`, `child` |
| **Props** | `tree`, `rock`, `bush`, `fence`, `chest`, `sign` |
| **Biomes** | `forest`, `desert`, `snow`, `swamp`, `mountain`, `coastal` |
| **Culture** | `nordic`, `imperial`, `tribal`, `arcane`, `generic` |
| **Style** | `isometric`, `pixel-art`, `game-ready` |

## Adding Fallback Chains

If your pack introduces new types not in existing fallbacks:

1. Edit `apps/client-2d/src/world/AssetFallbackChains.ts`
2. Add to appropriate chain:
   - `BUILDING_FALLBACK_CHAINS` for buildings
   - `NPC_FALLBACK_CHAINS` for NPCs
   - `PROP_FALLBACK_CHAINS` for props
3. For source-specific patterns, add to:
   - `GRAPHICRIVER_BUILDING_FALLBACKS`
   - `GRAPHICRIVER_NPC_FALLBACKS`

## Verification Checklist

Before committing:

- [ ] Manifest validates (`node scripts/validate-pixi-assets.mjs`)
- [ ] All PNG files have entries
- [ ] No duplicate SHA256 hashes
- [ ] Assets render in client
- [ ] Fallback chains cover all types
- [ ] Tags are semantic and descriptive

## Rollback

If import fails:

```bash
# Remove imported files
rm -rf apps/client-2d/public/assets/<category>/<pack>

# Restore manifest
git checkout apps/client-2d/public/assets/<category>/manifest.json
```

## Quick Reference

| Command | Purpose |
|---------|---------|
| `node scripts/auto-tag-manifest.mjs --dry-run` | Preview tagging changes |
| `node scripts/validate-pixi-assets.mjs` | Validate manifest |
| `node scripts/import-<pack>.mjs <zip>` | Import specific pack |

## Related

- [Asset Tagging Skill](../ai-skills/wasd-asset-tagging.md)
- [Asset Purchase Recommendations](./ASSET_PURCHASE_RECOMMENDATIONS.md)
- [Asset Binding Director](../../../apps/client-2d/src/world/AssetBindingDirector.ts)
- [Asset Fallback Chains](../../../apps/client-2d/src/world/AssetFallbackChains.ts)