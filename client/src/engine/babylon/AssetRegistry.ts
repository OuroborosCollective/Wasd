// Canonical GLB URLs under /assets/models/* (bundled with the client).
// Keys used by tooling and docs; keep in sync with game-data glb-links fallbacks.

export const AssetRegistry: Record<string, string> = {
  Npc_warrior: "/assets/models/characters/Npc_warrior.glb",
  Questnpc_uschi: "/assets/models/characters/Questnpc_uschi.glb",
  npc_valkyrie: "/assets/models/characters/npc_valkyrie.glb",
  uschi: "/assets/models/characters/uschi.glb",
  bodyarmor01: "/assets/models/equipment/armor/bodyarmor01.glb",
  bodyarmor02: "/assets/models/equipment/armor/bodyarmor02.glb",
  Shield01: "/assets/models/equipment/shields/Shield01.glb",
  Market_Furniture: "/assets/models/marketplace/Market_Furniture.glb",
  Marketplace_Stall: "/assets/models/marketplace/Marketplace_Stall.glb",
  Marketplace_well: "/assets/models/marketplace/Marketplace_well.glb",
  bigbear01: "/assets/models/monsters/bigbear01.glb",
  boar01: "/assets/models/monsters/boar01.glb",
  goblin: "/assets/models/monsters/goblin.glb",
  Mount_Admin: "/assets/models/mounts/Mount_Admin.glb",
  Scatter_dirtmount: "/assets/models/nature/scatter/Scatter_dirtmount.glb",
  Scatter_flowers: "/assets/models/nature/scatter/Scatter_flowers.glb",
  Scatter_leaves: "/assets/models/nature/scatter/Scatter_leaves.glb",
  Scatter_mushrooms: "/assets/models/nature/scatter/Scatter_mushrooms.glb",
  Scatter_sticks: "/assets/models/nature/scatter/Scatter_sticks.glb",
  Trees_autumn: "/assets/models/nature/trees/Trees_autumn.glb",
  Trees_dead: "/assets/models/nature/trees/Trees_dead.glb",
  Trees_green: "/assets/models/nature/trees/Trees_green.glb",
  Trees_young: "/assets/models/nature/trees/Trees_young.glb",
  chest: "/assets/models/objects/chest.glb",
  Castle_Wall: "/assets/models/structures/Castle_Wall.glb",
  woodcillagehouse1: "/assets/models/structures/woodcillagehouse1.glb",
};

export function getAssetUrl(assetId: string): string | undefined {
  return AssetRegistry[assetId];
}
