/**
 * OracleOuroborosConnector.ts
 *
 * Verbindet das Oracle-System mit dem Ouroboros-System.
 *
 * Die Idee:
 * - Ouroboros = dezentrale, autonome NPC-Intelligenz (unten-nach-oben)
 * - Oracle = zentrales Weltbewusstsein, das Muster in Ouroboros sieht (oben-nach-unten)
 * - Zusammen: Das Oracle "sieht" was die NPC-Zivilisation tut und gibt Visionen zurück
 *
 * Der Kreislauf:
 *   Ouroboros tickt → NPC-Aktionen → WorldHistory → Oracle analysiert → Visionen
 *                                                           ↓
 *   NPC-Brain erhält Vision → NPC-Entscheidungen beeinflusst ←┘
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

import type { WorldHistory } from "../modules/ouroboros/WorldHistory.js";
import type { DynamicFactions } from "../modules/ouroboros/DynamicFactions.js";
import type { EmergentMarket } from "../modules/ouroboros/EmergentMarket.js";
import type { NPCBrainRunner } from "../modules/npc/brain/index.js";
import type { NPCMemoryV3 } from "../modules/npc/brain/index.js";

// ============================================================================
// Oracle Observations aus Ouroboros
// ============================================================================

/**
 * Beobachtete Events von Ouroboros, die das Oracle analysieren kann
 */
export interface OuroborosObservation {
  tick: number;
  stateHash: string;

  // Fraktions-Events
  factionWars: { factionA: string; factionB: string; intensity: number }[];
  factionAlliances: { factionA: string; factionB: string }[];
  factionCollapses: { factionId: string; cause: string }[];

  // Markt-Events
  priceAnomalies: { resource: string; region: string; priceChange: number }[];
  tradeRouteClosures: { routeId: string; reason: string }[];

  // NPC-Massen-Events
  npcMigrations: { fromRegion: string; toRegion: string; count: number }[];
  npcMassDeaths: { regionId: string; cause: string; count: number }[];

  // Legendäre Events
  legendsBorn: { legendId: string; subject: string; spread: number }[];
  legendsFading: { legendId: string; age: number }[];

  // Kriegs-Front Status
  warfrontActive: boolean;
  warfrontPhase: string;
}

// ============================================================================
// NPC Vision - Vision die ein NPC vom Oracle erhält
// ============================================================================

/**
 * Eine Vision, die ein bestimmter NPC vom Oracle erhält.
 * Dies wird in die NPC-Memory integriert und beeinflusst zukünftige Entscheidungen.
 */
export interface NPCVision {
  visionId: string;
  npcId: string;
  tick: number;

  // Vision-Inhalt
  type: "omen" | "prophecy" | "warning" | "guidance" | "ancient_knowledge";
  strength: number; // 0-1000

  // Was der NPC "sieht"
  message: string;
  subject?: {
    type: string;
    id: string;
    name: string;
    position?: { x: number; y: number };
  };

  // Wie sicher die Vision ist
  certainty: number;

  // Deterministischer Hash
  visionHash: string;
}

// ============================================================================
// OracleOuroborosConnector
// ============================================================================

/**
 * Verbindet Oracle mit Ouroboros für bidirektionale Kommunikation.
 *
 * Funktionen:
 * 1. Beobachte Ouroboros-Events und erstelle prophetische Visionen
 * 2. Transformiere Visionen für NPC-Brain und beeinflusse NPC-Entscheidungen
 * 3. Erkenne Muster in der NPC-Zivilisation
 */
export class OracleOuroborosConnector {
  private historySnapshot: Map<number, OuroborosObservation> = new Map();
  private npcVisions: Map<string, NPCVision[]> = new Map();
  private pendingVisions: NPCVision[] = [];

  constructor(
    private readonly config: {
      visionInterval?: number; // Alle wie viele Ticks Oracle-Visionen generiert
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

  // ==========================================================================
  // SCHRITT 1: Ouroboros beobachten
  // ==========================================================================

  /**
   * Beobachte einen Ouroboros-Tick und sammle Events
   */
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

    // Sammle Fraktions-Events aus History
    const recentEvents = worldHistory.getRecentEvents(100); // Letzte 100 Events

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
            factionId: event.actorId ?? "unknown",
            cause: event.data?.cause ?? "unknown",
          });
          break;

        case "legend_born":
          observation.legendsBorn.push({
            legendId: event.actorId ?? "unknown",
            subject: event.actorName ?? "unknown",
            spread: event.intensity ?? 0.5,
          });
          break;

        case "npc_migration":
          observation.npcMigrations.push({
            fromRegion: event.data?.from ?? "unknown",
            toRegion: event.data?.to ?? "unknown",
            count: event.data?.count ?? 1,
          });
          break;

