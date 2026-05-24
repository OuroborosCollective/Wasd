#!/usr/bin/env python3
"""
Einfacher Asset Generator für fehlende Assets
"""

import os
import sys
import json
from pathlib import Path

# API Key aus Environment laden
if not os.environ.get('MESHY_API_KEY'):
    print("ERROR: MESHY_API_KEY environment variable is not set.")
    sys.exit(1)

# Plugin-Pfad
plugin_path = Path.home() / ".hermes" / "plugins" / "mmorpg_meshy_builder"
sys.path.insert(0, str(plugin_path))

# Import
from tools import meshy_generate_asset

# Konfiguration
ASSETS = [
    {
        "name": "uschi",
        "profile": "chr_npc_humanoid",
        "prompt": "Fantasy NPC girl character, cute design, medieval clothing, friendly appearance, t-pose",
        "theme": "medieval",
        "biome": "village",
        "tier": 2,
        "tags": ["npc", "questgiver", "friendly"]
    },
    {
        "name": "goblin",
        "profile": "mon_humanoid",
        "prompt": "Aggressive goblin monster, green skin, crude armor, menacing pose, a-pose",
        "theme": "dark",
        "biome": "forest",
        "tier": 1,
        "tags": ["monster", "enemy", "goblin"]
    },
    {
        "name": "portal_obsidian",
        "profile": "sct_small",
        "prompt": "Mystical obsidian portal, swirling dark energy, glowing runes, magical gateway",
        "theme": "obsidian",
        "biome": "dungeon",
        "tier": 3,
        "tags": ["portal", "dungeon", "entrance"]
    }
]

def generate():
    """Generiert Assets"""
    print("=" * 50)
    print("Generiere fehlende Assets")
    print("=" * 50)
    
    for asset in ASSETS:
        print(f"\nGeneriere: {asset['name']}...")
        
        result = meshy_generate_asset({
            "asset_name": asset["name"],
            "asset_profile": asset["profile"],
            "prompt": asset["prompt"],
            "theme": asset["theme"],
            "biome": asset["biome"],
            "tier": asset["tier"],
            "extra_tags": asset["tags"],
            "download_dir": "/tmp/Wasd/generated-assets/missing",
            "target_formats": ["glb"],
            "enable_pbr": True
        })
        
        data = json.loads(result)
        
        if data.get("ok"):
            print(f"  Erfolg!")
            print(f"  Preview: {data.get('preview_task_id')}")
            print(f"  Refine: {data.get('refine_task_id')}")
        else:
            print(f"  Fehler: {data.get('error')}")
    
    print("\nFertig!")

if __name__ == "__main__":
    generate()