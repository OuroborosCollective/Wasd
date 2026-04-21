#!/usr/bin/env python3
"""
Fix GLB Links paths to use world-assets directory
"""

import json
from pathlib import Path

GAME_DATA = Path("/tmp/Wasd/game-data")
GLB_LINKS_FILE = GAME_DATA / "glb-links.json"

def fix_glb_links():
    """Update glb-links.json to use correct paths"""
    
    # Read current glb-links
    with open(GLB_LINKS_FILE, 'r') as f:
        links = json.load(f)
    
    print(f"Current glb-links: {len(links)} entries")
    
    # Track changes
    changes = 0
    
    # Update paths that need world-assets prefix
    for link in links:
        path = link.get("glbPath", "")
        
        # Skip paths that already have world-assets or are kaykit paths
        if "/world-assets/" in path or "/kaykit/" in path:
            continue
            
        # Check if this path should be in world-assets
        # These are the paths that were generated and placed in world-assets
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
        ]):
            # Add world-assets prefix
            new_path = path.replace("/assets/models/", "/assets/models/world-assets/")
            link["glbPath"] = new_path
            changes += 1
            print(f"  Updated: {path} -> {new_path}")
    
    # Write updated glb-links
    if changes > 0:
        with open(GLB_LINKS_FILE, 'w') as f:
            json.dump(links, f, indent=2)
        print(f"\nUpdated {changes} entries in glb-links.json")
    else:
        print("\nNo changes needed")
    
    return changes

if __name__ == "__main__":
    print("=" * 60)
    print("Fixing GLB Links paths")
    print("=" * 60)
    
    changes = fix_glb_links()
    
    print("\nDone!")