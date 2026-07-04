#!/usr/bin/env python3
"""
scripts/stitch_visual_quality_gate.py

Deterministic visual-quality gate for Stitch runtime assets.

This script validates the generated runtime manifest and the actual PNG files
that would be consumed by the client. It is intentionally a post-intake gate:
the intake may still produce manualReview/referenceOnly/quarantine output, but
an accepted runtime asset is not allowed to be visually empty or nearly empty.

Runtime law:
- no wall-clock timestamps
- no randomness
- no network calls
- no mutation of source assets
- accepted assets must have visible alpha pixels
"""

from __future__ import annotations

import argparse
import json
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from PIL import Image, UnidentifiedImageError

DEFAULT_MANIFEST_PATH = Path("apps/client-2d/public/2d-assets/stitch/manifest.json")
MIN_RUNTIME_VISIBLE_RATIO = 0.001
MIN_RUNTIME_VISIBLE_PIXELS = 16
ALPHA_VISIBLE_THRESHOLD = 8


@dataclass(frozen=True)
class VisualAssetStats:
    width: int
    height: int
    visible_pixels: int
    total_pixels: int
    visible_ratio: float
    alpha_bbox: tuple[int, int, int, int] | None


@dataclass(frozen=True)
class VisualGateFinding:
    asset: dict[str, Any]
    message: str
    stats: VisualAssetStats | None


