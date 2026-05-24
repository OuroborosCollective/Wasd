#!/bin/bash
# Prioritized Asset Generator
# Generiert Assets in Reihenfolge der Wichtigkeit

if [ -z "$MESHY_API_KEY" ]; then
    echo "Error: MESHY_API_KEY environment variable not set."
    exit 1
fi
API="https://api.meshy.ai"
DIR="/tmp/Wasd/generated-assets"

mkdir -p "$DIR"/{characters,monsters,buildings,props,weapons,items}

echo "=========================================="
echo "Prioritized Asset Generator"
echo "=========================================="

# Funktion: Asset generieren
generate() {
    local NAME=$1
    local PROFILE=$2
    local PROMPT=$3
    local POLY=$4
    local TOPO=$5
    local SUBDIR=$6
    
    echo ""
    echo "[*] Generiere: $NAME"
    
    # Preview
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
    [ -z "$PREVIEW_ID" ] && echo "  Fehler: Preview" && return 1
    echo "  Preview: $PREVIEW_ID"
    
    # Warten
    while true; do
        STATUS=$(curl -s "$API/openapi/v2/text-to-3d/$PREVIEW_ID" -H "Authorization: Bearer $MESHY_API_KEY")
        STATE=$(echo "$STATUS" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
        [ "$STATE" = "SUCCEEDED" ] && break
        [ "$STATE" = "FAILED" ] && echo "  Fehler: Preview failed" && return 1
        sleep 10
    done
    
    # Refine
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
    [ -z "$REFINE_ID" ] && echo "  Fehler: Refine" && return 1
    echo "  Refine: $REFINE_ID"
    
    # Warten
    while true; do
        STATUS=$(curl -s "$API/openapi/v2/text-to-3d/$REFINE_ID" -H "Authorization: Bearer $MESHY_API_KEY")
        STATE=$(echo "$STATUS" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
        [ "$STATE" = "SUCCEEDED" ] && break
        [ "$STATE" = "FAILED" ] && echo "  Fehler: Refine failed" && return 1
        sleep 10
    done
    
    # Download
    GLB_URL=$(echo "$STATUS" | grep -o '"glb":"[^"]*"' | cut -d'"' -f4)
    if [ -n "$GLB_URL" ]; then
        curl -s -L "$GLB_URL" -o "$DIR/$SUBDIR/$NAME.glb"
        echo "  OK: $DIR/$SUBDIR/$NAME.glb"
        return 0
    fi
    
    echo "  Fehler: Download"
    return 1
}

# PRIORITÄT 1: Fehlende Assets
echo ""
echo "=== PRIORITÄT 1: Fehlende Assets ==="

generate "portal_obsidian" "sct_small" \
    "Mystical obsidian portal, swirling dark energy, glowing runes, magical gateway, lowpoly" \
    6000 "triangle" "props"

# PRIORITÄT 2: Gebäude (am wichtigsten für Welt)
echo ""
echo "=== PRIORITÄT 2: Gebäude ==="

generate "house_small" "bld_walkable_house" \
    "Small medieval house, thatched roof, wooden walls, door, lowpoly game building" \
    8000 "triangle" "buildings"

generate "house_medium" "bld_walkable_house" \
    "Medium medieval house, two stories, stone base, wooden upper, lowpoly game building" \
    10000 "triangle" "buildings"

generate "tavern" "bld_walkable_house" \
    "Medieval tavern, warm lighting, sign, inviting entrance, lowpoly game building" \
    10000 "triangle" "buildings"

generate "shop" "bld_shop_house" \
    "Medieval shop, storefront, awning, goods display, lowpoly game building" \
    9000 "triangle" "buildings"

generate "blacksmith" "bld_shop_house" \
    "Blacksmith forge, chimney, anvil, tools, lowpoly game building" \
    9000 "triangle" "buildings"

# PRIORITÄT 3: Charaktere
echo ""
echo "=== PRIORITÄT 3: Charaktere ==="

generate "player_warrior" "chr_player_humanoid" \
    "Fantasy warrior, heavy plate armor, helmet, shield stance, t-pose, full-body humanoid, quad mesh" \
    15000 "quad" "characters"

generate "player_mage" "chr_player_humanoid" \
    "Fantasy mage, flowing robes, hood, staff, mystical glow, t-pose, full-body humanoid, quad mesh" \
    15000 "quad" "characters"

generate "player_ranger" "chr_player_humanoid" \
    "Fantasy ranger, leather armor, hood, bow, forest cloak, t-pose, full-body humanoid, quad mesh" \
    15000 "quad" "characters"

# PRIORITÄT 4: Monster
echo ""
echo "=== PRIORITÄT 4: Monster ==="

generate "wolf_red" "mon_beast" \
    "Aggressive red wolf, snarling, fur detail, combat stance, lowpoly game monster" \
    6000 "triangle" "monsters"

generate "bear_brown" "mon_beast" \
    "Large brown bear, standing, claws out, menacing, lowpoly game monster" \
    7000 "triangle" "monsters"

generate "skeleton_warrior" "mon_humanoid" \
    "Undead skeleton, rusty armor, sword, glowing eyes, a-pose, lowpoly humanoid" \
    8000 "triangle" "monsters"

generate "orc_grunt" "mon_humanoid" \
    "Orc warrior, green skin, tusks, crude armor, club, a-pose, lowpoly humanoid" \
    8000 "triangle" "monsters"

# PRIORITÄT 5: Props & Umgebung
echo ""
echo "=== PRIORITÄT 5: Props & Umgebung ==="

generate "wall_straight" "wal_city_wall" \
    "Stone wall segment, battlements, modular connection points, lowpoly game asset" \
    5000 "triangle" "props"

generate "wall_gate" "wal_city_wall" \
    "City gate, fortified towers, portcullis, modular, lowpoly game asset" \
    8000 "triangle" "props"

generate "tree_oak" "env_tree" \
    "Oak tree, full canopy, thick trunk, lowpoly game environment asset" \
    4000 "triangle" "props"

generate "tree_pine" "env_tree" \
    "Pine tree, tall, coniferous, mountain style, lowpoly game environment asset" \
    3500 "triangle" "props"

generate "rock_large" "env_rock" \
    "Large rock formation, granite surface, lowpoly game environment asset" \
    3000 "triangle" "props"

generate "well" "sct_small" \
    "Stone well, wooden roof, rope and bucket, lowpoly game prop" \
    3000 "triangle" "props"

# PRIORITÄT 6: Straßen & Dungeons
echo ""
echo "=== PRIORITÄT 6: Straßen & Dungeons ==="

generate "road_straight" "rds_tile" \
    "Cobblestone road, straight section, modular connection, lowpoly game tile" \
    2000 "triangle" "props"

generate "road_corner" "rds_tile" \
    "Cobblestone road, corner turn, modular connection, lowpoly game tile" \
    2000 "triangle" "props"

generate "dungeon_entrance" "dng_module" \
    "Dungeon entrance, dark archway, torches, modular connection, lowpoly game asset" \
    6000 "triangle" "props"

generate "dungeon_room" "dng_module" \
    "Dungeon boss room, large space, altar center, dramatic, modular, lowpoly game asset" \
    8000 "triangle" "props"

# PRIORITÄT 7: Waffen & Items
echo ""
echo "=== PRIORITÄT 7: Waffen & Items ==="

generate "sword_iron" "wpn_1h" \
    "Iron sword, simple guard, leather grip, lowpoly game weapon" \
    3000 "triangle" "weapons"

generate "axe_battle" "wpn_2h" \
    "Battle axe, wooden handle, iron head, lowpoly game weapon" \
    4000 "triangle" "weapons"

generate "staff_mage" "wpn_2h" \
    "Magic staff, crystal orb, glowing runes, lowpoly game weapon" \
    4000 "triangle" "weapons"

generate "potion_health" "itm_consumable" \
    "Red health potion, glass bottle, cork, glowing liquid, lowpoly game item" \
    1500 "triangle" "items"

generate "chest_treasure" "itm_consumable" \
    "Treasure chest, wooden with metal bands, open lid, gold coins, lowpoly game item" \
    3000 "triangle" "items"

echo ""
echo "=========================================="
echo "FERTIG!"
echo "=========================================="
find "$DIR" -name "*.glb" | wc -l
echo "Assets generiert"