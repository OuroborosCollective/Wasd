import { AREClock } from '../../core/determinism/AREDeterminism.js';

export interface CombatEvent {
    id: string;
    type: 'KILL' | 'DEATH' | 'TRAUMA';
    timestamp: number;
    intensity: number;
}

export class PsychoAcousticBrain {
    constructor(private clock: AREClock) {}

    /**
     * Deterministically calculates the "Fear" or Morale field based on recent combat events.
     */
    calculateResonanceField(events: CombatEvent[]): number {
        const timeNow = this.clock.now();
        const memoryWindowMs = 60000; // 1 minute memory window

        let totalResonance = 0;

        // Enforce deterministic sorting (Level-A Determinism rule)
        const sortedEvents = [...events].sort((a, b) => a.id.localeCompare(b.id));

        for (const event of sortedEvents) {
            const age = timeNow - event.timestamp;

            // If the event is within the memory window, it contributes to the resonance field
            if (age >= 0 && age <= memoryWindowMs) {
                // The older the event, the less impact it has (linear decay)
                const impact = event.intensity * (1 - (age / memoryWindowMs));
                totalResonance += impact;
            }
        }

        // Clamp resonance between 0.0 (calm) and 1.0 (mass panic)
        return Math.min(1.0, Math.max(0.0, totalResonance / 100));
    }
}
