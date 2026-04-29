export type TickCallback = (tickCount: number, timestamp: number) => void;

export class TickOrchestrator {
    private readonly TICK_MS: number = 100;
    private tickCount: number = 0;
    private running: boolean = false;
    private startTime: number = 0;
    private timeoutId: any = null;
    private callbacks: Set<TickCallback> = new Set();

    public onTick(callback: TickCallback): void {
        this.callbacks.add(callback);
    }

    public offTick(callback: TickCallback): void {
        this.callbacks.delete(callback);
    }

    public start(): void {
        if (this.running) return;
        this.running = true;
        this.tickCount = 0;
        this.startTime = Date.now();
        this.scheduleNext();
    }

    public stop(): void {
        this.running = false;
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
            this.timeoutId = null;
        }
    }

    private scheduleNext(): void {
        if (!this.running) return;

        const nextTickTime = this.startTime + (this.tickCount + 1) * this.TICK_MS;
        const now = Date.now();
        const delay = Math.max(0, nextTickTime - now);

        this.timeoutId = setTimeout(() => {
            this.execute();
        }, delay);
    }

    private execute(): void {
        if (!this.running) return;

        this.tickCount++;
        const currentTimestamp = Date.now();

        for (const callback of this.callbacks) {
            try {
                callback(this.tickCount, currentTimestamp);
            } catch (error) {
                // Silently handle callback errors to maintain orchestration integrity
            }
        }

        this.scheduleNext();
    }

    public getTickCount(): number {
        return this.tickCount;
    }

    public isRunning(): boolean {
        return this.running;
    }

    public getUptime(): number {
        if (!this.running) return 0;
        return Date.now() - this.startTime;
    }
}