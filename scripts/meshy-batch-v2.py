#!/usr/bin/env python3
"""Batch generate 3D assets via Meshy API - v2 with better error handling."""

import json
import os
import sys
import time
import urllib.request
import urllib.error
import ssl
from pathlib import Path

API_KEY = os.getenv("MESHY_API_KEY")
if not API_KEY:
    print("Error: MESHY_API_KEY environment variable not set.")
    sys.exit(1)
API_BASE = "https://api.meshy.ai"
OUTPUT_DIR = Path("/tmp/Wasd/generated-assets")
STATE_FILE = Path("/tmp/Wasd/scripts/batch-gen-state.json")

# Assets to generate: (filename, target_dir, prompt, polycount)
ASSETS = [
    # Characters - Players (14k poly)
    ("player_warrior.glb", "characters", "Medieval fantasy warrior knight character in full plate armor with sword, standing t-pose, game-ready low-poly 3D model, full-body humanoid, clean silhouette, no text watermark", 14000),
    ("player_mage.glb", "characters", "Fantasy mage wizard character wearing robes and pointed hat, holding staff, t-pose, game-ready low-poly 3D model, full-body humanoid, clean silhouette", 14000),
    ("player_ranger.glb", "characters", "Fantasy ranger archer character in leather armor with hood and bow, t-pose, game-ready low-poly 3D model, full-body humanoid", 14000),

    # NPCs (12k poly)
    ("npc_guard.glb", "characters", "Medieval city guard NPC in chainmail armor with spear and shield, standing pose, game-ready low-poly 3D model", 12000),
    ("npc_merchant.glb", "characters", "Medieval merchant NPC in colorful clothing with belt pouch, friendly pose, game-ready low-poly 3D model", 12000),
    ("npc_blacksmith.glb", "characters", "Muscular blacksmith NPC in leather apron holding hammer, standing pose, game-ready low-poly 3D model", 12000),

    # Monsters
    ("wolf_red.glb", "monsters", "Aggressive red wolf beast monster, snarling pose, fur detailed, fantasy creature, game-ready low-poly 3D model", 8000),
    ("bear_brown.glb", "monsters", "Large brown bear beast monster, standing upright threatening pose, fantasy creature, game-ready low-poly 3D model", 8000),
    ("skeleton_warrior.glb", "monsters", "Undead skeleton warrior monster holding rusted sword and broken shield, combat stance, game-ready low-poly 3D model", 12000),
    ("orc_grunt.glb", "monsters", "Green-skinned orc grunt monster in crude armor wielding club, aggressive pose, game-ready low-poly 3D model", 12000),

    # Buildings (10-14k poly)
    ("house_small.glb", "buildings", "Small medieval fantasy cottage house, thatched roof, timber frame, stone foundation, game-ready low-poly 3D model for RPG", 10000),
    ("house_medium.glb", "buildings", "Medium medieval fantasy house two-story, wooden frame with plaster walls, tiled roof, game-ready low-poly 3D model", 12000),
    ("tavern.glb", "buildings", "Medieval fantasy tavern inn building, two-story with sign and outdoor area, warm lighting, game-ready low-poly 3D model", 12000),
    ("shop.glb", "buildings", "Medieval fantasy shop market building with open storefront and awning, game-ready low-poly 3D model", 12000),
    ("blacksmith.glb", "buildings", "Medieval fantasy blacksmith forge building with chimney and anvil visible, game-ready low-poly 3D model", 12000),
    ("castle_tower.glb", "buildings", "Medieval fantasy castle tower, round stone tower with crenellations and arrow slits, game-ready low-poly 3D model", 14000),
    ("castle_keep.glb", "buildings", "Medieval fantasy castle keep main hall, large fortified stone building with towers, game-ready low-poly 3D model", 14000),

    # Walls (8k poly)
    ("wall_straight.glb", "props", "Medieval stone wall section, straight modular segment, fortified battlements on top, game-ready low-poly 3D model", 8000),
    ("wall_gate.glb", "props", "Medieval city gate with portcullis and stone archway, fortified entrance, game-ready low-poly 3D model", 8000),

    # Dungeon modules (10k poly)
    ("dungeon_entrance.glb", "props", "Dark fantasy dungeon entrance, stone archway with iron gate, torch sconces, mossy stones, game-ready low-poly 3D model", 10000),
    ("dungeon_corridor.glb", "props", "Dark fantasy dungeon stone corridor hallway with pillars and torches, modular snap-ready, game-ready low-poly 3D model", 10000),
    ("dungeon_room.glb", "props", "Dark fantasy dungeon chamber room with columns and altar, modular snap-ready, game-ready low-poly 3D model", 10000),

    # Roads (2k poly)
    ("road_straight.glb", "props", "Medieval cobblestone road tile straight section, modular top-down, dirt edges, game-ready low-poly 3D model", 2000),
    ("road_corner.glb", "props", "Medieval cobblestone road tile corner bend section, modular top-down, game-ready low-poly 3D model", 2000),
    ("road_junction.glb", "props", "Medieval cobblestone road tile T-junction section, modular top-down, game-ready low-poly 3D model", 2000),
    ("road_crossroads.glb", "props", "Medieval cobblestone road tile crossroads intersection, modular top-down, game-ready low-poly 3D model", 2000),

    # Nature
    ("tree_oak.glb", "props", "Large oak tree with full green canopy, thick trunk, nature asset for fantasy RPG world, game-ready low-poly 3D model", 5000),
    ("tree_pine.glb", "props", "Tall pine evergreen conifer tree, forest tree asset for fantasy RPG world, game-ready low-poly 3D model", 5000),
    ("rock_large.glb", "props", "Large boulder rock formation, grey stone, nature terrain asset, game-ready low-poly 3D model", 3000),
    ("well.glb", "props", "Medieval stone water well with wooden roof and bucket, village prop, game-ready low-poly 3D model", 1500),

    # Weapons
    ("sword_iron.glb", "equipment/weapons", "Iron medieval sword, simple one-handed blade with crossguard, weapon prop, game-ready low-poly 3D model", 3000),
    ("axe_battle.glb", "equipment/weapons", "Medieval battle axe one-handed, wooden handle with iron head, weapon prop, game-ready low-poly 3D model", 3000),
    ("staff_mage.glb", "equipment/weapons", "Fantasy mage staff with crystal orb on top, ornate wooden shaft, weapon prop, game-ready low-poly 3D model", 4000),

    # Items
    ("potion_health.glb", "props", "Red health potion in glass bottle with cork stopper, glowing liquid, game item prop, game-ready low-poly 3D model", 1500),
    ("chest_treasure.glb", "props", "Medieval treasure chest wooden with iron bands and lock, slightly open with gold glow, game-ready low-poly 3D model", 1500),

    # Extra - portal
    ("portal.glb", "props", "Obsidian dark fantasy portal, swirling purple energy gate, floating stone archway, game-ready low-poly 3D model", 10000),
    # Extra - goblin
    ("goblin.glb", "monsters", "Green goblin monster creature, small humanoid with pointed ears and crude dagger, crouching aggressive pose, game-ready low-poly 3D model", 8000),
]

