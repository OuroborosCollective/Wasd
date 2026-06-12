import { OracleEndpoint } from "./OracleEndpoint.js";

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

export type EventType =
  | "birth"
  | "collapse"
  | "war"
  | "peace"
  | "famine"
  | "plague"
  | "discovery"
  | "faith_event"
  | "rebirth";

export interface WorldOrgan {
  readonly id: string;
  readonly layer: number;
  readonly name: string;
  state: number;
  previousState: number;
  delta: number;
  resonance: number;
}

export interface WorldEvent {
  readonly id: string;
  readonly tick: number;
  readonly type: EventType;
  readonly attractor: AttractorType;
  readonly originChunk: string;
  readonly originLayer: number;
  readonly affectedLayers: readonly number[];
  readonly intensity: number;
  readonly energyDelta: number;
  readonly entropyDelta: number;
  readonly eventHash: string;
  readonly narrative: string;
  readonly systemicImpact: string;
}

export interface TradeRegion {
  readonly id: string;
  readonly name: string;
  readonly position: { readonly x: number; readonly y: number };
  economy: number;
  supplyCapacity: number;
  demandFactor: number;
  priceIndex: number;
  tradeRoutes: string[];
}

export interface BrainRecommendation {
  readonly type: string;
  readonly priority: number;
  readonly reason: string;
}

export interface BrainInformation {
  readonly tick: number;
  readonly layerStates: readonly number[];
  readonly layerTrends: readonly number[];
  readonly dominantLayer: number;
  readonly convergenceLevel: number;
  readonly recommendations: readonly BrainRecommendation[];
  readonly attractorHistory: readonly AttractorType[];
  readonly moodTrajectory: readonly number[];
  readonly energyFlow: readonly number[];
}

export type BrainInformationFlow = BrainInformation;
export type SystemRecommendation = BrainRecommendation;
export type CivilizationalMood = number;
export type WorldEventTemplate = WorldEvent;

export interface CycleState {
  readonly tick: number;
  readonly organs: readonly WorldOrgan[];
  readonly events: readonly WorldEvent[];
  readonly omegaE: AttractorType;
  readonly omegaStrength: number;
  readonly civilizationMood: number;
  readonly totalEnergy: number;
  readonly brainInformation: BrainInformation;
  readonly stateHash: string;
}

const ORGAN_NAMES = [
  "ecology",
  "market",
  "physiology",
  "trade",
  "memory",
  "politics",
  "conflict",
  "economy",
  "kingdoms",
  "faith",
  "dungeon",
  "fear",
  "cycles",
] as const;

const ATTRACTOR_BY_LAYER: readonly AttractorType[] = [
  "STABLE",
  "VILLAGE_TO_CITY",
  "PLAGUE",
  "MIGRATION_WAVE",
  "STABLE",
  "PEACE_TREATY",
  "AGGRESSION_SPIKE",
  "MARKET_COLLAPSE",
  "DARK_AGE",
  "CULT_FORMATION",
  "DUNGEON_EMERGENCE",
  "FAMINE",
  "GOLDEN_AGE",
];

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.trunc(value)));
}

function cloneOrgan(organ: WorldOrgan): WorldOrgan {
  return {
    id: organ.id,
    layer: organ.layer,
    name: organ.name,
    state: organ.state,
    previousState: organ.previousState,
    delta: organ.delta,
    resonance: organ.resonance,
  };
}

export class LivingWorldErdosOuroborosSystem {
  private currentTick = 0;
  private cycleState: CycleState | null = null;
  private readonly organs: WorldOrgan[] = ORGAN_NAMES.map((name, index) => ({
    id: `organ_${index + 1}`,
    layer: index + 1,
    name,
    state: 500,
    previousState: 500,
    delta: 0,
    resonance: 0,
  }));
  private readonly eventHistory: WorldEvent[] = [];
  private readonly attractorHistory: AttractorType[] = [];
  private readonly moodHistory: number[] = [];
  private readonly tradeRegions = new Map<string, TradeRegion>();

  constructor() {
    this.initializeTradeRegions();
  }

  tick(): CycleState {
    this.currentTick += 1;

    for (const organ of this.organs) {
      organ.previousState = organ.state;
      const wave = ((this.currentTick + organ.layer * 7) % 31) - 15;
      const source = 12 + (organ.layer % 4) * 3;
      const drain = 10 + (this.currentTick % 5);
      organ.resonance = Math.trunc((organ.previousState - 500) / 25);
      organ.state = clamp(organ.state + source + wave + organ.resonance - drain, 1, 1000);
      organ.delta = organ.state - organ.previousState;
    }

    const omegaE = this.computeOmegaAttractor();
    const omegaStrength = this.computeOmegaStrength();
    const events = this.generateEvents(omegaE, omegaStrength);
    const civilizationMood = this.computeCivilizationMood();
    const totalEnergy = this.organs.reduce((sum, organ) => sum + organ.state, 0);
    const brainInformation = this.generateBrainInformation(omegaE, omegaStrength, civilizationMood);

    this.attractorHistory.push(omegaE);
    if (this.attractorHistory.length > 50) this.attractorHistory.shift();
    this.moodHistory.push(civilizationMood);
    if (this.moodHistory.length > 50) this.moodHistory.shift();

    this.cycleState = {
      tick: this.currentTick,
      organs: Object.freeze(this.organs.map(cloneOrgan)),
      events: Object.freeze(events),
      omegaE,
      omegaStrength,
      civilizationMood,
      totalEnergy,
      brainInformation,
      stateHash: OracleEndpoint.hashDeterministic({
        tick: this.currentTick,
        organs: this.organs.map((organ) => [organ.layer, organ.state, organ.delta]),
        omegaE,
        civilizationMood,
        totalEnergy,
      }),
    };

    return this.cycleState;
  }

