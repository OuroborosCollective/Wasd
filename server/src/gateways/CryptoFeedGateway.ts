// @ts-nocheck
import { EventEmitter } from 'events';

export interface StandardizedTick {
    symbol: string;
    price: number;
    volume: number;
    timestamp: number;
    source: string;
}

export interface RawExternalData {
    s?: string;
    p?: string | number;
    q?: string | number;
    t?: number;
    symbol?: string;
    price?: string | number;
    volume?: string | number;
    timestamp?: number;
}

export class CryptoFeedGateway extends EventEmitter {
    private buffer: StandardizedTick[] = [];
    private intervalId: NodeJS.Timeout | null = null;
    private readonly TICK_RATE_MS = 100;

    constructor() {
        super();
        this.initializeStream();
    }

    public initializeStream(): void {
        if (this.intervalId) return;
        this.intervalId = setInterval(() => this.processTickCycle(), this.TICK_RATE_MS);
    }

    public handleExternalFeedInput(source: string, data: RawExternalData): void {
        const standardizedTick = this.transform(source, data);
        if (this.isValidTick(standardizedTick)) {
            this.buffer.push(standardizedTick);
        }
    }

    private transform(source: string, data: RawExternalData): StandardizedTick {
        return {
            symbol: data.s || data.symbol || 'UNKNOWN',
            price: parseFloat(String(data.p || data.price || '0')),
            volume: parseFloat(String(data.q || data.volume || '0')),
            timestamp: data.t || data.timestamp || Date.now(),
            source: source
        };
    }

    private isValidTick(tick: StandardizedTick): boolean {
        return (
            tick.symbol !== 'UNKNOWN' &&
            !isNaN(tick.price) &&
            tick.price > 0 &&
            !isNaN(tick.volume) &&
            tick.timestamp > 0
        );
    }

    private processTickCycle(): void {
        if (this.buffer.length === 0) {
            return;
        }

        const batch = this.aggregateTicks(this.buffer);
        this.buffer = [];

        this.emit('emergent_market_ticks', batch);
    }

    private aggregateTicks(ticks: StandardizedTick[]): StandardizedTick[] {
        const grouped = ticks.reduce((acc, tick) => {
            if (!acc[tick.symbol]) {
                acc[tick.symbol] = [];
            }
            acc[tick.symbol].push(tick);
            return acc;
        }, {} as Record<string, StandardizedTick[]>);

        return Object.keys(grouped).map(symbol => {
            const group = grouped[symbol];
            return group.reduce((latest, current) => 
                current.timestamp > latest.timestamp ? current : latest
            );
        });
    }

    public shutdown(): void {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        this.buffer = [];
        this.removeAllListeners();
    }

    public getBufferSnapshot(): StandardizedTick[] {
        return [...this.buffer];
    }
}

export default new CryptoFeedGateway();