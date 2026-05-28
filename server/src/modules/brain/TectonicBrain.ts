import { HeuristicWorldBrain, BrainNode } from './HeuristicWorldBrain.js';

/**
 * Tectonic Brain
 * Evaluates world state logically to determine when Tectonic Shifts should occur.
 */
export class TectonicBrain {
    constructor(private worldBrain: HeuristicWorldBrain) {}

    /**
     * Determines the magnitude of the next shift using deterministic logical conditions.
     */
    calculateShiftMagnitude(): number {
        const nodes: BrainNode[] = (this.worldBrain as any).nodes;
        if (!nodes) return 0.0;

        const instabilityNode = nodes.find(n => n.id === 'world_instability');
        const populationDensity = nodes.find(n => n.id === 'population_density');

        const instabilityValue = instabilityNode ? instabilityNode.value : 0;
        const densityValue = populationDensity ? populationDensity.value : 0;

        // Logical intersection of purely numeric nodes
        if (instabilityValue > 0.7 && densityValue > 0.8) {
            return 0.9; // Massive shift
        }

        if (instabilityValue > 0.5 || densityValue > 0.9) {
            return 0.4; // Minor tremor
        }

        return 0.0; // Stable
    }
}
