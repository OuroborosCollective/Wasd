/**
 * NPCSemanticsEngine - Deterministic Speech and Quest Generation
 *
 * Phase 11: Ouroboros Grand Unification with ARE-Logic
 *
 * Axiom 2: Nomock-Theorem
 * - NO LLMs
 * - NO external data
 * - NO random generation
 * - NO fake snapshots
 *
 * Axiom 3: Zeitstempel-Integrität
 * - tick-based timestamp only
 * - deterministic hash seed only
 *
 * Generates NPC dialogue and quests from layer vectors using
 * deterministic semantic graph traversal.
 */

import { KAPPA } from '../are/Kappa.js';
import { createKappaInt, type KappaInt, type TickId } from '../are/types.js';
import { kappa1000Hash, type KappaLayers } from '../are/KappaLayers.js';
import {
  OUROBOROS_CONFIG,
  type SemanticVector,
  type ErdősString,
  OuroborosEventType,
} from './OuroborosTypes.js';
import { hasEvent } from './ErdosStringManager.js';

const LAYER_MIN = 0;
const LAYER_MAX = 100000;

const DIALOGUE_SEED_TAG = 'NPC_SEMANTICS_DIALOGUE_V2';
const QUEST_SEED_TAG = 'NPC_SEMANTICS_QUEST_V2';
const QUEST_TARGET_SEED_TAG = 'NPC_SEMANTICS_QUEST_TARGET_V2';

const DIALOGUE_STABILITY_TICKS = 10; // 1 second at 10 Hz.
const QUEST_STABILITY_TICKS = 600; // 60 seconds at 10 Hz.

const FALLBACK_DIALOGUE = '...';

const MOODS = ['FEARFUL', 'HOSTILE', 'NEUTRAL', 'HOPEFUL', 'JOYFUL'] as const;
export type NPCMood = (typeof MOODS)[number];

/**
 * Semantic graph node types.
 */
enum SemanticNodeType {
  GREETING = 'GREETING',
  EMOTION = 'EMOTION',
  NEED = 'NEED',
  QUEST = 'QUEST',
  WARNING = 'WARNING',
  STORY = 'STORY',
  FAREWELL = 'FAREWELL',
}

/**
 * Internal semantic intent.
 *
 * This does not leave the truth path.
 * It only decides how deterministic text fragments are assembled.
 */
enum SemanticIntent {
  OPEN = 'OPEN',
  WARN = 'WARN',
  REQUEST = 'REQUEST',
  QUEST_HOOK = 'QUEST_HOOK',
  MEMORY = 'MEMORY',
  CLOSE = 'CLOSE',
}

/**
 * Quest type based on layer conditions.
 */
export enum OuroborosQuestType {
  COMBAT = 'COMBAT',
  TRADE = 'TRADE',
  EXPLORATION = 'EXPLORATION',
  SOCIAL = 'SOCIAL',
  SURVIVAL = 'SURVIVAL',
}

/**
 * Generated quest structure.
 */
export interface OuroborosQuest {
  readonly type: OuroborosQuestType;
  readonly title: string;
  readonly description: string;
  readonly targetEntity: string;
  readonly reward: KappaInt;
  readonly difficulty: KappaInt;
}

/**
 * NPC dialogue line with context.
 */
export interface NPCDialogueLine {
  readonly text: string;
  readonly mood: NPCMood;
  readonly timestamp: TickId;
}

interface SemanticContext {
  readonly seed: number;
  readonly dialogueBucket: number;
  readonly mood: NPCMood;
  readonly vector: SemanticVector;
  readonly pressure: number;
  readonly fallen: boolean;
  readonly intent: SemanticIntent;
  readonly nodeType: SemanticNodeType;
}

/**
 * Semantic graph for deterministic traversal.
 */
