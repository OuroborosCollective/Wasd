// @ts-nocheck
import { EventEmitter } from 'events';
import { AREPayload } from '../../shared/types';

export class TickGenerator extends EventEmitter {
    private static readonly TICK_INTERVAL_MS = 100;
    private static readonly NS_PER_MS = 1_000_000n;

    private running: boolean = false;
    private tickCount: number = 0;
    private expectedTickTime: bigint = 0n;
    private timer?: NodeJS.Timeout;

    constructor() {
        super();
    }

    public start(): void {
        if (this.running) return;
        this.running = true;
        this.tickCount = 0;
        this.expectedTickTime = process.hrtime.bigint();
        this.processTick();
    }

    public stop(): void {
        this.running = false;
        if (this.timer) {
            clearTimeout(this.timer);
        }
    }

    private processTick(): void {
        if (!this.running) return;

        this.tickCount++;

        const payload: AREPayload = {
            tick: this.tickCount,
            timestamp: Date.now(),
            data: {}
        };

        this.emit('tick', payload);

        this.expectedTickTime += BigInt(TickGenerator.TICK_INTERVAL_MS) * TickGenerator.NS_PER_MS;
        
        const now = process.hrtime.bigint();
        const delayNs = this.expectedTickTime - now;
        const delayMs = Number(delayNs) / Number(TickGenerator.NS_PER_MS);

        if (delayMs > 1) {
            this.timer = setTimeout(() => this.processTick(), Math.floor(delayMs));
        } else {
            setImmediate(() => this.processTick());
        }
    }

    public getTickCount(): number {
        return this.tickCount;
    }
}