// Default GLB URLs under /assets/models/world-assets/ (mirrored from repo-root world-assets/ at client prebuild/predev).
// Keys used by BabylonAdapter fallbacks and tooling.

export const AssetRegistry: Record<string, string> = {
  Npc_warrior: "/assets/models/world-assets/characters/Npc_warrior.glb",
  Questnpc_uschi: "/assets/models/world-assets/characters/Npc_warrior.glb",
  npc_valkyrie: "/assets/models/world-assets/characters/humanknight.glb",
  uschi: "/assets/models/world-assets/characters/Npc001.glb",
  bodyarmor01: "/assets/models/world-assets/equipment/armor/bodyarmor01.glb",
  bodyarmor02: "/assets/models/world-assets/equipment/armor/bodyarmor02.glb",
  Shield01: "/assets/models/world-assets/equipment/shields/Shield01.glb",
  Market_Furniture: "/assets/models/world-assets/props/deko/deko_outdoor1.glb",
  Marketplace_Stall: "/assets/models/world-assets/props/deko/deko_outdoor2.glb",
  Marketplace_well: "/assets/models/world-assets/props/deko/deko_outdoor1.glb",
  bigbear01: "/assets/models/world-assets/monsters/bigbear01.glb",
  boar01: "/assets/models/world-assets/monsters/boar01.glb",
  goblin: "/assets/models/world-assets/monsters/wolfredeye.glb",
  Mount_Admin: "/assets/models/world-assets/admin/lonadarz.glb",
  Scatter_dirtmount: "/assets/models/world-assets/props/deko/deko_outdoor1.glb",
  Scatter_flowers: "/assets/models/world-assets/props/deko/deko_outdoor2.glb",
  Scatter_leaves: "/assets/models/world-assets/props/deko/deko_outdoor1.glb",
  Scatter_mushrooms: "/assets/models/world-assets/props/deko/deko_outdoor2.glb",
  Scatter_sticks: "/assets/models/world-assets/props/deko/deko_outdoor1.glb",
  Trees_autumn: "/assets/models/world-assets/monsters/horsebrown.glb",
  Trees_dead: "/assets/models/world-assets/monsters/horse.glb",
  Trees_green: "/assets/models/world-assets/monsters/horsebrown.glb",
  Trees_young: "/assets/models/world-assets/monsters/horse.glb",
  chest: "/assets/models/world-assets/equipment/armor/bodyarmor01.glb",
  Castle_Wall: "/assets/models/world-assets/buildings/woodcillagehouse1.glb",
  woodcillagehouse1: "/assets/models/world-assets/buildings/woodcillagehouse1.glb",
};

export function getAssetUrl(assetId: string): string | undefined {
  return AssetRegistry[assetId];
}
