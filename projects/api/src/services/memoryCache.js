let credits = 10;
const memoryStore = {};

/**
 * Ruft den Kontext eines NPCs basierend auf der agentId ab.
 * Prüft API-Credits und filtert nach Relevanz > 0.8.
 * 
 * @param {string} agentId - Die ID des NPCs.
 * @returns {Array} - Gefilterte Kontext-Einträge.
 * @throws {Error} - Wenn nicht genügend Credits vorhanden sind.
 */
export function recallContext(agentId) {
    if (credits <= 0) {
        throw new Error('Insufficient API-Credits');
    }

    credits -= 1;

    const context = memoryStore[agentId] || [];
    
    return context.filter(entry => entry.relevance > 0.8);
}

/**
 * Fügt neuen Kontext zum Speicher hinzu.
 * @param {string} agentId 
 * @param {Object} entry - Objekt mit { relevance: number, content: any }
 */
export function storeContext(agentId, entry) {
    if (!memoryStore[agentId]) {
        memoryStore[agentId] = [];
    }
    memoryStore[agentId].push(entry);
}

/**
 * Gibt den aktuellen Credit-Stand zurück.
 * @returns {number}
 */
export function getRemainingCredits() {
    return credits;
}