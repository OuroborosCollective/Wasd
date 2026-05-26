import { WatchdogEmitter } from './watchdog-emitter.js';

export class WatchdogPsychoAcousticMonitor {
    private emitter: WatchdogEmitter;

    constructor(emitterUrl: string = 'ws://localhost:9090') {
        this.emitter = new WatchdogEmitter(emitterUrl);
    }

    monitorFearCascade(resonanceLevel: number): void {
        if (resonanceLevel > 0.6) {
            this.emitter.emit(
                'PSYCHO_ACOUSTIC_WARNING',
                { message: `Elevated fear resonance detected (level: ${resonanceLevel.toFixed(2)}). Morale breaking.` },
                'WARNING',
                'RESONANCE_MONITOR'
            );
        } else if (resonanceLevel > 0.85) {
            this.emitter.emit(
                'FEAR_CASCADE_CRITICAL',
                { message: `CRITICAL: Fear cascade imminent (level: ${resonanceLevel.toFixed(2)}). Engaging runaway AI behavioral locks.` },
                'HIGH',
                'RESONANCE_MONITOR'
            );
        }
    }
}
