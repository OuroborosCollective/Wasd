export class TerrainBrush {
  apply(chunkId: string, brushType: string, strength: number) {
    return { chunkId, brushType, strength, appliedAt: 0 /* ARE-DETERMINISM-ALLOW: determinism placeholder */ };
  }
}