const SEMANTIC_GRAPH: Readonly<Record<SemanticNodeType, readonly (readonly string[])[]>> = Object.freeze({
  [SemanticNodeType.GREETING]: Object.freeze([
    Object.freeze(['Hail, traveler.', 'Well met.', 'Greetings, stranger.', 'Good day to you.']),
    Object.freeze(['What brings you to our land?', 'Seek you shelter or trade?', 'News travels fast here.']),
    Object.freeze(['The roads grow dangerous.', 'I have not seen your face before.']),
  ]),

  [SemanticNodeType.EMOTION]: Object.freeze([
    Object.freeze(['Fear grips the village.', 'Hope fades with each passing day.']),
    Object.freeze(['We remember the old kingdom fondly.', 'War has scarred these lands.']),
    Object.freeze(['The dungeon whispers dark secrets.', 'Ancient spirits stir uneasily.']),
    Object.freeze(['Prosperity returns slowly.', 'Trade routes bring both wealth and peril.']),
  ]),

  [SemanticNodeType.NEED]: Object.freeze([
    Object.freeze(['We lack skilled hands.', 'Our stores dwindle.', 'The fields need tending.']),
    Object.freeze(['Warriors are in short supply.', 'Wisdom is scarce these days.']),
    Object.freeze(['Our children go hungry.', 'The old ways are forgotten.']),
  ]),

  [SemanticNodeType.QUEST]: Object.freeze([
    Object.freeze(['The dungeon beckons.', 'A merchant caravan seeks protection.']),
    Object.freeze(['Monsters plague the northern road.', 'A lost soul searches for kin.']),
    Object.freeze(['The old shrine requires blessing.', 'A dying man seeks closure.']),
    Object.freeze(['The harvest festival approaches.', 'The mine collapses threaten us.']),
  ]),

  [SemanticNodeType.WARNING]: Object.freeze([
    Object.freeze(['Beware the fallen kingdom.', 'The dungeon spawns darkest nightmares.']),
    Object.freeze(['Trust no stranger fully.', 'The night brings creatures unknown.']),
    Object.freeze(['War approaches from the east.', 'Famine stalks the land.']),
  ]),

  [SemanticNodeType.STORY]: Object.freeze([
    Object.freeze(['Our kingdom stood for generations.', 'The old king was just and wise.']),
    Object.freeze(['Legends speak of treasures untold.', 'The dragon slept beneath the mountain.']),
    Object.freeze(['Witches once gathered at the crossroads.', 'The river spirits demand tribute.']),
  ]),

  [SemanticNodeType.FAREWELL]: Object.freeze([
    Object.freeze(['May the winds guide you.', 'Stay safe on the roads.', 'Return when peace returns.']),
    Object.freeze(['Until we meet again.', 'The gods watch over travelers.']),
  ]),
});

const INTENT_OPENERS: Readonly<Record<SemanticIntent, readonly string[]>> = Object.freeze({
  [SemanticIntent.OPEN]: Object.freeze(['Listen well.', 'Come closer.', 'You look travel-worn.']),
  [SemanticIntent.WARN]: Object.freeze(['Mark my words.', 'Do not ignore this.', 'The signs are plain.']),
  [SemanticIntent.REQUEST]: Object.freeze(['We need aid.', 'There is work to be done.', 'Someone must act.']),
  [SemanticIntent.QUEST_HOOK]: Object.freeze(['A task waits nearby.', 'There may be a path forward.', 'The village has a need.']),
  [SemanticIntent.MEMORY]: Object.freeze(['I remember better days.', 'The old stories still matter.', 'This land remembers.']),
  [SemanticIntent.CLOSE]: Object.freeze(['Before you go.', 'One last word.', 'Take care.']),
});

