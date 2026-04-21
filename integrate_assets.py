#!/usr/bin/env python3
"""
Asset Integration Script
Kopiert generierte Assets in Wasd und aktualisiert Konfiguration
"""

import json
import shutil
from pathlib import Path

# Pfade
GENERATED = Path("/tmp/Wasd/generated-assets")
WASD_ASSETS = Path("/tmp/Wasd/world-assets")
WASD_CLIENT = Path("/tmp/Wasd/client/public/assets/models")
GAME_DATA = Path("/tmp/Wasd/game-data")

# Asset-Mapping
ASSET_MAP = {
    # Fehlende Assets
    "characters/uschi.glb": ["characters/uschi.glb"],
    "monsters/goblin.glb": ["monsters/goblin.glb"],
    "props/portal_obsidian.glb": ["props/portal.glb"],
    
    # Charaktere
    "characters/player_warrior.glb": ["characters/player_warrior.glb"],
    "characters/player_mage.glb": ["characters/player_mage.glb"],
    "characters/player_ranger.glb": ["characters/player_ranger.glb"],
    "characters/npc_guard.glb": ["characters/npc_guard.glb"],
    "characters/npc_merchant.glb": ["characters/npc_merchant.glb"],
    "characters/npc_blacksmith.glb": ["characters/npc_blacksmith.glb"],
    
    # Monster
    "monsters/wolf_red.glb": ["monsters/wolf_red.glb"],
    "monsters/bear_brown.glb": ["monsters/bear_brown.glb"],
    "monsters/skeleton_warrior.glb": ["monsters/skeleton_warrior.glb"],
    "monsters/orc_grunt.glb": ["monsters/orc_grunt.glb"],
    
    # Gebäude
    "buildings/bld_house_small.glb": ["buildings/house_small.glb"],
    "buildings/bld_house_medium.glb": ["buildings/house_medium.glb"],
    "buildings/bld_tavern.glb": ["buildings/tavern.glb"],
    "buildings/bld_shop.glb": ["buildings/shop.glb"],
    "buildings/bld_blacksmith.glb": ["buildings/blacksmith.glb"],
    "buildings/castle_tower.glb": ["buildings/castle_tower.glb"],
    "buildings/castle_keep.glb": ["buildings/castle_keep.glb"],
    
    # Props
    "props/wall_straight.glb": ["props/wall_straight.glb"],
    "props/wall_gate.glb": ["props/wall_gate.glb"],
    "props/dungeon_entrance.glb": ["props/dungeon_entrance.glb"],
    "props/dungeon_corridor.glb": ["props/dungeon_corridor.glb"],
    "props/dungeon_room.glb": ["props/dungeon_room.glb"],
    "props/road_straight.glb": ["props/road_straight.glb"],
    "props/road_corner.glb": ["props/road_corner.glb"],
    "props/road_junction.glb": ["props/road_junction.glb"],
    "props/road_crossroads.glb": ["props/road_crossroads.glb"],
    "props/tree_oak.glb": ["props/tree_oak.glb"],
    "props/tree_pine.glb": ["props/tree_pine.glb"],
    "props/rock_large.glb": ["props/rock_large.glb"],
    "props/well.glb": ["props/well.glb"],
    
    # Waffen
    "weapons/sword_iron.glb": ["equipment/weapons/sword_iron.glb"],
    "weapons/axe_battle.glb": ["equipment/weapons/axe_battle.glb"],
    "weapons/staff_mage.glb": ["equipment/weapons/staff_mage.glb"],
    
    # Items
    "items/potion_health.glb": ["props/potion_health.glb"],
    "items/chest_treasure.glb": ["props/chest_treasure.glb"]
}

