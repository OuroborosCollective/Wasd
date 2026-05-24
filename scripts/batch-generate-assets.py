#!/usr/bin/env python3
"""Batch generate missing 3D assets via Meshy API for Wasd project."""

import json
import os
import sys
import time
import urllib.request
import urllib.error
from pathlib import Path

API_BASE = "https://api.meshy.ai"
API_KEY = os.getenv("MESHY_API_KEY")
if not API_KEY:
    print("Error: MESHY_API_KEY environment variable not set.")
    sys.exit(1)
PROJECT_ROOT = Path("/tmp/Wasd")
OUTPUT_DIR = PROJECT_ROOT / "generated-assets"
STATE_FILE = PROJECT_ROOT / "scripts" / "batch-gen-state.json"

# All missing assets: (filename, target_dir, prompt, profile_type)
ASSETS = [
    # Characters - Players
    ("player_warrior.glb", "characters", "Medieval fantasy warrior knight character in full plate armor with sword, standing in t-pose, game-ready low-poly 3D model", "chr_player_humanoid"),
    ("player_mage.glb", "characters", "Fantasy mage wizard character wearing robes and pointed hat, holding a staff, t-pose, game-ready low-poly 3D model", "chr_player_humanoid"),
    ("player_ranger.glb", "characters", "Fantasy ranger archer character in leather armor with hood and bow, t-pose, game-ready low-poly 3D model", "chr_player_humanoid"),
    
    # Characters - NPCs
    ("npc_guard.glb", "characters", "Medieval city guard NPC in chainmail armor with spear and shield, standing pose, game-ready low-poly 3D model", "chr_npc_humanoid"),
    ("npc_merchant.glb", "characters", "Medieval merchant NPC character in colorful clothing with belt pouch, friendly standing pose, game-ready low-poly 3D model", "chr_npc_humanoid"),
    ("npc_blacksmith.glb", "characters", "Muscular blacksmith NPC in leather apron holding a hammer, standing pose, game-ready low-poly 3D model", "chr_npc_humanoid"),
    
    # Monsters
    ("wolf_red.glb", "monsters", "Aggressive red wolf beast monster, snarling pose, fur detailed, fantasy creature, game-ready 3D model", "mon_beast"),
    ("bear_brown.glb", "monsters", "Large brown bear beast monster, standing upright threatening pose, fantasy creature, game-ready 3D model", "mon_beast"),
    ("skeleton_warrior.glb", "monsters", "Undead skeleton warrior monster holding a rusted sword and broken shield, combat stance, game-ready 3D model", "mon_humanoid"),
    ("orc_grunt.glb", "monsters", "Green-skinned orc grunt monster in crude armor wielding a club, aggressive pose, game-ready 3D model", "mon_humanoid"),
    
    # Buildings
    ("house_small.glb", "buildings", "Small medieval fantasy cottage house, thatched roof, timber frame, stone foundation, game-ready 3D model for RPG", "bld_walkable_house"),
    ("house_medium.glb", "buildings", "Medium medieval fantasy house two-story, wooden frame with plaster walls, tiled roof, game-ready 3D model", "bld_walkable_house"),
    ("tavern.glb", "buildings", "Medieval fantasy tavern inn building, two-story with sign and outdoor area, warm lighting, game-ready 3D model", "bld_shop_house"),
    ("shop.glb", "buildings", "Medieval fantasy shop market building with open storefront and awning, game-ready 3D model", "bld_shop_house"),
    ("blacksmith.glb", "buildings", "Medieval fantasy blacksmith forge building with chimney smoke and anvil visible, game-ready 3D model", "bld_shop_house"),
    ("castle_tower.glb", "buildings", "Medieval fantasy castle tower, round stone tower with crenellations and arrow slits, game-ready 3D model", "bld_castle_module"),
    ("castle_keep.glb", "buildings", "Medieval fantasy castle keep main hall, large fortified stone building with towers, game-ready 3D model", "bld_castle_module"),
    
    # Walls
    ("wall_straight.glb", "props", "Medieval stone wall section, straight modular segment, fortified battlements on top, game-ready 3D model", "wal_city_wall"),
    ("wall_gate.glb", "props", "Medieval city gate with portcullis and stone archway, fortified entrance, game-ready 3D model", "wal_city_wall"),
    
    # Dungeon
    ("dungeon_entrance.glb", "props", "Dark fantasy dungeon entrance, stone archway with iron gate, torch sconces, mossy stones, game-ready 3D model", "dng_module"),
    ("dungeon_corridor.glb", "props", "Dark fantasy dungeon stone corridor hallway with pillars and torches, modular snap-ready, game-ready 3D model", "dng_module"),
    ("dungeon_room.glb", "props", "Dark fantasy dungeon chamber room with columns and altar, modular snap-ready, game-ready 3D model", "dng_module"),
    
    # Roads
    ("road_straight.glb", "props", "Medieval cobblestone road tile straight section, modular top-down, dirt edges, game-ready 3D model", "rds_tile"),
    ("road_corner.glb", "props", "Medieval cobblestone road tile corner bend section, modular top-down, game-ready 3D model", "rds_tile"),
    ("road_junction.glb", "props", "Medieval cobblestone road tile T-junction section, modular top-down, game-ready 3D model", "rds_tile"),
    ("road_crossroads.glb", "props", "Medieval cobblestone road tile crossroads intersection, modular top-down, game-ready 3D model", "rds_tile"),
    
    # Nature
    ("tree_oak.glb", "props", "Large oak tree with full green canopy, thick trunk, nature asset for fantasy RPG world, game-ready 3D model", "env_tree"),
    ("tree_pine.glb", "props", "Tall pine evergreen conifer tree, forest tree asset for fantasy RPG world, game-ready 3D model", "env_tree"),
    ("rock_large.glb", "props", "Large boulder rock formation, grey stone, nature terrain asset, game-ready 3D model", "env_rock"),
    ("well.glb", "props", "Medieval stone water well with wooden roof and bucket, village prop, game-ready 3D model", "sct_small"),
    
    # Weapons
    ("sword_iron.glb", "equipment/weapons", "Iron medieval sword, simple one-handed blade with crossguard, weapon prop, game-ready 3D model", "wpn_1h"),
    ("axe_battle.glb", "equipment/weapons", "Medieval battle axe one-handed, wooden handle with iron head, weapon prop, game-ready 3D model", "wpn_1h"),
    ("staff_mage.glb", "equipment/weapons", "Fantasy mage staff with crystal orb on top, ornate wooden shaft, weapon prop, game-ready 3D model", "wpn_2h"),
    
    # Items
    ("potion_health.glb", "props", "Red health potion in glass bottle with cork stopper, glowing liquid, game item prop, game-ready 3D model", "itm_consumable"),
    ("chest_treasure.glb", "props", "Medieval treasure chest wooden with iron bands and lock, slightly open with gold glow, game-ready 3D model", "sct_small"),
    
    # Special - portal
    ("portal.glb", "props", "Obsidian dark fantasy portal, swirling purple energy gate, floating stone archway, game-ready 3D model", "dng_module"),
]

