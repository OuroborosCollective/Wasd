/**
 * OracleModule - Oracle Living World System with WorldEventBus Integration
 * 
 * Phase 11: Oracle Integration into Ouroboros Living World
 * 
 * This module provides deterministic prophecy generation using the OuroborosOracleEngine
 * and emits events via WorldEventBus for other systems (Chat, UI, NPC-Brain) to consume.
 * 
 * Architecture:
 * 1. OracleModule receives world state (NPCs, players, loot) each tick
 * 2. Stores tick records for pattern analysis
 * 3. Runs OuroborosOracleEngine.generate() at configured intervals
 * 4. Emits oracle_prophecy, oracle_critical, oracle_recommendation events to WorldEventBus
 * 5. Other systems subscribe to these events
 * 
 * Event Types:
 * - oracle_prophecy: All active prophecies (low/medium/high severity)
 * - oracle_critical: High-severity events only (for Chat broadcast)
 * - oracle_recommendation: NPC routing, resource spawning, economy adjustments
 */

import { 
  WorldEventBus, 
  type WorldEvent, 
  type WorldEventType 
} from "../ouroboros/WorldEventBus.js";
import { 
  OuroborosOracleEngine, 
  ouroborosOracleEngine, 
  type OracleReport, 
  type Prophecy 
} from "../../are/OuroborosOracle.js";
import type { DeterministicTickRecord } from "../../are/DeterministicTickRecorder.js";
import type { TickSystemContext } from "../../core/are/TickSystem.js";
import type { TickId } from "../../core/are/types.js";

export const ORACLE_MODULE_NAME = "oracle" as const;

/**
 * Oracle prophecy event data structure
 */
export interface OracleProphecyEventData {
  readonly prophecy: Prophecy;
  readonly tick: number;
  readonly worldHash: string | null;
}

/**
 * Oracle critical event data structure (high severity only)
 */
export interface OracleCriticalEventData {
  readonly prophecy: Prophecy;
  readonly tick: number;
  readonly message: string;
  readonly sector: number;
  readonly ticksUntil: number;
}

/**
 * Oracle recommendation event data structure
 */
export interface OracleRecommendationEventData {
  readonly type: "route_npc" | "adjust_economy" | "spawn_resource" | "trigger_event";
  readonly target: string;
  readonly reason: string;
  readonly priority: number;
  readonly tick: number;
}

export interface OracleModuleConfig {
  readonly tickInterval?: number;        // How often to run analysis (default: 10 = 1Hz at 10Hz server)
  readonly minRecordsForAnalysis?: number; // Min tick records before analysis (default: 6)
  readonly maxStoredRecords?: number;    // Max records to store (default: 240)
  readonly emitOnAllProphecies?: boolean; // Emit oracle_prophecy for all (not just critical)
  readonly criticalSeverityOnly?: boolean; // Only emit oracle_critical for high severity
}

/**
 * OracleModule - Deterministic prophecy generation with WorldEventBus integration
 * 
 * Features:
 * - Deterministic pattern analysis using OuroborosOracleEngine
 * - WorldEventBus integration for event-driven architecture
 * - Callbacks for external system integration
 * - No Date.now() or Math.random() - fully deterministic
 */
export class OracleModule {
  readonly name = ORACLE_MODULE_NAME;
  
  private readonly engine: OuroborosOracleEngine;
  private readonly eventBus: WorldEventBus;
  private readonly tickInterval: number;
  private readonly minRecords: number;
  private readonly maxRecords: number;
  private readonly emitOnAllProphecies: boolean;
  private readonly criticalSeverityOnly: boolean;
  
  // Tick record storage for pattern analysis
  private tickRecords: DeterministicTickRecord[] = [];
  
  // Current analysis state
  private currentReport: OracleReport | null = null;
  private lastAnalysisTick: number = 0;
  private lastEmitTick: number = 0;
  
  // External callbacks
  private onProphecy?: (prophecy: Prophecy, tick: number) => void;
  private onCritical?: (event: OracleCriticalEventData, tick: number) => void;
  private onRecommendation?: (rec: OracleRecommendationEventData, tick: number) => void;
  
