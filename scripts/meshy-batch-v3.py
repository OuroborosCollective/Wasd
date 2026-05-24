#!/usr/bin/env python3
"""Meshy batch generator v3 - uses curl for API calls (urllib blocked in env)."""

import json
import os
import subprocess
import sys
import time
from pathlib import Path

API_KEY = os.getenv("MESHY_API_KEY")
if not API_KEY:
    print("ERROR: MESHY_API_KEY environment variable is not set.")
    sys.exit(1)
API_BASE = "https://api.meshy.ai"
OUTPUT_DIR = Path("/tmp/Wasd/generated-assets")
STATE_FILE = Path("/tmp/Wasd/scripts/batch-gen-state.json")

ASSETS = [
    ("player_warrior.glb", "characters", "Medieval fantasy warrior knight character in full plate armor with sword, t-pose, game-ready low-poly 3D model, full-body humanoid, clean silhouette", 14000),
    ("player_mage.glb", "characters", "Fantasy mage wizard character wearing robes and pointed hat, holding staff, t-pose, game-ready low-poly 3D model, full-body humanoid", 14000),
    ("player_ranger.glb", "characters", "Fantasy ranger archer character in leather armor with hood and bow, t-pose, game-ready low-poly 3D model, full-body humanoid", 14000),
    ("npc_guard.glb", "characters", "Medieval city guard NPC in chainmail armor with spear and shield, standing pose, game-ready low-poly 3D model", 12000),
    ("npc_merchant.glb", "characters", "Medieval merchant NPC in colorful clothing with belt pouch, friendly pose, game-ready low-poly 3D model", 12000),
    ("npc_blacksmith.glb", "characters", "Muscular blacksmith NPC in leather apron holding hammer, standing pose, game-ready low-poly 3D model", 12000),
    ("wolf_red.glb", "monsters", "Aggressive red wolf beast monster, snarling pose, fur detailed, fantasy creature, game-ready low-poly 3D model", 8000),
    ("bear_brown.glb", "monsters", "Large brown bear beast monster, standing upright threatening pose, fantasy creature, game-ready low-poly 3D model", 8000),
    ("skeleton_warrior.glb", "monsters", "Undead skeleton warrior monster holding rusted sword and broken shield, combat stance, game-ready low-poly 3D model", 12000),
    ("orc_grunt.glb", "monsters", "Green-skinned orc grunt monster in crude armor wielding club, aggressive pose, game-ready low-poly 3D model", 12000),
    ("house_small.glb", "buildings", "Small medieval fantasy cottage house, thatched roof, timber frame, stone foundation, game-ready low-poly 3D model", 10000),
    ("house_medium.glb", "buildings", "Medium medieval fantasy house two-story, wooden frame with plaster walls, tiled roof, game-ready low-poly 3D model", 12000),
    ("tavern.glb", "buildings", "Medieval fantasy tavern inn building, two-story with sign and outdoor area, warm lighting, game-ready low-poly 3D model", 12000),
    ("shop.glb", "buildings", "Medieval fantasy shop market building with open storefront and awning, game-ready low-poly 3D model", 12000),
    ("blacksmith.glb", "buildings", "Medieval fantasy blacksmith forge building with chimney and anvil visible, game-ready low-poly 3D model", 12000),
    ("castle_tower.glb", "buildings", "Medieval fantasy castle tower, round stone with crenellations and arrow slits, game-ready low-poly 3D model", 14000),
    ("castle_keep.glb", "buildings", "Medieval fantasy castle keep main hall, large fortified stone building with towers, game-ready low-poly 3D model", 14000),
    ("wall_straight.glb", "props", "Medieval stone wall section, straight modular segment, fortified battlements on top, game-ready low-poly 3D model", 8000),
    ("wall_gate.glb", "props", "Medieval city gate with portcullis and stone archway, fortified entrance, game-ready low-poly 3D model", 8000),
    ("dungeon_entrance.glb", "props", "Dark fantasy dungeon entrance, stone archway with iron gate, torch sconces, mossy stones, game-ready low-poly 3D model", 10000),
    ("dungeon_corridor.glb", "props", "Dark fantasy dungeon stone corridor hallway with pillars and torches, modular snap-ready, game-ready low-poly 3D model", 10000),
    ("dungeon_room.glb", "props", "Dark fantasy dungeon chamber room with columns and altar, modular snap-ready, game-ready low-poly 3D model", 10000),
    ("road_straight.glb", "props", "Medieval cobblestone road tile straight section, modular top-down, dirt edges, game-ready low-poly 3D model", 2000),
    ("road_corner.glb", "props", "Medieval cobblestone road tile corner bend section, modular top-down, game-ready low-poly 3D model", 2000),
    ("road_junction.glb", "props", "Medieval cobblestone road tile T-junction section, modular top-down, game-ready low-poly 3D model", 2000),
    ("road_crossroads.glb", "props", "Medieval cobblestone road tile crossroads intersection, modular top-down, game-ready low-poly 3D model", 2000),
    ("tree_oak.glb", "props", "Large oak tree with full green canopy, thick trunk, nature asset for fantasy RPG, game-ready low-poly 3D model", 5000),
    ("tree_pine.glb", "props", "Tall pine evergreen conifer tree, forest tree asset for fantasy RPG, game-ready low-poly 3D model", 5000),
    ("rock_large.glb", "props", "Large boulder rock formation, grey stone, nature terrain asset, game-ready low-poly 3D model", 3000),
    ("well.glb", "props", "Medieval stone water well with wooden roof and bucket, village prop, game-ready low-poly 3D model", 1500),
    ("sword_iron.glb", "equipment/weapons", "Iron medieval sword, one-handed blade with crossguard, weapon prop, game-ready low-poly 3D model", 3000),
    ("axe_battle.glb", "equipment/weapons", "Medieval battle axe one-handed, wooden handle with iron head, weapon prop, game-ready low-poly 3D model", 3000),
    ("staff_mage.glb", "equipment/weapons", "Fantasy mage staff with crystal orb on top, ornate wooden shaft, weapon prop, game-ready low-poly 3D model", 4000),
    ("potion_health.glb", "props", "Red health potion in glass bottle with cork stopper, glowing liquid, game item prop, game-ready low-poly 3D model", 1500),
    ("chest_treasure.glb", "props", "Medieval treasure chest wooden with iron bands and lock, slightly open with gold glow, game-ready low-poly 3D model", 1500),
    ("portal.glb", "props", "Obsidian dark fantasy portal, swirling purple energy gate, floating stone archway, game-ready low-poly 3D model", 10000),
    ("goblin.glb", "monsters", "Green goblin monster creature, small humanoid with pointed ears and crude dagger, aggressive pose, game-ready low-poly 3D model", 8000),
]

