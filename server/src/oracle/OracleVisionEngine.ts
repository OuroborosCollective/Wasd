/**
 * OracleVisionEngine.ts
 *
 * Erweiterte Vision-Engine für das Oracle.
 *
 * Fähigkeiten:
 * 1. Warfront-Sicht - aktuelle Konflikte, Fraktionsspannungen, Boss-Phasen
 * 2. Historische Analyse - untergegangene Spieler, verlassene Siedlungen
 * 3. Prophetische Muster - Dungeons entstehen aus "Blutopfer", Geisterstädte aus verlassenen NPCs
 *
 * WICHTIG: Alles ist deterministisch - keine Zufälle, nur Hash-basierte Mustererkennung
 */

import { OracleEndpoint } from "./OracleEndpoint.js";

// ============================================================================
// Historische Datenstrukturen
// ============================================================================

/**
 * Ein gefallener Spieler oder NPC -历史的 Fragment
 */
export interface FallenEntity {
  id: string;
  type: "player" | "npc";
  name: string;
  regionId: string;
  position: { x: number; y: number };
  diedAtTick: number;
  cause: "combat" | "starvation" | "fall" | "unknown";
  lastThreat: number; // Bedrohungslevel beim Tod
}

/**
 * Eine verlassene Siedlung - entstanden durch Abwanderung oder Untergang
 */
export interface GhostTown {
  id: string;
  name: string;
  regionId: string;
  position: { x: number; y: number };
  originalPopulation: number;
  abandonedAtTick: number;
  cause: "war" | "plague" | "resource_depletion" | "player_exodus" | "mysterious";
  hauntingIntensity: number; // 0-1000, wie sehr "spukt" es
}

/**
 * Akkumulierte Blutopfer an einem Ort - Grundlage für Dungeon-Entstehung
 */
export interface BloodOffering {
  regionId: string;
  position: { x: number; y: number };
  totalDeaths: number;
  deathsByType: Record<string, number>; // "player": 50, "npc": 120
  firstDeathTick: number;
  lastDeathTick: number;
  dangerLevel: number; // 0-1000
  dungeonEmergenceThreshold: number;
}

/**
 * Vergangenes Warfront-Event
 */
export interface WarfrontMemory {
  cycleId: string;
  seasonId: string;
  phase: string;
  sectors: {
    id: string;
    kind: string;
    targetPoints: number;
    reachedPoints: number;
  }[];
  outcome: "victory" | "defeat" | "draw" | "boss_spawned" | "boss_defeated";
  endedAtTick: number;
  participatingPlayers: number;
}

// ============================================================================
// Prophetische Strukturen
// ============================================================================

/**
 * Eine prophetische Vision - berechnet, nicht zufällig
 */
export interface OracleVision {
  id: string;
  tick: number;
  stateHash: string;

  // Vision-Typ
  type: "dungeon_revelation" | "ghost_town_warning" | "faction_collapse" | "warfront_forecast" | "ancient_secret";

  // Priorität und Dringlichkeit
  priority: number;
  certainty: number; // 0-100, wie sicher ist die Prophezeiung

  // Der prophetische Inhalt
  subject: {
    type: "region" | "dungeon" | "faction" | "npc" | "player" | "item";
    id: string;
    name: string;
    position?: { x: number; y: number };
  };

  // Die Prophezeiung selbst
  prophecy: string;
  interpretation: string; // Wie soll der Spieler es verstehen

  // Deterministischer Hash für Reproduzierbarkeit
  visionHash: string;
}

/**
 * Dungeon-Entstehungs-Prophetie
 */
export interface DungeonEmergenceProphecy {
  position: { x: number; y: number };
  regionId: string;
  accumulatedDeaths: number;
  emergenceLikelihood: number; // 0-1000
  predictedTick: number; // Wann es entstehen könnte (falls überhaupt)
  dungeonName: string; // Deterministisch generiert
  dungeonType: "crypt" | "battlefield" | "sacrifice_altar" | "mass_grave" | "warfront_ruin";
}

// ============================================================================
// OracleVisionEngine
// ============================================================================

export class OracleVisionEngine {
  private static readonly DUNGEON_EMERGENCE_THRESHOLD = 50; // Tode bevor ein Dungeon entstehen kann
  private static readonly GHOST_TOWN_FORMATION_TICKS = 10000; // Ticks ohne NPC-Aktivität
  private static readonly BLOOD_OFFERING_DECAY = 0.999; // Jeder Tick sinkt die Intensität leicht

