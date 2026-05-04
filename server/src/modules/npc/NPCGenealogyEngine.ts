// @ts-nocheck
export interface NPCStats {
    strength: number;
    agility: number;
    intelligence: number;
    stamina: number;
    charisma: number;
    luck: number;
}

export interface NPCGenealogyNode {
    id: string;
    generation: number;
    stats: NPCStats;
    parents: string[];
    traits: string[];
    lineageId: string;
}

export class NPCGenealogyEngine {
    private mutationRate: number;
    private deviationFactor: number;

    constructor(mutationRate: number = 0.1, deviationFactor: number = 0.05) {
        this.mutationRate = mutationRate;
        this.deviationFactor = deviationFactor;
    }

    public generateInitialStats(): NPCStats {
        return {
            strength: this.rollBaseStat(),
            agility: this.rollBaseStat(),
            intelligence: this.rollBaseStat(),
            stamina: this.rollBaseStat(),
            charisma: this.rollBaseStat(),
            luck: this.rollBaseStat()
        };
    }

    public inheritStats(parentA: NPCStats, parentB: NPCStats): NPCStats {
        const childStats: Partial<NPCStats> = {};
        const keys = Object.keys(parentA) as (keyof NPCStats)[];

        for (const key of keys) {
            const mean = (parentA[key] + parentB[key]) / 2;
            const variance = mean * this.deviationFactor;
            let value = mean + (Math.random() * 2 - 1) * variance;

            if (Math.random() < this.mutationRate) {
                const mutationAmount = (Math.random() * 2 - 1) * (mean * 0.2);
                value += mutationAmount;
            }

            childStats[key] = Math.max(1, Math.round(value));
        }

        return childStats as NPCStats;
    }

    public createNPCNode(
        id: string, 
        stats: NPCStats, 
        generation: number, 
        parents: string[] = [], 
        lineageId: string = ""
    ): NPCGenealogyNode {
        return {
            id,
            generation,
            stats,
            parents,
            traits: [],
            lineageId: lineageId || id
        };
    }

    private rollBaseStat(): number {
        return Math.floor(Math.random() * 10) + 10;
    }

    public calculateGeneticSimilarity(statsA: NPCStats, statsB: NPCStats): number {
        const keys = Object.keys(statsA) as (keyof NPCStats)[];
        let diffSum = 0;
        let totalValue = 0;

        for (const key of keys) {
            diffSum += Math.abs(statsA[key] - statsB[key]);
            totalValue += (statsA[key] + statsB[key]) / 2;
        }

        return 1 - (diffSum / totalValue);
    }
}