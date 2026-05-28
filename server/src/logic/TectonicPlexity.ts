import { PlexityLogic } from './PlexityLogic.js';

/**
 * Tectonic Plexity
 * Translates tectonic logic into visual Havok intensity parameters.
 */
export class TectonicPlexity {
    /**
     * Calculates how "complex" the tectonic visual deformation should be.
     */
    static calculateHavokIntensity(baseMagnitude: number, zoneStringId: string): number {
        const basePlexity = PlexityLogic.calculateComplexity(zoneStringId);

        // Use string properties for deterministic logic modifiers
        const stringMultiplier = zoneStringId.includes('FAULT_LINE') ? 1.5 : 1.0;

        const finalIntensity = basePlexity * baseMagnitude * stringMultiplier;

        return Math.min(Math.max(finalIntensity, 0), 1.0);
    }
}
