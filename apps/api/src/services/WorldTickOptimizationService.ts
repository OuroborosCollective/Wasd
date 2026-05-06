import { Injectable, Logger } from '@nestjs/common';
import { Entity, WorldState, Vector3 } from '@areloria/shared-types';

@Injectable()
export class WorldTickOptimizationService {
  private readonly logger = new Logger(WorldTickOptimizationService.name);

  /**
   * Hauptmethode zur Optimierung des World-Ticks.
   * Repariert: Zombie-Loop-Bugs, CPU-Drosselungs-Inkonsistenzen und State-Cloning.
   * Verwendet zentrale Typen zur Sicherstellung der Synchronität.
   */
  public optimizeTick(currentState: WorldState): WorldState {
    const { entities, performanceMetrics } = currentState;
    const now = Date.now();
    
    // 1. Richter: Analysiert Last und identifiziert "Sünder" oder Zombies
    const judgment = this.judge(entities, performanceMetrics, now);

    // 2. Henker: Führt Drosselung oder Markierung zur Löschung aus
    const processedEntities = this.execute(entities, judgment, now);

    // 3. Heiler: Stellt Kapazitäten wieder her, falls Headroom vorhanden
    const healedEntities = this.heal(processedEntities, performanceMetrics, judgment);

    return {
      ...currentState,
      entities: healedEntities.filter(e => !e.isMarkedForDeletion),
      tick: currentState.tick + 1
    };
  }

  private judge(
    entities: Entity[], 
    metrics: { lastTickDurationMs: number; thresholdMs: number }, 
    now: number
  ): Set<string> {
    const condemnedIds = new Set<string>();
    const isOverloaded = metrics.lastTickDurationMs > metrics.thresholdMs;

    for (const entity of entities) {
      // Last-Urteil: Identifikation von CPU-intensiven Entities bei Überlast
      if (isOverloaded && entity.cpuCost > 15 && entity.priority < 2) {
        condemnedIds.add(entity.id);
        continue;
      }
      
      // Zombie-Check: 5000ms ohne Update deutet auf hängende Prozesse oder Verbindungsverlust hin
      if (now - entity.lastUpdate > 5000) {
        condemnedIds.add(entity.id);
      }
    }

    return condemnedIds;
  }

  private execute(entities: Entity[], condemnedIds: Set<string>, now: number): Entity[] {
    return entities.map(entity => {
      if (condemnedIds.has(entity.id)) {
        const isZombie = (now - entity.lastUpdate > 5000);
        
        // Logik-Fix: Zombies müssen zwingend gelöscht werden, sonst entstehen Endlos-Drosselungs-Loops
        if (entity.priority <= 1 || isZombie) {
          return { ...entity, isMarkedForDeletion: true };
        } else {
          // Soft-Drosselung für Entities mit höherer Priorität
          return { 
            ...entity, 
            status: 'throttled', 
            cpuCost: entity.cpuCost * 0.5 
          };
        }
      }
      return entity;
    });
  }

  private heal(
    entities: Entity[], 
    metrics: { lastTickDurationMs: number; thresholdMs: number }, 
    judgment: Set<string>
  ): Entity[] {
    const hasHeadroom = metrics.lastTickDurationMs < (metrics.thresholdMs * 0.6);

    return entities.map(entity => {
      if (entity.isMarkedForDeletion) return entity;

      let healedEntity = { ...entity };

      // Logik-Fix: Nur heilen, wenn nicht im selben Tick verurteilt (Inkonsistenz-Vermeidung)
      if (hasHeadroom && healedEntity.status === 'throttled' && !judgment.has(entity.id)) {
        healedEntity = {
          ...healedEntity,
          status: 'active',
          // CPU-Recovery mit Ceiling-Schutz (Max 100)
          cpuCost: Math.min(100, healedEntity.cpuCost * 1.2)
        };
      }

      // Ressourcen-Heilung (Health-Regeneration)
      if (healedEntity.health < 100) {
        healedEntity = {
          ...healedEntity,
          health: Math.min(100, healedEntity.health + 1)
        };
      }

      return healedEntity;
    });
  }
}