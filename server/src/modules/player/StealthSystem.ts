// @ARE-GUARD-EXEMPT: non-sim module
export class StealthSystem {
    /**
     * Berechnet den Plexity-Score basierend auf Entitätstyp, HP-Verhältnis und Resonanz-Level.
     * Formel: (Entity-Typ-Gewichtung * 0.45) + (HP-Verhältnis * 0.35) + ((1 - Resonanz-Level) * 0.20)
     * 
     * @param entityTypeWeight Gewichtung des Entitätstyps
     * @param hpRatio Aktuelles HP-Verhältnis (0.0 bis 1.0)
     * @param resonanceLevel Aktuelles Resonanz-Level (0.0 bis 1.0)
     * @returns Der berechnete Plexity-Score
     */
    public static calculatePlexityScore(
        entityTypeWeight: number,
        hpRatio: number,
        resonanceLevel: number
    ): number {
        const weightPart = entityTypeWeight * 0.45;
        const hpPart = hpRatio * 0.35;
        const resonancePart = (1 - resonanceLevel) * 0.20;

        return weightPart + hpPart + resonancePart;
    }
}

/**
 * Exportierte Hilfsfunktion zur Skalierung des effektiven Wahrnehmungsradius.
 * Gibt den berechneten Plexity-Score zurück.
 * 
 * @param entityTypeWeight Gewichtung des Entitätstyps
 * @param hpRatio Aktuelles HP-Verhältnis
 * @param resonanceLevel Aktuelles Resonanz-Level
 * @returns Sichtbarkeitsfaktor zur Skalierung des Radius
 */
export function calculateVisibilityFactor(
    entityTypeWeight: number,
    hpRatio: number,
    resonanceLevel: number
): number {
    return StealthSystem.calculatePlexityScore(entityTypeWeight, hpRatio, resonanceLevel);
}