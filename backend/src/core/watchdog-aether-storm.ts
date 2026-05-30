import { WatchdogEmitter } from './watchdog-emitter.js';

export class WatchdogAetherStormMonitor {
    private emitter: WatchdogEmitter;

    constructor(emitterUrl: string = 'ws://localhost:9090') {
        this.emitter = new WatchdogEmitter(emitterUrl);
    }

    monitorAethericField(fieldState: string): void {
        if (fieldState === 'AETHER_SURGE') {
            this.emitter.emit(
                'AETHER_STORM_WARNING',
                { message: `Aetheric surge detected. Magic fields heavily disrupted.` },
                'HIGH',
                'AETHER_STORM_MONITOR'
            );
        }
    }
}
