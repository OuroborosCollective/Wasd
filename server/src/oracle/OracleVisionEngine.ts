import { OracleEndpoint } from "./OracleEndpoint.js";

export interface FallenEntity {
  id: string;
  type: "player" | "npc";
  name: string;
  regionId: string;
  position: { x: number; y: number };
  diedAtTick: number;
  cause: "combat" | "starvation" | "fall" | "unknown";
  lastThreat: number;
}

export interface GhostTown {
  id: string;
  name: string;
  regionId: string;
  position: { x: number; y: number };
  originalPopulation: number;
  abandonedAtTick: number;
  cause: "war" | "plague" | "resource_depletion" | "player_exodus" | "mysterious";
  hauntingIntensity: number;
}

export interface BloodOffering {
  regionId: string;
  position: { x: number; y: number };
  totalDeaths: number;
  deathsByType: Record<string, number>;
  firstDeathTick: number;
  lastDeathTick: number;
  dangerLevel: number;
  dungeonEmergenceThreshold: number;
  dungeonType?: DungeonEmergenceProphecy["dungeonType"];
}

export interface WarfrontMemory {
  cycleId: string;
  seasonId: string;
  phase: string;
  sectors: { id: string; kind: string; targetPoints: number; reachedPoints: number }[];
  outcome: "victory" | "defeat" | "draw" | "boss_spawned" | "boss_defeated";
  endedAtTick: number;
  participatingPlayers: number;
}

export interface OracleVision {
  id: string;
  tick: number;
  stateHash: string;
  type: "dungeon_revelation" | "ghost_town_warning" | "faction_collapse" | "warfront_forecast" | "ancient_secret";
  priority: number;
  certainty: number;
  subject: { type: "region" | "dungeon" | "faction" | "npc" | "player" | "item"; id: string; name: string; position?: { x: number; y: number } };
  prophecy: string;
  interpretation: string;
  visionHash: string;
}

export interface DungeonEmergenceProphecy {
  position: { x: number; y: number };
  regionId: string;
  accumulatedDeaths: number;
  emergenceLikelihood: number;
  predictedTick: number;
  dungeonName: string;
  dungeonType: "crypt" | "battlefield" | "sacrifice_altar" | "mass_grave" | "warfront_ruin";
}

export interface CompleteOracleVision {
  warfrontVisions: OracleVision[];
  dungeonProphecies: DungeonEmergenceProphecy[];
  ghostTownWarnings: OracleVision[];
  fallenEntityVisions: OracleVision[];
  ancientSecrets: OracleVision[];
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.trunc(value)));
}

function dungeonTypeFor(offering: BloodOffering): DungeonEmergenceProphecy["dungeonType"] {
  if (offering.dungeonType) return offering.dungeonType;
  const playerDeaths = offering.deathsByType.player ?? 0;
  const npcDeaths = offering.deathsByType.npc ?? 0;
  if (playerDeaths + npcDeaths >= 80) return "mass_grave";
  if (offering.dangerLevel >= 800) return "battlefield";
  return "crypt";
}

export class OracleVisionEngine {
  static analyzeWarfront(
    warfrontSnapshot: {
      cycleId: string;
      phase: string;
      sectors: { id: string; kind: string; currentPoints: number; targetPoints: number }[];
      frontBossActive: boolean;
    },
    state: { tick: number; stateHash: string },
  ): OracleVision[] {
    const visions: OracleVision[] = [];
    if (warfrontSnapshot.frontBossActive) {
      visions.push(this.createVision({
        tick: state.tick,
        stateHash: state.stateHash,
        type: "warfront_forecast",
        priority: 850,
        certainty: 900,
        subject: { type: "region", id: "warfront", name: "Kampfzone" },
        prophecy: "Der Kriegsherr erwacht. Seine Präsenz verdunkelt die Linien.",
        interpretation: "Ein Boss ist aktiv. Sei vorsichtig an der Front.",
      }));
    }

    for (const sector of warfrontSnapshot.sectors) {
      const progressPct = sector.targetPoints <= 0 ? 0 : (sector.currentPoints / sector.targetPoints) * 100;
      if (progressPct < 30) {
        visions.push(this.createVision({
          tick: state.tick,
          stateHash: state.stateHash,
          type: "faction_collapse",
          priority: 600 + Math.floor(progressPct),
          certainty: Math.floor(progressPct * 10),
          subject: { type: "region", id: sector.id, name: sector.kind },
          prophecy: `Der ${sector.kind}-Sektor steht vor dem Fall. Die Linien brechen.`,
          interpretation: "Eine Frontlinie benötigt Unterstützung.",
        }));
      }
    }
    return visions.sort((a, b) => b.priority - a.priority);
  }

