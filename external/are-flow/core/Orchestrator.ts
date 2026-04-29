import { PersistenceManager } from "./PersistenceManager";

export interface TickData {
    logicalIndex: number;
    timestamp: number;
    data: any;
}

export class Orchestrator {
    private logicalIndex: number = 0;
    private isRunning: boolean = false;
    private tickInterval: any = null;
    private lastFrameTime: number = 0;
    private readonly TICK_MS: number = 100;

    constructor(private persistenceManager: PersistenceManager) {}

    public start(): void {
        if (this.isRunning) return;
        this.isRunning = true;
        this.lastFrameTime = Date.now();
        this.tickInterval = setInterval(() => this.cycle(), this.TICK_MS);
    }

    public stop(): void {
        this.isRunning = false;
        if (this.tickInterval) {
            clearInterval(this.tickInterval);
            this.tickInterval = null;
        }
    }

    private cycle(): void {
        const currentTime = Date.now();
        const elapsed = currentTime - this.lastFrameTime;

        if (elapsed >= this.TICK_MS) {
            const framesToProcess = Math.floor(elapsed / this.TICK_MS);
            
            for (let i = 0; i < framesToProcess; i++) {
                this.executeTick(this.lastFrameTime + (i + 1) * this.TICK_MS);
            }
        }
    }

    private executeTick(timestamp: number): void {
        try {
            this.logicalIndex++;
            
            const tickData: TickData = {
                logicalIndex: this.logicalIndex,
                timestamp: timestamp,
                data: {}
            };

            this.persistenceManager.persist(tickData);
            this.lastFrameTime = timestamp;

            this.validateSynchronization();
        } catch (error) {
            this.handleProcessingError(error);
        }
    }

    private validateSynchronization(): void {
        const persistedIndex = this.persistenceManager.getLastLogicalIndex();
        if (this.logicalIndex !== persistedIndex) {
            console.warn(`Sync mismatch: Local ${this.logicalIndex} vs Persisted ${persistedIndex}. Correcting...`);
            this.logicalIndex = persistedIndex;
        }
    }

    private handleProcessingError(error: any): void {
        console.error("Orchestrator Tick Error:", error);
        this.stop();
        this.recover();
    }

    private recover(): void {
        const lastValidIndex = this.persistenceManager.getLastLogicalIndex();
        this.logicalIndex = lastValidIndex;
        this.start();
    }

    public getStatus(): { logicalIndex: number; isRunning: boolean } {
        return {
            logicalIndex: this.logicalIndex,
            isRunning: this.isRunning
        };
    }
}