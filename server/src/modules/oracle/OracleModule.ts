import {
  WorldEventBus,
} from "../ouroboros/WorldEventBus.js";
import {
  OuroborosOracleEngine,
  ouroborosOracleEngine,
  type OracleReport,
  type Prophecy,
} from "../../are/OuroborosOracle.js";
import type { DeterministicTickRecord } from "../../are/DeterministicTickRecorder.js";
import type { TickId } from "../../core/are/types.js";

export const ORACLE_MODULE_NAME = "oracle" as const;

export interface OracleProphecyEventData extends Record<string, unknown> {
  readonly prophecy: Prophecy;
  readonly tick: number;
  readonly worldHash: string | null;
  readonly kind: Prophecy["kind"];
  readonly severity: Prophecy["severity"];
  readonly sector: number;
  readonly ticksUntil: number;
  readonly statement: string;
  readonly confidence: number;
}

export interface OracleCriticalEventData extends Record<string, unknown> {
  readonly prophecy: Prophecy;
  readonly tick: number;
  readonly message: string;
  readonly sector: number;
  readonly ticksUntil: number;
}

export interface OracleRecommendationEventData extends Record<string, unknown> {
  readonly type: "route_npc" | "adjust_economy" | "spawn_resource" | "trigger_event";
  readonly target: string;
  readonly reason: string;
  readonly priority: number;
  readonly tick: number;
}

export interface OracleModuleConfig {
  readonly tickInterval?: number;
  readonly minRecordsForAnalysis?: number;
  readonly maxStoredRecords?: number;
  readonly emitOnAllProphecies?: boolean;
  readonly criticalSeverityOnly?: boolean;
}

export interface OracleWorldState {
  readonly npcs: readonly unknown[];
  readonly players: readonly unknown[];
  readonly loot: readonly unknown[];
}

export interface OracleTickLikeContext {
  readonly tickCount?: number | TickId;
  readonly tickId?: number | TickId;
  readonly tick?: number | TickId;
  readonly logicalIndex?: number | TickId;
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value);
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

export class OracleModule {
  readonly name = ORACLE_MODULE_NAME;

  private readonly engine: OuroborosOracleEngine;
  private readonly eventBus: WorldEventBus;
  private readonly tickInterval: number;
  private readonly minRecords: number;
  private readonly maxRecords: number;
  private readonly emitOnAllProphecies: boolean;
  private readonly criticalSeverityOnly: boolean;

  private tickRecords: DeterministicTickRecord[] = [];
  private currentReport: OracleReport | null = null;
  private lastAnalysisTick = 0;
  private lastEmitTick = 0;

  private onProphecy?: (prophecy: Prophecy, tick: number) => void;
  private onCritical?: (event: OracleCriticalEventData, tick: number) => void;
  private onRecommendation?: (rec: OracleRecommendationEventData, tick: number) => void;

  private totalPropheciesEmitted = 0;
  private totalCriticalEmitted = 0;
  private totalRecommendationsEmitted = 0;

  constructor(eventBus: WorldEventBus, config: OracleModuleConfig = {}) {
    this.engine = ouroborosOracleEngine;
    this.eventBus = eventBus;
    this.tickInterval = config.tickInterval ?? 10;
    this.minRecords = config.minRecordsForAnalysis ?? 6;
    this.maxRecords = config.maxStoredRecords ?? 240;
    this.emitOnAllProphecies = config.emitOnAllProphecies ?? true;
    this.criticalSeverityOnly = config.criticalSeverityOnly ?? false;
    this.eventBus.on("world_tick", () => this.recordTickIfNeeded());
  }

  setOnProphecy(callback: (prophecy: Prophecy, tick: number) => void): void {
    this.onProphecy = callback;
  }

  setOnCritical(callback: (event: OracleCriticalEventData, tick: number) => void): void {
    this.onCritical = callback;
  }

  setOnRecommendation(callback: (rec: OracleRecommendationEventData, tick: number) => void): void {
    this.onRecommendation = callback;
  }

  tick(context: OracleTickLikeContext, worldState?: OracleWorldState): void {
    const tickCount = this.extractTickCount(context);

    if (worldState) {
      this.recordTick(tickCount, worldState);
    }

    if (tickCount % this.tickInterval !== 0) return;

    if (this.tickRecords.length >= this.minRecords) {
      this.generateAndEmit(tickCount);
    }
  }

  private recordTick(tick: number, worldState: OracleWorldState): void {
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

    while (this.tickRecords.length > this.maxRecords) {
      this.tickRecords.shift();
    }
  }

  private recordTickIfNeeded(): void {
    // Explicit world-state recording happens through tick().
  }

