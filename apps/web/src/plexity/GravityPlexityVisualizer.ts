import { PlexityGate, type FeatureSet } from './PlexityGate';

export class GravityPlexityVisualizer {
    private gate: PlexityGate;

    constructor() {
        this.gate = PlexityGate.getInstance();
    }

    /**
     * Adapts the client-side visual rendering strategy when entering a Gravity Flux Zone.
     * Engages specific post-processing, adjusts particle behavior, and modifies LOD
     * based on the local gravity modifier to simulate the anomaly visually.
     */
    public adaptToGravityFlux(inFluxZone: boolean, gravityModifier: number): FeatureSet {
        const currentFeatures = { ...this.gate.getFeatures() };

        if (!inFluxZone || gravityModifier === 1.0) {
            return currentFeatures; // Normal operation
        }

        console.log(`[Plexity Gravity Flux] Entering Flux Zone (Modifier: ${gravityModifier.toFixed(2)}). Adjusting visual payload.`);

        // Adjust visuals based on modifier
        if (gravityModifier < 1.0) {
            // Low gravity: floaty, ethereal, particles rise slower/higher
            // Use organic fire or specific shaders from PlasmaOuroboros integration
            currentFeatures.shaders = 'ethereal_flux';
            currentFeatures.postProcessing = true;

            // Adjust particles: more budget for low gravity "dust"
            if (currentFeatures.particleBudget > 0) {
               currentFeatures.particleBudget = Math.min(1000, currentFeatures.particleBudget * 1.5);
            }

            // LOD modifier adjustments - might want higher detail nearby to see the floating dust
            currentFeatures.lodDistanceModifier = Math.min(1.0, currentFeatures.lodDistanceModifier * 1.2);

            // Might disable IK in extreme low grav as characters float/ragdoll
            if (gravityModifier < 0.3) {
                 currentFeatures.enableIK = false;
            }

        } else if (gravityModifier > 1.0) {
            // High gravity: heavy, dark, crushed particles
            currentFeatures.shaders = 'heavy_flux';
            currentFeatures.postProcessing = true;

            // Reduce particles to simulate things being crushed to ground
            currentFeatures.particleBudget = Math.floor(currentFeatures.particleBudget * 0.2);
        }

        return currentFeatures;
    }
}
