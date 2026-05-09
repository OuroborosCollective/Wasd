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
export const INTERACT_DISTANCE = 5;
export const getClosestNpc = (a: any, b: any) => null;
export const getClosestInteractable = (a: any, b: any) => null;
export interface InteractWorldSnapshot {}
export interface ClosestInteractable { id: string; }
export interface InteractNpcSnapshot {}
export interface InteractLootSnapshot {}
export interface InteractPoint {}
export interface EntityTransformUpdate {
    id: string;
    position: { x: number; y: number; z: number };
    rotation: { x: number; y: number; z: number };
    sequenceId: number;
    status: string;
    cpuCost: number;
    health: number;
}
