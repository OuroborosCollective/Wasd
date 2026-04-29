export interface MarketHistoryEntry {
    resourceId: string;
    supply: number;
    demand: number;
    price: number;
    timestamp: number;
}

export class EmergentMarket {
    private history: MarketHistoryEntry[] = [];
    private readonly MAX_HISTORY_LENGTH: number = 100;

    constructor(
        public readonly id: string,
        private currentSupply: Map<string, number> = new Map(),
        private currentDemand: Map<string, number> = new Map(),
        private currentPrices: Map<string, number> = new Map()
    ) {}

    /**
     * Gibt eine schreibgeschützte Kopie der Markt-Historie zurück.
     * Ermöglicht dem ScarcityPredictor die Analyse vergangener Zyklen.
     */
    public getSupplyDemandHistory(): readonly MarketHistoryEntry[] {
        return Object.freeze([...this.history]);
    }

    /**
     * Erfasst den aktuellen Zustand eines Ressourcen-Zyklus in der Historie.
     */
    public recordMarketCycle(resourceId: string): void {
        const entry: MarketHistoryEntry = {
            resourceId,
            supply: this.currentSupply.get(resourceId) || 0,
            demand: this.currentDemand.get(resourceId) || 0,
            price: this.currentPrices.get(resourceId) || 0,
            timestamp: Date.now()
        };

        this.history.push(entry);

        if (this.history.length > this.MAX_HISTORY_LENGTH) {
            this.history.shift();
        }
    }

    public updateResourceState(resourceId: string, supply: number, demand: number, price: number): void {
        this.currentSupply.set(resourceId, supply);
        this.currentDemand.set(resourceId, demand);
        this.currentPrices.set(resourceId, price);
        this.recordMarketCycle(resourceId);
    }
}