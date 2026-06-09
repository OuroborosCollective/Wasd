export type AREBrainAction =
  | 'ANCHOR_BUFF'
  | 'WITHDRAW'
  | 'WARN_FACTION'
  | 'OBSERVE'
  | 'HARVEST_RESOURCE'
  | 'DEFEND_COLONY'
  | 'WANDER';

export type AREBrainTraits = {
  faith: number;
  aggression: number;
  curiosity: number;
};

export type AREBrainInput = {
  npcId: string;
  factionId: string;
  traits: Partial<AREBrainTraits>;
  energy: number;
  memoryHash: string;
  localStateHash: string;
  playerDeltaDrift: number;
  playerThreat: number;
  colonyUtility: number;
  resourcePressure?: number;
  survivalBias?: number;
  tick: number;
};

export type AREBrainDecision = {
  action: AREBrainAction;
  confidence: number;
  reason: string;
  energyCost: number;
  nextEnergy: number;
  kappaHash: string;
  scores: Record<AREBrainAction, number>;
};

const KAPPA = 1000;
const ACTION_ORDER: readonly AREBrainAction[] = [
  'ANCHOR_BUFF',
  'WITHDRAW',
  'WARN_FACTION',
  'OBSERVE',
  'HARVEST_RESOURCE',
  'DEFEND_COLONY',
  'WANDER',
];

function finite(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(value: number, min = 0, max = 1): number {
  return Math.max(min, Math.min(max, value));
}

function kappa(value: unknown): number {
  return Math.trunc(clamp(finite(value, 0)) * KAPPA);
}

function stableHash(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

function normalizeTraits(traits: Partial<AREBrainTraits>): AREBrainTraits {
  return {
    faith: clamp(finite(traits.faith, 0.5)),
    aggression: clamp(finite(traits.aggression, 0.5)),
    curiosity: clamp(finite(traits.curiosity, 0.5)),
  };
}

export class EmergentBrainKernel {
  public process(input: AREBrainInput): AREBrainDecision {
    const normalized = this.normalizeInput(input);
    const kappaHash = this.foldAREBrainHash(normalized);
    const scores = this.scoreActions(normalized);
    return this.chooseDeterministicAction(normalized, scores, kappaHash);
  }

  private normalizeInput(input: AREBrainInput) {
    const traits = normalizeTraits(input.traits ?? {});
    return Object.freeze({
      npcId: String(input.npcId || 'npc:unknown'),
      factionId: String(input.factionId || 'neutral'),
      traits,
      energy: kappa(input.energy),
      memoryHash: String(input.memoryHash || 'memory:0'),
      localStateHash: String(input.localStateHash || 'state:0'),
      playerDeltaDrift: kappa(input.playerDeltaDrift),
      playerThreat: kappa(input.playerThreat),
      colonyUtility: kappa(input.colonyUtility),
      resourcePressure: kappa(input.resourcePressure ?? 0),
      survivalBias: kappa(input.survivalBias ?? 0),
      tick: Math.max(0, Math.trunc(finite(input.tick, 0))),
    });
  }

  private foldAREBrainHash(input: ReturnType<EmergentBrainKernel['normalizeInput']>): string {
    return stableHash([
      input.npcId,
      input.factionId,
      input.memoryHash,
      input.localStateHash,
      input.energy,
      input.playerDeltaDrift,
      input.playerThreat,
      input.colonyUtility,
      input.resourcePressure,
      input.survivalBias,
      input.tick % KAPPA,
      kappa(input.traits.faith),
      kappa(input.traits.aggression),
      kappa(input.traits.curiosity),
    ].join('|'));
  }

  private scoreActions(input: ReturnType<EmergentBrainKernel['normalizeInput']>): Record<AREBrainAction, number> {
    const faith = kappa(input.traits.faith);
    const aggression = kappa(input.traits.aggression);
    const curiosity = kappa(input.traits.curiosity);
    const energyDeficit = KAPPA - input.energy;

    return {
      ANCHOR_BUFF: input.colonyUtility * 0.32 + faith * 0.42 + input.playerDeltaDrift * 0.12 - input.playerThreat * 0.22 - energyDeficit * 0.18 - input.survivalBias * 0.16,
      WITHDRAW: input.playerDeltaDrift * 0.38 + input.playerThreat * 0.42 + energyDeficit * 0.24 - aggression * 0.22 + input.survivalBias * 0.18,
      WARN_FACTION: input.playerThreat * 0.36 + input.colonyUtility * 0.25 + faith * 0.16 + curiosity * 0.08,
      OBSERVE: curiosity * 0.34 + input.playerDeltaDrift * 0.08 + input.energy * 0.08 - input.playerThreat * 0.06 - input.survivalBias * 0.08,
      HARVEST_RESOURCE: input.resourcePressure * 0.45 + energyDeficit * 0.22 + curiosity * 0.10 - input.playerThreat * 0.14 + input.survivalBias * 0.46,
      DEFEND_COLONY: input.colonyUtility * 0.36 + input.playerThreat * 0.30 + aggression * 0.30 + faith * 0.10 - input.survivalBias * 0.12,
      WANDER: curiosity * 0.40 + input.colonyUtility * 0.12 + faith * 0.15 - input.playerThreat * 0.05 + energyDeficit * 0.12 + input.energy * 0.08,
    };
  }

  private chooseDeterministicAction(
    input: ReturnType<EmergentBrainKernel['normalizeInput']>,
    scores: Record<AREBrainAction, number>,
    kappaHash: string,
  ): AREBrainDecision {
    let bestAction: AREBrainAction = 'OBSERVE';
    let bestScore = Number.NEGATIVE_INFINITY;

    for (const action of ACTION_ORDER) {
      const score = finite(scores[action], Number.NEGATIVE_INFINITY);
      if (score > bestScore) {
        bestAction = action;
        bestScore = score;
      }
    }

    const secondBest = ACTION_ORDER
      .filter((action) => action !== bestAction)
      .reduce((max, action) => Math.max(max, finite(scores[action], Number.NEGATIVE_INFINITY)), Number.NEGATIVE_INFINITY);
    const confidence = clamp((bestScore - secondBest + 100) / KAPPA);
    const energyCost = this.energyCostFor(bestAction);

    return Object.freeze({
      action: bestAction,
      confidence,
      reason: this.reasonFor(bestAction),
      energyCost,
      nextEnergy: Math.max(0, input.energy - energyCost),
      kappaHash,
      scores: Object.freeze({ ...scores }),
    });
  }

  private energyCostFor(action: AREBrainAction): number {
    switch (action) {
      case 'ANCHOR_BUFF': return 12;
      case 'WITHDRAW': return 8;
      case 'WARN_FACTION': return 6;
      case 'HARVEST_RESOURCE': return 10;
      case 'DEFEND_COLONY': return 14;
      case 'WANDER': return 4;
      case 'OBSERVE':
      default: return 2;
    }
  }

  private reasonFor(action: AREBrainAction): string {
    switch (action) {
      case 'ANCHOR_BUFF': return 'player_drift_high_colony_alignment_positive';
      case 'WITHDRAW': return 'self_preservation_drift_or_threat_dominant';
      case 'WARN_FACTION': return 'threat_detected_faction_signal_useful';
      case 'HARVEST_RESOURCE': return 'resource_pressure_or_energy_deficit_dominant';
      case 'DEFEND_COLONY': return 'colony_defense_utility_dominant';
      case 'WANDER': return 'casual_exploration_curiosity_favorable';
      case 'OBSERVE':
      default: return 'insufficient_pressure_observe_and_update_history';
    }
  }
}
