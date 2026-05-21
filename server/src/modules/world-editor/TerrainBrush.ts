// @ARE-GUARD-EXEMPT: Brush applied timestamps; not world-state input.
export class TerrainBrush {
  apply(chunkId: string, brushType: string, strength: number) {
    return { chunkId, brushType, strength, appliedAt: Date.now() };
  }
}