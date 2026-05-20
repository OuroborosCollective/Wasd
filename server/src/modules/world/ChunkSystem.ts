export interface Chunk {
    x: number;
    y: number;
    id?: string;
    isActive?: boolean;
    active?: boolean;
    size?: number;
    ownerGuildId?: string | null;
    data?: any;
}

export class ChunkSystem {
    private chunks: Map<string, Chunk> = new Map();
    private readonly activeChunkIds = new Set<string>();
    public readonly chunkSize: number;

    constructor(chunkSize: number = 64) {
        this.chunkSize = chunkSize;
    }

    public getChunkId(x: number, y: number): string {
        const cx = Math.floor(x / this.chunkSize);
        const cy = Math.floor(y / this.chunkSize);
        return this.buildChunkId(cx, cy);
    }

    public buildChunkId(cx: number, cy: number): string {
        return `${cx}:${cy}`;
    }

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
    public getActiveChunks(): Chunk[] {
        return [...this.activeChunkIds].map((id) => {
            const [cx, cy] = id.split(":").map((n) => Number(n));
            return {
                x: cx * this.chunkSize,
                y: cy * this.chunkSize,
                id,
                ownerGuildId: null,
            };
        });
    }

    public setChunkActive(id: string, active: boolean): void {
        if (active) this.activeChunkIds.add(id);
        else this.activeChunkIds.delete(id);
    }
}
