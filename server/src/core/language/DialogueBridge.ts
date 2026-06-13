/**
 * @file server/src/core/language/DialogueBridge.ts
 * @description Bridge between Living Language System and existing dialogues.json
 *
 * Integrates the procedural Living Language System with the static dialogue data
 * in game-data/dialogue/dialogues.json and the existing DialogueDirector/NPCDialogueSystem.
 *
 * Architecture:
 * 1. dialogues.json - Static quest dialogue (source of truth for quest content)
 * 2. DialogueDirector - Deterministic context-aware dialogue responses
 * 3. NPCDialogueSystem - Simple deterministic line selection
 * 4. Living Language System (this module) - Procedural lexeme/phrase genome layer
 *
 * HARD CONSTRAINTS:
 * - NO Date.now(), new Date(), Math.random(), crypto.randomUUID()
 * - All lookups derive from stable hashes
 */

import { stableHash32 } from '../determinism/AREDeterminism.js';
import type {
  SpeechIntent,
  PhraseGenome,
} from './LanguageTypes.js';
import { createKappaInt } from './LanguageTypes.js';
import { registerCanonicalLexeme, type LexemeBlueprint } from './LivingDudenArchive.js';
import { registerPhraseGenome } from './DialogueDecisionKernel.js';
import { seedDefaultDialects } from './DialectStores.js';

// =============================================================================
// DIALOGUE JSON TYPES (from game-data/dialogue/dialogues.json)
// =============================================================================

export interface DialogueEntry {
  id: string;
  greeting?: string;
  fallback?: string;
  questStartLines?: Record<string, string>;
  questProgressLines?: Record<string, string>;
  questCompleteLines?: Record<string, string>;
  questPrerequisiteLines?: Record<string, string>;
  nodes?: Record<string, DialogueNode>;
  entryNodes?: EntryNode[];
}

export interface DialogueNode {
  text: string;
  choices?: DialogueChoice[];
  setFlag?: string;
}

export interface DialogueChoice {
  id: string;
  text: string;
  nextNodeId: string;
  changeReputation?: { factionId: string; amount: number };
}

export interface EntryNode {
  nodeId: string;
  conditionFlag?: string;
  conditionReputation?: { factionId: string; min?: number; max?: number };
}

// =============================================================================
// DIALOGUE REGISTRY
// =============================================================================

let dialogueData: Map<string, DialogueEntry> = new Map();
let bridgeInitialized = false;

// =============================================================================
// BRIDGE INITIALIZATION
// =============================================================================

/**
 * Initialize bridge from dialogue JSON data.
 * Call this during server startup after loading dialogues.json.
 */
export function initializeDialogueBridge(dialogues: DialogueEntry[]): void {
  if (bridgeInitialized) {
    console.warn('[DialogueBridge] Already initialized, skipping...');
    return;
  }

  console.log(`[DialogueBridge] Initializing with ${dialogues.length} dialogue entries...`);

  // Load dialogue entries
  for (const entry of dialogues) {
    dialogueData.set(entry.id, entry);
  }

  // Seed phrase genomes from dialogue entries
  seedPhraseGenomesFromDialogues(dialogues);

  // Seed lexemes from dialogue content
  seedLexemesFromDialogues(dialogues);

  // Seed faction dialects
  seedDefaultDialects();

  bridgeInitialized = true;
  console.log(`[DialogueBridge] Initialized with ${dialogueData.size} entries`);
}

export function isDialogueBridgeInitialized(): boolean {
  return bridgeInitialized;
}

// =============================================================================
// PHRASE GENOME SEEDING FROM DIALOGUES
// =============================================================================

function seedPhraseGenomesFromDialogues(dialogues: DialogueEntry[]): void {
  for (const dialogue of dialogues) {
    const npcId = dialogue.id.replace('dialogue_', 'npc_');

    // Create greeting genome
    if (dialogue.greeting) {
      const greetingGenome: PhraseGenome = {
        id: `${npcId}_greet`,
        intent: 'greet',
        languageMode: 'de',
        structure: ['subject'],
        slots: [{ role: 'subject', required: true, semanticRequirements: ['greeting'] }],
        constraints: {},
        outcomeStats: { uses: 0, successfulUses: 0, failedUses: 0, averageKappaScore: createKappaInt(1.0) },
        mutation: { parentGenomeIds: [], generation: 0, stability: createKappaInt(1.0), novelty: createKappaInt(0) },
        truthMode: 'known_fact',
      };
      registerPhraseGenome(greetingGenome);
    }

    // Create quest line genomes
    const questIntents: Record<string, SpeechIntent> = {
      questStartLines: 'request',
      questProgressLines: 'teach',
      questCompleteLines: 'thank',
      questPrerequisiteLines: 'warn',
    };

    for (const [lineKey, intent] of Object.entries(questIntents)) {
      const lines = dialogue[lineKey as keyof DialogueEntry] as Record<string, string> | undefined;
      if (lines) {
        for (const [questId, text] of Object.entries(lines)) {
          const questGenome: PhraseGenome = {
            id: `${npcId}_${questId}_${intent}`,
            intent,
            languageMode: 'de',
            structure: ['subject', 'verb', 'object'],
            slots: [
              { role: 'subject', required: true },
              { role: 'verb', required: true, semanticRequirements: extractConceptsFromText(text) },
              { role: 'object', required: false },
            ],
            constraints: { requiredRole: extractRoleFromDialogue(dialogue) },
            outcomeStats: { uses: 0, successfulUses: 0, failedUses: 0, averageKappaScore: createKappaInt(1.0) },
            mutation: { parentGenomeIds: [], generation: 0, stability: createKappaInt(1.0), novelty: createKappaInt(0) },
            truthMode: 'known_fact',
          };
          registerPhraseGenome(questGenome);
        }
      }
    }
  }
}