  static analyzeBloodOfferings(offerings: BloodOffering[], state: { tick: number; stateHash: string }): DungeonEmergenceProphecy[] {
    return offerings
      .filter((offering) => offering.totalDeaths >= offering.dungeonEmergenceThreshold)
      .map((offering) => {
        const dungeonType = dungeonTypeFor(offering);
        const emergenceLikelihood = clamp(offering.totalDeaths * 8 + offering.dangerLevel / 2, 0, 1000);
        const hash = OracleEndpoint.hashDeterministic({ regionId: offering.regionId, dungeonType, state });
        return {
          position: offering.position,
          regionId: offering.regionId,
          accumulatedDeaths: offering.totalDeaths,
          emergenceLikelihood,
          predictedTick: state.tick + Math.max(10, 1000 - emergenceLikelihood),
          dungeonName: `${dungeonType}_${hash.slice(-8)}`,
          dungeonType,
        };
      })
      .sort((a, b) => b.emergenceLikelihood - a.emergenceLikelihood || a.regionId.localeCompare(b.regionId));
  }

  static analyzeGhostTowns(ghostTowns: GhostTown[], state: { tick: number; stateHash: string }): OracleVision[] {
    return ghostTowns
      .filter((town) => town.hauntingIntensity >= 500 && state.tick - town.abandonedAtTick >= 1000)
      .map((town) => this.createVision({
        tick: state.tick,
        stateHash: state.stateHash,
        type: "ghost_town_warning",
        priority: clamp(town.hauntingIntensity, 0, 1000),
        certainty: clamp(town.hauntingIntensity, 0, 1000),
        subject: { type: "region", id: town.id, name: town.name, position: town.position },
        prophecy: `Die Geister von ${town.name} flüstern noch immer.`,
        interpretation: "Eine verlassene Siedlung könnte gefährlich sein.",
      }));
  }

  static analyzeFallenEntities(fallen: FallenEntity[], state: { tick: number; stateHash: string }): OracleVision[] {
    const byRegion = new Map<string, FallenEntity[]>();
    for (const entity of fallen) {
      const list = byRegion.get(entity.regionId) ?? [];
      list.push(entity);
      byRegion.set(entity.regionId, list);
    }

    const visions: OracleVision[] = [];
    for (const [regionId, entities] of byRegion) {
      if (entities.length < 10) continue;
      const first = entities[0];
      visions.push(this.createVision({
        tick: state.tick,
        stateHash: state.stateHash,
        type: "dungeon_revelation",
        priority: clamp(entities.length * 50, 0, 1000),
        certainty: clamp(entities.length * 40, 0, 1000),
        subject: { type: "dungeon", id: `mass_grave:${regionId}`, name: `Todesfeld ${regionId}`, position: first.position },
        prophecy: `${entities.length} Gefallene nähren einen dunklen Ort.`,
        interpretation: "Viele Tode an einem Ort können Dungeon-Druck erzeugen.",
      }));
    }
    return visions.sort((a, b) => b.priority - a.priority);
  }

  static generateCompleteVision(
    warfrontSnapshot: Parameters<typeof OracleVisionEngine.analyzeWarfront>[0],
    bloodOfferings: BloodOffering[],
    ghostTowns: GhostTown[],
    fallen: FallenEntity[],
    state: { tick: number; stateHash: string },
  ): CompleteOracleVision {
    const warfrontVisions = this.analyzeWarfront(warfrontSnapshot, state);
    const dungeonProphecies = this.analyzeBloodOfferings(bloodOfferings, state);
    const ghostTownWarnings = this.analyzeGhostTowns(ghostTowns, state);
    const fallenEntityVisions = this.analyzeFallenEntities(fallen, state);
    const ancientSecrets = ghostTownWarnings.length > 0 && dungeonProphecies.length > 0
      ? [this.createVision({
          tick: state.tick,
          stateHash: state.stateHash,
          type: "ancient_secret",
          priority: 500,
          certainty: 500,
          subject: { type: "region", id: "ancient:combined", name: "Vergessene Verbindung" },
          prophecy: "Geister und Blutspuren zeigen auf eine ältere Wahrheit.",
          interpretation: "Mehrere historische Signale überlagern sich.",
        })]
      : [];
    return { warfrontVisions, dungeonProphecies, ghostTownWarnings, fallenEntityVisions, ancientSecrets };
  }

  private static createVision(input: Omit<OracleVision, "id" | "visionHash">): OracleVision {
    const visionHash = OracleEndpoint.hashDeterministic(input);
    return {
      ...input,
      id: `vision_${input.tick}_${visionHash.slice(-8)}`,
      visionHash,
    };
  }
}