  // Statistics
  private totalPropheciesEmitted: number = 0;
  private totalCriticalEmitted: number = 0;
  private totalRecommendationsEmitted: number = 0;

  constructor(
    eventBus: WorldEventBus,
    config: OracleModuleConfig = {}
  ) {
    this.engine = ouroborosOracleEngine;
    this.eventBus = eventBus;
    this.tickInterval = config.tickInterval ?? 10;
    this.minRecords = config.minRecordsForAnalysis ?? 6;
    this.maxRecords = config.maxStoredRecords ?? 240;
    this.emitOnAllProphecies = config.emitOnAllProphecies ?? true;
    this.criticalSeverityOnly = config.criticalSeverityOnly ?? false;
    
    // Subscribe to history recording for audit trail
    this.eventBus.on("world_tick", () => this.recordTickIfNeeded());
  }

  /**
   * Set callback for all prophecies
   */
  setOnProphecy(callback: (prophecy: Prophecy, tick: number) => void): void {
    this.onProphecy = callback;
  }

  /**
   * Set callback for critical events (high severity only)
   */
  setOnCritical(callback: (event: OracleCriticalEventData, tick: number) => void): void {
    this.onCritical = callback;
  }

  /**
   * Set callback for recommendations
   */
  setOnRecommendation(callback: (rec: OracleRecommendationEventData, tick: number) => void): void {
    this.onRecommendation = callback;
  }

  /**
   * Main tick method - called from OuroborosTickSystem or directly
   * 
   * @param context - TickSystemContext with tick count and optional world state
   * @param worldState - Optional world state (npcs, players, loot)
   */
  tick(context: TickSystemContext, worldState?: { npcs: any[]; players: any[]; loot: any[] }): void {
    const tickCount = this.extractTickCount(context);
    
    // Record world state for pattern analysis (every tick)
    if (worldState) {
      this.recordTick(tickCount, worldState);
    }
    
    // Run analysis at configured interval
    if (tickCount % this.tickInterval !== 0) {
      return;
    }
    
    // Generate analysis when we have enough records
    if (this.tickRecords.length >= this.minRecords) {
      this.generateAndEmit(tickCount);
    }
  }

  /**
   * Record a tick for pattern analysis
   */
  private recordTick(tick: number, worldState: { npcs: any[]; players: any[]; loot: any[] }): void {
    const normalizedState = {
      npcs: this.normalizeEntities(worldState.npcs),
      players: this.normalizeEntities(worldState.players),
      loot: this.normalizeEntities(worldState.loot),
    };
    
    const record: DeterministicTickRecord = {
      tick,
      marker: `oracle-module:${tick}`,
      worldState: normalizedState,
      payload: {
        deterministicSeed: `oracle|seed:${tick}`,
      },
      worldHash: null,
      worldSnapshot: null,
      guard: null,
    };
    
    this.tickRecords.push(record);
    
    // Trim old records
    while (this.tickRecords.length > this.maxRecords) {
      this.tickRecords.shift();
    }
  }

  /**
   * Record tick from world_tick event (when no explicit worldState provided)
   */
  private recordTickIfNeeded(): void {
    // This is called from world_tick event - we just increment record count
    // Actual world state recording happens via tick() method
  }

  /**
   * Normalize entities to deterministic format
   */
  private normalizeEntities(entities: any[]): any[] {
    return entities.map(entity => ({
      id: String(entity?.id ?? ''),
      position: entity?.position ? {
        x: Number(entity.position?.x ?? 0),
        y: Number(entity.position?.y ?? 0),
      } : { x: 0, y: 0 },
      health: Number(entity?.health ?? entity?.maxHealth ?? 0),
      maxHealth: Number(entity?.maxHealth ?? entity?.health ?? 0),
    }));
  }

  /**
   * Extract tick count from context
   */
  private extractTickCount(context: TickSystemContext): number {
    if (context.tickId !== undefined) {
      return typeof context.tickId === 'number' 
        ? context.tickId 
        : Number(context.tickId);
    }
    if (context.tick !== undefined) {
      return typeof context.tick === 'number' 
        ? context.tick 
        : Number(context.tick);
    }
    if (context.tickCount !== undefined) {
      return typeof context.tickCount === 'number' 
        ? context.tickCount 
        : Number(context.tickCount);
    }
    if (context.logicalIndex !== undefined) {
      return typeof context.logicalIndex === 'number' 
        ? context.logicalIndex 
        : Number(context.logicalIndex);
    }
    return 0;
  }

