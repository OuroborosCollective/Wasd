import { PlexityEngine } from '../shared/PlexityEngine.js';

export class SoulWeaverPlexity {
    calculateSoulLinkPlexity(entity: any, activeLinksCount: number, resonanceLevel: string): number {
        // Base plexity of the entity
        const basePlexity = PlexityEngine.calculatePlexity(entity);

        // Increase visual complexity for heavily linked entities
        let linkModifier = 0.0;
        if (resonanceLevel === 'PERFECT_RESONANCE') {
            linkModifier = 0.5 * activeLinksCount;
        } else if (resonanceLevel === 'HARMONIC_LINK') {
            linkModifier = 0.2 * activeLinksCount;
        } else {
            linkModifier = 0.05 * activeLinksCount;
        }

        const modifiedPlexity = basePlexity * (1.0 + linkModifier);

        // Cap at 1.0 (assuming normalized plexity)
        return Math.min(Math.max(modifiedPlexity, 0), 1.0);
    }
}
