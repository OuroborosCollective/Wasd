export class ObserverEngine {
  private observers = new Map<string, { x: number; y: number }>();
  private viewDistanceChunks = 1; // 1 chunk in each direction (3x3 grid)
  private readonly chunkSize: number;

  constructor(chunkSize: number = 64) {
    this.chunkSize = chunkSize;
  }

  register(playerId: string, position: { x: number; y: number }) {
    this.observers.set(playerId, position);
  }

  unregister(playerId: string) {
    this.observers.delete(playerId);
  }

  updatePosition(playerId: string, position: { x: number; y: number }) {
    if (this.observers.has(playerId)) {
      this.observers.set(playerId, position);
    }
  }

  getObservedChunks() {
    const ids = new Set<string>();
    const chunks: Array<{ id: string; chunkX: number; chunkY: number }> = [];
    
    // ⚡ Bolt: Single-pass observation gathering to avoid redundant string splitting and allocations
    for (const pos of this.observers.values()) {
      const centerChunkX = Math.floor(pos.x / this.chunkSize);
      const centerChunkY = Math.floor(pos.y / this.chunkSize);

      for (let dx = -this.viewDistanceChunks; dx <= this.viewDistanceChunks; dx++) {
        const cx = centerChunkX + dx;
        for (let dy = -this.viewDistanceChunks; dy <= this.viewDistanceChunks; dy++) {
          const cy = centerChunkY + dy;
          const id = `${cx}:${cy}`;
          if (!ids.has(id)) {
            ids.add(id);
            chunks.push({ id, chunkX: cx, chunkY: cy });
          }
        }
      }
    }
    
    return { ids, chunks };
  }
}