const QUEST_TITLES: Readonly<Record<OuroborosQuestType, readonly string[]>> = Object.freeze({
  [OuroborosQuestType.COMBAT]: Object.freeze([
    'Slay the Dungeon Beast',
    'Defend the Village',
    'Clear the Warband',
    'Protect the Caravan',
  ]),

  [OuroborosQuestType.TRADE]: Object.freeze([
    'Deliver the Goods',
    'Establish Trade Route',
    'Negotiate with Merchants',
    'Collect Outstanding Debts',
  ]),

  [OuroborosQuestType.EXPLORATION]: Object.freeze([
    'Chart the Forgotten Path',
    'Find the Lost Shrine',
    'Investigate Strange Lights',
    'Map the Ruins',
  ]),

  [OuroborosQuestType.SOCIAL]: Object.freeze([
    'Mediate Dispute',
    'Spread the News',
    'Organize Festival',
    'Find Missing Person',
  ]),

  [OuroborosQuestType.SURVIVAL]: Object.freeze([
    'Gather Essential Supplies',
    'Repair the Defenses',
    'Heal the Wounded',
    'Secure Food Stores',
  ]),
});

const QUEST_BASE_DESCRIPTIONS: Readonly<Record<OuroborosQuestType, string>> = Object.freeze({
  [OuroborosQuestType.COMBAT]:
    'The wilderness grows hostile. We need someone to deal with the threat.',

  [OuroborosQuestType.TRADE]:
    'Commerce suffers. The roads must remain open for prosperity to return.',

  [OuroborosQuestType.EXPLORATION]:
    'Ancient secrets await discovery. The old places hold answers we need.',

  [OuroborosQuestType.SOCIAL]:
    'The people need guidance. Your wisdom could help resolve our troubles.',

  [OuroborosQuestType.SURVIVAL]:
    'Times are hard. We must secure our basic needs to endure.',
});

const QUEST_TARGETS: Readonly<Record<OuroborosQuestType, readonly string[]>> = Object.freeze({
  [OuroborosQuestType.COMBAT]: Object.freeze([
    'the beast',
    'the warlord',
    'the bandit camp',
    'the monster nest',
  ]),

  [OuroborosQuestType.TRADE]: Object.freeze([
    'the eastern road',
    'the merchant guild',
    'the caravan',
    'the warehouse',
  ]),

  [OuroborosQuestType.EXPLORATION]: Object.freeze([
    'the ancient ruins',
    'the hidden cave',
    'the shrine',
    'the forgotten tomb',
  ]),

  [OuroborosQuestType.SOCIAL]: Object.freeze([
    'the village elder',
    'the grieving family',
    'the merchant',
    'the lost child',
  ]),

  [OuroborosQuestType.SURVIVAL]: Object.freeze([
    'the granary',
    'the village walls',
    'the healer',
    'the water source',
  ]),
});

const QUEST_REWARD_BASIS_POINTS: Readonly<Record<OuroborosQuestType, number>> = Object.freeze({
  [OuroborosQuestType.COMBAT]: 1500,
  [OuroborosQuestType.TRADE]: 1200,
  [OuroborosQuestType.EXPLORATION]: 1300,
  [OuroborosQuestType.SOCIAL]: 1000,
  [OuroborosQuestType.SURVIVAL]: 1100,
});

function toFiniteInteger(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.trunc(value);
}

function clampInteger(value: number, min: number, max: number): number {
  const integer = toFiniteInteger(value);
  if (integer < min) return min;
  if (integer > max) return max;
  return integer;
}

function positiveModulo(value: number, modulus: number): number {
  if (modulus <= 0) return 0;
  const integer = toFiniteInteger(value);
  return ((integer % modulus) + modulus) % modulus;
}

function layerValue(value: number | KappaInt | undefined): number {
  return clampInteger(Number(value ?? 0), LAYER_MIN, LAYER_MAX);
}

function toKappa(value: number): KappaInt {
  return createKappaInt(clampInteger(value, LAYER_MIN, LAYER_MAX));
}

function stableHash(input: string): number {
  return Math.abs(toFiniteInteger(Number(kappa1000Hash(input))));
}

