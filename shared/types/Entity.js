/**
 * Generiert einen stabilen numerischen Hash aus einem String (z.B. UUID oder DB-Key).
 * Nutzt den Java-ähnlichen String-Hash-Algorithmus für deterministische 32-Bit Integers.
 * Dieser Hash wird primär für Shader-Offsets und sessionübergreifende visuelle Konsistenz genutzt.
 */
export function generateIdHash(id) {
    let hash = 0;
    if (id.length === 0)
        return hash;
    for (let i = 0; i < id.length; i++) {
        const char = id.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0; // Konvertierung zu 32-Bit Signed Integer
    }
    return Math.abs(hash);
}
/**
 * Factory oder Mapper-Hilfsfunktion zur Initialisierung einer Entität
 * mit garantiertem id_hash.
 */
export function createEntityBase(id) {
    return {
        id,
        id_hash: generateIdHash(id)
    };
}
