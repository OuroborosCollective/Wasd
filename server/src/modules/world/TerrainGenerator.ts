export class TerrainGenerator {
  getHeight(x: number, y: number) {
    return Math.sin(x * 0.1) + Math.cos(y * 0.1);
  }
}