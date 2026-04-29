export interface Legend {
    id: string;
    title: string;
    description: string;
    legendSpread: number;
    resonanceFactor: number;
    originEra: string;
}

export interface PlotPoint {
    id: string;
    originLegendId: string;
    title: string;
    narrativeImpact: number;
    priority: number;
    isKeyMoment: boolean;
    distillationDate: number;
}

export class WorldHistoryEngine {
    private readonly PRIORITY_THRESHOLD = 0.75;

    public distillToPlotPoint(legend: Legend): PlotPoint {
        const narrativeImpact = this.calculateNarrativeImpact(legend.legendSpread, legend.resonanceFactor);
        const priority = this.calculatePriority(legend.legendSpread, legend.resonanceFactor);

        return {
            id: `plot_${legend.id}_${Math.random().toString(36).substr(2, 9)}`,
            originLegendId: legend.id,
            title: `The Manifestation of ${legend.title}`,
            narrativeImpact,
            priority,
            isKeyMoment: priority > this.PRIORITY_THRESHOLD,
            distillationDate: Date.now()
        };
    }

    public distillCollection(legends: Legend[]): PlotPoint[] {
        return legends
            .map(legend => this.distillToPlotPoint(legend))
            .sort((a, b) => b.priority - a.priority);
    }

    private calculateNarrativeImpact(spread: number, resonance: number): number {
        return (spread * 0.4) + (resonance * 0.6);
    }

    private calculatePriority(spread: number, resonance: number): number {
        const basePriority = spread * resonance;
        const normalizedResonance = Math.pow(resonance, 1.5);
        return Math.min(1.0, (basePriority * 0.7) + (normalizedResonance * 0.3));
    }
}