import { WorldEventBus } from "../events/WorldEventBus";

export interface MarketHistoryEntry {
    timestamp: number;
    price: number;
    stock: number;
}

export interface ScarcityPrediction {
    resourceId: string;
    regionId: string;
    probability: number;
    severity: number;
    estimatedOnset: number;
}

export class ScarcityPredictor {
    private marketHistory: Map<string, MarketHistoryEntry[]> = new Map();
    private activePredictions: Map<string, ScarcityPrediction> = new Map();
    private readonly HISTORY_LIMIT = 50;
    private readonly VOLATILITY_THRESHOLD = 0.20;

    constructor(private eventBus: WorldEventBus) {
        this.setupSubscriptions();
    }

    private setupSubscriptions(): void {
        this.eventBus.subscribe('market_price_shift', (data: { resourceId: string; regionId: string; price: number; stock: number }) => {
            this.updateHistory(data.resourceId, data.regionId, data.price, data.stock);
            this.analyzeMarketTrends(data.resourceId, data.regionId);
        });

        this.eventBus.subscribe('resource_transaction', (data: { resourceId: string; regionId: string; amount: number; type: 'buy' | 'sell' }) => {
            // Transaction events can trigger early re-analysis if volume is high
            this.analyzeMarketTrends(data.resourceId, data.regionId);
        });
    }

    private updateHistory(resourceId: string, regionId: string, price: number, stock: number): void {
        const key = this.getCacheKey(resourceId, regionId);
        if (!this.marketHistory.has(key)) {
            this.marketHistory.set(key, []);
        }
        
        const history = this.marketHistory.get(key)!;
        history.push({
            timestamp: Date.now(),
            price,
            stock
        });

        if (history.length > this.HISTORY_LIMIT) {
            history.shift();
        }
    }

    public analyzeMarketTrends(resourceId: string, regionId: string): void {
        const key = this.getCacheKey(resourceId, regionId);
        const history = this.marketHistory.get(key);

        if (!history || history.length < 10) {
            return;
        }

        const current = history[history.length - 1];
        const previous = history[history.length - 10];

        const priceChangeRate = (current.price - previous.price) / previous.price;
        const stockChangeRate = (current.stock - previous.stock) / (previous.stock || 1);

        // Calculate historical volatility (standard deviation of price changes)
        const returns = [];
        for (let i = 1; i < history.length; i++) {
            returns.push((history[i].price - history[i - 1].price) / history[i - 1].price);
        }
        const meanReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
        const variance = returns.reduce((a, b) => a + Math.pow(b - meanReturn, 2), 0) / returns.length;
        const volatility = Math.sqrt(variance);

        // Heuristic: Scarcity is predicted if stock is declining while price increases 
        // significantly beyond historical volatility.
        const isStockDropping = stockChangeRate < -0.15;
        const isPriceSpiking = priceChangeRate > (volatility * 2) || priceChangeRate > this.VOLATILITY_THRESHOLD;

        if (isStockDropping && isPriceSpiking) {
            const confidence = Math.min(0.99, Math.abs(stockChangeRate) + (priceChangeRate / 2));
            
            this.activePredictions.set(key, {
                resourceId,
                regionId,
                probability: confidence,
                severity: Math.abs(stockChangeRate) * 10,
                estimatedOnset: Date.now() + (history[history.length - 1].timestamp - history[0].timestamp) / 2
            });
        } else if (stockChangeRate > 0.05) {
            // Recovery detected
            this.activePredictions.delete(key);
        }
    }

    public getPredictedScarcity(resourceId: string, regionId: string): ScarcityPrediction | null {
        return this.activePredictions.get(this.getCacheKey(resourceId, regionId)) || null;
    }

    private getCacheKey(resourceId: string, regionId: string): string {
        return `${resourceId}:${regionId}`;
    }
}