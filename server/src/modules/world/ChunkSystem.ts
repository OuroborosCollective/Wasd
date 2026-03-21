export class ChunkSystem {
  private chunks = new Map<string, { id: string, x: number, y: number, size: number, entities: Set<string>, active: boolean }>();

  constructor(public readonly size: number = 64) {}

  getChunkId(x: number, y: number): string {
    const chunkX = Math.floor(x / this.size);
    const chunkY = Math.floor(y / this.size);
    return `${chunkX}:${chunkY}`;
  }

  getChunk(chunkX: number, chunkY: number) {
    const id = `${chunkX}:${chunkY}`;
    if (!this.chunks.has(id)) {
      this.chunks.set(id, {
        id,
        x: chunkX,
        y: chunkY,
        size: this.size,
        entities: new Set(),
        active: false
      });
    }
    return this.chunks.get(id)!;
  }

  addEntity(entityId: string, x: number, y: number) {
    const chunkId = this.getChunkId(x, y);
    const [cx, cy] = chunkId.split(':').map(Number);
    const chunk = this.getChunk(cx, cy);
    chunk.entities.add(entityId);
    return chunkId;
  }

  removeEntity(entityId: string, chunkId: string) {
    const chunk = this.chunks.get(chunkId);
    if (chunk) {
      chunk.entities.delete(entityId);
    }
  }

  moveEntity(entityId: string, oldX: number, oldY: number, newX: number, newY: number) {
    const oldChunkId = this.getChunkId(oldX, oldY);
    const newChunkId = this.getChunkId(newX, newY);

    if (oldChunkId !== newChunkId) {
      this.removeEntity(entityId, oldChunkId);
      this.addEntity(entityId, newX, newY);
    }
    return newChunkId;
  }

  getActiveChunks() {
    return Array.from(this.chunks.values()).filter(c => c.active);
  }

  setChunkActive(chunkId: string, active: boolean) {
    const chunk = this.chunks.get(chunkId);
    if (chunk) {
      chunk.active = active;
    }
  }
}