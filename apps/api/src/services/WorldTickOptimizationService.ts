import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Entity, WorldState } from '@areloria/shared-types';

/**
 * WorldTickOptimizationService
 * 
 * Verantwortlich für die Stabilisierung der World-Ticks durch dynamisches Resource-Management
 * und einen deterministischen Scheduler zur Eliminierung von Drift unter Last.
 */
@Injectable()
export class WorldTickOptimizationService implements OnModuleDestroy {
  private readonly logger = new Logger(WorldTickOptimizationService.name);
  private readonly TICK_INTERVAL = 100;
  
  private isRunning = false;
  private nextTickTime = 0;
  private currentState: WorldState | null = null;
  private onTickCallback: ((state: WorldState) => void) | null = null;

  onModuleDestroy() {
    this.stopWorldTick();
  }

  /**
   * Startet den deterministischen World-Tick Scheduler.
   * Ersetzt setInterval durch rekursive setImmediate-Schleife zur Drift-Prävention.
   */
  public startWorldTick(initialState: WorldState, callback: (state: WorldState) => void): void {
    if (this.isRunning) return;

    this.currentState = initialState;
    this.onTickCallback = callback;
    this.isRunning = true;
    this.nextTickTime = Date.now();

    this.logger.log(`WorldTick Scheduler gestartet. Intervall: ${this.TICK_INTERVAL}ms`);
    this.scheduleNext();
  }

  /**
   * Stoppt die Tick-Schleife.
   */
  public stopWorldTick(): void {
    this.isRunning = false;
    this.logger.log('WorldTick Scheduler gestoppt.');
  }

  /**
   * Interner rekursiver Scheduler. 
   * Gleicht Zeitdrift ab und stellt sicher, dass Ticks deterministisch gefeuert werden.
   */
  private scheduleNext(): void {
    if (!this.isRunning) return;

    const now = Date.now();

    // Falls die aktuelle Zeit den geplanten nächsten Tick erreicht oder überschritten hat
    if (now >= this.nextTickTime) {
      this.executeTick();
      // Inkrementeller Abgleich zur Vermeidung von Drift-Akkumulation
      this.nextTickTime += this.TICK_INTERVAL;

      // Schutz gegen "Spiral of Death": Falls das System massiv hinterherhinkt, Zeitstempel anpassen
      if (now - this.nextTickTime > this.TICK_INTERVAL * 5) {
        this.nextTickTime = now;
        this.logger.warn('Massiver Tick-Drift erkannt. Scheduler synchronisiert neu.');
      }
    }

    setImmediate(() => this.scheduleNext());
  }

  /**
   * Führt die eigentliche Optimierungslogik und Zustandsaktualisierung aus.
   */
  private executeTick(): void {
    if (!this.currentState || !this.onTickCallback) return;

    const startTime = Date.now();
    const optimizedState = this.optimizeTick(this.currentState);
    
    // Performance-Metriken für den nächsten Cycle aktualisieren
    const duration = Date.now() - startTime;
    optimizedState.performanceMetrics = {
      ...optimizedState.performanceMetrics,
      lastTickDurationMs: duration,
      thresholdMs: this.TICK_INTERVAL * 0.8 // 80% des Intervalls als Soft-Limit
    };

    this.currentState = optimizedState;
    this.onTickCallback(optimizedState);
  }

  /**
   * Hauptmethode zur Optimierung des World-Ticks.
   * Repariert: Zombie-Loop-Bugs, CPU-Drosselungs-Inkonsistenzen und minimiert redundantes State-Cloning.
   */
  public optimizeTick(currentState: WorldState): WorldState {
    const { entities, performanceMetrics, tick } = currentState;
    const now = Date.now();
    
    const judgment = this.judge(entities, performanceMetrics, now);
    const processedEntities: Entity[] = [];
    
    for (let i = 0; i < entities.length; i++) {
      const entity = entities[i];
      
      const lastUpdate = entity.lastUpdate ?? now;
      const isZombie = (now - lastUpdate > 5000);
      const isCondemned = judgment.has(entity.id);

      // Sofortiges Aussortieren von Zombies oder niedrig-prioren Condemned-Entities
      if (isZombie || (isCondemned && (entity.priority ?? 0) <= 1)) {
        continue; 
      }

      let updatedEntity: Entity = { ...entity };
      let modified = false;

      // Drosselung bei Überlast
      if (isCondemned) {
        updatedEntity.status = 'throttled';
        updatedEntity.cpuCost = (entity.cpuCost ?? 0) * 0.5;
        modified = true;
      } 
      // Heilung bei Kapazität
      else {
        const healed = this.applyHeal(updatedEntity, performanceMetrics);
        if (healed !== updatedEntity) {
          updatedEntity = healed;
          modified = true;
        }
      }

      // Ressourcen-Regeneration
      if ((updatedEntity.health ?? 0) < 100) {
        updatedEntity.health = Math.min(100, (updatedEntity.health ?? 0) + 1);
        modified = true;
      }

      if (modified) {
        updatedEntity.lastUpdate = now;
      }

      processedEntities.push(updatedEntity);
    }

    return {
      ...currentState,
      entities: processedEntities,
      tick: tick + 1
    };
  }

  private judge(
    entities: Entity[], 
    metrics: { lastTickDurationMs: number, thresholdMs: number }, 
    now: number
  ): Set<string> {
    const condemnedIds = new Set<string>();
    const isOverloaded = metrics.lastTickDurationMs > metrics.thresholdMs;

    for (let i = 0; i < entities.length; i++) {
      const entity = entities[i];
      const lastUpdate = entity.lastUpdate ?? now;
      
      if (now - lastUpdate > 5000) {
        condemnedIds.add(entity.id);
        continue;
      }

      if (isOverloaded && (entity.cpuCost ?? 0) > 15 && (entity.priority ?? 0) < 2) {
        condemnedIds.add(entity.id);
      }
    }

    return condemnedIds;
  }

  private applyHeal(entity: Entity, metrics: { lastTickDurationMs: number, thresholdMs: number }): Entity {
    const hasHeadroom = metrics.lastTickDurationMs < (metrics.thresholdMs * 0.6);

    if (hasHeadroom && entity.status === 'throttled') {
      return {
        ...entity,
        status: 'active',
        cpuCost: Math.min(100, (entity.cpuCost ?? 0) * 1.2)
      };
    }

    return entity;
  }
}