/**
 * Canonical seed input builder.
 *
 * Avoids ambiguous string collisions like:
 * ["ab", "c"] vs ["a", "bc"].
 */
function canonicalParts(parts: readonly unknown[]): string {
  return parts
    .map((part) => {
      const text = String(part ?? '');
      return `${text.length}:${text}`;
    })
    .join('|');
}

function deterministicPick<T>(items: readonly T[], seed: number, salt = 0): T | undefined {
  if (items.length === 0) return undefined;
  return items[positiveModulo(seed + salt, items.length)];
}

function tickToNumber(tick: TickId): number {
  return clampInteger(Number(tick), 0, Number.MAX_SAFE_INTEGER);
}

function tickBucket(tick: TickId, bucketSize: number): number {
  const numericTick = tickToNumber(tick);
  return Math.floor(numericTick / Math.max(1, bucketSize));
}

function scaleBasisPoints(value: number, basisPoints: number): number {
  return Math.floor((toFiniteInteger(value) * toFiniteInteger(basisPoints)) / 1000);
}

function normalizePlayerKey(playerKey: string): string {
  const normalized = String(playerKey ?? '').trim();
  if (normalized.length === 0) return 'ANON_PLAYER';
  return normalized.slice(0, 128);
}

function normalizeNpcId(npcId?: string): string {
  const normalized = String(npcId ?? '').trim();
  if (normalized.length === 0) return 'GLOBAL_NPC';
  return normalized.slice(0, 128);
}

function normalizeText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

export class NPCSemanticsEngine {
  private readonly config = OUROBOROS_CONFIG.SEMANTICS;

  /**
   * Generate NPC dialogue from layer vectors and Erdős-String.
   *
   * Axiom 3:
   * Oracle seed comes only from deterministic runtime source:
   * chunkKey, events, playerKey, tick bucket, npcId, KAPPA.
   */
  generateDialogue(
    erdos: ErdősString,
    playerKey: string,
    layers: KappaLayers,
    tick: TickId,
    npcId?: string,
  ): NPCDialogueLine {
    const vector = this.computeSemanticVector(layers);
    const seed = this.computeDialogueSeed(erdos, playerKey, tick, npcId);
    const context = this.computeSemanticContext(erdos, vector, seed, tick);
    const text = this.traverseSemanticGraph(context);

    return {
      text,
      mood: context.mood,
      timestamp: tick,
    };
  }

  /**
   * Generate quest from layer conditions.
   *
   * Quest output is stable per quest bucket.
   * This prevents quest flicker when called every tick.
   */
  generateQuest(
    erdos: ErdősString,
    layers: KappaLayers,
    tick: TickId,
  ): OuroborosQuest | null {
    if (!this.shouldGenerateQuest(erdos, layers)) {
      return null;
    }

    const seed = this.computeQuestSeed(erdos, tick);
    const questType = this.determineQuestType(layers, erdos, seed);

    return this.generateQuestContent(questType, layers, erdos, seed);
  }

  /**
   * Compute semantic vector from layer values.
   *
   * mood:
   * memory minus conflict
   *
   * need:
   * economy minus market
   *
   * urgency:
   * fear plus conflict minus physiology
   */
  computeSemanticVector(layers: KappaLayers): SemanticVector {
    const memory = layerValue(layers.memory);
    const conflict = layerValue(layers.conflict);
    const economy = layerValue(layers.economy);
    const market = layerValue(layers.market);
    const fear = layerValue(layers.fear);
    const physiology = layerValue(layers.physiology);

    const mood = toKappa(memory - conflict);
    const need = toKappa(economy - market);
    const urgency = toKappa(fear + conflict - physiology);

    return { mood, need, urgency };
  }

