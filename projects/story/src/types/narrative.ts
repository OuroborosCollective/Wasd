export interface LegendData {
    coreEvent: string;
    legendSpread: number;
}

export interface PlotPoint {
    id: string;
    weight: number;
    priority: number;
    metadata?: Record<string, any>;
}

export interface ResonanceFactor {
    coefficient: number;
    decay: number;
    amplitude: number;
    statisticalWeight: number;
}

export interface NarrativeConfiguration {
    legends: LegendData[];
    plotPoints: PlotPoint[];
    resonance: ResonanceFactor;
}