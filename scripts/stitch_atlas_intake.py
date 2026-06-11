#!/usr/bin/env python3
"""
scripts/stitch_atlas_intake.py

Deterministic Stitch 2.5D asset intake pipeline for Areloria/WASD.

Accepts a directory, a single image, or a ZIP. Supported input images:
PNG, JPG, JPEG, WEBP, BMP.

Pipeline:
source image -> classify -> deterministic assetId -> normalize frame size ->
PNG runtime sheet -> Pixi/TexturePacker atlas JSON -> preview -> manifest/report ->
apps/client-2d/public/2d-assets/stitch.
"""

from __future__ import annotations

import argparse
import hashlib
import io
import json
import math
import os
import re
import shutil
import sys
import zipfile
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

from PIL import Image, UnidentifiedImageError

SCRIPT_DIR = Path(__file__).parent.resolve()
ROOT = SCRIPT_DIR.parent

DEFAULT_INPUT_DIR = ROOT / "assets" / "raw" / "stitch"
DEFAULT_OUTPUT_DIR = ROOT / "assets" / "runtime" / "stitch"
DEFAULT_QUARANTINE_DIR = ROOT / "assets" / "quarantine" / "stitch"
CLIENT_STITCH_DIR = ROOT / "apps" / "client-2d" / "public" / "2d-assets" / "stitch"

SUPPORTED_IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".bmp"}
SUPPORTED_ARCHIVE_EXTENSIONS = {".zip"}
MAX_SOURCE_PIXELS = 96_000_000
MAX_FRAME_COUNT = 4096
PACK_SCHEMA_VERSION = 2

LEGACY_SUPPORTED_SIZES = [
    (1024, 128),
    (768, 128),
    (512, 128),
    (1024, 64),
    (512, 64),
    (256, 64),
    (1024, 256),
    (768, 256),
    (1536, 256),
]

CATEGORY_KEYWORDS = {
    "boss": ["boss", "king", "lord", "dragon", "titan", "world_boss"],
    "enemy": ["enemy", "monster", "skeleton", "ghost", "demon", "beast", "creature", "ghoul", "ravager", "zombie"],
    "hero": ["hero", "player", "warrior", "knight", "paladin", "ranger", "mage", "rogue"],
    "npc": ["npc", "villager", "merchant", "guard", "blacksmith", "farmer", "civilian"],
    "vfx": ["vfx", "effect", "magic", "spell", "fire", "ice", "lightning", "heal", "burst", "slash", "impact", "projectile"],
    "tile": ["tile", "tileset", "floor", "ground", "grass", "stone", "dirt", "path", "road", "wall", "terrain", "swamp"],
    "prop": ["prop", "decor", "tree", "rock", "furniture", "object", "gate", "pillar", "obelisk", "vegetation", "bush", "mushroom", "sign"],
    "item": ["item", "loot", "pickup", "treasure", "chest", "key", "potion", "sword", "axe", "staff", "bow", "ring", "amulet"],
    "equipment_overlay": ["equipment_overlay", "overlay", "helmet", "armor", "weapon", "shield", "boots", "gloves", "plate"],
    "ui": ["ui", "icon", "button", "panel", "hud", "menu", "cursor", "slot"],
}

CATEGORY_TARGET_FRAME_SIZE = {
    "boss": 256,
    "enemy": 128,
    "hero": 128,
    "npc": 128,
    "vfx": 128,
    "tile": 128,
    "prop": 128,
    "item": 64,
    "equipment_overlay": 128,
    "ui": 64,
    "unknown": 128,
}