  /**
   * Compute deterministic dialogue seed.
   *
   * Uses dialogue bucket instead of raw tick.
   * The returned line still carries the raw tick as timestamp.
   */
  private computeDialogueSeed(
    erdos: ErdősString,
    playerKey: string,
    tick: TickId,
    npcId?: string,
  ): number {
    const bucket = tickBucket(tick, DIALOGUE_STABILITY_TICKS);

    return stableHash(canonicalParts([
      DIALOGUE_SEED_TAG,
      erdos.chunkKey,
      erdos.events,
      normalizePlayerKey(playerKey),
      bucket,
      normalizeNpcId(npcId),
      KAPPA,
    ]));
  }

  /**
   * Compute deterministic quest seed.
   */
  private computeQuestSeed(erdos: ErdősString, tick: TickId): number {
    const bucket = tickBucket(tick, QUEST_STABILITY_TICKS);

    return stableHash(canonicalParts([
      QUEST_SEED_TAG,
      erdos.chunkKey,
      erdos.events,
      bucket,
      KAPPA,
    ]));
  }

  /**
   * Build complete semantic routing context.
   */
  private computeSemanticContext(
    erdos: ErdősString,
    vector: SemanticVector,
    seed: number,
    tick: TickId,
  ): SemanticContext {
    const fallen = hasEvent(erdos, OuroborosEventType.FALLEN);
    const mood = this.selectMood(vector, seed, fallen);
    const pressure = this.computePressure(vector, fallen);
    const nodeType = this.selectSemanticNodeType(mood, vector, seed, fallen, pressure);
    const intent = this.selectIntent(nodeType, mood, vector, pressure);

    return {
      seed,
      dialogueBucket: tickBucket(tick, DIALOGUE_STABILITY_TICKS),
      mood,
      vector,
      pressure,
      fallen,
      intent,
      nodeType,
    };
  }

  /**
   * Compute semantic pressure.
   *
   * Higher pressure means the NPC should speak about warning, need,
   * survival, conflict, or quest hooks rather than neutral flavor.
   */
  private computePressure(vector: SemanticVector, fallen: boolean): number {
    const need = layerValue(vector.need);
    const urgency = layerValue(vector.urgency);
    const moodDeficit = LAYER_MAX - layerValue(vector.mood);
    const fallenBonus = fallen ? 25000 : 0;

    return clampInteger(
      Math.floor((urgency * 2 + need + moodDeficit + fallenBonus) / 4),
      LAYER_MIN,
      LAYER_MAX,
    );
  }

  /**
   * Select mood from semantic vector.
   *
   * Important:
   * No wrap-around from FEARFUL directly to JOYFUL.
   */
  private selectMood(vector: SemanticVector, seed: number, fallen: boolean): NPCMood {
    const moodScore = layerValue(vector.mood);
    const urgencyScore = layerValue(vector.urgency);
    const needScore = layerValue(vector.need);

    if (fallen && urgencyScore >= 40000) {
      return seed % 2 === 0 ? 'FEARFUL' : 'HOSTILE';
    }

    if (urgencyScore >= 80000) {
      return seed % 2 === 0 ? 'FEARFUL' : 'HOSTILE';
    }

    if (needScore >= 85000 && moodScore < 50000) {
      return seed % 2 === 0 ? 'FEARFUL' : 'NEUTRAL';
    }

    const rawIndex = Math.floor((moodScore * MOODS.length) / (LAYER_MAX + 1));
    const baseIndex = clampInteger(rawIndex, 0, MOODS.length - 1);

    const seedShift = positiveModulo(seed, 3) - 1;
    const shiftedIndex = clampInteger(baseIndex + seedShift, 0, MOODS.length - 1);

    return MOODS[shiftedIndex] ?? 'NEUTRAL';
  }

