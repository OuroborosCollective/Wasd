import { PlexityEngine } from '../shared/PlexityEngine.js';

export class ChronoPlexity {
    calculateChronoPlexity(entity: any, dilationFactor: number): number {
        const basePlexity = PlexityEngine.calculatePlexity(entity);
        const dilatedPlexity = basePlexity * dilationFactor;

        return Math.min(Math.max(dilatedPlexity, 0), 1.0);
    }
}
