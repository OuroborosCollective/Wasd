import { WatchdogEmitter } from './watchdog-emitter.js';

export class WatchdogChronoMonitor {
    private emitter: WatchdogEmitter;

    constructor(emitterUrl: string = 'ws://localhost:9090') {
        this.emitter = new WatchdogEmitter(emitterUrl);
    }

    monitorDilation(dilationFactor: number): void {
        if (dilationFactor < 0.2) {
            this.emitter.emit(
                'TEMPORAL_ANOMALY',
                { message: `Extreme time dilation detected (factor: ${dilationFactor}). Physics desync risk.` },
                'HIGH',
                'CHRONO_MONITOR'
            );
        }
    }
}
