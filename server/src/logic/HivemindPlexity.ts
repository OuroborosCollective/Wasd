import { PlexityEngine } from '../shared/PlexityEngine.js';

export class HivemindPlexity {
    calculateSwarmPlexity(entities: any[]): number {
        if (!entities || entities.length === 0) return 0;

        let totalBasePlexity = 0;
        for (const entity of entities) {
            totalBasePlexity += PlexityEngine.calculatePlexity(entity);
        }

        const swarmMultiplier = 1.0 + (entities.length * 0.1);
        const finalPlexity = totalBasePlexity * swarmMultiplier;

        return Math.min(finalPlexity, 1.0);
    }
}
