export class ResourceScatter {
  generateForBiome(biome:string){
    if (biome === "forest") return ["wood","berries"];
    if (biome === "mountain") return ["stone","iron"];
    if (biome === "desert") return ["salt","crystals"];
    return [];
  }

  getGLBForResource(type: string, yields: string): string | undefined {
    // Example logic: map resource types/yields to GLB paths
    // This would ideally be loaded from a config or a dedicated registry
    if (type === "tree") {
      if (yields === "wood") return "/models/resources/tree_pine.glb";
    }
    if (type === "rock") {
      if (yields === "stone") return "/models/resources/rock_01.glb";
      if (yields === "iron") return "/models/resources/iron_ore.glb";
    }
    if (type === "bush") {
      if (yields === "berries") return "/models/resources/berry_bush.glb";
    }
    // Default or fallback
    if (type === "default") {
      if (yields === "tree") return "/models/resources/tree_default.glb";
      if (yields === "rock") return "/models/resources/rock_default.glb";
    }
    return undefined;
  }
}