PROFILE_DEFAULTS = {
    "chr_player_humanoid": {"target_polycount": 14000, "should_remesh": True, "topology": "triangle", "model_type": "lowpoly", "pose_mode": "t-pose", "should_rig": False, "height_meters": 1.8, "enable_pbr": False, "symmetry_mode": "on"},
    "chr_npc_humanoid": {"target_polycount": 12000, "should_remesh": True, "topology": "triangle", "model_type": "lowpoly", "pose_mode": "t-pose", "should_rig": False, "height_meters": 1.75, "enable_pbr": False, "symmetry_mode": "on"},
    "mon_humanoid": {"target_polycount": 12000, "should_remesh": True, "topology": "triangle", "model_type": "lowpoly", "pose_mode": "a-pose", "should_rig": False, "height_meters": 2.1, "enable_pbr": False, "symmetry_mode": "auto"},
    "mon_beast": {"target_polycount": 8000, "should_remesh": True, "topology": "triangle", "model_type": "lowpoly", "pose_mode": "", "should_rig": False, "height_meters": 1.6, "enable_pbr": False, "symmetry_mode": "auto"},
    "wpn_1h": {"target_polycount": 3000, "should_remesh": True, "topology": "triangle", "model_type": "lowpoly", "pose_mode": "", "should_rig": False, "height_meters": 1.0, "enable_pbr": False, "symmetry_mode": "off"},
    "wpn_2h": {"target_polycount": 4000, "should_remesh": True, "topology": "triangle", "model_type": "lowpoly", "pose_mode": "", "should_rig": False, "height_meters": 1.5, "enable_pbr": False, "symmetry_mode": "off"},
    "itm_consumable": {"target_polycount": 1500, "should_remesh": True, "topology": "triangle", "model_type": "lowpoly", "pose_mode": "", "should_rig": False, "height_meters": 0.3, "enable_pbr": False, "symmetry_mode": "off"},
    "bld_walkable_house": {"target_polycount": 10000, "should_remesh": True, "topology": "triangle", "model_type": "lowpoly", "pose_mode": "", "should_rig": False, "height_meters": 5.0, "enable_pbr": False, "symmetry_mode": "off"},
    "bld_shop_house": {"target_polycount": 12000, "should_remesh": True, "topology": "triangle", "model_type": "lowpoly", "pose_mode": "", "should_rig": False, "height_meters": 5.5, "enable_pbr": False, "symmetry_mode": "off"},
    "bld_castle_module": {"target_polycount": 14000, "should_remesh": True, "topology": "triangle", "model_type": "lowpoly", "pose_mode": "", "should_rig": False, "height_meters": 10.0, "enable_pbr": False, "symmetry_mode": "off"},
    "wal_city_wall": {"target_polycount": 8000, "should_remesh": True, "topology": "triangle", "model_type": "lowpoly", "pose_mode": "", "should_rig": False, "height_meters": 8.0, "enable_pbr": False, "symmetry_mode": "off"},
    "rds_tile": {"target_polycount": 2000, "should_remesh": True, "topology": "triangle", "model_type": "lowpoly", "pose_mode": "", "should_rig": False, "height_meters": 0.2, "enable_pbr": False, "symmetry_mode": "off"},
    "dng_module": {"target_polycount": 10000, "should_remesh": True, "topology": "triangle", "model_type": "lowpoly", "pose_mode": "", "should_rig": False, "height_meters": 6.0, "enable_pbr": False, "symmetry_mode": "off"},
    "env_tree": {"target_polycount": 5000, "should_remesh": True, "topology": "triangle", "model_type": "lowpoly", "pose_mode": "", "should_rig": False, "height_meters": 8.0, "enable_pbr": False, "symmetry_mode": "off"},
    "env_rock": {"target_polycount": 3000, "should_remesh": True, "topology": "triangle", "model_type": "lowpoly", "pose_mode": "", "should_rig": False, "height_meters": 2.0, "enable_pbr": False, "symmetry_mode": "off"},
    "sct_small": {"target_polycount": 1500, "should_remesh": True, "topology": "triangle", "model_type": "lowpoly", "pose_mode": "", "should_rig": False, "height_meters": 0.5, "enable_pbr": False, "symmetry_mode": "off"},
}


