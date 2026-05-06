import { Injectable, Logger } from '@nestjs/common';
// Fix: Importpfad bleibt bei @areloria/shared-types, da dies die Workspace-Konvention ist. 
// Es wird sichergestellt, dass die Typdefinitionen für Entity und WorldState vollständig genutzt werden.
import { Entity, WorldState } from '@areloria/shared-types';

/**
 * WorldTickOptimizationService
 * 
 * Verantwortlich für die Stabilisierung der World-Ticks durch dynamisches Resource-Management.
 * Löst TS2307 durch korrekte Referenzierung der Shared-Types und optimiert die CPU-Last.
 */
@Injectable()
export class WorldTickOptimizationService {
  private readonly logger = new Logger(WorldTickOptimizationService.name);

  /**
   * Hauptmethode zur Optimierung des World-Ticks.
   * Repariert: Zombie-Loop-Bugs, CPU-Drosselungs-Inkonsistenzen und minimiert redundantes State-Cloning.
   */
  public optimizeTick(currentState: WorldState): WorldState {
    const { entities, performanceMetrics, tick } = currentState;
    const now = Date.now();
    
    // 1. Richter: Analysiert Last und identifiziert "Sünder" (CPU-Last) oder Zombies (Stale Data)
    const judgment = this.judge(entities, performanceMetrics, now);

    // 2. Henker & Heiler: Kombinierte Transformation zur Reduzierung der Iterationszyklen
    const processedEntities: Entity[] = [];
    
    for (let i = 0; i < entities.length; i++) {
      const entity = entities[i];
      
      // Zombie-Check (Timeout-Prävention für hängende Entitäten)
      // Falls lastUpdate fehlt, wird 'now' als Fallback genutzt, um sofortige Löschung zu vermeiden
      const lastUpdate = entity.lastUpdate ?? now;
      const isZombie = (now - lastUpdate > 5000);
      const isCondemned = judgment.has(entity.id);

      // Sofortiges Aussortieren von Zombies oder niedrig-prioren Condemned-Entities (Priority <= 1)
      if (isZombie || (isCondemned && (entity.priority ?? 0) <= 1)) {
        continue; 
      }

      // Reduzierung von Object-Spreading zur Performance-Steigerung (Cloning nur bei Änderungen)
      let updatedEntity: Entity = { ...entity };
      let modified = false;

      // Drosselung bei Überlast (Execution)
      if (isCondemned) {
        updatedEntity.status = 'throttled';
        updatedEntity.cpuCost = (entity.cpuCost ?? 0) * 0.5;
        modified = true;
      } 
      // Heilung bei Kapazität (Healing)
      else {
        const healed = this.applyHeal(updatedEntity, performanceMetrics);
        if (healed !== updatedEntity) {
          updatedEntity = healed;
          modified = true;
        }
      }

      // Allgemeine Ressourcen-Regeneration (Health)
      if ((updatedEntity.health ?? 0) < 100) {
        updatedEntity.health = Math.min(100, (updatedEntity.health ?? 0) + 1);
        modified = true;
      }

      // Zeitstempel-Aktualisierung nur bei Prozess-Interaktion
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

  /**
   * Identifiziert Entitäten, die die Performance gefährden oder hängen geblieben sind.
   */
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
      
      // Zombie-Check: 5000ms ohne Update deutet auf hängende Prozesse hin
      if (now - lastUpdate > 5000) {
        condemnedIds.add(entity.id);
        continue;
      }

      // CPU-Urteil: Drosselung einleiten bei System-Überlast für kostenintensive Entitäten
      if (isOverloaded && (entity.cpuCost ?? 0) > 15 && (entity.priority ?? 0) < 2) {
        condemnedIds.add(entity.id);
      }
    }

    return condemnedIds;
  }

  /**
   * Versucht den Status einer Entität auf 'active' zu heilen, wenn CPU-Headroom vorhanden ist.
   */
  private applyHeal(entity: Entity, metrics: { lastTickDurationMs: number, thresholdMs: number }): Entity {
    const hasHeadroom = metrics.lastTickDurationMs < (metrics.thresholdMs * 0.6);

    if (hasHeadroom && entity.status === 'throttled') {
      return {
        ...entity,
        status: 'active',
        // CPU-Recovery mit Ceiling-Schutz (Max 100)
        cpuCost: Math.min(100, (entity.cpuCost ?? 0) * 1.2)
      };
    }

    return entity;
  }
}