  /**
   * Analysiere Warfront-Daten und generiere prophetische Visionen
   */
  static analyzeWarfront(
    warfrontSnapshot: {
      cycleId: string;
      phase: string;
      sectors: { id: string; kind: string; currentPoints: number; targetPoints: number }[];
      frontBossActive: boolean;
    },
    state: { tick: number; stateHash: string }
  ): OracleVision[] {
    const visions: OracleVision[] = [];

    // 1. Boss-Phasen-Prophetie
    if (warfrontSnapshot.frontBossActive) {
      visions.push(
        this.createVision({
          tick: state.tick,
          stateHash: state.stateHash,
          type: "warfront_forecast",
          priority: 850,
          certainty: 900,
          subject: { type: "region", id: "warfront", name: "Kampfzone" },
          prophecy: "Der Kriegsherr erwacht. Seine Präsenz verdunkelt die Linien.",
          interpretation: "Ein Boss ist aktiv. Sei vorsichtig an der Front.",
        })
      );
    }

    // 2. Sektor-Analyse - welcher Sektor wird verlieren?
    for (const sector of warfrontSnapshot.sectors) {
      const progressPct = (sector.currentPoints / sector.targetPoints) * 100;

      if (progressPct < 30) {
        visions.push(
          this.createVision({
            tick: state.tick,
            stateHash: state.stateHash,
            type: "faction_collapse",
            priority: 600 + Math.floor(progressPct),
            certainty: Math.floor(progressPct * 10),
            subject: { type: "region", id: sector.id, name: sector.kind },
            prophecy: `Der ${sector.kind}-Sektor steht vor dem Fall. Die Linien brechen.`,
            interpretation: `${sector.kind}-Beiträge werden dringend benötigt.`,
          })
        );
      }
    }

    return visions;
  }

  /**
   * Analysiere Blood Offerings und predige Dungeon-Entstehung
   */
  static analyzeBloodOfferings(
    offerings: BloodOffering[],
    state: { tick: number; stateHash: string }
  ): DungeonEmergenceProphecy[] {
    const prophecies: DungeonEmergenceProphecy[] = [];

    for (const offering of offerings) {
      // Berechne Emergenz-Likelihood basierend auf Todesanzahl und Zeit
      const timeFactor = Math.min(1, (offering.lastDeathTick - offering.firstDeathTick) / 10000);
      const deathFactor = Math.min(1, offering.totalDeaths / 100);
      const dangerFactor = offering.dangerLevel / 1000;

      const likelihood =
        (timeFactor * 0.3 + deathFactor * 0.4 + dangerFactor * 0.3) * 1000;

      if (likelihood >= 400) {
        const dungeonName = this.generateDungeonName(offering, state.stateHash);
        const dungeonType = this.determineDungeonType(offering);

        // Predicted tick basierend auf Akkumulation
        const ticksUntilEmergence = Math.max(
          1000,
          Math.floor((1000 - likelihood) * 10)
        );

        prophecies.push({
          position: offering.position,
          regionId: offering.regionId,
          accumulatedDeaths: offering.totalDeaths,
          emergenceLikelihood: Math.floor(likelihood),
          predictedTick: offering.lastDeathTick + ticksUntilEmergence,
          dungeonName,
          dungeonType,
        });
      }
    }

    return prophecies.sort((a, b) => b.emergenceLikelihood - a.emergenceLikelihood);
  }

  /**
   * Analysiere Geisterstädte und generiere Warnungen
   */
  static analyzeGhostTowns(
    ghostTowns: GhostTown[],
    state: { tick: number; stateHash: string }
  ): OracleVision[] {
    const visions: OracleVision[] = [];

    for (const town of ghostTowns) {
      // Je länger verlassen, desto stärker das "Spuken"
      const abandonmentDuration = state.tick - town.abandonedAtTick;
      const hauntingIntensity = Math.min(
        1000,
        town.hauntingIntensity + Math.floor(abandonmentDuration / 100)
      );

      if (hauntingIntensity >= 500) {
        visions.push(
          this.createVision({
            tick: state.tick,
            stateHash: state.stateHash,
            type: "ghost_town_warning",
            priority: 500 + Math.floor(hauntingIntensity / 10),
            certainty: Math.floor(hauntingIntensity / 5),
            subject: {
              type: "region",
              id: town.id,
              name: town.name,
              position: town.position,
            },
            prophecy: `${town.name} ruft. Die Geister der Vergangenheit flüstern.`,
            interpretation: `Eine verlassene Siedlung mit verstärktem Spuk. ${town.cause}-bezogene Gefahren möglich.`,
          })
        );
      }
    }

    return visions;
  }

