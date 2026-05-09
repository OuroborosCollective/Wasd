import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Entity, WorldState } from '@wasd/shared';
import { v4 as uuidv4 } from 'uuid';
import { WorldStateRegistry } from './WorldStateRegistry';
import { ATOAuthorizationService } from './ATOAuthorizationService';

/**
 * WorldTickOptimizationService
 * 
 * Deterministischer 10Hz World-Tick.
 * Kappa-Standard (1000) für Fixed-Point Berechnungen.
 * ATO-Validierung (Arelorian Transactional Orchestrator) für Zustandsübergänge.
 */
@Injectable()
export class WorldTickOptimizationService implements OnModuleDestroy {
  private readonly logger = new Logger(WorldTickOptimizationService.name);
  
  // Kappa Konstante für Fixed-Point Math
  private readonly KAPPA = 1000;
  // 10Hz = 100ms Intervall in Nanosekunden
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

    this.logger.log(`Arelorian Deterministic 10Hz Tick gestartet. Frame: ${this.currentFrame}`);
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
      this.executeTick().catch(err => {
        this.logger.error(`Tick Execution Error: ${err.message}`);
      });
      this.nextTickTimeNs += this.TICK_INTERVAL_NS;

      // Drift-Korrektur bei massiver Last (> 500ms Verzug)
      if (now - this.nextTickTimeNs > this.TICK_INTERVAL_NS * BigInt(5)) {
        this.nextTickTimeNs = now + this.TICK_INTERVAL_NS;
        this.logger.warn('Kritischer Drift erkannt: Frame-Synchronisation erzwungen.');
      }
    }

    // setImmediate hält den Loop am Leben ohne den Event-Loop für I/O zu blockieren
    setImmediate(() => this.scheduleNext());
  }

  /**
   * Pipeline: State Akquise -> ARE-Kompilierung -> Kappa-Optimierung -> ATO-Validierung -> Commit.
   */
  private async executeTick(): Promise<void> {
    const currentState = this.registry.getCurrentState();
    if (!currentState) return;

    const startTime = process.hrtime.bigint();
    this.currentFrame++;
    
    // Sequence-ID zur Wahrung der Kausalitäts-Kette nach ARE-Axiomen
    const sequenceId = `seq_${this.currentFrame}_${uuidv4().substring(0, 8)}`;

    // 1. AREStateCompiler: Transformation & Frame-Inkrement
    let nextState = this.compileAREState(currentState, sequenceId, this.currentFrame);

    // 2. Spatial Grid & Kappa Optimization
    nextState = this.updateResonanceGrid(nextState, sequenceId);
    nextState = this.optimizeTick(nextState, sequenceId, this.currentFrame);
    
    // 3. ATO-Autorisierung: Validiert Axiome bevor der State-Swap stattfindet
    const transitionAuthorized = await this.atoService.authorizeStateTransition(
      currentState, 
      nextState, 
      sequenceId
    );

    if (!transitionAuthorized) {
      this.logger.error(`ATO-Autorisierung für Frame ${this.currentFrame} verweigert. Axiom-Verletzung.`);
      return;
    }

    // 4. Performance Metriken & Finalisierung
    const endTime = process.hrtime.bigint();
    const durationMs = Number(endTime - startTime) / 1_000_000;

    nextState.performanceMetrics = {
      ...nextState.performanceMetrics,
      lastTickDurationMs: durationMs,
      thresholdMs: 80 // 80ms Budget für 100ms Tick
    };

    // Atomarer Registry-Swap (Single Source of Truth)
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
    // Hier wird die räumliche Partitionierung für Kollisionen/Interaktionen vorbereitet
    return { ...state, sequenceId };
  }

  public optimizeTick(currentState: WorldState, sequenceId: string, currentFrame: bigint): WorldState {
    const { entities, performanceMetrics } = currentState;
    const processedEntities: Record<string, Entity> = {};
    
    const metrics = performanceMetrics || { lastTickDurationMs: 0, thresholdMs: 80 };
    // Deterministische Last-Erkennung
    const isOverloaded = metrics.lastTickDurationMs > metrics.thresholdMs;
    
    const ZOMBIE_FRAME_THRESHOLD = BigInt(50);
    const entityEntries = Object.entries(entities);

    for (let i = 0; i < entityEntries.length; i++) {
      const [id, entity] = entityEntries[i];
      const lastUpdateFrame = BigInt(entity.lastUpdateFrame || currentFrame);
      
      // Entferne inaktive Entitäten aus dem aktiven Tick (Zombie-Pruning)
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

      // Kappa-Standard: Fixed-Point Laststeuerung
      if (isOverloaded && cpuCost > 15 && priority < 2) {
        updatedEntity.status = 'throttled';
        // Reduktion auf 50% via Kappa Math (500/1000)
        updatedEntity.cpuCost = Math.floor((cpuCost * 500) / this.KAPPA);
        modified = true;
      } else if (!isOverloaded && updatedEntity.status === 'throttled') {
        // Erholung wenn Last unter 60% (600/1000) des Schwellwerts
        if (metrics.lastTickDurationMs < Math.floor((metrics.thresholdMs * 600) / this.KAPPA)) {
          updatedEntity.status = 'active';
          // Erhöhung um 20% via Kappa Math (1200/1000)
          updatedEntity.cpuCost = Math.min(100, Math.floor((cpuCost * 1200) / this.KAPPA));
          modified = true;
        }
      }

      // Deterministische Regeneration alle 10 Frames (1Hz)
      if (currentFrame % BigInt(10) === BigInt(0)) {
        const currentHealth = updatedEntity.health ?? 0;
        if (currentHealth < 100) {
          updatedEntity.health = Math.min(100, currentHealth + 1);
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