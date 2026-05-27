# Weapon Atlas — Integration Guide
## PixiJS MMORPG Modular Weapon Pack v2.0.0

### Files in this Pack

```
weapon-atlas/
  atlas.png          ← Packed sprite sheet (128×128 px tiles)
  manifest.json      ← Part metadata, rarity weights, atlas UV coords
  animations.json    ← Frame counts & durations per animation type
  parts.json         ← Raw part list (flat array)
  README.md          ← This file
  parts/
    sword_blade/     ← Individual PNGs per category
    sword_guard/
    sword_handle/
    sword_pommel/
    axe_head/
    axe_handle/
    hammer_head/
    spear_tip/
    spear_shaft/
    staff_head/
    shield/
    magical_crystal/
    dagger_blade/
    bow_limb/
    bow_string/
    knuckle/
    mace_head/
```

---

### Naming Convention

Every part ID follows a deterministic pattern:

```
{category}_{material}_{index:02d}
```

**Examples:**
- `sword_blade_iron_01`   — category: sword_blade, material: iron, index 1
- `axe_head_void_02`      — category: axe_head,    material: void, index 2
- `bow_limb_crystal_02`   — category: bow_limb,    material: crystal, index 2
- `mace_head_void_03`     — category: mace_head,   material: void, index 3

---

### Rarity System

| Rarity    | Weight | Color   | Drop Chance (approx.) |
|-----------|--------|---------|----------------------|
| common    | 100    | #9d9d9d | 48.5%                |
| uncommon  | 60     | #1eff00 | 29.1%                |
| rare      | 30     | #0070dd | 14.6%                |
| epic      | 10     | #a335ee | 4.9%                 |
| legendary | 3      | #ff8000 | 1.5%                 |
| mythic    | 1      | #e6cc80 | 0.5%                 |

---

### Loading the Atlas in PixiJS

```javascript
import * as PIXI from "pixi.js";
import manifest from "./weapon-atlas/manifest.json";

// 1. Load the atlas texture
const texture = await PIXI.Assets.load("weapon-atlas/atlas.png");

// 2. Create a sprite for a specific part by atlas UV
function createPartSprite(partId) {
  const part = manifest.parts[partId];
  if (!part) throw new Error(`Unknown part: ${partId}`);
  
  const rect = new PIXI.Rectangle(part.atlas_x, part.atlas_y, part.atlas_w, part.atlas_h);
  const partTexture = new PIXI.Texture({ source: texture.source, frame: rect });
  return new PIXI.Sprite(partTexture);
}

// 3. Usage
const blade = createPartSprite("sword_blade_iron_01");
app.stage.addChild(blade);
```

---

### Deterministic Part Picker (Seeded RNG)

Use this to reproducibly pick weapon parts from a seed (e.g. loot drop seed, player ID):

```javascript
import manifest from "./weapon-atlas/manifest.json";

// Simple seeded LCG random — deterministic for the same seed
function seededRandom(seed) {
  let s = seed | 0;
  return function () {
    s = (Math.imul(1664525, s) + 1013904223) | 0;
    return (s >>> 0) / 0xffffffff;
  };
}

/**
 * Pick a random part from a category using weighted rarity.
 * @param {string} category   e.g. "sword_blade"
 * @param {number} seed       deterministic seed (e.g. loot seed)
 * @param {string} [minRarity] optional: "common"|"uncommon"|"rare"|"epic"|"legendary"
 * @returns {string} part ID (e.g. "sword_blade_void_03")
 */
function pickPart(category, seed, minRarity = null) {
  const rand = seededRandom(seed);
  const rarityOrder = ["common", "uncommon", "rare", "epic", "legendary", "mythic"];
  const minIdx = minRarity ? rarityOrder.indexOf(minRarity) : 0;
  
  // Collect all parts in this category, filtered by minRarity
  const pool = Object.entries(manifest.parts)
    .filter(([, part]) => 
      part.category === category && 
      rarityOrder.indexOf(part.rarity) >= minIdx
    )
    .map(([id, part]) => ({ id, weight: part.rarity_weight }));

  if (pool.length === 0) throw new Error(`No parts found for category: ${category}`);
  
  // Weighted random pick
  const totalWeight = pool.reduce((sum, p) => sum + p.weight, 0);
  let r = rand() * totalWeight;
  for (const { id, weight } of pool) {
    r -= weight;
    if (r <= 0) return id;
  }
  return pool[pool.length - 1].id;
}

// Example: generate a full sword from a loot seed
function rollSword(lootSeed) {
  return {
    blade:  pickPart("sword_blade",  lootSeed * 1),
    guard:  pickPart("sword_guard",  lootSeed * 2),
    handle: pickPart("sword_handle", lootSeed * 3),
    pommel: pickPart("sword_pommel", lootSeed * 4),
  };
}

function rollBow(lootSeed) {
  return {
    limb:   pickPart("bow_limb",   lootSeed * 1),
    string: pickPart("bow_string", lootSeed * 2),
  };
}

function rollDagger(lootSeed) {
  return {
    blade:  pickPart("dagger_blade",  lootSeed * 1),
    guard:  pickPart("sword_guard",   lootSeed * 2),
    handle: pickPart("sword_handle",  lootSeed * 3),
  };
}

// Usage
const sword = rollSword(0xDEADBEEF);
// { blade: "sword_blade_iron_01", guard: "sword_guard_iron_01", ... }
// Same seed → always same result. Different seed → different weapon.
```

