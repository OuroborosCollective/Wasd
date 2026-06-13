/**
 * @file server/src/core/language/DialogueBridge.ts
 * @description Bridge between the Living Language System and existing dialogues.json.
 *
 * Static dialogue remains legacy/content fallback. It is never promoted to ARE
 * truth by itself; it only seeds lexemes/phrase genomes and resolves explicit
 * quest/node text for compatibility.
 *
 * HARD CONSTRAINTS:
 * - NO Date.now(), new Date(), Math.random(), crypto.randomUUID()
 * - All lookups derive from deterministic maps and stable hashes
 */

import type { SpeechIntent, PhraseGenome, LanguageCode, PartOfSpeech } from './LanguageTypes.js';
import { createKappaInt } from './LanguageTypes.js';
import { registerCanonicalLexeme, type LexemeBlueprint } from './LivingDudenArchive.js';
import { registerPhraseGenome } from './DialogueDecisionKernel.js';
import { seedDefaultDialects } from './DialectStores.js';

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
  id?: string;
  text: string;
  nextNodeId: string;
  changeReputation?: { factionId: string; amount: number };
}

export interface EntryNode {
  nodeId: string;
  conditionFlag?: string;
  conditionReputation?: { factionId: string; min?: number; max?: number };
}

const dialogueData: Map<string, DialogueEntry> = new Map();
let bridgeInitialized = false;

export function initializeDialogueBridge(dialogues: readonly DialogueEntry[]): void {
  if (bridgeInitialized) return;
  for (const entry of dialogues) {
    if (entry && typeof entry.id === 'string' && entry.id.trim().length > 0) dialogueData.set(entry.id, normalizeDialogueEntry(entry));
  }
  const entries = Array.from(dialogueData.values());
  seedPhraseGenomesFromDialogues(entries);
  seedLexemesFromDialogues(entries);
  seedDefaultDialects();
  bridgeInitialized = true;
}

export function isDialogueBridgeInitialized(): boolean { return bridgeInitialized; }
export function clearDialogueBridge(): void { dialogueData.clear(); bridgeInitialized = false; }

function normalizeDialogueEntry(entry: DialogueEntry): DialogueEntry {
  const normalizedNodes = entry.nodes
    ? Object.fromEntries(Object.entries(entry.nodes).map(([nodeId, node]) => [nodeId, normalizeNode(entry.id, nodeId, node)]))
    : undefined;
  return Object.freeze({ ...entry, nodes: normalizedNodes });
}

function normalizeNode(dialogueId: string, nodeId: string, node: DialogueNode): DialogueNode {
  const choices = node.choices?.map((choice, index) => ({ ...choice, id: choice.id ?? `${dialogueId}_${nodeId}_choice_${index}` }));
  return Object.freeze({ ...node, choices: choices ? Object.freeze(choices) : undefined });
}

function seedPhraseGenomesFromDialogues(dialogues: readonly DialogueEntry[]): void {
  for (const dialogue of dialogues) {
    const npcId = dialogue.id.replace(/^dialogue_/, 'npc_');
    if (dialogue.greeting) registerPhraseGenome(createDialogueGenome({ id: `${npcId}_greet`, intent: 'greet', text: dialogue.greeting, role: extractRoleFromDialogue(dialogue) }));

    const lineTypes: readonly Array<[keyof Pick<DialogueEntry, 'questStartLines' | 'questProgressLines' | 'questCompleteLines' | 'questPrerequisiteLines'>, SpeechIntent]> = [
      ['questStartLines', 'request'],
      ['questProgressLines', 'teach'],
      ['questCompleteLines', 'thank'],
      ['questPrerequisiteLines', 'warn'],
    ];

    for (const [lineKey, intent] of lineTypes) {
      const lines = dialogue[lineKey];
      if (!lines) continue;
      for (const [questId, text] of Object.entries(lines)) registerPhraseGenome(createDialogueGenome({ id: `${npcId}_${questId}_${intent}`, intent, text, role: extractRoleFromDialogue(dialogue) }));
    }

    if (dialogue.nodes) {
      for (const [nodeId, node] of Object.entries(dialogue.nodes)) {
        const intent = mapDialogueNodeToIntent(node.text);
        registerPhraseGenome(createDialogueGenome({ id: `${npcId}_${nodeId}_${intent}`, intent, text: node.text, role: extractRoleFromDialogue(dialogue) }));
      }
    }
  }
}

