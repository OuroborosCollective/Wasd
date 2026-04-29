export interface NPCTraits {
    courage: number;
    curiosity: number;
    aggression: number;
}

export type MemoryEventType = 'perception' | 'interaction' | 'internal' | 'environment';

export interface MemoryEvent {
    id: string;
    timestamp: number;
    type: MemoryEventType;
    description: string;
    importance: number;
    metadata: Record<string, string | number | boolean | null | undefined | object>;
}

export interface NPCProfile {
    id: string;
    name: string;
    traits: NPCTraits;
    lastUpdated: number;
}

export interface MemoryCacheEntry {
    npcId: string;
    events: MemoryEvent[];
    summary?: string;
}