import { emitBackendWatchdogEvent, getBackendWatchdogTick } from './watchdog-runtime';

export class WatchdogCascadeMonitor {
    monitorCascade(cascadeActive: boolean, tick = getBackendWatchdogTick()): void {
        if (!cascadeActive) return;

        emitBackendWatchdogEvent(
            'CASCADE_WARNING',
            { message: 'Resonance Cascade detected. Threat levels inverted.', cascadeActive },
            'HIGH',
            'CASCADE_MONITOR',
            tick,
        );
    }
}
