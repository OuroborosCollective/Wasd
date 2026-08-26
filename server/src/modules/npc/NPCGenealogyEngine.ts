import { SeededARERng, createARESeed, stableHash32, type ARERng } from "../../core/determinism/AREDeterminism.js";
import type { LineageStats } from './FamilyHouseRegistry.js';

/**
 * NPCGenealogyEngine - Legacy interface with deterministic implementation
 * 
 * This module now wraps the FamilyHouseRegistry system to provide
 * deterministic NPC genealogy with full ARE compatibility.
 * 
 * Key changes for ARE compliance:
 * - Uses deterministic SeededARERng with createARESeed
 * - Stats are derived from lineageHash, not random values
 * - Inheritance follows the FamilyHouseRegistry truth path
 */

export type NPCStats = LineageStats;

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

    /**
     * Generate initial stats deterministically from seed.
     * Uses ARE-compliant seeding for deterministic reproduction.
     */
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

    /**
     * Inherit stats deterministically from parents.
     * Same parent stats + same seed = same child stats.
     */
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

    /**
     * Create NPC node with lineage tracking.
     */
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

    /**
     * Generate deterministic stats from lineage hash.
     * Provides deterministic stat generation for ARE compliance.
     */
    public generateStatsFromLineageHash(lineageHash: string): NPCStats {
        const seed = stableHash32(createARESeed(['lineage-stats', lineageHash]));
        const rng = new SeededARERng(seed);
        return {
            strength: this.rollBaseStat(rng),
            agility: this.rollBaseStat(rng),
            intelligence: this.rollBaseStat(rng),
            stamina: this.rollBaseStat(rng),
            charisma: this.rollBaseStat(rng),
            luck: this.rollBaseStat(rng)
        };
    }

    private rollBaseStat(rng: ARERng): number {
        return rng.nextInt(10) + 10;
    }

    private rngFor(label: string, ...parts: unknown[]): ARERng {
        return new SeededARERng(createARESeed(["npc-genealogy", label, ...parts]));
    }

    /**
     * Calculate genetic similarity deterministically.
     */
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