# GLB-Links Updates
GLB_LINKS = [
    # Fehlende
    {"glbPath": "/assets/models/characters/uschi.glb", "targetType": "npc_single", "targetId": "npc_guide"},
    {"glbPath": "/assets/models/monsters/goblin.glb", "targetType": "npc_single", "targetId": "npc_wolf"},
    {"glbPath": "/assets/models/props/portal.glb", "targetType": "object_single", "targetId": "obj_worldboss_portal_obsidian"},
    
    # Spieler
    {"glbPath": "/assets/models/characters/player_warrior.glb", "targetType": "player_default", "targetId": "warrior"},
    {"glbPath": "/assets/models/characters/player_mage.glb", "targetType": "player_default", "targetId": "mage"},
    {"glbPath": "/assets/models/characters/player_ranger.glb", "targetType": "player_default", "targetId": "ranger"},
    
    # NPCs
    {"glbPath": "/assets/models/characters/npc_guard.glb", "targetType": "npc_single", "targetId": "npc_guard"},
    {"glbPath": "/assets/models/characters/npc_merchant.glb", "targetType": "npc_single", "targetId": "npc_merchant"},
    {"glbPath": "/assets/models/characters/npc_blacksmith.glb", "targetType": "npc_single", "targetId": "npc_blacksmith"},
    
    # Monster
    {"glbPath": "/assets/models/monsters/wolf_red.glb", "targetType": "monster", "targetId": "wolf_red"},
    {"glbPath": "/assets/models/monsters/bear_brown.glb", "targetType": "monster", "targetId": "bear_brown"},
    {"glbPath": "/assets/models/monsters/skeleton_warrior.glb", "targetType": "monster", "targetId": "skeleton_warrior"},
    {"glbPath": "/assets/models/monsters/orc_grunt.glb", "targetType": "monster", "targetId": "orc_grunt"},
    
    # Gebäude
    {"glbPath": "/assets/models/buildings/house_small.glb", "targetType": "world_object", "targetId": "house_small"},
    {"glbPath": "/assets/models/buildings/house_medium.glb", "targetType": "world_object", "targetId": "house_medium"},
    {"glbPath": "/assets/models/buildings/tavern.glb", "targetType": "world_object", "targetId": "tavern"},
    {"glbPath": "/assets/models/buildings/shop.glb", "targetType": "world_object", "targetId": "shop"},
    {"glbPath": "/assets/models/buildings/blacksmith.glb", "targetType": "world_object", "targetId": "blacksmith"},
    {"glbPath": "/assets/models/buildings/castle_tower.glb", "targetType": "world_object", "targetId": "castle_tower"},
    {"glbPath": "/assets/models/buildings/castle_keep.glb", "targetType": "world_object", "targetId": "castle_keep"},
    
    # Props
    {"glbPath": "/assets/models/props/wall_straight.glb", "targetType": "world_object", "targetId": "wall_straight"},
    {"glbPath": "/assets/models/props/wall_gate.glb", "targetType": "world_object", "targetId": "wall_gate"},
    {"glbPath": "/assets/models/props/dungeon_entrance.glb", "targetType": "world_object", "targetId": "dungeon_entrance"},
    {"glbPath": "/assets/models/props/dungeon_corridor.glb", "targetType": "world_object", "targetId": "dungeon_corridor"},
    {"glbPath": "/assets/models/props/dungeon_room.glb", "targetType": "world_object", "targetId": "dungeon_room"},
    {"glbPath": "/assets/models/props/road_straight.glb", "targetType": "world_object", "targetId": "road_straight"},
    {"glbPath": "/assets/models/props/road_corner.glb", "targetType": "world_object", "targetId": "road_corner"},
    {"glbPath": "/assets/models/props/road_junction.glb", "targetType": "world_object", "targetId": "road_junction"},
    {"glbPath": "/assets/models/props/road_crossroads.glb", "targetType": "world_object", "targetId": "road_crossroads"},
    {"glbPath": "/assets/models/props/tree_oak.glb", "targetType": "world_object", "targetId": "tree_oak"},
    {"glbPath": "/assets/models/props/tree_pine.glb", "targetType": "world_object", "targetId": "tree_pine"},
    {"glbPath": "/assets/models/props/rock_large.glb", "targetType": "world_object", "targetId": "rock_large"},
    {"glbPath": "/assets/models/props/well.glb", "targetType": "world_object", "targetId": "well"},
    
    # Waffen
    {"glbPath": "/assets/models/equipment/weapons/sword_iron.glb", "targetType": "object_single", "targetId": "sword_iron"},
    {"glbPath": "/assets/models/equipment/weapons/axe_battle.glb", "targetType": "object_single", "targetId": "axe_battle"},
    {"glbPath": "/assets/models/equipment/weapons/staff_mage.glb", "targetType": "object_single", "targetId": "staff_mage"},
    
    # Items
    {"glbPath": "/assets/models/props/potion_health.glb", "targetType": "object_single", "targetId": "potion_health"},
    {"glbPath": "/assets/models/props/chest_treasure.glb", "targetType": "object_single", "targetId": "chest_treasure"}
]

def copy_assets():
    """Kopiert Assets in world-assets und client/public"""
    print("Kopiere Assets...")
    
    copied = 0
    for source_rel, targets in ASSET_MAP.items():
        source = GENERATED / source_rel
        
        if not source.exists():
            print(f"  Überspringe (nicht gefunden): {source_rel}")
            continue
        
        for target_rel in targets:
            # world-assets
            target1 = WASD_ASSETS / target_rel
            target1.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(source, target1)
            
            # client/public
            target2 = WASD_CLIENT / "world-assets" / target_rel
            target2.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(source, target2)
            
            copied += 1
            print(f"  {source_rel} -> {target_rel}")
    
    print(f"\n{copied} Assets kopiert")
    return copied

