import { PlexityEngine } from '../shared/PlexityEngine.js';

export class CascadePlexity {
    calculateCascadePlexity(entity: any, cascadeActive: boolean): number {
        const basePlexity = PlexityEngine.calculatePlexity(entity);

        if (cascadeActive) {
            // Invert the threat level during a cascade
            return Math.max(0, 1.0 - basePlexity);
        }

        return basePlexity;
    }
}
