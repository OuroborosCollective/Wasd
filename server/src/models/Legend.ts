// @ts-nocheck
export interface Legend {
    id: string;
    title: string;
    description: string;
    intensity: number;
    sourceQuestId: string;
    timestamp: number;
}

export class LegendStore {
    private legends: Map<string, Legend> = new Map();

    public addLegend(legend: Legend): void {
        this.legends.set(legend.id, legend);
    }

    public getLegend(id: string): Legend | undefined {
        return this.legends.get(id);
    }

    public getAllLegends(): Legend[] {
        return Array.from(this.legends.values());
    }

    public removeLegend(id: string): boolean {
        return this.legends.delete(id);
    }

    public updateLegend(id: string, updates: Partial<Legend>): void {
        const existing = this.legends.get(id);
        if (existing) {
            this.legends.set(id, { ...existing, ...updates });
        }
    }

    public clear(): void {
        this.legends.clear();
    }
}

export const legendStore = new LegendStore();