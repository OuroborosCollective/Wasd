#!/usr/bin/env python3
"""
Asset Mapping Script
Kopiert generierte Assets in die korrekten Wasd-Verzeichnisse
"""

import json
import shutil
from pathlib import Path

# Pfade
GENERATED_DIR = Path("/tmp/Wasd/generated-assets")
ASSETS_DIR = Path("/tmp/Wasd/world-assets")
GAME_DATA_DIR = Path("/tmp/Wasd/game-data")

# Mapping: Kategorie -> Ziel-Verzeichnis
CATEGORY_MAPPING = {
    "missing": {
        "uschi": ASSETS_DIR / "characters" / "uschi.glb",
        "goblin": ASSETS_DIR / "monsters" / "goblin.glb",
        "portal_obsidian": ASSETS_DIR / "props" / "portal_obsidian.glb"
    },
    "settlements": {
        "village_house_small": ASSETS_DIR / "buildings" / "village_house_small.glb",
        "village_house_medium": ASSETS_DIR / "buildings" / "village_house_medium.glb",
        "village_shop_general": ASSETS_DIR / "buildings" / "village_shop_general.glb",
        "village_tavern": ASSETS_DIR / "buildings" / "village_tavern.glb",
        "village_blacksmith": ASSETS_DIR / "buildings" / "village_blacksmith.glb",
        "village_well": ASSETS_DIR / "props" / "village_well.glb"
    },
    "city": {
        "city_house_noble": ASSETS_DIR / "buildings" / "city_house_noble.glb",
        "city_gate_grand": ASSETS_DIR / "buildings" / "city_gate_grand.glb",
        "city_wall_straight": ASSETS_DIR / "buildings" / "city_wall_straight.glb"
    },
    "castle": {
        "castle_tower": ASSETS_DIR / "buildings" / "castle_tower.glb",
        "castle_keep": ASSETS_DIR / "buildings" / "castle_keep.glb",
        "castle_gatehouse": ASSETS_DIR / "buildings" / "castle_gatehouse.glb"
    },
    "dungeon": {
        "dungeon_entrance": ASSETS_DIR / "buildings" / "dungeon_entrance.glb",
        "dungeon_corridor_straight": ASSETS_DIR / "buildings" / "dungeon_corridor_straight.glb",
        "dungeon_room_boss": ASSETS_DIR / "buildings" / "dungeon_room_boss.glb",
        "dungeon_altar": ASSETS_DIR / "props" / "dungeon_altar.glb"
    },
    "roads": {
        "road_straight": ASSETS_DIR / "props" / "road_straight.glb",
        "road_corner": ASSETS_DIR / "props" / "road_corner.glb",
        "road_t_junction": ASSETS_DIR / "props" / "road_t_junction.glb",
        "road_crossroads": ASSETS_DIR / "props" / "road_crossroads.glb"
    },
    "characters": {
        "player_warrior": ASSETS_DIR / "characters" / "player_warrior.glb",
        "player_mage": ASSETS_DIR / "characters" / "player_mage.glb",
        "player_ranger": ASSETS_DIR / "characters" / "player_ranger.glb",
        "npc_guard": ASSETS_DIR / "characters" / "npc_guard.glb",
        "npc_merchant": ASSETS_DIR / "characters" / "npc_merchant.glb",
        "npc_blacksmith": ASSETS_DIR / "characters" / "npc_blacksmith.glb"
    },
    "monsters": {
        "wolf_red": ASSETS_DIR / "monsters" / "wolf_red.glb",
        "bear_brown": ASSETS_DIR / "monsters" / "bear_brown.glb",
        "skeleton_warrior": ASSETS_DIR / "monsters" / "skeleton_warrior.glb",
        "orc_grunt": ASSETS_DIR / "monsters" / "orc_grunt.glb"
    },
    "animals": {
        "horse_brown": ASSETS_DIR / "monsters" / "horse_brown.glb",
        "deer_stag": ASSETS_DIR / "monsters" / "deer_stag.glb",
        "pig_farm": ASSETS_DIR / "monsters" / "pig_farm.glb"
    },
    "weapons": {
        "sword_iron_1h": ASSETS_DIR / "equipment" / "weapons" / "sword_iron_1h.glb",
        "axe_battle_2h": ASSETS_DIR / "equipment" / "weapons" / "axe_battle_2h.glb",
        "bow_long": ASSETS_DIR / "equipment" / "weapons" / "bow_long.glb",
        "staff_mage": ASSETS_DIR / "equipment" / "weapons" / "staff_mage.glb"
    },
    "armor": {
        "chestplate_iron": ASSETS_DIR / "equipment" / "armor" / "chestplate_iron.glb",
        "shield_wooden_round": ASSETS_DIR / "equipment" / "shields" / "shield_wooden_round.glb",
        "helmet_iron": ASSETS_DIR / "equipment" / "armor" / "helmet_iron.glb"
    },
    "items": {
        "potion_health": ASSETS_DIR / "props" / "potion_health.glb",
        "potion_mana": ASSETS_DIR / "props" / "potion_mana.glb",
        "scroll_teleport": ASSETS_DIR / "props" / "scroll_teleport.glb",
        "key_dungeon": ASSETS_DIR / "props" / "key_dungeon.glb"
    },
    "environment": {
        "tree_oak_large": ASSETS_DIR / "props" / "tree_oak_large.glb",
        "tree_pine_tall": ASSETS_DIR / "props" / "tree_pine_tall.glb",
        "rock_granite_large": ASSETS_DIR / "props" / "rock_granite_large.glb",
        "bush_berry": ASSETS_DIR / "props" / "bush_berry.glb"
    }
}

