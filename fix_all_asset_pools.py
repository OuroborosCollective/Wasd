#!/usr/bin/env python3
"""
Fix all Asset Pools paths to use world-assets directory
"""

import json
from pathlib import Path

GAME_DATA = Path("/tmp/Wasd/game-data")
ASSET_POOLS_FILE = GAME_DATA / "world" / "asset-pools.json"

def fix_all_asset_pools():
    """Update all paths in asset-pools.json to use correct paths"""
    
    # Read current asset-pools
    with open(ASSET_POOLS_FILE, 'r') as f:
        data = json.load(f)
    
    print("Fixing all paths in asset-pools.json...")
    
    # Track changes
    changes = 0
    
    def update_string_path(path):
        """Update a single path string"""
        nonlocal changes
        if not isinstance(path, str):
            return path
        
        # Skip paths that already have world-assets or are kaykit/external paths
        if "/world-assets/" in path or "/kaykit/" in path or "/external/" in path:
            return path
        
        # Check if this path should be in world-assets
        if any(x in path for x in [
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
            "/buildings/village_",
            "/props/wall_",
            "/props/dungeon_",
            "/props/road_",
            "/props/tree_",
            "/props/rock_",
            "/props/well",
            "/props/village_",
            "/equipment/weapons/sword_",
            "/equipment/weapons/axe_",
            "/equipment/weapons/staff_",
            "/props/potion_",
            "/props/chest_",
        ]):
            # Add world-assets prefix
            new_path = path.replace("/assets/models/", "/assets/models/world-assets/")
            changes += 1
            print(f"  Updated: {path} -> {new_path}")
            return new_path
        
        return path
    
    def update_recursive(obj):
        """Recursively update all string paths in a nested structure"""
        if isinstance(obj, dict):
            for key, value in obj.items():
                obj[key] = update_recursive(value)
        elif isinstance(obj, list):
            for i, item in enumerate(obj):
                obj[i] = update_recursive(item)
        elif isinstance(obj, str):
            return update_string_path(obj)
        return obj
    
    # Update the entire data structure
    data = update_recursive(data)
    
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
    print("Fixing all Asset Pools paths")
    print("=" * 60)
    
    changes = fix_all_asset_pools()
    
    print("\nDone!")