function createDialogueGenome(input: { id: string; intent: SpeechIntent; text: string; role?: string }): PhraseGenome {
  const concepts = extractConceptsFromText(input.text);
  return Object.freeze({
    id: input.id.toLowerCase(),
    intent: input.intent,
    languageMode: detectLanguage(input.text),
    structure: Object.freeze(['subject', 'verb', 'object']),
    slots: Object.freeze([
      Object.freeze({ role: 'subject', required: true, semanticRequirements: concepts.length ? concepts : ['greeting'] }),
      Object.freeze({ role: 'verb', required: true, semanticRequirements: concepts.length ? concepts : ['greeting'] }),
      Object.freeze({ role: 'object', required: false, semanticRequirements: concepts }),
    ]),
    constraints: Object.freeze(input.role ? { requiredRole: input.role } : {}),
    outcomeStats: Object.freeze({ uses: 0, successfulUses: 0, failedUses: 0, averageKappaScore: createKappaInt(1) }),
    mutation: Object.freeze({ parentGenomeIds: Object.freeze([]), generation: 0, stability: createKappaInt(1), novelty: createKappaInt(0) }),
    truthMode: input.intent === 'rumor_share' ? 'rumor' : 'known_fact',
  });
}

function seedLexemesFromDialogues(dialogues: readonly DialogueEntry[]): void {
  const seenLemmas = new Set<string>();
  for (const dialogue of dialogues) {
    if (dialogue.greeting) extractLexemesFromText(dialogue.greeting, dialogue.id, seenLemmas);
    const lineTypes = ['questStartLines', 'questProgressLines', 'questCompleteLines', 'questPrerequisiteLines'] as const;
    for (const lineType of lineTypes) {
      const lines = dialogue[lineType];
      if (!lines) continue;
      for (const text of Object.values(lines)) extractLexemesFromText(text, dialogue.id, seenLemmas);
    }
    if (dialogue.nodes) for (const node of Object.values(dialogue.nodes)) extractLexemesFromText(node.text, dialogue.id, seenLemmas);
  }
}

function extractLexemesFromText(text: string, dialogueId: string, seenLemmas: Set<string>): void {
  const conceptWords: Record<string, readonly string[]> = {
    greeting: ['greetings', 'hello', 'hallo', 'willkommen', 'welcome'],
    farewell: ['farewell', 'goodbye', 'leave'],
    quest: ['quest', 'task', 'arbeit', 'auftrag'],
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
      const lemma = word.toLowerCase();
      if (!textLower.includes(lemma) || seenLemmas.has(lemma)) continue;
      seenLemmas.add(lemma);
      const lexeme: LexemeBlueprint = {
        id: `dialogue_${dialogueId}_${concept}_${lemma}`.replace(/[^a-z0-9_äöüß-]/gi, '_'),
        lemma,
        language: detectLanguage(lemma),
        concepts: [concept],
        invented: false,
        baseWeight: 1,
        grammar: { partOfSpeech: inferPartOfSpeech(lemma), allowedPositions: ['subject', 'verb', 'object'] },
      };
      registerCanonicalLexeme(lexeme);
    }
  }
}

function mapDialogueNodeToIntent(text: string): SpeechIntent {
  const textLower = text.toLowerCase();
  if (textLower.includes('?') && (textLower.includes('can you') || textLower.includes('would you'))) return 'request';
  if (textLower.includes('thank') || textLower.includes('danke')) return 'thank';
  if (textLower.includes('beware') || textLower.includes('warn') || textLower.includes('vorsicht')) return 'warn';
  if (textLower.includes('join') || textLower.includes('recruit')) return 'recruit';
  if (textLower.includes('rumor') || textLower.includes('heard')) return 'rumor_share';
  if (textLower.includes('trade') || textLower.includes('buy') || textLower.includes('sell')) return 'trade';
  return 'greet';
}

