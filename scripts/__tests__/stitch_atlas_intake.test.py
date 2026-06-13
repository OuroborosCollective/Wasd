#!/usr/bin/env python3
"""
scripts/__tests__/stitch_atlas_intake.test.py

Tests for the universal deterministic Stitch 2.5D asset intake pipeline.

Run with:
    python3 scripts/__tests__/stitch_atlas_intake.test.py
"""

from __future__ import annotations

import json
import re
import sys
import tempfile
import zipfile
from pathlib import Path

from PIL import Image

SCRIPT_DIR = Path(__file__).parent.parent.parent.resolve()
sys.path.insert(0, str(SCRIPT_DIR))

from scripts.stitch_atlas_intake import (  # noqa: E402
    classify_asset,
    classify_from_zip_path,
    collect_sources,
    detect_grid,
    run_intake,
    slugify_name,
    stable_hash,
)


def test(condition: bool, message: str) -> bool:
    if condition:
        print(f"  PASS {message}")
        return True

    print(f"  FAIL {message}")
    return False


def count(result: bool, passed: int, failed: int) -> tuple[int, int]:
    if result:
        return passed + 1, failed
    return passed, failed + 1


def create_image(path: Path, size: tuple[int, int] = (256, 256), color=(255, 0, 0)) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    img = Image.new("RGB", size, color)
    img.save(path)


