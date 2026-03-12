export class ObserverEngine {
  private observers = new Map<string, { x: number; y: number }>();
  private viewDistanceChunks = 1; // 1 chunk in each direction (3x3 grid)

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
    const activeChunks = new Set<string>();
    
    for (const [, pos] of this.observers) {
      const centerChunkX = Math.floor(pos.x / 64);
      const centerChunkY = Math.floor(pos.y / 64);

      for (let dx = -this.viewDistanceChunks; dx <= this.viewDistanceChunks; dx++) {
        for (let dy = -this.viewDistanceChunks; dy <= this.viewDistanceChunks; dy++) {
          activeChunks.add(`${centerChunkX + dx}:${centerChunkY + dy}`);
        }
      }
    }
    
    return Array.from(activeChunks).map(id => {
      const [chunkX, chunkY] = id.split(':').map(Number);
      return { chunkX, chunkY, id };
    });
  }
}