def api_request(method, path, payload=None, timeout=180):
    url = f"{API_BASE}{path}"
    headers = {"Authorization": f"Bearer {API_KEY}"}
    data = None
    if payload is not None:
        headers["Content-Type"] = "application/json"
        data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers=headers, method=method.upper())
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        raw = resp.read().decode("utf-8")
        return json.loads(raw) if raw else {}


def compose_prompt(prompt, profile):
    common = [
        "single isolated game-ready asset",
        "clean readable silhouette",
        "no text or watermark",
        "no base plate",
        "centered composition",
        "suitable for GLB export",
        "fantasy MMORPG art direction"
    ]
    profile_hints = {
        "chr_player_humanoid": ["full-body humanoid character", "clear hands and feet", "clean limb separation", "neutral rig-friendly pose"],
        "chr_npc_humanoid": ["full-body humanoid NPC", "clear hands and feet", "clean limb separation", "neutral rig-friendly pose"],
        "mon_humanoid": ["full-body humanoid monster", "clear silhouette", "pronounced anatomy and limbs", "neutral rig-friendly pose"],
        "mon_beast": ["creature monster", "strong anatomy silhouette", "combat readable profile"],
        "wpn_1h": ["single one-handed weapon prop", "clear grip, guard, and striking edge", "hero prop readability"],
        "wpn_2h": ["single two-handed weapon prop", "clear grip and striking profile", "hero prop readability"],
        "itm_consumable": ["single item prop", "inventory icon readability in 3D"],
        "bld_walkable_house": ["walkable house exterior shell", "clear front entrance", "believable human scale"],
        "bld_shop_house": ["walkable shop building", "clear storefront or workshop identity", "clear entrance"],
        "bld_castle_module": ["castle architecture module", "fortified fantasy structure"],
        "wal_city_wall": ["modular city wall or gate piece", "clean endpoints for snapping"],
        "rds_tile": ["modular road tile", "must visually connect with adjacent road tiles"],
        "dng_module": ["modular dungeon module", "must snap cleanly with corridor and room pieces", "dark fantasy architecture"],
        "env_tree": ["tree asset", "clear trunk and canopy silhouette", "usable as world scenery"],
        "env_rock": ["rock formation asset", "usable as world scenery and terrain dressing"],
        "sct_small": ["small scatter prop", "usable as set dressing", "simple clean silhouette"],
    }
    parts = [prompt] + common
    if profile in profile_hints:
        parts.extend(profile_hints[profile])
    return ". ".join(parts)