        case "npc_mass_death":
          observation.npcMassDeaths.push({
            regionId: event.data?.regionId ?? "unknown",
            cause: event.data?.cause ?? "unknown",
            count: event.data?.count ?? 1,
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

    // Speichere Beobachtung
    this.historySnapshot.set(tick, observation);

    return observation;
  }

  // ==========================================================================
  // SCHRITT 2: Prophetische Analyse
  // ==========================================================================

  /**
   * Generiere prophetische Visionen basierend auf Ouroboros-Beobachtungen
   */
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

    // Nutze die VisionEngine für die Analyse
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

    // Zusätzliche Zivilisations-Insights
    const civilizationInsights = this.analyzeCivilizationPatterns(observation);

    return {
      oracleVisions: result.warfrontVisions,
      dungeonProphecies: result.dungeonProphecies,
      civilizationInsights,
    };
  }

  /**
   * Analysiere Zivilisations-Muster
   */
  private analyzeCivilizationPatterns(observation: OuroborosObservation): string[] {
    const insights: string[] = [];

    // Fraktions-Konflikte analysieren
    if (observation.factionWars.length >= 3) {
      insights.push(
        `Die Welt steht am Rand eines großen Krieges. ${observation.factionWars.length} Fraktionskonflikte toben.`
      );
    }

    // Fraktions-Kollaps
    if (observation.factionCollapses.length > 0) {
      insights.push(
        `${observation.factionCollapses.length} Fraktion(en) ist/sind zusammengebrochen. Die Machtverhältnisse verschieben sich.`
      );
    }

    // Legendäre Events
    if (observation.legendsBorn.length >= 5) {
      insights.push(
        "Neue Legenden entstehen. Die NPC-Zivilisation erzählt Geschichten von Helden und Schurken."
      );
    }

    // Massen-Migration
    if (observation.npcMigrations.length >= 2) {
      const totalMigrants = observation.npcMigrations.reduce((sum, m) => sum + m.count, 0);
      insights.push(
        `${totalMigrants} NPCs haben ihre Heimat verlassen. Eine Völkerwanderung beginnt.`
      );
    }

    // Massen-Tode
    if (observation.npcMassDeaths.length > 0) {
      const totalDeaths = observation.npcMassDeaths.reduce((sum, d) => sum + d.count, 0);
      insights.push(
        `${totalDeaths} NPCs sind gestorben. Die Blutopfer sammeln sich an...`
      );
    }

    return insights;
  }

  // ==========================================================================
  // SCHRITT 3: Visionen für NPCs transformieren
  // ==========================================================================

  /**
   * Transformiere Oracle-Visionen für NPC-Brain
   */
  transformVisionForNPC(
    vision: OracleVision,
    npcId: string,
    npcPosition: { x: number; y: number }
  ): NPCVision {
    // Berechne Distanz zum Vision-Subject
    const distance = vision.subject?.position
      ? Math.sqrt(
          Math.pow(vision.subject.position.x - npcPosition.x, 2) +
            Math.pow(vision.subject.position.y - npcPosition.y, 2)
        )
      : 1000; // Default weit weg

    // Stärke nimmt mit Distanz ab
    const distanceFactor = Math.max(0.1, 1 - distance / 500);
    const strength = Math.floor(
      (this.config.prophecyStrengthBase ?? 500) * distanceFactor * (vision.certainty / 1000)
    );

    // Bestimme Vision-Typ
    let visionType: NPCVision["type"] = "guidance";
    if (vision.type === "dungeon_revelation" || vision.type === "ghost_town_warning") {
      visionType = "warning";
    } else if (vision.type === "ancient_secret") {
      visionType = "ancient_knowledge";
    } else if (vision.type === "faction_collapse" || vision.type === "warfront_forecast") {
      visionType = "omen";
    }

    const npcVision: NPCVision = {
      visionId: vision.id,
      npcId,
      tick: vision.tick,
      type: visionType,
      strength: Math.max(100, strength), // Minimum 100
      message: vision.prophecy,
      subject: vision.subject,
      certainty: vision.certainty,
      visionHash: vision.visionHash,
    };

    return npcVision;
  }

  /**
   * Verteile Visionen an relevante NPCs basierend auf Position
   */
  distributeVisionsToNPCs(
    visions: OracleVision[],
    npcs: Array<{ id: string; name: string; position: { x: number; y: number } }>
  ): void {
    for (const npc of npcs) {
      // Finde relevante Visionen für diesen NPC
      const relevantVisions = visions
        .map((v) => this.transformVisionForNPC(v, npc.id, npc.position))
        .filter((v) => v.strength >= 200); // Nur starke Visionen

      if (relevantVisions.length > 0) {
        // Beste Vision auswählen
        const bestVision = relevantVisions.reduce((best, v) =>
          v.strength > best.strength ? v : best
        );

        this.addVisionToNPC(npc.id, bestVision);
      }
    }
  }

  /**
   * Füge eine Vision zu einem NPC hinzu
   */
  private addVisionToNPC(npcId: string, vision: NPCVision): void {
    const visions = this.npcVisions.get(npcId) ?? [];
    visions.push(vision);

    // Limit visions per NPC
    if (visions.length > (this.config.maxVisionsPerNpc ?? 5)) {
      visions.shift(); // Remove oldest
    }

    this.npcVisions.set(npcId, visions);
    this.pendingVisions.push(vision);
  }

  /**
   * Hole alle Visionen für einen NPC (für NPC-Brain)
   */
  getNPCVisions(npcId: string): NPCVision[] {
    return this.npcVisions.get(npcId) ?? [];
  }