  /**
   * Select semantic node from actual causal signals.
   */
  private selectSemanticNodeType(
    mood: NPCMood,
    vector: SemanticVector,
    seed: number,
    fallen: boolean,
    pressure: number,
  ): SemanticNodeType {
    const need = layerValue(vector.need);
    const urgency = layerValue(vector.urgency);

    if (fallen && pressure >= 50000) {
      return seed % 3 === 0 ? SemanticNodeType.STORY : SemanticNodeType.WARNING;
    }

    if (urgency >= 75000) {
      return seed % 2 === 0 ? SemanticNodeType.WARNING : SemanticNodeType.NEED;
    }

    if (need >= 75000) {
      return seed % 2 === 0 ? SemanticNodeType.NEED : SemanticNodeType.QUEST;
    }

    switch (mood) {
      case 'FEARFUL':
        return seed % 2 === 0 ? SemanticNodeType.WARNING : SemanticNodeType.NEED;

      case 'HOSTILE':
        return seed % 2 === 0 ? SemanticNodeType.WARNING : SemanticNodeType.EMOTION;

      case 'HOPEFUL':
        return seed % 2 === 0 ? SemanticNodeType.GREETING : SemanticNodeType.QUEST;

      case 'JOYFUL':
        return seed % 2 === 0 ? SemanticNodeType.GREETING : SemanticNodeType.STORY;

      case 'NEUTRAL':
      default:
        return seed % 2 === 0 ? SemanticNodeType.NEED : SemanticNodeType.QUEST;
    }
  }

  /**
   * Select deterministic speech intent.
   */
  private selectIntent(
    nodeType: SemanticNodeType,
    mood: NPCMood,
    vector: SemanticVector,
    pressure: number,
  ): SemanticIntent {
    const need = layerValue(vector.need);
    const urgency = layerValue(vector.urgency);

    if (nodeType === SemanticNodeType.WARNING || urgency >= 75000 || pressure >= 80000) {
      return SemanticIntent.WARN;
    }

    if (nodeType === SemanticNodeType.QUEST) {
      return SemanticIntent.QUEST_HOOK;
    }

    if (nodeType === SemanticNodeType.NEED || need >= 70000) {
      return SemanticIntent.REQUEST;
    }

    if (nodeType === SemanticNodeType.STORY || mood === 'JOYFUL') {
      return SemanticIntent.MEMORY;
    }

    if (nodeType === SemanticNodeType.FAREWELL) {
      return SemanticIntent.CLOSE;
    }

    return SemanticIntent.OPEN;
  }

  /**
   * Traverse semantic graph to generate text.
   */
  private traverseSemanticGraph(context: SemanticContext): string {
    const rows = SEMANTIC_GRAPH[context.nodeType];

    const urgencySalt = Math.floor(layerValue(context.vector.urgency) / 1000);
    const needSalt = Math.floor(layerValue(context.vector.need) / 1000);
    const moodSalt = Math.floor(layerValue(context.vector.mood) / 1000);
    const pressureSalt = Math.floor(context.pressure / 1000);
    const fallenSalt = context.fallen ? 17 : 0;

    const row = deterministicPick(
      rows,
      context.seed,
      urgencySalt + needSalt + fallenSalt,
    );

    if (!row || row.length === 0) {
      return FALLBACK_DIALOGUE;
    }

    const columnSeed = Math.floor(context.seed / 16) + moodSalt + pressureSalt;
    const core = deterministicPick(row, columnSeed) ?? FALLBACK_DIALOGUE;

    const opener = this.selectOptionalOpener(context);
    const suffix = this.selectOptionalSuffix(context);

    return normalizeText([opener, core, suffix].filter(Boolean).join(' '));
  }

  /**
   * Optional deterministic opener.
   *
   * Adds variety without changing external input requirements.
   */
  private selectOptionalOpener(context: SemanticContext): string {
    if (context.pressure < 40000 && context.intent !== SemanticIntent.OPEN) {
      return '';
    }

    if (context.seed % 3 !== 0) {
      return '';
    }

    const options = INTENT_OPENERS[context.intent];
    return deterministicPick(options, context.seed, context.dialogueBucket) ?? '';
  }

