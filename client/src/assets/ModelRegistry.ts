export const ModelRegistry = {
  // Characters
  uschi: { path: "/assets/models/characters/uschi.glb", scale: 1, category: "character" },
  
  // Monsters
  goblin: { path: "/assets/models/monsters/goblin.glb", scale: 1, category: "monster" },
  
  // Objects
  chest: { path: "/assets/models/objects/chest.glb", scale: 1, category: "object" },
  
  // Item categories - used for inventory/ground items
  items: {
    // Weapons
    weapons: {
      starter_sword: { path: "/assets/models/items/weapons/starter_sword.glb", scale: 0.5 },
      rusted_blade: { path: "/assets/models/items/weapons/rusted_blade.glb", scale: 0.5 },
      iron_sword: { path: "/assets/models/items/weapons/iron_sword.glb", scale: 0.5 },
      steel_longsword: { path: "/assets/models/items/weapons/steel_longsword.glb", scale: 0.5 },
      shadow_blade: { path: "/assets/models/items/weapons/shadow_blade.glb", scale: 0.5 },
      enchanted_staff: { path: "/assets/models/items/weapons/enchanted_staff.glb", scale: 0.6 },
      greatsword: { path: "/assets/models/items/weapons/greatsword.glb", scale: 0.7 },
      battle_axe: { path: "/assets/models/items/weapons/battle_axe.glb", scale: 0.7 },
      spear: { path: "/assets/models/items/weapons/spear.glb", scale: 0.6 },
      mace: { path: "/assets/models/items/weapons/mace.glb", scale: 0.5 },
    },
    
    // Armor
    armor: {
      wooden_shield: { path: "/assets/models/items/armor/wooden_shield.glb", scale: 0.5 },
      iron_shield: { path: "/assets/models/items/armor/iron_shield.glb", scale: 0.5 },
    },
    
    // Consumables
    consumables: {
      health_potion: { path: "/assets/models/items/consumables/health_potion.glb", scale: 0.3 },
      mana_potion: { path: "/assets/models/items/consumables/mana_potion.glb", scale: 0.3 },
      stamina_potion: { path: "/assets/models/items/consumables/stamina_potion.glb", scale: 0.3 },
      cooked_meat: { path: "/assets/models/items/consumables/cooked_meat.glb", scale: 0.3 },
    },
    
    // Misc / Crafting Materials
    misc: {
      iron_scrap: { path: "/assets/models/items/misc/iron_scrap.glb", scale: 0.2 },
      wolf_pelt: { path: "/assets/models/items/misc/wolf_pelt.glb", scale: 0.3 },
      fang: { path: "/assets/models/items/misc/fang.glb", scale: 0.2 },
      alpha_claw: { path: "/assets/models/items/misc/alpha_claw.glb", scale: 0.3 },
      bone_fragment: { path: "/assets/models/items/misc/bone_fragment.glb", scale: 0.2 },
      grave_ring: { path: "/assets/models/items/misc/grave_ring.glb", scale: 0.2 },
      ancient_coin: { path: "/assets/models/items/misc/ancient_coin.glb", scale: 0.2 },
      relic_fragment: { path: "/assets/models/items/misc/relic_fragment.glb", scale: 0.3 },
      forgotten_sigil: { path: "/assets/models/items/misc/forgotten_sigil.glb", scale: 0.3 },
      guard_token: { path: "/assets/models/items/misc/guard_token.glb", scale: 0.2 },
      herb_bundle: { path: "/assets/models/items/misc/herb_bundle.glb", scale: 0.3 },
      boar_tusk: { path: "/assets/models/items/misc/boar_tusk.glb", scale: 0.2 },
      raw_meat: { path: "/assets/models/items/misc/raw_meat.glb", scale: 0.3 },
      crystal_shard: { path: "/assets/models/items/misc/crystal_shard.glb", scale: 0.3 },
    }
  },
  
  // Environment
  environment: {
    tree: { path: "/assets/models/environment/tree.glb", scale: 1 },
    rock: { path: "/assets/models/environment/rock.glb", scale: 1 },
    bush: { path: "/assets/models/environment/bush.glb", scale: 1 },
    building: { path: "/assets/models/environment/building.glb", scale: 1 },
    water: { path: "/assets/models/environment/water.glb", scale: 1 },
  }
};