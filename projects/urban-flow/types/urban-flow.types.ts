export type ChunkKey = `${number},${number}`;

export interface FlowResonanceData {
    flow_intensity: number;
}

export interface TrafficEntity {
    id: string;
    position: {
        x: number;
        y: number;
    };
    velocity: {
        x: number;
        y: number;
    };
    mass: number;
    resonance: FlowResonanceData;
    lastUpdate: number;
}