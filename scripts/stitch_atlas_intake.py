#!/usr/bin/env python3
"""
stitch-atlas-intake.py

Deterministic Stitch 2.5D asset atlas intake pipeline for Areloria/WASD.

ZIP input OR directory input → inspect → classify → validate → 
alpha cleanup → slice frames → generate atlas JSON → 
generate runtime manifest → quarantine bad sheets → 
create preview contact sheets → wire into /2d client.

Usage:
    python scripts/stitch_atlas_intake.py --input ./assets/raw/stitch/stitch_2.5d_enemy_sprite_atlas.zip
    python scripts/stitch_atlas_intake.py --input ./.asset-inbox/stitch/biomes
    python scripts/stitch_atlas_intake.py --input ./.asset-inbox/stitch --output ./assets/runtime/stitch

Requirements:
    pip install Pillow

No Canva for runtime processing. No Date.now, no Math.random, no UUIDs.
"""

import sys
import os
import json
import hashlib
import struct
import zipfile
from pathlib import Path
from PIL import Image
from typing import Optional

# -----------------------------------------------------------------------------
# Paths
# -----------------------------------------------------------------------------

SCRIPT_DIR = Path(__file__).parent.resolve()
ROOT = SCRIPT_DIR.parent

DEFAULT_INPUT_DIR = ROOT / "assets" / "raw" / "stitch"
DEFAULT_OUTPUT_DIR = ROOT / "assets" / "runtime" / "stitch"
DEFAULT_QUARANTINE_DIR = ROOT / "assets" / "quarantine" / "stitch"
DEFAULT_RAW_DIR = ROOT / "assets" / "raw" / "stitch"
CLIENT_STITCH_DIR = ROOT / "apps" / "client-2d" / "public" / "2d-assets" / "stitch"

# -----------------------------------------------------------------------------
# Deterministic naming helpers
# -----------------------------------------------------------------------------

def stable_hash(data: bytes) -> str:
    """SHA-256 content hash - deterministic, no randomness."""
    return hashlib.sha256(data).hexdigest()

def slugify_name(name: str) -> str:
    """Convert filename to lower-case snake_case slug."""
    # Remove extension
    name = os.path.splitext(name)[0]
    # Replace non-alphanumeric with underscore
    result = ""
    for c in name.lower():
        if c.isalnum():
            result += c
        elif c in "-_ ":
            result += "_"
    # Collapse multiple underscores
    while "__" in result:
        result = result.replace("__", "_")
    return result.strip("_")

# -----------------------------------------------------------------------------
# Category classification
# -----------------------------------------------------------------------------

CATEGORY_KEYWORDS = {
    "enemy": ["enemy", "monster", "skeleton", "ghost", "demon", "beast", "creature", "ghoul", "shadow_mage", "ravager"],
    "boss": ["boss", "king", "lord", "dragon", "titan"],
    "hero": ["hero", "warrior", "knight", "paladin", "ranger"],
    "npc": ["npc", "villager", "merchant", "guard", "guard_"],
    "vfx": ["vfx", "effect", "magic", "spell", "fire", "ice", "lightning", "heal", "burst", "slash", "impact"],
    "tile": ["tile", "floor", "ground", "grass", "stone", "dirt", "path", "ground_tiles"],
    "prop": ["prop", "decor", "tree", "rock", "furniture", "object", "gate", "pillar", "obelisk", "vegetation"],
    "item": ["item", "loot", "pickup", "treasure", "chest", "key"],
    "equipment_overlay": ["helmet", "armor", "weapon", "shield", "overlay", "equip"],
    "ui": ["ui", "icon", "button", "panel", "hud", "menu", "cursor"],
}

def classify_asset(filename: str) -> str:
    """Classify asset based on filename keywords."""
    lower = filename.lower()
    for category, keywords in CATEGORY_KEYWORDS.items():
        for kw in keywords:
            if kw in lower:
                return category
    return "unknown"

