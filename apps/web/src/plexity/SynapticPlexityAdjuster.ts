import { DeviceProfile, FeatureSet } from './PlexityGate.js';

/**
 * SynapticPlexityAdjuster: Client-side response to server "SYNAPTIC_OVERLOAD".
 * Strips demanding rendering features on lower-tier devices to preserve
 * client stability when the server starts time-slicing logic.
 */
export class SynapticPlexityAdjuster {

    /**
     * Adjusts the feature set based on the device profile and the severity of the server overload.
     */
    static adjustFeaturesForOverload(
        profile: DeviceProfile,
        currentFeatures: FeatureSet,
        overloadFactor: number
    ): FeatureSet {

        // Clone features to avoid mutating the original directly
        const adjustedFeatures: FeatureSet = { ...currentFeatures };

        if (overloadFactor <= 1.0) {
            return adjustedFeatures; // No overload
        }

        // Severe overload (e.g. server taking 2x longer to tick)
        const isSevereOverload = overloadFactor > 2.0;

        switch (profile.tier) {
            case 'Legacy':
                // Legacy devices are already stripped down, but we can lower FPS target further
                adjustedFeatures.targetFPS = isSevereOverload ? 15 : 20;
                adjustedFeatures.particleBudget = Math.max(0, adjustedFeatures.particleBudget - 100);
                break;

            case 'Standard':
                // Disable IK and reduce particles drastically
                adjustedFeatures.enableIK = false;
                adjustedFeatures.particleBudget = Math.floor(adjustedFeatures.particleBudget * 0.5);
                adjustedFeatures.shadowRes = isSevereOverload ? 0 : 512;
                adjustedFeatures.postProcessing = false;
                break;

            case 'Performance':
                // Reduce shadows and particles to give breathing room
                adjustedFeatures.particleBudget = Math.floor(adjustedFeatures.particleBudget * 0.75);
                adjustedFeatures.shadowRes = isSevereOverload ? 1024 : 2048;
                if (isSevereOverload) {
                   adjustedFeatures.enableIK = false;
                }
                break;

            case 'Ultra':
                // Ultra devices can usually handle it, but we still trim a little to be safe during severe spikes
                if (isSevereOverload) {
                    adjustedFeatures.particleBudget = Math.floor(adjustedFeatures.particleBudget * 0.9);
                }
                break;
        }

        console.log(`[SynapticPlexityAdjuster] Features adjusted for ${profile.tier} tier due to server overload.`);
        return adjustedFeatures;
    }
}
