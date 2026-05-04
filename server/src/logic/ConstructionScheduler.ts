// @ts-nocheck
export interface ConstructionContract {
    npcId: string;
    legendInfluence: number;
    duration: number;
    timestamp: number;
}

export class ConstructionScheduler {
    private static queue: ConstructionContract[] = [];

    /**
     * Fügt einen neuen Bauauftrag in die Warteschlange ein.
     * Priorisierung erfolgt primär nach legendärem Einfluss (absteigend)
     * und sekundär nach der NPC-ID (lexikographisch als Stellvertreter für Position/ID).
     */
    public static enqueue(npcId: string, legendInfluence: number, duration: number): void {
        const contract: ConstructionContract = {
            npcId,
            legendInfluence,
            duration,
            timestamp: Date.now()
        };

        this.queue.push(contract);
        this.prioritize();
    }

    /**
     * Sortiert die Warteschlange basierend auf dem legendären Einfluss und der NPC-Identität.
     */
    private static prioritize(): void {
        this.queue.sort((a, b) => {
            if (b.legendInfluence !== a.legendInfluence) {
                return b.legendInfluence - a.legendInfluence;
            }
            return a.npcId.localeCompare(b.npcId);
        });
    }

    /**
     * Gibt den nächsten anstehenden Bauauftrag zurück und entfernt ihn aus der Liste.
     */
    public static dequeue(): ConstructionContract | undefined {
        return this.queue.shift();
    }

    /**
     * Gibt die aktuelle Warteschlange zurück.
     */
    public static getQueue(): ConstructionContract[] {
        return [...this.queue];
    }

    /**
     * Leert alle geplanten Bauprojekte.
     */
    public static clear(): void {
        this.queue = [];
    }
}