// =============================================================================
// LEXEME SEEDING FROM DIALOGUES
// =============================================================================

function seedLexemesFromDialogues(dialogues: DialogueEntry[]): void {
  const seenLemmas = new Set<string>();

  for (const dialogue of dialogues) {
    // Extract from greeting
    if (dialogue.greeting) {
      extractLexemesFromText(dialogue.greeting, dialogue.id, seenLemmas);
    }

    // Extract from all quest lines
    const lineTypes = ['questStartLines', 'questProgressLines', 'questCompleteLines', 'questPrerequisiteLines'] as const;
    for (const lineType of lineTypes) {
      const lines = dialogue[lineType];
      if (lines) {
        for (const text of Object.values(lines)) {
          extractLexemesFromText(text, dialogue.id, seenLemmas);
        }
      }
    }
  }
}

function extractLexemesFromText(text: string, dialogueId: string, seenLemmas: Set<string>): void {
  const conceptWords: Record<string, string[]> = {
    greeting: ['grüßen', 'greeting', 'hallo', 'willkommen', 'welcome'],
    farewell: ['farewell', 'goodbye', 'leben', 'go', 'leave'],
    quest: ['quest', 'task', 'arbeit', 'auftrag', 'help', 'helfen'],
    trade: ['trade', 'handel', 'buy', 'sell', 'kaufen', 'verkaufen'],
    village: ['village', 'dorf', 'town', 'stadt', 'millbrook'],
    iron: ['iron', 'eisen', 'scrap', 'schrott'],
    wolf: ['wolf', 'dire', 'hunt', 'jagd'],
    forge: ['forge', 'esse', 'blacksmith', 'schmied'],
    elder: ['elder', 'älteste', 'rowan', 'weisheit'],
    scout: ['scout', 'späher', 'patrol', 'watch'],
    danger: ['danger', 'gefahr', 'dangerous', 'gefährlich', 'warning', 'warnung'],
    help: ['help', 'helfen', 'aid', 'beistand'],
    friend: ['friend', 'freund', 'trust', 'vertrauen'],
  };

  const textLower = text.toLowerCase();

  for (const [concept, words] of Object.entries(conceptWords)) {
    for (const word of words) {
      if (textLower.includes(word) && !seenLemmas.has(word)) {
        seenLemmas.add(word);

        const lexeme: LexemeBlueprint = {
          id: `dialogue_${dialogueId}_${concept}_${word}`,
          lemma: word,
          language: word.length > 4 && /[äöüß]/i.test(word) ? 'de' : 'en',
          concepts: [concept],
          invented: false,
          baseWeight: 1.0,
          grammar: { partOfSpeech: 'noun', allowedPositions: ['subject', 'object'] },
        };

        registerCanonicalLexeme(lexeme);
      }
    }
  }
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

function mapDialogueNodeToIntent(text: string): SpeechIntent {
  const textLower = text.toLowerCase();
  if (textLower.includes('?') && (textLower.includes('can you') || textLower.includes('would you'))) return 'request';
  if (textLower.includes('thank') || textLower.includes('danke')) return 'thank';
  if (textLower.includes('beware') || textLower.includes('warn') || textLower.includes('vorsicht'))) return 'warn';
  if (textLower.includes('join') || textLower.includes('recruit')) return 'recruit';
  if (textLower.includes('rumor') || textLower.includes('heard'))) return 'rumor_share';
  return 'greet';
}

function extractConceptsFromText(text: string): string[] {
  const concepts: string[] = [];
  const textLower = text.toLowerCase();
  const conceptPatterns: Record<string, RegExp[]> = {
    quest: [/quest/i, /task/i, /arbeit/i, /auftrag/i, /help/i],
    village: [/village/i, /dorf/i, /town/i, /stadt/i, /millbrook/i],
    danger: [/danger/i, /gefahr/i, /warnung/i, /beware/i],
    trade: [/trade/i, /handel/i, /buy/i, /sell/i],
    iron: [/iron/i, /eisen/i, /scrap/i, /schrott/i],
    wolf: [/wolf/i, /dire/i, /hunt/i],
    help: [/help/i, /helfen/i, /aid/i],
  };

  for (const [concept, patterns] of Object.entries(conceptPatterns)) {
    if (patterns.some((p) => p.test(text))) {
      concepts.push(concept);
    }
  }
  return concepts;
}