  /**
   * Optional deterministic suffix.
   *
   * Keeps dialogue compact but more expressive under high pressure.
   */
  private selectOptionalSuffix(context: SemanticContext): string {
    if (context.pressure < 70000) {
      return '';
    }

    if (context.seed % 4 !== 0) {
      return '';
    }

    switch (context.intent) {
      case SemanticIntent.WARN:
        return 'Move carefully.';

      case SemanticIntent.REQUEST:
        return 'Delay will cost lives.';

      case SemanticIntent.QUEST_HOOK:
        return 'Ask around before nightfall.';

      case SemanticIntent.MEMORY:
        return 'Few still speak of it.';

      case SemanticIntent.OPEN:
      case SemanticIntent.CLOSE:
      default:
        return '';
    }
  }

  /**
   * Quest emergence gate.
   *
   * Original behavior remains:
   * economy - market over threshold can create a quest.
   *
   * Stronger behavior:
   * severe conflict, fallen-event, dungeon pressure, and survival pressure
   * can also create real quests.
   */
  private shouldGenerateQuest(erdos: ErdősString, layers: KappaLayers): boolean {
    const needVector = clampInteger(
      layerValue(layers.economy) - layerValue(layers.market),
      LAYER_MIN,
      LAYER_MAX,
    );

    const threshold = clampInteger(
      Number(this.config.NEED_THRESHOLD ?? 0),
      LAYER_MIN,
      LAYER_MAX,
    );

    if (needVector >= threshold) {
      return true;
    }

    if (hasEvent(erdos, OuroborosEventType.FALLEN)) {
      return true;
    }

    if (layerValue(layers.conflict) >= 70000) {
      return true;
    }

    if (layerValue(layers.dungeon) >= 80000) {
      return true;
    }

    if (layerValue(layers.fear) >= 85000 && layerValue(layers.physiology) <= 30000) {
      return true;
    }

    return false;
  }

  /**
   * Determine quest type from layer conditions.
   */
  private determineQuestType(
    layers: KappaLayers,
    erdos: ErdősString,
    seed: number,
  ): OuroborosQuestType {
    const conflict = layerValue(layers.conflict);
    const trade = layerValue(layers.trade);
    const dungeon = layerValue(layers.dungeon);
    const fear = layerValue(layers.fear);
    const economy = layerValue(layers.economy);
    const physiology = layerValue(layers.physiology);

    if (hasEvent(erdos, OuroborosEventType.FALLEN)) {
      return OuroborosQuestType.COMBAT;
    }

    if (conflict >= 50000 || fear >= 80000) {
      return OuroborosQuestType.COMBAT;
    }

    if (dungeon >= 50000) {
      return OuroborosQuestType.EXPLORATION;
    }

    if (trade >= 50000 && economy >= 30000) {
      return OuroborosQuestType.TRADE;
    }

    if (economy <= 25000 || physiology <= 30000 || fear >= 60000) {
      return OuroborosQuestType.SURVIVAL;
    }

    return seed % 5 === 0 ? OuroborosQuestType.SURVIVAL : OuroborosQuestType.SOCIAL;
  }

  /**
   * Generate quest content.
   */
  private generateQuestContent(
    type: OuroborosQuestType,
    layers: KappaLayers,
    erdos: ErdősString,
    seed: number,
  ): OuroborosQuest {
    const title = this.getQuestTitle(type, seed);
    const description = this.getQuestDescription(type, layers, seed);
    const targetEntity = this.getQuestTarget(type, erdos, seed);

    const reward = this.computeQuestReward(layers, type, seed);
    const difficulty = this.computeQuestDifficulty(layers, seed);

    return {
      type,
      title,
      description,
      targetEntity,
      reward,
      difficulty,
    };
  }

  /**
   * Get quest title based on type and seed.
   */
  private getQuestTitle(type: OuroborosQuestType, seed: number): string {
    return deterministicPick(QUEST_TITLES[type], seed) ?? 'Unspoken Trouble';
  }