def log(msg):
    print(msg, flush=True)
    sys.stdout.flush()

def api_request(method, path, payload=None, timeout=180):
    url = f"{API_BASE}{path}"
    headers = {"Authorization": f"Bearer {API_KEY}"}
    data = None
    if payload is not None:
        headers["Content-Type"] = "application/json"
        data = json.dumps(payload).encode("utf-8")
    ctx = ssl.create_default_context()
    req = urllib.request.Request(url, data=data, headers=headers, method=method.upper())
    with urllib.request.urlopen(req, timeout=timeout, context=ctx) as resp:
        raw = resp.read().decode("utf-8")
        return json.loads(raw) if raw else {}

def load_state():
    if STATE_FILE.exists():
        try:
            return json.loads(STATE_FILE.read_text())
        except:
            pass
    return {"completed": [], "failed": [], "tasks": {}}

def save_state(state):
    STATE_FILE.write_text(json.dumps(state, indent=2))

def poll_task(task_id, timeout_s=600, interval_s=10):
    start = time.time()
    while True:
        result = api_request("GET", f"/openapi/v2/text-to-3d/{task_id}")
        status = str(result.get("status", "")).upper()
        progress = result.get("progress", 0)
        log(f"  [{task_id[:8]}] {status} {progress}%")
        if status in ("SUCCEEDED", "FAILED", "CANCELLED"):
            return result
        if time.time() - start > timeout_s:
            raise RuntimeError(f"Timeout after {timeout_s}s: {status}")
        time.sleep(interval_s)

def download_glb(url, dest):
    dest.parent.mkdir(parents=True, exist_ok=True)
    ctx = ssl.create_default_context()
    req = urllib.request.Request(url, method="GET")
    with urllib.request.urlopen(req, timeout=300, context=ctx) as resp:
        dest.write_bytes(resp.read())
    size = dest.stat().st_size
    log(f"  Downloaded: {dest.name} ({size:,} bytes)")
    return size

