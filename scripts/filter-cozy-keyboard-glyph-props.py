#!/usr/bin/env python3
"""
Filter Cozy Spring keyboard-visible glyphs from runtime prop spawning.

The extractor may isolate letters, digits or punctuation from decorative sheets.
Those files should remain available for audit/UI/symbol use, but must not remain
in manifest.props where world prop/model spawners consume them.

This script is deterministic:
- no random IDs
- no timestamps
- sorted manifest maps
- stable reason codes
"""

import argparse
import json
import re
from pathlib import Path
from typing import Dict, Tuple

try:
    from PIL import Image
except ImportError:
    Image = None

KEYBOARD_SOURCE_HINTS = {
    "alphabet", "letter", "letters", "number", "numbers", "digit", "digits",
    "font", "fonts", "glyph", "glyphs", "keyboard", "keycap", "text",
    "punctuation", "ascii",
}

PUNCTUATION_NAMES = {
    "ampersand", "apostrophe", "asterisk", "at", "backslash", "bang", "colon",
    "comma", "dash", "dollar", "dot", "equal", "equals", "exclamation",
    "hash", "minus", "percent", "period", "plus", "question", "quote",
    "semicolon", "slash", "underscore",
}

AMBIGUOUS_TOKENS = {"character", "characters", "char", "chars", "sign", "signs", "symbol", "symbols"}


def slug_tokens(value: str):
    return [token for token in re.split(r"[^a-z0-9]+", str(value).lower()) if token]


def entry_text(entry: Dict) -> str:
    parts = [
        entry.get("id", ""),
        entry.get("sourceName", ""),
        entry.get("sourcePath", ""),
        entry.get("extractedFrom", ""),
        entry.get("group", ""),
        entry.get("kind", ""),
        " ".join(entry.get("tags", []) or []),
    ]
    return " ".join(str(part) for part in parts)


def looks_like_keyboard_source(entry: Dict) -> Tuple[bool, str]:
    tokens = set(slug_tokens(entry_text(entry)))
    tokens -= AMBIGUOUS_TOKENS

    if tokens.intersection(KEYBOARD_SOURCE_HINTS):
        return True, "keyboard_source_hint"

    if tokens.intersection(PUNCTUATION_NAMES):
        return True, "punctuation_source_hint"

    source_name = str(entry.get("sourceName") or entry.get("extractedFrom") or "")
    stem = Path(source_name).stem.lower()
    if re.fullmatch(r"[a-z0-9]", stem):
        return True, "single_ascii_source_name"

    return False, ""


def image_alpha_coverage(path: Path) -> float:
    if Image is None or not path.exists():
        return -1.0
    try:
        img = Image.open(path).convert("RGBA")
        width, height = img.size
        if width <= 0 or height <= 0:
            return -1.0
        alpha = img.getchannel("A")
        visible = sum(1 for value in alpha.tobytes() if value > 8)
        return visible / float(width * height)
    except Exception:
        return -1.0


def looks_like_standalone_glyph_shape(entry: Dict, output_root: Path) -> Tuple[bool, str]:
    src = str(entry.get("src") or "")
    rel = src.replace("/assets/cozy-spring/", "")
    image_path = output_root / rel

    width = int(entry.get("width") or 0)
    height = int(entry.get("height") or 0)
    if width <= 0 or height <= 0:
        return True, "keyboard_source_without_shape"

    if width > 96 or height > 96:
        return False, "too_large_for_keyboard_glyph"

    aspect = max(width / height if height else 0, height / width if width else 0)
    if aspect > 8.0:
        return True, "extreme_keyboard_like_aspect"

    coverage = image_alpha_coverage(image_path)
    if coverage >= 0 and coverage < 0.08:
        return True, "sparse_keyboard_like_alpha"

    return True, "keyboard_source_compact_sprite"


def should_filter(entry: Dict, output_root: Path) -> Tuple[bool, str]:
    source_match, source_reason = looks_like_keyboard_source(entry)
    if not source_match:
        return False, ""

    shape_match, shape_reason = looks_like_standalone_glyph_shape(entry, output_root)
    if not shape_match:
        return False, shape_reason

    return True, source_reason if shape_reason == "keyboard_source_compact_sprite" else f"{source_reason}:{shape_reason}"


def sort_map(input_map: Dict) -> Dict:
    return {key: input_map[key] for key in sorted(input_map)}


def main() -> None:
    parser = argparse.ArgumentParser(description="Mark Cozy keyboard glyph props as non-spawnable.")
    parser.add_argument("--manifest", type=Path, required=True)
    parser.add_argument("--output-root", type=Path, required=True)
    args = parser.parse_args()

    manifest = json.loads(args.manifest.read_text())
    props = manifest.get("props") or {}
    entries = manifest.get("entries") or {}

    kept_props = {}
    glyphs = manifest.get("glyphs") or {}
    filtered_count = 0

    for prop_id in sorted(props):
        entry = dict(props[prop_id])
        filtered, reason = should_filter(entry, args.output_root)

        if not filtered:
            kept_props[prop_id] = entry
            continue

        filtered_count += 1
        meta = dict(entry.get("meta") or {})
        meta.update({
            "runtimeRole": "glyphAsset",
            "usableAsProp": False,
            "usableAsTile": False,
            "fragmentOnly": True,
            "spawnPolicy": "never-world-prop",
            "filteredFromRuntimeProps": True,
            "filterReason": reason,
        })
        tags = sorted(set([*(entry.get("tags") or []), "glyph", "keyboard-visible", "non-spawnable"]))
        glyph_entry = {
            **entry,
            "category": "glyphs",
            "kind": "glyph",
            "tags": tags,
            "meta": meta,
        }
        glyphs[prop_id] = glyph_entry
        entries[prop_id] = glyph_entry

    manifest["props"] = sort_map(kept_props)
    manifest["glyphs"] = sort_map(glyphs)
    manifest["entries"] = sort_map(entries)
    manifest["totalEntries"] = len(manifest["entries"])
    manifest.setdefault("validation", {})["noKeyboardGlyphProps"] = True
    manifest.setdefault("validation", {})["keyboardGlyphFilter"] = {
        "policy": "letters-digits-punctuation-remain-as-glyph-assets-never-world-props",
        "filteredProps": filtered_count,
    }

    args.manifest.write_text(json.dumps(manifest, indent=2) + "\n")
    print(
        f"[CozyGlyphFilter] manifest={args.manifest} filteredProps={filtered_count} "
        f"remainingProps={len(manifest['props'])} glyphs={len(manifest['glyphs'])}"
    )


if __name__ == "__main__":
    main()
