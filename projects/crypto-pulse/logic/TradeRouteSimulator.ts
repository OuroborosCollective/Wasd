interface MarketTickData {
    assetId: string;
    demand: number;
    supply: number;
    volume: number;
    timestamp: number;
}

type MarketTickHandler = (data: MarketTickData[]) => void;

export class TradeRouteSimulator {
    private intervalId: ReturnType<typeof setInterval> | null = null;
    private assets: string[];
    private onTick: MarketTickHandler;
    private tickIntervalMs: number;
    private volatility: number;

    constructor(
        assetIds: string[], 
        processMarketTick: MarketTickHandler, 
        intervalMs: number = 1000,
        volatility: number = 0.15
    ) {
        this.assets = assetIds;
        this.onTick = processMarketTick;
        this.tickIntervalMs = intervalMs;
        this.volatility = volatility;
    }

    public start(): void {
        if (this.intervalId) {
            return;
        }

        this.intervalId = setInterval(() => {
            this.generateMarketDynamics();
        }, this.tickIntervalMs);
    }

    public stop(): void {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }

    public updateTickRate(ms: number): void {
        this.tickIntervalMs = ms;
        if (this.intervalId) {
            this.stop();
            this.start();
        }
    }

    private generateMarketDynamics(): void {
        const tickBatch: MarketTickData[] = this.assets.map(assetId => {
            const demandBase = Math.random() * 100;
            const supplyBase = Math.random() * 100;
            
            const demandNoise = (Math.random() - 0.5) * (demandBase * this.volatility);
            const supplyNoise = (Math.random() - 0.5) * (supplyBase * this.volatility);

            const finalDemand = Math.max(1, demandBase + demandNoise);
            const finalSupply = Math.max(1, supplyBase + supplyNoise);
            
            const volume = (finalDemand + finalSupply) * (Math.random() * 10);

            return {
                assetId,
                demand: parseFloat(finalDemand.toFixed(4)),
                supply: parseFloat(finalSupply.toFixed(4)),
                volume: parseFloat(volume.toFixed(2)),
                timestamp: Date.now()
            };
        });

        this.onTick(tickBatch);
    }

    public simulateNpcOrder(assetId: string, side: 'BUY' | 'SELL', amount: number): MarketTickData {
        const demand = side === 'BUY' ? amount : Math.random() * 10;
        const supply = side === 'SELL' ? amount : Math.random() * 10;

        const manualTick: MarketTickData = {
            assetId,
            demand,
            supply,
            volume: amount * 2,
            timestamp: Date.now()
        };

        this.onTick([manualTick]);
        return manualTick;
    }
}