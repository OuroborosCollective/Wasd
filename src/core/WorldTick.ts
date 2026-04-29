export class WorldTick {
    private static readonly TICK_INTERVAL_MS: number = 100;
    private static readonly MAX_ACCUMULATION: number = 1000;

    private accumulatedTime: number = 0;
    private lastTimestamp: number = 0;
    private tickCount: number = 0;
    private isRunning: boolean = false;

    public start(initialTimestamp: number): void {
        this.lastTimestamp = initialTimestamp;
        this.accumulatedTime = 0;
        this.isRunning = true;
    }

    public update(currentTimestamp: number, onTick: (tick: number) => void): void {
        if (!this.isRunning) return;

        const deltaTime = currentTimestamp - this.lastTimestamp;
        
        this.validateInput(deltaTime);
        
        this.lastTimestamp = currentTimestamp;
        this.accumulatedTime += deltaTime;

        if (this.accumulatedTime > WorldTick.MAX_ACCUMULATION) {
            this.handleDesync();
        }

        while (this.accumulatedTime >= WorldTick.TICK_INTERVAL_MS) {
            this.tickCount++;
            this.accumulatedTime -= WorldTick.TICK_INTERVAL_MS;
            
            this.executeDeterministicTick(onTick);
        }
    }

    private executeDeterministicTick(onTick: (tick: number) => void): void {
        const expectedTick = this.tickCount;
        onTick(expectedTick);
        
        this.validateStability(expectedTick);
    }

    private validateInput(deltaTime: number): void {
        if (deltaTime < 0) {
            throw new Error(`Stability Violation: Negative deltaTime detected (${deltaTime}ms)`);
        }
    }

    private validateStability(executedTick: number): void {
        if (executedTick !== this.tickCount) {
            throw new Error(`Determinism Error: Expected tick ${this.tickCount}, got ${executedTick}`);
        }
        
        if (isNaN(this.accumulatedTime) || !isFinite(this.accumulatedTime)) {
            throw new Error("Stability Violation: Accumulator state corrupted");
        }
    }

    private handleDesync(): void {
        console.warn(`Simulation Desync: Dropping accumulated time (${this.accumulatedTime}ms)`);
        this.accumulatedTime = 0;
    }

    public getTickCount(): number {
        return this.tickCount;
    }

    public getInterval(): number {
        return WorldTick.TICK_INTERVAL_MS;
    }

    public stop(): void {
        this.isRunning = false;
    }
}