# GLB-Links Update
GLB_LINKS_ADDITIONS = [
    # Fehlende Assets
    {
        "glbPath": "/assets/models/characters/uschi.glb",
        "targetType": "npc_single",
        "targetId": "npc_guide"
    },
    {
        "glbPath": "/assets/models/monsters/goblin.glb",
        "targetType": "npc_single",
        "targetId": "npc_wolf"
    },
    {
        "glbPath": "/assets/models/props/portal_obsidian.glb",
        "targetType": "object_single",
        "targetId": "obj_worldboss_portal_obsidian"
    },
    # Siedlungen
    {
        "glbPath": "/assets/models/buildings/village_house_small.glb",
        "targetType": "world_object",
        "targetId": "house_village_small"
    },
    {
        "glbPath": "/assets/models/buildings/village_house_medium.glb",
        "targetType": "world_object",
        "targetId": "house_village_medium"
    },
    {
        "glbPath": "/assets/models/buildings/village_shop_general.glb",
        "targetType": "world_object",
        "targetId": "shop_general"
    },
    {
        "glbPath": "/assets/models/buildings/village_tavern.glb",
        "targetType": "world_object",
        "targetId": "tavern"
    },
    {
        "glbPath": "/assets/models/buildings/village_blacksmith.glb",
        "targetType": "world_object",
        "targetId": "blacksmith"
    },
    {
        "glbPath": "/assets/models/props/village_well.glb",
        "targetType": "world_object",
        "targetId": "well"
    },
    # Charaktere
    {
        "glbPath": "/assets/models/characters/player_warrior.glb",
        "targetType": "player_default",
        "targetId": "warrior"
    },
    {
        "glbPath": "/assets/models/characters/player_mage.glb",
        "targetType": "player_default",
        "targetId": "mage"
    },
    {
        "glbPath": "/assets/models/characters/player_ranger.glb",
        "targetType": "player_default",
        "targetId": "ranger"
    },
    {
        "glbPath": "/assets/models/characters/npc_guard.glb",
        "targetType": "npc_single",
        "targetId": "npc_guard"
    },
    {
        "glbPath": "/assets/models/characters/npc_merchant.glb",
        "targetType": "npc_single",
        "targetId": "npc_merchant"
    },
    {
        "glbPath": "/assets/models/characters/npc_blacksmith.glb",
        "targetType": "npc_single",
        "targetId": "npc_blacksmith"
    },
    # Monster
    {
        "glbPath": "/assets/models/monsters/wolf_red.glb",
        "targetType": "monster",
        "targetId": "wolf_red"
    },
    {
        "glbPath": "/assets/models/monsters/bear_brown.glb",
        "targetType": "monster",
        "targetId": "bear_brown"
    },
    {
        "glbPath": "/assets/models/monsters/skeleton_warrior.glb",
        "targetType": "monster",
        "targetId": "skeleton_warrior"
    },
    {
        "glbPath": "/assets/models/monsters/orc_grunt.glb",
        "targetType": "monster",
        "targetId": "orc_grunt"
    }
]