def log(msg):
    print(msg, flush=True)

def curl_api(method, path, payload=None):
    url = f"{API_BASE}{path}"
    cmd = ["curl", "-s", "--max-time", "120", "-X", method.upper(),
           "-H", f"Authorization: Bearer {API_KEY}"]
    if payload is not None:
        cmd += ["-H", "Content-Type: application/json",
                "-d", json.dumps(payload)]
    cmd.append(url)
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=180)
    if result.returncode != 0:
        raise RuntimeError(f"curl failed (rc={result.returncode}): {result.stderr[:200]}")
    if not result.stdout.strip():
        raise RuntimeError("Empty response from API")
    return json.loads(result.stdout)

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
        result = curl_api("GET", f"/openapi/v2/text-to-3d/{task_id}")
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
    cmd = ["curl", "-sL", "--max-time", "300", "-o", str(dest), url]
    subprocess.run(cmd, timeout=360, check=True)
    size = dest.stat().st_size
    log(f"  Downloaded: {dest.name} ({size:,} bytes)")
    return size

def generate_asset(filename, subdir, prompt, polycount):
    out_path = OUTPUT_DIR / subdir / filename

    # Preview
    log(f"  Creating preview...")
    preview = curl_api("POST", "/openapi/v2/text-to-3d", {
        "mode": "preview",
        "prompt": prompt + ". single isolated game-ready asset. clean readable silhouette. no text or watermark. no base plate. centered composition. suitable for GLB export. fantasy MMORPG art direction.",
        "model_type": "lowpoly",
        "target_polycount": polycount,
        "topology": "triangle",
        "enable_pbr": False,
    })
    preview_id = preview.get("result") or preview.get("id")
    if not preview_id:
        raise RuntimeError(f"No preview ID: {str(preview)[:200]}")
    log(f"  Preview: {preview_id}")

    preview_result = poll_task(preview_id, timeout_s=600)
    if preview_result.get("status") != "SUCCEEDED":
        raise RuntimeError(f"Preview {preview_result.get('status')}")

    # Refine
    log(f"  Creating refine...")
    refine = curl_api("POST", "/openapi/v2/text-to-3d", {
        "mode": "refine",
        "original_task_id": preview_id,
    })
    refine_id = refine.get("result") or refine.get("id")
    if not refine_id:
        raise RuntimeError(f"No refine ID: {str(refine)[:200]}")
    log(f"  Refine: {refine_id}")

    refine_result = poll_task(refine_id, timeout_s=900)
    if refine_result.get("status") != "SUCCEEDED":
        raise RuntimeError(f"Refine {refine_result.get('status')}")

    # Extract GLB URL
    model_urls = refine_result.get("model_urls", {})
    glb_url = None
    if isinstance(model_urls, dict):
        glb_url = model_urls.get("glb") or model_urls.get("GLB")
    elif isinstance(model_urls, list) and model_urls:
        glb_url = model_urls[0]
    if not glb_url:
        for f in ["glb_url", "model_url", "output_url"]:
            if f in refine_result:
                glb_url = refine_result[f]
                break
    if not glb_url:
        raise RuntimeError(f"No GLB URL in: {list(refine_result.keys())}")

    size = download_glb(glb_url, out_path)
    return preview_id, refine_id, size

def main():
    log("=== Meshy Batch v3 ===")
    state = load_state()
    completed = set(state.get("completed", []))
    remaining = [a for a in ASSETS if a[0] not in completed]

    log(f"Completed: {len(completed)}/{len(ASSETS)}")
    log(f"To generate: {len(remaining)}")

    try:
        bal = curl_api("GET", "/openapi/v1/balance")
        log(f"Credits: {bal.get('balance', '?')}")
    except Exception as e:
        log(f"Balance check failed: {e}")

    log(f"Estimated cost: ~{len(remaining) * 10} credits")
    log("")

    for i, (filename, subdir, prompt, polycount) in enumerate(remaining):
        log(f"[{i+1}/{len(remaining)}] {filename} ({polycount} polys)")
        try:
            pid, rid, size = generate_asset(filename, subdir, prompt, polycount)
            completed.add(filename)
            state["completed"] = list(completed)
            state.setdefault("tasks", {})[filename] = {
                "preview": pid, "refine": rid, "size": size,
                "time": time.strftime("%Y-%m-%d %H:%M:%S")
            }
            save_state(state)
            log(f"  DONE: {filename}")
        except Exception as e:
            err = str(e)[:500]
            log(f"  FAILED: {err}")
            state.setdefault("failed", []).append({"file": filename, "error": err})
            save_state(state)
        log("")

    log("=== Complete ===")
    log(f"Done: {len(completed)}/{len(ASSETS)}")
    log(f"Failed: {len(state.get('failed', []))}")

if __name__ == "__main__":
    main()