PIVOT_MAP = {
    "boss": {"x": 0.5, "y": 0.82},
    "enemy": {"x": 0.5, "y": 0.82},
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


@dataclass(frozen=True)
class SourceAsset:
    source_path: str
    display_source_path: str
    data: bytes
    extension: str


def stable_hash(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def slugify_name(name: str) -> str:
    stem = os.path.splitext(name)[0].lower()
    stem = stem.replace("2.5d", "25d").replace("2_5d", "25d")
    chars = []

    for c in stem:
        if c.isalnum():
            chars.append(c)
        elif c in {"-", "_", " ", ".", "/", "\\"}:
            chars.append("_")

    slug = "".join(chars)
    slug = re.sub(r"_+", "_", slug).strip("_")
    return slug or "asset"


def clean_asset_slug(source_path: str, category: str) -> str:
    normalized = source_path.replace("\\", "/")
    parts = [p for p in normalized.split("/") if p]
    candidate = Path(parts[-1]).stem if parts else Path(normalized).stem

    if candidate.lower() in {"screen", "image", "sprite", "atlas", "sheet", "spritesheet", "output"} and len(parts) >= 2:
        candidate = parts[-2]

    candidate = candidate.lower()

    for prefix in [
        "sprite_atlas_sheet_for_a_2.5d_isometric_",
        "sprite_atlas_sheet_for_2.5d_isometric_",
        "sprite_sheet_for_a_2.5d_isometric_",
        "sprite_sheet_for_2.5d_isometric_",
        "a_2_5d_isometric_",
        "2_5d_isometric_",
        "25d_isometric_",
        "isometric_",
        "game_asset_",
        "asset_",
    ]:
        candidate = candidate.replace(prefix, "")

    candidate = re.sub(r"_style_[a-z0-9_\-\.]+$", "", candidate)
    slug = slugify_name(candidate)

    for prefix in (category, f"stitch_{category}", "stitch"):
        if slug.startswith(prefix + "_"):
            slug = slug[len(prefix) + 1 :]

    return slugify_name(slug)


def classify_asset(filename: str) -> str:
    lower = filename.replace("\\", "/").lower()

    for category, keywords in CATEGORY_KEYWORDS.items():
        if any(keyword in lower for keyword in keywords):
            return category

    return "unknown"


def classify_from_zip_path(zip_path: str) -> str:
    return classify_asset(zip_path)


def target_frame_size_for_category(category: str) -> int:
    return CATEGORY_TARGET_FRAME_SIZE.get(category, CATEGORY_TARGET_FRAME_SIZE["unknown"])


def resample_filter():
    try:
        return Image.Resampling.LANCZOS
    except AttributeError:
        return Image.LANCZOS


def detect_grid(width: int, height: int, category: str = "unknown", source_path: str = "") -> Optional[dict]:
    if width <= 0 or height <= 0:
        return None

    if not source_path and width == height:
        for sheet_size, frame_size in LEGACY_SUPPORTED_SIZES:
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

    lower = source_path.lower()

    explicit = re.search(r"(?:^|[_\-. /])(\d{1,3})x(\d{1,3})(?:[_\-. /]|$)", lower)
    if explicit:
        cols = int(explicit.group(1))
        rows = int(explicit.group(2))

        if cols > 0 and rows > 0 and width % cols == 0 and height % rows == 0:
            frame_width = width // cols
            frame_height = height // rows
            frame_count = cols * rows

            if 1 < frame_count <= MAX_FRAME_COUNT:
                return {
                    "columns": cols,
                    "rows": rows,
                    "frameWidth": frame_width,
                    "frameHeight": frame_height,
                    "sheetSize": width if width == height else None,
                    "sheetWidth": width,
                    "sheetHeight": height,
                    "frameCount": frame_count,
                    "source": "filename_grid",
                }

    explicit_frame = re.search(r"(?:frame|cell|sprite)[_\-. ]?(\d{2,4})", lower)
    if explicit_frame:
        frame = int(explicit_frame.group(1))

        if frame > 0 and width % frame == 0 and height % frame == 0:
            cols = width // frame
            rows = height // frame
            frame_count = cols * rows

            if 1 < frame_count <= MAX_FRAME_COUNT:
                return {
                    "columns": cols,
                    "rows": rows,
                    "frameWidth": frame,
                    "frameHeight": frame,
                    "sheetSize": width if width == height else None,
                    "sheetWidth": width,
                    "sheetHeight": height,
                    "frameCount": frame_count,
                    "source": "filename_frame",
                }

    sheet_tokens = ["sheet", "atlas", "spritesheet", "sprite_sheet", "walk", "run", "attack", "idle", "death", "die", "anim"]

    if not any(token in lower for token in sheet_tokens):
        return None

    preferred = [256, 128, 64, 32]
    target = target_frame_size_for_category(category)

    if target not in preferred:
        preferred.insert(0, target)

    candidates = []

    for frame in preferred:
        if width % frame == 0 and height % frame == 0:
            cols = width // frame
            rows = height // frame
            frame_count = cols * rows

            if 1 < frame_count <= MAX_FRAME_COUNT:
                candidates.append((abs(frame - target), frame_count, frame, cols, rows))

    if not candidates:
        return None

    _, frame_count, frame, cols, rows = sorted(candidates, key=lambda v: (v[0], v[1], v[2]))[0]

    return {
        "columns": cols,
        "rows": rows,
        "frameWidth": frame,
        "frameHeight": frame,
        "sheetSize": width if width == height else None,
        "sheetWidth": width,
        "sheetHeight": height,
        "frameCount": frame_count,
        "source": "heuristic_sheet",
    }


def image_has_alpha(img: Image.Image) -> bool:
    return img.mode in ("RGBA", "LA") or (img.mode == "P" and "transparency" in img.info)


def detect_corner_background(img: Image.Image) -> Optional[tuple[int, int, int]]:
    rgb = img.convert("RGB")
    w, h = rgb.size

    if w < 2 or h < 2:
        return None

    pixels = rgb.load()
    samples = [
        pixels[0, 0],
        pixels[w - 1, 0],
        pixels[0, h - 1],
        pixels[w - 1, h - 1],
    ]

    def dist(a, b):
        return abs(a[0] - b[0]) + abs(a[1] - b[1]) + abs(a[2] - b[2])

    base = samples[0]

    if all(dist(base, s) <= 24 for s in samples[1:]):
        return base

    return None


def cleanup_flat_background_alpha(img: Image.Image) -> tuple[Image.Image, dict]:
    rgba = img.convert("RGBA")
    result = {
        "attempted": False,
        "method": "none",
        "success": False,
        "remainingCheckerboardScore": 0,
    }

    if image_has_alpha(img):
        result.update({"method": "native_alpha", "success": True})
        return rgba, result

    bg = detect_corner_background(img)

    if bg is None:
        result.update({"method": "opaque_rgb_no_clear_background", "success": True})
        return rgba, result

    result.update({"attempted": True, "method": "corner_background_to_alpha"})

    pixels = rgba.load()
    w, h = rgba.size
    changed = 0
    tolerance = 30

    for y in range(h):
        for x in range(w):
            r, g, b, _a = pixels[x, y]
            d = abs(r - bg[0]) + abs(g - bg[1]) + abs(b - bg[2])

            if d <= tolerance:
                pixels[x, y] = (r, g, b, 0)
                changed += 1
            else:
                pixels[x, y] = (r, g, b, 255)

    result["success"] = changed > 0
    result["removedPixelRatio"] = round(changed / max(1, w * h), 6)

    return rgba, result


def pad_resize_to_frame(frame: Image.Image, target_w: int, target_h: int) -> Image.Image:
    rgba = frame.convert("RGBA")
    bbox = rgba.getbbox()
    cropped = rgba.crop(bbox) if bbox else rgba
    cw, ch = cropped.size

    if cw <= 0 or ch <= 0:
        return Image.new("RGBA", (target_w, target_h), (0, 0, 0, 0))

    scale = min(target_w / cw, target_h / ch)
    new_w = max(1, min(target_w, int(round(cw * scale))))
    new_h = max(1, min(target_h, int(round(ch * scale))))

    resized = cropped.resize((new_w, new_h), resample_filter())

    canvas = Image.new("RGBA", (target_w, target_h), (0, 0, 0, 0))
    canvas.alpha_composite(resized, ((target_w - new_w) // 2, (target_h - new_h) // 2))

    return canvas


def build_sheet(frames: list[Image.Image], frame_w: int, frame_h: int) -> tuple[Image.Image, int, int]:
    if not frames:
        frames = [Image.new("RGBA", (frame_w, frame_h), (0, 0, 0, 0))]

    frame_count = len(frames)
    cols = min(frame_count, max(1, math.ceil(math.sqrt(frame_count))))
    rows = math.ceil(frame_count / cols)

    sheet = Image.new("RGBA", (cols * frame_w, rows * frame_h), (0, 0, 0, 0))

    for idx, frame in enumerate(frames):
        x = (idx % cols) * frame_w
        y = (idx // cols) * frame_h
        sheet.alpha_composite(frame.convert("RGBA"), (x, y))

    return sheet, cols, rows


def extract_normalized_frames(img: Image.Image, grid: Optional[dict], category: str) -> tuple[list[Image.Image], dict]:
    target = target_frame_size_for_category(category)

    if grid:
        source_frames = []

        for row in range(grid["rows"]):
            for col in range(grid["columns"]):
                left = col * grid["frameWidth"]
                top = row * grid["frameHeight"]
                source_frames.append(img.crop((left, top, left + grid["frameWidth"], top + grid["frameHeight"])))

        normalized = [pad_resize_to_frame(frame, target, target) for frame in source_frames]

        return normalized, {
            "columns": grid["columns"],
            "rows": grid["rows"],
            "frameWidth": target,
            "frameHeight": target,
            "sourceFrameWidth": grid["frameWidth"],
            "sourceFrameHeight": grid["frameHeight"],
            "source": grid.get("source", "detected"),
            "frameCount": len(normalized),
        }

    return [pad_resize_to_frame(img, target, target)], {
        "columns": 1,
        "rows": 1,
        "frameWidth": target,
        "frameHeight": target,
        "sourceFrameWidth": img.width,
        "sourceFrameHeight": img.height,
        "source": "single_image_normalized",
        "frameCount": 1,
    }


def create_contact_sheet(frames: list[Image.Image], frame_width: int, frame_height: int, cols: int = 4) -> Image.Image:
    if not frames:
        return Image.new("RGBA", (frame_width, frame_height), (0, 0, 0, 0))

    rows = math.ceil(len(frames) / cols)
    sheet = Image.new("RGBA", (cols * frame_width, rows * frame_height), (0, 0, 0, 0))

    for idx, frame in enumerate(frames):
        x = (idx % cols) * frame_width
        y = (idx // cols) * frame_height
        sheet.alpha_composite(frame.convert("RGBA"), (x, y))

    return sheet


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
    pivot = PIVOT_MAP.get(category, PIVOT_MAP["unknown"])
    frames = {}

    for row in range(rows):
        for col in range(columns):
            frame_idx = row * columns + col
            frame_id = f"{asset_id}_frame_{frame_idx:04d}"

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
            "version": PACK_SCHEMA_VERSION,
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


def write_json(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)

    with open(path, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2, sort_keys=True)
        f.write("\n")


def create_source_report(
    source_path: str,
    asset_id: str,
    category: str,
    width: int,
    height: int,
    mode: str,
    has_alpha: bool,
    detected_grid: Optional[dict],
    normalized_grid: Optional[dict],
    alpha_cleanup: dict,
    status: str,
    warnings: list[str],
    source_sha: str,
    processed_sha: str,
) -> dict:
    return {
        "sourcePath": source_path,
        "assetId": asset_id,
        "category": category,
        "width": width,
        "height": height,
        "mode": mode,
        "hasAlpha": has_alpha,
        "detectedGrid": detected_grid,
        "normalizedGrid": normalized_grid,
        "alphaCleanup": alpha_cleanup,
        "status": status,
        "warnings": warnings,
        "sourceSha256": source_sha,
        "processedSha256": processed_sha,
    }


def save_quarantine(
    quarantine_dir: Path,
    asset_id: str,
    source: SourceAsset,
    reason: str,
    warnings: list[str],
    source_sha: str,
) -> None:
    qdir = quarantine_dir / asset_id
    qdir.mkdir(parents=True, exist_ok=True)

    safe_ext = source.extension if source.extension in SUPPORTED_IMAGE_EXTENSIONS else ".bin"

    with open(qdir / f"original{safe_ext}", "wb") as f:
        f.write(source.data)

    write_json(
        qdir / "reason.json",
        {
            "assetId": asset_id,
            "sourcePath": source.display_source_path,
            "reason": reason,
            "warnings": warnings,
            "sourceSha256": source_sha,
        },
    )


def process_asset(source: SourceAsset, output_dir: Path, quarantine_dir: Path) -> dict:
    source_sha = stable_hash(source.data)
    category = classify_asset(source.display_source_path)
    slug = clean_asset_slug(source.display_source_path, category)
    asset_id = f"stitch_{category}_{slug}_{source_sha[:10]}"

    try:
        img = Image.open(io.BytesIO(source.data))
        img.load()
    except (UnidentifiedImageError, OSError, ValueError) as exc:
        warnings = [f"Failed to open image: {exc}"]
        save_quarantine(quarantine_dir, asset_id, source, "unreadable_image", warnings, source_sha)

        return create_source_report(
            source.display_source_path,
            asset_id,
            category,
            0,
            0,
            "UNKNOWN",
            False,
            None,
            None,
            {"attempted": False, "method": "none", "success": False, "remainingCheckerboardScore": 0},
            "quarantined",
            warnings,
            source_sha,
            source_sha,
        )

    width, height = img.size
    mode = img.mode
    has_alpha = image_has_alpha(img)
    warnings: list[str] = []

    if width <= 0 or height <= 0:
        warnings.append("Image has invalid dimensions")

    if width * height > MAX_SOURCE_PIXELS:
        warnings.append(f"Image too large: {width}x{height} > {MAX_SOURCE_PIXELS} pixels")

    if warnings:
        save_quarantine(quarantine_dir, asset_id, source, "invalid_dimensions", warnings, source_sha)

        return create_source_report(
            source.display_source_path,
            asset_id,
            category,
            width,
            height,
            mode,
            has_alpha,
            None,
            None,
            {"attempted": False, "method": "none", "success": False, "remainingCheckerboardScore": 0},
            "quarantined",
            warnings,
            source_sha,
            source_sha,
        )

    rgba, alpha_cleanup = cleanup_flat_background_alpha(img)
    detected_grid = detect_grid(width, height, category=category, source_path=source.display_source_path)
    frames, normalized_grid = extract_normalized_frames(rgba, detected_grid, category)
    sheet, columns, rows = build_sheet(frames, normalized_grid["frameWidth"], normalized_grid["frameHeight"])

    normalized_grid = dict(normalized_grid)
    normalized_grid.update(
        {
            "columns": columns,
            "rows": rows,
            "frameCount": len(frames),
            "sheetWidth": sheet.width,
            "sheetHeight": sheet.height,
        }
    )

    buf = io.BytesIO()
    sheet.save(buf, format="PNG", optimize=True)
    processed_bytes = buf.getvalue()
    processed_sha = stable_hash(processed_bytes)

    asset_dir = output_dir / category / asset_id
    asset_dir.mkdir(parents=True, exist_ok=True)

    with open(asset_dir / f"{asset_id}.png", "wb") as f:
        f.write(processed_bytes)

    atlas = generate_atlas_json(
        asset_id,
        category,
        sheet.width,
        sheet.height,
        normalized_grid["frameWidth"],
        normalized_grid["frameHeight"],
        columns,
        rows,
        source_sha,
        processed_sha,
    )

    write_json(asset_dir / f"{asset_id}.atlas.json", atlas)

    preview = create_contact_sheet(
        frames[: min(16, len(frames))],
        normalized_grid["frameWidth"],
        normalized_grid["frameHeight"],
    )
    preview.save(asset_dir / f"{asset_id}.preview.png", optimize=True)

    return create_source_report(
        source.display_source_path,
        asset_id,
        category,
        width,
        height,
        mode,
        has_alpha,
        detected_grid,
        normalized_grid,
        alpha_cleanup,
        "accepted",
        warnings,
        source_sha,
        processed_sha,
    )


def is_image_path(path: str | Path) -> bool:
    return Path(str(path)).suffix.lower() in SUPPORTED_IMAGE_EXTENSIONS


def is_archive_path(path: str | Path) -> bool:
    return Path(str(path)).suffix.lower() in SUPPORTED_ARCHIVE_EXTENSIONS


def safe_relative_path(path: Path, root_path: Path) -> str:
    try:
        return path.relative_to(root_path).as_posix()
    except ValueError:
        return path.name


def collect_sources(input_path: Path) -> list[SourceAsset]:
    sources: list[SourceAsset] = []

    def add_image_file(path: Path, display_path: str) -> None:
        sources.append(
            SourceAsset(
                source_path=str(path),
                display_source_path=display_path,
                data=path.read_bytes(),
                extension=path.suffix.lower(),
            )
        )

    def add_zip_file(path: Path, display_prefix: str = "") -> None:
        with zipfile.ZipFile(path, "r") as zf:
            for name in sorted(zf.namelist()):
                if name.endswith("/"):
                    continue

                suffix = Path(name).suffix.lower()

                if suffix not in SUPPORTED_IMAGE_EXTENSIONS:
                    continue

                display = f"{display_prefix}{path.name}!/{name}" if display_prefix else f"{path.name}!/{name}"

                sources.append(
                    SourceAsset(
                        source_path=f"{path}!/{name}",
                        display_source_path=display,
                        data=zf.read(name),
                        extension=suffix,
                    )
                )

    if input_path.is_file():
        if is_archive_path(input_path):
            add_zip_file(input_path)
        elif is_image_path(input_path):
            add_image_file(input_path, input_path.name)
        else:
            raise ValueError(f"Unsupported input file: {input_path}")

    elif input_path.is_dir():
        for path in sorted(input_path.rglob("*"), key=lambda p: p.as_posix().lower()):
            if not path.is_file():
                continue

            rel = safe_relative_path(path, input_path)

            if is_image_path(path):
                add_image_file(path, rel)
            elif is_archive_path(path):
                add_zip_file(path, display_prefix=f"{rel}:")

    else:
        raise ValueError(f"Input path does not exist: {input_path}")

    unique: dict[tuple[str, str], SourceAsset] = {}

    for source in sources:
        unique[(source.display_source_path, stable_hash(source.data))] = source

    return [unique[k] for k in sorted(unique.keys(), key=lambda k: (k[0].lower(), k[1]))]


def generate_runtime_manifest(
    reports: list[dict],
    schema_version: int = PACK_SCHEMA_VERSION,
    pack_id: str = "stitch_25d_atlas_pack_001",
) -> dict:
    accepted = sorted(
        [r for r in reports if r["status"] == "accepted"],
        key=lambda r: (r["category"], r["assetId"], r["sourcePath"]),
    )

    quarantined = sorted(
        [r for r in reports if r["status"] == "quarantined"],
        key=lambda r: (r["category"], r["assetId"], r["sourcePath"]),
    )

    assets = []

    for report in accepted:
        category = report["category"]
        asset_id = report["assetId"]
        grid = report["normalizedGrid"] or report["detectedGrid"] or {}

        tags = sorted(
            set(
                [category]
                + [t for t in slugify_name(report["sourcePath"]).split("_") if len(t) > 2]
            )
        )

        assets.append(
            {
                "assetId": asset_id,
                "category": category,
                "displayName": asset_id.replace("stitch_", "").replace("_", " ").title(),
                "sourcePath": report["sourcePath"],
                "imagePath": f"{category}/{asset_id}/{asset_id}.png",
                "atlasPath": f"{category}/{asset_id}/{asset_id}.atlas.json",
                "previewPath": f"{category}/{asset_id}/{asset_id}.preview.png",
                "width": report["width"],
                "height": report["height"],
                "frameWidth": grid.get("frameWidth", 0),
                "frameHeight": grid.get("frameHeight", 0),
                "columns": grid.get("columns", 0),
                "rows": grid.get("rows", 0),
                "frameCount": grid.get("frameCount", 0),
                "pivot": PIVOT_MAP.get(category, PIVOT_MAP["unknown"]),
                "tags": tags,
                "sourceSha256": report["sourceSha256"],
                "processedSha256": report["processedSha256"],
                "status": "accepted",
            }
        )

    quarantine_summary = [
        {
            "assetId": r["assetId"],
            "category": r["category"],
            "sourcePath": r["sourcePath"],
            "reason": "not_processable",
            "warnings": r["warnings"],
            "sourceSha256": r["sourceSha256"],
        }
        for r in quarantined
    ]

    return {
        "schemaVersion": schema_version,
        "packId": pack_id,
        "generatedBy": "scripts/stitch_atlas_intake.py",
        "deterministic": True,
        "assetCount": len(assets),
        "quarantineCount": len(quarantine_summary),
        "assets": assets,
        "quarantine": quarantine_summary,
    }


def copy_runtime_to_client(output_dir: Path, client_dir: Path) -> None:
    client_dir.mkdir(parents=True, exist_ok=True)

    for item in sorted(output_dir.iterdir(), key=lambda p: p.name):
        target = client_dir / item.name

        if item.is_dir():
            shutil.copytree(item, target, dirs_exist_ok=True)
        else:
            shutil.copy2(item, target)


def write_json(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)

    with open(path, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2, sort_keys=True)
        f.write("\n")


def write_report(output_dir: Path, reports: list[dict]) -> None:
    write_json(
        output_dir / "report.json",
        {
            "schemaVersion": PACK_SCHEMA_VERSION,
            "generatedBy": "scripts/stitch_atlas_intake.py",
            "deterministic": True,
            "reports": sorted(
                reports,
                key=lambda r: (r["status"], r["category"], r["assetId"], r["sourcePath"]),
            ),
        },
    )


def run_intake(
    input_path: Path,
    output_dir: Path,
    quarantine_dir: Path,
    client_dir: Path,
    pack_id: str,
) -> int:
    print(f"Input: {input_path}")
    print(f"Output: {output_dir}")
    print(f"Quarantine: {quarantine_dir}")
    print(f"Client: {client_dir}")
    print(f"Pack ID: {pack_id}")
    print()

    output_dir.mkdir(parents=True, exist_ok=True)
    quarantine_dir.mkdir(parents=True, exist_ok=True)
    client_dir.mkdir(parents=True, exist_ok=True)

    sources = collect_sources(input_path)

    print(f"Discovered processable source images: {len(sources)}")

    reports: list[dict] = []

    for source in sources:
        print(f"  -> {source.display_source_path}")
        reports.append(process_asset(source, output_dir, quarantine_dir))

    manifest = generate_runtime_manifest(reports, pack_id=pack_id)

    write_json(output_dir / "manifest.json", manifest)
    write_report(output_dir, reports)
    copy_runtime_to_client(output_dir, client_dir)

    accepted = [r for r in reports if r["status"] == "accepted"]
    quarantined = [r for r in reports if r["status"] == "quarantined"]

    print()
    print("=" * 60)
    print("STITCH INTAKE SUMMARY")
    print("=" * 60)
    print(f"Total discovered: {len(sources)}")
    print(f"Accepted: {len(accepted)}")
    print(f"Quarantined: {len(quarantined)}")
    print(f"Manifest: {output_dir / 'manifest.json'}")
    print(f"Client manifest: {client_dir / 'manifest.json'}")

    if not sources:
        print("No supported images found. Nothing to process.")
        return 1

    by_category: dict[str, int] = {}

    for report in accepted:
        by_category[report["category"]] = by_category.get(report["category"], 0) + 1

    if by_category:
        print("Accepted assets by category:")

        for category in sorted(by_category):
            print(f"  {category}: {by_category[category]}")

    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description="Deterministic Stitch 2.5D Asset Intake Pipeline")
    parser.add_argument("--input", type=str, help="Input image, ZIP, or directory path")
    parser.add_argument("--output", type=str, help="Output directory")
    parser.add_argument("--pack-id", type=str, default="stitch_25d_atlas_pack_001", help="Pack ID for manifest")

    args = parser.parse_args()

    input_path = Path(args.input).resolve() if args.input else DEFAULT_INPUT_DIR
    output_dir = Path(args.output).resolve() if args.output else DEFAULT_OUTPUT_DIR

    try:
        return run_intake(
            input_path,
            output_dir,
            DEFAULT_QUARANTINE_DIR,
            CLIENT_STITCH_DIR,
            args.pack_id,
        )
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