def read_json(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as f:
        payload = json.load(f)
    if not isinstance(payload, dict):
        raise ValueError(f"Manifest root must be an object: {path}")
    return payload


def write_json(path: Path, payload: dict[str, Any]) -> None:
    with path.open("w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2, sort_keys=True)
        f.write("\n")


def alpha_visual_stats(path: Path) -> VisualAssetStats:
    try:
        with Image.open(path) as img:
            rgba = img.convert("RGBA")
    except (FileNotFoundError, UnidentifiedImageError, OSError) as exc:
        raise ValueError(f"Cannot open runtime image {path}: {exc}") from exc

    width, height = rgba.size
    if width <= 0 or height <= 0:
        return VisualAssetStats(width, height, 0, 0, 0.0, None)

    alpha = rgba.getchannel("A")
    alpha_bbox = alpha.point(lambda value: 255 if value > ALPHA_VISIBLE_THRESHOLD else 0).getbbox()
    visible_pixels = sum(1 for value in alpha.getdata() if value > ALPHA_VISIBLE_THRESHOLD)
    total_pixels = width * height
    visible_ratio = float(visible_pixels) / float(total_pixels)

    return VisualAssetStats(width, height, visible_pixels, total_pixels, visible_ratio, alpha_bbox)


def collect_visual_quality_findings(
    manifest_path: Path,
    min_visible_ratio: float = MIN_RUNTIME_VISIBLE_RATIO,
    min_visible_pixels: int = MIN_RUNTIME_VISIBLE_PIXELS,
) -> list[VisualGateFinding]:
    manifest = read_json(manifest_path)
    manifest_dir = manifest_path.parent
    assets = manifest.get("assets", [])
    if not isinstance(assets, list):
        return [VisualGateFinding({}, "manifest.assets must be a list", None)]

    findings: list[VisualGateFinding] = []
    for asset in assets:
        if not isinstance(asset, dict):
            findings.append(VisualGateFinding({}, "manifest.assets contains a non-object entry", None))
            continue

        asset_id = str(asset.get("assetId", "<missing-assetId>"))
        status = asset.get("status")
        image_path_value = asset.get("imagePath")
        category = str(asset.get("category", "<missing-category>"))

        if status != "accepted":
            findings.append(VisualGateFinding(asset, f"{asset_id}: runtime manifest assets must all be accepted, got status={status!r}", None))
            continue

        if not isinstance(image_path_value, str) or not image_path_value:
            findings.append(VisualGateFinding(asset, f"{asset_id}: missing imagePath", None))
            continue

        image_path = manifest_dir / image_path_value
        try:
            stats = alpha_visual_stats(image_path)
        except ValueError as exc:
            findings.append(VisualGateFinding(asset, f"{asset_id}: {exc}", None))
            continue

        if stats.alpha_bbox is None:
            findings.append(VisualGateFinding(asset, f"{asset_id}: accepted {category} asset has no visible alpha pixels", stats))
            continue

        if stats.visible_pixels < min_visible_pixels:
            findings.append(
                VisualGateFinding(
                    asset,
                    f"{asset_id}: accepted {category} asset has only {stats.visible_pixels} visible pixels; minimum is {min_visible_pixels}",
                    stats,
                )
            )
            continue

        if stats.visible_ratio < min_visible_ratio:
            findings.append(
                VisualGateFinding(
                    asset,
                    f"{asset_id}: accepted {category} asset visible ratio {stats.visible_ratio:.6f} is below minimum {min_visible_ratio:.6f}",
                    stats,
                )
            )

    return findings


def validate_manifest_visual_quality(
    manifest_path: Path,
    min_visible_ratio: float = MIN_RUNTIME_VISIBLE_RATIO,
    min_visible_pixels: int = MIN_RUNTIME_VISIBLE_PIXELS,
) -> list[str]:
    return [finding.message for finding in collect_visual_quality_findings(manifest_path, min_visible_ratio, min_visible_pixels)]


def demote_invalid_accepted_assets(
    manifest_path: Path,
    min_visible_ratio: float = MIN_RUNTIME_VISIBLE_RATIO,
    min_visible_pixels: int = MIN_RUNTIME_VISIBLE_PIXELS,
) -> list[str]:
    manifest = read_json(manifest_path)
    assets = manifest.get("assets", [])
    if not isinstance(assets, list):
        raise ValueError("manifest.assets must be a list before demotion")

    findings = collect_visual_quality_findings(manifest_path, min_visible_ratio, min_visible_pixels)
    invalid_ids = {str(finding.asset.get("assetId")) for finding in findings if finding.asset}
    messages_by_id = {str(finding.asset.get("assetId")): finding.message for finding in findings if finding.asset}
    stats_by_id = {str(finding.asset.get("assetId")): finding.stats for finding in findings if finding.asset}

    if not invalid_ids:
        return []

    kept_assets: list[dict[str, Any]] = []
    demoted_rows: list[dict[str, Any]] = []
    existing_manual = manifest.get("manualReview", [])
    if not isinstance(existing_manual, list):
        existing_manual = []

    for asset in assets:
        if not isinstance(asset, dict):
            kept_assets.append(asset)
            continue

        asset_id = str(asset.get("assetId"))
        if asset_id not in invalid_ids:
            kept_assets.append(asset)
            continue

        stats = stats_by_id.get(asset_id)
        alpha_cleanup = {
            "method": "stitch_visual_quality_gate",
            "success": False,
            "visiblePixels": stats.visible_pixels if stats else 0,
            "totalPixels": stats.total_pixels if stats else 0,
            "visibleRatio": round(stats.visible_ratio, 6) if stats else 0.0,
            "alphaBBox": list(stats.alpha_bbox) if stats and stats.alpha_bbox is not None else None,
            "minVisiblePixels": min_visible_pixels,
            "minVisibleRatio": min_visible_ratio,
        }
        demoted_rows.append(
            {
                "assetId": asset_id,
                "category": asset.get("category", "unknown"),
                "sourcePath": asset.get("sourcePath", ""),
                "warnings": [messages_by_id.get(asset_id, "visual quality gate rejected accepted asset")],
                "sourceSha256": asset.get("sourceSha256", ""),
                "alphaCleanup": alpha_cleanup,
            }
        )

    manifest["assets"] = sorted(kept_assets, key=lambda row: (str(row.get("category", "")), str(row.get("assetId", "")), str(row.get("sourcePath", ""))) if isinstance(row, dict) else ("", "", ""))
    manifest["manualReview"] = sorted(existing_manual + demoted_rows, key=lambda row: (str(row.get("category", "")), str(row.get("assetId", "")), str(row.get("sourcePath", ""))) if isinstance(row, dict) else ("", "", ""))
    manifest["assetCount"] = len(manifest["assets"])
    manifest["manualReviewCount"] = len(manifest["manualReview"])

    write_json(manifest_path, manifest)
    return [messages_by_id[asset_id] for asset_id in sorted(invalid_ids)]


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate Stitch accepted runtime assets are visually non-empty")
    parser.add_argument("--manifest", type=Path, default=DEFAULT_MANIFEST_PATH, help="Path to generated Stitch manifest.json")
    parser.add_argument("--min-visible-ratio", type=float, default=MIN_RUNTIME_VISIBLE_RATIO)
    parser.add_argument("--min-visible-pixels", type=int, default=MIN_RUNTIME_VISIBLE_PIXELS)
    parser.add_argument("--demote-invalid-accepted", action="store_true", help="Move invalid accepted assets into manualReview before validating")
    args = parser.parse_args()

    if args.demote_invalid_accepted:
        demoted = demote_invalid_accepted_assets(
            args.manifest,
            min_visible_ratio=args.min_visible_ratio,
            min_visible_pixels=args.min_visible_pixels,
        )
        for message in demoted:
            print(f"Demoted accepted asset to manualReview: {message}")

    errors = validate_manifest_visual_quality(
        args.manifest,
        min_visible_ratio=args.min_visible_ratio,
        min_visible_pixels=args.min_visible_pixels,
    )

    if errors:
        print("Stitch visual quality gate failed:")
        for error in errors:
            print(f"  - {error}")
        return 1

    print("Stitch visual quality gate OK")
    return 0


if __name__ == "__main__":
    sys.exit(main())