---

### Assembling a Composite Weapon Sprite

```javascript
// Compose weapon parts into a single PIXI.Container
function buildWeapon(partIds) {
  const container = new PIXI.Container();
  for (const partId of partIds) {
    const sprite = createPartSprite(partId);
    sprite.anchor.set(0.5);
    container.addChild(sprite);
  }
  return container;
}

// Example sword
const sword = rollSword(0xDEADBEEF);
const swordContainer = buildWeapon([
  sword.blade, sword.guard, sword.handle, sword.pommel
]);
app.stage.addChild(swordContainer);
```

---

### Animation Integration

```javascript
import animations from "./weapon-atlas/animations.json";
import manifest from "./weapon-atlas/manifest.json";

// Get animation data for a specific animation
function getAnimData(animName) {
  return animations.frame_data[animName];
}

// Get all valid animations for a weapon part
function getPartAnimations(partId) {
  const part = manifest.parts[partId];
  return part ? part.animation_groups : [];
}

// Example: play swing animation on a sword blade
const bladeAnims = getPartAnimations("sword_blade_iron_01");
// ["idle", "swing", "slash", "thrust", "parry", "impact", "critical_hit", "sheathe"]

const swingData = getAnimData("swing");
// { frames: 6, duration_ms: 350, loop: false, description: "Horizontal swing arc" }
```

---

### Filtering by Tag

```javascript
// Pick only parts matching certain tags (e.g. for biome-themed loot)
function pickPartByTag(category, seed, requiredTag) {
  const rand = seededRandom(seed);
  const pool = Object.entries(manifest.parts)
    .filter(([, p]) => p.category === category && p.tags.includes(requiredTag))
    .map(([id, p]) => ({ id, weight: p.rarity_weight }));

  const totalWeight = pool.reduce((s, p) => s + p.weight, 0);
  let r = rand() * totalWeight;
  for (const { id, weight } of pool) {
    r -= weight;
    if (r <= 0) return id;
  }
  return pool[pool.length - 1].id;
}

// Example: only void-biome weapons in a dungeon
const voidBlade = pickPartByTag("sword_blade", seed, "void_biome");
```

---

### Assembly Rules

Each weapon kind specifies which part slots are needed:

| Kind    | Required Slots                                  |
|---------|-------------------------------------------------|
| sword   | sword_blade + sword_guard + sword_handle + sword_pommel |
| axe     | axe_head + axe_handle                          |
| hammer  | hammer_head + axe_handle                       |
| spear   | spear_tip + spear_shaft                         |
| bow     | bow_limb + bow_string                           |
| dagger  | dagger_blade + sword_guard + sword_handle       |
| mace    | mace_head + axe_handle                         |
| staff   | staff_head + spear_shaft                        |

---

*Generated by Weapon Atlas Generator — PixiJS Ready*
