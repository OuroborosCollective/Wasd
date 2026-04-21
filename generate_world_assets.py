#!/usr/bin/env python3
"""
Wasd MMORPG World Asset Generator
Generiert komplette 3D-Asset-Bibliothek mit Meshy.ai Plugin
"""

import json
import os
import sys
import time
from pathlib import Path
from typing import Dict, List, Optional

# Meshy Plugin Import
sys.path.insert(0, str(Path.home() / ".hermes" / "plugins" / "mmorpg_meshy_builder"))
from tools import (
    meshy_get_balance,
    meshy_generate_asset,
    meshy_rig_humanoid,
    mmorpg_validate_asset_contract,
    mmorpg_generate_blueprint
)

# Konfiguration
WASD_ROOT = Path("/tmp/Wasd")
ASSETS_DIR = WASD_ROOT / "world-assets"
GAME_DATA_DIR = WASD_ROOT / "game-data"
GENERATED_DIR = WASD_ROOT / "generated-assets"

# Asset-Definitionen
ASSET_DEFINITIONS = {
    # Fehlende Assets
    "missing": [
        {
            "name": "uschi",
            "profile": "chr_npc_humanoid",
            "prompt": "Fantasy NPC girl character, cute design, medieval clothing, friendly appearance",
            "theme": "medieval",
            "biome": "village",
            "tier": 2,
            "tags": ["npc", "questgiver", "friendly"]
        },
        {
            "name": "goblin",
            "profile": "mon_humanoid",
            "prompt": "Aggressive goblin monster, green skin, crude armor, menacing pose",
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
    ],
    
    # Siedlungs-Assets
    "settlements": [
        {
            "name": "village_house_small",
            "profile": "bld_walkable_house",
            "prompt": "Small medieval village house, thatched roof, wooden construction, walkable interior",
            "theme": "medieval",
            "biome": "temperate",
            "tier": 1,
            "tags": ["house", "village", "walkable"]
        },
        {
            "name": "village_house_medium",
            "profile": "bld_walkable_house",
            "prompt": "Medium medieval village house, two stories, stone and wood, walkable interior",
            "theme": "medieval",
            "biome": "temperate",
            "tier": 2,
            "tags": ["house", "village", "walkable"]
        },
        {
            "name": "village_shop_general",
            "profile": "bld_shop_house",
            "prompt": "Medieval general goods shop, storefront with awning, walkable interior",
            "theme": "medieval",
            "biome": "temperate",
            "tier": 1,
            "tags": ["shop", "merchant", "walkable"]
        },
        {
            "name": "village_tavern",
            "profile": "bld_walkable_house",
            "prompt": "Medieval tavern building, warm lighting, inviting entrance, walkable interior",
            "theme": "medieval",
            "biome": "temperate",
            "tier": 2,
            "tags": ["tavern", "inn", "walkable"]
        },
        {
            "name": "village_blacksmith",
            "profile": "bld_shop_house",
            "prompt": "Medieval blacksmith forge, chimney with smoke, anvil outside, walkable interior",
            "theme": "medieval",
            "biome": "temperate",
            "tier": 2,
            "tags": ["blacksmith", "crafting", "walkable"]
        },
        {
            "name": "village_well",
            "profile": "sct_small",
            "prompt": "Stone village well with wooden roof, rope and bucket, centerpiece",
            "theme": "medieval",
            "biome": "temperate",
            "tier": 1,
            "tags": ["well", "water", "poi"]
        }
    ],
    
    # Stadt-Assets
    "city": [
        {
            "name": "city_house_noble",
            "profile": "bld_walkable_house",
            "prompt": "Noble city house, ornate architecture, large windows, walkable interior",
            "theme": "gothic",
            "biome": "urban",
            "tier": 3,
            "tags": ["noble", "wealthy", "walkable"]
        },
        {
            "name": "city_gate_grand",
            "profile": "wal_city_wall",
            "prompt": "Grand city gate, fortified towers, portcullis, modular connection",
            "theme": "gothic",
            "biome": "urban",
            "tier": 3,
            "tags": ["gate", "fortification", "modular"]
        },
        {
            "name": "city_wall_straight",
            "profile": "wal_city_wall",
            "prompt": "City wall segment, stone construction, battlements, modular connection",
            "theme": "gothic",
            "biome": "urban",
            "tier": 2,
            "tags": ["wall", "fortification", "modular"]
        }
    ],
    
    # Burg-Assets
    "castle": [
        {
            "name": "castle_tower",
            "profile": "bld_castle_module",
            "prompt": "Medieval castle tower, fortified, arrow slits, modular connection",
            "theme": "medieval",
            "biome": "mountain",
            "tier": 3,
            "tags": ["tower", "castle", "modular"]
        },
        {
            "name": "castle_keep",
            "profile": "bld_castle_module",
            "prompt": "Castle central keep, large fortified building, modular connection",
            "theme": "medieval",
            "biome": "mountain",
            "tier": 3,
            "tags": ["keep", "castle", "modular"]
        },
        {
            "name": "castle_gatehouse",
            "profile": "wal_city_wall",
            "prompt": "Castle gatehouse, drawbridge, fortified entrance, modular connection",
            "theme": "medieval",
            "biome": "mountain",
            "tier": 3,
            "tags": ["gate", "castle", "modular"]
        }
    ],
    
    # Dungeon-Assets
    "dungeon": [
        {
            "name": "dungeon_entrance",
            "profile": "dng_module",
            "prompt": "Dungeon entrance, dark archway, torches, modular connection",
            "theme": "dark",
            "biome": "underground",
            "tier": 1,
            "tags": ["entrance", "dungeon", "modular"]
        },
        {
            "name": "dungeon_corridor_straight",
            "profile": "dng_module",
            "prompt": "Dungeon corridor, stone walls, straight section, modular connection",
            "theme": "dark",
            "biome": "underground",
            "tier": 1,
            "tags": ["corridor", "dungeon", "modular"]
        },
        {
            "name": "dungeon_room_boss",
            "profile": "dng_module",
            "prompt": "Large boss room, altar in center, dramatic lighting, modular connection",
            "theme": "dark",
            "biome": "underground",
            "tier": 3,
            "tags": ["boss", "dungeon", "modular"]
        },
        {
            "name": "dungeon_altar",
            "profile": "sct_small",
            "prompt": "Dark altar with glowing runes, sacrificial stone, boss anchor",
            "theme": "dark",
            "biome": "underground",
            "tier": 2,
            "tags": ["altar", "poi", "boss_anchor"]
        }
    ],
    
    # Straßen-Assets
    "roads": [
        {
            "name": "road_straight",
            "profile": "rds_tile",
            "prompt": "Medieval cobblestone road, straight section, modular connection",
            "theme": "medieval",
            "biome": "temperate",
            "tier": 1,
            "tags": ["road", "straight", "modular"]
        },
        {
            "name": "road_corner",
            "profile": "rds_tile",
            "prompt": "Medieval cobblestone road, corner turn, modular connection",
            "theme": "medieval",
            "biome": "temperate",
            "tier": 1,
            "tags": ["road", "corner", "modular"]
        },
        {
            "name": "road_t_junction",
            "profile": "rds_tile",
            "prompt": "Medieval cobblestone road, T-junction, modular connection",
            "theme": "medieval",
            "biome": "temperate",
            "tier": 1,
            "tags": ["road", "junction", "modular"]
        },
        {
            "name": "road_crossroads",
            "profile": "rds_tile",
            "prompt": "Medieval cobblestone road, four-way crossroads, modular connection",
            "theme": "medieval",
            "biome": "temperate",
            "tier": 1,
            "tags": ["road", "crossroads", "modular"]
        }
    ],
    
    # Charaktere
    "characters": [
        {
            "name": "player_warrior",
            "profile": "chr_player_humanoid",
            "prompt": "Fantasy warrior character, heavy armor, sword and shield, t-pose",
            "theme": "medieval",
            "biome": "temperate",
            "tier": 2,
            "tags": ["player", "warrior", "riggable"]
        },
        {
            "name": "player_mage",
            "profile": "chr_player_humanoid",
            "prompt": "Fantasy mage character, robes, staff, magical aura, t-pose",
            "theme": "mystical",
            "biome": "temperate",
            "tier": 2,
            "tags": ["player", "mage", "riggable"]
        },
        {
            "name": "player_ranger",
            "profile": "chr_player_humanoid",
            "prompt": "Fantasy ranger character, leather armor, bow, forest camouflage, t-pose",
            "theme": "forest",
            "biome": "forest",
            "tier": 2,
            "tags": ["player", "ranger", "riggable"]
        },
        {
            "name": "npc_guard",
            "profile": "chr_npc_humanoid",
            "prompt": "City guard NPC, uniform, spear, standing watch, t-pose",
            "theme": "medieval",
            "biome": "urban",
            "tier": 1,
            "tags": ["npc", "guard", "riggable"]
        },
        {
            "name": "npc_merchant",
            "profile": "chr_npc_humanoid",
            "prompt": "Traveling merchant NPC, colorful clothing, pack mule, t-pose",
            "theme": "medieval",
            "biome": "temperate",
            "tier": 1,
            "tags": ["npc", "merchant", "riggable"]
        },
        {
            "name": "npc_blacksmith",
            "profile": "chr_npc_humanoid",
            "prompt": "Blacksmith NPC, muscular, leather apron, hammer, t-pose",
            "theme": "medieval",
            "biome": "temperate",
            "tier": 1,
            "tags": ["npc", "blacksmith", "riggable"]
        }
    ],
    
    # Monster
    "monsters": [
        {
            "name": "wolf_red",
            "profile": "mon_beast",
            "prompt": "Aggressive red wolf, snarling, fur detailed, combat ready",
            "theme": "forest",
            "biome": "forest",
            "tier": 1,
            "tags": ["wolf", "beast", "enemy"]
        },
        {
            "name": "bear_brown",
            "profile": "mon_beast",
            "prompt": "Large brown bear, standing, claws extended, menacing",
            "theme": "forest",
            "biome": "forest",
            "tier": 2,
            "tags": ["bear", "beast", "enemy"]
        },
        {
            "name": "skeleton_warrior",
            "profile": "mon_humanoid",
            "prompt": "Undead skeleton warrior, rusted armor, sword, glowing eyes, a-pose",
            "theme": "undead",
            "biome": "dungeon",
            "tier": 2,
            "tags": ["undead", "skeleton", "riggable"]
        },
        {
            "name": "orc_grunt",
            "profile": "mon_humanoid",
            "prompt": "Orc grunt, green skin, crude armor, club, a-pose",
            "theme": "dark",
            "biome": "mountain",
            "tier": 1,
            "tags": ["orc", "humanoid", "riggable"]
        }
    ],
    
    # Tiere
    "animals": [
        {
            "name": "horse_brown",
            "profile": "ani_quadruped",
            "prompt": "Brown horse, saddled, noble posture, mount ready",
            "theme": "medieval",
            "biome": "temperate",
            "tier": 2,
            "tags": ["horse", "mount", "animal"]
        },
        {
            "name": "deer_stag",
            "profile": "ani_quadruped",
            "prompt": "Noble stag deer, large antlers, forest dwelling",
            "theme": "forest",
            "biome": "forest",
            "tier": 1,
            "tags": ["deer", "animal", "forest"]
        },
        {
            "name": "pig_farm",
            "profile": "ani_quadruped",
            "prompt": "Domestic pig, pink, farm animal, friendly",
            "theme": "medieval",
            "biome": "temperate",
            "tier": 1,
            "tags": ["pig", "farm", "animal"]
        }
    ],
    
    # Waffen
    "weapons": [
        {
            "name": "sword_iron_1h",
            "profile": "wpn_1h",
            "prompt": "Iron one-handed sword, simple guard, leather grip",
            "theme": "medieval",
            "biome": "temperate",
            "tier": 1,
            "tags": ["sword", "weapon", "1h"]
        },
        {
            "name": "axe_battle_2h",
            "profile": "wpn_2h",
            "prompt": "Large two-handed battle axe, wooden haft, iron head",
            "theme": "medieval",
            "biome": "temperate",
            "tier": 2,
            "tags": ["axe", "weapon", "2h"]
        },
        {
            "name": "bow_long",
            "profile": "wpn_2h",
            "prompt": "Longbow, wooden, with bowstring, ranged weapon",
            "theme": "medieval",
            "biome": "forest",
            "tier": 1,
            "tags": ["bow", "weapon", "ranged"]
        },
        {
            "name": "staff_mage",
            "profile": "wpn_2h",
            "prompt": "Magical staff, crystal orb on top, glowing runes",
            "theme": "mystical",
            "biome": "temperate",
            "tier": 2,
            "tags": ["staff", "weapon", "mage"]
        }
    ],
    
    # Rüstung
    "armor": [
        {
            "name": "chestplate_iron",
            "profile": "arm_piece",
            "prompt": "Iron chestplate armor, polished, medieval design",
            "theme": "medieval",
            "biome": "temperate",
            "tier": 1,
            "tags": ["armor", "chest", "iron"]
        },
        {
            "name": "shield_wooden_round",
            "profile": "arm_piece",
            "prompt": "Wooden round shield, iron rim, leather straps",
            "theme": "medieval",
            "biome": "temperate",
            "tier": 1,
            "tags": ["shield", "armor", "wooden"]
        },
        {
            "name": "helmet_iron",
            "profile": "arm_piece",
            "prompt": "Iron helmet, nose guard, medieval design",
            "theme": "medieval",
            "biome": "temperate",
            "tier": 1,
            "tags": ["helmet", "armor", "iron"]
        }
    ],
    
    # Items
    "items": [
        {
            "name": "potion_health",
            "profile": "itm_consumable",
            "prompt": "Red health potion, glass bottle, cork stopper, glowing liquid",
            "theme": "mystical",
            "biome": "temperate",
            "tier": 1,
            "tags": ["potion", "health", "consumable"]
        },
        {
            "name": "potion_mana",
            "profile": "itm_consumable",
            "prompt": "Blue mana potion, glass bottle, cork stopper, glowing liquid",
            "theme": "mystical",
            "biome": "temperate",
            "tier": 1,
            "tags": ["potion", "mana", "consumable"]
        },
        {
            "name": "scroll_teleport",
            "profile": "itm_consumable",
            "prompt": "Magical teleport scroll, parchment, glowing runes",
            "theme": "mystical",
            "biome": "temperate",
            "tier": 2,
            "tags": ["scroll", "teleport", "consumable"]
        },
        {
            "name": "key_dungeon",
            "profile": "itm_consumable",
            "prompt": "Ornate dungeon key, iron, intricate design",
            "theme": "dark",
            "biome": "dungeon",
            "tier": 2,
            "tags": ["key", "dungeon", "item"]
        }
    ],
    
    # Umgebung
    "environment": [
        {
            "name": "tree_oak_large",
            "profile": "env_tree",
            "prompt": "Large oak tree, full canopy, detailed bark, forest scenery",
            "theme": "forest",
            "biome": "temperate",
            "tier": 1,
            "tags": ["tree", "oak", "environment"]
        },
        {
            "name": "tree_pine_tall",
            "profile": "env_tree",
            "prompt": "Tall pine tree, coniferous, mountain forest, scenery",
            "theme": "forest",
            "biome": "mountain",
            "tier": 1,
            "tags": ["tree", "pine", "environment"]
        },
        {
            "name": "rock_granite_large",
            "profile": "env_rock",
            "prompt": "Large granite rock formation, detailed surface, terrain dressing",
            "theme": "mountain",
            "biome": "mountain",
            "tier": 1,
            "tags": ["rock", "granite", "environment"]
        },
        {
            "name": "bush_berry",
            "profile": "sct_small",
            "prompt": "Berry bush, red berries, green leaves, harvestable",
            "theme": "forest",
            "biome": "forest",
            "tier": 1,
            "tags": ["bush", "berry", "harvestable"]
        }
    ]
}

def check_balance():
    """Prüft Meshy Guthaben"""
    result = meshy_get_balance({})
    data = json.loads(result)
    if data.get("ok"):
        balance = data["balance"]["balance"]
        print(f"Meshy Guthaben: {balance} Credits")
        return balance
    else:
        print(f"Fehler beim Guthaben-Check: {data}")
        return 0

def generate_asset(asset_def: Dict, category: str) -> Optional[Dict]:
    """Generiert ein einzelnes Asset"""
    print(f"\nGeneriere: {asset_def['name']} ({asset_def['profile']})")
    
    # Validierung
    validation = mmorpg_validate_asset_contract({
        "asset_name": f"{asset_def['profile'].split('_')[0]}_{asset_def['theme']}_{asset_def['name']}_t{asset_def['tier']}_v001",
        "asset_profile": asset_def['profile'],
        "tier": asset_def['tier'],
        "tags": asset_def.get('tags', [])
    })
    
    val_data = json.loads(validation)
    if not val_data.get("valid"):
        print(f"  Warnung: Validierung fehlgeschlagen: {val_data.get('errors')}")
    
    # Asset generieren
    result = meshy_generate_asset({
        "asset_name": asset_def['name'],
        "asset_profile": asset_def['profile'],
        "prompt": asset_def['prompt'],
        "theme": asset_def.get('theme', ''),
        "biome": asset_def.get('biome', ''),
        "tier": asset_def['tier'],
        "extra_tags": asset_def.get('tags', []),
        "download_dir": str(GENERATED_DIR / category),
        "target_formats": ["glb"],
        "enable_pbr": True
    })
    
    data = json.loads(result)
    if data.get("ok"):
        print(f"  Erfolg: {asset_def['name']} generiert")
        return data
    else:
        print(f"  Fehler: {data.get('error')}")
        return None

def generate_blueprint(blueprint_type: str, theme: str, biome: str, tier: int):
    """Generiert einen kompletten Blueprint"""
    print(f"\nGeneriere Blueprint: {blueprint_type} ({theme}, {biome}, Tier {tier})")
    
    result = mmorpg_generate_blueprint({
        "blueprint_type": blueprint_type,
        "theme": theme,
        "biome": biome,
        "tier": tier
    })
    
    data = json.loads(result)
    if data.get("ok"):
        print(f"  Blueprint generiert mit {len(data.get('required_assets', []))} Assets")
        return data
    else:
        print(f"  Fehler: {data.get('error')}")
        return None

def save_generation_report(results: Dict):
    """Speichert Generierungsbericht"""
    report_path = GENERATED_DIR / "generation_report.json"
    with open(report_path, 'w') as f:
        json.dump(results, f, indent=2, ensure_ascii=False)
    print(f"\nBericht gespeichert: {report_path}")

def main():
    """Hauptfunktion"""
    print("=" * 60)
    print("Wasd MMORPG World Asset Generator")
    print("=" * 60)
    
    # Guthaben prüfen
    balance = check_balance()
    if balance < 100:
        print("Warnung: Niedriges Guthaben!")
        response = input("Trotzdem fortfahren? (j/n): ")
        if response.lower() != 'j':
            return
    
    # Ordner erstellen
    GENERATED_DIR.mkdir(parents=True, exist_ok=True)
    for category in ASSET_DEFINITIONS.keys():
        (GENERATED_DIR / category).mkdir(parents=True, exist_ok=True)
    
    # Generierung
    results = {
        "timestamp": time.time(),
        "balance_start": balance,
        "generated": {},
        "failed": {},
        "blueprints": {}
    }
    
    # Einzelne Assets generieren
    for category, assets in ASSET_DEFINITIONS.items():
        print(f"\n{'='*40}")
        print(f"Kategorie: {category}")
        print(f"{'='*40}")
        
        results["generated"][category] = []
        results["failed"][category] = []
        
        for asset_def in assets:
            result = generate_asset(asset_def, category)
            if result:
                results["generated"][category].append({
                    "name": asset_def['name'],
                    "profile": asset_def['profile'],
                    "result": result
                })
            else:
                results["failed"][category].append(asset_def['name'])
            
            # Pause zwischen Generierungen
            time.sleep(2)
    
    # Blueprints generieren
    print(f"\n{'='*40}")
    print("Generiere Blueprints")
    print(f"{'='*40}")
    
    blueprints = [
        ("village", "medieval", "temperate", 1),
        ("town", "medieval", "temperate", 2),
        ("city", "gothic", "urban", 3),
        ("castle", "medieval", "mountain", 3),
        ("dungeon", "dark", "underground", 2),
        ("roadkit", "medieval", "temperate", 1),
        ("forestkit", "forest", "forest", 1),
        ("graveyard", "dark", "temperate", 2)
    ]
    
    for bp_type, theme, biome, tier in blueprints:
        bp_result = generate_blueprint(bp_type, theme, biome, tier)
        if bp_result:
            results["blueprints"][bp_type] = bp_result
        time.sleep(1)
    
    # Finanzstatus
    balance_end = check_balance()
    results["balance_end"] = balance_end
    results["credits_used"] = balance - balance_end
    
    # Bericht speichern
    save_generation_report(results)
    
    print("\n" + "=" * 60)
    print("Generierung abgeschlossen!")
    print(f"Credits verbraucht: {results['credits_used']}")
    print(f"Erfolgreich: {sum(len(v) for v in results['generated'].values())}")
    print(f"Fehlgeschlagen: {sum(len(v) for v in results['failed'].values())}")
    print("=" * 60)

if __name__ == "__main__":
    main()