import { Injectable, Logger } from '@nestjs/common';
import { Entity, WorldState } from '@areloria/shared-types';

@Injectable()
export class WorldTickOptimizationService {
  private readonly logger = new Logger(WorldTickOptimizationService.name);

  /**
   * Hauptmethode zur Optimierung des World-Ticks.
   * Repariert: Zombie-Loop-Bugs, CPU-Drosselungs-Inkonsistenzen und minimiert redundantes State-Cloning.
   */
  public optimizeTick(currentState: WorldState): WorldState {
    const { entities, performanceMetrics } = currentState;
    const now = Date.now();
    
    // 1. Richter: Analysiert Last und identifiziert "Sünder" (CPU-Last) oder Zombies (Stale Data)
    const judgment = this.judge(entities, performanceMetrics, now);

    // 2. Henker & Heiler: Kombinierte Transformation zur Reduzierung der Iterationszyklen
    const processedEntities: Entity[] = [];
    
    for (const entity of entities) {
      // Zombie-Check (Timeout-Prävention für hängende Entitäten)
      const isZombie = (now - entity.lastUpdate > 5000);
      const isCondemned = judgment.has(entity.id);

      // Sofortiges Aussortieren von Zombies oder niedrig-prioren Condemned-Entities
      if (isZombie || (isCondemned && entity.priority <= 1)) {
        continue; 
      }

      let updatedEntity = { ...entity };

      // Drosselung bei Überlast (Execution)
      if (isCondemned) {
        updatedEntity.status = 'throttled';
        updatedEntity.cpuCost = entity.cpuCost * 0.5;
      } 
      // Heilung bei Kapazität (Healing)
      else {
        updatedEntity = this.applyHeal(updatedEntity, performanceMetrics);
      }

      // Allgemeine Ressourcen-Regeneration
      if (updatedEntity.health < 100) {
        updatedEntity.health = Math.min(100, updatedEntity.health + 1);
      }

      processedEntities.push(updatedEntity);
    }

    return {
      ...currentState,
      entities: processedEntities,
      tick: currentState.tick + 1
    };
  }

  private judge(entities: Entity[], metrics: { lastTickDurationMs: number, thresholdMs: number }, now: number): Set<string> {
    const condemnedIds = new Set<string>();
    const isOverloaded = metrics.lastTickDurationMs > metrics.thresholdMs;

    for (let i = 0; i < entities.length; i++) {
      const entity = entities[i];
      
      // Zombie-Check: 5000ms ohne Update deutet auf hängende Prozesse hin
      if (now - entity.lastUpdate > 5000) {
        condemnedIds.add(entity.id);
        continue;
      }

      // CPU-Urteil: Drosselung einleiten bei System-Überlast
      if (isOverloaded && entity.cpuCost > 15 && entity.priority < 2) {
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
        // CPU-Recovery mit Ceiling-Schutz (Max 100)
        cpuCost: Math.min(100, entity.cpuCost * 1.2)
      };
    }

    return entity;
  }
}