function extractConceptsFromText(text: string): string[] {
  const concepts: string[] = [];
  const conceptPatterns: Record<string, readonly RegExp[]> = {
    quest: [/quest/i, /task/i, /arbeit/i, /auftrag/i, /help/i],
    village: [/village/i, /dorf/i, /town/i, /stadt/i, /millbrook/i],
    danger: [/danger/i, /gefahr/i, /warnung/i, /beware/i],
    trade: [/trade/i, /handel/i, /buy/i, /sell/i],
    iron: [/iron/i, /eisen/i, /scrap/i, /schrott/i],
    wolf: [/wolf/i, /dire/i, /hunt/i],
    help: [/help/i, /helfen/i, /aid/i],
    greeting: [/greet/i, /hello/i, /hallo/i, /welcome/i, /willkommen/i],
  };
  for (const [concept, patterns] of Object.entries(conceptPatterns)) if (patterns.some((pattern) => pattern.test(text))) concepts.push(concept);
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

function detectLanguage(text: string): LanguageCode {
  return /[äöüß]|\b(der|die|das|und|nicht|danke|hallo|hilfe)\b/i.test(text) ? 'de' : 'en';
}

function inferPartOfSpeech(lemma: string): PartOfSpeech {
  if (['help', 'helfen', 'trade', 'hunt', 'jagd', 'watch'].includes(lemma)) return 'verb';
  if (['hello', 'hallo', 'greetings', 'welcome', 'willkommen'].includes(lemma)) return 'greeting';
  return 'noun';
}

export function getDialogueEntry(dialogueId: string): DialogueEntry | undefined { return dialogueData.get(dialogueId); }
export function getGreeting(dialogueId: string): string | undefined { return dialogueData.get(dialogueId)?.greeting; }

export function getQuestLine(dialogueId: string, questId: string, lineType: 'start' | 'progress' | 'complete' | 'prerequisite'): string | undefined {
  const dialogue = dialogueData.get(dialogueId);
  if (!dialogue) return undefined;
  const lineMap: Record<'start' | 'progress' | 'complete' | 'prerequisite', Record<string, string> | undefined> = {
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
  for (const source of [dialogue.questStartLines, dialogue.questProgressLines, dialogue.questCompleteLines, dialogue.questPrerequisiteLines]) if (source) for (const id of Object.keys(source)) ids.add(id);
  return Array.from(ids).sort();
}

export function hasDialogueNodes(dialogueId: string): boolean {
  const dialogue = dialogueData.get(dialogueId);
  return Boolean(dialogue?.nodes && Object.keys(dialogue.nodes).length > 0);
}

export function getFallbackText(dialogueId: string): string {
  const dialogue = dialogueData.get(dialogueId);
  if (dialogue?.fallback) return dialogue.fallback;
  const defaults: Record<string, string> = { dialogue_wolf: 'Grrrrr...', dialogue_dummy: '...' };
  return defaults[dialogueId] ?? '...';
}

export function resolveDialogue(dialogueId: string, context: { questId?: string; questPhase?: 'start' | 'progress' | 'complete' | 'prerequisite'; nodeId?: string; flags?: Record<string, boolean>; reputation?: Record<string, number> }): { text: string; choices?: DialogueChoice[] } | null {
  const dialogue = dialogueData.get(dialogueId);
  if (!dialogue) return null;
  if (context.questId && context.questPhase) {
    const questText = getQuestLine(dialogueId, context.questId, context.questPhase);
    if (questText) return { text: questText };
  }
  const nodeId = context.nodeId ?? resolveEntryNode(dialogue, context) ?? 'root';
  const node = dialogue.nodes?.[nodeId];
  if (node) return { text: node.text, choices: node.choices };
  if (dialogue.greeting) return { text: dialogue.greeting };
  return { text: getFallbackText(dialogueId) };
}

function resolveEntryNode(dialogue: DialogueEntry, context: { flags?: Record<string, boolean>; reputation?: Record<string, number> }): string | undefined {
  if (!dialogue.entryNodes) return undefined;
  for (const entryNode of dialogue.entryNodes) {
    if (entryNode.conditionFlag && context.flags?.[entryNode.conditionFlag]) return entryNode.nodeId;
    const condition = entryNode.conditionReputation;
    if (condition) {
      const value = context.reputation?.[condition.factionId] ?? 0;
      if (condition.min !== undefined && value < condition.min) continue;
      if (condition.max !== undefined && value > condition.max) continue;
      return entryNode.nodeId;
    }
  }
  return undefined;
}
