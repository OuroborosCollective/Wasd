import { DeviceProfile } from './PlexityGate';

/**
 * ChronosAnomalyPlexity: Time Dilation Visuals
 * Manages stateless visual distortions without querying the server for animation state.
 */
export class ChronosAnomalyPlexity {
    public static getVisualDistortionSettings(profile: DeviceProfile | null) {
        if (!profile) {
            return {
                chromaticAberration: 0.0,
                desaturation: 0.2,
                enableHeatHaze: false
            };
        }

        switch (profile.tier) {
            case 'Ultra':
                return {
                    chromaticAberration: 0.05,
                    desaturation: 0.8,
                    enableHeatHaze: true,
                    hazeResolution: 1.0
                };
            case 'Performance':
                return {
                    chromaticAberration: 0.03,
                    desaturation: 0.6,
                    enableHeatHaze: true,
                    hazeResolution: 0.5
                };
            case 'Standard':
                return {
                    chromaticAberration: 0.01,
                    desaturation: 0.4,
                    enableHeatHaze: false
                };
            case 'Legacy':
            default:
                return {
                    chromaticAberration: 0.0,
                    desaturation: 0.2,
                    enableHeatHaze: false
                };
        }
    }

    /**
     * Stateless deterministic color shift based on grid coordinates and global time
     */
    public static calculateStatelessColorShift(x: number, y: number, globalTime: number): number {
        // Deterministic distortion wave based on coordinates and time
        const wave1 = Math.sin((x * 0.1) + (globalTime * 0.001));
        const wave2 = Math.cos((y * 0.1) - (globalTime * 0.002));
        return (wave1 + wave2) * 0.5; // Value between -1 and 1
    }
}
