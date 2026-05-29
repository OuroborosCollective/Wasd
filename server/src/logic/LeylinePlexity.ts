import { PlexityEngine } from '../shared/PlexityEngine.js';

export class LeylinePlexity {
    calculateLeylinePlexity(entity: any, surgeIntensity: number): number {
        // Base plexity of the entity
        const basePlexity = PlexityEngine.calculatePlexity(entity);

        // Translates the surge cascade state into a physics intensity multiplier for Havok/Babylon
        // Higher surge intensity increases the plexity (e.g., more visual particle effects or Havok interactions)
        const amplifiedPlexity = basePlexity * surgeIntensity;

        // Ensure plexity is bounded
        return Math.min(Math.max(amplifiedPlexity, 0), 1.0);
    }
}
