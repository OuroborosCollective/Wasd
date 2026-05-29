import { PlexityEngine } from '../shared/PlexityEngine.js';

export class TectonicPlexity {
    calculateTectonicPlexity(entity: any, stabilityModifier: number): number {
        // Base plexity of the entity
        const basePlexity = PlexityEngine.calculatePlexity(entity);

        // Translates quake active state into a stability modifier
        // Lower stability (e.g., 0.2 during a quake) could mean less stability in Havok/Babylon physics,
        // leading to higher complexity for physics calculation to simulate shaking.
        // We invert the stability modifier to represent physics intensity.
        const shakingIntensity = 1.0 - stabilityModifier;
        const modifiedPlexity = basePlexity + (shakingIntensity * 0.5);

        return Math.min(Math.max(modifiedPlexity, 0), 1.0);
    }
}
