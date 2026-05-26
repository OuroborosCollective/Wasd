import { WatchdogEmitter } from './watchdog-emitter.js';

export class WatchdogAetherTideMonitor {
    private emitter: WatchdogEmitter;

    constructor(emitterUrl: string = 'ws://localhost:9090') {
        this.emitter = new WatchdogEmitter(emitterUrl);
    }

    monitorSaturation(regionId: string, saturationLevel: number): void {
        if (saturationLevel > 0.85) {
            this.emitter.emit(
                'AETHER_OVERSATURATION',
                { message: `High Aether saturation detected in region ${regionId} (level: ${saturationLevel.toFixed(2)}). Risk of simulation distortion.` },
                'WARNING',
                'AETHER_MONITOR'
            );
        } else if (saturationLevel > 0.95) {
             this.emitter.emit(
                'AETHER_OVERSATURATION_CRITICAL',
                { message: `CRITICAL Aether saturation detected in region ${regionId} (level: ${saturationLevel.toFixed(2)}). Engaging field dampeners.` },
                'HIGH',
                'AETHER_MONITOR'
            );
        }
    }
}
