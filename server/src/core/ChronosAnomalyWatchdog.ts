import { ChronosAnomalyBrain, AnomalyZone } from '../modules/brain/ChronosAnomalyBrain.js';

/**
 * ChronosAnomalyWatchdog: Time Dilation System
 * Deterministically enforces time dilation multipliers on player/NPC actions during the world tick.
 */
export class ChronosAnomalyWatchdog {
    private brain: ChronosAnomalyBrain;

    constructor(brain: ChronosAnomalyBrain) {
        this.brain = brain;
    }

    /**
     * Called in the 10Hz hot path to adjust entity action speeds.
     */
    public applyTimeDilation(entities: any[]) {
        const anomalies = this.brain.getActiveAnomalies();

        if (anomalies.length === 0) return;

        // 10Hz Hot Path - Avoid allocations, use squared distance
        for (let i = 0; i < entities.length; i++) {
            const entity = entities[i];
            if (!entity || !entity.position) continue;

            let currentMultiplier = 1.0;

            for (let j = 0; j < anomalies.length; j++) {
                const anomaly = anomalies[j];
                const dx = entity.position.x - anomaly.x;
                const dy = entity.position.y - anomaly.y;
                const distSq = dx * dx + dy * dy;

                if (distSq < anomaly.radiusSq) {
                    currentMultiplier = anomaly.dilationMultiplier;
                    break; // Entities only affected by one anomaly at a time for simplicity
                }
            }

            this.enforceDilation(entity, currentMultiplier);
        }
    }

    private enforceDilation(entity: any, multiplier: number) {
        // Deterministically adjust cooldowns or speed in the entity's state
        if (entity.state) {
            entity.state.timeDilation = multiplier;
        }
    }
}
