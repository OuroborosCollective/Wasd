import { HeuristicWorldBrain, BrainNode } from './HeuristicWorldBrain.js';

/**
 * Aetheric Storm Brain
 * Makes logical decisions based on Aetheric Load (Server Stress).
 */
export class AethericStormBrain {
    constructor(private worldBrain: HeuristicWorldBrain) {}

    /**
     * Determines the effect of current Aetheric pressure on magic casting cost.
     */
    evaluateAethericCostModifier(pressureIndex: number): number {
        const nodes: BrainNode[] = (this.worldBrain as any).nodes;
        if (!nodes) return 1.0;

        const stability = nodes.find(n => n.id === 'world_instability');
        const stabilityFactor = stability ? stability.value : 0;

        // Logical transformation: Higher server lag (pressure) + world instability = Huge magic cost
        if (pressureIndex > 100 && stabilityFactor > 0.5) {
            return 3.0; // 300% cost during heavy aetheric storms
        } else if (pressureIndex > 50) {
            return 1.5;
        }

        return 1.0;
    }
}
