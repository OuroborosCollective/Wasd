// @ARE-GUARD-EXEMPT: non-sim module
export class TerrainBrush {
  apply(chunkId: string, brushType: string, strength: number) {
    return { chunkId, brushType, strength, appliedAt: Date.now() };
  }
}