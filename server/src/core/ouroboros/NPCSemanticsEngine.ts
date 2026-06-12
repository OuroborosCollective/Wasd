/**
 * NPCSemanticsEngine - Deterministic Speech and Quest Generation
 * 
 * Phase 11: Ouroboros Grand Unification with ARE-Logic
 * 
 * Axiom 2: Nomock-Theorem (NO LLMs, NO external data)
 * Axiom 3: Zeitstempel-Integrität (tick-basiert)
 * 
 * Generates NPC dialogue and quests from layer vectors using
 * deterministic semantic graph traversal.
 * 
 * NO random generation - all outputs computed from FNV-1a hashes.
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

/**
 * Semantic graph node types
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
 * Semantic graph for deterministic traversal
 * Structure: [seed % nodeCount] → deterministic node selection
 */
const SEMANTIC_GRAPH: Readonly<{
  [K in SemanticNodeType]: ReadonlyArray<ReadonlyArray<string>>;
}> = Object.freeze({
  [SemanticNodeType.GREETING]: Object.freeze([
    ['Hail, traveler.', 'Well met.', 'Greetings, stranger.', 'Good day to you.'],
    ['What brings you to our land?', 'Seek you shelter or trade?', 'News travels fast here.'],
    ['The roads grow dangerous.', 'I have not seen your face before.'],
  ]),
  
  [SemanticNodeType.EMOTION]: Object.freeze([
    ['Fear grips the village.', 'Hope fades with each passing day.'],
    ['We remember the old kingdom fondly.', 'War has scarred these lands.'],
    ['The dungeon whispers dark secrets.', 'Ancient spirits stir不安.'],
    ['Prosperity returns slowly.', 'Trade routes bring both wealth and peril.'],
  ]),
  
  [SemanticNodeType.NEED]: Object.freeze([
    ['We lack skilled hands.', 'Our stores dwindle.', 'The fields need tending.'],
    ['Warriors are in short supply.', 'Wisdom is scarce these days.'],
    ['Our children go hungry.', 'The old ways are forgotten.'],
  ]),
  
  [SemanticNodeType.QUEST]: Object.freeze([
    ['The dungeon beckons.', 'A merchant caravan seeks protection.'],
    ['Monsters plague the northern road.', 'A lost soul searches for kin.'],
    ['The old shrine requires blessing.', 'A dying man seeks closure.'],
    ['The harvest festival approaches.', 'The mine collapses threaten us.'],
  ]),
  
  [SemanticNodeType.WARNING]: Object.freeze([
    ['Beware the fallen kingdom.', 'The dungeon spawns darkest nightmares.'],
    ['Trust no stranger fully.', 'The night brings creatures unknown.'],
    ['War approaches from the east.', 'Famine stalks the land.'],
  ]),
  
  [SemanticNodeType.STORY]: Object.freeze([
    ['Our kingdom stood for generations.', 'The old king was just and wise.'],
    ['Legends speak of treasures untold.', 'The dragon slept beneath the mountain.'],
    ['Witches once gathered at the crossroads.', 'The river spirits demand tribute.'],
  ]),
  
  [SemanticNodeType.FAREWELL]: Object.freeze([
    ['May the winds guide you.', 'Stay safe on the roads.', 'Return when peace returns.'],
    ['Until we meet again.', 'The gods watch over travelers.'],
  ]),
});

/**
 * Quest type based on layer conditions
 */
export enum OuroborosQuestType {
  COMBAT = 'COMBAT',
  TRADE = 'TRADE',
  EXPLORATION = 'EXPLORATION',
  SOCIAL = 'SOCIAL',
  SURVIVAL = 'SURVIVAL',
}

/**
 * Generated quest structure
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
 * NPC dialogue line with context
 */
export interface NPCDialogueLine {
  readonly text: string;
  readonly mood: string;
  readonly timestamp: TickId;
}

export class NPCSemanticsEngine {
  private readonly config = OUROBOROS_CONFIG.SEMANTICS;

  /**
   * Generate NPC dialogue from layer vectors and Erdős-String.
   * 
   * Axiom 3: Oracle-Seed from deterministic hash
   * 
   * @param erdos - Erdős-String for the chunk
   * @param playerKey - Player identifier for seed variation
   * @param layers - Current layer values
   * @param tick - Current tick (deterministic)
   * @param npcId - Optional NPC ID for individual variation
   * @returns Generated dialogue line
   */
  generateDialogue(
    erdos: ErdősString,
    playerKey: string,
    layers: KappaLayers,
    tick: TickId,
    npcId?: string,
  ): NPCDialogueLine {
    // 1. Oracle-Seed (Axiom 3: Deterministic hash)
    const seed = this.computeDialogueSeed(erdos, playerKey, tick, npcId);
    
    // 2. Compute semantic vector from layers
    const vector = this.computeSemanticVector(layers);
    
    // 3. Select mood based on vector
    const mood = this.selectMood(vector, seed);
    
    // 4. Generate text from semantic graph
    const text = this.traverseSemanticGraph(mood, vector, seed);
    
    return {
      text,
      mood,
      timestamp: tick,
    };
  }

