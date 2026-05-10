import { WatchdogEmitter } from './watchdog-emitter.js';

export class WatchdogChronoSynapticMonitor {
    private emitter: WatchdogEmitter;
    private readonly tickThresholdMs: number = 50;

    constructor(emitterUrl: string = 'ws://localhost:9090') {
        this.emitter = new WatchdogEmitter(emitterUrl);
    }

    monitorTickTime(tickTimeMs: number): void {
        if (tickTimeMs > this.tickThresholdMs) {
            this.emitter.emit(
                'SYNAPTIC_OVERLOAD',
                {
                    message: `Critical tick delay detected: ${tickTimeMs}ms. Initiating Chrono-Synaptic time dilation.`,
                    overloadFactor: tickTimeMs / this.tickThresholdMs
                },
                'WARNING',
                'CHRONO_SYNAPTIC_MONITOR'
            );
        }
    }
}
