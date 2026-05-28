import { WatchdogEmitter } from './watchdog-emitter.js';

/**
 * Resonant String Field Watchdog
 * Monitors pure string-logic based resonance intersections in MMORPG zones.
 */
export class WatchdogResonanceFieldMonitor {
    private emitter: WatchdogEmitter;

    constructor(emitterUrl: string = 'ws://localhost:9090') {
        this.emitter = new WatchdogEmitter(emitterUrl);
    }

    /**
     * Watches for exact string intersections that create a resonance field.
     */
    checkFieldIntersection(fieldHashA: string, fieldHashB: string): void {
        if (fieldHashA.substring(0, 8) === fieldHashB.substring(0, 8)) {
             this.emitter.emit(
                'RESONANT_FIELD_FORMED',
                {
                    message: `Perfect string logic intersection detected. Generating resonance field.`,
                    resonanceKey: fieldHashA.substring(0, 8),
                },
                'NORMAL',
                'RESONANCE_MONITOR'
            );
        }
    }
}
