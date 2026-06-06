// @ts-nocheck: optional external DB client types in minimal builds.
/** @are-telemetry-side-channel */
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { deterministicNow } from "../../core/determinism/AREDeterminism.js";
import type { NPCTraits } from "./NPCTraits.js";

export interface Memory {
    id?: string;
    npcId: string;
    content: string;
    importance: number;
    timestamp: number;
    tags: string[];
    persistent: boolean;
}

export type MemoryEvent = {
  id: string;
  npcId: string;
  tags: string[];
  timestamp: number;
  content: string;
  kind?: string;
  data?: unknown;
};

export class NPCMemoryCache {
    private memories: Map<string, Memory[]> = new Map();
    private writeBuffer: Memory[] = [];
    private supabase: SupabaseClient | null = null;
    private logicalClock = deterministicNow("npc-memory-cache:init");

    constructor(supabaseUrl?: string, supabaseKey?: string) {
        if (supabaseUrl && supabaseKey) {
            this.supabase = createClient(supabaseUrl, supabaseKey);
        }
    }

    private now(seed: string | number = 0): number {
        this.logicalClock += 1;
        return deterministicNow(`${seed}:${this.logicalClock}`);
    }

    public recordChat(npcId: string, chat: { text: string; sender: string; channel: string; ts: number }): void {
        this.addMemory(npcId, {
            content: `[${chat.channel}] ${chat.sender}: ${chat.text}`,
            importance: 1,
            timestamp: chat.ts,
            tags: ['chat', chat.channel]
        });
    }

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

    public getWeightedMemories(npcId: string, traits: NPCTraits): Memory[] {
        const npcMemories = this.memories.get(npcId) || [];
        
        return [...npcMemories].sort((a, b) => {
            const scoreA = this.calculateWeight(a, traits);
            const scoreB = this.calculateWeight(b, traits);
            if (scoreB !== scoreA) return scoreB - scoreA;
            return this.stableMemoryId(a) < this.stableMemoryId(b) ? -1 : 1;
        });
    }

    private calculateWeight(memory: Memory, traits: NPCTraits): number {
        let score = memory.importance;
        
        const traitKeywords = [...traits.interests, ...traits.personality].map(t => t.toLowerCase());
        const matchCount = memory.tags.filter(tag => 
            traitKeywords.includes(tag.toLowerCase())
        ).length;

        score += matchCount * 1.5;

        const hoursPassed = Math.max(0, this.now(memory.npcId) - memory.timestamp) / (1000 * 60 * 60);
        score -= hoursPassed * 0.05;

        return score;
    }

    public async flushToDatabase(): Promise<void> {
        if (!this.supabase || this.writeBuffer.length === 0) return;

        const memoriesToFlush = [...this.writeBuffer];
        this.writeBuffer = [];

        try {
            const { error } = await this.supabase
                .from('npc_memories')
                .insert(memoriesToFlush.map(m => ({
                    npc_id: m.npcId,
                    content: m.content,
                    importance: m.importance,
                    created_at: new Date(m.timestamp).toISOString(), // @are-telemetry-side-channel: persistence metadata only.
                    tags: m.tags
                })));

            if (error) throw error;

            memoriesToFlush.forEach(m => {
                m.persistent = true;
            });
        } catch (err) {
            this.writeBuffer = [...memoriesToFlush, ...this.writeBuffer];
            console.error('NPCMemoryCache: Flush failed', err);
            throw err;
        }
    }

    public clearCache(npcId?: string): void {
        if (npcId) {
            this.memories.delete(npcId);
            this.writeBuffer = this.writeBuffer.filter((memory) => memory.npcId !== npcId);
        } else {
            this.memories.clear();
            this.writeBuffer = [];
        }
    }

    public getBufferSize(): number {
        return this.writeBuffer.length;
    }

    public get(npcId: string): Memory[] {
        return [...(this.memories.get(npcId) || [])];
    }

    public observe(npcId: string, observation: string): void {
        this.addMemory(npcId, {
            content: observation,
            importance: 1,
            timestamp: this.now(`${npcId}:observation`),
            tags: ['observation']
        });
    }

    public setGoal(npcId: string, goal: string): void {
        this.addMemory(npcId, {
            content: goal,
            importance: 2,
            timestamp: this.now(`${npcId}:goal`),
            tags: ['goal']
        });
    }

    public logEvent(npcId: string, event: string): void {
        this.addMemory(npcId, {
            content: event,
            importance: 1,
            timestamp: this.now(`${npcId}:event`),
            tags: ['event']
        });
    }

    public getEvents(npcId: string): MemoryEvent[] {
        return this.get(npcId)
            .map((memory, index) => this.toMemoryEvent(memory, index))
            .sort((a, b) => {
                if (a.timestamp !== b.timestamp) return a.timestamp - b.timestamp;
                return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
            });
    }

    public hydrate(snapshot: unknown): void {
        if (!snapshot || typeof snapshot !== 'object') return;
        const entries = Array.isArray((snapshot as any).memories) ? (snapshot as any).memories : [];
        for (const entry of entries) {
            if (!entry || typeof entry !== 'object') continue;
            const npcId = String((entry as any).npcId ?? '');
            if (!npcId) continue;
            const memory: Memory = {
                id: (entry as any).id ? String((entry as any).id) : undefined,
                npcId,
                content: String((entry as any).content ?? ''),
                importance: Number.isFinite(Number((entry as any).importance)) ? Number((entry as any).importance) : 1,
                timestamp: Number.isFinite(Number((entry as any).timestamp)) ? Number((entry as any).timestamp) : this.now(`${npcId}:hydrate`),
                tags: Array.isArray((entry as any).tags) ? (entry as any).tags.map(String).sort() : ['hydrated'],
                persistent: Boolean((entry as any).persistent),
            };
            if (!this.memories.has(npcId)) this.memories.set(npcId, []);
            this.memories.get(npcId)?.push(memory);
            if (!memory.persistent) this.writeBuffer.push(memory);
        }
    }

    public getDirtyEntries(): Array<{ npcId: string }> {
        return Array.from(new Set(this.writeBuffer.map((memory) => memory.npcId)))
            .sort()
            .map((npcId) => ({ npcId }));
    }

    public markSaved(npcId: string): void {
        this.writeBuffer = this.writeBuffer.filter((memory) => memory.npcId !== npcId);
        for (const memory of this.memories.get(npcId) ?? []) {
            memory.persistent = true;
        }
    }

    private stableMemoryId(memory: Memory): string {
        return memory.id ?? `${memory.npcId}:${memory.timestamp}:${memory.tags.join('.')}:${memory.content.length}`;
    }

    private toMemoryEvent(memory: Memory, index: number): MemoryEvent {
        const sortedTags = [...memory.tags].map(String).sort();
        return {
            id: memory.id ?? `${memory.npcId}:memory:${memory.timestamp}:${index}`,
            npcId: memory.npcId,
            tags: sortedTags,
            timestamp: memory.timestamp,
            content: memory.content,
            kind: sortedTags[0] ?? 'memory',
            data: {
                importance: memory.importance,
                persistent: memory.persistent,
            },
        };
    }
}
