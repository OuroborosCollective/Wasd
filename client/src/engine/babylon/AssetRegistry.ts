// Default GLB URLs under /world-assets/ (synced from repo-root world-assets/ at client build).
// Keys used by BabylonAdapter fallbacks and tooling.

export const AssetRegistry: Record<string, string> = {
  Npc_warrior: "/world-assets/characters/Npc_warrior.glb",
  Questnpc_uschi: "/world-assets/characters/Npc_warrior.glb",
  npc_valkyrie: "/world-assets/characters/humanknight.glb",
  uschi: "/world-assets/characters/Npc001.glb",
  bodyarmor01: "/world-assets/equipment/armor/bodyarmor01.glb",
  bodyarmor02: "/world-assets/equipment/armor/bodyarmor02.glb",
  Shield01: "/world-assets/equipment/shields/Shield01.glb",
  Market_Furniture: "/world-assets/props/deko/deko_outdoor1.glb",
  Marketplace_Stall: "/world-assets/props/deko/deko_outdoor2.glb",
  Marketplace_well: "/world-assets/props/deko/deko_outdoor1.glb",
  bigbear01: "/world-assets/monsters/bigbear01.glb",
  boar01: "/world-assets/monsters/boar01.glb",
  goblin: "/world-assets/monsters/wolfredeye.glb",
  Mount_Admin: "/world-assets/admin/lonadarz.glb",
  Scatter_dirtmount: "/world-assets/props/deko/deko_outdoor1.glb",
  Scatter_flowers: "/world-assets/props/deko/deko_outdoor2.glb",
  Scatter_leaves: "/world-assets/props/deko/deko_outdoor1.glb",
  Scatter_mushrooms: "/world-assets/props/deko/deko_outdoor2.glb",
  Scatter_sticks: "/world-assets/props/deko/deko_outdoor1.glb",
  Trees_autumn: "/world-assets/monsters/horsebrown.glb",
  Trees_dead: "/world-assets/monsters/horse.glb",
  Trees_green: "/world-assets/monsters/horsebrown.glb",
  Trees_young: "/world-assets/monsters/horse.glb",
  chest: "/world-assets/equipment/armor/bodyarmor01.glb",
  Castle_Wall: "/world-assets/buildings/woodcillagehouse1.glb",
  woodcillagehouse1: "/world-assets/buildings/woodcillagehouse1.glb",
};

export function getAssetUrl(assetId: string): string | undefined {
  return AssetRegistry[assetId];
}
