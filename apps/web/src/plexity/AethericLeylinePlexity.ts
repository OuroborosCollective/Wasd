import { DeviceProfile } from './PlexityGate';

/**
 * AethericLeylinePlexity: Dynamic Resource Network Visuals
 * Client-side stateless scaling of the leyline shader's visual complexity
 * based on the device's Plexity profile.
 */
export class AethericLeylinePlexity {
    public static getVisualSettings(profile: DeviceProfile | null) {
        if (!profile) {
            return {
                particleCount: 10,
                glowIntensity: 0.5,
                shaderComplexity: 'basic'
            };
        }

        switch (profile.tier) {
            case 'Ultra':
                return {
                    particleCount: 500,
                    glowIntensity: 2.0,
                    shaderComplexity: 'cinematic',
                    enableVolumetrics: true
                };
            case 'Performance':
                return {
                    particleCount: 200,
                    glowIntensity: 1.5,
                    shaderComplexity: 'advanced',
                    enableVolumetrics: false
                };
            case 'Standard':
                return {
                    particleCount: 50,
                    glowIntensity: 1.0,
                    shaderComplexity: 'standard',
                    enableVolumetrics: false
                };
            case 'Legacy':
            default:
                return {
                    particleCount: 10,
                    glowIntensity: 0.5,
                    shaderComplexity: 'basic',
                    enableVolumetrics: false
                };
        }
    }

    /**
     * Stateless deterministic visual pulse calculation based on global time
     * Avoids querying the server for animation state.
     */
    public static calculateStatelessPulse(globalTime: number, baseEnergy: number): number {
        // Sine wave based pulse without random factors to guarantee determinism across clients
        return baseEnergy + Math.sin(globalTime * 0.005) * 0.2;
    }
}
