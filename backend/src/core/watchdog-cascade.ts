import { WatchdogEmitter } from './watchdog-emitter.js';

export class WatchdogCascadeMonitor {
    private emitter: WatchdogEmitter;

    constructor(emitterUrl: string = 'ws://localhost:9090') {
        this.emitter = new WatchdogEmitter(emitterUrl);
    }

    monitorCascade(cascadeActive: boolean): void {
        if (cascadeActive) {
            this.emitter.emit(
                'CASCADE_WARNING',
                { message: 'Resonance Cascade detected. Threat levels inverted.' },
                'HIGH',
                'CASCADE_MONITOR'
            );
        }
    }
}
