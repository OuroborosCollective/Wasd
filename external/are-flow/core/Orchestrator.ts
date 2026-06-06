import { PersistenceManager } from "./PersistenceManager";

export interface TickData {
  logicalIndex: number;
  simulationTimeMs: number;
  wallClockTimeMs: number;
  data: Record<string, unknown>;
}

export interface OrchestratorStatus {
  logicalIndex: number;
  simulationTimeMs: number;
  isRunning: boolean;
  isRecovering: boolean;
  droppedFrames: number;
  lastError: string | null;
}

export class Orchestrator {
  private logicalIndex = 0;
  private simulationTimeMs = 0;

  private isRunning = false;
  private isRecovering = false;

  private timer: NodeJS.Timeout | null = null;

  private lastWallClockTimeMs = 0;
  private accumulatorMs = 0;

  private droppedFrames = 0;
  private lastError: string | null = null;
  private consecutiveErrors = 0;

  private static readonly TICK_MS = 100;
  private static readonly MAX_CATCH_UP_TICKS = 5;
  private static readonly MAX_CONSECUTIVE_ERRORS = 3;

  constructor(private readonly persistenceManager: PersistenceManager) {}

  public start(): void {
    if (this.isRunning) return;

    const lastPersistedIndex = this.persistenceManager.getLastLogicalIndex();

    if (lastPersistedIndex > this.logicalIndex) {
      this.logicalIndex = lastPersistedIndex;
      this.simulationTimeMs = this.logicalIndex * Orchestrator.TICK_MS;
    }

    this.isRunning = true;
    this.isRecovering = false;
    this.lastWallClockTimeMs = Date.now();
    this.accumulatorMs = 0;

    this.timer = setInterval(() => {
      this.cycle();
    }, Orchestrator.TICK_MS);
  }

  public stop(): void {
    this.isRunning = false;

    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private cycle(): void {
    if (!this.isRunning || this.isRecovering) return;

    const now = Date.now();
    const elapsed = now - this.lastWallClockTimeMs;
    this.lastWallClockTimeMs = now;

    this.accumulatorMs += elapsed;

    let ticksToProcess = Math.floor(this.accumulatorMs / Orchestrator.TICK_MS);

    if (ticksToProcess <= 0) return;

    if (ticksToProcess > Orchestrator.MAX_CATCH_UP_TICKS) {
      const dropped = ticksToProcess - Orchestrator.MAX_CATCH_UP_TICKS;
      this.droppedFrames += dropped;
      ticksToProcess = Orchestrator.MAX_CATCH_UP_TICKS;

      this.accumulatorMs = Orchestrator.MAX_CATCH_UP_TICKS * Orchestrator.TICK_MS;

      console.warn(
        `[Orchestrator] Tick backlog too large. Dropping ${dropped} catch-up ticks.`
      );
    }

    for (let i = 0; i < ticksToProcess; i++) {
      const ok = this.safeExecuteTick();

      if (!ok) {
        return;
      }

      this.accumulatorMs -= Orchestrator.TICK_MS;
    }
  }

  private safeExecuteTick(): boolean {
    try {
      this.executeTick();
      this.consecutiveErrors = 0;
      this.lastError = null;
      return true;
    } catch (error) {
      this.handleProcessingError(error);
      return false;
    }
  }

  private executeTick(): void {
    const nextLogicalIndex = this.logicalIndex + 1;
    const nextSimulationTimeMs = nextLogicalIndex * Orchestrator.TICK_MS;

    const tickData: TickData = {
      logicalIndex: nextLogicalIndex,
      simulationTimeMs: nextSimulationTimeMs,
      wallClockTimeMs: Date.now(),
      data: {},
    };

    /**
     * Wichtig:
     * Persistenz passiert VOR dem lokalen Commit.
     * Dadurch gilt:
     * - Wenn Persistenz scheitert, bleibt logicalIndex unverändert.
     * - Kein Phantom-Tick.
     * - Kein halb gespeicherter Zustand.
     */
    this.persistenceManager.persist(tickData);

    this.logicalIndex = nextLogicalIndex;
    this.simulationTimeMs = nextSimulationTimeMs;

    this.validateSynchronization();
  }

  private validateSynchronization(): void {
    const persistedIndex = this.persistenceManager.getLastLogicalIndex();

    if (persistedIndex !== this.logicalIndex) {
      throw new Error(
        `Synchronization mismatch: local=${this.logicalIndex}, persisted=${persistedIndex}`
      );
    }
  }

  private handleProcessingError(error: unknown): void {
    this.consecutiveErrors++;

    this.lastError =
      error instanceof Error ? error.message : String(error);

    console.error("[Orchestrator] Tick error:", this.lastError);

    if (this.consecutiveErrors >= Orchestrator.MAX_CONSECUTIVE_ERRORS) {
      console.error(
        `[Orchestrator] Fatal loop protection triggered after ${this.consecutiveErrors} errors.`
      );

      this.stop();
      return;
    }

    this.recover();
  }

  private recover(): void {
    this.isRecovering = true;

    try {
      const lastValidIndex = this.persistenceManager.getLastLogicalIndex();

      this.logicalIndex = lastValidIndex;
      this.simulationTimeMs = lastValidIndex * Orchestrator.TICK_MS;

      this.accumulatorMs = 0;
      this.lastWallClockTimeMs = Date.now();

      console.warn(
        `[Orchestrator] Recovered to logicalIndex=${this.logicalIndex}`
      );
    } catch (error) {
      this.lastError =
        error instanceof Error ? error.message : String(error);

      console.error("[Orchestrator] Recovery failed:", this.lastError);
      this.stop();
    } finally {
      this.isRecovering = false;
    }
  }

  public getStatus(): OrchestratorStatus {
    return {
      logicalIndex: this.logicalIndex,
      simulationTimeMs: this.simulationTimeMs,
      isRunning: this.isRunning,
      isRecovering: this.isRecovering,
      droppedFrames: this.droppedFrames,
      lastError: this.lastError,
    };
  }
}