  /**
   * Generate analysis and emit events
   */
  private generateAndEmit(tick: number): void {
    // Throttle emissions
    if (tick - this.lastEmitTick < this.tickInterval) {
      return;
    }
    
    this.lastEmitTick = tick;
    
    // Generate report
    this.lastAnalysisTick = tick;
    this.currentReport = this.engine.generate(this.tickRecords);
    
    // Emit events for each prophecy
    for (const prophecy of this.currentReport.prophecies) {
      if (!prophecy.active) continue;
      
      // Emit oracle_prophecy event (unless critical-only mode)
      if (this.emitOnAllProphecies) {
        this.emitProphecyEvent(prophecy, tick);
      }
      
      // Emit oracle_critical for high severity
      if (prophecy.severity === "high") {
        this.emitCriticalEvent(prophecy, tick);
      }
    }
    
    // Emit recommendations
    const recommendations = this.generateRecommendations(tick);
    for (const rec of recommendations) {
      this.emitRecommendationEvent(rec, tick);
    }
  }

  /**
   * Emit oracle_prophecy event to WorldEventBus
   */
  private emitProphecyEvent(prophecy: Prophecy, tick: number): void {
    const event = this.eventBus.emit({
      type: "oracle_prophecy",
      actorId: "oracle",
      actorName: "Oracle",
      position: { x: prophecy.sector * 64, y: 0 }, // Sector-based position
      data: {
        prophecy,
        tick,
        kind: prophecy.kind,
        severity: prophecy.severity,
        sector: prophecy.sector,
        ticksUntil: prophecy.ticksUntil,
        statement: prophecy.statement,
        confidence: prophecy.confidence,
      } as OracleProphecyEventData,
      intensity: prophecy.confidence,
    });
    
    this.totalPropheciesEmitted++;
    
    // External callback
    this.onProphecy?.(prophecy, tick);
    
    return event;
  }

  /**
   * Emit oracle_critical event to WorldEventBus (high severity only)
   */
  private emitCriticalEvent(prophecy: Prophecy, tick: number): void {
    const message = this.formatCriticalMessage(prophecy);
    
    const event = this.eventBus.emit({
      type: "oracle_critical",
      actorId: "oracle",
      actorName: "ORACLE",
      position: { x: prophecy.sector * 64, y: 0 },
      data: {
        prophecy,
        tick,
        message,
        sector: prophecy.sector,
        ticksUntil: prophecy.ticksUntil,
      } as OracleCriticalEventData,
      intensity: 1.0, // Critical events always high intensity
    });
    
    this.totalCriticalEmitted++;
    
    // External callback
    this.onCritical?.({
      prophecy,
      tick,
      message,
      sector: prophecy.sector,
      ticksUntil: prophecy.ticksUntil,
    }, tick);
    
    return event;
  }

  /**
   * Format critical event message
   */
  private formatCriticalMessage(prophecy: Prophecy): string {
    switch (prophecy.kind) {
      case "aggression_spike":
        return `🚨 AGGRESSION SPIKE in Sektor ${prophecy.sector} in ${prophecy.ticksUntil} ticks!`;
      case "scarcity_event":
        return `⚠️ SCARCITY EVENT in Sektor ${prophecy.sector} in ${prophecy.ticksUntil} ticks!`;
      case "trade_cluster":
        return `📦 TRADE CLUSTER forming in Sektor ${prophecy.sector} in ${prophecy.ticksUntil} ticks!`;
      default:
        return prophecy.statement;
    }
  }

