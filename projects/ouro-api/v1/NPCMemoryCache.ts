export interface MemoryEntry {
    id: string;
    npcId: string;
    action: any;
    content: string;
    timestamp: number;
    metadata?: Record<string, any>;
    embedding?: number[];
}

export interface IVectorDatabase {
    save(entry: MemoryEntry): Promise<void>;
    query(npcId: string, embedding: number[], limit: number): Promise<MemoryEntry[]>;
}

export class NPCMemoryCache {
    private localCache: Map<string, MemoryEntry[]> = new Map();
    private vectorDB: IVectorDatabase;
    private maxLocalHistory: number;

    constructor(vectorDB: IVectorDatabase, maxLocalHistory: number = 100) {
        this.vectorDB = vectorDB;
        this.maxLocalHistory = maxLocalHistory;
    }

    /**
     * Ruft die kurzfristige Historie aus dem Cache ab.
     */
    public getHistory(npcId: string, limit: number = 20): MemoryEntry[] {
        const history = this.localCache.get(npcId) || [];
        return history.slice(-limit);
    }

    /**
     * Speichert eine Aktion im Cache und in der Vektor-Datenbank.
     */
    public async commitAction(npcId: string, action: any, content: string, embedding?: number[], metadata?: Record<string, any>): Promise<void> {
        const entry: MemoryEntry = {
            id: this.generateUUID(),
            npcId,
            action,
            content,
            timestamp: Date.now(),
            embedding,
            metadata
        };

        // Local Cache Update
        if (!this.localCache.has(npcId)) {
            this.localCache.set(npcId, []);
        }

        const history = this.localCache.get(npcId)!;
        history.push(entry);

        if (history.length > this.maxLocalHistory) {
            history.shift();
        }

        // Persistent Vector Storage
        if (embedding) {
            await this.vectorDB.save(entry);
        }
    }

    /**
     * Führt eine semantische Suche in der Langzeiterinnerung durch.
     */
    public async searchLongTermMemory(npcId: string, queryEmbedding: number[], limit: number = 5): Promise<MemoryEntry[]> {
        return await this.vectorDB.query(npcId, queryEmbedding, limit);
    }

    /**
     * Speichert ein Resonanz-Echo in der NPC-Erinnerung.
     */
    public async recordResonanceEcho(npcId: string, gateId: string, intensity: number, insight: number): Promise<void> {
        await this.commitAction(
            npcId,
            'resonance_echo',
            `Sensed a dimensional resonance gate ${gateId} with intensity ${intensity.toFixed(2)}`,
            undefined,
            { gateId, intensity, insight, type: 'ARE_RESONANCE' }
        );
    }

    /**
     * Löscht den lokalen Cache für einen NPC.
     */
    public flushLocalCache(npcId: string): void {
        this.localCache.delete(npcId);
    }

    private generateUUID(): string {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
}

/**
 * Beispiel-Implementierung für ein Pinecone-Binding
 */
export class PineconeVectorStore implements IVectorDatabase {
    private apiKey: string;
    private indexName: string;

    constructor(apiKey: string, indexName: string) {
        this.apiKey = apiKey;
        this.indexName = indexName;
    }

    async save(entry: MemoryEntry): Promise<void> {
        // Implementierung des HTTP-Calls zu Pinecone API
        // Fetch/Axios call hier einfügen
    }

    async query(npcId: string, embedding: number[], limit: number): Promise<MemoryEntry[]> {
        // Implementierung der Pinecone Query-Logik mit Metadata-Filter auf npcId
        return [];
    }
}

/**
 * Beispiel-Implementierung für FAISS (Node-Binding)
 */
export class FAISSVectorStore implements IVectorDatabase {
    async save(entry: MemoryEntry): Promise<void> {
        // Lokales Indexing über FAISS Node Bindings
    }

    async query(npcId: string, embedding: number[], limit: number): Promise<MemoryEntry[]> {
        // Lokale Vektor-Suche
        return [];
    }
}