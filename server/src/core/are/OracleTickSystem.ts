import {
  TickSystemPriority,
  createDefaultTickContext,
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
import {
  OracleModule,
  getOracleModule,
  setOracleModuleEventBus,
  type OracleModuleConfig,
  type OracleCriticalEventData,
  type OracleRecommendationEventData,
} from "../../modules/oracle/OracleModule.js";
import type { Prophecy } from "../../are/OuroborosOracle.js";
import type { WorldEventBus } from "../../modules/ouroboros/WorldEventBus.js";

export const ORACLE_TICK_SYSTEM_NAME = "oracle" as const;
export const ORACLE_TICK_PRIORITY = TickSystemPriority.INFRASTRUCTURE;

export { type OracleModuleConfig, type OracleCriticalEventData, type OracleRecommendationEventData };

export type OracleCriticalEvent = OracleCriticalEventData;
export type OracleRecommendation = OracleRecommendationEventData;

export interface BrainInformationFlow {
  readonly tick: TickId;
  readonly activeProphecies: readonly Prophecy[];
  readonly criticalEvents: OracleCriticalEventData[];
  readonly recommendations: OracleRecommendationEventData[];
  readonly worldHash: string | null;
  readonly seed: string | null;
}

export class OracleTickSystem implements TickSystem {
  readonly id = ORACLE_TICK_SYSTEM_NAME;
  readonly name = ORACLE_TICK_SYSTEM_NAME;
  readonly priority = ORACLE_TICK_PRIORITY;
  readonly category = TickSystemCategory.CORE;
  enabled = true;

  private readonly oracleModule: OracleModule;
  private lastReportTick = 0;

  constructor(
    options: OracleModuleConfig = {},
    eventBus?: WorldEventBus,
  ) {
    if (eventBus) {
      setOracleModuleEventBus(eventBus);
    }

    this.oracleModule = getOracleModule();
    this.oracleModule.tick(createDefaultTickContext(0));
  }

  tick(context: TickSystemContext): void {
    const worldState = this.extractWorldState(context);
    this.oracleModule.tick(context, worldState);

    const report = this.oracleModule.getReport();
    if (report) {
      this.lastReportTick = report.generatedAtTick ?? this.lastReportTick;
    }
  }

  private extractWorldState(context: TickSystemContext): { npcs: unknown[]; players: unknown[]; loot: unknown[] } {
    const world = context.world && typeof context.world === "object"
      ? context.world as { npcs?: unknown; players?: unknown; loot?: unknown }
      : null;

    return {
      npcs: Array.isArray(world?.npcs) ? world.npcs : [],
      players: Array.isArray(world?.players) ? world.players : [],
      loot: Array.isArray(world?.loot) ? world.loot : [],
    };
  }

  getReport() {
    return this.oracleModule.getReport();
  }

  getBrainInformationFlow(tick: number): BrainInformationFlow | null {
    const report = this.oracleModule.getReport();
    if (!report) return null;

    const activeProphecies = this.oracleModule.getActiveProphecies();
    const criticalEvents: OracleCriticalEventData[] = activeProphecies
      .filter((p) => p.severity === "high")
      .map((p) => ({
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
      recommendations: [],
      worldHash: report.worldHash,
      seed: report.seed,
    };
  }

  private formatMessage(prophecy: { kind: string; sector: number; ticksUntil: number; statement: string }): string {
    switch (prophecy.kind) {
      case "aggression_spike":
        return `critical in sector ${prophecy.sector} in ${prophecy.ticksUntil} ticks`;
      case "scarcity_event":
        return `scarcity in sector ${prophecy.sector} in ${prophecy.ticksUntil} ticks`;
      case "trade_cluster":
        return `trade cluster in sector ${prophecy.sector} in ${prophecy.ticksUntil} ticks`;
      default:
        return prophecy.statement;
    }
  }

  getRecordCount(): number {
    return this.oracleModule.getRecordCount();
  }

  setOnCriticalEvent(callback: (event: OracleCriticalEventData) => void): void {
    this.oracleModule.setOnCritical((event) => callback(event));
  }

  setOnRecommendation(callback: (rec: OracleRecommendationEventData) => void): void {
    this.oracleModule.setOnRecommendation((rec) => callback(rec));
  }

  setOnProphecy(callback: (prophecy: Prophecy) => void): void {
    this.oracleModule.setOnProphecy((prophecy) => callback(prophecy));
  }

  getOracleModule(): OracleModule {
    return this.oracleModule;
  }

  init?(context?: TickSystemContext): void {
    console.log(`[OracleTickSystem] Initializing at tick ${context?.tickId ?? 0}`);
  }

  shutdown?(_context?: TickSystemContext): void {
    console.log("[OracleTickSystem] Shutting down");
  }
}

export interface OracleTickSystemOptions extends OracleModuleConfig {
  readonly eventBus?: WorldEventBus;
}

export const DEFAULT_ORACLE_TICK_OPTIONS: OracleTickSystemOptions = {
  tickInterval: 10,
  minRecordsForAnalysis: 6,
  maxStoredRecords: 240,
};

export function createOracleTickSystem(
  options: OracleTickSystemOptions = {},
): OracleTickSystem {
  return new OracleTickSystem(options, options.eventBus);
}

export function registerOracleTickSystem(
  options: OracleTickSystemOptions = {},
  registry: TickSystemRegistry = tickSystemRegistry,
): OracleTickSystem {
  const system = createOracleTickSystem(options);

  registry.register({
    system,
    dependencies: ["world-brain", "input"],
    tags: ["oracle", "prophecy", "pattern-analysis", "living-world"],
  });

  console.log(`[OracleTickSystem] Registered with priority ${system.priority}`);
  return system;
}

let oracleTickSystemInstance: OracleTickSystem | null = null;

export function getOracleTickSystem(): OracleTickSystem {
  if (!oracleTickSystemInstance) {
    oracleTickSystemInstance = createOracleTickSystem();
  }
  return oracleTickSystemInstance;
}
