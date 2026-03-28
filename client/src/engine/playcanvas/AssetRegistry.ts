// client/src/engine/playcanvas/AssetRegistry.ts

export const AssetRegistry: Record<string, string> = {
  "Npc_warrior": "/world-assets/characters/Npc_warrior.glb",
  "Questnpc_uschi": "/world-assets/characters/Questnpc_uschi.glb",
  "npc_valkyrie": "/world-assets/characters/npc_valkyrie.glb",
  "uschi": "/world-assets/characters/uschi.glb",
  "bodyarmor01": "/world-assets/equipment/armor/bodyarmor01.glb",
  "bodyarmor02": "/world-assets/equipment/armor/bodyarmor02.glb",
  "Shield01": "/world-assets/equipment/shields/Shield01.glb",
  "Market_Furniture": "/world-assets/props/Market_Furniture.glb",
  "Marketplace_Stall": "/world-assets/props/Marketplace_Stall.glb",
  "Marketplace_well": "/world-assets/props/Marketplace_well.glb",
  "bigbear01": "/world-assets/monsters/bigbear01.glb",
  "boar01": "/world-assets/monsters/boar01.glb",
  "goblin": "/world-assets/monsters/goblin.glb",
  "Mount_Admin": "/world-assets/admin/Mount_Admin.glb",
  "Scatter_dirtmount": "/world-assets/vegetation/scatter/Scatter_dirtmount.glb",
  "Scatter_flowers": "/world-assets/vegetation/scatter/Scatter_flowers.glb",
  "Scatter_leaves": "/world-assets/vegetation/scatter/Scatter_leaves.glb",
  "Scatter_mushrooms": "/world-assets/vegetation/scatter/Scatter_mushrooms.glb",
  "Scatter_sticks": "/world-assets/vegetation/scatter/Scatter_sticks.glb",
  "Trees_autumn": "/world-assets/vegetation/trees/Trees_autumn.glb",
  "Trees_dead": "/world-assets/vegetation/trees/Trees_dead.glb",
  "Trees_green": "/world-assets/vegetation/trees/Trees_green.glb",
  "Trees_young": "/world-assets/vegetation/trees/Trees_young.glb",
  "chest": "/world-assets/props/chest.glb",
  "Castle_Wall": "/world-assets/buildings/Castle_Wall.glb",
  "woodcillagehouse1": "/world-assets/buildings/woodcillagehouse1.glb"
};

export function getAssetUrl(assetId: string): string | undefined {
  return AssetRegistry[assetId];
}
