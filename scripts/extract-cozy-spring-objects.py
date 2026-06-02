#!/usr/bin/env python3
"""
Extract Cozy Spring Prop Objects via Connected Components on Alpha Mask.

This script accompanies batch-import-cozy-spring.mjs. Where the Node importer
copies PNG assets from the nested category ZIPs, this Python script performs
object-extraction on prop sheets to isolate individual sprites.

Workflow per prop sheet:
  1. Load RGBA PNG.
  2. Build alpha mask (pixel occupied = alpha > 8 AND not near-white matte filler).
  3. Run 8-neighbor connected components on the mask.
  4. For every component bounding box:
     - Reject if area < 20 px  OR w < 4 OR h < 4  (tiny fragments).
     - Reject if the component fills ≥95 % of the sheet (whole-sheet protection).
     - Merge components whose bounding boxes are ≤ 4 px apart (keep parts together).
  5. Pack extractions into output PNGs (padded bounding boxes).
  6. Write manifest entries with usableAsProp=true, fragmentOnly=false,
     runtimeRole=propObject.

Tileset sheets bypass extraction — they are used as tile sources directly.

Usage:
  python3 scripts/extract-cozy-spring-objects.py [--inbox DIR] [--output DIR]
"""

import argparse
import hashlib
import json
import os
import shutil
import sys
import zipfile
from pathlib import Path
from typing import Dict, List, Optional, Set, Tuple

try:
    from PIL import Image
except ImportError:
    print("[extract-cozy-spring] Error: Pillow is required. Install with: pip install pillow", file=sys.stderr)
    sys.exit(1)

# ─── Constants ─────────────────────────────────────────────────────────────────────

# Repo root is two levels up from scripts/
REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_INBOX = REPO_ROOT / ".asset-inbox" / "cozy-spring"
DEFAULT_OUTPUT = REPO_ROOT / "apps" / "client-2d" / "public" / "assets" / "cozy-spring"
DEFAULT_TMP = REPO_ROOT / ".tmp" / "cozy-spring-extract"

ALPHA_THRESHOLD = 8          # alpha > 8 means occupied
MATTE_WHITE_RGBA = (240, 240, 240, 255)  # near-white matte filler to drop
MATTE_DIST = 15             # colour distance to consider a pixel matte

# Connected-component merge distance (pack parts that are close)
MERGE_DISTANCE = 4

# Sheet-size thresholds for rejection
MIN_AREA = 20               # min bounding-box area (px²)
MIN_W, MIN_H = 4, 4         # min bounding-box width/height (px)
WHOLE_SHEET_FILL_RATIO = 0.95  # reject if component occupies ≥95% of sheet

# Output padding around extracted bounding box
CROP_PAD_X = 2
CROP_PAD_Y = 2

# Group → kind mapping (mirrors batch-import-cozy-spring.mjs)
GROUP_KIND_MAP = {
    'cherry-blossom-trees': 'tree',
    'trees-spring': 'tree',
    'trees-spring-': 'tree',
    'bushes-and-shrubs': 'bush',
    'flowers-and-plants': 'flower',
    'petals-and-ground-details': 'deco',
    'fences-and-gates': 'fence',
    'bridges-and-boardwalks': 'bridge',
    'garden-beds': 'garden',
    'garden-furniture': 'furniture',
    'benches-and-seating': 'bench',
    'lamps-and-lights': 'lamp',
    'mailboxes-and-birdhouses': 'mailbox',
    'pots-and-planters': 'pot',
    'decor-and-homey-items': 'deco',
    'extra-cozy-details': 'deco',
}

CATEGORY_TILESET_PATTERNS = ['tile', 'path', 'water', 'soil', 'grass', 'stone', 'pond']

# Categories that should NOT be exported as visible world props.
# These sheets may contain text labels, UI elements, or decorative fragments
# that would render incorrectly as world objects.
SKIP_RUNTIME_PROP_EXPORT = {
    'petal', 'petals', 'ground detail', 'ground-details', 'ground detail',
    'extra cozy details', 'decor and homey items', 'deco', 'homey',
}

def should_skip_prop_export(category: str) -> bool:
    """Return True if this category should NOT be exported as runtime props."""
    cat_lower = category.lower()
    for skip in SKIP_RUNTIME_PROP_EXPORT:
        if skip in cat_lower:
            return True
    return False

