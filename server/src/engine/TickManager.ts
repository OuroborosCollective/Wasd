import { MasterExpansionOrchestrator } from '../logic/MasterExpansionOrchestrator.js';

export class TickManager {
    private readonly TICK_INTERVAL_MS: number = 100;
    private orchestrator: MasterExpansionOrchestrator;
    private isRunning: boolean = false;
    private timer: NodeJS.Timeout | null = null;
    private tickSequence: number = 0;

    constructor(orchestrator: MasterExpansionOrchestrator) {
        this.orchestrator = orchestrator;
    }

    public start(): void {
        if (this.isRunning) return;
        this.isRunning = true;
        this.tickSequence = 0;
        this.timer = setInterval(() => {
            this.executeTick();
        }, this.TICK_INTERVAL_MS);
    }

    public stop(): void {
        this.isRunning = false;
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }

    public getCurrentTick(): number {
        return this.tickSequence;
    }

    private executeTick(): void {
        if (!this.isRunning) return;

        this.tickSequence += 1;

        // Execute primary logic via the MasterExpansionOrchestrator.
        // Runtime truth is carried by the logical tick sequence; the host timer is only cadence plumbing.
        this.orchestrator.processTick();
    }
}