  /**
   * Analysiere gefallene Entitäten und finde Muster
   */
  static analyzeFallenEntities(
    fallen: FallenEntity[],
    state: { tick: number; stateHash: string }
  ): OracleVision[] {
    const visions: OracleVision[] = [];

    // Gruppiere nach Region
    const byRegion = new Map<string, FallenEntity[]>();
    for (const entity of fallen) {
      const list = byRegion.get(entity.regionId) ?? [];
      list.push(entity);
      byRegion.set(entity.regionId, list);
    }

    // Finde "mass grave" Regionen
    for (const [regionId, entities] of byRegion) {
      if (entities.length >= 10) {
        const avgThreat = entities.reduce((sum, e) => sum + e.lastThreat, 0) / entities.length;
        const playerDeaths = entities.filter((e) => e.type === "player").length;

        visions.push(
          this.createVision({
            tick: state.tick,
            stateHash: state.stateHash,
            type: "dungeon_revelation",
            priority: 400 + Math.min(400, entities.length * 10),
            certainty: Math.min(900, 300 + entities.length * 5),
            subject: { type: "region", id: regionId, name: `Todesfeld ${regionId}` },
            prophecy: `An dieser Stätte wurden ${entities.length} Seelen geopfert. Die Erde hat sich vollgesogen.`,
            interpretation: `Ein Dungeon könnte sich bilden. Durchschnittliche Bedrohung: ${Math.floor(avgThreat)}. ${playerDeaths} Spieler sind hier gefallen.`,
          })
        );
      }
    }

    return visions;
  }

  /**
   * Generiere umfassende prophetische Analyse
   */
  static generateCompleteVision(
    warfrontSnapshot: {
      cycleId: string;
      phase: string;
      sectors: { id: string; kind: string; currentPoints: number; targetPoints: number }[];
      frontBossActive: boolean;
    },
    bloodOfferings: BloodOffering[],
    ghostTowns: GhostTown[],
    fallenEntities: FallenEntity[],
    state: { tick: number; stateHash: string }
  ): {
    warfrontVisions: OracleVision[];
    dungeonProphecies: DungeonEmergenceProphecy[];
    ghostTownWarnings: OracleVision[];
    fallenEntityVisions: OracleVision[];
    ancientSecrets: OracleVision[];
  } {
    const warfrontVisions = this.analyzeWarfront(warfrontSnapshot, state);
    const dungeonProphecies = this.analyzeBloodOfferings(bloodOfferings, state);
    const ghostTownWarnings = this.analyzeGhostTowns(ghostTowns, state);
    const fallenEntityVisions = this.analyzeFallenEntities(fallenEntities, state);

    // Generiere "ancient secrets" basierend auf Kombination aller Daten
    const ancientSecrets = this.discoverAncientSecrets(
      { warfrontVisions, dungeonProphecies, ghostTownWarnings, fallenEntityVisions },
      state
    );

    return {
      warfrontVisions,
      dungeonProphecies,
      ghostTownWarnings,
      fallenEntityVisions,
      ancientSecrets,
    };
  }

