export interface Plant {
    health: number;
    maxHealth: number;
    baseYield: number;
    currentDegradationRate: number;
}

/**
 * Berechnet den erwarteten Ertrag basierend auf der aktuellen Health-Degradationsrate 
 * und dem verbleibenden Wachstumszyklus unter Annahme konstanter Ressourcenknappheit.
 * 
 * @param plant Das Pflanzenobjekt mit aktuellen Statuswerten
 * @param ticksRemaining Die Anzahl der verbleibenden Ticks bis zur Ernte
 * @returns Der prognostizierte Ertrag
 */
export function calculateYieldForecast(plant: Plant, ticksRemaining: number): number {
    const totalDegradation = plant.currentDegradationRate * ticksRemaining;
    const projectedHealth = Math.max(0, plant.health - totalDegradation);
    
    if (plant.maxHealth <= 0) {
        return 0;
    }

    const healthFactor = projectedHealth / plant.maxHealth;
    const forecastedYield = plant.baseYield * healthFactor;

    return forecastedYield;
}