  getCurrentState(): CycleState | null {
    return this.cycleState;
  }

  getAttractorHistory(): readonly AttractorType[] {
    return Object.freeze([...this.attractorHistory]);
  }

  getEventHistory(): readonly WorldEvent[] {
    return Object.freeze([...this.eventHistory]);
  }

  getBrainInformation(): BrainInformation | null {
    return this.cycleState?.brainInformation ?? null;
  }

  getAllTradeRegions(): TradeRegion[] {
    return [...this.tradeRegions.values()].map((region) => ({ ...region, tradeRoutes: [...region.tradeRoutes] }));
  }

  getTradeRegion(id: string): TradeRegion | undefined {
    const region = this.tradeRegions.get(id);
    return region ? { ...region, tradeRoutes: [...region.tradeRoutes] } : undefined;
  }

  getOrganByLayer(layer: number): WorldOrgan | undefined {
    const organ = this.organs.find((candidate) => candidate.layer === layer);
    return organ ? cloneOrgan(organ) : undefined;
  }

  private initializeTradeRegions(): void {
    const regions = [
      { id: "north_keep", name: "Nordfestung", x: 0, y: -100 },
      { id: "capital", name: "Hauptstadt", x: 0, y: 0 },
      { id: "south_port", name: "Südlicher Hafen", x: 0, y: 100 },
      { id: "east_forest", name: "Ostwald", x: 100, y: 0 },
      { id: "west_plains", name: "Westliche Ebenen", x: -100, y: 0 },
    ];

    for (const region of regions) {
      this.tradeRegions.set(region.id, {
        id: region.id,
        name: region.name,
        position: { x: region.x, y: region.y },
        economy: 500,
        supplyCapacity: 300,
        demandFactor: 1,
        priceIndex: 100,
        tradeRoutes: [],
      });
    }
  }

  private computeOmegaAttractor(): AttractorType {
    const dominant = this.getDominantOrgan();
    if (!dominant) return "STABLE";
    if (dominant.state < 160) return "DARK_AGE";
    if (dominant.state > 900) return ATTRACTOR_BY_LAYER[dominant.layer - 1] ?? "STABLE";
    return this.currentTick % 17 === 0 ? "MIGRATION_WAVE" : "STABLE";
  }

  private computeOmegaStrength(): number {
    const dominant = this.getDominantOrgan();
    return dominant ? clamp(Math.abs(dominant.state - 500) + 500, 1, 1000) : 500;
  }

  private getDominantOrgan(): WorldOrgan | null {
    return [...this.organs].sort((a, b) => Math.abs(b.state - 500) - Math.abs(a.state - 500) || a.layer - b.layer)[0] ?? null;
  }

  private generateEvents(omegaE: AttractorType, omegaStrength: number): WorldEvent[] {
    if (omegaE === "STABLE" || omegaStrength < 850) return [];
    const organ = this.getDominantOrgan();
    if (!organ) return [];

    const event: WorldEvent = {
      id: `event_${this.currentTick}_${organ.layer}`,
      tick: this.currentTick,
      type: organ.state > 500 ? "birth" : "collapse",
      attractor: omegaE,
      originChunk: `chunk_${organ.layer}`,
      originLayer: organ.layer,
      affectedLayers: Object.freeze([organ.layer, ((organ.layer % 13) + 1)]),
      intensity: organ.state,
      energyDelta: organ.state > 500 ? -100 : 100,
      entropyDelta: organ.state > 500 ? 50 : -30,
      eventHash: OracleEndpoint.hashDeterministic({ tick: this.currentTick, organ: organ.layer, omegaE }),
      narrative: `Das ${organ.name}-System erzeugt ein Weltereignis.`,
      systemicImpact: `Das ${organ.name}-System verschiebt den Weltzustand.`,
    };

    this.eventHistory.push(event);
    if (this.eventHistory.length > 100) this.eventHistory.shift();
    return [event];
  }

  private computeCivilizationMood(): number {
    const average = this.organs.reduce((sum, organ) => sum + organ.state, 0) / this.organs.length;
    return clamp((average - 500) * 2, -1000, 1000);
  }

  private generateBrainInformation(omegaE: AttractorType, omegaStrength: number, civilizationMood: number): BrainInformation {
    const layerStates = this.organs.map((organ) => organ.state);
    const layerTrends = this.organs.map((organ) => organ.delta);
    const dominant = this.getDominantOrgan();
    const convergenceLevel = clamp(1000 - Math.abs(civilizationMood), 0, 1000);
    const recommendations: BrainRecommendation[] = [
      {
        type: omegaE === "STABLE" ? "observe" : "intervene",
        priority: omegaE === "STABLE" ? 1 : Math.ceil(omegaStrength / 250),
        reason: `omega=${omegaE}`,
      },
    ].sort((a, b) => b.priority - a.priority);

    return {
      tick: this.currentTick,
      layerStates: Object.freeze(layerStates),
      layerTrends: Object.freeze(layerTrends),
      dominantLayer: dominant?.layer ?? 1,
      convergenceLevel,
      recommendations: Object.freeze(recommendations),
      attractorHistory: Object.freeze([...this.attractorHistory, omegaE].slice(-50)),
      moodTrajectory: Object.freeze([...this.moodHistory, civilizationMood].slice(-50)),
      energyFlow: Object.freeze(layerTrends),
    };
  }
}

let livingWorldSystem: LivingWorldErdosOuroborosSystem | null = null;

export function getLivingWorldSystem(): LivingWorldErdosOuroborosSystem {
  if (!livingWorldSystem) livingWorldSystem = new LivingWorldErdosOuroborosSystem();
  return livingWorldSystem;
}
