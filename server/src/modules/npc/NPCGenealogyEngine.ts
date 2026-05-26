import { SeededARERng, createARESeed, type ARERng } from "../../core/determinism/AREDeterminism.js";

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

    public generateInitialStats(seed: string | number = "initial"): NPCStats {
        const rng = this.rngFor("initial-stats", seed);
        return {
            strength: this.rollBaseStat(rng),
            agility: this.rollBaseStat(rng),
            intelligence: this.rollBaseStat(rng),
            stamina: this.rollBaseStat(rng),
            charisma: this.rollBaseStat(rng),
            luck: this.rollBaseStat(rng)
        };
    }

    public inheritStats(parentA: NPCStats, parentB: NPCStats, seed: string | number = "inherit"): NPCStats {
        const childStats: Partial<NPCStats> = {};
        const keys = Object.keys(parentA) as (keyof NPCStats)[];
        const rng = this.rngFor("inherit-stats", seed, parentA, parentB);

        for (const key of keys) {
            const mean = (parentA[key] + parentB[key]) / 2;
            const variance = mean * this.deviationFactor;
            let value = mean + (rng.nextFloat() * 2 - 1) * variance;

            if (rng.nextFloat() < this.mutationRate) {
                const mutationAmount = (rng.nextFloat() * 2 - 1) * (mean * 0.2);
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

    private rollBaseStat(rng: ARERng): number {
        return rng.nextInt(10) + 10;
    }

    private rngFor(label: string, ...parts: unknown[]): ARERng {
        return new SeededARERng(createARESeed(["npc-genealogy", label, ...parts]));
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