  /**
   * Generate recommendations based on current prophecies
   */
  private generateRecommendations(tick: number): OracleRecommendationEventData[] {
    if (!this.currentReport) return [];
    
    const recommendations: OracleRecommendationEventData[] = [];
    
    for (const prophecy of this.currentReport.prophecies) {
      if (!prophecy.active || prophecy.kind === "quiet_cycle") continue;
      
      switch (prophecy.kind) {
        case "aggression_spike":
          recommendations.push({
            type: "route_npc",
            target: `sector:${prophecy.sector}`,
            reason: `Aggression spike predicted in ${prophecy.ticksUntil} ticks`,
            priority: prophecy.severity === "high" ? 3 : prophecy.severity === "medium" ? 2 : 1,
            tick,
          });
          break;
          
        case "scarcity_event":
          recommendations.push({
            type: "spawn_resource",
            target: `sector:${prophecy.sector}`,
            reason: `Scarcity event predicted in ${prophecy.ticksUntil} ticks`,
            priority: prophecy.severity === "high" ? 3 : prophecy.severity === "medium" ? 2 : 1,
            tick,
          });
          break;
          
        case "trade_cluster":
          recommendations.push({
            type: "adjust_economy",
            target: `sector:${prophecy.sector}`,
            reason: `Trade cluster forming in ${prophecy.ticksUntil} ticks`,
            priority: 1,
            tick,
          });
          break;
      }
    }
    
    return recommendations.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Emit recommendation event to WorldEventBus
   */
  private emitRecommendationEvent(rec: OracleRecommendationEventData, tick: number): void {
    const event = this.eventBus.emit({
      type: "oracle_recommendation",
      actorId: "oracle",
      actorName: "Oracle",
      position: { x: Number(rec.target.split(":")[1] ?? 0) * 64, y: 0 },
      data: rec,
      intensity: rec.priority / 3, // Normalize priority to 0-1
    });
    
    this.totalRecommendationsEmitted++;
    
    // External callback
    this.onRecommendation?.(rec, tick);
    
    return event;
  }

  /**
   * Get current Oracle report
   */
  getReport(): OracleReport | null {
    return this.currentReport;
  }

  /**
   * Get active prophecies
   */
  getActiveProphecies(): Prophecy[] {
    return this.currentReport?.prophecies.filter(p => p.active) ?? [];
  }

  /**
   * Get stored tick records count
   */
  getRecordCount(): number {
    return this.tickRecords.length;
  }

  /**
   * Get module statistics
   */
  getStats(): {
    recordCount: number;
    totalPropheciesEmitted: number;
    totalCriticalEmitted: number;
    totalRecommendationsEmitted: number;
    lastAnalysisTick: number;
    activeProphecies: number;
  } {
    return {
      recordCount: this.tickRecords.length,
      totalPropheciesEmitted: this.totalPropheciesEmitted,
      totalCriticalEmitted: this.totalCriticalEmitted,
      totalRecommendationsEmitted: this.totalRecommendationsEmitted,
      lastAnalysisTick: this.lastAnalysisTick,
      activeProphecies: this.getActiveProphecies().length,
    };
  }

  /**
   * Reset module state
   */
  reset(): void {
    this.tickRecords = [];
    this.currentReport = null;
    this.lastAnalysisTick = 0;
    this.lastEmitTick = 0;
    this.totalPropheciesEmitted = 0;
    this.totalCriticalEmitted = 0;
    this.totalRecommendationsEmitted = 0;
  }
}

// ============================================================================
// Global Oracle Module Instance (lazy initialization)
// ============================================================================

let oracleModuleInstance: OracleModule | null = null;
let globalEventBus: WorldEventBus | null = null;

/**
 * Create and get global OracleModule instance
 */
export function getOracleModule(eventBus?: WorldEventBus): OracleModule {
  if (!oracleModuleInstance) {
    if (!eventBus && !globalEventBus) {
      globalEventBus = new WorldEventBus();
    }
    oracleModuleInstance = new OracleModule(eventBus ?? globalEventBus!);
  }
  return oracleModuleInstance;
}

/**
 * Set custom event bus for OracleModule
 */
export function setOracleModuleEventBus(eventBus: WorldEventBus): void {
  globalEventBus = eventBus;
  oracleModuleInstance = null; // Force recreation with new event bus
}

/**
 * Reset global OracleModule (for testing or world reset)
 */
export function resetOracleModule(): void {
  oracleModuleInstance?.reset();
  oracleModuleInstance = null;
}