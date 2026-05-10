export class SynapticLoadBrain {
    private timeDilationFactor: number = 1.0;

    constructor() {}

    /**
     * Intercepts "SYNAPTIC_OVERLOAD" and calculates the time dilation factor.
     */
    handleSynapticOverload(overloadFactor: number): void {
        // Increase time dilation factor based on overload.
        // e.g. 50ms (threshold) / 50ms = 1x. 100ms / 50ms = 2x.
        this.timeDilationFactor = Math.max(1.0, overloadFactor);
        console.log(`[SynapticLoadBrain] Time dilation applied: ${this.timeDilationFactor.toFixed(2)}x`);
    }

    /**
     * Determines if a non-critical AI task (like pathfinding for a distant entity)
     * should be skipped in the current tick.
     */
    shouldSkipAITick(entityDistance: number): boolean {
        if (this.timeDilationFactor <= 1.0) {
            return false; // No overload, process everything
        }

        // The more overloaded we are, and the further the entity, the higher chance to skip.
        // Using a basic heuristic where distance > 100 * (1/dilation) gets skipped more often.
        const skipThreshold = 100 / this.timeDilationFactor;

        if (entityDistance > skipThreshold) {
            // Chance to skip increases with overload
            const skipChance = Math.min(0.9, (this.timeDilationFactor - 1) * 0.5);
            return Math.random() < skipChance;
        }

        return false; // Close enough to process anyway
    }

    resetDilation() {
        this.timeDilationFactor = 1.0;
    }
}
