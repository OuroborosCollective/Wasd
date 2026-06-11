/**
 * LivingWorldErdosOuroborosSystem.ts
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * DAS LEBENDE WELT-ERDŐS-OUROBOROS SYSTEM
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Ein rekursives, selbstorganisierendes Weltsystem, das:
 *
 *  1. EINHEITLICH IST - Alle Systeme sind Teil eines Kreislaufs
 *  2. REKURSIV IST - Aus Zerfall entsteht neues Leben
 *  3. EMERGENT IST - Komplexe Muster entstehen aus einfachen Regeln
 *  4. DETERMINISTISCH IST - Alles basiert auf ARE-Logic und Hashing
 *  5. ATMET - Das System "atmet" durch die 13 Layer
 *
 * DER KREISLAUF:
 *
 *    ┌─────────────────────────────────────────────────────────────────────┐
 *    │                    LEBEN → TOD → ZERFALL → WIEDERGEBURT            │
 *    │                            ↺                                        │
 *    │                                                                     │
 *    │   ENERGIE ──────────────────────────────────────────→ WIRTSCHAFT   │
 *    │       ↓                                                       ↓    │
 *    │   NATUR ←────────────────────────────────────────────── HANDEL    │
 *    │       ↓                                                       ↓    │
 *    │   KLIMA ←────────────────┬────────────────────────── GESELLSCHAFT   │
 *    │       ↓                 ↓                        ↓              │
 *    │   RESSOURCEN        KULTUR                  POLITIK               │
 *    │       ↓                 ↓                        ↓              │
 *    │   ÖKOLOGIE ←────────────────────────── KÖNIGREICHE                 │
 *    │       ↓                                            ↓               │
 *    │   LEBEN ───────────────────────────→ GLAUBE                         │
 *    │       ↓                                            ↓               │
 *    │   NPC-ZIVILISATION ←─────────────────────────── FRIEDEN/KRIEG       │
 *    │                                                                     │
 *    └─────────────────────────────────────────────────────────────────────┘
 *
 * 13 LAYER (ARE-Logic) als "Organe" der Welt:
 *
 *  Layer 1:  ecology      → Ökologie (Natur, Ressourcen)
 *  Layer 2:  market       → Markt (Preise, Angebot/Nachfrage)
 *  Layer 3:  physiology  → Physiologie (NPC-Energie, Gesundheit)
 *  Layer 4:  trade       → Handel (Routen, Attraktivität)
 *  Layer 5:  memory       → Gedächtnis (Ruf, Geschichte)
 *  Layer 6:  politics    → Politik (Territorialer Einfluss)
 *  Layer 7:  conflict     → Konflikt (Kriegsfront-Spitzen)
 *  Layer 8:  economy     → Ökonomie (Strukturelles Wachstum)
 *  Layer 9:  kingdoms    → Königtümer (Strategischer Wert)
 *  Layer 10: faith       → Glaube (Ideologische Spannung)
 *  Layer 11: dungeon     → Dungeon (Monster-Spawn)
 *  Layer 12: fear        → Angst (Sicherheitsbedürfnis)
 *  Layer 13: cycles      → Zyklen (Ressourcen-Kreislauf)
 *
 * ERDŐS-ATTRACTOR (Ω_E):
 *
 *  Das System konvergiert zu stabilen Zuständen (Attraktoren):
 *  - STABLE: Harmonie
 *  - VILLAGE_TO_CITY: Urbanisierung
 *  - AGGRESSION_SPIKE: Krieg
 *  - MARKET_COLLAPSE: Wirtschaftskrise
 *  - CULT_FORMATION: Religiöse Erweckung
 *  - DUNGEON_EMERGENCE: Dungeon entsteht
 *  - FAMINE: Hungersnot
 *  - PLAGUE: Seuche
 *  - GOLDEN_AGE: Goldenes Zeitalter
 *  - DARK_AGE: Dunkles Zeitalter
 */

import { OracleEndpoint } from "./OracleEndpoint.js";
import { OracleOuroborosConnector, type OuroborosObservation, type NPCVision } from "./OracleOuroborosConnector.js";
import { OracleVisionEngine, type OracleVision, type BloodOffering, type GhostTown, type FallenEntity } from "./OracleVisionEngine.js";

// ============================================================================
// TYPEN FÜR DEN LEBENDEN WELT-KREISLAUF
// ============================================================================

/**
 * Die 13 Organe der Welt als funktionale Schichten
 */
export interface WorldOrgan {
  id: string;
  layer: number; // 1-13
  name: string;
  state: number; // 0-1000 (Kappa)
  previousState: number;
  delta: number; // Veränderung
  resonance: number; // Wellenartige Ausbreitung
}

export type AttractorType =
  | "STABLE"
  | "VILLAGE_TO_CITY"
  | "AGGRESSION_SPIKE"
  | "MARKET_COLLAPSE"
  | "CULT_FORMATION"
  | "DUNGEON_EMERGENCE"
  | "FAMINE"
  | "PLAGUE"
  | "GOLDEN_AGE"
  | "DARK_AGE"
  | "MIGRATION_WAVE"
  | "TRADE_EMBARGO"
  | "PEACE_TREATY";

/**
 * Ein Weltereignis im Kreislauf
 */
export interface WorldEvent {
  id: string;
  tick: number;
  type: EventType;
  attractor: AttractorType;

