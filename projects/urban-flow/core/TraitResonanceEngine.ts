export interface Entity {
    id: string;
    x: number;
    y: number;
    traits: Record<string, number>;
    lastResonance: number;
}

export interface ResonanceUpdate {
    timestamp: number;
    entities: Entity[];
    activeChunks: string[];
}

export type ResonanceSubscriber = (update: ResonanceUpdate) => void;

export class TraitResonanceEngine {
    private readonly CHUNK_SIZE = 64;
    private entities: Map<string, Entity> = new Map();
    private chunks: Map<string, Set<string>> = new Map();
    private subscribers: Set<ResonanceSubscriber> = new Set();

    constructor() {}

    /**
     * Registriert einen neuen UI-Abonnenten.
     * @param callback Funktion, die bei Updates aufgerufen wird.
     * @returns Cleanup-Funktion zum Deabonnieren.
     */
    public subscribe(callback: ResonanceSubscriber): () => void {
        this.subscribers.add(callback);
        return () => this.subscribers.delete(callback);
    }

    /**
     * Fügt eine Entität zum System hinzu oder aktualisiert sie.
     */
    public upsertEntity(entity: Entity): void {
        const existing = this.entities.get(entity.id);
        if (existing) {
            const oldKey = this.getChunkKey(existing.x, existing.y);
            const newKey = this.getChunkKey(entity.x, entity.y);

            if (oldKey !== newKey) {
                this.removeFromChunk(existing.id, oldKey);
                this.addToChunk(entity.id, newKey);
            }
            this.entities.set(entity.id, entity);
        } else {
            this.entities.set(entity.id, entity);
            const key = this.getChunkKey(entity.x, entity.y);
            this.addToChunk(entity.id, key);
        }
    }

    /**
     * Entfernt eine Entität aus der Engine.
     */
    public removeEntity(id: string): void {
        const entity = this.entities.get(id);
        if (entity) {
            const key = this.getChunkKey(entity.x, entity.y);
            this.removeFromChunk(id, key);
            this.entities.delete(id);
        }
    }

    /**
     * Berechnet die Chunk-Koordinate basierend auf der Weltposition.
     */
    private getChunkKey(x: number, y: number): string {
        const cx = Math.floor(x / this.CHUNK_SIZE);
        const cy = Math.floor(y / this.CHUNK_SIZE);
        return `${cx},${cy}`;
    }

    private addToChunk(id: string, key: string): void {
        if (!this.chunks.has(key)) {
            this.chunks.set(key, new Set());
        }
        this.chunks.get(key)!.add(id);
    }

    private removeFromChunk(id: string, key: string): void {
        const chunk = this.chunks.get(key);
        if (chunk) {
            chunk.delete(id);
            if (chunk.size === 0) {
                this.chunks.delete(key);
            }
        }
    }

    /**
     * Liefert alle Entitäten in einem spezifischen Radius zurück (Chunk-optimiert).
     */
    public getNearbyEntities(x: number, y: number, radius: number): Entity[] {
        const result: Entity[] = [];
        const startX = Math.floor((x - radius) / this.CHUNK_SIZE);
        const endX = Math.floor((x + radius) / this.CHUNK_SIZE);
        const startY = Math.floor((y - radius) / this.CHUNK_SIZE);
        const endY = Math.floor((y + radius) / this.CHUNK_SIZE);

        for (let cx = startX; cx <= endX; cx++) {
            for (let cy = startY; cy <= endY; cy++) {
                const key = `${cx},${cy}`;
                const chunkIds = this.chunks.get(key);
                if (chunkIds) {
                    for (const id of chunkIds) {
                        const entity = this.entities.get(id);
                        if (entity) result.push(entity);
                    }
                }
            }
        }
        return result;
    }

    /**
     * Sendet den aktuellen Status an alle Abonnenten.
     * Nutzt Referenzen statt Deep-Cloning für maximale Performance.
     */
    public broadcast(): void {
        if (this.subscribers.size === 0) return;

        const update: ResonanceUpdate = {
            timestamp: Date.now(),
            entities: Array.from(this.entities.values()),
            activeChunks: Array.from(this.chunks.keys())
        };

        this.subscribers.forEach(subscriber => {
            subscriber(update);
        });
    }

    /**
     * Simulation einer Resonanz-Iteration.
     * Hier würde die tatsächliche Logik für Trait-Interaktionen stattfinden.
     */
    public step(): void {
        // Logik für räumliche Resonanz-Berechnungen hier implementieren
        // ...
        
        this.broadcast();
    }

    public getStats() {
        return {
            entityCount: this.entities.size,
            chunkCount: this.chunks.size,
            subscriberCount: this.subscribers.size
        };
    }
}