export enum FactionState {
    IDLE = 'IDLE',
    EXPANDING = 'EXPANDING',
    CONSOLIDATING = 'CONSOLIDATING',
    AGGRESSIVE = 'AGGRESSIVE',
    DECLINING = 'DECLINING',
    EXTINCT = 'EXTINCT'
}

export type Vector3D = {
    x: number;
    y: number;
    z: number;
};

export type AutonomousTrigger = {
    id: string;
    condition: 'RESOURCE_THRESHOLD' | 'POPULATION_DENSITY' | 'THREAT_LEVEL' | 'TERRITORIAL_GAP';
    threshold: number;
    action: 'COLONIZE' | 'REINFORCE' | 'ATTACK' | 'WITHDRAW';
    priority: number;
};

export interface IFactionEvolution {
    factionId: string;
    state: FactionState;
    currentPosition: Vector3D;
    influenceRadius: number;
    growthRate: number;
    resourceStockpile: Record<string, number>;
    activeTriggers: AutonomousTrigger[];
    history: {
        timestamp: number;
        state: FactionState;
        coordinates: Vector3D;
    }[];
    lastUpdate: number;
}