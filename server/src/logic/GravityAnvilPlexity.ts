import { PlexityEngine } from '../shared/PlexityEngine.js';

export class GravityAnvilPlexity {
    calculateGravityAnvilPlexity(entity: any, timeDilation: number): number {
        // Base plexity of the entity
        const basePlexity = PlexityEngine.calculatePlexity(entity);

        // Slowed time inversely affects plexity to represent heavier collision and physics processing
        // The slower the time, the higher the perceived complexity of interactions
        const anvilPlexity = basePlexity / timeDilation;

        return Math.min(Math.max(anvilPlexity, 0), 1.0);
    }
}
