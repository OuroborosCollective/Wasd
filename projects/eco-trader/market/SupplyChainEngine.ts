import { EventEmitter } from 'events';

export interface ScarcityEvent {
    id: string;
    resourceId: string;
    multiplier: number;
    duration: number;
    startTime: number;
    description: string;
}

export interface TradeData {
    resourceId: string;
    quantity: number;
    basePrice: number;
    buyerId: string;
    sellerId: string;
    timestamp: number;
}

export interface MarketState {
    resourceId: string;
    currentPrice: number;
    volatility: number;
    demand: number;
    supply: number;
}

export class EmergentMarket {
    private marketStates: Map<string, MarketState> = new Map();

    constructor() {}

    public updatePrice(resourceId: string, tradeQuantity: number): MarketState {
        const state = this.marketStates.get(resourceId) || {
            resourceId,
            currentPrice: 100,
            volatility: 0.05,
            demand: 1000,
            supply: 1000
        };

        const priceShift = (tradeQuantity / state.supply) * state.currentPrice * state.volatility;
        state.currentPrice += priceShift;
        state.demand += tradeQuantity;
        state.supply -= tradeQuantity * 0.1; 

        this.marketStates.set(resourceId, state);
        return state;
    }

    public getMarketState(resourceId: string): MarketState | undefined {
        return this.marketStates.get(resourceId);
    }
}

export class SupplyChainEngine extends EventEmitter {
    private activeScarcityEvents: ScarcityEvent[] = [];
    private emergentMarket: EmergentMarket;

    constructor(emergentMarket: EmergentMarket) {
        super();
        this.emergentMarket = emergentMarket;
        this.initEventListeners();
    }

    private initEventListeners(): void {
        this.on('trade_complete', (data: TradeData) => {
            this.processTrade(data);
        });
    }

    public addScarcityEvent(event: ScarcityEvent): void {
        this.activeScarcityEvents.push(event);
        this.emit('scarcity_applied', event);
    }

    public removeExpiredEvents(currentTime: number): void {
        this.activeScarcityEvents = this.activeScarcityEvents.filter(
            e => (e.startTime + e.duration) > currentTime
        );
    }

    private processTrade(data: TradeData): void {
        const marketState = this.emergentMarket.updatePrice(data.resourceId, data.quantity);
        const finalPrice = this.calculateFinalPrice(data.resourceId, marketState.currentPrice);
        
        this.emit('supply_chain_updated', {
            resourceId: data.resourceId,
            newBasePrice: marketState.currentPrice,
            finalAdjustedPrice: finalPrice,
            activeModifiers: this.getModifiersForResource(data.resourceId)
        });
    }

    public calculateFinalPrice(resourceId: string, basePrice: number): number {
        const modifiers = this.getModifiersForResource(resourceId);
        let finalPrice = basePrice;

        for (const multiplier of modifiers) {
            finalPrice *= multiplier;
        }

        return finalPrice;
    }

    private getModifiersForResource(resourceId: string): number[] {
        return this.activeScarcityEvents
            .filter(e => e.resourceId === resourceId)
            .map(e => e.multiplier);
    }

    /**
     * B2B Logistics API: Simulation of bulk procurement
     */
    public simulateB2BProcurement(resourceId: string, volume: number): {
        unitPrice: number;
        totalCost: number;
        scarcityImpact: boolean;
    } {
        const state = this.emergentMarket.getMarketState(resourceId);
        const basePrice = state ? state.currentPrice : 100;
        
        const adjustedPrice = this.calculateFinalPrice(resourceId, basePrice);
        const volumeDiscount = volume > 1000 ? 0.9 : 1.0;
        const finalUnitPrice = adjustedPrice * volumeDiscount;

        return {
            unitPrice: finalUnitPrice,
            totalCost: finalUnitPrice * volume,
            scarcityImpact: this.getModifiersForResource(resourceId).length > 0
        };
    }

    public getActiveEvents(): ScarcityEvent[] {
        return [...this.activeScarcityEvents];
    }
}

export const createSupplyChainEngine = (): SupplyChainEngine => {
    const market = new EmergentMarket();
    return new SupplyChainEngine(market);
};