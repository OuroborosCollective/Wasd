import { WatchdogEmitter } from './watchdog-emitter.js';
import { perf_hooks } from 'perf_hooks';

/**
 * Aetheric Load Watchdog
 * Translates Node.js event loop lag into a logical Aetheric pressure game metric.
 */
export class WatchdogAethericMonitor {
    private emitter: WatchdogEmitter;
    private lastCheck: number;

    constructor(emitterUrl: string = 'ws://localhost:9090') {
        this.emitter = new WatchdogEmitter(emitterUrl);
        // Using performance.now() as it is relative and fine for local interval diffs,
        // but note we only emit deterministic stress levels, not the raw timestamp.
        this.lastCheck = perf_hooks.performance.now();
    }

    /**
     * Checks loop lag and maps it to in-game stress purely mathematically.
     * Call this inside an interval or tick loop.
     */
    measureAethericPressure(): void {
        const now = perf_hooks.performance.now();
        const delta = now - this.lastCheck;
        this.lastCheck = now;

        // Assuming a 100ms ideal tick (WARFRONT_TICK_MS logic)
        const lag = Math.max(0, delta - 100);

        if (lag > 50) {
            this.emitter.emit(
                'AETHERIC_STORM_WARNING',
                {
                    message: `Heavy aetheric pressure detected. Reality is bending.`,
                    pressureIndex: lag, // Passing deterministic numeric index mapped to lag severity
                },
                'HIGH',
                'AETHERIC_MONITOR'
            );
        }
    }
}
