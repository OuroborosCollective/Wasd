import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface Memory {
    id?: string;
    npcId: string;
    content: string;
    importance: number;
    timestamp: number;
    tags: string[];
    persistent: boolean;
}

export interface NPCTraits {
    interests: string[];
    personality: string[];
}

export class NPCMemoryCache {
    private memories: Map<string, Memory[]> = new Map();
    private writeBuffer: Memory[] = [];
    private supabase: SupabaseClient;

    constructor(supabaseUrl: string, supabaseKey: string) {
        this.supabase = createClient(supabaseUrl, supabaseKey);
    }

    /**
     * Fügt eine neue Erinnerung zum Cache und zum Write-Buffer hinzu.
     */
    public addMemory(npcId: string, memoryData: Omit<Memory, 'npcId' | 'persistent'>): void {
        const memory: Memory = {
            ...memoryData,
            npcId,
            persistent: false
        };

        if (!this.memories.has(npcId)) {
            this.memories.set(npcId, []);
        }
        
        this.memories.get(npcId)?.push(memory);
        this.writeBuffer.push(memory);
    }

    /**
     * Gibt gewichtete Erinnerungen basierend auf NPC-Traits und Wichtigkeit zurück.
     */
    public getWeightedMemories(npcId: string, traits: NPCTraits): Memory[] {
        const npcMemories = this.memories.get(npcId) || [];
        
        return [...npcMemories].sort((a, b) => {
            const scoreA = this.calculateWeight(a, traits);
            const scoreB = this.calculateWeight(b, traits);
            return scoreB - scoreA;
        });
    }

    /**
     * Berechnet die Gewichtung einer Erinnerung.
     */
    private calculateWeight(memory: Memory, traits: NPCTraits): number {
        let score = memory.importance;
        
        const traitKeywords = [...traits.interests, ...traits.personality].map(t => t.toLowerCase());
        const matchCount = memory.tags.filter(tag => 
            traitKeywords.includes(tag.toLowerCase())
        ).length;

        // Relevanz-Bonus durch Traits
        score += matchCount * 1.5;

        // Zeit-Degradierung: Neuere Erinnerungen sind gewichtiger
        const hoursPassed = (Date.now() - memory.timestamp) / (1000 * 60 * 60);
        score -= hoursPassed * 0.05;

        return score;
    }

    /**
     * Persistiert alle neuen Erinnerungen im Buffer in der Supabase Datenbank.
     */
    public async flushToDatabase(): Promise<void> {
        if (this.writeBuffer.length === 0) return;

        const memoriesToFlush = [...this.writeBuffer];
        this.writeBuffer = [];

        try {
            const { data, error } = await this.supabase
                .from('npc_memories')
                .insert(memoriesToFlush.map(m => ({
                    npc_id: m.npcId,
                    content: m.content,
                    importance: m.importance,
                    created_at: new Date(m.timestamp).toISOString(),
                    tags: m.tags
                })));

            if (error) throw error;

            // Nach erfolgreichem Flush: Im Cache als persistent markieren
            memoriesToFlush.forEach(m => {
                m.persistent = true;
            });
        } catch (err) {
            // Bei Fehler: Zurück in den Buffer für den nächsten Versuch
            this.writeBuffer = [...memoriesToFlush, ...this.writeBuffer];
            console.error('NPCMemoryCache: Flush failed', err);
            throw err;
        }
    }

    /**
     * Bereinigt den Cache für einen NPC oder den gesamten Cache.
     */
    public clearCache(npcId?: string): void {
        if (npcId) {
            this.memories.delete(npcId);
        } else {
            this.memories.clear();
        }
    }

    /**
     * Gibt den aktuellen Status des Buffers zurück.
     */
    public getBufferSize(): number {
        return this.writeBuffer.length;
    }
}