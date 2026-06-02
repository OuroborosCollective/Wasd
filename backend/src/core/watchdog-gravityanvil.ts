import { WatchdogEmitter } from './watchdog-emitter.js';

export class WatchdogGravityAnvilMonitor {
    private emitter: WatchdogEmitter;

    constructor(emitterUrl: string = 'ws://localhost:9090') {
        this.emitter = new WatchdogEmitter(emitterUrl);
    }

    monitorMassDensity(massDensity: number, tectonicPressure: number): void {
        if (massDensity > 9000 && tectonicPressure > 8500) {
            this.emitter.emit(
                'GRAVITY_ANVIL_CRITICAL',
                { message: `Critical mass density and tectonic pressure detected. Gravity Anvil threshold reached.` },
                'CRITICAL',
                'GRAVITY_ANVIL_MONITOR'
            );
        }
    }
}