  /**
   * Get quest description based on conditions.
   */
  private getQuestDescription(
    type: OuroborosQuestType,
    layers: KappaLayers,
    seed: number,
  ): string {
    const base = QUEST_BASE_DESCRIPTIONS[type];

    const conflict = layerValue(layers.conflict);
    const fear = layerValue(layers.fear);
    const cycles = layerValue(layers.cycles);
    const dungeon = layerValue(layers.dungeon);
    const market = layerValue(layers.market);
    const economy = layerValue(layers.economy);
    const physiology = layerValue(layers.physiology);

    const clauses: string[] = [];

    if (conflict >= 75000) {
      clauses.push('War looms closer each day.');
    }

    if (fear >= 50000) {
      clauses.push('Fear spreads among the populace.');
    }

    if (dungeon >= 70000) {
      clauses.push('The old depths are restless.');
    }

    if (cycles >= 50000) {
      clauses.push('The old cycles stir uneasily.');
    }

    if (market >= 70000 && economy <= 40000) {
      clauses.push('Prices rise while supplies vanish.');
    }

    if (physiology <= 30000) {
      clauses.push('The weak will not endure much longer.');
    }

    if (clauses.length === 0) {
      return base;
    }

    const selectedClause = deterministicPick(clauses, seed) ?? clauses[0];
    return normalizeText(`${base} ${selectedClause}`);
  }

  /**
   * Get quest target entity.
   */
  private getQuestTarget(
    type: OuroborosQuestType,
    erdos: ErdősString,
    seed: number,
  ): string {
    const erdosSeed = stableHash(canonicalParts([
      QUEST_TARGET_SEED_TAG,
      erdos.chunkKey,
      erdos.events,
      seed,
      KAPPA,
    ]));

    return deterministicPick(QUEST_TARGETS[type], erdosSeed) ?? 'the troubled village';
  }

  /**
   * Compute quest reward.
   *
   * No floating point multipliers.
   *
   * Basis:
   * 1000 = 1.0x
   * 1500 = 1.5x
   */
  private computeQuestReward(
    layers: KappaLayers,
    type: OuroborosQuestType,
    seed: number,
  ): KappaInt {
    const economy = layerValue(layers.economy);
    const conflict = layerValue(layers.conflict);
    const dungeon = layerValue(layers.dungeon);
    const fear = layerValue(layers.fear);

    const riskBonus = Math.floor((conflict + dungeon + fear) / 12);
    const scaledEconomy = scaleBasisPoints(economy, QUEST_REWARD_BASIS_POINTS[type]);
    const seedBonus = positiveModulo(seed, 10000);

    const reward = scaledEconomy + riskBonus + seedBonus;

    return toKappa(reward);
  }

  /**
   * Compute quest difficulty.
   */
  private computeQuestDifficulty(
    layers: KappaLayers,
    seed: number,
  ): KappaInt {
    const conflict = layerValue(layers.conflict);
    const dungeon = layerValue(layers.dungeon);
    const fear = layerValue(layers.fear);
    const physiology = layerValue(layers.physiology);

    const survivalPenalty = Math.floor((LAYER_MAX - physiology) / 4);
    const baseDifficulty = conflict + dungeon + Math.floor(fear / 2) + survivalPenalty;
    const difficulty = Math.floor(baseDifficulty / 2) + positiveModulo(seed, 20000);

    return createKappaInt(clampInteger(difficulty, 10000, LAYER_MAX));
  }
}

/**
 * Singleton instance.
 *
 * Safe because the engine itself is stateless.
 * It does not store generated dialogue, quests, tick state, or runtime snapshots.
 */
let semanticsEngineInstance: NPCSemanticsEngine | null = null;

export function getNPCSemanticsEngine(): NPCSemanticsEngine {
  if (!semanticsEngineInstance) {
    semanticsEngineInstance = new NPCSemanticsEngine();
  }

  return semanticsEngineInstance;
  }
