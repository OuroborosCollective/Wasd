/**
 * OracleTickSystem - Oracle Living World System integration
 * 
 * Phase 11: Oracle Integration into ARE tick loop
 * 
 * This TickSystem wraps OracleModule which uses WorldEventBus for event-driven
 * prophecy generation. It provides the TickSystem interface for ARE integration
 * while delegating to OracleModule for WorldEventBus integration.
 * 
 * Contract:
 * - Implements TickSystem interface
 * - Uses deterministic FNV-1a hashing (no Math.random())
 * - Runs at INFRASTRUCTURE priority (50) - early in the tick
 * - Generates deterministic prophecies from world state patterns
 * - Emits events via WorldEventBus for other systems (Chat, UI, NPC-Brain)
 * 
 * Integration flow:
 * WorldTickThinShell.tick()
 *   └── tickSystemRegistry.executeAll()
 *         └── OracleTickSystem.tick()
 *               └── OracleModule.tick()
 *                     ├── OuroborosOracleEngine.generate()  // Pattern analysis
 *                     └── WorldEventBus.emit()
 *                           ├── oracle_prophecy    → UI subscribes
 *                           ├── oracle_critical    → ChatSystem subscribes
 *                           └── oracle_recommendation → NPC-Brain subscribes
 */

import {
  TickSystemPriority,
  type TickSystem,
  type TickSystemContext,
} from "./TickSystem.js";
import {
  tickSystemRegistry,
  type TickSystemRegistry,
} from "./TickSystemRegistry.js";
import {
  type TickId,
  TickSystemCategory,
} from "./types.js";

// Oracle Module with WorldEventBus integration
import { 
  OracleModule, 
  getOracleModule,
  setOracleModuleEventBus,
  type OracleModuleConfig,
  type OracleCriticalEventData,
  type OracleRecommendationEventData,
} from "../oracle/OracleModule.js";
import type { WorldEventBus } from "../ouroboros/WorldEventBus.js";

export const ORACLE_TICK_SYSTEM_NAME = "oracle" as const;
export const ORACLE_TICK_PRIORITY = TickSystemPriority.INFRASTRUCTURE; // 50

export { type OracleModuleConfig, type OracleCriticalEventData, type OracleRecommendationEventData };

/**
 * BrainInformationFlow - Information extracted from Oracle analysis
 * for routing to other systems (Chat, WorldBrain, NPC-Brain)
 */
export interface BrainInformationFlow {
  readonly tick: TickId;
  readonly activeProphecies: any[];
  readonly criticalEvents: OracleCriticalEventData[];
  readonly recommendations: OracleRecommendationEventData[];
  readonly worldHash: string | null;
  readonly seed: string | null;
}

/**
 * OracleTickSystem - ARE TickSystem wrapper for OracleModule
 * 
 * This class:
 * 1. Implements the TickSystem interface for ARE integration
 * 2. Wraps OracleModule for WorldEventBus event emission
 * 3. Runs at INFRASTRUCTURE priority (50) - early in the tick
 * 4. Provides world state to OracleModule for pattern analysis
 * 5. Enables other systems to subscribe to Oracle events via WorldEventBus
 */
export class OracleTickSystem implements TickSystem {
  readonly id = ORACLE_TICK_SYSTEM_NAME;
  readonly name = ORACLE_TICK_SYSTEM_NAME;
  readonly priority = ORACLE_TICK_PRIORITY;
  readonly category = TickSystemCategory.CORE;
  enabled = true;

  private readonly oracleModule: OracleModule;
  
  // Cached report for external access
  private lastReportTick: number = 0;

  constructor(
    options: OracleModuleConfig = {},
    eventBus?: WorldEventBus,
  ) {
    // Initialize with event bus if provided
    if (eventBus) {
      setOracleModuleEventBus(eventBus);
    }
    
    this.oracleModule = getOracleModule();
    this.oracleModule.tick({ tickCount: 0 }); // Initialize with dummy tick
  }

  /**
   * Main tick method - called by WorldTickScheduler
   * 
   * Extracts world state from context and passes to OracleModule
   */
  tick(context: TickSystemContext): void {
    // Extract world state from context
    const worldState = this.extractWorldState(context);
    
    // Pass to OracleModule for processing
    this.oracleModule.tick(context, worldState);
    
    // Cache last report tick
    const report = this.oracleModule.getReport();
    if (report) {
      this.lastReportTick = report.generatedAtTick ?? this.lastReportTick;
    }
  }