  /**
   * Entdecke "ancient secrets" - seltene prophetische Einsichten
   */
  private static discoverAncientSecrets(
    data: {
      warfrontVisions: OracleVision[];
      dungeonProphecies: DungeonEmergenceProphecy[];
      ghostTownWarnings: OracleVision[];
      fallenEntityVisions: OracleVision[];
    },
    state: { tick: number; stateHash: string }
  ): OracleVision[] {
    const secrets: OracleVision[] = [];

    // Kombination: Ghost Town + Dungeon Prophecy = "Verwunschenes Schloss"
    if (data.ghostTownWarnings.length > 0 && data.dungeonProphecies.length > 0) {
      const combinedHash = OracleEndpoint.hashDeterministic({
        towns: data.ghostTownWarnings.map((v) => v.subject.id),
        dungeons: data.dungeonProphecies.map((d) => d.position),
        tick: state.tick,
      });

      if (combinedHash.includes("a")) {
        // Deterministischer "Zufall"
        secrets.push(
          this.createVision({
            tick: state.tick,
            stateHash: state.stateHash,
            type: "ancient_secret",
            priority: 950,
            certainty: 700,
            subject: {
              type: "dungeon",
              id: `secret_${combinedHash.slice(0, 8)}`,
              name: "Das Vergessene Schloss",
            },
            prophecy:
              "Ich sehe ein Schloss, das aus den Träumen einer toten Stadt erwacht. Seine Türme ragen durch die Zeit.",
            interpretation:
              "Ein seltenes Dungeon mit einzigartigen Belohnungen. Kombination aus Spukort und Blutopfer.",
          })
        );
      }
    }

    // Viele gefallene Spieler an einem Warfront = "Kriegergrab"
    const warfrontFallen = data.fallenEntityVisions.filter((v) =>
      v.prophecy.includes("Todesfeld")
    );
    if (warfrontFallen.length >= 3) {
      secrets.push(
        this.createVision({
          tick: state.tick,
          stateHash: state.stateHash,
          type: "ancient_secret",
          priority: 980,
          certainty: 850,
          subject: {
            type: "dungeon",
            id: "warrior_grave",
            name: "Kriegergrab",
          },
          prophecy:
            "Ein Ort, an dem Krieger für immer ruhen. Ihre Waffen rosten, aber ihr Geist wacht.",
          interpretation:
            "Ein Dungeon voller Krieger-Geister. Hohe Belohnungen, hohe Gefahr.",
        })
      );
    }

    return secrets;
  }

  /**
   * Hilfsmethode: Generiere Dungeon-Namen deterministisch
   */
  private static generateDungeonName(offering: BloodOffering, seed: string): string {
    const dungeonNamesByType: Record<string, string[]> = {
      crypt: ["Gruft der Vergessenen", "Schattenkammer", "Totenhalle"],
      battlefield: ["Schlachtfeld der Ewigkeit", "Blutige Weide", "Knochenau"],
      sacrifice_altar: ["Altar der Opferung", "Schrein des Blutes", "Götterplatz"],
      mass_grave: ["Massengrab", "Friedhof der Namenlosen", "Stille Stätte"],
      warfront_ruin: ["Ruinen der Schlacht", "Trümmerfeld", "Kriegsüberreste"],
    };

    const type = this.determineDungeonType(offering);
    const names = dungeonNamesByType[type] ?? dungeonNamesByType.crypt;

    // Deterministische Auswahl
    const hash = OracleEndpoint.hashDeterministic({
      offering,
      seed,
    });
    const index = parseInt(hash.replace("are_", ""), 16) % names.length;

    return names[index];
  }

  /**
   * Hilfsmethode: Bestimme Dungeon-Typ basierend auf Todesarten
   */
  private static determineDungeonType(offering: BloodOffering): BloodOffering["dungeonType"] {
    // Zähle Todesarten
    const types = Object.entries(offering.deathsByType);

    if (types.length === 0) return "crypt";

    // Finde dominante Todesart
    let maxCount = 0;
    let dominantType = "unknown";

    for (const [type, count] of types) {
      if (count > maxCount) {
        maxCount = count;
        dominantType = type;
      }
    }

    // Mappe zu Dungeon-Typ
    const typeMap: Record<string, BloodOffering["dungeonType"]> = {
      player_combat: "battlefield",
      npc_combat: "warfront_ruin",
      sacrifice: "sacrifice_altar",
      starvation: "mass_grave",
      fall: "crypt",
      unknown: "crypt",
    };

    return typeMap[dominantType] ?? "crypt";
  }

  /**
   * Hilfsmethode: Erstelle eine prophetische Vision
   */
  private static createVision(input: {
    tick: number;
    stateHash: string;
    type: OracleVision["type"];
    priority: number;
    certainty: number;
    subject: OracleVision["subject"];
    prophecy: string;
    interpretation: string;
  }): OracleVision {
    const base = {
      type: input.type,
      priority: input.priority,
      certainty: input.certainty,
      subject: input.subject,
      prophecy: input.prophecy,
      interpretation: input.interpretation,
      stateHash: input.stateHash,
    };

    const visionHash = OracleEndpoint.hashDeterministic({
      ...base,
      tick: input.tick,
    });

    return {
      id: `vision_${input.tick}_${visionHash.slice(0, 8)}`,
      tick: input.tick,
      stateHash: input.stateHash,
      ...base,
      visionHash,
    };
  }
}