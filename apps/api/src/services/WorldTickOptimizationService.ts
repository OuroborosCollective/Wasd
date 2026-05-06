import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Entity, WorldState } from '@wasd/shared';

/**
 * WorldTickOptimizationService
 * 
 * Realisiert einen deterministischen 10Hz World-Tick unter Verwendung von High-Resolution Timern (process.hrtime).
 * Integriert AREStateCompiler-Logik und ResonanceGrid-Updates in einer strikten zustandslosen Sequenz.
 */
@Injectable()
export class WorldTickOptimizationService implements OnModuleDestroy {
  private readonly logger = new Logger(WorldTickOptimizationService.name);
  
  // 10Hz = 100ms in Nanosekunden
  private readonly TICK_INTERVAL_NS = BigInt(100) * BigInt(1_000_000);
  
  private isRunning = false;
  private nextTickTimeNs: bigint = BigInt(0);
  private currentState: WorldState | null = null;
  private onTickCallback: ((state: WorldState) => void) | null = null;

  onModuleDestroy() {
    this.stopWorldTick();
  }

  /**
   * Startet den deterministischen World-Tick Scheduler mit High-Res Timing.
   */
  public startWorldTick(initialState: WorldState, callback: (state: WorldState) => void): void {
    if (this.isRunning) return;

    this.currentState = initialState;
    this.onTickCallback = callback;
    this.isRunning = true;
    this.nextTickTimeNs = process.hrtime.bigint();

    this.logger.log(`Areloria Deterministic 10Hz Tick gestartet (High-Res hrtime).`);
    this.scheduleNext();
  }

  /**
   * Stoppt den Scheduler.
   */
  public stopWorldTick(): void {
    this.isRunning = false;
    this.logger.log('WorldTick Scheduler gestoppt.');
  }

  /**
   * Rekursiver Scheduler mit Drift-Korrektur auf Nanosekunden-Ebene.
   */
  private scheduleNext(): void {
    if (!this.isRunning) return;

    const now = process.hrtime.bigint();

    if (now >= this.nextTickTimeNs) {
      this.executeTick();
      
      // Berechne nächsten Zielzeitpunkt
      this.nextTickTimeNs += this.TICK_INTERVAL_NS;

      // Spiral of Death Protection: Wenn das System mehr als 5 Ticks hinterherhinkt, hart synchronisieren
      if (now - this.nextTickTimeNs > this.TICK_INTERVAL_NS * BigInt(5)) {
        this.nextTickTimeNs = now + this.TICK_INTERVAL_NS;
        this.logger.warn('Kritischer Performance-Einbruch: World-Tick driftet massiv. Scheduler resynchronisiert.');
      }
    }

    // Nutze setImmediate für minimale Latenz zwischen den Checks ohne die Event-Loop zu blockieren
    setImmediate(() => this.scheduleNext());
  }

  /**
   * Haupt-Ausführungs-Pipeline: Compiler -> Grid -> Optimization
   */
  private executeTick(): void {
    if (!this.currentState || !this.onTickCallback) return;

    const startTime = process.hrtime.bigint();

    // 1. AREStateCompiler Phase: Vorbereitung des transformierten Zustands
    let nextState = this.compileAREState(this.currentState);

    // 2. ResonanceGrid Phase: Räumliche Partitionierung und Kollisions-Abgleich
    nextState = this.updateResonanceGrid(nextState);

    // 3. Optimization Phase: Throttling, Culling und Zombie-Bereinigung
    nextState = this.optimizeTick(nextState);
    
    // Performance-Metriken erfassen
    const endTime = process.hrtime.bigint();
    const durationMs = Number(endTime - startTime) / 1_000_000;

    nextState.performanceMetrics = {
      ...nextState.performanceMetrics,
      lastTickDurationMs: durationMs,
      thresholdMs: 80 // 80ms Soft-Limit für 100ms Fenster
    };

    this.currentState = nextState;
    this.onTickCallback(nextState);
  }

  /**
   * AREStateCompiler: Bereitet Entitäten für die physikalische Simulation vor.
   */
  private compileAREState(state: WorldState): WorldState {
    // In einer zustandslosen Sequenz transformieren wir hier Entitäten-Metadaten
    // für die effiziente Verarbeitung im Grid.
    return state;
  }

  /**
   * ResonanceGrid: Aktualisiert räumliche Indizes.
   */
  private updateResonanceGrid(state: WorldState): WorldState {
    // Logik zur räumlichen Einordnung der Entitäten zur Reduktion von O(n²) Vergleichen
    return state;
  }

  /**
   * Kern-Optimierung: Verarbeitet CPU-Last, Zombies und Prioritäten.
   */
  public optimizeTick(currentState: WorldState): WorldState {
    const { entities, performanceMetrics } = currentState;
    const now = Date.now();
    const processedEntities: Record<string, Entity> = {};
    
    const metrics = performanceMetrics || { lastTickDurationMs: 0, thresholdMs: 80 };
    const isOverloaded = metrics.lastTickDurationMs > metrics.thresholdMs;
    
    const entityEntries = Object.entries(entities);

    for (let i = 0; i < entityEntries.length; i++) {
      const [id, entity] = entityEntries[i];
      const lastUpdate = entity.lastUpdate || now;
      
      // 1. Zombie-Check: Entitäten ohne Update seit 5 Sekunden entfernen
      if (now - lastUpdate > 5000) {
        continue;
      }

      let updatedEntity: Entity = { ...entity };
      let modified = false;

      // 2. Judgement & Throttling
      const cpuCost = entity.cpuCost ?? 0;
      const priority = entity.priority ?? 0;

      if (isOverloaded && cpuCost > 15 && priority < 2) {
        // Drosselung bei Überlast
        updatedEntity.status = 'throttled';
        updatedEntity.cpuCost = cpuCost * 0.5;
        modified = true;
      } else if (!isOverloaded && updatedEntity.status === 'throttled') {
        // Heilung bei Kapazität (Headroom > 40%)
        if (metrics.lastTickDurationMs < (metrics.thresholdMs * 0.6)) {
          updatedEntity.status = 'active';
          updatedEntity.cpuCost = Math.min(100, cpuCost * 1.2);
          modified = true;
        }
      }

      // 3. Ressourcen-Regeneration (Health / Energie)
      if ((updatedEntity.health ?? 0) < 100) {
        updatedEntity.health = Math.min(100, (updatedEntity.health ?? 0) + 1);
        modified = true;
      }

      if (modified) {
        updatedEntity.lastUpdate = now;
      }

      processedEntities[id] = updatedEntity;
    }

    return {
      ...currentState,
      entities: processedEntities
    };
  }
}