def classify_from_zip_path(zip_path: str) -> str:
    """Classify asset based on ZIP internal path (more descriptive)."""
    lower = zip_path.lower()
    
    # Equipment overlay (specific path segment)
    if "equipment_overlay" in lower:
        return "equipment_overlay"
    
    # Boss enemies (specific keyword)
    if "/boss_enemy_" in lower or "_boss_" in lower:
        return "boss"
    
    # Hero keywords (character paths)
    if any(kw in lower for kw in ["hero_character", "_hero_", "_rogue_", "_mystic_", "_veteran_", "_agile_"]):
        return "hero"
    
    # Tile keywords (floor tiles paths)
    if any(kw in lower for kw in ["floor_tiles", "transition_floor_tiles"]):
        return "tile"
    
    # VFX keywords (attack/effect paths)
    if any(kw in lower for kw in ["magic_attack", "melee_attack", "visceral_attack", "defense_shield", "attack_vfx"]):
        return "vfx"
    
    # Prop keywords (environment objects paths)
    if any(kw in lower for kw in ["environment_objects", "ancient_pillars", "frozen_obelisks", "massive_iron_gates", "destructible_environment"]):
        return "prop"
    
    # Enemy keywords (remaining enemies)
    if any(kw in lower for kw in ["/enemy_", "_enemy_", "_ghoulish", "_shadow_mage", "_skeleton_warrior", "_ravager"]):
        return "enemy"
    
    return "unknown"

# -----------------------------------------------------------------------------
# Grid detection
# -----------------------------------------------------------------------------

SUPPORTED_SIZES = [
    (1024, 128),  # 1024x1024 → 8x8 grid → 128x128 frames
    (768, 128),   # 768x768 → 6x6 grid → 128x128 frames  
    (512, 128),   # 512x512 → 4x4 grid → 128x128 frames
    (1024, 64),   # 1024x1024 → 16x16 grid → 64x64 frames
    (512, 64),    # 512x512 → 8x8 grid → 64x64 frames
    (256, 64),    # 256x256 → 4x4 grid → 64x64 frames
    (1024, 256),  # 1024x1024 → 4x4 grid → 256x256 frames
    (768, 256),   # 768x768 → 3x3 grid → 256x256 frames
]

def detect_grid(width: int, height: int) -> Optional[dict]:
    """Detect grid configuration from image dimensions. Returns None if invalid."""
    if width != height:
        return None
    
    for sheet_size, frame_size in SUPPORTED_SIZES:
        if width == sheet_size:
            cols = sheet_size // frame_size
            rows = sheet_size // frame_size
            return {
                "columns": cols,
                "rows": rows,
                "frameWidth": frame_size,
                "frameHeight": frame_size,
                "sheetSize": sheet_size,
                "frameCount": cols * rows,
            }
    return None

# -----------------------------------------------------------------------------
# Alpha cleanup (checkerboard background removal)
# -----------------------------------------------------------------------------

