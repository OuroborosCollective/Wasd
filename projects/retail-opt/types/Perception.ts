export interface Position {
    x: number;
    y: number;
}

export interface EchoBeacon {
    id: string;
    position: Position;
    intensity: number;
    duration: number;
    timestamp: number;
}

export interface HeatmapPoint extends Position {
    weight: number;
}

export type AttentionVector = {
    from: Position;
    to: Position;
    velocity: number;
    dwellTime: number;
};

export type BuyerAttentionFlow = {
    customerId: string;
    sequence: EchoBeacon[];
    vectors: AttentionVector[];
    heatMap: HeatmapPoint[];
    startTime: number;
    endTime: number;
};

export type PerceptionAnalysis = {
    aggregateHeatmap: HeatmapPoint[];
    activeBeacons: EchoBeacon[];
    flowRate: number;
};