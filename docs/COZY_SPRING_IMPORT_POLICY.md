# Cozy Spring Import Policy & Asset Extraction Guide

Source: https://sakpix.itch.io/cozy-spring-asset-pack-top-down-pixel-art-tileset-300-assets

---

## 🔑 Key Insight: Why Text/Artifacts Appear in Game

The alpha-mask connected-components extractor has a fundamental problem:

```
Sheet:
[ Baum ]   → Objekt 1 = Baum (✓ gut)
[ Busch ]  → Objekt 2 = Busch (✓ gut)
[ NC ]     → Objekt 3 = NC     (✗ TEXT!)
[ & ]      → Objekt 4 = &      (✗ SYMBOL!)
[ PETALS ] → Objekt 5 = PETALS (✗ TEXT!)
```

The extractor sees "alpha > threshold → occupied pixel → object" and exports:
- Real sprites: trees, bushes, flowers ✅
- Sheet artifacts: text labels, symbols, NC annotations ❌

**This explains all visual garbage in the game.** The objects exist because the extractor created them from text/labels in sheets like:
- "Extra Cozy Details"
- "Decor and Homey Items"
- "Petals and Ground Details"

---

## Import policy: "tilesets-as-tiles-props-as-extracted-objects"

### Extraction Pipeline (Corrected)

The Python script `scripts/extract-cozy-spring-objects.py` replaces `batch-import-cozy-spring.mjs`.

**CRITICAL FILTERS that must be applied:**

```python
# 1. SKIP ENTIRE CATEGORIES with artifact sheets
SKIP_RUNTIME_PROP_EXPORT = {
    'petal', 'petals', 'ground detail', 'ground-details',
    'extra cozy details', 'decor and homey items', 'deco', 'homey',
}

def should_skip_prop_export(category):
    cat_lower = category.lower()
    for skip in SKIP_RUNTIME_PROP_EXPORT:
        if skip in cat_lower:
            return True
    return False
```

```python
# 2. ASPECT RATIO FILTER for letter/line artifacts
MAX_ASPECT_RATIO = 5.0
for bbox in boxes:
    w = x1 - x0 + 1
    h = y1 - y0 + 1
    aspect = max(w / h if h > 0 else 0, h / w if w > 0 else 0)
    if aspect > MAX_ASPECT_RATIO:
        reject()  # Letters are typically 3:1 or more
```

```python
# 3. MINIMUM DIMENSION FILTER
MIN_DIM = 16
MIN_AREA = 96
if w < MIN_DIM or h < MIN_DIM or (w * h) < MIN_AREA:
    reject()  # Tiny crops are likely fragments
```

```python
# 4. NC_ PREFIX FILTER (artifact filenames)
import re
if re.search(r'\bnc_\d', filename.lower()) or \
   re.search(r'\bnc_[a-z]', filename.lower()):
    reject()  # Filenames like "NC_01.png" are labels, not sprites
```

---

### Correct Usage

- Entries with `meta.usableAsTile === true` are tile sources (from tileset sheets).
- Entries with `meta.usableAsProp === true` and `meta.fragmentOnly === false` are individual prop objects (extracted sprites).
- `runtimeRole === 'propObject'` marks entries from connected-components extraction.
- `runtimeRole === 'tileSource'` marks original tileset sheets.

---

### Forbidden Usage

- Do not render entire prop sheets as props (sheets must be extracted → individual sprites).
- Do not render arbitrary 32x32 sheet fragments as large props.
- Do not use white/pink matte filler cells as world props.
- Do not claim the pack has 21,940 finished props. That number came from a grid-slice over occupied cells and is not the finished-asset count.
- Entries with `meta.usableAsTile === true` must not be used as world props.
- Entries with `meta.fragmentOnly === true` must not be rendered as world props.

---

## Runtime Binder Guards

Updated `AssetBindingDirector` / `WorldPlanAssetBinder`:

### Prop Binding (bindProp)

Prop candidates from Cozy Spring `props` map MUST pass:

