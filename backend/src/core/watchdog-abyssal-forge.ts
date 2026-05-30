import { WatchdogEmitter } from './watchdog-emitter.js';

export class WatchdogAbyssalForgeMonitor {
    private emitter: WatchdogEmitter;

    constructor(emitterUrl: string = 'ws://localhost:9090') {
        this.emitter = new WatchdogEmitter(emitterUrl);
    }

    monitorForgeTemperature(temperatureState: string): void {
        if (temperatureState === 'CRITICAL_OVERLOAD') {
            this.emitter.emit(
                'ABYSSAL_FORGE_OVERLOAD',
                { message: `Forge temperature reached critical overload. Dark matter instability imminent.` },
                'HIGH',
                'ABYSSAL_FORGE_MONITOR'
            );
        }
    }
}