def update_glb_links():
    """Aktualisiert glb-links.json"""
    glb_path = GAME_DATA / "glb-links.json"
    
    with open(glb_path, 'r') as f:
        links = json.load(f)
    
    existing = {l["targetId"] for l in links}
    added = 0
    
    for link in GLB_LINKS:
        if link["targetId"] not in existing:
            links.append(link)
            existing.add(link["targetId"])
            added += 1
    
    with open(glb_path, 'w') as f:
        json.dump(links, f, indent=2, ensure_ascii=False)
    
    print(f"glb-links.json: {added} neue Einträge")
    return added

def update_asset_pools():
    """Aktualisiert asset-pools.json"""
    pools_path = GAME_DATA / "world" / "asset-pools.json"
    
    with open(pools_path, 'r') as f:
        pools = json.load(f)
    
    # Spieler
    pools["pools"]["players"].update({
        "warrior": "/assets/models/characters/player_warrior.glb",
        "mage": "/assets/models/characters/player_mage.glb",
        "ranger": "/assets/models/characters/player_ranger.glb"
    })
    
    # NPCs
    pools["pools"]["npcs"].update({
        "guard": "/assets/models/characters/npc_guard.glb",
        "merchant": "/assets/models/characters/npc_merchant.glb",
        "blacksmith": "/assets/models/characters/npc_blacksmith.glb"
    })
    
    # Monster
    pools["pools"]["monsters"].update({
        "wolf_red": "/assets/models/monsters/wolf_red.glb",
        "bear_brown": "/assets/models/monsters/bear_brown.glb",
        "skeleton": "/assets/models/monsters/skeleton_warrior.glb",
        "orc": "/assets/models/monsters/orc_grunt.glb"
    })
    
    # Gebäude
    pools["pools"]["world_objects"].update({
        "house": [
            "/assets/models/buildings/house_small.glb",
            "/assets/models/buildings/house_medium.glb"
        ],
        "tavern": "/assets/models/buildings/tavern.glb",
        "shop": "/assets/models/buildings/shop.glb",
        "blacksmith": "/assets/models/buildings/blacksmith.glb",
        "castle_tower": "/assets/models/buildings/castle_tower.glb",
        "castle_keep": "/assets/models/buildings/castle_keep.glb",
        "well": "/assets/models/props/well.glb",
        "wall": "/assets/models/props/wall_straight.glb",
        "gate": "/assets/models/props/wall_gate.glb",
        "dungeon_entrance": "/assets/models/props/dungeon_entrance.glb",
        "dungeon_corridor": "/assets/models/props/dungeon_corridor.glb",
        "dungeon_room": "/assets/models/props/dungeon_room.glb",
        "road": [
            "/assets/models/props/road_straight.glb",
            "/assets/models/props/road_corner.glb",
            "/assets/models/props/road_junction.glb",
            "/assets/models/props/road_crossroads.glb"
        ],
        "tree": [
            "/assets/models/props/tree_oak.glb",
            "/assets/models/props/tree_pine.glb"
        ],
        "rock": "/assets/models/props/rock_large.glb"
    })
    
    # Waffen
    pools["pools"]["loot"].update({
        "sword": "/assets/models/equipment/weapons/sword_iron.glb",
        "axe": "/assets/models/equipment/weapons/axe_battle.glb",
        "staff": "/assets/models/equipment/weapons/staff_mage.glb",
        "potion": "/assets/models/props/potion_health.glb",
        "chest": "/assets/models/props/chest_treasure.glb"
    })
    
    with open(pools_path, 'w') as f:
        json.dump(pools, f, indent=2, ensure_ascii=False)
    
    print("asset-pools.json aktualisiert")

def run_audit():
    """Führt Model-Path-Audit durch"""
    import subprocess
    print("\nFühre Model-Path-Audit durch...")
    result = subprocess.run(
        ["pnpm", "run", "audit:model-paths"],
        cwd="/tmp/Wasd",
        capture_output=True,
        text=True
    )
    print(result.stdout)
    if result.stderr:
        print("Fehler:", result.stderr)
    return result.returncode

def main():
    print("=" * 60)
    print("Wasd Asset Integration")
    print("=" * 60)
    
    # Assets kopieren
    copied = copy_assets()
    
    if copied > 0:
        # Konfiguration aktualisieren
        update_glb_links()
        update_asset_pools()
        
        # Audit
        run_audit()
    
    print("\n" + "=" * 60)
    print("Integration abgeschlossen!")
    print("=" * 60)

if __name__ == "__main__":
    main()