  // Quelle
  originChunk: string;
  originLayer: number;

  // Auswirkungen
  affectedLayers: number[];
  intensity: number; // 0-1000

  // Energie-Fluss
  energyDelta: number;
  entropyDelta: number;

  // Deterministischer Hash
  eventHash: string;

  // Beschreibung
  narrative: string;
  systemicImpact: string;
}

export type EventType =
  | "birth"
  | "death"
  | "war"
  | "peace"
  | "famine"
  | "harvest"
  | "plague"
  | "trade"
  | "migration"
  | "faith_event"
  | "discovery"
  | "collapse"
  | "rebirth";

/**
 * Ein vollständiger Zyklus-Zustand
 */
export interface CycleState {
  tick: number;
  omegaE: AttractorType;
  omegaStrength: number;

  // Die 13 Organe
  organs: WorldOrgan[];

  // Globaler Zustand
  totalEnergy: number;
  totalEntropy: number;
  civilizationMood: number; // -1000 bis +1000
  marketHeat: number;
  conflictHeat: number;
  faithHeat: number;

  // Ereignisse dieses Zyklus
  events: WorldEvent[];

  // Zustand-Shash
  stateHash: string;
}

/**
 * Informationsfluss zum/zur Hauptbrain
 */
export interface BrainInformationFlow {
  tick: number;

  // 13-Punkt-Analyse
  layerStates: number[];
  layerTrends: ("rising" | "falling" | "stable")[];
  dominantLayer: number;
  convergenceLevel: number;

  // Ereignis-Summary
  eventCount: number;
  criticalEvents: WorldEvent[];
  emergingPatterns: string[];

  // Lern-Signale
  attractorHistory: AttractorType[];
  moodTrajectory: number[];
  energyFlow: number[];

  // Recommendations für nächsten Zyklus
  recommendations: SystemRecommendation[];
}

export interface SystemRecommendation {
  priority: number;
  targetLayer: number;
  action: "amplify" | "dampen" | "redirect" | "stabilize";
  reason: string;
}

/**
 * Stimmungs-Kategorien für Zivilisationen
 */
export type CivilizationalMood =
  | "euforia"
  | "zufriedenheit"
  | "angespanntheit"
  | "unruhe"
  | "furcht"
  | "verzweiflung"
  | "hoffnung"
  | "stolz";

/**
 * Handelsregion
 */
export interface TradeRegion {
  id: string;
  name: string;
  position: { x: number; y: number };
  economy: number;
  supplyCapacity: number;
  demandFactor: number;
  priceIndex: number;
  tradeRoutes: string[];
}

/**
 * Weltereignis-Generator
 */
export interface WorldEventTemplate {
  type: EventType;
  attractor: AttractorType;
  minIntensity: number;
  maxIntensity: number;
  affectedLayers: number[];
  energyCost: number;
  narrativeTemplates: string[];
}

// ============================================================================
// DER LEBENDE WELT-ERDŐS-OUROBOROS KREISLAUF
// ============================================================================

export class LivingWorldErdosOuroborosSystem {
  // Core State
  private tick: number = 0;
  private cycleState: CycleState | null = null;

  // 13 Organe der Welt
  private organs: WorldOrgan[] = [];

  // Ereignis-Historie
  private eventHistory: WorldEvent[] = [];
  private attractorHistory: AttractorType[] = [];

  // Stimmungs-System
  private civilizationMoods: Map<string, CivilizationalMood> = new Map();
  private moodHistory: number[] = [];

  // Handels-Netzwerk
  private tradeRegions: Map<string, TradeRegion> = new Map();

  // Oracle-Integration
  private oracleConnector: OracleOuroborosConnector;

  // Konfiguration
  private readonly config = {
    resonanceDecay: 0.95, // Resonanz-Abnahme pro Tick
    entropyGrowth: 0.001, // Entropie-Wachstum
    moodInertia: 0.8, // Stimmungs-Trägheit
    eventThreshold: 700, // Schwelle für Weltereignis
    cycleComplexity: 13, // Anzahl Layer
  };

  constructor() {
    this.oracleConnector = new OracleOuroborosConnector();
    this.initializeOrgans();
    this.initializeTradeRegions();
  }

  // ==========================================================================
  // INITIALISIERUNG
  // ==========================================================================

  private initializeOrgans(): void {
    const organDefinitions = [
      { layer: 1, name: "ecology", desc: "Die lebendige Natur" },
      { layer: 2, name: "market", desc: "Der pulsierende Markt" },
      { layer: 3, name: "physiology", desc: "Die NPC-Vitalität" },
      { layer: 4, name: "trade", desc: "Die Handelsströme" },
      { layer: 5, name: "memory", desc: "Das kollektive Gedächtnis" },
      { layer: 6, name: "politics", desc: "Die politische Macht" },
      { layer: 7, name: "conflict", desc: "Der Krieg und Frieden" },
      { layer: 8, name: "economy", desc: "Das Wirtschaftswachstum" },
      { layer: 9, name: "kingdoms", desc: "Die Königtümer" },
      { layer: 10, name: "faith", desc: "Der Glaube" },
      { layer: 11, name: "dungeon", desc: "Die dunklen Orte" },
      { layer: 12, name: "fear", desc: "Die kollektive Angst" },
      { layer: 13, name: "cycles", desc: "Die ewigen Zyklen" },
    ];

    this.organs = organDefinitions.map((def) => ({
      id: `organ_${def.layer}`,
      layer: def.layer,
      name: def.name,
      state: 500, // Start bei mittlerer Energie
      previousState: 500,
      delta: 0,
      resonance: 0,
    }));
  }