def detect_checkerboard_colors(img: Image.Image) -> tuple:
    """
    Detect the two primary checkerboard background colors.
    Returns (color1_rgb, color2_rgb) or None if not detected.
    """
    pixels = img.load()
    width, height = img.size
    
    # Sample corners and edges
    corners = [
        pixels[0, 0],
        pixels[width-1, 0],
        pixels[0, height-1],
        pixels[width-1, height-1],
        pixels[width//2, 0],
        pixels[width//2, height-1],
        pixels[0, height//2],
        pixels[width-1, height//2],
    ]
    
    # Group by similar colors
    color_buckets = {}
    for c in corners:
        key = (c[0] // 32, c[1] // 32, c[2] // 32)  # Quantize to 8 levels
        if key not in color_buckets:
            color_buckets[key] = []
        color_buckets[key].append(c)
    
    if len(color_buckets) >= 2:
        # Get the two most common buckets
        sorted_buckets = sorted(color_buckets.items(), key=lambda x: -len(x[1]))
        c1_avg = tuple(sum(c[i] for c in sorted_buckets[0][1]) // len(sorted_buckets[0][1]) for i in range(3))
        c2_avg = tuple(sum(c[i] for c in sorted_buckets[1][1]) // len(sorted_buckets[1][1]) for i in range(3))
        return (c1_avg, c2_avg)
    
    return None

def cleanup_checkerboard_alpha(img: Image.Image, threshold: float = 0.85) -> Image.Image:
    """
    Convert RGB checkerboard background to alpha channel.
    Returns RGBA image with checkerboard pixels made transparent.
    
    threshold: confidence required to consider a pixel as background
    """
    width, height = img.size
    
    # Create RGBA output
    rgba = img.convert("RGBA")
    r_pixels = rgba.load()
    
    # Detect checkerboard colors
    bg_colors = detect_checkerboard_colors(img)
    
    if not bg_colors:
        # No clear checkerboard - return as-is with full alpha
        return rgba
    
    c1, c2 = bg_colors
    
    # Calculate threshold distances
    for y in range(height):
        for x in range(width):
            p = r_pixels[x, y]
            r, g, b, a = p
            
            # Check if pixel is close to either background color
            dist1 = abs(r - c1[0]) + abs(g - c1[1]) + abs(b - c1[2])
            dist2 = abs(r - c2[0]) + abs(g - c2[1]) + abs(b - c2[2])
            
            # If close to either background color, make transparent
            if dist1 < 60 or dist2 < 60:
                r_pixels[x, y] = (r, g, b, 0)
            else:
                # Keep pixel but ensure it's opaque
                r_pixels[x, y] = (r, g, b, 255)
    
    return rgba

# -----------------------------------------------------------------------------
# Report structures
# -----------------------------------------------------------------------------

def create_source_report(
    source_path: str,
    asset_id: str,
    category: str,
    width: int,
    height: int,
    mode: str,
    has_alpha: bool,
    detected_grid: Optional[dict],
    alpha_cleanup: dict,
    status: str,
    warnings: list,
    source_sha: str,
    processed_sha: str,
) -> dict:
    """Create a StitchSourceImageReport structure."""
    return {
        "sourcePath": source_path,
        "assetId": asset_id,
        "category": category,
        "width": width,
        "height": height,
        "mode": mode,
        "hasAlpha": has_alpha,
        "detectedGrid": detected_grid,
        "alphaCleanup": alpha_cleanup,
        "status": status,
        "warnings": warnings,
        "sourceSha256": source_sha,
        "processedSha256": processed_sha,
    }

# -----------------------------------------------------------------------------
# Slice frames from sheet
# -----------------------------------------------------------------------------

def slice_frames(
    img: Image.Image,
    frame_width: int,
    frame_height: int,
    columns: int,
    rows: int,
    asset_id: str,
) -> list:
    """
    Slice a sprite sheet into individual frames.
    Returns list of (frame_index, frame_image) tuples.
    Frame order: row-major, top-left to bottom-right.
    """
    frames = []
    for row in range(rows):
        for col in range(columns):
            frame_idx = row * columns + col
            left = col * frame_width
            top = row * frame_height
            frame = img.crop((left, top, left + frame_width, top + frame_height))
            frames.append((frame_idx, frame))
    return frames

# -----------------------------------------------------------------------------
# Generate atlas JSON (TexturePacker/Pixi compatible)
# -----------------------------------------------------------------------------

def generate_atlas_json(
    asset_id: str,
    category: str,
    sheet_width: int,
    sheet_height: int,
    frame_width: int,
    frame_height: int,
    columns: int,
    rows: int,
    source_sha: str,
    processed_sha: str,
) -> dict:
    """Generate TexturePacker/Pixi-compatible atlas JSON."""
    
    # Pivot by category
    pivot_map = {
        "enemy": {"x": 0.5, "y": 0.82},
        "boss": {"x": 0.5, "y": 0.82},
        "hero": {"x": 0.5, "y": 0.82},
        "npc": {"x": 0.5, "y": 0.82},
        "vfx": {"x": 0.5, "y": 0.5},
        "tile": {"x": 0.5, "y": 0.5},
        "prop": {"x": 0.5, "y": 0.9},
        "item": {"x": 0.5, "y": 0.5},
        "equipment_overlay": {"x": 0.5, "y": 0.5},
        "ui": {"x": 0.5, "y": 0.5},
        "unknown": {"x": 0.5, "y": 0.5},
    }
    pivot = pivot_map.get(category, {"x": 0.5, "y": 0.5})
    
    frames = {}
    for row in range(rows):
        for col in range(columns):
            frame_idx = row * columns + col
            frame_id = f"{asset_id}_frame_{frame_idx:03d}"
            frame_name = f"{asset_id}.png"  # Single sheet, same image
            
            frames[frame_id] = {
                "frame": {
                    "x": col * frame_width,
                    "y": row * frame_height,
                    "w": frame_width,
                    "h": frame_height,
                },
                "rotated": False,
                "trimmed": False,
                "spriteSourceSize": {
                    "x": 0,
                    "y": 0,
                    "w": frame_width,
                    "h": frame_height,
                },
                "sourceSize": {
                    "w": frame_width,
                    "h": frame_height,
                },
                "pivot": pivot,
            }
    
    return {
        "meta": {
            "app": "areloria-stitch-atlas-intake",
            "version": 1,
            "image": f"{asset_id}.png",
            "format": "RGBA8888",
            "size": {"w": sheet_width, "h": sheet_height},
            "scale": "1",
            "assetId": asset_id,
            "category": category,
            "sourceSha256": source_sha,
            "processedSha256": processed_sha,
        },
        "frames": frames,
    }

# -----------------------------------------------------------------------------
# Process a single PNG file
# -----------------------------------------------------------------------------

def process_png(
    png_path: Path,
    output_dir: Path,
    quarantine_dir: Path,
    category_override: Optional[str] = None,
    zip_path: Optional[str] = None,
    seen_ids: Optional[dict] = None,
) -> dict:
    """Process a single PNG file. Returns report dict."""
    
    # Use ZIP path for better classification and naming
    classification_source = zip_path or png_path.name
    
    if category_override:
        category = category_override
    else:
        category = classify_from_zip_path(classification_source)
        if category == "unknown":
            category = classify_asset(classification_source)
    
    # Extract meaningful name from ZIP path
    if zip_path:
        # e.g., "stitch_2.5d_enemy_sprite_atlas/sprite_atlas_sheet_for_a_2.5d_isometric_enemy_skeleton_warrior._style_dark_1/screen.png"
        parts = zip_path.split("/")
        folder = parts[1] if len(parts) > 1 else parts[0]  # folder name
        
        # Extract variant number if present (_style_dark_1, _style_dark_2)
        variant = ""
        import re
        variant_match = re.search(r'_style_dark_(\d+)$', folder)
        if variant_match:
            variant = f"_{variant_match.group(1)}"
        
        # Remove common prefixes
        name = folder
        name = name.replace("sprite_atlas_sheet_for_a_2.5d_isometric_", "")
        name = name.replace("sprite_atlas_sheet_for_2.5d_isometric_", "")
        name = re.sub(r'_style_dark.*$', '', name)  # Remove all _style_dark* suffixes
        name = name.replace("a_2_5d_isometric_", "")
        name = name.replace("2_5d_", "")
        name = name.replace("_", " ")
        name = name.strip()
        # Create slug
        asset_slug = slugify_name(name.replace(" ", "_"))
        # Remove category prefix from slug if present (avoid "enemy_enemy_...", "overlay_overlay_...")
        if asset_slug.startswith(category + "_"):
            asset_slug = asset_slug[len(category) + 1:]
        # Also remove "equipment_overlays" -> just "equipment" 
        if asset_slug.startswith("equipment_overlays_"):
            asset_slug = asset_slug[len("equipment_overlays_"):]
        # Add variant suffix if present
        if variant:
            asset_slug = f"{asset_slug}{variant}"
    else:
        asset_slug = slugify_name(png_path.stem)
    
    asset_id = f"stitch_{category}_{asset_slug}"
    
    # Handle duplicates by appending a counter suffix
    if seen_ids is not None:
        if asset_id in seen_ids:
            seen_ids[asset_id] += 1
            asset_id = f"{asset_id}_{seen_ids[asset_id]}"
        else:
            seen_ids[asset_id] = 0
    
    # Read source data for SHA
    with open(png_path, "rb") as f:
        source_data = f.read()
    source_sha = stable_hash(source_data)
    
    # Open image
    try:
        img = Image.open(png_path)
    except Exception as e:
        return create_source_report(
            source_path=str(png_path),
            asset_id=asset_id,
            category="unknown",
            width=0,
            height=0,
            mode="UNKNOWN",
            has_alpha=False,
            detected_grid=None,
            alpha_cleanup={"attempted": False, "method": "none", "success": False, "remainingCheckerboardScore": 0},
            status="quarantined",
            warnings=[f"Failed to open image: {str(e)}"],
            source_sha=source_sha,
        )
    
    width, height = img.size
    mode = img.mode
    has_alpha = mode in ("RGBA", "LA") or (img.mode == "P" and "transparency" in img.info)
    
    # Detect grid
    grid = detect_grid(width, height)
    
    warnings = []
    if not grid:
        warnings.append(f"No valid grid detected for {width}x{height}")
        # Quarantine
        quarantine_path = quarantine_dir / asset_id
        quarantine_path.mkdir(parents=True, exist_ok=True)
        
        # Copy original
        img.save(quarantine_path / "original.png")
        
        # Write reason
        reason = {
            "assetId": asset_id,
            "sourcePath": str(png_path),
            "reason": "invalid_grid",
            "warnings": warnings,
            "suggestedFix": "manual_crop_or_regenerate",
        }
        with open(quarantine_path / "reason.json", "w") as f:
            json.dump(reason, f, indent=2)
        
        return create_source_report(
            source_path=str(png_path),
            asset_id=asset_id,
            category=category_override or classify_asset(filename),
            width=width,
            height=height,
            mode=mode,
            has_alpha=has_alpha,
            detected_grid=None,
            alpha_cleanup={"attempted": False, "method": "none", "success": False, "remainingCheckerboardScore": 0},
            status="quarantined",
            warnings=warnings,
            source_sha=source_sha,
        )
    
    # Category (already determined above)
    
    # Alpha cleanup if RGB
    alpha_cleanup_result = {"attempted": False, "method": "none", "success": False, "remainingCheckerboardScore": 0}
    processed_img = img
    
    if mode == "RGB":
        # Attempt alpha cleanup
        alpha_cleanup_result["attempted"] = True
        alpha_cleanup_result["method"] = "checkerboard_detection"
        try:
            processed_img = cleanup_checkerboard_alpha(img)
            alpha_cleanup_result["success"] = True
        except Exception as e:
            alpha_cleanup_result["success"] = False
            warnings.append(f"Alpha cleanup failed: {str(e)}")
    elif mode == "RGBA":
        alpha_cleanup_result["method"] = "native_rgba"
        alpha_cleanup_result["success"] = True
    else:
        alpha_cleanup_result["method"] = f"mode_{mode}_unsupported"
        warnings.append(f"Image mode {mode} may have issues")
    
    # Calculate processed SHA
    import io
    buf = io.BytesIO()
    processed_img.save(buf, format="PNG")
    processed_data = buf.getvalue()
    processed_sha = stable_hash(processed_data)
    
    # Slice frames
    frames = slice_frames(
        processed_img,
        grid["frameWidth"],
        grid["frameHeight"],
        grid["columns"],
        grid["rows"],
        asset_id,
    )
    
    # Save processed sheet
    asset_dir = output_dir / category / asset_id
    asset_dir.mkdir(parents=True, exist_ok=True)
    
    processed_img.save(asset_dir / f"{asset_id}.png")
    
    # Save atlas JSON
    atlas = generate_atlas_json(
        asset_id=asset_id,
        category=category,
        sheet_width=width,
        sheet_height=height,
        frame_width=grid["frameWidth"],
        frame_height=grid["frameHeight"],
        columns=grid["columns"],
        rows=grid["rows"],
        source_sha=source_sha,
        processed_sha=processed_sha,
    )
    
    with open(asset_dir / f"{asset_id}.atlas.json", "w") as f:
        json.dump(atlas, f, indent=2)
    
    # Save preview (first 4 frames in a contact sheet)
    preview = create_contact_sheet(frames[:min(16, len(frames))], grid["frameWidth"], grid["frameHeight"])
    preview.save(asset_dir / f"{asset_id}.preview.png")
    
    return create_source_report(
        source_path=str(png_path),
        asset_id=asset_id,
        category=category,
        width=width,
        height=height,
        mode=mode,
        has_alpha=has_alpha,
        detected_grid=grid,
        alpha_cleanup=alpha_cleanup_result,
        status="accepted",
        warnings=warnings,
        source_sha=source_sha,
        processed_sha=processed_sha,
    )

# -----------------------------------------------------------------------------
# Create contact sheet
# -----------------------------------------------------------------------------

def create_contact_sheet(frames: list, frame_width: int, frame_height: int, cols: int = 4) -> Image.Image:
    """Create a contact sheet from a list of frames."""
    rows = (len(frames) + cols - 1) // cols
    
    sheet_width = cols * frame_width
    sheet_height = rows * frame_height
    
    sheet = Image.new("RGBA", (sheet_width, sheet_height), (0, 0, 0, 255))
    
    for idx, (frame_idx, frame) in enumerate(frames):
        row = idx // cols
        col = idx % cols
        x = col * frame_width
        y = row * frame_height
        sheet.paste(frame, (x, y))
    
    return sheet

# -----------------------------------------------------------------------------
# Generate runtime manifest
# -----------------------------------------------------------------------------

def generate_runtime_manifest(
    reports: list,
    schema_version: int = 1,
    pack_id: str = "stitch_25d_atlas_pack_001",
) -> dict:
    """Generate the StitchRuntimeManifest."""
    
    accepted = [r for r in reports if r["status"] == "accepted"]
    quarantined = [r for r in reports if r["status"] == "quarantined"]
    
    # Sort entries by category, then assetId, then sourcePath
    def sort_key(r):
        return (r["category"], r["assetId"], r["sourcePath"])
    
    accepted_sorted = sorted(accepted, key=sort_key)
    
    # Build assets list
    assets = []
    for r in accepted_sorted:
        grid = r["detectedGrid"]
        # Determine image/atlas/preview paths
        category = r["category"]
        asset_id = r["assetId"]
        
        # Path relative to output dir
        image_path = f"{category}/{asset_id}/{asset_id}.png"
        atlas_path = f"{category}/{asset_id}/{asset_id}.atlas.json"
        preview_path = f"{category}/{asset_id}/{asset_id}.preview.png"
        
        assets.append({
            "assetId": r["assetId"],
            "category": r["category"],
            "displayName": r["assetId"].replace("stitch_", "").replace("_", " ").title(),
            "sourcePath": r["sourcePath"],
            "imagePath": image_path,
            "atlasPath": atlas_path,
            "previewPath": preview_path,
            "width": r["width"],
            "height": r["height"],
            "frameWidth": grid["frameWidth"] if grid else 0,
            "frameHeight": grid["frameHeight"] if grid else 0,
            "columns": grid["columns"] if grid else 0,
            "rows": grid["rows"] if grid else 0,
            "frameCount": grid["frameCount"] if grid else 0,
            "pivot": {"x": 0.5, "y": 0.5},  # Will be updated per category
            "tags": [r["category"]],
            "sourceSha256": r["sourceSha256"],
            "processedSha256": r.get("processedSha256", r["sourceSha256"]),
            "status": "accepted",
        })
    
    # Update pivots by category
    pivot_map = {
        "enemy": {"x": 0.5, "y": 0.82},
        "boss": {"x": 0.5, "y": 0.82},
        "hero": {"x": 0.5, "y": 0.82},
        "npc": {"x": 0.5, "y": 0.82},
        "vfx": {"x": 0.5, "y": 0.5},
        "tile": {"x": 0.5, "y": 0.5},
        "prop": {"x": 0.5, "y": 0.9},
    }
    for a in assets:
        if a["category"] in pivot_map:
            a["pivot"] = pivot_map[a["category"]]
    
    # Quarantine summary
    quarantine_summary = []
    for r in quarantined:
        quarantine_summary.append({
            "assetId": r["assetId"],
            "sourcePath": r["sourcePath"],
            "reason": "invalid_grid",
            "warnings": r["warnings"],
        })
    
    return {
        "schemaVersion": schema_version,
        "packId": pack_id,
        "generatedBy": "scripts/stitch_atlas_intake.py",
        "deterministic": True,
        "assets": assets,
        "quarantine": quarantine_summary,
    }

# -----------------------------------------------------------------------------
# Main processing
# -----------------------------------------------------------------------------

def process_zip(input_path: Path, output_dir: Path, quarantine_dir: Path) -> list:
    """Process a ZIP file containing PNG assets."""
    reports = []
    seen_ids = {}  # Track asset IDs to handle duplicates
    
    with zipfile.ZipFile(input_path, "r") as zf:
        for name in sorted(zf.namelist()):  # Stable sorted traversal
            if not name.lower().endswith(".png"):
                continue
            
            try:
                data = zf.read(name)
                import io
                img = Image.open(io.BytesIO(data))
                
                # Save to temp file for processing
                import tempfile
                with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp:
                    tmp.write(data)
                    tmp_path = Path(tmp.name)
                
                try:
                    report = process_png(tmp_path, output_dir, quarantine_dir, zip_path=name, seen_ids=seen_ids)
                    reports.append(report)
                finally:
                    os.unlink(tmp_path)
                    
            except Exception as e:
                reports.append({
                    "sourcePath": name,
                    "assetId": f"stitch_unknown_{slugify_name(name)}",
                    "category": "unknown",
                    "width": 0,
                    "height": 0,
                    "mode": "UNKNOWN",
                    "hasAlpha": False,
                    "detectedGrid": None,
                    "alphaCleanup": {"attempted": False, "method": "none", "success": False, "remainingCheckerboardScore": 0},
                    "status": "quarantined",
                    "warnings": [f"Failed to process: {str(e)}"],
                    "sourceSha256": stable_hash(b"error"),
                })
    
    return reports

def process_directory(input_path: Path, output_dir: Path, quarantine_dir: Path) -> list:
    """Process a directory containing PNG assets."""
    reports = []
    
    # Find all PNG files
    png_files = list(input_path.rglob("*.png"))
    png_files.sort()  # Stable sorted traversal
    
    for png_path in png_files:
        try:
            report = process_png(png_path, output_dir, quarantine_dir)
            reports.append(report)
        except Exception as e:
            reports.append({
                "sourcePath": str(png_path),
                "assetId": f"stitch_unknown_{slugify_name(png_path.name)}",
                "category": "unknown",
                "width": 0,
                "height": 0,
                "mode": "UNKNOWN",
                "hasAlpha": False,
                "detectedGrid": None,
                "alphaCleanup": {"attempted": False, "method": "none", "success": False, "remainingCheckerboardScore": 0},
                "status": "quarantined",
                "warnings": [f"Failed to process: {str(e)}"],
                "sourceSha256": stable_hash(b"error"),
            })
    
    return reports

# -----------------------------------------------------------------------------
# CLI
# -----------------------------------------------------------------------------

def main():
    import argparse
    
    parser = argparse.ArgumentParser(description="Stitch 2.5D Atlas Intake Pipeline")
    parser.add_argument("--input", type=str, help="Input ZIP or directory path")
    parser.add_argument("--output", type=str, help="Output directory (default: assets/runtime/stitch)")
    parser.add_argument("--pack-id", type=str, default="stitch_25d_atlas_pack_001", help="Pack ID for manifest")
    
    args = parser.parse_args()
    
    # Determine input path
    if args.input:
        input_path = Path(args.input).resolve()
    else:
        input_path = DEFAULT_INPUT_DIR
    
    # Output directory
    output_dir = Path(args.output).resolve() if args.output else DEFAULT_OUTPUT_DIR
    
    # Quarantine directory
    quarantine_dir = DEFAULT_QUARANTINE_DIR
    
    # Create directories
    output_dir.mkdir(parents=True, exist_ok=True)
    quarantine_dir.mkdir(parents=True, exist_ok=True)
    
    print(f"Input: {input_path}")
    print(f"Output: {output_dir}")
    print(f"Quarantine: {quarantine_dir}")
    print()
    
    # Process
    if input_path.suffix.lower() == ".zip":
        print("Processing ZIP file...")
        reports = process_zip(input_path, output_dir, quarantine_dir)
    elif input_path.is_dir():
        print("Processing directory...")
        reports = process_directory(input_path, output_dir, quarantine_dir)
    else:
        print(f"Error: Input path {input_path} is neither a ZIP nor a directory")
        return 1
    
    # Generate manifest
    manifest = generate_runtime_manifest(reports, pack_id=args.pack_id)
    
    # Save manifest
    manifest_path = output_dir / "manifest.json"
    with open(manifest_path, "w") as f:
        json.dump(manifest, f, indent=2)
    
    # Save report
    report_path = output_dir / "report.json"
    with open(report_path, "w") as f:
        json.dump({"schemaVersion": 1, "generatedBy": "scripts/stitch_atlas_intake.py", "reports": reports}, f, indent=2)
    
    # Copy to client directory (manifest + all processed assets)
    client_dir = CLIENT_STITCH_DIR
    client_dir.mkdir(parents=True, exist_ok=True)
    import shutil
    
    # Copy manifest
    shutil.copy(manifest_path, client_dir / "manifest.json")
    
    # Copy all processed assets by category
    for category_dir in output_dir.iterdir():
        if category_dir.is_dir() and category_dir.name not in ["manifest.json", "report.json"]:
            target_category = client_dir / category_dir.name
            target_category.mkdir(parents=True, exist_ok=True)
            for asset_dir in category_dir.iterdir():
                if asset_dir.is_dir():
                    target_asset = target_category / asset_dir.name
                    target_asset.mkdir(parents=True, exist_ok=True)
                    for f in asset_dir.iterdir():
                        shutil.copy2(f, target_asset / f.name)
    
    # Summary
    accepted = [r for r in reports if r["status"] == "accepted"]
    quarantined = [r for r in reports if r["status"] == "quarantined"]
    
    print()
    print("=" * 60)
    print("INTAKE SUMMARY")
    print("=" * 60)
    print(f"Total processed: {len(reports)}")
    print(f"Accepted: {len(accepted)}")
    print(f"Quarantined: {len(quarantined)}")
    print()
    print(f"Manifest: {manifest_path}")
    print(f"Report: {report_path}")
    print(f"Client manifest: {client_dir / 'manifest.json'}")
    print()
    
    if accepted:
        print("Accepted assets by category:")
        by_cat = {}
        for r in accepted:
            cat = r["category"]
            if cat not in by_cat:
                by_cat[cat] = []
            by_cat[cat].append(r["assetId"])
        for cat, assets in sorted(by_cat.items()):
            print(f"  {cat}: {len(assets)} assets")
            for a in assets[:3]:
                print(f"    - {a}")
            if len(assets) > 3:
                print(f"    ... and {len(assets) - 3} more")
    
    return 0

if __name__ == "__main__":
    sys.exit(main())