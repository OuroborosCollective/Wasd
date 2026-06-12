/**
 * OracleOuroborosConnector.ts
 *
 * Verbindet das Oracle-System mit dem Ouroboros-System.
 */

import {
  OracleEndpoint,
  OracleVisionEngine,
  type OracleSyncState,
  type OraclePulse,
  type OracleVision,
  type DungeonEmergenceProphecy,
  type BloodOffering,
  type GhostTown,
  type FallenEntity,
} from "./index.js";

import type { WorldHistory, HistoryEntry } from "../modules/ouroboros/WorldHistory.js";
import type { DynamicFactions } from "../modules/ouroboros/DynamicFactions.js";
import type { EmergentMarket } from "../modules/ouroboros/EmergentMarket.js";
import type { NPCBrainRunner } from "../modules/npc/brain/index.js";
import type { NPCMemoryV3 } from "../modules/npc/brain/index.js";

export interface OuroborosObservation {
  tick: number;
  stateHash: string;
  factionWars: { factionA: string; factionB: string; intensity: number }[];
  factionAlliances: { factionA: string; factionB: string }[];
  factionCollapses: { factionId: string; cause: string }[];
  priceAnomalies: { resource: string; region: string; priceChange: number }[];
  tradeRouteClosures: { routeId: string; reason: string }[];
  npcMigrations: { fromRegion: string; toRegion: string; count: number }[];
  npcMassDeaths: { regionId: string; cause: string; count: number }[];
  legendsBorn: { legendId: string; subject: string; spread: number }[];
  legendsFading: { legendId: string; age: number }[];
  warfrontActive: boolean;
  warfrontPhase: string;
}

export interface NPCVision {
  visionId: string;
  npcId: string;
  tick: number;
  type: "omen" | "prophecy" | "warning" | "guidance" | "ancient_knowledge";
  strength: number;
  message: string;
  subject?: {
    type: string;
    id: string;
    name: string;
    position?: { x: number; y: number };
  };
  certainty: number;
  visionHash: string;
}

function entryRegion(entry: HistoryEntry): string {
  return entry.regionId ?? "unknown";
}

function entryCount(entry: HistoryEntry): number {
  return Math.max(1, Math.round(entry.impactScore * 10));
}

function entryCause(entry: HistoryEntry): string {
  return entry.summary || entry.type || "unknown";
}

export class OracleOuroborosConnector {
  private historySnapshot: Map<number, OuroborosObservation> = new Map();
  private npcVisions: Map<string, NPCVision[]> = new Map();
  private pendingVisions: NPCVision[] = [];

  constructor(
    private readonly config: {
      visionInterval?: number;
      maxVisionsPerNpc?: number;
      prophecyStrengthBase?: number;
    } = {}
  ) {
    this.config = {
      visionInterval: config.visionInterval ?? 100,
      maxVisionsPerNpc: config.maxVisionsPerNpc ?? 5,
      prophecyStrengthBase: config.prophecyStrengthBase ?? 500,
    };
  }

  observeOuroborosTick(
    tick: number,
    worldHistory: WorldHistory,
    factions: DynamicFactions,
    market: EmergentMarket,
    stateHash: string
  ): OuroborosObservation {
    const observation: OuroborosObservation = {
      tick,
      stateHash,
      factionWars: [],
      factionAlliances: [],
      factionCollapses: [],
      priceAnomalies: [],
      tradeRouteClosures: [],
      npcMigrations: [],
      npcMassDeaths: [],
      legendsBorn: [],
      legendsFading: [],
      warfrontActive: false,
      warfrontPhase: "unknown",
    };

    const recentEvents = worldHistory.getRecentEvents(100);

    for (const event of recentEvents) {
      switch (event.type) {
        case "war_declared":
          observation.factionWars.push({
            factionA: event.actorName ?? "unknown",
            factionB: event.targetName ?? "unknown",
            intensity: event.intensity ?? 0.5,
          });
          break;
        case "alliance_formed":
          observation.factionAlliances.push({
            factionA: event.actorName ?? "unknown",
            factionB: event.targetName ?? "unknown",
          });
          break;
        case "faction_collapsed":
          observation.factionCollapses.push({
            factionId: event.actorName ?? event.eventId,
            cause: entryCause(event),
          });
          break;
        case "legend_born":
        case "legend_created":
          observation.legendsBorn.push({
            legendId: event.eventId,
            subject: event.actorName ?? "unknown",
            spread: event.intensity ?? event.impactScore ?? 0.5,
          });
          break;
        case "npc_migration":
          observation.npcMigrations.push({
            fromRegion: entryRegion(event),
            toRegion: event.targetName ?? "unknown",
            count: entryCount(event),
          });
          break;
        case "npc_mass_death":
        case "agent_died":
          observation.npcMassDeaths.push({
            regionId: entryRegion(event),
            cause: entryCause(event),
            count: entryCount(event),
          });
          break;
        case "warfront_boss_active":
          observation.warfrontActive = true;
          observation.warfrontPhase = "boss_active";
          break;
        case "warfront_boss_defeated":
          observation.warfrontActive = false;
          observation.warfrontPhase = "cooldown";
          break;
      }
    }

    this.historySnapshot.set(tick, observation);
    return observation;
  }