function extractRoleFromDialogue(dialogue: DialogueEntry): string | undefined {
  const roleMap: Record<string, string> = {
    dialogue_guide: 'Village Guide',
    dialogue_npc_1: 'Quest Giver',
    dialogue_npc_2: 'Guard',
    dialogue_npc_3: 'Elder',
    dialogue_npc_4: 'Blacksmith',
    dialogue_npc_5: 'Scout',
    dialogue_npc_6: 'Hermit',
    dialogue_npc_7: 'Merchant',
    dialogue_npc_8: 'Apprentice',
    dialogue_wolf: 'Enemy',
    dialogue_dummy: 'Training',
  };
  return roleMap[dialogue.id];
}

// =============================================================================
// DIALOGUE LOOKUP (for existing dialogue system integration)
// =============================================================================

export function getDialogueEntry(dialogueId: string): DialogueEntry | undefined {
  return dialogueData.get(dialogueId);
}

export function getGreeting(dialogueId: string): string | undefined {
  return dialogueData.get(dialogueId)?.greeting;
}

export function getQuestLine(
  dialogueId: string,
  questId: string,
  lineType: 'start' | 'progress' | 'complete' | 'prerequisite'
): string | undefined {
  const dialogue = dialogueData.get(dialogueId);
  if (!dialogue) return undefined;

  const lineMap: Record<string, Record<string, string> | undefined> = {
    start: dialogue.questStartLines,
    progress: dialogue.questProgressLines,
    complete: dialogue.questCompleteLines,
    prerequisite: dialogue.questPrerequisiteLines,
  };

  return lineMap[lineType]?.[questId];
}

export function getQuestIds(dialogueId: string): string[] {
  const dialogue = dialogueData.get(dialogueId);
  if (!dialogue) return [];

  const ids = new Set<string>();
  if (dialogue.questStartLines) for (const id of Object.keys(dialogue.questStartLines)) ids.add(id);
  if (dialogue.questProgressLines) for (const id of Object.keys(dialogue.questProgressLines)) ids.add(id);
  if (dialogue.questCompleteLines) for (const id of Object.keys(dialogue.questCompleteLines)) ids.add(id);
  if (dialogue.questPrerequisiteLines) for (const id of Object.keys(dialogue.questPrerequisiteLines)) ids.add(id);
  return Array.from(ids);
}

export function hasDialogueNodes(dialogueId: string): boolean {
  const dialogue = dialogueData.get(dialogueId);
  return dialogue?.nodes !== undefined && Object.keys(dialogue.nodes).length > 0;
}

export function getFallbackText(dialogueId: string): string {
  const dialogue = dialogueData.get(dialogueId);
  if (dialogue?.fallback) return dialogue.fallback;

  const defaults: Record<string, string> = {
    dialogue_wolf: 'Grrrrr...',
    dialogue_dummy: '...',
  };
  return defaults[dialogueId] ?? '...';
}

/**
 * Main entry point for NPC dialogue resolution.
 * Used by DialogueDirector and NPCDialogueSystem.
 */
export function resolveDialogue(
  dialogueId: string,
  context: {
    questId?: string;
    questPhase?: 'start' | 'progress' | 'complete' | 'prerequisite';
    nodeId?: string;
    flags?: Record<string, boolean>;
    reputation?: Record<string, number>;
  }
): { text: string; choices?: DialogueChoice[] } | null {
  const dialogue = dialogueData.get(dialogueId);
  if (!dialogue) return null;

  // Quest-specific dialogue
  if (context.questId && context.questPhase) {
    const questText = getQuestLine(dialogueId, context.questId, context.questPhase);
    if (questText) return { text: questText };
  }

  // Check entry nodes for condition-based routing
  if (dialogue.entryNodes && context.flags && context.reputation) {
    for (const entry of dialogue.entryNodes) {
      if (entry.conditionFlag && context.flags[entry.conditionFlag]) {
        const node = dialogue.nodes?.[entry.nodeId];
        if (node) return { text: node.text, choices: node.choices };
      }
      if (entry.conditionReputation) {
        const rep = context.reputation[entry.conditionReputation.factionId] ?? 0;
        const { min, max } = entry.conditionReputation;
        if ((min === undefined || rep >= min) && (max === undefined || rep <= max)) {
          const node = dialogue.nodes?.[entry.nodeId];
          if (node) return { text: node.text, choices: node.choices };
        }
      }
    }
  }

  // Specific node request
  if (context.nodeId && dialogue.nodes?.[context.nodeId]) {
    const node = dialogue.nodes[context.nodeId];
    return { text: node.text, choices: node.choices };
  }

  // Default to greeting
  if (dialogue.greeting) return { text: dialogue.greeting };

  return { text: getFallbackText(dialogueId) };
}

// =============================================================================
// CLEANUP
// =============================================================================

export function clearDialogueBridge(): void {
  dialogueData.clear();
  bridgeInitialized = false;
}