  private initializeTradeRegions(): void {
    // Beispiel-Regionen
    const regions = [
      { id: "north_keep", name: "Nordfestung", x: 0, y: -100 },
      { id: "capital", name: "Hauptstadt", x: 0, y: 0 },
      { id: "south_port", name: "Südlicher Hafen", x: 0, y: 100 },
      { id: "east_forest", name: "Ostwald", x: 100, y: 0 },
      { id: "west_plains", name: "Westliche Ebenen", x: -100, y: 0 },
    ];

    for (const r of regions) {
      this.tradeRegions.set(r.id, {
        id: r.id,
        name: r.name,
        position: { x: r.x, y: r.y },
        economy: 500,
        supplyCapacity: 300,
        demandFactor: 1.0,
        priceIndex: 100,
        tradeRoutes: [],
      });
    }
  }

  // ==========================================================================
  // HAUPT-TICK: DER UNENDLICHE KREISLAUF
  // ==========================================================================

  /**
   * EIN TICK = EIN ATEMZUG DES SYSTEMS
   *
   * Reihenfolge:
   * 1. RESPIRATION - System "einatmen" (Ressourcen aufnehmen)
   * 2. METABOLISMUS - Verarbeitung durch Organe
   * 3. NERVOUS_SYSTEM - 13 Layer senden Signale
   * 4. EVENT_GENERATION - Weltereignisse entstehen
   * 5. ATTRACTOR_COMPUTATION - Ω_E berechnen
   * 6. EXPIRATION - "Ausatmen" (Energie abgeben)
   * 7. ERDŐS_FEEDBACK - Rückkopplung durch Graphen
   * 8. OUROBOROS_LOOP - Feedback für NPCs
   */
  tick(): CycleState {
    this.tick++;

    // 1. RESPIRATION: Ressourcen aufnehmen
    this.respirate();

    // 2. METABOLISMUS: Organe verarbeiten
    this.processMetabolism();

    // 3. NERVOUS_SYSTEM: Layer-Signale senden
    this.propagateNerveSignals();

    // 4. EVENT_GENERATION: Weltereignisse prüfen
    const events = this.generateWorldEvents();

    // 5. ATTRACTOR_COMPUTATION: Ω_E berechnen
    const omegaE = this.computeOmegaAttractor();

    // 6. EXPIRATION: Energie abgeben
    this.expire();

    // 7. ERDŐS_FEEDBACK: Graph-Rückkopplung
    this.applyErdosFeedback();

    // 8. OUROBOROS_LOOP: NPC-Zivilisation beeinflussen
    this.applyOuroborosInfluence();

    // 9. BRAIN_INFORMATION: An Hauptbrain senden
    const brainInfo = this.generateBrainInformation();

    // 10. STATE_BUILD: Zyklus-State erstellen
    this.cycleState = this.buildCycleState(omegaE, events, brainInfo);

    return this.cycleState;
  }

  // ==========================================================================
  // KREISLAUF-PHASE 1: RESPIRATION (EINATMEN)
  // ==========================================================================

  private respirate(): void {
    // Jedes Organ nimmt Energie aus seiner Quelle auf
    for (const organ of this.organs) {
      const sourceMultiplier = this.getOrganSourceMultiplier(organ.layer);
      const intake = Math.floor(50 * sourceMultiplier); // Basis-Aufnahme

      organ.state = Math.min(1000, organ.state + intake);

      // Resonanz von Nachbarn
      const neighborResonance = this.getNeighborResonance(organ.layer);
      organ.state = Math.min(1000, organ.state + neighborResonance);
    }
  }

  private getOrganSourceMultiplier(layer: number): number {
    // Jedes Organ hat eine andere Energiequelle
    switch (layer) {
      case 1: return 1.2; // ecology: Natur
      case 2: return 1.0; // market: Tausch
      case 3: return 0.8; // physiology: Nahrung
      case 4: return 1.1; // trade: Transport
      case 5: return 0.6; // memory: Erfahrung
      case 6: return 0.9; // politics: Macht
      case 7: return 0.7; // conflict: Kampf
      case 8: return 1.0; // economy: Produktion
      case 9: return 0.8; // kingdoms: Steuern
      case 10: return 0.6; // faith: Rituale
      case 11: return 0.5; // dungeon: Monster
      case 12: return 0.7; // fear: Gefahr
      case 13: return 1.0; // cycles: Zeit
      default: return 1.0;
    }
  }

  private getNeighborResonance(layer: number): number {
    // Organe beeinflussen ihre Nachbarn wellenartig
    const resonanceMap: Record<number, number[]> = {
      1: [2, 13],   // ecology → market, cycles
      2: [1, 3],     // market → ecology, physiology
      3: [2, 4],     // physiology → market, trade
      4: [3, 5],     // trade → physiology, memory
      5: [4, 6],     // memory → trade, politics
      6: [5, 7],     // politics → memory, conflict
      7: [6, 8],     // conflict → politics, economy
      8: [7, 9],     // economy → conflict, kingdoms
      9: [8, 10],    // kingdoms → economy, faith
      10: [9, 11],   // faith → kingdoms, dungeon
      11: [10, 12],  // dungeon → faith, fear
      12: [11, 13],  // fear → dungeon, cycles
      13: [12, 1],   // cycles → fear, ecology
    };

    const neighbors = resonanceMap[layer] || [];
    let resonance = 0;

    for (const n of neighbors) {
      const neighborOrgan = this.organs.find((o) => o.layer === n);
      if (neighborOrgan) {
        resonance += (neighborOrgan.state - 500) * 0.02; // 2% Resonanz
      }
    }

    return Math.floor(resonance);
  }

