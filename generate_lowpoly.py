#!/usr/bin/env python3
"""
Wasd MMORPG Asset Generator - Lowpoly Optimiert
Charaktere: Bis 15k Polygone (high quality)
Alles andere: Lowpoly (4-8k Polygone)
"""

import json
import time
import urllib.request
import urllib.error
import os
import sys
from pathlib import Path

API_KEY = os.getenv("MESHY_API_KEY")
if not API_KEY:
    print("Error: MESHY_API_KEY environment variable not set.")
    sys.exit(1)
API_BASE = "https://api.meshy.ai"
DOWNLOAD_DIR = Path("/tmp/Wasd/generated-assets")

def api_request(method, path, payload=None):
    url = f"{API_BASE}{path}"
    headers = {"Authorization": f"Bearer {API_KEY}"}
    data = None
    if payload:
        headers["Content-Type"] = "application/json"
        data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers=headers, method=method.upper())
    with urllib.request.urlopen(req, timeout=180) as resp:
        return json.loads(resp.read().decode("utf-8"))

def poll_task(task_id, task_type="text-to-3d", timeout=600):
    start = time.time()
    while True:
        if task_type == "text-to-3d":
            result = api_request("GET", f"/openapi/v2/text-to-3d/{task_id}")
        else:
            result = api_request("GET", f"/openapi/v1/rigging/{task_id}")
        
        status = str(result.get("status", "")).upper()
        progress = result.get("progress", 0)
        print(f"  Status: {status} ({progress}%)")
        
        if status in {"SUCCEEDED", "FAILED", "CANCELLED"}:
            return result
        if time.time() - start > timeout:
            print(f"  Timeout nach {timeout}s")
            return result
        time.sleep(10)

def download_file(url, target):
    target.parent.mkdir(parents=True, exist_ok=True)
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req, timeout=300) as resp:
        target.write_bytes(resp.read())
    print(f"  Gespeichert: {target}")
    return str(target)

def generate_asset(name, profile, prompt, polycount, topology, rig=False):
    print(f"\n{'='*50}")
    print(f"Generiere: {name}")
    print(f"Profile: {profile}, Poly: {polycount}, Topo: {topology}")
    print(f"{'='*50}")
    
    # Preview
    print("  [1/3] Preview...")
    preview_payload = {
        "mode": "preview",
        "prompt": prompt,
        "model_type": "standard",
        "ai_model": "latest",
        "should_remesh": True,
        "topology": topology,
        "target_polycount": polycount,
        "symmetry_mode": "on" if "humanoid" in profile else "auto",
        "pose_mode": "t-pose" if "chr_" in profile else ""
    }
    
    preview_create = api_request("POST", "/openapi/v2/text-to-3d", preview_payload)
    preview_id = preview_create.get("result")
    if not preview_id:
        print(f"  Fehler: Keine Preview-ID")
        return None
    
    preview = poll_task(preview_id)
    if str(preview.get("status", "")).upper() != "SUCCEEDED":
        print(f"  Fehler: Preview fehlgeschlagen")
        return None
    
    # Refine
    print("  [2/3] Refine...")
    refine_payload = {
        "mode": "refine",
        "preview_task_id": preview_id,
        "target_formats": ["glb"],
        "auto_size": True,
        "enable_pbr": True
    }
    
    refine_create = api_request("POST", "/openapi/v2/text-to-3d", refine_payload)
    refine_id = refine_create.get("result")
    if not refine_id:
        print(f"  Fehler: Keine Refine-ID")
        return None
    
    refine = poll_task(refine_id)
    if str(refine.get("status", "")).upper() != "SUCCEEDED":
        print(f"  Fehler: Refine fehlgeschlagen")
        return None
    
    # Download
    print("  [3/3] Download...")
    model_urls = refine.get("model_urls", {})
    downloaded = {}
    
    for fmt, url in model_urls.items():
        target = DOWNLOAD_DIR / f"{name}.{fmt}"
        try:
            downloaded[fmt] = download_file(url, target)
        except Exception as e:
            print(f"  Download-Fehler ({fmt}): {e}")
    
    # Rigging (optional)
    rigging_result = None
    if rig and profile.startswith("chr_"):
        print("  [Bonus] Rigging...")
        rig_payload = {
            "input_task_id": refine_id,
            "height_meters": 1.8
        }
        try:
            rig_create = api_request("POST", "/openapi/v1/rigging", rig_payload)
            rig_id = rig_create.get("result")
            if rig_id:
                rigging_result = poll_task(rig_id, "rigging")
                if str(rigging_result.get("status", "")).upper() == "SUCCEEDED":
                    result_data = rigging_result.get("result", {})
                    for key in ["rigged_character_glb_url", "rigged_character_fbx_url"]:
                        url = result_data.get(key)
                        if url:
                            suffix = key.replace("rigged_character_", "")
                            target = DOWNLOAD_DIR / f"{name}_rigged.{suffix}"
                            try:
                                download_file(url, target)
                            except Exception as e:
                                print(f"  Rigging-Download-Fehler: {e}")
        except Exception as e:
            print(f"  Rigging-Fehler: {e}")
    
    return {
        "name": name,
        "profile": profile,
        "preview_id": preview_id,
        "refine_id": refine_id,
        "downloaded": downloaded,
        "rigging": rigging_result
    }

