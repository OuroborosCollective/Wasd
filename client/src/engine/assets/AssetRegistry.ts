export const AssetRegistry: Record<string, string> = {
  Npc_warrior: "/assets/models/world-assets/characters/Npc_warrior.glb",
  Questnpc_uschi: "/assets/models/world-assets/characters/Questnpc_uschi.glb",
  npc_valkyrie: "/assets/models/world-assets/characters/npc_valkyrie.glb",
  uschi: "/assets/models/world-assets/characters/uschi.glb",
  bodyarmor01: "/assets/models/world-assets/equipment/armor/bodyarmor01.glb",
  bodyarmor02: "/assets/models/world-assets/equipment/armor/bodyarmor02.glb",
  Shield01: "/assets/models/world-assets/equipment/shields/Shield01.glb",
  Market_Furniture: "/assets/models/world-assets/props/Market_Furniture.glb",
  Marketplace_Stall: "/assets/models/world-assets/props/Marketplace_Stall.glb",
  Marketplace_well: "/assets/models/world-assets/props/Marketplace_well.glb",
  bigbear01: "/assets/models/world-assets/monsters/bigbear01.glb",
  boar01: "/assets/models/world-assets/monsters/boar01.glb",
  goblin: "/assets/models/world-assets/monsters/goblin.glb",
  Mount_Admin: "/assets/models/world-assets/admin/Mount_Admin.glb",
  Scatter_dirtmount: "/assets/models/world-assets/vegetation/scatter/Scatter_dirtmount.glb",
  Scatter_flowers: "/assets/models/world-assets/vegetation/scatter/Scatter_flowers.glb",
  Scatter_leaves: "/assets/models/world-assets/vegetation/scatter/Scatter_leaves.glb",
  Scatter_mushrooms: "/assets/models/world-assets/vegetation/scatter/Scatter_mushrooms.glb",
  Scatter_sticks: "/assets/models/world-assets/vegetation/scatter/Scatter_sticks.glb",
  Trees_autumn: "/assets/models/world-assets/vegetation/trees/Trees_autumn.glb",
  Trees_dead: "/assets/models/world-assets/vegetation/trees/Trees_dead.glb",
  Trees_green: "/assets/models/world-assets/vegetation/trees/Trees_green.glb",
  Trees_young: "/assets/models/world-assets/vegetation/trees/Trees_young.glb",
  chest: "/assets/models/world-assets/props/chest.glb",
  Castle_Wall: "/assets/models/world-assets/buildings/Castle_Wall.glb",
  woodcillagehouse1: "/assets/models/world-assets/buildings/woodcillagehouse1.glb",
};

export function getAssetUrl(assetId: string): string | undefined {
  return AssetRegistry[assetId];
}