  private normalizeEntities(entities: readonly unknown[]): unknown[] {
    return entities.map((entity) => {
      const value = entity && typeof entity === "object" ? entity as any : {};
      return {
        id: String(value.id ?? ""),
        position: value.position ? {
          x: Number(value.position?.x ?? 0),
          y: Number(value.position?.y ?? 0),
        } : { x: 0, y: 0 },
        health: Number(value.health ?? value.maxHealth ?? 0),
        maxHealth: Number(value.maxHealth ?? value.health ?? 0),
      };
    });
  }

  private extractTickCount(context: OracleTickLikeContext): number {
    return toNumber(context.tickId)
      ?? toNumber(context.tick)
      ?? toNumber(context.tickCount)
      ?? toNumber(context.logicalIndex)
      ?? 0;
  }

  private generateAndEmit(tick: number): void {
    if (tick - this.lastEmitTick < this.tickInterval) return;

    this.lastEmitTick = tick;
    this.lastAnalysisTick = tick;
    this.currentReport = this.engine.generate(this.tickRecords);

    for (const prophecy of this.currentReport.prophecies) {
      if (!prophecy.active) continue;

      if (this.emitOnAllProphecies) {
        this.emitProphecyEvent(prophecy, tick);
      }

      if (!this.criticalSeverityOnly || prophecy.severity === "high") {
        if (prophecy.severity === "high") this.emitCriticalEvent(prophecy, tick);
      }
    }

    const recommendations = this.generateRecommendations(tick);
    for (const rec of recommendations) {
      this.emitRecommendationEvent(rec, tick);
    }
  }

  private emitProphecyEvent(prophecy: Prophecy, tick: number): void {
    const data: OracleProphecyEventData = {
      prophecy,
      tick,
      worldHash: prophecy.worldHash,
      kind: prophecy.kind,
      severity: prophecy.severity,
      sector: prophecy.sector,
      ticksUntil: prophecy.ticksUntil,
      statement: prophecy.statement,
      confidence: prophecy.confidence,
    };

    this.eventBus.emit({
      type: "oracle_prophecy",
      actorId: "oracle",
      actorName: "Oracle",
      position: { x: prophecy.sector * 64, y: 0 },
      data,
      intensity: prophecy.confidence,
    });

    this.totalPropheciesEmitted++;
    this.onProphecy?.(prophecy, tick);
  }

  private emitCriticalEvent(prophecy: Prophecy, tick: number): void {
    const message = this.formatCriticalMessage(prophecy);
    const data: OracleCriticalEventData = {
      prophecy,
      tick,
      message,
      sector: prophecy.sector,
      ticksUntil: prophecy.ticksUntil,
    };

    this.eventBus.emit({
      type: "oracle_critical",
      actorId: "oracle",
      actorName: "ORACLE",
      position: { x: prophecy.sector * 64, y: 0 },
      data,
      intensity: 1,
    });

    this.totalCriticalEmitted++;
    this.onCritical?.(data, tick);
  }

  private formatCriticalMessage(prophecy: Prophecy): string {
    switch (prophecy.kind) {
      case "aggression_spike":
        return `AGGRESSION SPIKE in sector ${prophecy.sector} in ${prophecy.ticksUntil} ticks`;
      case "scarcity_event":
        return `SCARCITY EVENT in sector ${prophecy.sector} in ${prophecy.ticksUntil} ticks`;
      case "trade_cluster":
        return `TRADE CLUSTER forming in sector ${prophecy.sector} in ${prophecy.ticksUntil} ticks`;
      default:
        return prophecy.statement;
    }
  }

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

  private emitRecommendationEvent(rec: OracleRecommendationEventData, tick: number): void {
    this.eventBus.emit({
      type: "oracle_recommendation",
      actorId: "oracle",
      actorName: "Oracle",
      position: { x: Number(rec.target.split(":")[1] ?? 0) * 64, y: 0 },
      data: rec,
      intensity: rec.priority / 3,
    });

    this.totalRecommendationsEmitted++;
    this.onRecommendation?.(rec, tick);
  }

  getReport(): OracleReport | null {
    return this.currentReport;
  }

  getActiveProphecies(): Prophecy[] {
    return this.currentReport?.prophecies.filter((p) => p.active) ?? [];
  }

  getRecordCount(): number {
    return this.tickRecords.length;
  }

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

let oracleModuleInstance: OracleModule | null = null;
let globalEventBus: WorldEventBus | null = null;

export function getOracleModule(eventBus?: WorldEventBus): OracleModule {
  if (!oracleModuleInstance) {
    if (!eventBus && !globalEventBus) {
      globalEventBus = new WorldEventBus();
    }
    oracleModuleInstance = new OracleModule(eventBus ?? globalEventBus!);
  }
  return oracleModuleInstance;
}

export function setOracleModuleEventBus(eventBus: WorldEventBus): void {
  globalEventBus = eventBus;
  oracleModuleInstance = null;
}

export function resetOracleModule(): void {
  oracleModuleInstance?.reset();
  oracleModuleInstance = null;
}
