export interface AREPayload {
    timestamp: number;
    tick: number;
    resonance: number;
    data: any;
}
export interface Entity {
    id: string;
    type: string;
    position: { x: number; y: number; z: number };
    health?: number;
    maxHealth?: number;
    visible?: boolean;
    sequenceId?: number;
    status?: string;
    cpuCost?: number;
    priority?: number;
    lastUpdateFrame?: number;
}
export type EntityNet = Entity;
export interface QuestStateNet { id: string; status: string; }
export interface LootNet { id: string; type: string; }
export interface WorldState {
    entities: Entity[];
    tick: number;
}