def create_preview(prompt, profile):
    defaults = PROFILE_DEFAULTS.get(profile, PROFILE_DEFAULTS["sct_small"])
    full_prompt = compose_prompt(prompt, profile)
    payload = {
        "mode": "preview",
        "prompt": full_prompt,
        "model_type": defaults.get("model_type", "standard"),
        "target_polycount": defaults.get("target_polycount", 10000),
        "should_remesh": defaults.get("should_remesh", True),
        "topology": defaults.get("topology", "triangle"),
        "enable_pbr": defaults.get("enable_pbr", True),
        "symmetry_mode": defaults.get("symmetry_mode", "auto"),
    }
    if defaults.get("pose_mode"):
        payload["pose_mode"] = defaults["pose_mode"]
    if defaults.get("height_meters"):
        payload["height_meters"] = defaults["height_meters"]
    result = api_request("POST", "/openapi/v2/text-to-3d", payload)
    return result


def create_refine(task_id):
    payload = {
        "mode": "refine",
        "original_task_id": task_id,
    }
    result = api_request("POST", "/openapi/v2/text-to-3d", payload)
    return result


def poll_task(task_id, timeout_s=600, interval_s=8):
    start = time.time()
    while True:
        result = api_request("GET", f"/openapi/v2/text-to-3d/{task_id}")
        status = str(result.get("status", "")).upper()
        progress = result.get("progress", 0)
        print(f"  [{task_id[:8]}] status={status} progress={progress}%", flush=True)
        if status in ("SUCCEEDED", "FAILED", "CANCELLED"):
            return result
        if time.time() - start > timeout_s:
            raise RuntimeError(f"Timeout after {timeout_s}s: {status}")
        time.sleep(interval_s)


def download_model(url, dest):
    dest.parent.mkdir(parents=True, exist_ok=True)
    req = urllib.request.Request(url, method="GET")
    with urllib.request.urlopen(req, timeout=300) as resp:
        dest.write_bytes(resp.read())
    size = dest.stat().st_size
    print(f"  Downloaded: {dest.name} ({size:,} bytes)", flush=True)
    return size


def load_state():
    if STATE_FILE.exists():
        return json.loads(STATE_FILE.read_text())
    return {"completed": [], "failed": []}


def save_state(state):
    STATE_FILE.write_text(json.dumps(state, indent=2))