  /**
   * Generate quest from layer conditions.
   * 
   * @param erdos - Erdős-String for the chunk
   * @param layers - Current layer values
   * @param tick - Current tick
   * @returns Generated quest or null if no quest conditions met
   */
  generateQuest(
    erdos: ErdősString,
    layers: KappaLayers,
    tick: TickId,
  ): OuroborosQuest | null {
    // Check if quest emergence conditions are met
    const needVector = layers.economy - layers.market;
    
    if (needVector < this.config.NEED_THRESHOLD) {
      return null;
    }
    
    // Deterministic seed for quest
    const seed = kappa1000Hash(`${erdos.chunkKey}_${tick}_QUEST_${KAPPA}`);
    
    // Determine quest type from layers and Erdős events
    const questType = this.determineQuestType(layers, erdos, seed);
    
    // Generate quest content
    return this.generateQuestContent(questType, layers, erdos, seed);
  }

  /**
   * Compute semantic vector from layer values.
   */
  computeSemanticVector(layers: KappaLayers): SemanticVector {
    const mood = createKappaInt(layers.memory - layers.conflict);
    const need = createKappaInt(layers.economy - layers.market);
    const urgency = createKappaInt(layers.fear + layers.conflict - layers.physiology);
    
    return { mood, need, urgency };
  }

  /**
   * Compute deterministic seed for dialogue.
   */
  private computeDialogueSeed(
    erdos: ErdősString,
    playerKey: string,
    tick: TickId,
    npcId?: string,
  ): number {
    const npcPart = npcId ? `_${npcId}` : '';
    const input = `${erdos.chunkKey}_${erdos.events}_${playerKey}_${tick}${npcPart}_${KAPPA}`;
    return kappa1000Hash(input);
  }

  /**
   * Select mood from semantic vector.
   */
  private selectMood(vector: SemanticVector, seed: number): string {
    const moods = ['FEARFUL', 'HOSTILE', 'NEUTRAL', 'HOPEFUL', 'JOYFUL'];
    
    // Map vector to mood index deterministically
    const normalizedMood = (Number(vector.mood) % 1000) / 1000;
    const index = Math.floor(normalizedMood * moods.length);
    
    // Add seed variation
    const moodIndex = (index + (seed % 3)) % moods.length;
    
    return moods[moodIndex];
  }

  /**
   * Traverse semantic graph to generate text.
   */
  private traverseSemanticGraph(
    mood: string,
    vector: SemanticVector,
    seed: number,
  ): string {
    // Determine primary node type based on mood
    let nodeType: SemanticNodeType;
    
    switch (mood) {
      case 'FEARFUL':
        nodeType = seed % 2 === 0 ? SemanticNodeType.WARNING : SemanticNodeType.NEED;
        break;
      case 'HOSTILE':
        nodeType = seed % 2 === 0 ? SemanticNodeType.WARNING : SemanticNodeType.EMOTION;
        break;
      case 'HOPEFUL':
        nodeType = seed % 2 === 0 ? SemanticNodeType.GREETING : SemanticNodeType.QUEST;
        break;
      case 'JOYFUL':
        nodeType = seed % 2 === 0 ? SemanticNodeType.GREETING : SemanticNodeType.STORY;
        break;
      default:
        nodeType = seed % 2 === 0 ? SemanticNodeType.NEED : SemanticNodeType.QUEST;
    }
    
    // Get node array
    const nodes = SEMANTIC_GRAPH[nodeType];
    if (!nodes || nodes.length === 0) {
      return '...';
    }
    
    // Deterministic selection
    const rowIndex = seed % nodes.length;
    const row = nodes[rowIndex];
    if (!row || row.length === 0) {
      return '...';
    }
    
    const colIndex = (seed >> 4) % row.length;
    return row[colIndex] ?? '...';
  }

