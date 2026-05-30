import { PlexityEngine } from '../shared/PlexityEngine.js';

export class AbyssalForgePlexity {
    calculateAbyssalGearPlexity(entity: any, gearState: string): number {
        // Base plexity of the entity
        const basePlexity = PlexityEngine.calculatePlexity(entity);

        // Increases rendering complexity and particle logic plexity
        // when abyssal gear is actively radiating void energy.
        let voidEnergyModifier = 0.0;

        if (gearState === 'RADIATING_VOID') {
            voidEnergyModifier = 0.8; // Heavy increase in visual plexity (particles, aura)
        } else if (gearState === 'DORMANT_VOID') {
            voidEnergyModifier = 0.1;
        }

        const modifiedPlexity = basePlexity * (1.0 + voidEnergyModifier);

        return Math.min(Math.max(modifiedPlexity, 0), 1.0);
    }
}