  // ==========================================================================
  // KREISLAUF-PHASE 2: METABOLISMUS
  // ==========================================================================

  private processMetabolism(): void {
    for (const organ of this.organs) {
      organ.previousState = organ.state;

      // Wachstum oder Schrumpfung basierend auf Zustand
      if (organ.state > 700) {
        // Überlastung → Abbau
        organ.delta = -Math.floor((organ.state - 700) * 0.1);
      } else if (organ.state < 300) {
        // Unterversorgung → Erholung wenn möglich
        organ.delta = Math.floor((300 - organ.state) * 0.05);
      } else {
        // Stabiler Betrieb
        organ.delta = 0;
      }

      // Organ-spezifische Metabolismus-Regeln
      organ.delta += this.getOrganSpecificMetabolism(organ);

      // Delta anwenden
      organ.state = Math.max(0, Math.min(1000, organ.state + organ.delta));

      // Resonanz aktualisieren
      organ.resonance = organ.resonance * this.config.resonanceDecay +
        Math.abs(organ.state - organ.previousState) * 0.1;
    }
  }

  private getOrganSpecificMetabolism(organ: WorldOrgan): number {
    switch (organ.layer) {
      case 1: // ecology - Ressourcen-Zyklus
        return Math.floor(Math.sin(this.tick / 100) * 20);

      case 7: // conflict - Kriegs-Zyklus
        const conflictState = this.organs.find(o => o.layer === 7);
        if (conflictState && conflictState.state > 800) {
          // Eskalation
          return 50;
        } else if (conflictState && conflictState.state < 200) {
          // Friedensphase
          return -30;
        }
        return 0;

      case 13: // cycles - Master-Zyklus
        // Steuert den Grundrhythmus
        return Math.floor(Math.cos(this.tick / 50) * 10);

      default:
        return 0;
    }
  }

  // ==========================================================================
  // KREISLAUF-PHASE 3: NERVOUS_SYSTEM (13-LAYER SIGNAL)
  // ==========================================================================

  private propagateNerveSignals(): void {
    // Stärke der Signale basierend auf Organ-Zustand
    for (const organ of this.organs) {
      if (organ.resonance > 100) {
        // Starkes Signal → benachbarte Organe beeinflussen
        const signalStrength = organ.resonance / 10;
        this.sendNerveSignal(organ.layer, signalStrength);
      }
    }

    // Globales Nervensystem: Stimmungs-Ausbreitung
    this.propagateCivilizationMood();
  }

  private sendNerveSignal(sourceLayer: number, strength: number): void {
    const connections: Record<number, number[]> = {
      1: [2, 3, 13],   // ecology beeinflusst market, physiology, cycles
      2: [1, 4, 8],    // market beeinflusst trade, economy
      3: [4, 5, 12],   // physiology beeinflusst memory, fear
      4: [5, 9],       // trade beeinflusst kingdoms
      5: [6, 10],      // memory beeinflusst politics, faith
      6: [7, 9],       // politics beeinflusst conflict, kingdoms
      7: [8, 12],      // conflict beeinflusst economy, fear
      8: [9, 11],      // economy beeinflusst dungeons
      9: [10, 11],     // kingdoms beeinflusst faith, dungeons
      10: [11, 12],    // faith beeinflusst dungeon, fear
      11: [12],        // dungeon beeinflusst fear
      12: [13],        // fear beeinflusst cycles
      13: [1, 2],      // cycles beeinflusst ecology, market
    };

    const targets = connections[sourceLayer] || [];

    for (const target of targets) {
      const targetOrgan = this.organs.find(o => o.layer === target);
      if (targetOrgan) {
        const transfer = Math.floor(strength * 0.1);
        targetOrgan.state = Math.max(0, Math.min(1000, targetOrgan.state + transfer));
      }
    }
  }

  private propagateCivilizationMood(): void {
    // Wellenartige Ausbreitung der Zivilisationsstimmung
    const avgMood = this.getCivilizationAverageMood();
    this.moodHistory.push(avgMood);

    if (this.moodHistory.length > 100) {
      this.moodHistory.shift();
    }
  }

  // ==========================================================================
  // KREISLAUF-PHASE 4: EVENT_GENERATION
  // ==========================================================================

  private generateWorldEvents(): WorldEvent[] {
    const events: WorldEvent[] = [];

    // Prüfe jeden Organ-Zustand auf Ereignis-Potential
    for (const organ of this.organs) {
      const event = this.checkOrganForEvent(organ);
      if (event) {
        events.push(event);
      }
    }

    // Globale Ereignisse basierend auf Mustern
    const globalEvents = this.generateGlobalEvents();
    events.push(...globalEvents);

    // Speichere in Historie
    this.eventHistory.push(...events);
    if (this.eventHistory.length > 1000) {
      this.eventHistory = this.eventHistory.slice(-500);
    }

    return events;
  }