def copy_assets():
    """Kopiert Assets in die korrekten Verzeichnisse"""
    print("Kopiere Assets...")
    
    copied = 0
    failed = 0
    
    for category, mapping in CATEGORY_MAPPING.items():
        print(f"\nKategorie: {category}")
        
        for asset_name, target_path in mapping.items():
            # Suche nach generierter Datei
            source_dir = GENERATED_DIR / category
            source_files = list(source_dir.glob(f"{asset_name}*.glb"))
            
            if not source_files:
                print(f"  {asset_name}: Keine generierte Datei gefunden")
                failed += 1
                continue
            
            source_file = source_files[0]
            
            # Zielverzeichnis erstellen
            target_path.parent.mkdir(parents=True, exist_ok=True)
            
            # Kopieren
            try:
                shutil.copy2(source_file, target_path)
                print(f"  {asset_name}: OK")
                copied += 1
            except Exception as e:
                print(f"  {asset_name}: Fehler - {e}")
                failed += 1
    
    print(f"\nErgebnis: {copied} kopiert, {failed} fehlgeschlagen")
    return copied, failed

def update_glb_links():
    """Aktualisiert glb-links.json"""
    glb_links_path = GAME_DATA_DIR / "glb-links.json"
    
    # Laden
    with open(glb_links_path, 'r') as f:
        links = json.load(f)
    
    # Existierende IDs sammeln
    existing_ids = {link["targetId"] for link in links}
    
    # Neue Links hinzufügen
    added = 0
    for link in GLB_LINKS_ADDITIONS:
        if link["targetId"] not in existing_ids:
            links.append(link)
            existing_ids.add(link["targetId"])
            added += 1
    
    # Speichern
    with open(glb_links_path, 'w') as f:
        json.dump(links, f, indent=2, ensure_ascii=False)
    
    print(f"\nglb-links.json aktualisiert: {added} neue Links")
    return added

def update_asset_pools():
    """Aktualisiert asset-pools.json"""
    pools_path = GAME_DATA_DIR / "world" / "asset-pools.json"
    
    # Laden
    with open(pools_path, 'r') as f:
        pools = json.load(f)
    
    # Neue Assets hinzufügen
    updates = {
        "players": {
            "warrior": "/assets/models/characters/player_warrior.glb",
            "mage": "/assets/models/characters/player_mage.glb",
            "ranger": "/assets/models/characters/player_ranger.glb"
        },
        "npcs": {
            "guard": "/assets/models/characters/npc_guard.glb",
            "merchant": "/assets/models/characters/npc_merchant.glb",
            "blacksmith": "/assets/models/characters/npc_blacksmith.glb"
        },
        "monsters": {
            "wolf_red": "/assets/models/monsters/wolf_red.glb",
            "bear_brown": "/assets/models/monsters/bear_brown.glb",
            "skeleton": "/assets/models/monsters/skeleton_warrior.glb",
            "orc": "/assets/models/monsters/orc_grunt.glb"
        },
        "world_objects": {
            "house": [
                "/assets/models/buildings/village_house_small.glb",
                "/assets/models/buildings/village_house_medium.glb"
            ],
            "shop": "/assets/models/buildings/village_shop_general.glb",
            "tavern": "/assets/models/buildings/village_tavern.glb",
            "blacksmith": "/assets/models/buildings/village_blacksmith.glb",
            "well": "/assets/models/props/village_well.glb"
        }
    }
    
    # Pool-Updates anwenden
    for pool_name, pool_updates in updates.items():
        if pool_name in pools["pools"]:
            pools["pools"][pool_name].update(pool_updates)
    
    # Speichern
    with open(pools_path, 'w') as f:
        json.dump(pools, f, indent=2, ensure_ascii=False)
    
    print(f"asset-pools.json aktualisiert")

def main():
    print("=" * 60)
    print("Asset Mapping & Integration")
    print("=" * 60)
    
    # Assets kopieren
    copied, failed = copy_assets()
    
    # GLB-Links aktualisieren
    if copied > 0:
        update_glb_links()
        update_asset_pools()
    
    print("\n" + "=" * 60)
    print("Integration abgeschlossen!")
    print("=" * 60)

if __name__ == "__main__":
    main()