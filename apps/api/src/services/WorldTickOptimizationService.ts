import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Entity, WorldState, EntityTransformUpdate } from '@wasd/shared';
import { v4 as uuidv4 } from 'uuid';

/**
 * WorldTickOptimizationService
 * 
 * Realisiert einen deterministischen 10Hz World-Tick mit diskreten Frame-Nummern
 * und obligatorischer Sequence-ID Injection zur Gewährleistung der Kausalität.
 */
@Injectable()
export class WorldTickOptimizationService implements OnModuleDestroy {
  private readonly logger = new Logger(WorldTickOptimizationService.name);
  
  // 10Hz = 100ms Intervall
  private readonly TICK_INTERVAL_NS = BigInt(100) * BigInt(1_000_000);
  private readonly FRAMES_PER_SECOND = 10;
  
  private isRunning = false;
  private nextTickTimeNs: bigint = BigInt(0);
  private currentFrame: bigint = BigInt(0);
  private currentState: WorldState | null = null;
  private onTickCallback: ((state: WorldState) => void) | null = null;

  onModuleDestroy() {
    this.stopWorldTick();
  }

  /**
   * Startet den Scheduler mit initialem Frame-Zähler.
   */
  public startWorldTick(initialState: WorldState, callback: (state: WorldState) => void): void {
    if (this.isRunning) return;

    this.currentState = initialState;
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

      // Spiral of Death Protection
      if (now - this.nextTickTimeNs > this.TICK_INTERVAL_NS * BigInt(5)) {
        this.nextTickTimeNs = now + this.TICK_INTERVAL_NS;
        this.logger.warn('Kritischer Drift: Frame-Synchronisation erzwungen.');
      }
    }

    setImmediate(() => this.scheduleNext());
  }

  /**
   * Pipeline mit Sequence-ID Injection und Frame-Management.
   */
  private executeTick(): void {
    if (!this.currentState || !this.onTickCallback) return;

    const startTime = process.hrtime.bigint();
    
    // Inkrementiere diskreten Frame
    this.currentFrame++;
    
    // Generiere eindeutige Sequence-ID für diesen Tick
    const sequenceId = `seq_${this.currentFrame}_${uuidv4().split('-')[0]}`;

    // 1. AREStateCompiler Phase: Transformation mit Sequence-ID
    let nextState = this.compileAREState(this.currentState, sequenceId, this.currentFrame);

    // 2. ResonanceGrid Phase: Räumliche Validierung
    nextState = this.updateResonanceGrid(nextState, sequenceId);

    // 3. Optimization Phase: Frame-basiertes Throttling & Culling
    nextState = this.optimizeTick(nextState, sequenceId, this.currentFrame);
    
    // Performance-Metriken & Finaler State-Sync
    const endTime = process.hrtime.bigint();
    const durationMs = Number(endTime - startTime) / 1_000_000;

    nextState.performanceMetrics = {
      ...nextState.performanceMetrics,
      lastTickDurationMs: durationMs,
      thresholdMs: 80
    };

    this.currentState = nextState;
    this.onTickCallback(nextState);
  }

  /**
   * Injiziert Frame-Metadaten und Sequence-IDs in den WorldState.
   */
  private compileAREState(state: WorldState, sequenceId: string, frame: bigint): WorldState {
    return {
      ...state,
      frame: Number(frame),
      sequenceId: sequenceId,
      lastProcessedAt: Date.now()
    };
  }

  /**
   * Räumliche Partitionierung unter Berücksichtigung der Sequence-ID.
   */
  private updateResonanceGrid(state: WorldState, sequenceId: string): WorldState {
    // Hier würde die Grid-Logik die sequenceId nutzen, um Cache-Invalidierung zu steuern
    return { ...state, sequenceId };
  }

  /**
   * Kern-Optimierung basierend auf diskreten Frames statt Realzeit-Deltas.
   */
  public optimizeTick(currentState: WorldState, sequenceId: string, currentFrame: bigint): WorldState {
    const entities = currentState.entities as unknown as Record<string, Entity>;
    const performanceMetrics = currentState.performanceMetrics;
    const processedEntities: Record<string, Entity> = {};
    
    const metrics = performanceMetrics || { lastTickDurationMs: 0, thresholdMs: 80 };
    const isOverloaded = metrics.lastTickDurationMs > metrics.thresholdMs;
    
    // Frame-basierte Timeouts (50 Frames @ 10Hz = 5 Sekunden)
    const ZOMBIE_FRAME_THRESHOLD = BigInt(50);
    const entityEntries = Object.entries(entities);

    for (let i = 0; i < entityEntries.length; i++) {
      const [id, entity] = entityEntries[i];
      const lastUpdateFrame = BigInt(entity.lastUpdateFrame || currentFrame);
      
      // 1. Zombie-Check via Frame-Differenz
      if (currentFrame - lastUpdateFrame > ZOMBIE_FRAME_THRESHOLD) {
        continue;
      }

      let updatedEntity: Entity = { 
        ...entity,
        sequenceId: sequenceId // Mandatory Sequence Injection
      };
      let modified = false;

      // 2. Throttling-Logik
      const cpuCost = entity.cpuCost ?? 0;
      const priority = entity.priority ?? 0;

      if (isOverloaded && cpuCost > 15 && priority < 2) {
        updatedEntity.status = 'throttled';
        updatedEntity.cpuCost = cpuCost * 0.5;
        modified = true;
      } else if (!isOverloaded && updatedEntity.status === 'throttled') {
        if (metrics.lastTickDurationMs < (metrics.thresholdMs * 0.6)) {
          updatedEntity.status = 'active';
          updatedEntity.cpuCost = Math.min(100, cpuCost * 1.2);
          modified = true;
        }
      }

      // 3. Frame-basierte Regeneration (alle X Frames)
      // Jede 10 Frames (1s) 1 HP regenerieren
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