import { WatchdogEmitter } from './watchdog-emitter.js';

export class WatchdogSoulWeaverMonitor {
    private emitter: WatchdogEmitter;

    constructor(emitterUrl: string = 'ws://localhost:9090') {
        this.emitter = new WatchdogEmitter(emitterUrl);
    }

    monitorSoulResonance(resonanceState: string): void {
        if (resonanceState === 'SOUL_FRACTURE') {
            this.emitter.emit(
                'SOUL_FRACTURE_DETECTED',
                { message: `Critical soul fracture detected. Resonance integrity compromised.` },
                'HIGH',
                'SOULWEAVER_MONITOR'
            );
        }
    }
}
