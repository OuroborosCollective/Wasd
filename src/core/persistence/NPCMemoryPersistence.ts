import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface NPCMemoryEntry {
    npc_id: string;
    content: string;
    context: any;
    importance: number;
    timestamp: string;
}

export class NPCMemoryPersistence {
    private supabase: SupabaseClient;
    private tickCounter: number = 0;
    private readonly FLUSH_THRESHOLD: number = 300;
    private memoryBuffer: NPCMemoryEntry[] = [];
    private readonly STORAGE_FALLBACK_KEY = 'npc_memory_persistence_fallback';

    constructor(supabaseUrl: string, supabaseKey: string) {
        this.supabase = createClient(supabaseUrl, supabaseKey);
    }

    public async processTick(memoryUpdate?: NPCMemoryEntry): Promise<void> {
        if (memoryUpdate) {
            this.memoryBuffer.push(memoryUpdate);
        }

        this.tickCounter++;

        if (this.tickCounter >= this.FLUSH_THRESHOLD) {
            await this.flushToSupabase();
            this.tickCounter = 0;
        }
    }

    private async flushToSupabase(): Promise<void> {
        if (this.memoryBuffer.length === 0) return;

        const currentBatch = [...this.memoryBuffer];
        this.memoryBuffer = [];

        try {
            const { error } = await this.supabase
                .from('npc_memories')
                .insert(currentBatch);

            if (error) {
                throw error;
            }
        } catch (err) {
            this.handleFallback(currentBatch);
        }
    }

    private handleFallback(failedBatch: NPCMemoryEntry[]): void {
        try {
            const existingRaw = localStorage.getItem(this.STORAGE_FALLBACK_KEY);
            const existingData: NPCMemoryEntry[] = existingRaw ? JSON.parse(existingRaw) : [];
            const mergedData = [...existingData, ...failedBatch];
            
            localStorage.setItem(this.STORAGE_FALLBACK_KEY, JSON.stringify(mergedData));
        } catch (storageErr) {
            this.memoryBuffer.unshift(...failedBatch);
        }
    }

    public async attemptRecovery(): Promise<void> {
        const rawFallback = localStorage.getItem(this.STORAGE_FALLBACK_KEY);
        if (!rawFallback) return;

        try {
            const fallbackData: NPCMemoryEntry[] = JSON.parse(rawFallback);
            if (fallbackData.length === 0) return;

            const { error } = await this.supabase
                .from('npc_memories')
                .insert(fallbackData);

            if (!error) {
                localStorage.removeItem(this.STORAGE_FALLBACK_KEY);
            }
        } catch (recoveryErr) {
            // Keep in fallback storage for next attempt
        }
    }

    public getBufferSize(): number {
        return this.memoryBuffer.length;
    }
}