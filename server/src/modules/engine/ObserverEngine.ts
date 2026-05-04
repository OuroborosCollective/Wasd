// @ts-nocheck
export interface IPosition {
    x: number;
    y: number;
}

export interface IObserverEntity {
    id: string;
    position: IPosition;
    baseRadius: number;
}

export interface ITargetEntity {
    id: string;
    position: IPosition;
    visibilityFactor: number;
}

export class ObserverEngine {
    private visibilityFactorCache: Map<string, number> = new Map();

    /**
     * Aktualisiert den Visibility-Cache während des ARE-Update-Zyklus.
     * Gewährleistet O(1) Zugriff während der eigentlichen Detektions-Prüfung.
     */
    public updateVisibilityCache(targets: ITargetEntity[]): void {
        this.visibilityFactorCache.clear();
        const len = targets.length;
        for (let i = 0; i < len; i++) {
            const target = targets[i];
            this.visibilityFactorCache.set(target.id, target.visibilityFactor);
        }
    }

    /**
     * Haupt-Detektions-Loop. 
     * Vergleicht Distanzen mit dem dynamischen Sichtradius basierend auf dem Stealth-System.
     */
    public runDetectionLoop(observers: IObserverEntity[], targets: ITargetEntity[]): Map<string, string[]> {
        const detectionResults = new Map<string, string[]>();
        const observerCount = observers.length;
        const targetCount = targets.length;

        for (let i = 0; i < observerCount; i++) {
            const observer = observers[i];
            const detectedIds: string[] = [];

            for (let j = 0; j < targetCount; j++) {
                const target = targets[j];

                // Schnelle Distanzberechnung (Euklidisch)
                const dx = observer.position.x - target.position.x;
                const dy = observer.position.y - target.position.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                // O(1) Lookup des zwischengespeicherten VisibilityFactors
                const vFactor = this.visibilityFactorCache.get(target.id) ?? 1.0;
                
                // Dynamischer Vergleich gemäß Anforderung
                if (distance < observer.baseRadius * vFactor) {
                    detectedIds.push(target.id);
                }
            }

            detectionResults.set(observer.id, detectedIds);
        }

        return detectionResults;
    }

    /**
     * Bereinigung des Caches
     */
    public clearCache(): void {
        this.visibilityFactorCache.clear();
    }
}