def slug(value: str) -> str:
    """Convert string to stable slug."""
    return "".join(c if c.isalnum() or c in ("-", "_") else "-" for c in value.lower()).strip("-")


def colour_distance(r1, g1, b1, r2, g2, b2) -> float:
    return ((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2) ** 0.5


def is_matte_pixel(r: int, g: int, b: int, a: int) -> bool:
    """Return True if pixel is near-white matte filler (alpha must still be > threshold)."""
    if a <= ALPHA_THRESHOLD:
        return False
    mr, mg, mb = MATTE_WHITE_RGBA[:3]
    return colour_distance(r, g, b, mr, mg, mb) < MATTE_DIST


# ─── Connected Components ────────────────────────────────────────────────────

def build_alpha_mask(img: Image.Image) -> List[List[bool]]:
    """Build 2D occupied-pixel mask from RGBA image."""
    if img.mode != 'RGBA':
        img = img.convert('RGBA')
    w, h = img.size
    mask = [[False] * w for _ in range(h)]
    # Use tobytes() for safe RGBA access
    pixels = list(img.tobytes())
    for i in range(0, len(pixels), 4):
        x = (i // 4) % w
        y = (i // 4) // w
        r, g, b, a = pixels[i], pixels[i+1], pixels[i+2], pixels[i+3]
        # Occupied means alpha > threshold AND not matte filler
        if a > ALPHA_THRESHOLD and not is_matte_pixel(r, g, b, a):
            mask[y][x] = True
    return mask


def flood_fill(mask: List[List[bool]], visited: Set[Tuple[int, int]], x: int, y: int, w: int, h: int) -> List[Tuple[int, int]]:
    """8-neighbour BFS flood fill. Returns list of (x,y) occupied pixels."""
    if x < 0 or x >= w or y < 0 or y >= h:
        return []
    if visited.intersection({(x, y)}):
        return []
    if not mask[y][x]:
        return []
    visited.add((x, y))
    pixels = [(x, y)]
    queue = [(x, y)]
    while queue:
        cx, cy = queue.pop()
        for dx in (-1, 0, 1):
            for dy in (-1, 0, 1):
                if dx == 0 and dy == 0:
                    continue
                nx, ny = cx + dx, cy + dy
                if 0 <= nx < w and 0 <= ny < h and (nx, ny) not in visited and mask[ny][nx]:
                    visited.add((nx, ny))
                    pixels.append((nx, ny))
                    queue.append((nx, ny))
    return pixels


def extract_components(mask: List[List[bool]], sheet_w: int, sheet_h: int) -> List[Tuple[int, int, int, int]]:
    """Find all connected-component bounding boxes, apply small/giant rejection and merge."""
    visited: Set[Tuple[int, int]] = set()
    raw_boxes: List[Tuple[int, int, int, int]] = []  # (x_min, y_min, x_max, y_max)

    for y in range(sheet_h):
        for x in range(sheet_w):
            if mask[y][x] and (x, y) not in visited:
                pixels = flood_fill(mask, visited, x, y, sheet_w, sheet_h)
                if not pixels:
                    continue
                xs = [p[0] for p in pixels]
                ys = [p[1] for p in pixels]
                raw_boxes.append((min(xs), min(ys), max(xs), max(ys)))

    # Step 1: Small fragment rejection
    small_rejected = 0
    filtered: List[Tuple[int, int, int, int]] = []
    for x0, y0, x1, y1 in raw_boxes:
        area = (x1 - x0 + 1) * (y1 - y0 + 1)
        w = x1 - x0 + 1
        h = y1 - y0 + 1
        if area < MIN_AREA or w < MIN_W or h < MIN_H:
            small_rejected += 1
            continue
        filtered.append((x0, y0, x1, y1))

    # Step 2: Giant / full-sheet rejection
    giant_rejected = 0
    sheet_area = sheet_w * sheet_h
    truly_filtered: List[Tuple[int, int, int, int]] = []
    for box in filtered:
        x0, y0, x1, y1 = box
        area = (x1 - x0 + 1) * (y1 - y0 + 1)
        if area / sheet_area >= WHOLE_SHEET_FILL_RATIO:
            giant_rejected += 1
            continue
        truly_filtered.append(box)

    # Step 3: Merge near components (≤ MERGE_DISTANCE px apart on any axis)
    merged: List[Set[int]] = []
    for idx, box in enumerate(truly_filtered):
        x0, y0, x1, y1 = box
        placed = False
        for existing in merged:
            other_idx = next(iter(existing))
            ox0, oy0, ox1, oy1 = truly_filtered[other_idx]
            # Check overlap/distance
            dist_x = max(0, max(ox0 - x1, x0 - ox1))
            dist_y = max(0, max(oy0 - y1, y0 - oy1))
            if dist_x <= MERGE_DISTANCE and dist_y <= MERGE_DISTANCE:
                existing.add(idx)
                placed = True
                break
        if not placed:
            merged.append({idx})

    final_boxes: List[Tuple[int, int, int, int]] = []
    for group in merged:
        boxes = [truly_filtered[i] for i in group]
        x0 = min(b[0] for b in boxes)
        y0 = min(b[1] for b in boxes)
        x1 = max(b[2] for b in boxes)
        y1 = max(b[3] for b in boxes)
        final_boxes.append((x0, y0, x1, y1))

    return final_boxes, small_rejected, giant_rejected


# ─── Core extraction logic ────────────────────────────────────────────────────

def is_tileset_sheet(category: str) -> bool:
    cat_lower = category.lower()
    return any(p in cat_lower for p in CATEGORY_TILESET_PATTERNS)


def detect_kind(category: str) -> str:
    cat_lower = category.lower()
    if 'tile' in cat_lower or 'grass' in cat_lower or 'soil' in cat_lower or 'dirt' in cat_lower:
        return 'grass'
    if 'stone' in cat_lower or 'path' in cat_lower:
        return 'road'
    if 'water' in cat_lower or 'pond' in cat_lower:
        return 'water'
    if 'tree' in cat_lower:
        return 'tree'
    if 'bush' in cat_lower or 'shrub' in cat_lower:
        return 'bush'
    if 'flower' in cat_lower or 'plant' in cat_lower:
        return 'flower'
    if 'fence' in cat_lower or 'gate' in cat_lower:
        return 'fence'
    if 'bridge' in cat_lower:
        return 'bridge'
    if 'bench' in cat_lower or 'seat' in cat_lower:
        return 'bench'
    if 'lamp' in cat_lower or 'light' in cat_lower:
        return 'lamp'
    if 'pot' in cat_lower or 'planter' in cat_lower:
        return 'pot'
    if 'mailbox' in cat_lower:
        return 'mailbox'
    if 'birdhouse' in cat_lower:
        return 'birdhouse'
    if 'garden' in cat_lower:
        return 'garden'
    if 'furniture' in cat_lower:
        return 'furniture'
    if 'deco' in cat_lower or 'detail' in cat_lower or 'petal' in cat_lower:
        return 'deco'
    if 'cherry' in cat_lower:
        return 'tree'
    return 'prop'


GroupMapping = Dict[str, Optional[Dict]]


def make_group_config(category: str) -> Dict:
    """Mirrors CATEGORY_MAP from batch-import-cozy-spring.mjs."""
    cat_lower = category.lower()
    if 'tile' in cat_lower or 'grass' in cat_lower:
        return {'group': category, 'category': 'tilesets', 'biome': 'plains', 'kind': 'grass',
                'tags': ['grass', 'tile', 'ground', 'spring', 'green']}
    if 'soil' in cat_lower or 'dirt' in cat_lower:
        return {'group': category, 'category': 'tilesets', 'biome': 'plains', 'kind': 'dirt',
                'tags': ['soil', 'dirt', 'tile', 'ground', 'brown']}
    if 'stone' in cat_lower:
        return {'group': category, 'category': 'tilesets', 'biome': 'plains', 'kind': 'road',
                'tags': ['stone', 'path', 'road', 'walkway']}
    if 'flower path' in cat_lower:
        return {'group': category, 'category': 'tilesets', 'biome': 'plains', 'kind': 'road',
                'tags': ['flower', 'path', 'road', 'garden']}
    if 'water' in cat_lower or 'pond' in cat_lower:
        return {'group': category, 'category': 'tilesets', 'biome': 'plains', 'kind': 'water',
                'tags': ['water', 'pond', 'lake', 'liquid']}
    if 'cherry' in cat_lower:
        return {'group': category, 'category': 'props', 'biome': 'plains', 'kind': 'tree',
                'tags': ['tree', 'cherry', 'blossom', 'pink', 'spring']}
    if 'tree' in cat_lower:
        return {'group': category, 'category': 'props', 'biome': 'plains', 'kind': 'tree',
                'tags': ['tree', 'spring', 'green', 'nature']}
    if 'bush' in cat_lower or 'shrub' in cat_lower:
        return {'group': category, 'category': 'props', 'biome': 'plains', 'kind': 'bush',
                'tags': ['bush', 'shrub', 'plant', 'green']}
    if 'flower' in cat_lower or 'plant' in cat_lower:
        return {'group': category, 'category': 'props', 'biome': 'plains', 'kind': 'flower',
                'tags': ['flower', 'plant', 'garden', 'nature']}
    if 'petal' in cat_lower or 'ground detail' in cat_lower:
        return {'group': category, 'category': 'props', 'biome': 'plains', 'kind': 'deco',
                'tags': ['petal', 'ground', 'detail', 'decoration']}
    if 'fence' in cat_lower or 'gate' in cat_lower:
        return {'group': category, 'category': 'props', 'biome': 'plains', 'kind': 'fence',
                'tags': ['fence', 'gate', 'barrier', 'wooden']}
    if 'bridge' in cat_lower:
        return {'group': category, 'category': 'props', 'biome': 'plains', 'kind': 'bridge',
                'tags': ['bridge', 'boardwalk', 'wood', 'structure']}
    if 'garden bed' in cat_lower:
        return {'group': category, 'category': 'props', 'biome': 'plains', 'kind': 'garden',
                'tags': ['garden', 'bed', 'planting', 'vegetable']}
    if 'furniture' in cat_lower:
        return {'group': category, 'category': 'props', 'biome': 'plains', 'kind': 'furniture',
                'tags': ['furniture', 'garden', 'bench', 'table']}
    if 'bench' in cat_lower or 'seat' in cat_lower:
        return {'group': category, 'category': 'props', 'biome': 'plains', 'kind': 'bench',
                'tags': ['bench', 'seat', 'furniture', 'rest']}
    if 'lamp' in cat_lower or 'light' in cat_lower:
        return {'group': category, 'category': 'props', 'biome': 'plains', 'kind': 'lamp',
                'tags': ['lamp', 'light', 'glow', 'decoration']}
    if 'mailbox' in cat_lower:
        return {'group': category, 'category': 'props', 'biome': 'plains', 'kind': 'mailbox',
                'tags': ['mailbox', 'birdhouse', 'house', 'bird']}
    if 'pot' in cat_lower or 'planter' in cat_lower:
        return {'group': category, 'category': 'props', 'biome': 'plains', 'kind': 'pot',
                'tags': ['pot', 'planter', 'flower', 'container']}
    if 'deco' in cat_lower or 'homey' in cat_lower or 'extra' in cat_lower or 'petal' in cat_lower:
        return {'group': category, 'category': 'props', 'biome': 'plains', 'kind': 'deco',
                'tags': ['decor', 'home', 'decoration', 'cozy']}
    return {'group': category, 'category': 'props', 'biome': 'plains', 'kind': 'prop',
            'tags': ['detail', 'decoration', 'cozy', 'spring']}


def extract_object_sprites(
    img: Image.Image,
    sheet_name: str,
    category: str,
) -> Tuple[List[Tuple[Image.Image, Tuple[int, int, int, int]]], int, int]:
    """Extract individual sprites from a prop sheet. Returns list of (cropped_img, bbox)."""
    if is_tileset_sheet(category):
        return [], 0, 0

    mask = build_alpha_mask(img)
    boxes, small_rej, giant_rej = extract_components(mask, img.size[0], img.size[1])
    results = []
    
    # Size constraints for valid props
    MIN_DIM = 16   # minimum width or height
    MAX_DIM = 256  # maximum width or height for non-trees
    MAX_TREE_DIM = 384  # maximum for trees
    MAX_ASPECT_RATIO = 5.0  # reject extreme aspect ratios
    
    for x0, y0, x1, y1 in boxes:
        # Compute crop dimensions BEFORE padding
        crop_w = x1 - x0 + 1
        crop_h = y1 - y0 + 1
        crop_area = crop_w * crop_h
        
        # Reject crops that are too small (likely artifacts)
        if crop_w < MIN_DIM or crop_h < MIN_DIM or crop_area < 96:
            small_rej += 1
            continue
        
        # Reject extreme aspect ratios (likely sheet artifacts or text)
        aspect_ratio = max(crop_w / crop_h if crop_h > 0 else 0, crop_h / crop_w if crop_w > 0 else 0)
        if aspect_ratio > MAX_ASPECT_RATIO:
            small_rej += 1
            continue
        
        # Check max dimensions
        # For now, don't enforce max dim on non-trees since some sheets might be larger
        # but still valid
        if crop_w > MAX_TREE_DIM or crop_h > MAX_TREE_DIM:
            continue
        
        pad_x0 = max(0, x0 - CROP_PAD_X)
        pad_y0 = max(0, y0 - CROP_PAD_Y)
        pad_x1 = min(img.size[0] - 1, x1 + CROP_PAD_X)
        pad_y1 = min(img.size[1] - 1, y1 + CROP_PAD_Y)
        crop = img.crop((pad_x0, pad_y0, pad_x1, pad_y1))
        results.append((crop, (x0, y0, pad_x1, pad_y1)))
    return results, small_rej, giant_rej


def sha256(img: Image.Image) -> str:
    return hashlib.sha256(img.tobytes()).hexdigest()


# ─── Unzip helpers ────────────────────────────────────────────────────────────

def log(tag: str, *args) -> None:
    print(f"[CozyImport:{tag}] {' '.join(str(a) for a in args)}", flush=True)


def die(msg: str) -> None:
    print(f"[CozyImport:FATAL] {msg}", file=sys.stderr, flush=True)
    sys.exit(1)


def is_zipfile_fast(path: Path) -> bool:
    """Lightweight ZIP magic-byte check without raising exceptions."""
    try:
        with open(path, "rb") as fh:
            return fh.read(4) == b"PK\x03\x04"
    except Exception:
        return False


LFS_POINTER_PREFIX = b"version https://git-lfs.github.com"


def check_file_header(path: Path, max_bytes: int = 120) -> bytes:
    """Return first max_bytes of a file without raising on binary."""
    try:
        with open(path, "rb") as fh:
            return fh.read(max_bytes)
    except Exception as exc:
        return f"<read error: {exc}>".encode()


def unzip_all(source_dir: Path, tmp_dir: Path) -> None:
    """Recursively unzip nested ZIPs from source_dir into tmp_dir.

    Validates every *.zip file with zipfile.is_zipfile before attempting to
    extract.  LFS-text-pointer stubs and other non-zip files are reported
    with a clear error — they are NOT deleted.
    """
    tmp_dir.mkdir(parents=True, exist_ok=True)
    round_idx = 0
    while round_idx < 5:
        all_files = list(source_dir.rglob("*"))
        # Only pick files ending in .zip (not directories that happen to be named *.zip)
        zips = [f for f in all_files if f.is_file() and f.suffix.lower() == ".zip"]
        if not zips:
            break
        for zf in zips:
            if not is_zipfile_fast(zf):
                header = check_file_header(zf, 120)
                is_lfs = header.startswith(LFS_POINTER_PREFIX)
                log(
                    "ERROR",
                    f"FILE IS NOT A VALID ZIP: {zf.relative_to(source_dir.parent)}",
                    f"first bytes: {header[:60]!r}",
                    "" if is_lfs else "(not an LFS pointer — raw content below)",
                )
                if is_lfs:
                    log(
                        "ERROR",
                        "Git LFS pointer detected.  Ensure checkout uses",
                        "  uses: actions/checkout@v4",
                        "    with:",
                        "      lfs: true",
                        "and run 'git lfs pull' before this step.",
                    )
                die("Invalid ZIP or Git LFS pointer found — cannot extract.")
            dest = tmp_dir / zf.stem
            try:
                with zipfile.ZipFile(zf, "r") as z:
                    z.extractall(dest)
            except zipfile.BadZipFile as exc:
                die(f"zipfile.BadZipFile for {zf}: {exc}")
            except Exception as exc:
                die(f"Unexpected error extracting {zf}: {exc}")
            # Only delete after we've successfully extracted it
            zf.unlink()
            log("UNZIP", f"{zf.relative_to(source_dir.parent)} -> {dest.name}/")
        round_idx += 1


# ─── Main ────────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="Extract Cozy Spring prop objects via connected components."
    )
    parser.add_argument("--inbox", type=Path, default=DEFAULT_INBOX,
                        help=f".asset-inbox/cozy-spring directory (default: {DEFAULT_INBOX})")
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT,
                        help=f"Output root for extracted assets (default: {DEFAULT_OUTPUT})")
    parser.add_argument("--tmp", type=Path, default=DEFAULT_TMP,
                        help=f"Temp extraction directory (default: {DEFAULT_TMP})")
    parser.add_argument("--force", action="store_true",
                        help="Overwrite existing output without prompting")
    parser.add_argument("--verbose", action="store_true",
                        help="Print per-sheet processing details")
    args = parser.parse_args()

    verbose = args.verbose

    if not args.inbox.is_dir():
        die(f"Inbox directory not found: {args.inbox}")

    log("START", f"inbox={args.inbox}")
    log("START", f"output={args.output}")
    log("START", f"tmp={args.tmp}")

    # ── 1. Validate top-level files in inbox ─────────────────────────────────
    raw_files = list(args.inbox.iterdir())
    log("SCAN", f"Inbox top-level entries ({len(raw_files)}):")
    for f in sorted(raw_files):
        log("SCAN", f"  {f.name}  ({'dir' if f.is_dir() else 'file'})")

    top_zips = [f for f in raw_files if f.is_file() and f.suffix.lower() == ".zip"]
    log("SCAN", f"Found {len(top_zips)} top-level *.zip files")
    if not top_zips:
        die(f"No .zip files found in inbox {args.inbox} — cannot proceed.")

    for zf in top_zips:
        if not is_zipfile_fast(zf):
            header = check_file_header(zf, 120)
            is_lfs = header.startswith(LFS_POINTER_PREFIX)
            log("ERROR", f"NOT A VALID ZIP: {zf.name}")
            log("ERROR", f"First bytes: {header[:60]!r}")
            if is_lfs:
                log("ERROR",
                    "Git LFS pointer detected.",
                    "  Fix: actions/checkout@v4 must use with: lfs: true",
                    "  Fix: run git lfs pull before this step")
            die("Invalid ZIP or LFS pointer found in inbox — import aborted.")

    # ── 2. Extract top-level and nested ZIPs ────────────────────────────────
    tmp = args.tmp
    if tmp.exists():
        shutil.rmtree(tmp)
    tmp.mkdir(parents=True, exist_ok=True)

    nested_zip_count = len(top_zips)

    for zf_path in top_zips:
        dest = tmp / zf_path.stem
        try:
            with zipfile.ZipFile(zf_path, "r") as z:
                z.extractall(dest)
            log("UNZIP", f"{zf_path.name} -> {dest.name}/")
        except zipfile.BadZipFile as exc:
            die(f"BadZipFile extracting top-level {zf_path.name}: {exc}")
        except Exception as exc:
            die(f"Error extracting top-level {zf_path.name}: {exc}")

    unzip_all(tmp, tmp)

    # ── 3. Discover PNGs and report diagnostics ────────────────────────────
    all_pngs = list(tmp.rglob("*.png"))
    for idx, p in enumerate(sorted(all_pngs)):
        size_kb = p.stat().st_size // 1024
        log("PNGDISCOVERY", f"  [{idx+1}/{len(all_pngs)}] {p.relative_to(tmp)}  ({size_kb} KB)")

    if not all_pngs:
        die(f"No PNG files found after extracting all ZIPs in {args.inbox} — cannot proceed.")
    log("SCAN", f"Total PNGs discovered: {len(all_pngs)}")

    input_png_count = len(all_pngs)
    log("STATS", f"nested zips: {nested_zip_count}")
    log("STATS", f"input pngs: {input_png_count}")

    # ── 4. Process each PNG ──────────────────────────────────────────────────
    stats = {
        'tileset_sources': 0,
        'prop_sheets_processed': 0,
        'object_sprites_extracted': 0,
        'skipped_fragments': 0,
        'skipped_whole_sheets': 0,
        'output_props': 0,
        'output_tilesets': 0,
    }

    master_entries: Dict = {}
    tileset_map: Dict = {}
    props_map: Dict = {}

    groups_dirs: Dict[str, Path] = {}
    group_entries: Dict[str, Dict] = {}

    for png_path in sorted(all_pngs):
        rel_from_tmp = png_path.relative_to(tmp).as_posix()
        # Category from zip folder name
        category_raw = png_path.parent.name or png_path.parent.parent.name or png_path.stem
        config = make_group_config(category_raw)
        group_slug = slug(config['group'])
        is_tileset = config['category'] == 'tilesets'

        if is_tileset:
            stats['tileset_sources'] += 1
            # Copy as tileset source directly
            tileset_dest = args.output / 'tilesets' / group_slug / 'files'
            tileset_dest.mkdir(parents=True, exist_ok=True)
            dest_file = tileset_dest / png_path.name
            # Convert RGBA -> RGBA (keep transparency)
            img = Image.open(png_path).convert('RGBA')
            img.save(dest_file)
            hash_val = sha256(img)
            prop_id = f"cozy_spring_{group_slug}_{png_path.stem}_{hash_val[:8]}"
            entry = {
                'id': prop_id,
                'src': f"/assets/cozy-spring/tilesets/{group_slug}/files/{png_path.name}",
                'source': 'SakPix_Cozy_Spring_Asset_Pack',
                'sourcePath': rel_from_tmp,
                'sourceName': png_path.name,
                'license': 'purchased-itchio-sakpix',
                'category': 'tilesets',
                'kind': config['kind'],
                'group': config['group'],
                'biome': config['biome'],
                'tags': [*config['tags'], 'tileset', 'cozy-spring'],
                'biomeTags': ['plains', 'spring', 'village', 'cozy'],
                'cultureTags': ['cozy', 'spring'],
                'sha256': hash_val,
                'bytes': dest_file.stat().st_size,
                'width': img.width,
                'height': img.height,
                'deterministic': True,
                'meta': {
                    'runtimeRole': 'tileSource',
                    'usableAsTile': True,
                    'usableAsProp': False,
                    'fragmentOnly': False,
                    'ySortAnchor': 'center',
                    'blocksMovement': ['tree', 'fence'].count(config['kind']) > 0,
                    'blocksVision': ['tree', 'fence'].count(config['kind']) > 0,
                },
            }
            tileset_map[prop_id] = entry
            master_entries[prop_id] = entry
            stats['output_tilesets'] += 1
            continue

        # Prop sheet → extract individual objects
        # SKIP deco/petal/ground-details sheets - these contain artifacts, not real props
        if should_skip_prop_export(category_raw):
            print(f"  [SKIP] Category '{category_raw}': skipping runtime prop export (artifact category)")
            continue

        stats['prop_sheets_processed'] += 1
        img = Image.open(png_path).convert('RGBA')
        extracted, small_rej, giant_rej = extract_object_sprites(img, png_path.stem, category_raw)

        stats['skipped_fragments'] += small_rej
        stats['skipped_whole_sheets'] += giant_rej

        if not extracted:
            print(f"  [WARN] Sheet {category_raw}: no objects extracted (mask empty or all rejected)")
            continue

        props_dest_dir = args.output / 'props' / group_slug / 'files'
        props_dest_dir.mkdir(parents=True, exist_ok=True)

        for obj_idx, (crop, bbox) in enumerate(extracted):
            stats['object_sprites_extracted'] += 1
            obj_hash = sha256(crop)
            safe_name = f"{png_path.stem}_obj{obj_idx:03d}_{obj_hash[:8]}.png"
            out_path = props_dest_dir / safe_name
            crop.save(out_path)

            obj_id = f"cozy_spring_{group_slug}_{png_path.stem}_obj{obj_idx:03d}_{obj_hash[:8]}"
            entry = {
                'id': obj_id,
                'src': f"/assets/cozy-spring/props/{group_slug}/files/{safe_name}",
                'source': 'SakPix_Cozy_Spring_Asset_Pack',
                'sourcePath': rel_from_tmp,
                'sourceName': png_path.name,
                'extractedFrom': png_path.name,
                'extractedBbox': [bbox[0], bbox[1], bbox[2], bbox[3]],
                'license': 'purchased-itchio-sakpix',
                'category': 'props',
                'kind': config['kind'],
                'group': config['group'],
                'biome': config['biome'],
                'tags': [*config['tags'], 'cozy-spring', 'propObject'],
                'biomeTags': ['plains', 'spring', 'village', 'cozy'],
                'cultureTags': ['cozy', 'spring'],
                'sha256': obj_hash,
                'bytes': out_path.stat().st_size,
                'width': crop.width,
                'height': crop.height,
                'deterministic': True,
                'meta': {
                    'runtimeRole': 'propObject',
                    'usableAsProp': True,
                    'usableAsTile': False,
                    'fragmentOnly': False,
                    'ySortAnchor': 'bottom',
                    'blocksMovement': ['tree', 'fence', 'bridge', 'bench', 'lamp', 'mailbox', 'pot', 'garden'].count(config['kind']) > 0,
                    'blocksVision': ['tree', 'fence'].count(config['kind']) > 0,
                },
            }
            props_map[obj_id] = entry
            master_entries[obj_id] = entry

    stats['output_props'] = len(props_map)
    stats['output_tilesets'] = len(tileset_map)

    # ── 3. Write manifest ──────────────────────────────────────────────────
    manifest = {
        'version': 3,
        'id': 'cozy_spring_master',
        'source': 'SakPix_Cozy_Spring_Asset_Pack',
        'deterministic': True,
        'importPolicy': 'tilesets-as-tiles-props-as-extracted-objects',
        'totalEntries': len(master_entries),
        'tilesets': tileset_map,
        'props': props_map,
        'entries': master_entries,
        'validation': {
            'noWholePropSheets': True,
            'noFragmentProps': True,
            'objectExtractor': 'connected-components-alpha',
            'alphaThreshold': ALPHA_THRESHOLD,
            'minArea': MIN_AREA,
            'minDim': f"{MIN_W}x{MIN_H}",
            'mergeDistance': MERGE_DISTANCE,
        },
    }

    args.output.mkdir(parents=True, exist_ok=True)
    manifest_path = args.output / 'manifest.json'
    with open(manifest_path, 'w') as f:
        json.dump(manifest, f, indent=2)
    f.close()

    readme = f'''# Cozy Spring Asset Pack

Imported from .asset-inbox/cozy-spring by scripts/extract-cozy-spring-objects.py.

Source: https://sakpix.itch.io/cozy-spring-asset-pack-top-down-pixel-art-tileset-300-assets

**Object Extraction Policy:**
- Props sheets: individual sprites extracted via connected-components on alpha mask
- Tileset sheets: used directly as tile sources

Total prop objects extracted: {stats['object_sprites_extracted']}
Total tileset sources: {stats['output_tilesets']}
Total files in manifest: {len(master_entries)}

License: purchased from itch.io / SakPix. Do not redistribute as an asset pack.
'''
    (args.output / 'README.md').write_text(readme)

    # ── 4. Print stats ──────────────────────────────────────────────────
    print(f"[CozyImport] nested zips: {nested_zip_count}")
    print(f"[CozyImport] input pngs: {input_png_count}")
    print(f"[CozyImport] tileset sources: {stats['tileset_sources']}")
    print(f"[CozyImport] prop sheets processed: {stats['prop_sheets_processed']}")
    print(f"[CozyImport] object sprites extracted: {stats['object_sprites_extracted']}")
    print(f"[CozyImport] skipped fragments: {stats['skipped_fragments']}")
    print(f"[CozyImport] skipped whole sheets as props: {stats['skipped_whole_sheets']}")
    print(f"[CozyImport] output props count: {stats['output_props']}")
    print(f"[CozyImport] output tilesets count: {stats['output_tilesets']}")
    print(f"[CozyImport] manifest written: {manifest_path}")

    # Cleanup tmp
    shutil.rmtree(tmp, ignore_errors=True)


if __name__ == "__main__":
    main()
