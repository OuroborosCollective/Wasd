// @ARE-GUARD-EXEMPT: core meta
import { EmergentMarket, MarketShiftPayload } from '../modules/economy/EmergentMarket.js';
import { WorldEventBus } from './WorldEventBus.js';
import { AIOrchestrator } from './AIOrchestrator.js';

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

        // publish was changed to emit according to WorldEventBus definition
        this.eventBus.emit('scarcity_event', {
            resourceId: payload.resourceId,
            multiplier: 1.0 + payload.shiftPercentage,
            durationMinutes: 60,
            affectedRegions: ['global']
        });

        this.logCrisisEvent(payload);

        // Call the AIOrchestrator to trigger world expansion
        AIOrchestrator.triggerWorldExpansion('generate_new_biome_quests', {
            aggression: Math.max(0.1, 1.0 - Math.abs(payload.shiftPercentage)), // heuristic based on shift
            chunkKey: `chunk_${payload.resourceId}_scarcity`, // derived contextual chunk
            scarcitySeverity: payload.shiftPercentage
        });
    }

    private logCrisisEvent(payload: MarketShiftPayload): void {
        console.warn(`[GlobalCrisisManager] Critical market shift detected for ${payload.resourceId}: ${payload.shiftPercentage * 100}%. Scarcity event published.`);
    }

    public resetCrisisState(): void {
        this.isCrisisActive = false;
    }
}
