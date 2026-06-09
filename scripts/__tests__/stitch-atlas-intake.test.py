#!/usr/bin/env python3
"""
stitch-atlas-intake.test.py

Tests for the Stitch 2.5D atlas intake pipeline.
Run with: python scripts/__tests__/stitch-atlas-intake.test.py
"""

import sys
import os
import json
import hashlib
import re
from pathlib import Path

# Add scripts dir to path for imports
SCRIPT_DIR = Path(__file__).parent.parent.parent.resolve()
sys.path.insert(0, str(SCRIPT_DIR))

# Import the intake module functions
from scripts.stitch_atlas_intake import (
    slugify_name,
    classify_asset,
    classify_from_zip_path,
    detect_grid,
    stable_hash,
)

# -----------------------------------------------------------------------------
# Test helpers
# -----------------------------------------------------------------------------

def test(condition, message):
    """Simple test assertion."""
    if condition:
        print(f"  PASS {message}")
        return True
    else:
        print(f"  FAIL {message}")
        return False

def run_tests():
    passed = 0
    failed = 0
    
    print("\n=== slugify_name tests ===")
    
    if test(slugify_name("skeleton_warrior") == "skeleton_warrior", "Simple name slugify"):
        passed += 1
    else:
        failed += 1
    
    if test(slugify_name("Hero Character") == "hero_character", "Space separated"):
        passed += 1
    else:
        failed += 1
    
    if test(slugify_name("my-file_name.png") == "my_file_name", "File with dashes/dots"):
        passed += 1
    else:
        failed += 1
    
    print("\n=== classify_asset tests ===")
    
    if test(classify_asset("skeleton_warrior.png") == "enemy", "Enemy classification"):
        passed += 1
    else:
        failed += 1
    
    if test(classify_asset("magic_effect.png") == "vfx", "VFX classification"):
        passed += 1
    else:
        failed += 1
    
    if test(classify_asset("floor_tiles.png") == "tile", "Tile classification"):
        passed += 1
    else:
        failed += 1
    
    print("\n=== classify_from_zip_path tests ===")
    
    enemy_path = "stitch_2.5d_enemy_sprite_atlas/sprite_atlas_sheet_for_a_2.5d_isometric_enemy_skeleton_warrior._style_dark_1/screen.png"
    if test(classify_from_zip_path(enemy_path) == "enemy", "Enemy path classification"):
        passed += 1
    else:
        failed += 1
    
    boss_path = "stitch_2.5d_enemy_sprite_atlas/sprite_atlas_sheet_for_a_2.5d_isometric_boss_enemy_skeleton_king._style_dark_1/screen.png"
    if test(classify_from_zip_path(boss_path) == "boss", "Boss path classification"):
        passed += 1
    else:
        failed += 1
    
    tile_path = "stitch_2.5d_enemy_sprite_atlas/sprite_atlas_sheet_for_2.5d_isometric_floor_tiles._style_dark_fantasy_diablo_4/screen.png"
    if test(classify_from_zip_path(tile_path) == "tile", "Tile path classification"):
        passed += 1
    else:
        failed += 1
    
    vfx_path = "stitch_2.5d_enemy_sprite_atlas/sprite_atlas_sheet_for_2.5d_isometric_magic_attack_effects._style_dark_fantasy/screen.png"
    if test(classify_from_zip_path(vfx_path) == "vfx", "VFX path classification"):
        passed += 1
    else:
        failed += 1
    
    hero_path = "stitch_2.5d_enemy_sprite_atlas/sprite_atlas_sheet_for_a_2.5d_isometric_hero_character_human_male._style_dark/screen.png"
    if test(classify_from_zip_path(hero_path) == "hero", "Hero path classification"):
        passed += 1
    else:
        failed += 1
    
    prop_path = "stitch_2.5d_enemy_sprite_atlas/sprite_atlas_sheet_for_2.5d_isometric_environment_objects_ancient_pillars./screen.png"
    if test(classify_from_zip_path(prop_path) == "prop", "Prop path classification"):
        passed += 1
    else:
        failed += 1
    
    equip_path = "stitch_2.5d_enemy_sprite_atlas/sprite_atlas_sheet_for_2.5d_isometric_equipment_overlays_hardened_leather/screen.png"
    if test(classify_from_zip_path(equip_path) == "equipment_overlay", "Equipment overlay classification"):
        passed += 1
    else:
        failed += 1
    
    print("\n=== detect_grid tests ===")
    
    if test(detect_grid(1024, 1024) == {"columns": 8, "rows": 8, "frameWidth": 128, "frameHeight": 128, "sheetSize": 1024, "frameCount": 64}, "1024x1024 grid detection"):
        passed += 1
    else:
        failed += 1
    
    if test(detect_grid(768, 768) == {"columns": 6, "rows": 6, "frameWidth": 128, "frameHeight": 128, "sheetSize": 768, "frameCount": 36}, "768x768 grid detection"):
        passed += 1
    else:
        failed += 1
    
    if test(detect_grid(512, 512) == {"columns": 4, "rows": 4, "frameWidth": 128, "frameHeight": 128, "sheetSize": 512, "frameCount": 16}, "512x512 grid detection"):
        passed += 1
    else:
        failed += 1
    
    if test(detect_grid(256, 256) is None, "256x256 invalid grid detection"):
        passed += 1
    else:
        failed += 1
    
    if test(detect_grid(1024, 512) is None, "Non-square image detection"):
        passed += 1
    else:
        failed += 1
    
    print("\n=== stable_hash tests ===")
    
    hash1 = stable_hash(b"test data")
    hash2 = stable_hash(b"test data")
    hash3 = stable_hash(b"other data")
    
    if test(hash1 == hash2, "Same input produces same hash"):
        passed += 1
    else:
        failed += 1
    
    if test(hash1 != hash3, "Different input produces different hash"):
        passed += 1
    else:
        failed += 1
    
    if test(len(hash1) == 64, "SHA-256 hash length (64 chars)"):
        passed += 1
    else:
        failed += 1
    
    print("\n=== manifest tests ===")
    
    manifest_path = SCRIPT_DIR / "assets" / "runtime" / "stitch" / "manifest.json"
    if manifest_path.exists():
        with open(manifest_path) as f:
            manifest = json.load(f)
        
        if test(manifest.get("schemaVersion") == 1, "Manifest schema version is 1"):
            passed += 1
        else:
            failed += 1
        
        if test(manifest.get("deterministic") == True, "Manifest deterministic flag is true"):
            passed += 1
        else:
            failed += 1
        
        if test(manifest.get("generatedBy") == "scripts/stitch-atlas-intake.py", "Generated by correct script"):
            passed += 1
        else:
            failed += 1
        
        assets = manifest.get("assets", [])
        if test(len(assets) > 0, f"Manifest has {len(assets)} assets"):
            passed += 1
        else:
            failed += 1
        
        # Check all assets have required fields
        required_fields = ["assetId", "category", "displayName", "imagePath", "atlasPath", "width", "height", "frameWidth", "frameHeight", "frameCount", "pivot", "sourceSha256", "processedSha256"]
        all_have_fields = all(all(field in a for field in required_fields) for a in assets)
        if test(all_have_fields, "All assets have required fields"):
            passed += 1
        else:
            failed += 1
        
        # Check no duplicate asset IDs
        asset_ids = [a["assetId"] for a in assets]
        if test(len(asset_ids) == len(set(asset_ids)), "No duplicate asset IDs"):
            passed += 1
        else:
            failed += 1
        
        # Check sorting
        sorted_assets = sorted(assets, key=lambda a: (a["category"], a["assetId"], a["sourcePath"]))
        if test(assets == sorted_assets, "Assets are sorted by category, assetId, sourcePath"):
            passed += 1
        else:
            failed += 1
        
        # Check categories
        categories = set(a["category"] for a in assets)
        has_enemy = "enemy" in categories
        has_tile = "tile" in categories
        has_vfx = "vfx" in categories
        has_prop = "prop" in categories
        
        if test(has_enemy and has_tile and has_vfx and has_prop, f"Has required categories: enemy={has_enemy}, tile={has_tile}, vfx={has_vfx}, prop={has_prop}"):
            passed += 1
        else:
            failed += 1
        
        # Check no wall-clock timestamps in manifest
        manifest_str = json.dumps(manifest)
        timestamp_pattern = r'\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}'
        timestamps = re.findall(timestamp_pattern, manifest_str)
        if test(len(timestamps) == 0, "No wall-clock timestamps in manifest"):
            passed += 1
        else:
            failed += 1
        
    else:
        print(f"  SKIP Manifest not found at {manifest_path}")
    
    print("\n" + "=" * 50)
    print(f"RESULTS: {passed} passed, {failed} failed")
    print("=" * 50)
    
    return failed == 0

if __name__ == "__main__":
    success = run_tests()
    sys.exit(0 if success else 1)