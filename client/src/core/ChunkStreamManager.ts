export interface ChunkViewModel {
  id: string;
  chunkX: number;
  chunkY: number;
  objects: any[];
}

export class ChunkStreamManager {
  private loaded = new Map<string, ChunkViewModel>();

  sync(nextChunks: ChunkViewModel[]): void {
    const nextIds = new Set(nextChunks.map(c => c.id));

    // Add new chunks
    for (const chunk of nextChunks) {
      if (!this.loaded.has(chunk.id)) {
        this.loaded.set(chunk.id, chunk);
      }
    }

    // Remove old chunks
    for (const id of Array.from(this.loaded.keys())) {
      if (!nextIds.has(id)) {
        this.loaded.delete(id);
      }
    }
  }

  list(): ChunkViewModel[] {
    return Array.from(this.loaded.values());
  }
}
