import { emitBackendWatchdogEvent, getBackendWatchdogTick } from './watchdog-runtime';

export class WatchdogChronoSynapticMonitor {
    private readonly tickThresholdMs: number = 50;

    monitorTickTime(tickTimeMs: number, tick = getBackendWatchdogTick()): void {
        if (tickTimeMs <= this.tickThresholdMs) return;

        emitBackendWatchdogEvent(
            'SYNAPTIC_OVERLOAD',
            {
                message: 'Tick duration threshold crossed.',
                tickTimeMs,
                thresholdMs: this.tickThresholdMs,
                overloadFactor: tickTimeMs / this.tickThresholdMs,
            },
            'MEDIUM',
            'CHRONO_SYNAPTIC_MONITOR',
            tick,
        );
    }
}
