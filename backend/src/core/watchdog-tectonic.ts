import { WatchdogEmitter } from './watchdog-emitter.js';

/**
 * Axiomatic Tectonic Shift Watchdog
 * Monitors logical string-based stress fields to trigger Tectonic events.
 */
export class WatchdogTectonicMonitor {
    private emitter: WatchdogEmitter;

    constructor(emitterUrl: string = 'ws://localhost:9090') {
        this.emitter = new WatchdogEmitter(emitterUrl);
    }

    /**
     * Evaluates purely logical, string-based tectonic stress without intelligent AI.
     */
    evaluateStress(hashLoad: string, playerDensityHex: string): void {
        const stressLevel = this.computeStringLogicStress(hashLoad, playerDensityHex);

        if (stressLevel > 0.85) {
            this.emitter.emit(
                'TECTONIC_SHIFT',
                {
                    message: `Critical tectonic stress reached (${stressLevel.toFixed(2)}). Deformation imminent.`,
                    epicenterHash: hashLoad,
                },
                'CRITICAL',
                'TECTONIC_MONITOR'
            );
        }
    }

    private computeStringLogicStress(hash: string, density: string): number {
        // Purely logical string operations, avoiding Math.random for determinism.
        const lengthMod = (hash.length + density.length) % 100;
        return Math.min(lengthMod / 100 + 0.1, 1.0);
    }
}
