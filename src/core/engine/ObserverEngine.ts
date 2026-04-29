export interface Entity {
    id: string;
    version: number;
    payload: any;
    lastUpdated: number;
}

export interface EngineMetrics {
    lookupTime: string;
    plexityScore: number;
    entityCount: number;
}

export class ObserverEngine {
    private entityRegistry: Map<string, Entity>;
    private plexityScore: number;
    private readonly MAX_DENSITY_THRESHOLD: number = 10000;

    constructor() {
        this.entityRegistry = new Map<string, Entity>();
        this.plexityScore = 0;
    }

    /**
     * O(1) Lookup für Entitäten über Hash-Map Map-Struktur.
     */
    public getEntity(id: string): Entity | undefined {
        return this.entityRegistry.get(id);
    }

    /**
     * Fügt eine Entität hinzu und aktualisiert den Plexity-Score.
     */
    public upsertEntity(entity: Entity): void {
        this.entityRegistry.set(entity.id, entity);
        this.updatePlexityScore();
    }

    /**
     * Entfernt eine Entität in O(1) und aktualisiert den Plexity-Score.
     */
    public removeEntity(id: string): boolean {
        const deleted = this.entityRegistry.delete(id);
        if (deleted) {
            this.updatePlexityScore();
        }
        return deleted;
    }

    /**
     * Berechnet den Plexity-Score basierend auf Objektdichte und Lookup-Kosten.
     * Der Score ist ein gewichteter Indikator für die Rechenlast bei hoher Entitätsdichte.
     */
    private updatePlexityScore(): void {
        const count = this.entityRegistry.size;
        
        if (count === 0) {
            this.plexityScore = 0;
            return;
        }

        // Plexity-Algorithmus: Logarithmische Skalierung der Dichte zur Messung potenzieller Kollisionen/Interaktionen
        // O(1) bleibt für Lookup gewahrt, aber der Systemdruck steigt bei hoher Dichte (n * log(n))
        const densityFactor = count / this.MAX_DENSITY_THRESHOLD;
        this.plexityScore = parseFloat((count * Math.log10(count + 1) * (1 + densityFactor)).toFixed(4));
    }

    /**
     * Gibt aktuelle Performance-Metriken zurück.
     */
    public getDiagnostics(): EngineMetrics {
        return {
            lookupTime: "O(1)",
            plexityScore: this.plexityScore,
            entityCount: this.entityRegistry.size
        };
    }

    /**
     * Löscht das gesamte Register.
     */
    public clearRegistry(): void {
        this.entityRegistry.clear();
        this.updatePlexityScore();
    }

    /**
     * Stapelverarbeitung für hohe Objektdichte zur Minimierung von Rekalkulationen.
     */
    public bulkInsert(entities: Entity[]): void {
        for (const entity of entities) {
            this.entityRegistry.set(entity.id, entity);
        }
        this.updatePlexityScore();
    }
}