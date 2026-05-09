import { MasterExpansionOrchestrator } from '../logic/MasterExpansionOrchestrator';

export class TickManager {
    private readonly TICK_INTERVAL_MS: number = 100;
    private orchestrator: MasterExpansionOrchestrator;
    private isRunning: boolean = false;
    private nextTickTime: number = 0;
    private timer: NodeJS.Timeout | null = null;

    constructor(orchestrator: MasterExpansionOrchestrator) {
        this.orchestrator = orchestrator;
    }

    public start(): void {
        if (this.isRunning) return;
        this.isRunning = true;
        this.nextTickTime = Date.now() + this.TICK_INTERVAL_MS;
        this.scheduleTick();
    }

    public stop(): void {
        this.isRunning = false;
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }
    }

    private scheduleTick(): void {
        if (!this.isRunning) return;

        const now = Date.now();
        const delay = Math.max(0, this.nextTickTime - now);

        this.timer = setTimeout(() => {
            this.executeTick();
        }, delay);
    }

    private executeTick(): void {
        if (!this.isRunning) return;

        // Execute primary logic via the MasterExpansionOrchestrator
        // This ensures combat results and building logic are processed in the same atomic step
        this.orchestrator.processTick();

        // Calculate next tick with zero-drift compensation
        this.nextTickTime += this.TICK_INTERVAL_MS;

        // If we are lagging behind more than one interval, catch up to current time
        const now = Date.now();
        if (this.nextTickTime < now) {
            this.nextTickTime = now + this.TICK_INTERVAL_MS;
        }

        this.scheduleTick();
    }
}