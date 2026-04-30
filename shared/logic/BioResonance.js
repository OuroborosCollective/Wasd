export const MAX_PHASE_CONSTANT = 2000;
/**
 * Berechnet einen deterministischen Phasen-Offset basierend auf der Entitäts-ID und dem aktuellen Tick.
 * Verwendet einen einfachen String-Hash-Algorithmus zur Umwandlung des id_hash in einen numerischen Wert.
 *
 * @param id_hash - Die eindeutige Kennung der Entität.
 * @param tickCount - Der aktuelle Tick-Zähler des World-States.
 * @returns Ein Wert zwischen 0 und MAX_PHASE_CONSTANT - 1.
 */
export function calculatePhaseShift(id_hash, tickCount) {
    let hashNumeric = 0;
    for (let i = 0; i < id_hash.length; i++) {
        const char = id_hash.charCodeAt(i);
        hashNumeric = ((hashNumeric << 5) - hashNumeric) + char;
        hashNumeric |= 0; // Umwandlung in 32-Bit Integer
    }
    // Kombiniere Hash mit TickCount für zeitliche Verschiebung
    // Math.abs stellt sicher, dass das Ergebnis bei negativem Hash positiv bleibt
    return Math.abs(hashNumeric + tickCount) % MAX_PHASE_CONSTANT;
}
