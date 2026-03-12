export class BiomeGenerator {
  getBiome(_x: number, _y: number, height: number) {
    if (height > 0.7) return "mountain";
    if (height > 0.45) return "forest";
    if (height > 0.2) return "grassland";
    return "desert";
  }
}