```typescript
function isValidPropCandidate(id: string, entry: AssetEntry): boolean {
    // 1. Must have source
    if (!entry.src) return false;
    
    // 2. Tilesets are NOT props
    if (entry.category === 'tilesets') return false;
    
    // 3. Cannot be marked as tile
    if (entry.meta?.usableAsTile === true) return false;
    
    // 4. Must be explicitly usable as prop
    if (entry.meta?.usableAsProp === false) return false;
    
    // 5. Check for artifact patterns in ID/src/group/sourceName
    const artifactPatterns = [
        'petals', 'petal', 'ground-details', 'ground_detail', 'ground detail',
        'label', 'text', 'ui', 'font', 'sheet', 'preview',
        'petals_and', 'decor-and-homey', 'extra-cozy-details', 'homey'
    ];
    
    for (const pattern of artifactPatterns) {
        if (idLower.includes(pattern) || srcLower.includes(pattern) || 
            groupLower.includes(pattern) || sourceNameLower.includes(pattern)) {
            return false;
        }
    }
    
    // 6. NC_ prefix filter (label artifacts)
    // Only match at start, not as substring (avoid blocking "fence", "benches")
    const sourceName = entry.sourceName || '';
    const srcFilename = entry.src?.split('/').pop() || '';
    const combinedLower = (entry.id || '') + ' ' + sourceName + ' ' + srcFilename;
    
    if (/\bnc_\d/.test(combinedLower) || /\bnc_[a-z]/.test(combinedLower) ||
        sourceName.toLowerCase().startsWith('nc_') ||
        srcFilename.toLowerCase().startsWith('nc_')) {
        return false;
    }
    
    // 7. Reject kind="deco" or "petal"
    if (kindLower === 'deco' || kindLower === 'petal') return false;
    
    // 8. Size validation
    const isTree = kindLower === 'tree';
    if (isTree) {
        if (width > 384 || height > 384) return false;
    } else {
        if (width > 256 || height > 256) return false;
        if (width < 16 || height < 16) return false;  // Too small = fragment
    }
    
    return true;
}
```

### Road Binding (bindRoad)

Only use tilesets for road/terrain binding:

```typescript
function isValidTilesetCandidate(entry: AssetEntry): boolean {
    if (!entry?.src) return false;
    if (entry.category !== 'tilesets') return false;
    if (entry.meta?.usableAsProp === true) return false;  // Not a pure tileset
    return true;
}
```

### Building Binding (bindBuilding)

Buildings must come from `buildings` category, NOT props/tilesets:

```typescript
function isValidBuildingCandidate(entry: AssetEntry): boolean {
    if (!entry?.src) return false;
    if (entry.category === 'buildings') return true;  // OK
    if (entry.category === 'props' || entry.category === 'tilesets') return false;
    if (entry.src?.toLowerCase().includes('cozy-spring')) return false;
    return true;
}
```

---

## Troubleshooting Guide

### Symptom: "NC", "PETALS", "&" appearing as props

**Cause:** Extractor processed artifact sheets or text crops.
**Fix:** 
1. Run extractor with `SKIP_RUNTIME_PROP_EXPORT` filter
2. Ensure binder uses `isValidPropCandidate()` with NC_ prefix regex

### Symptom: Ground still looks flat/green

**Cause:** Bodengenerator uses old `green plane` render logic, not Cozy tilesets.
**Fix:** Configure renderer to use tilesets with `kind='grass'` for terrain layer.

### Symptom: Buildings missing or fake houses from flowers/deco

**Cause:** Building binding using props instead of `buildings` category.
**Fix:** Use `isValidBuildingCandidate()` filter. Buildings should come from GraphicRiver/fallbacks.

### Symptom: Props/spawn density too high

**Cause:** No spawn limit per chunk.
**Fix:** Add max visible props per chunk limit (e.g., 24-48 for cozy village).

---

## Deployment Checklist

- [ ] Extractor has `SKIP_RUNTIME_PROP_EXPORT` configured
- [ ] Aspect ratio filter (`MAX_ASPECT_RATIO = 5.0`) active
- [ ] `isValidPropCandidate()` in AssetBindingDirector
- [ ] NC_ prefix regex filter (`\bnc_`) in place
- [ ] Kind="deco"/"petal" rejected
- [ ] Size constraints enforced (16-256/384)
- [ ] Tilesets only used for roads/terrain
- [ ] Buildings only from `buildings` category
- [ ] Manifest version stays at 3

---

## Workflow Integration

- `.github/workflows/vps-docker-deploy.yml` installs `pip install pillow` before the import step.
- When `.asset-inbox/cozy-spring` exists on the runner, it runs the Python extraction and validates the manifest.
- Manifest must be present in `/2d/assets/cozy-spring/manifest.json` after deploy (validated by health check).
