import { PlexityEngine } from '../shared/PlexityEngine.js';

export class AetherStormPlexity {
    calculateMagicProjectilePlexity(entity: any, stormState: string): number {
        // Base plexity of the entity (magic projectile in this case)
        const basePlexity = PlexityEngine.calculatePlexity(entity);

        // Alters the baseline Plexity multiplier when an AetherStorm is active,
        // causing magic projectiles to render with higher or chaotic plexity.
        let stormModifier = 0.0;

        if (stormState === 'CHAOTIC_DISRUPTION') {
            stormModifier = 0.6; // High chaotic visual rendering complexity
        } else if (stormState === 'MODERATE_DISRUPTION') {
            stormModifier = 0.25;
        }

        const modifiedPlexity = basePlexity * (1.0 + stormModifier);

        return Math.min(Math.max(modifiedPlexity, 0), 1.0);
    }
}
