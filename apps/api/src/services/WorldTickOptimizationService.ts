import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Entity, WorldState } from '@areloria/shared-types';
import { ResonanceGridService } from './ResonanceGridService';

/**
 * WorldTickOptimizationService
 * 
 * Zentraler Scheduler für die Spielwelt-Simulation.
 * Optimiert die Tick-Rate, verhindert Zeit-Drift und integriert das ResonanceGrid
 * zur Steuerung der NPC-Logik basierend auf Feld-Gradienten.
 */
@Injectable()
export class WorldTickOptimizationService implements OnModuleDestroy {
  private readonly logger = new Logger(WorldTickOptimizationService.name);
  private readonly TICK_INTERVAL = 100; // 10Hz Tick Rate für Server-Logik
  
  private isRunning = false;
  private nextTickTime = 0;
  private currentState: WorldState | null = null;
  private onTickCallback: ((state: WorldState) => void) | null = null;

  constructor(private readonly resonanceGridService: ResonanceGridService) {}

  onModuleDestroy() {
    this.stopWorldTick();
  }

  /**
   * Startet den deterministischen World-Tick Scheduler.
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
   * Interner rekursiver Scheduler mit Drift-Kompensation.
   */
  private scheduleNext(): void {
    if (!this.isRunning) return;

    const now = Date.now();

    if (now >= this.nextTickTime) {
      this.executeTick();
      this.nextTickTime += this.TICK_INTERVAL;

      if (now - this.nextTickTime > this.TICK_INTERVAL * 5) {
        this.nextTickTime = now;
        this.logger.warn('Kritischer Tick-Drift erkannt. Scheduler resynchronisiert.');
      }
    }

    setImmediate(() => this.scheduleNext());
  }

  /**
   * Führt die Simulationsschritte für einen Tick aus.
   */
  private executeTick(): void {
    if (!this.currentState || !this.onTickCallback) return;

    const startTime = Date.now();
    
    // 1. Resonance Grid Update (Decay & Diffusion)
    this.resonanceGridService.step();

    // 2. State Transformation & NPC Logic
    const optimizedState = this.optimizeTick(this.currentState);
    
    const duration = Date.now() - startTime;
    optimizedState.performanceMetrics = {
      ...optimizedState.performanceMetrics,
      lastTickDurationMs: duration,
      thresholdMs: this.TICK_INTERVAL * 0.8
    };

    this.currentState = optimizedState;
    this.onTickCallback(optimizedState);
  }

  /**
   * Haupt-Transformationslogik für den Weltzustand.
   */
  public optimizeTick(currentState: WorldState): WorldState {
    const { entities, performanceMetrics, tick } = currentState;
    const now = Date.now();
    
    const judgment = this.judge(entities, performanceMetrics, now);
    const processedEntities: Entity[] = [];
    
    for (let i = 0; i < entities.length; i++) {
      const entity = entities[i];
      
      const lastUpdate = entity.lastUpdate ?? now;
      const isZombie = (now - lastUpdate > 10000); // 10s Timeout
      const isCondemned = judgment.has(entity.id);

      if (isZombie || (isCondemned && (entity.priority ?? 0) <= 1)) {
        continue; 
      }

      let updatedEntity: Entity = { ...entity };
      let modified = false;

      // KI-Logik: NPC Entscheidungsfindung via Resonance-Gradients
      if (entity.type === 'npc' && entity.position) {
        const decision = this.calculateNpcAction(entity);
        if (decision.moved) {
          updatedEntity.position = decision.newPosition;
          updatedEntity.velocity = decision.newVelocity;
          modified = true;
        }
      }

      // Performance Drosselung
      if (isCondemned) {
        updatedEntity.status = 'throttled';
        updatedEntity.cpuCost = (entity.cpuCost ?? 0) * 0.5;
        modified = true;
      } else {
        const healed = this.applyHeal(updatedEntity, performanceMetrics);
        if (healed !== updatedEntity) {
          updatedEntity = healed;
          modified = true;
        }
      }

      // Ressourcen-Regeneration (Standard-RPG Logik)
      if (updatedEntity.stats && (updatedEntity.stats.health ?? 0) < 100) {
        updatedEntity.stats.health = Math.min(100, (updatedEntity.stats.health ?? 0) + 0.5);
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
      tick: tick + 1,
      // Grid-Daten für Frontend-Visualisierung/Debugging mitsenden
      resonanceData: this.resonanceGridService.getSnapshot()
    };
  }

  /**
   * Berechnet NPC-Aktionen basierend auf statischen Traits und lokalen Feld-Gradients.
   * NPCs reagieren auf "Aggression" (Kampf-Felder) oder "Curiosity" (Entdeckungs-Felder).
   */
  private calculateNpcAction(entity: Entity): { moved: boolean, newPosition?: any, newVelocity?: any } {
    if (!entity.position) return { moved: false };

    const aggression = entity.traits?.aggression ?? 0.5;
    const curiosity = entity.traits?.curiosity ?? 0.5;

    // Gradienten-Vektoren aus dem ResonanceGrid abrufen
    const combatGradient = this.resonanceGridService.getGradient(entity.position, 'COMBAT');
    const discoveryGradient = this.resonanceGridService.getGradient(entity.position, 'DISCOVERY');

    // Resultierender Bewegungsvektor basierend auf Traits
    const driveX = (combatGradient.x * aggression) + (discoveryGradient.x * curiosity);
    const driveZ = (combatGradient.z * aggression) + (discoveryGradient.z * curiosity);

    const movementThreshold = 0.01;
    if (Math.abs(driveX) > movementThreshold || Math.abs(driveZ) > movementThreshold) {
      const speed = 0.2;
      return {
        moved: true,
        newPosition: {
          x: entity.position.x + (driveX * speed),
          y: entity.position.y,
          z: entity.position.z + (driveZ * speed)
        },
        newVelocity: { x: driveX, y: 0, z: driveZ }
      };
    }

    return { moved: false };
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
      
      if (now - lastUpdate > 15000) {
        condemnedIds.add(entity.id);
        continue;
      }

      if (isOverloaded && (entity.cpuCost ?? 0) > 10 && (entity.priority ?? 0) < 2) {
        condemnedIds.add(entity.id);
      }
    }

    return condemnedIds;
  }

  private applyHeal(entity: Entity, metrics: { lastTickDurationMs: number, thresholdMs: number }): Entity {
    const hasHeadroom = metrics.lastTickDurationMs < (metrics.thresholdMs * 0.5);

    if (hasHeadroom && entity.status === 'throttled') {
      return {
        ...entity,
        status: 'active',
        cpuCost: Math.min(100, (entity.cpuCost ?? 0) * 1.5)
      };
    }

    return entity;
  }
}