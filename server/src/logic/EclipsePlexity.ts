import { PlexityEngine } from '../shared/PlexityEngine.js';

export class EclipsePlexity {
    calculateEclipsePlexity(entity: any, shadowModifier: number): number {
        // Base plexity of the entity
        const basePlexity = PlexityEngine.calculatePlexity(entity);

        // Multiplies visual shadow/darkness plexity during an eclipse.
        // Higher shadow modifiers decrease visible complexity but might increase hidden entity complexity.
        // E.g., stealth units become more "complex" to detect.
        const darknessIntensity = shadowModifier;
        const modifiedPlexity = basePlexity * (1.0 + darknessIntensity * 0.3); // Minor bump in overall plexity due to shadow processing

        return Math.min(Math.max(modifiedPlexity, 0), 1.0);
    }
}
