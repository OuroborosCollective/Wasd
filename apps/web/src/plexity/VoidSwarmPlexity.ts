import { DeviceProfile } from './PlexityGate';

/**
 * VoidSwarmPlexity: Emergent PvE Macro-event Visuals
 * Dynamically adjusts swarm rendering (LOD, instance counts, shaders)
 * according to the client's DeviceProfile to maintain FPS.
 */
export class VoidSwarmPlexity {
    public static getSwarmVisualSettings(profile: DeviceProfile | null, baseIntensity: number) {
        if (!profile) {
            return {
                instanceCount: 10 * baseIntensity,
                useInstancedMesh: false,
                shaderComplexity: 'basic',
                shadowsEnabled: false
            };
        }

        switch (profile.tier) {
            case 'Ultra':
                return {
                    // Maximum swarm visual terror
                    instanceCount: 500 * baseIntensity,
                    useInstancedMesh: true,
                    shaderComplexity: 'cinematic',
                    shadowsEnabled: true,
                    lodDistance: 2000
                };
            case 'Performance':
                return {
                    instanceCount: 200 * baseIntensity,
                    useInstancedMesh: true,
                    shaderComplexity: 'advanced',
                    shadowsEnabled: true,
                    lodDistance: 1000
                };
            case 'Standard':
                return {
                    instanceCount: 50 * baseIntensity,
                    useInstancedMesh: true,
                    shaderComplexity: 'standard',
                    shadowsEnabled: false,
                    lodDistance: 500
                };
            case 'Legacy':
            default:
                return {
                    // Heavily culled for low-end devices, representing swarm via a single merged blob
                    instanceCount: 10 * baseIntensity,
                    useInstancedMesh: false,
                    shaderComplexity: 'basic',
                    shadowsEnabled: false,
                    lodDistance: 200
                };
        }
    }

    /**
     * Stateless deterministic swarm pulsation calculated client-side
     */
    public static calculateSwarmPulse(globalTime: number): number {
        // Use combination of sine waves for irregular, organic-feeling but deterministic pulse
        const fastPulse = Math.sin(globalTime * 0.05);
        const slowPulse = Math.cos(globalTime * 0.005);
        return 1.0 + (fastPulse * 0.1) + (slowPulse * 0.2);
    }
}