def main():
    state = load_state()
    completed = set(state.get("completed", []))
    
    # Filter already done
    remaining = [(fn, td, pr, pf) for fn, td, pr, pf in ASSETS if fn not in completed]
    total = len(remaining)
    already = len(completed)
    
    print(f"=== Meshy Batch Asset Generator ===", flush=True)
    print(f"Already completed: {already}", flush=True)
    print(f"To generate: {total}", flush=True)
    print(f"Total assets: {len(ASSETS)}", flush=True)
    print(f"", flush=True)
    
    # Check balance
    try:
        bal = api_request("GET", "/openapi/v1/balance")
        print(f"Meshy credits: {bal.get('balance', 'unknown')}", flush=True)
    except Exception as e:
        print(f"Warning: Could not check balance: {e}", flush=True)
    
    print(f"", flush=True)
    
    for i, (filename, subdir, prompt, profile) in enumerate(remaining):
        print(f"[{i+1}/{total}] {filename} (profile: {profile})", flush=True)
        
        out_path = OUTPUT_DIR / subdir / filename
        
        try:
            # Step 1: Create preview
            print(f"  Creating preview...", flush=True)
            preview = create_preview(prompt, profile)
            preview_id = preview.get("id") or preview.get("result")
            if not preview_id:
                print(f"  ERROR: No preview task ID returned: {preview}", flush=True)
                state.setdefault("failed", []).append({"file": filename, "error": f"No preview ID: {str(preview)[:200]}"})
                save_state(state)
                continue
            
            print(f"  Preview task: {preview_id}", flush=True)
            
            # Step 2: Poll preview
            preview_result = poll_task(preview_id, timeout_s=600)
            if preview_result.get("status") != "SUCCEEDED":
                err = f"Preview failed: {preview_result.get('status')}"
                print(f"  ERROR: {err}", flush=True)
                state.setdefault("failed", []).append({"file": filename, "error": err})
                save_state(state)
                continue
            
            # Step 3: Refine
            print(f"  Creating refine...", flush=True)
            refine = create_refine(preview_id)
            refine_id = refine.get("id") or refine.get("result")
            if not refine_id:
                print(f"  ERROR: No refine task ID: {refine}", flush=True)
                state.setdefault("failed", []).append({"file": filename, "error": f"No refine ID: {str(refine)[:200]}"})
                save_state(state)
                continue
            
            print(f"  Refine task: {refine_id}", flush=True)
            
            # Step 4: Poll refine
            refine_result = poll_task(refine_id, timeout_s=900)
            if refine_result.get("status") != "SUCCEEDED":
                err = f"Refine failed: {refine_result.get('status')}"
                print(f"  ERROR: {err}", flush=True)
                state.setdefault("failed", []).append({"file": filename, "error": err})
                save_state(state)
                continue
            
            # Step 5: Download GLB
            model_urls = refine_result.get("model_urls", {})
            glb_url = None
            if isinstance(model_urls, dict):
                glb_url = model_urls.get("glb") or model_urls.get("GLB")
            elif isinstance(model_urls, list) and model_urls:
                glb_url = model_urls[0]
            
            if not glb_url:
                # Try other fields
                for field in ["glb_url", "model_url", "output_url"]:
                    if field in refine_result:
                        glb_url = refine_result[field]
                        break
            
            if not glb_url:
                err = f"No GLB URL in result: {list(refine_result.keys())}"
                print(f"  ERROR: {err}", flush=True)
                state.setdefault("failed", []).append({"file": filename, "error": err})
                save_state(state)
                continue
            
            size = download_model(glb_url, out_path)
            
            if size < 100:
                print(f"  WARNING: Very small file ({size} bytes), may be invalid", flush=True)
            
            completed.add(filename)
            state["completed"] = list(completed)
            save_state(state)
            print(f"  DONE: {filename}", flush=True)
            
        except Exception as e:
            print(f"  ERROR: {e}", flush=True)
            state.setdefault("failed", []).append({"file": filename, "error": str(e)[:500]})
            save_state(state)
            continue
        
        print(f"", flush=True)
    
    # Final report
    print(f"=== Generation Complete ===", flush=True)
    print(f"Completed: {len(completed)}/{len(ASSETS)}", flush=True)
    print(f"Failed: {len(state.get('failed', []))}", flush=True)
    
    if state.get("failed"):
        print(f"\nFailed assets:", flush=True)
        for f in state["failed"]:
            print(f"  - {f['file']}: {f['error'][:100]}", flush=True)


if __name__ == "__main__":
    main()