  /**
   * Hole die aktuellste Vision eines bestimmten Typs für einen NPC
   */
  getLatestVisionOfType(npcId: string, type: NPCVision["type"]): NPCVision | null {
    const visions = this.npcVisions.get(npcId) ?? [];
    return visions.filter((v) => v.type === type).pop() ?? null;
  }

  // ==========================================================================
  // SCHRITT 4: NPC-Brain Integration
  // ==========================================================================

  /**
   * Integriere Visionen in NPC-Memory für Entscheidungsfindung
   */
  integrateVisionIntoMemory(memory: NPCMemoryV3, visions: NPCVision[]): NPCMemoryV3 {
    // Füge Visionen als "Erinnerungen" hinzu
    const latestVision = visions[visions.length - 1];
    if (!latestVision) return memory;

    // Vision beeinflusst den "Glauben" des NPC
    const beliefMod = latestVision.strength / 1000;

    // Hier würde die Memory aktualisiert werden
    // (Abhängig von der konkreten NPCMemoryV3 Implementierung)
    return memory;
  }

  /**
   * Verarbeite NPC-Brain-Output und beeinflusse mit Visionen
   */
  processNPCDecision(
    npcId: string,
    proposedAction: string,
    context: { tick: number; dangerLevel: number }
  ): {
    action: string;
    modified: boolean;
    reason: string;
  } {
    const visions = this.getNPCVisions(npcId);
    if (visions.length === 0) {
      return { action: proposedAction, modified: false, reason: "Keine Visionen" };
    }

    const latestVision = visions[visions.length - 1];

    // Wenn Vision ein "Warning" ist und DangerLevel niedrig → sei vorsichtiger
    if (latestVision.type === "warning" && context.dangerLevel < 0.3) {
      if (proposedAction === "explore" || proposedAction === "wander") {
        return {
          action: "idle",
          modified: true,
          reason: `Oracle warnt: ${latestVision.message.slice(0, 50)}...`,
        };
      }
    }

    // Wenn Vision ein "Omen" ist → erhöhe Aggressivität
    if (latestVision.type === "omen" && latestVision.strength > 600) {
      if (proposedAction === "idle") {
        return {
          action: "patrol",
          modified: true,
          reason: `Omen empfunden: ${latestVision.message.slice(0, 50)}...`,
        };
      }
    }

    // Ancient Knowledge → erlaubt besondere Aktionen
    if (latestVision.type === "ancient_knowledge") {
      return {
        action: proposedAction,
        modified: true,
        reason: `Wissen der Ahnen: ${latestVision.message.slice(0, 50)}...`,
      };
    }

    return { action: proposedAction, modified: false, reason: "Vision nicht relevant" };
  }

  // ==========================================================================
  // Hilfsmethoden
  // ==========================================================================

  /**
   * Hole alle akkumulierten Beobachtungen
   */
  getAllObservations(): Map<number, OuroborosObservation> {
    return new Map(this.historySnapshot);
  }

  /**
   * Hole aggregierte Statistiken
   */
  getStats(): {
    totalObservations: number;
    totalNPCVisions: number;
    pendingVisions: number;
    observationsByTick: number;
  } {
    return {
      totalObservations: this.historySnapshot.size,
      totalNPCVisions: Array.from(this.npcVisions.values()).reduce(
        (sum, v) => sum + v.length,
        0
      ),
      pendingVisions: this.pendingVisions.length,
      observationsByTick: this.historySnapshot.size,
    };
  }

  /**
   * Reset
   */
  reset(): void {
    this.historySnapshot.clear();
    this.npcVisions.clear();
    this.pendingVisions = [];
  }
}

// ============================================================================
// Vereinfachter Observer für direkte Integration
// ============================================================================

/**
 * Einfache Funktion um Ouroboros-Events zu beobachten und Oracle-Visionen zu generieren
 */
export function createOracleObserver(config?: {
  visionInterval?: number;
  maxVisionsPerNpc?: number;
}): {
  observe: (tick: number, stateHash: string) => OuroborosObservation;
  getVisions: () => OracleVision[];
  getNPCVision: (npcId: string) => NPCVision[];
  processTick: (
    tick: number,
    worldHistory: WorldHistory,
    factions: DynamicFactions,
    market: EmergentMarket,
    npcs: Array<{ id: string; position: { x: number; y: number } }>
  ) => void;
} {
  const connector = new OracleOuroborosConnector(config);
  let lastVisions: OracleVision[] = [];

  return {
    observe: (tick: number, stateHash: string) => {
      // Placeholder - würde WorldHistory, Factions, Market benötigen
      return {
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
    },

    getVisions: () => lastVisions,

    getNPCVision: (npcId: string) => connector.getNPCVisions(npcId),

    processTick: (
      tick: number,
      _worldHistory: WorldHistory,
      _factions: DynamicFactions,
      _market: EmergentMarket,
      _npcs: Array<{ id: string; position: { x: number; y: number } }>
    ) => {
      // Hier würde die vollständige Verarbeitung stattfinden
      // Für Demo-Zwecke vereinfacht
    },
  };
}