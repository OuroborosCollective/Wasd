import { WatchdogEmitter } from './watchdog-emitter.js';

export class WatchdogGravimetricMonitor {
    private emitter: WatchdogEmitter;

    constructor(emitterUrl: string = 'ws://localhost:9090') {
        this.emitter = new WatchdogEmitter(emitterUrl);
    }

    monitorAnomaly(zoneId: string, gravityFactor: number): void {
        if (gravityFactor > 2.5) {
            this.emitter.emit(
                'GRAVIMETRIC_ANOMALY',
                { message: `High gravity well detected in zone ${zoneId} (factor: ${gravityFactor.toFixed(2)}). Physics engine strain increasing.` },
                'WARNING',
                'GRAVITY_MONITOR'
            );
        } else if (gravityFactor > 4.0) {
            this.emitter.emit(
                'GRAVIMETRIC_CRITICAL',
                { message: `CRITICAL: Massive gravity sink in zone ${zoneId} (factor: ${gravityFactor.toFixed(2)}). Immediate risk of Havok desync.` },
                'HIGH',
                'GRAVITY_MONITOR'
            );
        }
    }
}
