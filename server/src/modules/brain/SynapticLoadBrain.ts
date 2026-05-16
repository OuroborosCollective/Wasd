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
    shouldSkipAITick(entityDistance: number, tick = 0, entityId = "entity"): boolean {
        if (this.timeDilationFactor <= 1.0) {
            return false; // No overload, process everything
        }

        // The more overloaded we are, and the further the entity, the higher chance to skip.
        // Deterministic cadence replaces process-local randomness.
        const skipThreshold = 100 / this.timeDilationFactor;

        if (entityDistance > skipThreshold) {
            const skipChance = Math.min(0.9, (this.timeDilationFactor - 1) * 0.5);
            const cadence = Math.max(2, Math.round(1 / Math.max(0.01, skipChance)));
            const hash = this.hashEntity(entityId);
            return ((Math.floor(tick) + hash) % cadence) !== 0;
        }

        return false; // Close enough to process anyway
    }

    resetDilation() {
        this.timeDilationFactor = 1.0;
    }

    private hashEntity(entityId: string): number {
        let hash = 0;
        for (let i = 0; i < entityId.length; i += 1) {
            hash = (hash * 31 + entityId.charCodeAt(i)) >>> 0;
        }
        return hash;
    }
}
