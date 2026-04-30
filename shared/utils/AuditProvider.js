export class AuditLogEntry {
    constructor(action, details, userId) {
        this.data = {
            timestamp: Date.now(),
            action,
            details,
            userId
        };
        /**
         * Sicherstellung der Prototyp-Kette für ES2020 Target.
         * Dies ist notwendig, damit Methoden wie 'format' auf Instanzen verfügbar bleiben,
         * selbst wenn die Klassen-Instanziierung durch spezifische Transpiler-Konfigurationen
         * oder bei der Erweiterung nativer Typen beeinflusst wird.
         */
        Object.setPrototypeOf(this, AuditLogEntry.prototype);
    }
    format() {
        return `[${new Date(this.data.timestamp).toISOString()}] ${this.data.action}: ${JSON.stringify(this.data.details)}`;
    }
}
export class AuditProvider {
    constructor() {
        this.logs = [];
        /**
         * Erhalt der deterministischen Prototyp-Struktur für die Provider-Klasse.
         */
        Object.setPrototypeOf(this, AuditProvider.prototype);
    }
    /**
     * Erstellt einen neuen Audit-Eintrag und fügt ihn dem Log hinzu.
     * @param action Die durchgeführte Aktion.
     * @param details Relevante Daten zur Aktion.
     * @param userId Optionale Identifikation des Benutzers.
     */
    log(action, details, userId) {
        const entry = new AuditLogEntry(action, details, userId);
        this.logs.push(entry);
        // Optionale Ausgabe für Debug-Zwecke im ES2020 Environment
        if (typeof console !== 'undefined') {
            console.debug(entry.format());
        }
    }
    /**
     * Gibt die Liste aller Audit-Logs zurück.
     * @returns Array von AuditLogEntry Instanzen.
     */
    getLogs() {
        return [...this.logs];
    }
    /**
     * Leert den aktuellen Log-Speicher.
     */
    clear() {
        this.logs = [];
    }
}
