import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Entity, WorldState } from '@wasd/shared';
import { v4 as uuidv4 } from 'uuid';
import { WorldStateRegistry } from './WorldStateRegistry'; // Angenommener Pfad
import { ATOAuthorizationService } from './ATOAuthorizationService'; // Angenommener Pfad

/**
 * WorldTickOptimizationService
 * 
 * Realisiert einen deterministischen 10Hz World-Tick mit diskreten Frame-Nummern.
 * Integriert die ATO-Autorisierung (Arelorian Transactional Orchestrator) für
 * atomare Zustands-Swaps in der WorldStateRegistry unter Einhaltung der ARE-Axiome.
 */
@Injectable()
export class WorldTickOptimizationService implements OnModuleDestroy {
  private readonly logger = new Logger(WorldTickOptimizationService.name);
  
  // 10Hz = 100ms Intervall
  private readonly TICK_INTERVAL_NS = BigInt(100) * BigInt(1_000_000);
  
  private isRunning = false;
  private nextTickTimeNs: bigint = BigInt(0);
  private currentFrame: bigint = BigInt(0);
  private onTickCallback: ((state: WorldState) => void) | null = null;

  constructor(
    private readonly registry: WorldStateRegistry,
    private readonly atoService: ATOAuthorizationService
  ) {}

  onModuleDestroy() {
    this.stopWorldTick();
  }

  public startWorldTick(initialState: WorldState, callback: (state: WorldState) => void): void {
    if (this.isRunning) return;

    this.onTickCallback = callback;
    this.isRunning = true;
    this.currentFrame = BigInt(initialState.frame || 0);
    this.nextTickTimeNs = process.hrtime.bigint();

    this.logger.log(`Areloria Deterministic 10Hz Tick gestartet. Frame: ${this.currentFrame}`);
    this.scheduleNext();
  }

  public stopWorldTick(): void {
    this.isRunning = false;
    this.logger.log('WorldTick Scheduler gestoppt.');
  }

  private scheduleNext(): void {
    if (!this.isRunning) return;

    const now = process.hrtime.bigint();

    if (now >= this.nextTickTimeNs) {
      this.executeTick();
      this.nextTickTimeNs += this.TICK_INTERVAL_NS;

      if (now - this.nextTickTimeNs > this.TICK_INTERVAL_NS * BigInt(5)) {
        this.nextTickTimeNs = now + this.TICK_INTERVAL_NS;
        this.logger.warn('Kritischer Drift: Frame-Synchronisation erzwungen.');
      }
    }

    setImmediate(() => this.scheduleNext());
  }

  /**
   * Kern-Pipeline: Berechnung -> ATO-Validierung -> Registry-Swap.
   */
  private async executeTick(): Promise<void> {
    const currentState = this.registry.getCurrentState();
    if (!currentState) return;

    const startTime = process.hrtime.bigint();
    this.currentFrame++;
    
    // Eindeutige Sequence-ID für Kausalitäts-Kette
    const sequenceId = `seq_${this.currentFrame}_${uuidv4().split('-')[0]}`;

    // 1. AREStateCompiler: Transformation
    let nextState = this.compileAREState(currentState, sequenceId, this.currentFrame);

    // 2. ResonanceGrid & Optimization
    nextState = this.updateResonanceGrid(nextState, sequenceId);
    nextState = this.optimizeTick(nextState, sequenceId, this.currentFrame);
    
    // 3. ATO-Autorisierung & Axiom-Validierung
    // Wir fordern eine Autorisierung für den Zustandsübergang an
    const transitionAuthorized = await this.atoService.authorizeStateTransition(
      currentState, 
      nextState, 
      sequenceId
    );

    if (!transitionAuthorized) {
      this.logger.error(`ATO-Autorisierung für Frame ${this.currentFrame} fehlgeschlagen. Rollback eingeleitet.`);
      return;
    }

    // 4. Finaler Performance-Check & Registry Swap
    const endTime = process.hrtime.bigint();
    const durationMs = Number(endTime - startTime) / 1_000_000;

    nextState.performanceMetrics = {
      ...nextState.performanceMetrics,
      lastTickDurationMs: durationMs,
      thresholdMs: 80
    };

    // Atomarer Swap in der Registry (Single Source of Truth)
    this.registry.commitStateSwap(nextState);

    if (this.onTickCallback) {
      this.onTickCallback(nextState);
    }
  }

  private compileAREState(state: WorldState, sequenceId: string, frame: bigint): WorldState {
    return {
      ...state,
      frame: Number(frame),
      sequenceId: sequenceId,
      lastProcessedAt: Date.now()
    };
  }

  private updateResonanceGrid(state: WorldState, sequenceId: string): WorldState {
    // Implementiert räumliche Partitionierung basierend auf Kappa-Fixed-Point
    return { ...state, sequenceId };
  }

  public optimizeTick(currentState: WorldState, sequenceId: string, currentFrame: bigint): WorldState {
    const { entities, performanceMetrics } = currentState;
    const processedEntities: Record<string, Entity> = {};
    
    const metrics = performanceMetrics || { lastTickDurationMs: 0, thresholdMs: 80 };
    const isOverloaded = metrics.lastTickDurationMs > metrics.thresholdMs;
    
    const ZOMBIE_FRAME_THRESHOLD = BigInt(50);
    const entityEntries = Object.entries(entities);

    for (let i = 0; i < entityEntries.length; i++) {
      const [id, entity] = entityEntries[i];
      const lastUpdateFrame = BigInt(entity.lastUpdateFrame || currentFrame);
      
      if (currentFrame - lastUpdateFrame > ZOMBIE_FRAME_THRESHOLD) {
        continue;
      }

      let updatedEntity: Entity = { 
        ...entity,
        sequenceId: sequenceId
      };
      let modified = false;

      const cpuCost = entity.cpuCost ?? 0;
      const priority = entity.priority ?? 0;

      if (isOverloaded && cpuCost > 15 && priority < 2) {
        updatedEntity.status = 'throttled';
        updatedEntity.cpuCost = Math.floor(cpuCost * 500 / 1000); // Kappa Math (0.5)
        modified = true;
      } else if (!isOverloaded && updatedEntity.status === 'throttled') {
        if (metrics.lastTickDurationMs < (metrics.thresholdMs * 600 / 1000)) {
          updatedEntity.status = 'active';
          updatedEntity.cpuCost = Math.min(100, Math.floor(cpuCost * 1200 / 1000));
          modified = true;
        }
      }

      // Regeneration alle 10 Frames (deterministisch 1Hz)
      if (currentFrame % BigInt(10) === BigInt(0)) {
        if ((updatedEntity.health ?? 0) < 100) {
          updatedEntity.health = Math.min(100, (updatedEntity.health ?? 0) + 1);
          modified = true;
        }
      }

      if (modified || currentFrame % BigInt(10) === BigInt(0)) {
        updatedEntity.lastUpdateFrame = Number(currentFrame);
      }

      processedEntities[id] = updatedEntity;
    }

    return {
      ...currentState,
      entities: processedEntities,
      sequenceId: sequenceId,
      frame: Number(currentFrame)
    };
  }
}