  private checkOrganForEvent(organ: WorldOrgan): WorldEvent | null {
    // Organ-spezifische Ereignis-Schwellen
    const thresholds = {
      1: { high: 900, low: 100, event: "ecology" },      // Natur
      2: { high: 850, low: 150, event: "market" },       // Markt
      3: { high: 900, low: 100, event: "plague" },       // Seuche
      4: { high: 800, low: 200, event: "trade" },        // Handel
      5: { high: 850, low: 150, event: "memory" },       // Geschichte
      6: { high: 800, low: 200, event: "politics" },     // Politik
      7: { high: 800, low: 100, event: "war" },          // Krieg
      8: { high: 850, low: 150, event: "economy" },      // Wirtschaft
      9: { high: 800, low: 200, event: "kingdoms" },     // Königtümer
      10: { high: 850, low: 150, event: "faith" },       // Glaube
      11: { high: 700, low: 0, event: "dungeon" },       // Dungeon
      12: { high: 850, low: 100, event: "fear" },         // Angst
      13: { high: 900, low: 100, event: "cycles" },      // Zyklen
    };

    const threshold = thresholds[organ.layer as keyof typeof thresholds];
    if (!threshold) return null;

    // Starkes Ereignis bei Extrem-Zuständen
    if (organ.state >= threshold.high) {
      return this.createWorldEvent(organ, "high", threshold.event);
    }

    if (organ.state <= threshold.low) {
      return this.createWorldEvent(organ, "low", threshold.event);
    }

    return null;
  }

  private createWorldEvent(organ: WorldOrgan, extremity: "high" | "low", baseType: string): WorldEvent {
    const templates = this.getEventTemplates(baseType, extremity);
    const narrative = templates[Math.floor(this.tick % templates.length)];

    const eventTypes: Record<string, EventType> = {
      ecology: "harvest",
      market: "trade",
      physiology: "plague",
      trade: "migration",
      memory: "discovery",
      politics: "war",
      conflict: "war",
      economy: "collapse",
      kingdoms: "peace",
      faith: "faith_event",
      dungeon: "birth",
      fear: "famine",
      cycles: "rebirth",
    };

    const attractors: Record<string, AttractorType> = {
      ecology: "HARVEST" as any,
      market: "MARKET_COLLAPSE",
      physiology: "PLAGUE",
      trade: "MIGRATION_WAVE",
      politics: "WAR",
      conflict: "AGGRESSION_SPIKE",
      economy: "DARK_AGE",
      faith: "CULT_FORMATION",
      dungeon: "DUNGEON_EMERGENCE",
      fear: "FAMINE",
      cycles: "GOLDEN_AGE",
    };

    return {
      id: `event_${this.tick}_${organ.layer}`,
      tick: this.tick,
      type: eventTypes[organ.name] || "birth",
      attractor: attractors[organ.name] || "STABLE",
      originChunk: `chunk_${organ.layer}`,
      originLayer: organ.layer,
      affectedLayers: this.getAffectedLayers(organ.layer),
      intensity: organ.state,
      energyDelta: extremity === "high" ? -100 : 100,
      entropyDelta: extremity === "high" ? 50 : -30,
      eventHash: OracleEndpoint.hashDeterministic({
        tick: this.tick,
        organ: organ.layer,
        extremity,
      }),
      narrative,
      systemicImpact: `Das ${organ.name}-System ${extremity === "high" ? "überlastet" : "kollabiert"} sich.`,
    };
  }

  private getEventTemplates(type: string, extremity: string): string[] {
    const templates: Record<string, string[]> = {
      ecology: [
        "Die Ernte war überreich. Scheunen brechen unter der Last.",
        "Dürre横扫 das Land. Die Erde reißt auf.",
      ],
      market: [
        "Händler flüchten mit vollen Karren. Die Preise explodieren.",
        "Der Markt liegt brach. Niemand wagt zu handeln.",
      ],
      war: [
        "Schwerter klirren. Der Krieg hat begonnen.",
        "Die letzte Schlacht ist geschlagen. Frieden kehrt ein.",
      ],
      plague: [
        "Die Seuche breitet sich aus. Ärzte geben auf.",
        "Ein Wunderheiler erscheint. Die Krankheit weicht.",
      ],
      faith: [
        "Ein neuer Kult entsteht. Gläubige strömen zu.",
        "Die Tempel stehen leer. Der Glaube stirbt.",
      ],
      economy: [
        "Gold strömt in die Kassen. Reichtum überall.",
        "Die Wirtschaft bricht zusammen. Armut herrscht.",
      ],
      dungeon: [
        "Monster strömen aus dem Boden. Dunkelheit kehrt zurück.",
        "Der Dungeon versiegelt sich. Das Licht kehrt zurück.",
      ],
    };

    const base = templates[type] || ["Ein Ereignis geschieht."];
    return base;
  }

  private getAffectedLayers(sourceLayer: number): number[] {
    // Welche Layer werden von einem Ereignis beeinflusst
    const impactMap: Record<number, number[]> = {
      1: [2, 3, 13],   // ecology → market, physiology, cycles
      2: [4, 8],       // market → trade, economy
      3: [12],         // physiology → fear
      4: [5, 9],       // trade → memory, kingdoms
      5: [6, 10],      // memory → politics, faith
      6: [7],          // politics → conflict
      7: [8, 12],      // conflict → economy, fear
      8: [9],          // economy → kingdoms
      9: [10],         // kingdoms → faith
      10: [11, 12],    // faith → dungeon, fear
      11: [12],        // dungeon → fear
      12: [13],        // fear → cycles
      13: [1, 2],      // cycles → ecology, market
    };

    return impactMap[sourceLayer] || [sourceLayer];
  }

