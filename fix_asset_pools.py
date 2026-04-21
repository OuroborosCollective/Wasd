#!/usr/bin/env python3
"""
Fix Asset Pools paths to use world-assets directory
"""

import json
from pathlib import Path

GAME_DATA = Path("/tmp/Wasd/game-data")
ASSET_POOLS_FILE = GAME_DATA / "world" / "asset-pools.json"

def fix_asset_pools():
    """Update asset-pools.json to use correct paths"""
    
    # Read current asset-pools
    with open(ASSET_POOLS_FILE, 'r') as f:
        data = json.load(f)
    
    print("Current asset-pools.json structure:")
    
    # Track changes
    changes = 0
    
    # Function to update paths in nested structures
    def update_paths(obj, path=""):
        nonlocal changes
        if isinstance(obj, dict):
            for key, value in obj.items():
                update_paths(value, f"{path}.{key}" if path else key)
        elif isinstance(obj, list):
            for i, item in enumerate(obj):
                update_paths(item, f"{path}[{i}]")
        elif isinstance(obj, str) and "/assets/models/" in obj:
            # Skip paths that already have world-assets or are kaykit paths
            if "/world-assets/" in obj or "/kaykit/" in obj:
                return
            
            # Check if this path should be in world-assets
            if any(x in obj for x in [
                "/characters/player_",
                "/characters/npc_",
                "/monsters/wolf_",
                "/monsters/bear_",
                "/monsters/skeleton_",
                "/monsters/orc_",
                "/monsters/goblin",
                "/buildings/house_",
                "/buildings/tavern",
                "/buildings/shop",
                "/buildings/blacksmith",
                "/buildings/castle_",
                "/props/wall_",
                "/props/dungeon_",
                "/props/road_",
                "/props/tree_",
                "/props/rock_",
                "/props/well",
                "/equipment/weapons/sword_",
                "/equipment/weapons/axe_",
                "/equipment/weapons/staff_",
                "/props/potion_",
                "/props/chest_",
                "/buildings/village_",
                "/props/village_",
            ]):
                # Add world-assets prefix
                new_path = obj.replace("/assets/models/", "/assets/models/world-assets/")
                # Update the object in place
                if isinstance(obj, str):
                    # This is tricky since strings are immutable
                    # We need to update the parent structure
                    pass
                changes += 1
                print(f"  Would update: {obj} -> {new_path}")
    
    # Since strings are immutable, we need a different approach
    # Let's manually update the known paths
    
    # Update players
    if "pools" in data and "players" in data["pools"]:
        for key, value in data["pools"]["players"].items():
            if isinstance(value, str) and "/characters/player_" in value and "/world-assets/" not in value:
                new_value = value.replace("/assets/models/", "/assets/models/world-assets/")
                data["pools"]["players"][key] = new_value
                changes += 1
                print(f"  Updated players.{key}: {value} -> {new_value}")
    
    # Update npcs
    if "pools" in data and "npcs" in data["pools"]:
        for key, value in data["pools"]["npcs"].items():
            if isinstance(value, str) and "/characters/npc_" in value and "/world-assets/" not in value:
                new_value = value.replace("/assets/models/", "/assets/models/world-assets/")
                data["pools"]["npcs"][key] = new_value
                changes += 1
                print(f"  Updated npcs.{key}: {value} -> {new_value}")
    
    # Update monsters (can be string or list)
    if "pools" in data and "monsters" in data["pools"]:
        for key, value in data["pools"]["monsters"].items():
            if isinstance(value, str):
                if ("/monsters/" in value and "/world-assets/" not in value and 
                    any(x in value for x in ["wolf_", "bear_", "skeleton_", "orc_", "goblin"])):
                    new_value = value.replace("/assets/models/", "/assets/models/world-assets/")
                    data["pools"]["monsters"][key] = new_value
                    changes += 1
                    print(f"  Updated monsters.{key}: {value} -> {new_value}")
            elif isinstance(value, list):
                for i, item in enumerate(value):
                    if isinstance(item, str) and ("/monsters/" in item and "/world-assets/" not in item and
                        any(x in item for x in ["wolf_", "bear_", "skeleton_", "orc_", "goblin"])):
                        new_item = item.replace("/assets/models/", "/assets/models/world-assets/")
                        data["pools"]["monsters"][key][i] = new_item
                        changes += 1
                        print(f"  Updated monsters.{key}[{i}]: {item} -> {new_item}")
    
    # Write updated asset-pools
    if changes > 0:
        with open(ASSET_POOLS_FILE, 'w') as f:
            json.dump(data, f, indent=2)
        print(f"\nUpdated {changes} entries in asset-pools.json")
    else:
        print("\nNo changes needed")
    
    return changes

if __name__ == "__main__":
    print("=" * 60)
    print("Fixing Asset Pools paths")
    print("=" * 60)
    
    changes = fix_asset_pools()
    
    print("\nDone!")