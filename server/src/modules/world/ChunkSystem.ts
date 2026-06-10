export interface Chunk {
    x: number;
    y: number;
    id?: string;
    isActive?: boolean;
    active?: boolean;
    size?: number;
    ownerGuildId?: string | null;
    data?: any;
}export class ChunkSystem {
    private chunks: Map<string, Chunk> = new Map();
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

    /**
     * Get all active chunks.
     * Active chunks are those with isActive=true or active=true.
     */
    public getActiveChunks(): Chunk[] {
        return Array.from(this.chunks.values()).filter(
            chunk => chunk.isActive === true || chunk.active === true
        );
    }

    /**
     * Set a chunk as active or inactive by its coordinates.
     * @param x Chunk X coordinate
     * @param y Chunk Y coordinate
     * @param active True to mark active, false to mark inactive
     */
    public setChunkActive(x: number, y: number, active: boolean): void {
        const chunk = this.getChunk(x, y);
        chunk.isActive = active;
        chunk.active = active;
    }

    /**
     * Set a chunk as active or inactive by its chunk ID (cx:cy format).
     * @param chunkId Chunk ID in format "cx:cy"
     * @param active True to mark active, false to mark inactive
     */
    public setChunkActiveById(chunkId: string, active: boolean): void {
        const [cxStr, cyStr] = chunkId.split(':');
        const cx = parseInt(cxStr, 10);
        const cy = parseInt(cyStr, 10);
        if (!isNaN(cx) && !isNaN(cy)) {
            this.setChunkActive(cx, cy, active);
        }
    }
}
