import { EventEmitter } from 'events';
import { type AREClock, SystemAREClock } from "../../core/determinism/AREDeterminism.js";

interface Vector3 {
    x: number;
    y: number;
    z: number;
}

interface MarketPriceShiftEvent {
    regionId: string;
    shiftPercentage: number;
    coordinates: Vector3;
}

interface INPC {
    id: string;
    role: string;
    longTermGoal: string;
    targetPosition: Vector3;
    metadata: Record<string, any>;
}

interface IEmergentMarket extends EventEmitter {
    on(event: 'scarcity_events', listener: (data: MarketPriceShiftEvent) => void): this;
}

interface INPCManager {
    getNPCsByRole(role: string): INPC[];
}

export class CaravanLogic {
    private readonly market: IEmergentMarket;
    private readonly npcManager: INPCManager;
    private readonly priceThreshold: number;

    constructor(
        market: IEmergentMarket,
        npcManager: INPCManager,
        threshold: number = 0.15,
        private readonly clock: AREClock = new SystemAREClock()
    ) {
        this.market = market;
        this.npcManager = npcManager;
        this.priceThreshold = threshold;
        this.initializeSubscriptions();
    }

    private initializeSubscriptions(): void {
        this.market.on('scarcity_events', (event: MarketPriceShiftEvent) => {
            this.evaluateMarketShift(event);
        });
    }

    private evaluateMarketShift(event: MarketPriceShiftEvent): void {
        if (Math.abs(event.shiftPercentage) >= this.priceThreshold) {
            this.recalculateCaravanRoutes(event.regionId, event.coordinates);
        }
    }

    private recalculateCaravanRoutes(regionId: string, targetBeacon: Vector3): void {
        const traders = this.npcManager.getNPCsByRole('trader');

        for (const trader of traders) {
            this.assignTradeMission(trader, regionId, targetBeacon);
        }
    }

    private assignTradeMission(npc: INPC, regionId: string, coordinates: Vector3): void {
        npc.longTermGoal = 'find_trade_partner';
        npc.targetPosition = {
            x: coordinates.x,
            y: coordinates.y,
            z: coordinates.z
        };
        
        npc.metadata = {
            ...npc.metadata,
            lastMarketUpdate: this.clock.now(),
            activeTradeRegion: regionId,
            objectiveType: 'scarcity_response'
        };
    }

    public updateThreshold(newThreshold: number): void {
        (this as any).priceThreshold = newThreshold;
    }
}
