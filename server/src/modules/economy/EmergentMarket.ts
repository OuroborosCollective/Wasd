import { type AREClock, SystemAREClock } from "../../core/determinism/AREDeterminism.js";

export interface MarketHistoryEntry {
    resourceId: string;
    supply: number;
    demand: number;
    price: number;
    timestamp: number;
}

export interface MarketShiftPayload {
    resourceId: string;
    shiftPercentage: number;
    currentPrice: number;
}

export class EmergentMarket {
    private history: MarketHistoryEntry[] = [];
    private readonly MAX_HISTORY_LENGTH: number = 100;

    // Simple event emitter
    private listeners: { [event: string]: Function[] } = {};

    constructor(
        public readonly id: string,
        private currentSupply: Map<string, number> = new Map(),
        private currentDemand: Map<string, number> = new Map(),
        private currentPrices: Map<string, number> = new Map(),
        private readonly clock: AREClock = new SystemAREClock()
    ) {}

    public on(event: string, callback: Function) {
        if (!this.listeners[event]) this.listeners[event] = [];
        this.listeners[event].push(callback);
    }

    public emit(event: string, payload: any) {
        if (this.listeners[event]) {
            this.listeners[event].forEach(cb => cb(payload));
        }
    }

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
            timestamp: this.clock.now()
        };

        this.history.push(entry);

        if (this.history.length > this.MAX_HISTORY_LENGTH) {
            this.history.shift();
        }
    }

    public updateResourceState(resourceId: string, supply: number, demand: number, price: number): void {
        const oldPrice = this.currentPrices.get(resourceId) || price;
        this.currentSupply.set(resourceId, supply);
        this.currentDemand.set(resourceId, demand);
        this.currentPrices.set(resourceId, price);
        this.recordMarketCycle(resourceId);

        if (oldPrice !== 0 && oldPrice !== price) {
             const shiftPercentage = (price - oldPrice) / oldPrice;
             this.emit('market_price_shift', {
                 resourceId,
                 shiftPercentage,
                 currentPrice: price
             });
        }
    }
}
