export interface Chunk {
    x: number;
    y: number;
    ownerGuildId?: string | null;
    data?: any;
}

export class ChunkManager {
    private chunks: Map<string, Chunk> = new Map();

    private getChunkKey(x: number, y: number): string {
        return `${x},${y}`;
    }

    public getChunk(x: number, y: number): Chunk {
        const key = this.getChunkKey(x, y);
        let chunk = this.chunks.get(key);
        
        if (!chunk) {
            chunk = { x, y, ownerGuildId: null };
            this.chunks.set(key, chunk);
        }
        
        return chunk;
    }

    public setChunkOwner(x: number, y: number, guildId: string | null): void {
        const chunk = this.getChunk(x, y);
        chunk.ownerGuildId = guildId;
    }

    public getChunkOwner(x: number, y: number): string | null {
        const chunk = this.chunks.get(this.getChunkKey(x, y));
        return chunk ? (chunk.ownerGuildId || null) : null;
    }

    public getTerritoryMap(): Map<string, string> {
        const territoryMap = new Map<string, string>();
        
        for (const [key, chunk] of this.chunks.entries()) {
            if (chunk.ownerGuildId) {
                territoryMap.set(key, chunk.ownerGuildId);
            }
        }
        
        return territoryMap;
    }

    public clearOwner(x: number, y: number): void {
        const chunk = this.chunks.get(this.getChunkKey(x, y));
        if (chunk) {
            chunk.ownerGuildId = null;
        }
    }

    public getAllChunks(): Chunk[] {
        return Array.from(this.chunks.values());
    }

    public loadChunkData(x: number, y: number, data: any): void {
        const chunk = this.getChunk(x, y);
        chunk.data = data;
    }
}