def read_json(path: Path) -> dict:
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def run_tests() -> bool:
    passed = 0
    failed = 0

    print("\n=== slugify_name tests ===")
    passed, failed = count(test(slugify_name("skeleton_warrior") == "skeleton_warrior", "Simple name slugify"), passed, failed)
    passed, failed = count(test(slugify_name("Hero Character") == "hero_character", "Space separated name"), passed, failed)
    passed, failed = count(test(slugify_name("my-file_name.png") == "my_file_name", "File with dash and underscore"), passed, failed)
    passed, failed = count(test(slugify_name("2.5D Enemy Sprite.png") == "25d_enemy_sprite", "2.5D normalized"), passed, failed)

    print("\n=== classify_asset tests ===")
    passed, failed = count(test(classify_asset("skeleton_warrior.png") == "enemy", "Enemy classification"), passed, failed)
    passed, failed = count(test(classify_asset("magic_effect.png") == "vfx", "VFX classification"), passed, failed)
    passed, failed = count(test(classify_asset("floor_tiles.png") == "tile", "Tile classification"), passed, failed)
    passed, failed = count(test(classify_asset("city_guard_idle.png") == "npc", "NPC classification"), passed, failed)
    passed, failed = count(test(classify_asset("iron_sword_icon.png") == "item", "Item classification"), passed, failed)
    passed, failed = count(test(classify_asset("plate_armor_overlay.png") == "equipment_overlay", "Equipment overlay classification"), passed, failed)
    passed, failed = count(test(classify_asset("fantasy_stone_city_village_house_set.png") == "building", "Building classification"), passed, failed)

    print("\n=== classify_from_zip_path tests ===")
    cases = [
        (
            "stitch_2.5d_enemy_sprite_atlas/sprite_atlas_sheet_for_a_2.5d_isometric_enemy_skeleton_warrior._style_dark_1/screen.png",
            "enemy",
            "Enemy path classification",
        ),
        (
            "stitch_2.5d_enemy_sprite_atlas/sprite_atlas_sheet_for_a_2.5d_isometric_boss_enemy_skeleton_king._style_dark_1/screen.png",
            "boss",
            "Boss path classification",
        ),
        (
            "stitch_2.5d_enemy_sprite_atlas/sprite_atlas_sheet_for_2.5d_isometric_floor_tiles._style_dark_fantasy_diablo_4/screen.png",
            "tile",
            "Tile path classification despite outer enemy ZIP folder",
        ),
        (
            "stitch_2.5d_enemy_sprite_atlas/sprite_atlas_sheet_for_2.5d_isometric_magic_attack_effects._style_dark_fantasy/screen.png",
            "vfx",
            "VFX path classification despite outer enemy ZIP folder",
        ),
        (
            "stitch_2.5d_enemy_sprite_atlas/sprite_atlas_sheet_for_a_2.5d_isometric_hero_character_human_male._style_dark/screen.png",
            "hero",
            "Hero path classification despite outer enemy ZIP folder",
        ),
        (
            "stitch_2.5d_enemy_sprite_atlas/sprite_atlas_sheet_for_2.5d_isometric_environment_objects_ancient_pillars./screen.png",
            "prop",
            "Prop path classification despite outer enemy ZIP folder",
        ),
        (
            "stitch_2.5d_enemy_sprite_atlas/sprite_atlas_sheet_for_2.5d_isometric_equipment_overlays_hardened_leather/screen.png",
            "equipment_overlay",
            "Equipment overlay path classification",
        ),
        (
            "manual_drop/fantasy_stone_city_village_house_set/screen.png",
            "building",
            "Building path classification",
        ),
    ]

    for path, expected, label in cases:
        passed, failed = count(test(classify_from_zip_path(path) == expected, label), passed, failed)

    print("\n=== detect_grid tests ===")
    expected_grids = [
        (1024, 1024, {"columns": 8, "rows": 8, "frameWidth": 128, "frameHeight": 128, "sheetSize": 1024, "frameCount": 64}, "Legacy 1024x1024 grid detection"),
        (768, 768, {"columns": 6, "rows": 6, "frameWidth": 128, "frameHeight": 128, "sheetSize": 768, "frameCount": 36}, "Legacy 768x768 grid detection"),
        (512, 512, {"columns": 4, "rows": 4, "frameWidth": 128, "frameHeight": 128, "sheetSize": 512, "frameCount": 16}, "Legacy 512x512 grid detection"),
    ]

    for width, height, expected, label in expected_grids:
        passed, failed = count(test(detect_grid(width, height) == expected, label), passed, failed)

    grid_256 = detect_grid(256, 256)
    passed, failed = count(test(grid_256 is not None, "256x256 is accepted as processable legacy sheet"), passed, failed)
    if grid_256 is not None:
        passed, failed = count(
            test(
                grid_256["columns"] == 4 and grid_256["rows"] == 4 and grid_256["frameWidth"] == 64 and grid_256["frameHeight"] == 64,
                "256x256 legacy sheet becomes 4x4 with 64px frames",
            ),
            passed,
            failed,
        )

    passed, failed = count(test(detect_grid(1024, 512, source_path="single_background.png") is None, "Non-sheet image stays single-frame"), passed, failed)

    explicit_grid = detect_grid(1024, 512, source_path="enemy_walk_8x4.png")
    passed, failed = count(
        test(
            explicit_grid is not None and explicit_grid["columns"] == 8 and explicit_grid["rows"] == 4 and explicit_grid["frameWidth"] == 128 and explicit_grid["frameHeight"] == 128,
            "Explicit 8x4 grid from filename",
        ),
        passed,
        failed,
    )

    frame_grid = detect_grid(512, 512, source_path="npc_guard_idle_frame128.png")
    passed, failed = count(
        test(
            frame_grid is not None and frame_grid["columns"] == 4 and frame_grid["rows"] == 4 and frame_grid["frameWidth"] == 128 and frame_grid["frameHeight"] == 128,
            "Explicit frame128 grid from filename",
        ),
        passed,
        failed,
    )

    grid_1536 = detect_grid(1536, 1536, source_path="stitch_enemy_undead_blade_walker_6x6_256.png")
    passed, failed = count(
        test(
            grid_1536 is not None and grid_1536["columns"] == 6 and grid_1536["rows"] == 6 and grid_1536["frameWidth"] == 256 and grid_1536["frameHeight"] == 256,
            "Explicit 1536x1536 6x6 256 grid from filename",
        ),
        passed,
        failed,
    )

    manual_grid = detect_grid(1536, 1536, source_path="eldritch_modular_gothic_npc_assembly_catalog.png")
    passed, failed = count(test(manual_grid is None, "Catalog/assembly sheet is not blindly sliced"), passed, failed)

    print("\n=== stable_hash tests ===")
    hash1 = stable_hash(b"test data")
    hash2 = stable_hash(b"test data")
    hash3 = stable_hash(b"other data")
    passed, failed = count(test(hash1 == hash2, "Same input produces same hash"), passed, failed)
    passed, failed = count(test(hash1 != hash3, "Different input produces different hash"), passed, failed)
    passed, failed = count(test(len(hash1) == 64, "SHA-256 hash length is 64 chars"), passed, failed)

    print("\n=== collect_sources tests ===")
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        create_image(root / "enemy_skeleton.jpg", size=(128, 128), color=(255, 0, 0))
        create_image(root / "prop_tree.png", size=(256, 256), color=(0, 255, 0))
        create_image(root / "ui_icon.jpeg", size=(64, 64), color=(0, 0, 255))
        (root / "ignored.txt").write_text("not an image", encoding="utf-8")

        zip_source_image = root / "npc_guard_source.jpeg"
        create_image(zip_source_image, size=(128, 128), color=(255, 255, 0))
        zip_path = root / "pack.zip"
        with zipfile.ZipFile(zip_path, "w") as zf:
            zf.write(zip_source_image, "inside/npc_guard.jpeg")
            zf.writestr("inside/readme.txt", "ignored")

        sources = collect_sources(root)
        source_names = [source.display_source_path for source in sources]
        passed, failed = count(test(len(sources) == 4, "Directory collects loose images and ZIP images"), passed, failed)
        passed, failed = count(test(any("enemy_skeleton.jpg" in name for name in source_names), "Collects JPG"), passed, failed)
        passed, failed = count(test(any("prop_tree.png" in name for name in source_names), "Collects PNG"), passed, failed)
        passed, failed = count(test(any("ui_icon.jpeg" in name for name in source_names), "Collects JPEG"), passed, failed)
        passed, failed = count(test(any("pack.zip!/inside/npc_guard.jpeg" in name for name in source_names), "Collects JPEG inside ZIP"), passed, failed)

    print("\n=== runtime intake tests ===")
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        input_dir = root / "input"
        output_dir = root / "output"
        quarantine_dir = root / "quarantine"
        client_dir = root / "client"

        create_image(input_dir / "enemy_skeleton_idle.jpg", size=(300, 500), color=(255, 0, 0))
        create_image(input_dir / "tile_swamp_ground.png", size=(256, 256), color=(0, 255, 0))
        create_image(input_dir / "ui_inventory_icon.jpeg", size=(96, 96), color=(0, 0, 255))
        create_image(input_dir / "npc_guard_walk_4x4.png", size=(512, 512), color=(255, 255, 0))
        create_image(input_dir / "fantasy_stone_city_village_house_set.png", size=(1536, 2048), color=(120, 120, 120))
        create_image(input_dir / "mobile_asset_collection_overview.jpg", size=(1080, 1920), color=(12, 20, 44))
        create_image(input_dir / "stitch_enemy_undead_blade_walker_6x6_256.png", size=(1536, 1536), color=(99, 30, 170))

        zip_path = input_dir / "mixed_pack.zip"
        zip_image = root / "hero_character_male.png"
        create_image(zip_image, size=(256, 384), color=(255, 0, 255))
        with zipfile.ZipFile(zip_path, "w") as zf:
            zf.write(zip_image, "characters/hero_character_male.png")

        exit_code = run_intake(input_path=input_dir, output_dir=output_dir, quarantine_dir=quarantine_dir, client_dir=client_dir, pack_id="test_pack")
        manifest_path = output_dir / "manifest.json"
        report_path = output_dir / "report.json"
        client_manifest_path = client_dir / "manifest.json"

        passed, failed = count(test(exit_code == 0, "run_intake exits successfully"), passed, failed)
        passed, failed = count(test(manifest_path.exists(), "Manifest created"), passed, failed)
        passed, failed = count(test(report_path.exists(), "Report created"), passed, failed)
        passed, failed = count(test(client_manifest_path.exists(), "Client manifest copied"), passed, failed)

        manifest = read_json(manifest_path)
        report = read_json(report_path)
        assets = manifest.get("assets", [])
        manual_review = manifest.get("manualReview", [])
        reference_only = manifest.get("referenceOnly", [])

        passed, failed = count(test(manifest.get("schemaVersion") >= 1, "Manifest schema present"), passed, failed)
        passed, failed = count(test(manifest.get("packId") == "test_pack", "Manifest packId set"), passed, failed)
        passed, failed = count(test(manifest.get("deterministic") is True, "Manifest deterministic flag true"), passed, failed)
        passed, failed = count(test(len(assets) == 4, "Only runtime-safe images accepted as assets"), passed, failed)
        passed, failed = count(test(manifest.get("manualReviewCount") == 3, "Manual-review count recorded"), passed, failed)
        passed, failed = count(test(manifest.get("referenceOnlyCount") == 1, "Reference-only count recorded"), passed, failed)
        passed, failed = count(test(len(manual_review) == 3, "Manual-review entries emitted"), passed, failed)
        passed, failed = count(test(len(reference_only) == 1, "Reference-only entries emitted"), passed, failed)

        required_fields = ["assetId", "category", "displayName", "sourcePath", "imagePath", "atlasPath", "previewPath", "width", "height", "frameWidth", "frameHeight", "frameCount", "pivot", "sourceSha256", "processedSha256", "status"]
        all_have_fields = all(all(field in asset for field in required_fields) for asset in assets)
        passed, failed = count(test(all_have_fields, "All assets have required manifest fields"), passed, failed)

        asset_ids = [asset["assetId"] for asset in assets]
        passed, failed = count(test(len(asset_ids) == len(set(asset_ids)), "No duplicate asset IDs"), passed, failed)

        sorted_assets = sorted(assets, key=lambda asset: (asset["category"], asset["assetId"], asset["sourcePath"]))
        passed, failed = count(test(assets == sorted_assets, "Assets sorted deterministically"), passed, failed)

        categories = {asset["category"] for asset in assets}
        manual_categories = {entry["category"] for entry in manual_review}
        reference_categories = {entry["category"] for entry in reference_only}
        passed, failed = count(test("enemy" in categories, "Runtime intake has accepted enemy asset"), passed, failed)
        passed, failed = count(test("tile" in categories, "Runtime intake has tile asset"), passed, failed)
        passed, failed = count(test("ui" in categories, "Runtime intake has UI asset"), passed, failed)
        passed, failed = count(test("npc" in categories, "Runtime intake has NPC asset"), passed, failed)
        passed, failed = count(test("building" in manual_categories, "Building catalog is manual-review"), passed, failed)
        passed, failed = count(test("hero" in manual_categories, "Non-square hero ZIP image is manual-review"), passed, failed)
        passed, failed = count(test("enemy" in manual_categories, "Non-square enemy image is manual-review"), passed, failed)
        passed, failed = count(test("unknown" in reference_categories, "Mobile overview is reference-only"), passed, failed)

        accepted_enemy = [asset for asset in assets if "undead_blade_walker" in asset["assetId"]]
        passed, failed = count(
            test(len(accepted_enemy) == 1 and accepted_enemy[0]["columns"] == 6 and accepted_enemy[0]["rows"] == 6 and accepted_enemy[0]["frameCount"] == 36, "1536 explicit 6x6 enemy sheet accepted"),
            passed,
            failed,
        )

        manifest_str = json.dumps(manifest, sort_keys=True)
        timestamps = re.findall(r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}", manifest_str)
        passed, failed = count(test(len(timestamps) == 0, "No wall-clock timestamps in manifest"), passed, failed)
        passed, failed = count(test(report.get("deterministic") is True, "Report deterministic flag true"), passed, failed)

        for asset in assets:
            image_path = client_dir / asset["imagePath"]
            atlas_path = client_dir / asset["atlasPath"]
            preview_path = client_dir / asset["previewPath"]
            passed, failed = count(test(image_path.exists(), f"Runtime image exists for {asset['assetId']}"), passed, failed)
            passed, failed = count(test(atlas_path.exists(), f"Atlas exists for {asset['assetId']}"), passed, failed)
            passed, failed = count(test(preview_path.exists(), f"Preview exists for {asset['assetId']}"), passed, failed)
            atlas = read_json(atlas_path)
            passed, failed = count(test(atlas.get("meta", {}).get("assetId") == asset["assetId"], f"Atlas meta assetId matches for {asset['assetId']}"), passed, failed)
            passed, failed = count(test(len(atlas.get("frames", {})) == asset["frameCount"], f"Atlas frame count matches manifest for {asset['assetId']}"), passed, failed)

    print("\n=== deterministic replay tests ===")
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        input_dir = root / "input"
        output_a = root / "output_a"
        output_b = root / "output_b"
        quarantine_a = root / "quarantine_a"
        quarantine_b = root / "quarantine_b"
        client_a = root / "client_a"
        client_b = root / "client_b"

        create_image(input_dir / "enemy_skeleton_idle.jpg", size=(300, 500), color=(123, 12, 99))
        create_image(input_dir / "prop_tree.png", size=(256, 256), color=(20, 140, 30))

        exit_a = run_intake(input_path=input_dir, output_dir=output_a, quarantine_dir=quarantine_a, client_dir=client_a, pack_id="replay_pack")
        exit_b = run_intake(input_path=input_dir, output_dir=output_b, quarantine_dir=quarantine_b, client_dir=client_b, pack_id="replay_pack")
        manifest_a = stable_hash((output_a / "manifest.json").read_bytes())
        manifest_b = stable_hash((output_b / "manifest.json").read_bytes())
        passed, failed = count(test(exit_a == 0 and exit_b == 0, "Both replay runs exit successfully"), passed, failed)
        passed, failed = count(test(manifest_a == manifest_b, "Manifest hash is stable across replay"), passed, failed)

    print("\n" + "=" * 50)
    print(f"RESULTS: {passed} passed, {failed} failed")
    print("=" * 50)
    return failed == 0


if __name__ == "__main__":
    success = run_tests()
    sys.exit(0 if success else 1)
