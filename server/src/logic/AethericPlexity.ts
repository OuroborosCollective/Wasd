import { PlexityLogic } from './PlexityLogic.js';

/**
 * Aetheric Plexity
 * Translates server load (pressure index) into visual Babylon.js storm effects.
 */
export class AethericPlexity {
    /**
     * Calculates the visual particle density based purely on server stress logic.
     */
    static calculateStormVisualDensity(pressureIndex: number, regionId: string): number {
        const basePlexity = PlexityLogic.calculateComplexity(regionId);

        // Normalize pressure logic (assuming ~200 is severe lag)
        const normalizedPressure = Math.min(pressureIndex / 200, 1.0);

        // Plexity formula combining string complexity and numeric pressure
        const visualDensity = basePlexity * normalizedPressure;

        return Math.min(visualDensity, 1.0);
    }
}