  private generateGlobalEvents(): WorldEvent[] {
    const events: WorldEvent[] = [];

    // Frieden/Krieg-Check
    const conflictOrgan = this.organs.find(o => o.layer === 7);
    if (conflictOrgan) {
      if (conflictOrgan.state > 800 && !this.attractorHistory.includes("AGGRESSION_SPIKE")) {
        events.push(this.createWorldEvent(conflictOrgan, "high", "war"));
        this.attractorHistory.push("AGGRESSION_SPIKE");
      }
    }

    // Goldenes Zeitalter Check
    const avgState = this.organs.reduce((sum, o) => sum + o.state, 0) / 13;
    if (avgState > 700 && this.tick % 500 === 0) {
      const goldenAge: WorldEvent = {
        id: `event_${this.tick}_golden`,
        tick: this.tick,
        type: "harvest",
        attractor: "GOLDEN_AGE",
        originChunk: "world",
        originLayer: 0,
        affectedLayers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
        intensity: 800,
        energyDelta: 500,
        entropyDelta: -200,
        eventHash: OracleEndpoint.hashDeterministic({ tick: this.tick, golden: true }),
        narrative: "Ein goldenes Zeitalter bricht an. Wohlstand und Frieden herrschen.",
        systemicImpact: "Alle Systeme profitieren vom Überfluss.",
      };
      events.push(goldenAge);
    }

    return events;
  }

  // ==========================================================================
  // KREISLAUF-PHASE 5: ATTRACTOR_COMPUTATION (Ω_E)
  // ==========================================================================

  private computeOmegaAttractor(): AttractorType {
    // Finde dominantes Organ
    let dominantOrgan = this.organs[0];
    for (const organ of this.organs) {
      if (organ.state > dominantOrgan.state) {
        dominantOrgan = organ;
      }
    }

    // Bestimme Attraktor-Typ basierend auf dominantem Organ und Zustand
    const attractorMap: Record<number, (state: number) => AttractorType> = {
      1: (s) => s > 700 ? "HARVEST" as AttractorType : "FAMINE" as AttractorType,
      2: (s) => s > 700 ? "TRADE_EMBARGO" as AttractorType : "MARKET_COLLAPSE" as AttractorType,
      3: (s) => s > 700 ? "STABLE" as AttractorType : "PLAGUE" as AttractorType,
      4: (s) => s > 700 ? "VILLAGE_TO_CITY" as AttractorType : "MIGRATION_WAVE" as AttractorType,
      5: (s) => s > 700 ? "STABLE" as AttractorType : "DARK_AGE" as AttractorType,
      6: (s) => s > 700 ? "PEACE_TREATY" as AttractorType : "WAR" as AttractorType,
      7: (s) => s > 700 ? "AGGRESSION_SPIKE" as AttractorType : "PEACE_TREATY" as AttractorType,
      8: (s) => s > 700 ? "GOLDEN_AGE" as AttractorType : "DARK_AGE" as AttractorType,
      9: (s) => s > 700 ? "STABLE" as AttractorType : "WAR" as AttractorType,
      10: (s) => s > 700 ? "CULT_FORMATION" as AttractorType : "DARK_AGE" as AttractorType,
      11: (s) => s > 700 ? "DUNGEON_EMERGENCE" as AttractorType : "STABLE" as AttractorType,
      12: (s) => s > 700 ? "FAMINE" as AttractorType : "STABLE" as AttractorType,
      13: (s) => s > 700 ? "GOLDEN_AGE" as AttractorType : "DARK_AGE" as AttractorType,
    };

    const computeFn = attractorMap[dominantOrgan.layer];
    if (computeFn) {
      const attractor = computeFn(dominantOrgan.state);
      if (this.attractorHistory.length > 100) {
        this.attractorHistory.shift();
      }
      this.attractorHistory.push(attractor);
      return attractor;
    }

    return "STABLE";
  }

  // ==========================================================================
  // KREISLAUF-PHASE 6: EXPIRATION (AUSATMEN)
  // ==========================================================================

  private expire(): void {
    // System gibt Energie ab
    for (const organ of this.organs) {
      // Grundumsatz
      const baseConsumption = 10;

      // Aktivitätsbedingter Verbrauch
      const activityCost = Math.floor(organ.resonance * 0.05);

      // Gesamte Abgabe
      const consumption = baseConsumption + activityCost;

      organ.state = Math.max(0, organ.state - consumption);
    }
  }

  // ==========================================================================
  // KREISLAUF-PHASE 7: ERDŐS_FEEDBACK
  // ==========================================================================

  private applyErdosFeedback(): void {
    // Rückkopplung durch den Erdős-Rényi Graphen
    // Jedes Organ ist ein Knoten, Verbindungen sind gewichtet

    const graphWeights: number[][] = this.buildErdosGraph();

    // Feedback-Schleife
    for (let i = 0; i < this.organs.length; i++) {
      let feedbackSum = 0;

      for (let j = 0; j < this.organs.length; j++) {
        if (i !== j) {
          const weight = graphWeights[i][j];
          const neighborState = this.organs[j].state;
          feedbackSum += (neighborState - 500) * weight * 0.01;
        }
      }

      const organ = this.organs[i];
      organ.state = Math.max(0, Math.min(1000, organ.state + Math.floor(feedbackSum)));
    }
  }