  generatePropheticVisions(
    observation: OuroborosObservation,
    bloodOfferings: BloodOffering[],
    ghostTowns: GhostTown[],
    fallenEntities: FallenEntity[]
  ): {
    oracleVisions: OracleVision[];
    dungeonProphecies: DungeonEmergenceProphecy[];
    civilizationInsights: string[];
  } {
    const state = { tick: observation.tick, stateHash: observation.stateHash };
    const warfrontSnapshot = {
      cycleId: `warfront_${observation.tick}`,
      phase: observation.warfrontPhase,
      sectors: [],
      frontBossActive: observation.warfrontActive,
    };

    const result = OracleVisionEngine.generateCompleteVision(
      warfrontSnapshot,
      bloodOfferings,
      ghostTowns,
      fallenEntities,
      state
    );

    const civilizationInsights = this.generateCivilizationInsights(observation);

    return {
      oracleVisions: result.oracleVisions,
      dungeonProphecies: result.dungeonProphecies,
      civilizationInsights,
    };
  }

  private generateCivilizationInsights(observation: OuroborosObservation): string[] {
    const insights: string[] = [];

    if (observation.factionWars.length > 0) insights.push(`${observation.factionWars.length} wars destabilize civilization.`);
    if (observation.factionAlliances.length > 0) insights.push(`${observation.factionAlliances.length} alliances reshape power.`);
    if (observation.npcMigrations.length > 0) insights.push(`${observation.npcMigrations.length} migrations change regional pressure.`);
    if (observation.npcMassDeaths.length > 0) insights.push(`${observation.npcMassDeaths.length} mass death signals feed dungeon pressure.`);
    if (observation.legendsBorn.length > 0) insights.push(`${observation.legendsBorn.length} legends become persistent cultural memory.`);

    return insights;
  }

  async syncWithOracle(observation: OuroborosObservation): Promise<OraclePulse> {
    const state: OracleSyncState = {
      tick: observation.tick,
      stateHash: observation.stateHash,
      world: {
        dangerLevel: observation.factionWars.length * 100 + observation.npcMassDeaths.length * 150,
        socialHeat: observation.legendsBorn.length * 100 + observation.factionAlliances.length * 80,
        marketHeat: observation.priceAnomalies.length * 100,
        factionTension: observation.factionWars.length * 200,
      },
    };

    return OracleEndpoint.syncWithCreator(state);
  }

  generateNPCVision(npcId: string, oracleVision: OracleVision, tick: number): NPCVision {
    const visionHash = OracleEndpoint.hashDeterministic({ npcId, vision: oracleVision.visionHash, tick });
    const vision: NPCVision = {
      visionId: `npc_vision_${npcId}_${tick}_${visionHash.slice(0, 8)}`,
      npcId,
      tick,
      type: oracleVision.type === "dungeon_emergence" ? "warning" : "prophecy",
      strength: oracleVision.intensity,
      message: oracleVision.message,
      certainty: oracleVision.certainty,
      visionHash,
    };

    const visions = this.npcVisions.get(npcId) ?? [];
    visions.push(vision);
    while (visions.length > (this.config.maxVisionsPerNpc ?? 5)) visions.shift();
    this.npcVisions.set(npcId, visions);
    this.pendingVisions.push(vision);
    return vision;
  }

  getPendingVisions(): NPCVision[] {
    const visions = [...this.pendingVisions];
    this.pendingVisions = [];
    return visions;
  }

  getNPCVisions(npcId: string): NPCVision[] {
    return this.npcVisions.get(npcId) ?? [];
  }

  injectVisionIntoNPCMemory(npcId: string, vision: NPCVision, memory: NPCMemoryV3): void {
    const anyMemory = memory as any;
    if (typeof anyMemory.addMemory === "function") {
      anyMemory.addMemory({
        type: "oracle_vision",
        content: vision.message,
        tick: vision.tick,
        importance: vision.strength / 1000,
        metadata: {
          visionId: vision.visionId,
          certainty: vision.certainty,
          hash: vision.visionHash,
        },
      });
    }
  }

  applyVisionToNPCBrain(npcId: string, vision: NPCVision, brain: NPCBrainRunner): void {
    const anyBrain = brain as any;
    if (typeof anyBrain.receiveOracleVision === "function") {
      anyBrain.receiveOracleVision(vision);
    }
  }
}

export function createOracleObserver(config?: ConstructorParameters<typeof OracleOuroborosConnector>[0]): OracleOuroborosConnector {
  return new OracleOuroborosConnector(config);
}
