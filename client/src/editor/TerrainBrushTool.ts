export class TerrainBrushTool {
  apply(mode: "raise" | "lower" | "flatten", radius: number) {
    return { mode, radius };
  }
}