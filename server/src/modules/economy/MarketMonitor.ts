import { EventEmitter } from 'events';
import { type AREClock, SystemAREClock } from "../../core/determinism/AREDeterminism.js";

interface MarketItem {
    id: string;
    name: string;
    currentPrice: number;
    basePrice: number;
}

interface EmergentMarket {
    getItems(): MarketItem[];
}

export class MarketMonitor extends EventEmitter {
    private market: EmergentMarket;
    private threshold: number;
    private checkInterval: NodeJS.Timeout | null = null;
    private lastPrices: Map<string, number> = new Map();

    constructor(
        market: EmergentMarket,
        threshold: number = 0.15,
        private readonly clock: AREClock = new SystemAREClock()
    ) {
        super();
        this.market = market;
        this.threshold = threshold;
    }

    public start(intervalMs: number = 5000): void {
        if (this.checkInterval) return;
        
        const initialItems = this.market.getItems();
        initialItems.forEach(item => {
            this.lastPrices.set(item.id, item.currentPrice);
        });

        this.checkInterval = setInterval(() => {
            this.performCheck();
        }, intervalMs);
    }

    public stop(): void {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
    }

    private performCheck(): void {
        const currentItems = this.market.getItems();

        currentItems.forEach(item => {
            const previousPrice = this.lastPrices.get(item.id);
            
            if (previousPrice !== undefined) {
                const priceShift = Math.abs((item.currentPrice - previousPrice) / previousPrice);

                if (priceShift > this.threshold) {
                    this.emit('market_price_shift', {
                        itemId: item.id,
                        oldPrice: previousPrice,
                        newPrice: item.currentPrice,
                        shiftPercentage: priceShift,
                        timestamp: this.clock.now()
                    });
                }
            }
            
            this.lastPrices.set(item.id, item.currentPrice);
        });
    }

    public setThreshold(newThreshold: number): void {
        this.threshold = newThreshold;
    }
}