  /**
   * Extract world state from context
   */
  private extractWorldState(context: TickSystemContext): { npcs: any[]; players: any[]; loot: any[] } {
    const world = context.world as any;
    
    return {
      npcs: Array.isArray(world?.npcs) ? world.npcs : [],
      players: Array.isArray(world?.players) ? world.players : [],
      loot: Array.isArray(world?.loot) ? world.loot : [],
    };
  }

  /**
   * Get current Oracle report
   */
  getReport() {
    return this.oracleModule.getReport();
  }

  /**
   * Get BrainInformationFlow for current tick
   */
  getBrainInformationFlow(tick: number): BrainInformationFlow | null {
    const report = this.oracleModule.getReport();
    if (!report) return null;
    
    const activeProphecies = this.oracleModule.getActiveProphecies();
    const criticalEvents: OracleCriticalEventData[] = activeProphecies
      .filter(p => p.severity === "high")
      .map(p => ({
        prophecy: p,
        tick,
        message: this.formatMessage(p),
        sector: p.sector,
        ticksUntil: p.ticksUntil,
      }));
    
    return {
      tick: tick as TickId,
      activeProphecies,
      criticalEvents,
      recommendations: [], // Would need to generate from report
      worldHash: report.worldHash,
      seed: report.seed,
    };
  }

  /**
   * Format critical message from prophecy
   */
  private formatMessage(prophecy: any): string {
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
   * Get stored tick records count
   */
  getRecordCount(): number {
    return this.oracleModule.getRecordCount();
  }

  /**
   * Set callback for critical events (alternative to WorldEventBus subscription)
   */
  setOnCriticalEvent(callback: (event: OracleCriticalEventData) => void): void {
    this.oracleModule.setOnCritical((event) => callback(event));
  }

  /**
   * Set callback for recommendations
   */
  setOnRecommendation(callback: (rec: OracleRecommendationEventData) => void): void {
    this.oracleModule.setOnRecommendation((rec) => callback(rec));
  }

  /**
   * Set callback for prophecies
   */
  setOnProphecy(callback: (prophecy: any) => void): void {
    this.oracleModule.setOnProphecy((prophecy) => callback(prophecy));
  }

  /**
   * Get OracleModule for direct access (e.g., to subscribe to WorldEventBus events)
   */
  getOracleModule(): OracleModule {
    return this.oracleModule;
  }

  /**
   * Optional initialization hook
   */
  init?(context?: TickSystemContext): void {
    console.log(`[OracleTickSystem] Initializing at tick ${context?.tickId ?? 0}`);
  }

  /**
   * Optional shutdown hook
   */
  shutdown?(context?: TickSystemContext): void {
    console.log(`[OracleTickSystem] Shutting down`);
  }
}

// ============================================================================
// OracleTickSystem Options & Factory
// ============================================================================

export interface OracleTickSystemOptions extends OracleModuleConfig {
  readonly eventBus?: WorldEventBus;
}

export const DEFAULT_ORACLE_TICK_OPTIONS: OracleTickSystemOptions = {
  tickInterval: 10,       // 1 Hz at 10 ticks/sec
  minRecordsForAnalysis: 6,
  maxStoredRecords: 240,
};

/**
 * Create OracleTickSystem with options
 */
export function createOracleTickSystem(
  options: OracleTickSystemOptions = {},
): OracleTickSystem {
  return new OracleTickSystem(options, options.eventBus);
}

// ============================================================================
// Registration Helper
// ============================================================================

/**
 * Register OracleTickSystem with the global TickSystemRegistry
 */
export function registerOracleTickSystem(
  options: OracleTickSystemOptions = {},
  registry: TickSystemRegistry = tickSystemRegistry,
): OracleTickSystem {
  const system = createOracleTickSystem(options);
  
  registry.register({
    system,
    dependencies: ['world-brain', 'input'],
    tags: ['oracle', 'prophecy', 'pattern-analysis', 'living-world'],
  });
  
  console.log(`[OracleTickSystem] Registered with priority ${system.priority}`);
  
  return system;
}

// ============================================================================
// Global Instance (lazy initialization)
// ============================================================================

let oracleTickSystemInstance: OracleTickSystem | null = null;

/**
 * Get or create the global OracleTickSystem instance
 */
export function getOracleTickSystem(): OracleTickSystem {
  if (!oracleTickSystemInstance) {
    oracleTickSystemInstance = createOracleTickSystem();
  }
  return oracleTickSystemInstance;
}