export type UUID = string;
export type Timestamp = number;

export enum InputCommand {
    MOVE = "MOVE",
    ACTION = "ACTION",
    EVOLVE = "EVOLVE",
    RESEARCH = "RESEARCH",
    CONSTRUCT = "CONSTRUCT",
    SYNC = "SYNC"
}

export interface InputEntry<T = any> {
    id: UUID;
    command: InputCommand;
    payload: T;
    timestamp: Timestamp;
    origin: "ARELORIA" | "SCIENCE_PORTAL";
    priority: number;
}

export interface InputStack {
    entries: InputEntry[];
    lastProcessedId: UUID | null;
    pendingCount: number;
}

export interface Vector3D {
    x: number;
    y: number;
    z: number;
}

export interface EntityState {
    position: Vector3D;
    velocity: Vector3D;
    rotation: Vector3D;
    acceleration: Vector3D;
    mass: number;
}

export enum EvolutionPath {
    BIOLOGICAL = "BIOLOGICAL",
    SYNTHETIC = "SYNTHETIC",
    PSIONIC = "PSIONIC",
    DIMENSIONAL = "DIMENSIONAL"
}

export interface EvolutionTrait {
    id: string;
    level: number;
    modifier: number;
    requirements: string[];
}

export interface FactionEvolutionMetadata {
    factionId: UUID;
    path: EvolutionPath;
    techLevel: number;
    geneticStability: number;
    activeTraits: EvolutionTrait[];
    evolutionPoints: number;
    lastMutationTimestamp: Timestamp;
}

export interface AREState {
    tick: number;
    entities: Record<UUID, EntityState>;
    factions: Record<UUID, FactionEvolutionMetadata>;
    inputStack: InputStack;
    checksum: string;
}

export interface ARESystemResponse {
    success: boolean;
    stateUpdate: Partial<AREState>;
    error?: string;
}