export type PlexityProfile = 'CIVIL' | 'WARFRONT';

interface PlexityWeights {
    w1: number;
    w2: number;
    w3: number;
}

const WEIGHT_PROFILES: Record<PlexityProfile, PlexityWeights> = {
    CIVIL: {
        w1: 0.2,
        w2: 0.5,
        w3: 0.3
    },
    WARFRONT: {
        w1: 0.6,
        w2: 0.1,
        w3: 0.3
    }
};

/**
 * Berechnet die Core-Plexity-Resonanz basierend auf NPC-Eigenschaften und Profilgewichtung.
 * Formel: Plexity = (typeValue * w1) + (hpRatio * w2) + (invRes * w3)
 * 
 * @param profile - Das Gewichtungsprofil ('CIVIL' oder 'WARFRONT')
 * @param typeValue - Numerischer Wert des NPC-Typs
 * @param hpRatio - Aktuelles Verhältnis der Trefferpunkte (0.0 bis 1.0)
 * @param invRes - Inverse Resonanz-Kapazität
 * @returns Der berechnete deterministische Plexity-Wert
 */
export function calculatePlexity(
    profile: PlexityProfile,
    typeValue: number,
    hpRatio: number,
    invRes: number
): number {
    const weights = WEIGHT_PROFILES[profile];
    
    if (!weights) {
        throw new Error(`Invalid PlexityProfile: ${profile}`);
    }

    const plexity = (typeValue * weights.w1) + (hpRatio * weights.w2) + (invRes * weights.w3);
    
    return Number(plexity.toFixed(4));
}

/**
 * Hilfsfunktion zur Ermittlung der Profileigenschaften
 * @param profile - Name des Profils
 */
export function getWeightsForProfile(profile: PlexityProfile): PlexityWeights {
    return WEIGHT_PROFILES[profile];
}