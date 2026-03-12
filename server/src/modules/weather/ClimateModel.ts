export class ClimateModel {
  getClimateForBiome(biome: string) {
    if (biome === "forest") return "temperate";
    if (biome === "desert") return "arid";
    if (biome === "mountain") return "cold";
    return "mixed";
  }
}