  /**
   * Determine quest type from layer conditions.
   */
  private determineQuestType(layers: KappaLayers, erdos: ErdősString, seed: number): OuroborosQuestType {
    // Priority: dungeon/fallen > conflict > trade > exploration > social
    if (hasEvent(erdos, OuroborosEventType.FALLEN)) {
      return OuroborosQuestType.COMBAT;
    }
    
    if (layers.conflict > 50000) {
      return OuroborosQuestType.COMBAT;
    }
    
    if (layers.trade > 50000) {
      return OuroborosQuestType.TRADE;
    }
    
    if (layers.dungeon > 50000) {
      return OuroborosQuestType.EXPLORATION;
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
    const titles = this.getQuestTitles(type, seed);
    const descriptions = this.getQuestDescriptions(type, layers, seed);
    const targets = this.getQuestTargets(type, erdos, seed);
    
    const reward = this.computeQuestReward(layers, type, seed);
    const difficulty = this.computeQuestDifficulty(layers, type, seed);
    
    return {
      type,
      title: titles,
      description: descriptions,
      targetEntity: targets,
      reward,
      difficulty,
    };
  }

  /**
   * Get quest title based on type and seed.
   */
  private getQuestTitles(type: OuroborosQuestType, seed: number): string {
    const titleMap: Record<OuroborosQuestType, string[]> = {
      [OuroborosQuestType.COMBAT]: [
        'Slay the Dungeon Beast',
        'Defend the Village',
        'Clear the Warband',
        'Protect the Caravan',
      ],
      [OuroborosQuestType.TRADE]: [
        'Deliver the Goods',
        'Establish Trade Route',
        'Negotiate with Merchants',
        'Collect Outstanding Debts',
      ],
      [OuroborosQuestType.EXPLORATION]: [
        'Chart the Forgotten Path',
        'Find the Lost Shrine',
        'Investigate Strange Lights',
        'Map the Ruins',
      ],
      [OuroborosQuestType.SOCIAL]: [
        'Mediate Dispute',
        'Spread the News',
        'Organize Festival',
        'Find Missing Person',
      ],
      [OuroborosQuestType.SURVIVAL]: [
        'Gather Essential Supplies',
        'Repair the Defenses',
        'Heal the Wounded',
        'Secure Food Stores',
      ],
    };
    
    const titles = titleMap[type];
    return titles[seed % titles.length];
  }

  /**
   * Get quest description based on conditions.
   */
  private getQuestDescriptions(
    type: OuroborosQuestType,
    layers: KappaLayers,
    seed: number,
  ): string {
    const baseDescriptions = {
      [OuroborosQuestType.COMBAT]: 'The wilderness grows hostile. We need someone to deal with the threat.',
      [OuroborosQuestType.TRADE]: 'Commerce suffers. The roads must remain open for prosperity to return.',
      [OuroborosQuestType.EXPLORATION]: 'Ancient secrets await discovery. The old places hold answers we need.',
      [OuroborosQuestType.SOCIAL]: 'The people need guidance. Your wisdom could help resolve our troubles.',
      [OuroborosQuestType.SURVIVAL]: 'Times are hard. We must secure our basic needs to endure.',
    };
    
    // Add layer-based variation
    let description = baseDescriptions[type];
    
    if (layers.conflict > 75000) {
      description += ' War looms closer each day.';
    } else if (layers.fear > 50000) {
      description += ' Fear spreads among the populace.';
    } else if (layers.cycles > 50000) {
      description += ' The old cycles stir不安.';
    }
    
    return description;
  }

  /**
   * Get quest target entity.
   */
  private getQuestTargets(type: OuroborosQuestType, erdos: ErdősString, seed: number): string {
    const targetPrefixes: Record<OuroborosQuestType, string[]> = {
      [OuroborosQuestType.COMBAT]: ['the beast', 'the warlord', 'the bandit camp', 'the monster nest'],
      [OuroborosQuestType.TRADE]: ['the eastern road', 'the merchant guild', 'the caravan', 'the warehouse'],
      [OuroborosQuestType.EXPLORATION]: ['the ancient ruins', 'the hidden cave', 'the shrine', 'the forgotten tomb'],
      [OuroborosQuestType.SOCIAL]: ['the village elder', 'the grieving family', 'the merchant', 'the lost child'],
      [OuroborosQuestType.SURVIVAL]: ['the granary', 'the village walls', 'the healer', 'the water source'],
    };
    
    const prefixes = targetPrefixes[type];
    const erdosSeed = kappa1000Hash(`${erdos.chunkKey}|${erdos.events}|${seed}`);
    return prefixes[erdosSeed % prefixes.length];
  }

  /**
   * Compute quest reward.
   */
  private computeQuestReward(layers: KappaLayers, type: OuroborosQuestType, seed: number): KappaInt {
    // Base reward from economy layer
    const baseReward = layers.economy;
    
    // Type multiplier
    const multipliers: Record<OuroborosQuestType, number> = {
      [OuroborosQuestType.COMBAT]: 1.5,
      [OuroborosQuestType.TRADE]: 1.2,
      [OuroborosQuestType.EXPLORATION]: 1.3,
      [OuroborosQuestType.SOCIAL]: 1.0,
      [OuroborosQuestType.SURVIVAL]: 1.1,
    };
    
    const multiplier = multipliers[type];
    const reward = Math.round((baseReward * multiplier) + (seed % 10000));
    
    return createKappaInt(Math.min(reward, 100000));
  }

  /**
   * Compute quest difficulty.
   */
  private computeQuestDifficulty(layers: KappaLayers, type: OuroborosQuestType, seed: number): KappaInt {
    // Difficulty scales with conflict and dungeon layers
    const baseDifficulty = layers.conflict + layers.dungeon;
    
    // Add seed variation
    const difficulty = Math.round((baseDifficulty / 2) + (seed % 20000));
    
    return createKappaInt(Math.min(Math.max(difficulty, 10000), 100000));
  }
}

// Singleton instance
let semanticsEngineInstance: NPCSemanticsEngine | null = null;

export function getNPCSemanticsEngine(): NPCSemanticsEngine {
  if (!semanticsEngineInstance) {
    semanticsEngineInstance = new NPCSemanticsEngine();
  }
  return semanticsEngineInstance;
}
