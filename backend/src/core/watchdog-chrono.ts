import { emitBackendWatchdogEvent, getBackendWatchdogTick } from './watchdog-runtime';

export class WatchdogChronoMonitor {
    monitorDilation(dilationFactor: number, tick = getBackendWatchdogTick()): void {
        if (dilationFactor >= 0.2) return;

        emitBackendWatchdogEvent(
            'TEMPORAL_ANOMALY',
            {
                message: 'Temporal drift threshold crossed.',
                dilationFactor,
            },
            'HIGH',
            'CHRONO_MONITOR',
            tick,
        );
    }
}
