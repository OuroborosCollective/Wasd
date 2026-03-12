export class WorldDatabase {
  private chunks = new Map<string, any>();

  saveChunk(chunk: any) {
    this.chunks.set(chunk.id, chunk);
  }

  loadChunk(id: string) {
    return this.chunks.get(id) ?? null;
  }
}