def main():
    print("=" * 60)
    print("Wasd MMORPG Asset Generator")
    print("Charaktere: 15k Poly | Rest: Lowpoly")
    print("=" * 60)
    
    DOWNLOAD_DIR.mkdir(parents=True, exist_ok=True)
    
    # Asset-Definitionen
    assets = [
        # FEHLENDE ASSETS
        {
            "name": "uschi",
            "profile": "chr_npc_humanoid",
            "prompt": "Fantasy NPC girl, cute face, braided hair, medieval dress, friendly, t-pose, full-body humanoid, clear hands and feet, clean limb separation",
            "polycount": 15000,
            "topology": "quad",
            "rig": True
        },
        {
            "name": "goblin",
            "profile": "mon_humanoid", 
            "prompt": "Aggressive goblin, green skin, pointed ears, crude leather armor, menacing grin, a-pose, full-body humanoid monster, clear silhouette",
            "polycount": 12000,
            "topology": "quad",
            "rig": True
        },
        {
            "name": "portal_obsidian",
            "profile": "sct_small",
            "prompt": "Mystical obsidian portal, swirling dark purple energy, glowing cyan runes, magical gateway, lowpoly game asset",
            "polycount": 6000,
            "topology": "triangle",
            "rig": False
        },
        
        # SPIELER-CHARAKTERE (15k)
        {
            "name": "player_warrior",
            "profile": "chr_player_humanoid",
            "prompt": "Fantasy warrior, heavy plate armor, helmet, sword pose, t-pose, full-body humanoid, clear hands, readable equipment",
            "polycount": 15000,
            "topology": "quad",
            "rig": True
        },
        {
            "name": "player_mage",
            "profile": "chr_player_humanoid",
            "prompt": "Fantasy mage, flowing robes, hood, staff, mystical glow, t-pose, full-body humanoid, clear hands",
            "polycount": 15000,
            "topology": "quad",
            "rig": True
        },
        {
            "name": "player_ranger",
            "profile": "chr_player_humanoid",
            "prompt": "Fantasy ranger, leather armor, hood, bow, forest cloak, t-pose, full-body humanoid, clear hands",
            "polycount": 15000,
            "topology": "quad",
            "rig": True
        },
        
        # NPCS (12k)
        {
            "name": "npc_guard",
            "profile": "chr_npc_humanoid",
            "prompt": "City guard, uniform, spear, standing watch, t-pose, full-body humanoid",
            "polycount": 12000,
            "topology": "quad",
            "rig": True
        },
        {
            "name": "npc_merchant",
            "profile": "chr_npc_humanoid",
            "prompt": "Traveling merchant, colorful clothes, backpack, friendly, t-pose, full-body humanoid",
            "polycount": 12000,
            "topology": "quad",
            "rig": True
        },
        {
            "name": "npc_blacksmith",
            "profile": "chr_npc_humanoid",
            "prompt": "Blacksmith, muscular, leather apron, hammer, t-pose, full-body humanoid",
            "polycount": 12000,
            "topology": "quad",
            "rig": True
        },
        
        # MONSTER (Lowpoly)
        {
            "name": "wolf_red",
            "profile": "mon_beast",
            "prompt": "Aggressive red wolf, snarling, fur detail, combat stance, lowpoly game monster",
            "polycount": 6000,
            "topology": "triangle",
            "rig": False
        },
        {
            "name": "bear_brown",
            "profile": "mon_beast",
            "prompt": "Large brown bear, standing, claws out, menacing, lowpoly game monster",
            "polycount": 7000,
            "topology": "triangle",
            "rig": False
        },
        {
            "name": "skeleton_warrior",
            "profile": "mon_humanoid",
            "prompt": "Undead skeleton, rusty armor, sword, glowing eyes, a-pose, lowpoly humanoid monster",
            "polycount": 8000,
            "topology": "triangle",
            "rig": True
        },
        {
            "name": "orc_grunt",
            "profile": "mon_humanoid",
            "prompt": "Orc warrior, green skin, tusks, crude armor, club, a-pose, lowpoly humanoid monster",
            "polycount": 8000,
            "topology": "triangle",
            "rig": True
        },
        
        # GEBÄUDE (Lowpoly)
        {
            "name": "bld_house_small",
            "profile": "bld_walkable_house",
            "prompt": "Small medieval house, thatched roof, wooden walls, door, windows, lowpoly game building, walkable interior",
            "polycount": 8000,
            "topology": "triangle",
            "rig": False
        },
        {
            "name": "bld_house_medium",
            "profile": "bld_walkable_house",
            "prompt": "Medium medieval house, two stories, stone base, wooden upper, lowpoly game building",
            "polycount": 10000,
            "topology": "triangle",
            "rig": False
        },
        {
            "name": "bld_tavern",
            "profile": "bld_walkable_house",
            "prompt": "Medieval tavern, warm lighting, sign, inviting entrance, lowpoly game building",
            "polycount": 10000,
            "topology": "triangle",
            "rig": False
        },
        {
            "name": "bld_shop",
            "profile": "bld_shop_house",
            "prompt": "Medieval shop, storefront, awning, goods display, lowpoly game building",
            "polycount": 9000,
            "topology": "triangle",
            "rig": False
        },
        {
            "name": "bld_blacksmith",
            "profile": "bld_shop_house",
            "prompt": "Blacksmith forge, chimney, anvil, tools, lowpoly game building",
            "polycount": 9000,
            "topology": "triangle",
            "rig": False
        },
        
        # BURG-MODULE (Lowpoly)
        {
            "name": "bld_castle_tower",
            "profile": "bld_castle_module",
            "prompt": "Castle tower, fortified, arrow slits, battlements, modular, lowpoly game asset",
            "polycount": 8000,
            "topology": "triangle",
            "rig": False
        },
        {
            "name": "bld_castle_keep",
            "profile": "bld_castle_module",
            "prompt": "Castle keep, large fortified building, entrance, modular, lowpoly game asset",
            "polycount": 12000,
            "topology": "triangle",
            "rig": False
        },
        
        # MAUERN & TORE (Lowpoly)
        {
            "name": "wal_straight",
            "profile": "wal_city_wall",
            "prompt": "Stone wall segment, battlements, modular connection points, lowpoly game asset",
            "polycount": 5000,
            "topology": "triangle",
            "rig": False
        },
        {
            "name": "wal_gate",
            "profile": "wal_city_wall",
            "prompt": "City gate, fortified towers, portcullis, modular, lowpoly game asset",
            "polycount": 8000,
            "topology": "triangle",
            "rig": False
        },
        
        # DUNGEON (Lowpoly)
        {
            "name": "dng_entrance",
            "profile": "dng_module",
            "prompt": "Dungeon entrance, dark archway, torches, modular connection, lowpoly game asset",
            "polycount": 6000,
            "topology": "triangle",
            "rig": False
        },
        {
            "name": "dng_corridor",
            "profile": "dng_module",
            "prompt": "Dungeon corridor, stone walls, straight section, modular, lowpoly game asset",
            "polycount": 5000,
            "topology": "triangle",
            "rig": False
        },
        {
            "name": "dng_room",
            "profile": "dng_module",
            "prompt": "Dungeon boss room, large space, altar center, dramatic, modular, lowpoly game asset",
            "polycount": 8000,
            "topology": "triangle",
            "rig": False
        },
        
        # STRASSEN (Lowpoly)
        {
            "name": "rds_straight",
            "profile": "rds_tile",
            "prompt": "Cobblestone road, straight section, modular connection, lowpoly game tile",
            "polycount": 2000,
            "topology": "triangle",
            "rig": False
        },
        {
            "name": "rds_corner",
            "profile": "rds_tile",
            "prompt": "Cobblestone road, corner turn, modular connection, lowpoly game tile",
            "polycount": 2000,
            "topology": "triangle",
            "rig": False
        },
        {
            "name": "rds_junction",
            "profile": "rds_tile",
            "prompt": "Cobblestone road, T-junction, modular connection, lowpoly game tile",
            "polycount": 2500,
            "topology": "triangle",
            "rig": False
        },
        {
            "name": "rds_crossroads",
            "profile": "rds_tile",
            "prompt": "Cobblestone road, four-way crossroads, modular connection, lowpoly game tile",
            "polycount": 3000,
            "topology": "triangle",
            "rig": False
        },
        
        # WAFFEN (Lowpoly)
        {
            "name": "wpn_sword_iron",
            "profile": "wpn_1h",
            "prompt": "Iron sword, simple guard, leather grip, lowpoly game weapon",
            "polycount": 3000,
            "topology": "triangle",
            "rig": False
        },
        {
            "name": "wpn_axe_battle",
            "profile": "wpn_2h",
            "prompt": "Battle axe, wooden handle, iron head, lowpoly game weapon",
            "polycount": 4000,
            "topology": "triangle",
            "rig": False
        },
        {
            "name": "wpn_staff_mage",
            "profile": "wpn_2h",
            "prompt": "Magic staff, crystal orb, glowing runes, lowpoly game weapon",
            "polycount": 4000,
            "topology": "triangle",
            "rig": False
        },
        
        # ITEMS (Lowpoly)
        {
            "name": "itm_potion_health",
            "profile": "itm_consumable",
            "prompt": "Red health potion, glass bottle, cork, glowing liquid, lowpoly game item",
            "polycount": 1500,
            "topology": "triangle",
            "rig": False
        },
        {
            "name": "itm_chest_treasure",
            "profile": "itm_consumable",
            "prompt": "Treasure chest, wooden with metal bands, open lid, gold coins, lowpoly game item",
            "polycount": 3000,
            "topology": "triangle",
            "rig": False
        },
        
        # UMWELT (Lowpoly)
        {
            "name": "env_tree_oak",
            "profile": "env_tree",
            "prompt": "Oak tree, full canopy, thick trunk, lowpoly game environment asset",
            "polycount": 4000,
            "topology": "triangle",
            "rig": False
        },
        {
            "name": "env_tree_pine",
            "profile": "env_tree",
            "prompt": "Pine tree, tall, coniferous, mountain style, lowpoly game environment asset",
            "polycount": 3500,
            "topology": "triangle",
            "rig": False
        },
        {
            "name": "env_rock_large",
            "profile": "env_rock",
            "prompt": "Large rock formation, granite surface, lowpoly game environment asset",
            "polycount": 3000,
            "topology": "triangle",
            "rig": False
        },
        {
            "name": "sct_well",
            "profile": "sct_small",
            "prompt": "Stone well, wooden roof, rope and bucket, lowpoly game prop",
            "polycount": 3000,
            "topology": "triangle",
            "rig": False
        }
    ]
    
    results = {"success": [], "failed": []}
    
    for asset in assets:
        try:
            result = generate_asset(
                asset["name"],
                asset["profile"],
                asset["prompt"],
                asset["polycount"],
                asset["topology"],
                asset.get("rig", False)
            )
            if result:
                results["success"].append(asset["name"])
            else:
                results["failed"].append(asset["name"])
        except Exception as e:
            print(f"\nFehler bei {asset['name']}: {e}")
            results["failed"].append(asset["name"])
        
        time.sleep(3)  # Pause zwischen Assets
    
    # Bericht
    print("\n" + "=" * 60)
    print("GENERIERUNG ABGESCHLOSSEN")
    print(f"Erfolgreich: {len(results['success'])}")
    print(f"Fehlgeschlagen: {len(results['failed'])}")
    if results["failed"]:
        print(f"Fehlgeschlagene Assets: {', '.join(results['failed'])}")
    print("=" * 60)
    
    # Bericht speichern
    report_path = DOWNLOAD_DIR / "generation_report.json"
    with open(report_path, 'w') as f:
        json.dump(results, f, indent=2)
    print(f"\nBericht: {report_path}")

if __name__ == "__main__":
    main()