  private buildErdosGraph(): number[][] {
    // Vereinfachter Erdős-Rényi Graph mit 13 Knoten
    // Verbindungswahrscheinlichkeit: 0.3

    const n = 13;
    const graph: number[][] = Array(n).fill(null).map(() => Array(n).fill(0));

    // Deterministische "Zufalls"-Verbindungen basierend auf Hash
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const hash = OracleEndpoint.hashDeterministic({ i, j, tick: this.tick });
        const connectionProb = parseInt(hash.replace("are_", ""), 16) % 1000 / 1000;

        if (connectionProb < 0.3) {
          const weight = 0.5 + (connectionProb / 0.3) * 0.5;
          graph[i][j] = weight;
          graph[j][i] = weight;
        }
      }
    }

    return graph;
  }

  // ==========================================================================
  // KREISLAUF-PHASE 8: OUROBOROS_INFLUENCE
  // ==========================================================================

  private applyOuroborosInfluence(): void {
    // Verbinde mit Ouroboros für NPC-Zivilisation

    // Beobachte aktuellen Zustand
    const observation: OuroborosObservation = {
      tick: this.tick,
      stateHash: this.getStateHash(),
      factionWars: [],
      factionAlliances: [],
      factionCollapses: [],
      priceAnomalies: [],
      tradeRouteClosures: [],
      npcMigrations: [],
      npcMassDeaths: [],
      legendsBorn: [],
      legendsFading: [],
      warfrontActive: this.organs[6]?.state > 700, // conflict layer
      warfrontPhase: this.organs[6]?.state > 700 ? "boss_active" : "peace",
    };

    // Generiere prophetische Visionen basierend auf System-Zustand
    const bloodOfferings: BloodOffering[] = [];
    const ghostTowns: GhostTown[] = [];
    const fallen: FallenEntity[] = [];

    // Füge Dungeon-bezogene Daten hinzu
    const dungeonOrgan = this.organs.find(o => o.layer === 11);
    if (dungeonOrgan && dungeonOrgan.state > 500) {
      // Dungeon könnte entstehen
      bloodOfferings.push({
        regionId: "dungeon_region",
        position: { x: 0, y: 0 },
        totalDeaths: dungeonOrgan.state,
        deathsByType: { dungeon: dungeonOrgan.state },
        firstDeathTick: this.tick - 1000,
        lastDeathTick: this.tick,
        dangerLevel: dungeonOrgan.state,
        dungeonEmergenceThreshold: 50,
      });
    }

    const { oracleVisions } = this.oracleConnector.generatePropheticVisions(
      observation,
      bloodOfferings,
      ghostTowns,
      fallen
    );

    // Visionen können Organe beeinflussen (Feedback)
    for (const vision of oracleVisions) {
      this.applyOracleVision(vision);
    }
  }

  private applyOracleVision(vision: OracleVision): void {
    // Visionen beeinflussen Organe subtil
    if (vision.type === "dungeon_revelation") {
      const dungeonOrgan = this.organs.find(o => o.layer === 11);
      if (dungeonOrgan) {
        dungeonOrgan.state = Math.min(1000, dungeonOrgan.state + 50);
      }
    }

    if (vision.type === "ghost_town_warning") {
      const fearOrgan = this.organs.find(o => o.layer === 12);
      if (fearOrgan) {
        fearOrgan.state = Math.min(1000, fearOrgan.state + 30);
      }
    }
  }

  // ==========================================================================
  // KREISLAUF-PHASE 9: BRAIN_INFORMATION
  // ==========================================================================

  private generateBrainInformation(): BrainInformationFlow {
    const layerStates = this.organs.map(o => o.state);
    const layerTrends = this.getLayerTrends();

    // Finde dominante Schicht
    let dominantLayer = 1;
    let maxState = 0;
    for (const organ of this.organs) {
      if (organ.state > maxState) {
        maxState = organ.state;
        dominantLayer = organ.layer;
      }
    }

    // Konvergenz-Level
    const convergenceLevel = this.computeConvergence();

    // Kritische Ereignisse
    const criticalEvents = this.eventHistory.slice(-10).filter(
      e => e.intensity > 700
    );

    // Emergente Muster
    const emergingPatterns = this.detectEmergingPatterns();

    return {
      tick: this.tick,
      layerStates,
      layerTrends,
      dominantLayer,
      convergenceLevel,
      eventCount: this.eventHistory.length,
      criticalEvents,
      emergingPatterns,
      attractorHistory: this.attractorHistory.slice(-20),
      moodTrajectory: this.moodHistory.slice(-20),
      energyFlow: this.organs.map(o => o.delta),
      recommendations: this.generateRecommendations(),
    };
  }

  private getLayerTrends(): ("rising" | "falling" | "stable")[] {
    return this.organs.map(organ => {
      const delta = organ.state - organ.previousState;
      if (delta > 20) return "rising";
      if (delta < -20) return "falling";
      return "stable";
    });
  }

  private computeConvergence(): number {
    const avg = this.organs.reduce((sum, o) => sum + o.state, 0) / 13;
    const variance = this.organs.reduce(
      (sum, o) => sum + Math.pow(o.state - avg, 2),
      0
    ) / 13;

    // Niedrige Varianz = hohe Konvergenz
    return Math.max(0, 1000 - Math.floor(Math.sqrt(variance)));
  }

  private detectEmergingPatterns(): string[] {
    const patterns: string[] = [];

    // Kriege-Cluster
    const conflictOrgan = this.organs.find(o => o.layer === 7);
    if (conflictOrgan && conflictOrgan.state > 700) {
      patterns.push("Kriegsfront eskaliert - Konflikt-Organ überlastet");
    }

    // Wirtschaftskrise
    const economyOrgan = this.organs.find(o => o.layer === 8);
    if (economyOrgan && economyOrgan.state < 300) {
      patterns.push("Wirtschaftliche Rezession - Armut droht");
    }

    // Goldenes Zeitalter
    const avg = this.organs.reduce((sum, o) => sum + o.state, 0) / 13;
    if (avg > 700) {
      patterns.push("Gesamtsystem im Wohlstand - Goldenes Zeitalter möglich");
    }

    // Dungeon-Emergenz
    const dungeonOrgan = this.organs.find(o => o.layer === 11);
    if (dungeonOrgan && dungeonOrgan.state > 600) {
      patterns.push("Dungeon-Entstehung wahrscheinlich - Angst steigt");
    }

    return patterns;
  }

  private generateRecommendations(): SystemRecommendation[] {
    const recommendations: SystemRecommendation[] = [];

    // Frieden-Empfehlung wenn Konflikt hoch
    const conflictOrgan = this.organs.find(o => o.layer === 7);
    if (conflictOrgan && conflictOrgan.state > 800) {
      recommendations.push({
        priority: 900,
        targetLayer: 7,
        action: "dampen",
        reason: "Kriegsfront kritisch - Eskalation vermeiden",
      });
    }

    // Wirtschaft stabilisieren wenn niedrig
    const economyOrgan = this.organs.find(o => o.layer === 8);
    if (economyOrgan && economyOrgan.state < 300) {
      recommendations.push({
        priority: 800,
        targetLayer: 8,
        action: "amplify",
        reason: "Wirtschaft in Rezession - Wachstum fördern",
      });
    }

    return recommendations.sort((a, b) => b.priority - a.priority);
  }

  // ==========================================================================
  // ZUSTAND & HILFSMETHODEN
  // ==========================================================================

  private buildCycleState(
    omegaE: AttractorType,
    events: WorldEvent[],
    brainInfo: BrainInformationFlow
  ): CycleState {
    return {
      tick: this.tick,
      omegaE,
      omegaStrength: this.organs.reduce((sum, o) => sum + o.state, 0) / 13,
      organs: [...this.organs],
      totalEnergy: this.organs.reduce((sum, o) => sum + o.state, 0),
      totalEntropy: this.eventHistory.length * 10,
      civilizationMood: this.getCivilizationAverageMood(),
      marketHeat: this.organs.find(o => o.layer === 2)?.state || 0,
      conflictHeat: this.organs.find(o => o.layer === 7)?.state || 0,
      faithHeat: this.organs.find(o => o.layer === 10)?.state || 0,
      events,
      stateHash: this.getStateHash(),
    };
  }

  private getStateHash(): string {
    const stateData = {
      tick: this.tick,
      organs: this.organs.map(o => ({ layer: o.layer, state: o.state })),
      omegaE: this.cycleState?.omegaE || "STABLE",
    };
    return OracleEndpoint.hashDeterministic(stateData);
  }

  private getCivilizationAverageMood(): number {
    // Berechne Durchschnittsstimmung basierend auf Organ-Zuständen
    const positive = [1, 2, 4, 8, 9].reduce((sum, l) => {
      const organ = this.organs.find(o => o.layer === l);
      return sum + (organ?.state || 500);
    }, 0);

    const negative = [6, 7, 11, 12].reduce((sum, l) => {
      const organ = this.organs.find(o => o.layer === l);
      return sum + (organ?.state || 500);
    }, 0);

    return Math.floor((positive - negative) / 2);
  }

  // ==========================================================================
  // PUBLIC API
  // ==========================================================================

  getCurrentState(): CycleState | null {
    return this.cycleState;
  }

  getOrganByLayer(layer: number): WorldOrgan | undefined {
    return this.organs.find(o => o.layer === layer);
  }

  getBrainInformation(): BrainInformationFlow | null {
    if (!this.cycleState) return null;
    return this.generateBrainInformation();
  }

  getEventHistory(): WorldEvent[] {
    return [...this.eventHistory];
  }

  getAttractorHistory(): AttractorType[] {
    return [...this.attractorHistory];
  }

  getTradeRegion(regionId: string): TradeRegion | undefined {
    return this.tradeRegions.get(regionId);
  }

  getAllTradeRegions(): TradeRegion[] {
    return Array.from(this.tradeRegions.values());
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let livingWorldInstance: LivingWorldErdosOuroborosSystem | null = null;

export function getLivingWorldSystem(): LivingWorldErdosOuroborosSystem {
  if (!livingWorldInstance) {
    livingWorldInstance = new LivingWorldErdosOuroborosSystem();
  }
  return livingWorldInstance;
}