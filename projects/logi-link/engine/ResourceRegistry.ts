export class ResourceRegistry {
    private criticalityFactors: Map<string, number> = new Map();

    /**
     * Gibt den Kritikalitäts-Faktor aus den Stammdaten zurück.
     * Standardwert ist 1.0.
     * 
     * @param resourceId Die ID der Ressource
     * @returns Der Kritikalitäts-Faktor
     */
    public getWeight(resourceId: string): number {
        const factor = this.criticalityFactors.get(resourceId);
        return factor !== undefined ? factor : 1.0;
    }

    /**
     * Setzt den Kritikalitäts-Faktor für eine Ressource in den Stammdaten.
     * 
     * @param resourceId Die ID der Ressource
     * @param weight Der Kritikalitäts-Faktor
     */
    public setWeight(resourceId: string, weight: number): void {
        this.criticalityFactors.set(resourceId, weight);
    }
}