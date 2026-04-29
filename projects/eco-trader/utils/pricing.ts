export interface TradeEvent {
    price: number;
    volume: number;
    timestamp: number;
}

export interface PricingConfig {
    basePrice: number;
    elasticity: number;
    movingAveragePeriod: number;
    minPrice: number;
    maxPrice: number;
}

/**
 * Berechnet den aktuellen Marktpreis basierend auf dem Verhältnis von Angebot und Nachfrage
 * unter Berücksichtigung der Preiselastizität und historischer Handelsdaten.
 * 
 * @param supply Die aktuell verfügbare Menge (Angebot)
 * @param demand Die aktuell angeforderte Menge (Nachfrage)
 * @param history Liste der vergangenen trade_complete Ereignisse
 * @param config Konfigurationsobjekt für die Preisberechnung
 * @returns Der berechnete Preis
 */
export function calculateDynamicPrice(
    supply: number,
    demand: number,
    history: TradeEvent[],
    config: PricingConfig
): number {
    const { basePrice, elasticity, movingAveragePeriod, minPrice, maxPrice } = config;

    // 1. Berechnung des Angebots-Nachfrage-Verhältnisses
    // Vermeidung von Division durch Null
    const effectiveSupply = supply <= 0 ? 1 : supply;
    const effectiveDemand = demand <= 0 ? 1 : demand;
    
    // Verhältnis > 1 bedeutet Nachfrageüberhang (Preis steigt)
    // Verhältnis < 1 bedeutet Angebotsüberhang (Preis sinkt)
    const ratio = effectiveDemand / effectiveSupply;

    // 2. Anwendung der Elastizität (Potenzfunktion zur Steuerung der Preissensitivität)
    // Price = Base * (Demand/Supply)^Elasticity
    let price = basePrice * Math.pow(ratio, elasticity);

    // 3. Einbeziehung des gleitenden Durchschnitts (Moving Average) vergangener Abschlüsse
    if (history.length > 0) {
        const recentTrades = history.slice(-movingAveragePeriod);
        const sumPrices = recentTrades.reduce((acc, trade) => acc + trade.price, 0);
        const movingAverage = sumPrices / recentTrades.length;

        // Gewichtung: 70% aktueller Marktmechanismus, 30% historischer Durchschnitt zur Glättung
        const smoothingFactor = 0.3;
        price = (price * (1 - smoothingFactor)) + (movingAverage * smoothingFactor);
    }

    // 4. Einhaltung der Preisgrenzen
    if (price < minPrice) return minPrice;
    if (price > maxPrice) return maxPrice;

    return Number(price.toFixed(4));
}

/**
 * Hilfsfunktion zur Ermittlung des gewichteten Durchschnittspreises (Volume Weighted Average Price)
 */
export function calculateVWAP(history: TradeEvent[], period: number): number {
    const recentTrades = history.slice(-period);
    if (recentTrades.length === 0) return 0;

    let totalVolume = 0;
    let totalValue = 0;

    for (const trade of recentTrades) {
        totalValue += trade.price * trade.volume;
        totalVolume += trade.volume;
    }

    return totalVolume > 0 ? totalValue / totalVolume : 0;
}