export interface IndustrialEntity {
    id: string;
    logicalIndex: number;
    kappaPos: number;
    resonance: number;
    lastUpdate: number;
}

export type PersistenceDriver = 'file' | 'memory';