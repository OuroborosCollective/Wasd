export class ResourceScatter {
  generateForBiome(biome:string){
    if (biome === "forest") return ["wood","berries"];
    if (biome === "mountain") return ["stone","iron"];
    if (biome === "desert") return ["salt","crystals"];
    return [];
  }
}