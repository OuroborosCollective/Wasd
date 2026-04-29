import { EmergentMarket } from './EmergentMarket';
import { WorldEventBus } from './WorldEventBus';

export interface MarketShiftPayload {
    resourceId: string;
    shiftPercentage: number;
    currentPrice: number;
}

export class GlobalCrisisManager {
    private readonly criticalLimit: number = 0.75;
    private isCrisisActive: boolean = false;

    constructor(
        private readonly market: EmergentMarket,
        private readonly eventBus: WorldEventBus
    ) {
        this.initializeMonitoring();
    }

    private initializeMonitoring(): void {
        this.market.on('market_price_shift', (payload: MarketShiftPayload) => {
            this.analyzeMarketData(payload);
        });
    }

    private analyzeMarketData(payload: MarketShiftPayload): void {
        if (Math.abs(payload.shiftPercentage) >= this.criticalLimit) {
            this.initiateScarcityProtocol(payload);
        }
    }

    private initiateScarcityProtocol(payload: MarketShiftPayload): void {
        if (this.isCrisisActive) return;

        this.isCrisisActive = true;

        this.eventBus.publish('scarcity_event', {
            type: 'RESOURCE_SCARCITY_CRITICAL',
            source: 'GLOBAL_CRISIS_MANAGER',
            payload: {
                resourceId: payload.resourceId,
                severity: payload.shiftPercentage,
                triggerWarfront: true,
                marketStatus: 'UNSTABLE'
            },
            timestamp: Date.now()
        });

        this.logCrisisEvent(payload);
    }

    private logCrisisEvent(payload: MarketShiftPayload): void {
        console.warn(`[GlobalCrisisManager] Critical market shift detected for ${payload.resourceId}: ${payload.shiftPercentage * 100}%. Scarcity event published.`);
    }

    public resetCrisisState(): void {
        this.isCrisisActive = false;
    }
}