def generate_asset(filename, subdir, prompt, polycount):
    """Full pipeline: preview -> refine -> download."""
    out_path = OUTPUT_DIR / subdir / filename

    # Step 1: Preview
    log(f"  Creating preview...")
    preview_payload = {
        "mode": "preview",
        "prompt": prompt,
        "model_type": "lowpoly",
        "target_polycount": polycount,
        "topology": "triangle",
        "enable_pbr": False,
        "symmetry_mode": "auto",
    }
    preview = api_request("POST", "/openapi/v2/text-to-3d", preview_payload)
    preview_id = preview.get("result") or preview.get("id")
    if not preview_id:
        raise RuntimeError(f"No preview ID: {preview}")
    log(f"  Preview: {preview_id}")

    # Step 2: Poll preview
    preview_result = poll_task(preview_id, timeout_s=600)
    if preview_result.get("status") != "SUCCEEDED":
        raise RuntimeError(f"Preview failed: {preview_result.get('status')}")

    # Step 3: Refine
    log(f"  Creating refine...")
    refine_payload = {
        "mode": "refine",
        "original_task_id": preview_id,
    }
    refine = api_request("POST", "/openapi/v2/text-to-3d", refine_payload)
    refine_id = refine.get("result") or refine.get("id")
    if not refine_id:
        raise RuntimeError(f"No refine ID: {refine}")
    log(f"  Refine: {refine_id}")

    # Step 4: Poll refine
    refine_result = poll_task(refine_id, timeout_s=900)
    if refine_result.get("status") != "SUCCEEDED":
        raise RuntimeError(f"Refine failed: {refine_result.get('status')}")

    # Step 5: Download
    model_urls = refine_result.get("model_urls", {})
    glb_url = None
    if isinstance(model_urls, dict):
        glb_url = model_urls.get("glb") or model_urls.get("GLB")
    elif isinstance(model_urls, list) and model_urls:
        glb_url = model_urls[0]
    if not glb_url:
        for field in ["glb_url", "model_url", "output_url"]:
            if field in refine_result:
                glb_url = refine_result[field]
                break
    if not glb_url:
        raise RuntimeError(f"No GLB URL: {list(refine_result.keys())}")

    size = download_glb(glb_url, out_path)
    if size < 100:
        log(f"  WARNING: Very small file ({size} bytes)")
    return preview_id, refine_id, size

def main():
    log("=== Meshy Batch Asset Generator v2 ===")

    state = load_state()
    completed = set(state.get("completed", []))

    # Filter
    remaining = [(fn, td, pr, pc) for fn, td, pr, pc in ASSETS if fn not in completed]
    log(f"Already completed: {len(completed)}")
    log(f"To generate: {len(remaining)}")
    log(f"Total defined: {len(ASSETS)}")
    log("")

    # Check balance
    try:
        bal = api_request("GET", "/openapi/v1/balance")
        credits = bal.get("balance", "?")
        log(f"Meshy credits: {credits}")
        est_cost = len(remaining) * 10  # ~10 credits per asset (preview+refine)
        log(f"Estimated cost: ~{est_cost} credits")
    except Exception as e:
        log(f"Warning: balance check failed: {e}")
    log("")

    for i, (filename, subdir, prompt, polycount) in enumerate(remaining):
        log(f"[{i+1}/{len(remaining)}] {filename} ({polycount} polys)")

        try:
            preview_id, refine_id, size = generate_asset(filename, subdir, prompt, polycount)

            completed.add(filename)
            state["completed"] = list(completed)
            state.setdefault("tasks", {})[filename] = {
                "preview_id": preview_id,
                "refine_id": refine_id,
                "size": size,
                "time": time.strftime("%Y-%m-%d %H:%M:%S"),
            }
            save_state(state)
            log(f"  DONE: {filename}")

        except Exception as e:
            err_str = str(e)[:500]
            log(f"  ERROR: {err_str}")
            state.setdefault("failed", []).append({"file": filename, "error": err_str})
            save_state(state)

        log("")

    # Final report
    log("=== Generation Complete ===")
    log(f"Completed: {len(completed)}/{len(ASSETS)}")
    failed = state.get("failed", [])
    log(f"Failed: {len(failed)}")

    if failed:
        log("\nFailed assets:")
        for f in failed:
            log(f"  - {f['file']}: {f['error'][:100]}")

if __name__ == "__main__":
    main()
