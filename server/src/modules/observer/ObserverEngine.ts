import { UNIFIED_CHUNK_CONTRACT } from '../../core/spatial/UnifiedChunkContract.js';

export class ObserverEngine {
  private observers = new Map<string, { x: number; y: number }>();
  private readonly chunkSize: number;

  constructor(chunkSize: number = 64) {
    this.chunkSize = chunkSize;
  }

  /**
   * Get the simulation radius in chunks.
   * Uses UnifiedChunkContract to resolve chunk radius conflicts.
   */
  private get viewDistanceChunks(): number {
    return UNIFIED_CHUNK_CONTRACT.simulationRadiusChunks;
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