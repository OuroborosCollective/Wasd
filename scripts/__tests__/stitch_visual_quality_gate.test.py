#!/usr/bin/env python3
"""
scripts/__tests__/stitch_visual_quality_gate.test.py

Invariant tests for the Stitch visual-quality gate.

The gate protects the generated runtime manifest from accepting empty or nearly
empty processed PNG assets. Manual-review/reference-only/quarantine output may
exist elsewhere, but playable runtime assets must be visibly non-empty.
"""

from __future__ import annotations

import json
import sys
import tempfile
from pathlib import Path

from PIL import Image

SCRIPT_DIR = Path(__file__).parent.parent.parent.resolve()
sys.path.insert(0, str(SCRIPT_DIR))

from scripts.stitch_visual_quality_gate import validate_manifest_visual_quality  # noqa: E402


def test(condition: bool, message: str) -> bool:
    if condition:
        print(f"  PASS {message}")
        return True
    print(f"  FAIL {message}")
    return False


def count(result: bool, passed: int, failed: int) -> tuple[int, int]:
    return (passed + 1, failed) if result else (passed, failed + 1)


def write_json(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2, sort_keys=True)
        f.write("\n")


def write_asset_image(path: Path, visible_rect: tuple[int, int, int, int] | None) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    img = Image.new("RGBA", (128, 128), (0, 0, 0, 0))
    if visible_rect is not None:
        left, top, right, bottom = visible_rect
        for y in range(top, bottom):
            for x in range(left, right):
                img.putpixel((x, y), (255, 0, 0, 255))
    img.save(path)


def write_manifest(root: Path, asset_id: str, category: str = "enemy") -> Path:
    image_path = f"{category}/{asset_id}/{asset_id}.png"
    manifest_path = root / "manifest.json"
    write_json(
        manifest_path,
        {
            "schemaVersion": 3,
            "packId": "visual_gate_test",
            "deterministic": True,
            "assetCount": 1,
            "manualReviewCount": 0,
            "referenceOnlyCount": 0,
            "quarantineCount": 0,
            "assets": [
                {
                    "assetId": asset_id,
                    "category": category,
                    "displayName": asset_id,
                    "sourcePath": f"{asset_id}.png",
                    "imagePath": image_path,
                    "atlasPath": f"{category}/{asset_id}/{asset_id}.atlas.json",
                    "previewPath": f"{category}/{asset_id}/{asset_id}.preview.png",
                    "width": 128,
                    "height": 128,
                    "frameWidth": 128,
                    "frameHeight": 128,
                    "columns": 1,
                    "rows": 1,
                    "frameCount": 1,
                    "pivot": {"x": 0.5, "y": 1.0},
                    "sourceSha256": "source",
                    "processedSha256": "processed",
                    "status": "accepted",
                }
            ],
            "manualReview": [],
            "referenceOnly": [],
            "quarantine": [],
        },
    )
    return manifest_path


def run_tests() -> bool:
    passed = 0
    failed = 0

    print("\n=== stitch visual quality gate tests ===")
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        asset_id = "stitch_enemy_empty"
        manifest_path = write_manifest(root, asset_id)
        write_asset_image(root / "enemy" / asset_id / f"{asset_id}.png", None)
        errors = validate_manifest_visual_quality(manifest_path)
        passed, failed = count(test(any("no visible alpha pixels" in error for error in errors), "Empty accepted enemy asset is rejected"), passed, failed)

    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        asset_id = "stitch_vfx_tiny"
        manifest_path = write_manifest(root, asset_id, category="vfx")
        write_asset_image(root / "vfx" / asset_id / f"{asset_id}.png", (64, 64, 65, 65))
        errors = validate_manifest_visual_quality(manifest_path)
        passed, failed = count(test(any("visible pixels" in error or "visible ratio" in error for error in errors), "Tiny-pixel accepted vfx asset is rejected"), passed, failed)

    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        asset_id = "stitch_enemy_visible"
        manifest_path = write_manifest(root, asset_id)
        write_asset_image(root / "enemy" / asset_id / f"{asset_id}.png", (48, 48, 80, 96))
        errors = validate_manifest_visual_quality(manifest_path)
        passed, failed = count(test(errors == [], "Visible accepted enemy asset passes"), passed, failed)

    print("\n" + "=" * 50)
    print(f"RESULTS: {passed} passed, {failed} failed")
    print("=" * 50)
    return failed == 0


if __name__ == "__main__":
    success = run_tests()
    sys.exit(0 if success else 1)
