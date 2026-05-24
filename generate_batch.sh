#!/bin/bash
# Wasd Asset Generator - Batch Mode
# Generiert Assets einzeln mit Status-Updates

if [ -z "$MESHY_API_KEY" ]; then
    echo "Error: MESHY_API_KEY environment variable not set."
    exit 1
fi
API="https://api.meshy.ai"
DIR="/tmp/Wasd/generated-assets"

mkdir -p "$DIR"/{characters,monsters,buildings,props,weapons,items}

echo "=========================================="
echo "Wasd MMORPG Asset Generator"
echo "Charaktere: 15k Poly | Rest: Lowpoly"
echo "=========================================="

# Funktion: Asset generieren
generate_asset() {
    local NAME=$1
    local PROFILE=$2
    local PROMPT=$3
    local POLY=$4
    local TOPO=$5
    local SUBDIR=$6
    
    echo ""
    echo "------------------------------------------"
    echo "Generiere: $NAME ($PROFILE)"
    echo "Poly: $POLY | Topo: $TOPO"
    echo "------------------------------------------"
    
    # Preview erstellen
    echo "[1/3] Erstelle Preview..."
    PREVIEW=$(curl -s -X POST "$API/openapi/v2/text-to-3d" \
        -H "Authorization: Bearer $MESHY_API_KEY" \
        -H "Content-Type: application/json" \
        -d "{
            \"mode\": \"preview\",
            \"prompt\": \"$PROMPT\",
            \"model_type\": \"standard\",
            \"ai_model\": \"latest\",
            \"should_remesh\": true,
            \"topology\": \"$TOPO\",
            \"target_polycount\": $POLY,
            \"symmetry_mode\": \"auto\",
            \"pose_mode\": \"\"
        }")
    
    PREVIEW_ID=$(echo "$PREVIEW" | grep -o '"result":"[^"]*"' | cut -d'"' -f4)
    
    if [ -z "$PREVIEW_ID" ]; then
        echo "  FEHLER: Keine Preview-ID"
        return 1
    fi
    
    echo "  Preview-ID: $PREVIEW_ID"
    
    # Auf Preview warten
    echo "  Warte auf Preview..."
    while true; do
        STATUS=$(curl -s "$API/openapi/v2/text-to-3d/$PREVIEW_ID" \
            -H "Authorization: Bearer $MESHY_API_KEY")
        
        STATE=$(echo "$STATUS" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
        PROGRESS=$(echo "$STATUS" | grep -o '"progress":[0-9]*' | cut -d':' -f2)
        
        echo "  Status: $STATE ($PROGRESS%)"
        
        if [ "$STATE" = "SUCCEEDED" ]; then
            break
        elif [ "$STATE" = "FAILED" ] || [ "$STATE" = "CANCELLED" ]; then
            echo "  FEHLER: Preview fehlgeschlagen"
            return 1
        fi
        
        sleep 10
    done
    
    # Refine
    echo "[2/3] Refine..."
    REFINE=$(curl -s -X POST "$API/openapi/v2/text-to-3d" \
        -H "Authorization: Bearer $MESHY_API_KEY" \
        -H "Content-Type: application/json" \
        -d "{
            \"mode\": \"refine\",
            \"preview_task_id\": \"$PREVIEW_ID\",
            \"target_formats\": [\"glb\"],
            \"auto_size\": true,
            \"enable_pbr\": true
        }")
    
    REFINE_ID=$(echo "$REFINE" | grep -o '"result":"[^"]*"' | cut -d'"' -f4)
    
    if [ -z "$REFINE_ID" ]; then
        echo "  FEHLER: Keine Refine-ID"
        return 1
    fi
    
    echo "  Refine-ID: $REFINE_ID"
    
    # Auf Refine warten
    echo "  Warte auf Refine..."
    while true; do
        STATUS=$(curl -s "$API/openapi/v2/text-to-3d/$REFINE_ID" \
            -H "Authorization: Bearer $MESHY_API_KEY")
        
        STATE=$(echo "$STATUS" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
        PROGRESS=$(echo "$STATUS" | grep -o '"progress":[0-9]*' | cut -d':' -f2)
        
        echo "  Status: $STATE ($PROGRESS%)"
        
        if [ "$STATE" = "SUCCEEDED" ]; then
            break
        elif [ "$STATE" = "FAILED" ] || [ "$STATE" = "CANCELLED" ]; then
            echo "  FEHLER: Refine fehlgeschlagen"
            return 1
        fi
        
        sleep 10
    done
    
    # Download
    echo "[3/3] Download..."
    GLB_URL=$(echo "$STATUS" | grep -o '"glb":"[^"]*"' | cut -d'"' -f4)
    
    if [ -n "$GLB_URL" ]; then
        curl -s -L "$GLB_URL" -o "$DIR/$SUBDIR/$NAME.glb"
        echo "  Gespeichert: $DIR/$SUBDIR/$NAME.glb"
        return 0
    else
        echo "  FEHLER: Keine GLB-URL"
        return 1
    fi
}

# ASSETS GENERIEREN

# 1. FEHLENDE ASSETS
echo ""
echo "=== FEHLENDE ASSETS ==="

generate_asset "uschi" "chr_npc_humanoid" \
    "Fantasy NPC girl, cute face, braided hair, medieval dress, friendly, t-pose, full-body humanoid, clear hands, quad mesh" \
    15000 "quad" "characters"

generate_asset "goblin" "mon_humanoid" \
    "Aggressive goblin, green skin, pointed ears, crude armor, menacing, a-pose, humanoid monster, lowpoly" \
    8000 "triangle" "monsters"

generate_asset "portal_obsidian" "sct_small" \
    "Mystical obsidian portal, swirling dark energy, glowing runes, magical gateway, lowpoly" \
    6000 "triangle" "props"

# 2. SPIELER-CHARAKTERE (15k)
echo ""
echo "=== SPIELER-CHARAKTERE ==="

generate_asset "player_warrior" "chr_player_humanoid" \
    "Fantasy warrior, heavy plate armor, helmet, shield stance, t-pose, full-body humanoid, clear hands, quad mesh" \
    15000 "quad" "characters"

generate_asset "player_mage" "chr_player_humanoid" \
    "Fantasy mage, flowing robes, hood, staff, mystical glow, t-pose, full-body humanoid, quad mesh" \
    15000 "quad" "characters"

generate_asset "player_ranger" "chr_player_humanoid" \
    "Fantasy ranger, leather armor, hood, bow, forest cloak, t-pose, full-body humanoid, quad mesh" \
    15000 "quad" "characters"

# 3. NPCS (12k)
echo ""
echo "=== NPCS ==="

generate_asset "npc_guard" "chr_npc_humanoid" \
    "City guard, uniform, spear, standing watch, t-pose, full-body humanoid, quad mesh" \
    12000 "quad" "characters"

generate_asset "npc_merchant" "chr_npc_humanoid" \
    "Traveling merchant, colorful clothes, backpack, friendly, t-pose, full-body humanoid, quad mesh" \
    12000 "quad" "characters"

generate_asset "npc_blacksmith" "chr_npc_humanoid" \
    "Blacksmith, muscular, leather apron, hammer, t-pose, full-body humanoid, quad mesh" \
    12000 "quad" "characters"

# 4. MONSTER (Lowpoly)
echo ""
echo "=== MONSTER ==="

generate_asset "wolf_red" "mon_beast" \
    "Aggressive red wolf, snarling, fur detail, combat stance, lowpoly game monster" \
    6000 "triangle" "monsters"

generate_asset "bear_brown" "mon_beast" \
    "Large brown bear, standing, claws out, menacing, lowpoly game monster" \
    7000 "triangle" "monsters"

generate_asset "skeleton_warrior" "mon_humanoid" \
    "Undead skeleton, rusty armor, sword, glowing eyes, a-pose, lowpoly humanoid" \
    8000 "triangle" "monsters"

generate_asset "orc_grunt" "mon_humanoid" \
    "Orc warrior, green skin, tusks, crude armor, club, a-pose, lowpoly humanoid" \
    8000 "triangle" "monsters"

# 5. GEBÄUDE (Lowpoly)
echo ""
echo "=== GEBÄUDE ==="

generate_asset "bld_house_small" "bld_walkable_house" \
    "Small medieval house, thatched roof, wooden walls, door, lowpoly game building" \
    8000 "triangle" "buildings"

generate_asset "bld_house_medium" "bld_walkable_house" \
    "Medium medieval house, two stories, stone base, wooden upper, lowpoly game building" \
    10000 "triangle" "buildings"

generate_asset "bld_tavern" "bld_walkable_house" \
    "Medieval tavern, warm lighting, sign, inviting entrance, lowpoly game building" \
    10000 "triangle" "buildings"

generate_asset "bld_shop" "bld_shop_house" \
    "Medieval shop, storefront, awning, goods display, lowpoly game building" \
    9000 "triangle" "buildings"

generate_asset "bld_blacksmith" "bld_shop_house" \
    "Blacksmith forge, chimney, anvil, tools, lowpoly game building" \
    9000 "triangle" "buildings"

# 6. BURG-MODULE
echo ""
echo "=== BURG-MODULE ==="

generate_asset "castle_tower" "bld_castle_module" \
    "Castle tower, fortified, arrow slits, battlements, modular, lowpoly game asset" \
    8000 "triangle" "buildings"

generate_asset "castle_keep" "bld_castle_module" \
    "Castle keep, large fortified building, entrance, modular, lowpoly game asset" \
    12000 "triangle" "buildings"

# 7. MAUERN & TORE
echo ""
echo "=== MAUERN & TORE ==="

generate_asset "wall_straight" "wal_city_wall" \
    "Stone wall segment, battlements, modular connection points, lowpoly game asset" \
    5000 "triangle" "props"

generate_asset "wall_gate" "wal_city_wall" \
    "City gate, fortified towers, portcullis, modular, lowpoly game asset" \
    8000 "triangle" "props"

# 8. DUNGEON
echo ""
echo "=== DUNGEON ==="

generate_asset "dungeon_entrance" "dng_module" \
    "Dungeon entrance, dark archway, torches, modular connection, lowpoly game asset" \
    6000 "triangle" "props"

generate_asset "dungeon_corridor" "dng_module" \
    "Dungeon corridor, stone walls, straight section, modular, lowpoly game asset" \
    5000 "triangle" "props"

generate_asset "dungeon_room" "dng_module" \
    "Dungeon boss room, large space, altar center, dramatic, modular, lowpoly game asset" \
    8000 "triangle" "props"

# 9. STRASSEN
echo ""
echo "=== STRASSEN ==="

generate_asset "road_straight" "rds_tile" \
    "Cobblestone road, straight section, modular connection, lowpoly game tile" \
    2000 "triangle" "props"

generate_asset "road_corner" "rds_tile" \
    "Cobblestone road, corner turn, modular connection, lowpoly game tile" \
    2000 "triangle" "props"

generate_asset "road_junction" "rds_tile" \
    "Cobblestone road, T-junction, modular connection, lowpoly game tile" \
    2500 "triangle" "props"

generate_asset "road_crossroads" "rds_tile" \
    "Cobblestone road, four-way crossroads, modular connection, lowpoly game tile" \
    3000 "triangle" "props"

# 10. WAFFEN
echo ""
echo "=== WAFFEN ==="

generate_asset "sword_iron" "wpn_1h" \
    "Iron sword, simple guard, leather grip, lowpoly game weapon" \
    3000 "triangle" "weapons"

generate_asset "axe_battle" "wpn_2h" \
    "Battle axe, wooden handle, iron head, lowpoly game weapon" \
    4000 "triangle" "weapons"

generate_asset "staff_mage" "wpn_2h" \
    "Magic staff, crystal orb, glowing runes, lowpoly game weapon" \
    4000 "triangle" "weapons"

# 11. ITEMS
echo ""
echo "=== ITEMS ==="

generate_asset "potion_health" "itm_consumable" \
    "Red health potion, glass bottle, cork, glowing liquid, lowpoly game item" \
    1500 "triangle" "items"

generate_asset "chest_treasure" "itm_consumable" \
    "Treasure chest, wooden with metal bands, open lid, gold coins, lowpoly game item" \
    3000 "triangle" "items"

# 12. UMWELT
echo ""
echo "=== UMWELT ==="

generate_asset "tree_oak" "env_tree" \
    "Oak tree, full canopy, thick trunk, lowpoly game environment asset" \
    4000 "triangle" "props"

generate_asset "tree_pine" "env_tree" \
    "Pine tree, tall, coniferous, mountain style, lowpoly game environment asset" \
    3500 "triangle" "props"

generate_asset "rock_large" "env_rock" \
    "Large rock formation, granite surface, lowpoly game environment asset" \
    3000 "triangle" "props"

generate_asset "well" "sct_small" \
    "Stone well, wooden roof, rope and bucket, lowpoly game prop" \
    3000 "triangle" "props"

echo ""
echo "=========================================="
echo "FERTIG! Assets in: $DIR"
echo "=========================================="
ls -la "$DIR"/*/*.glb 2>/dev/null | wc -l
echo "Assets generiert"