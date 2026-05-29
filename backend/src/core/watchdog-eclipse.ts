import { WatchdogEmitter } from './watchdog-emitter.js';

export class WatchdogEclipseMonitor {
    private emitter: WatchdogEmitter;

    constructor(emitterUrl: string = 'ws://localhost:9090') {
        this.emitter = new WatchdogEmitter(emitterUrl);
    }

    monitorCelestialAlignment(celestialState: string): void {
        if (celestialState === 'SYZYGY') {
            this.emitter.emit(
                'ECLIPSE_ALIGNMENT',
                { message: `Celestial syzygy detected. Eclipse parameters active.` },
                'MEDIUM',
                'ECLIPSE_MONITOR'
            );
        }
    }
}
