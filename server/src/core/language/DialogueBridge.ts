import type { SpeechIntent, PhraseGenome, LanguageCode, PartOfSpeech, SentencePosition } from './LanguageTypes.js';
import { createKappaInt } from './LanguageTypes.js';
import { registerCanonicalLexeme, type LexemeBlueprint } from './LivingDudenArchive.js';
import { registerPhraseGenome } from './DialogueDecisionKernel.js';
import { seedDefaultDialects } from './DialectStores.js';

const STRUCTURE: readonly SentencePosition[] = Object.freeze(['subject', 'verb', 'object']);

export interface DialogueEntry { id: string; greeting?: string; fallback?: string; questStartLines?: Record<string, string>; questProgressLines?: Record<string, string>; questCompleteLines?: Record<string, string>; questPrerequisiteLines?: Record<string, string>; nodes?: Record<string, DialogueNode>; entryNodes?: readonly EntryNode[] }
export interface DialogueNode { text: string; choices?: readonly DialogueChoice[]; setFlag?: string }
export interface DialogueChoice { id?: string; text: string; nextNodeId: string; changeReputation?: { factionId: string; amount: number } }
export interface EntryNode { nodeId: string; conditionFlag?: string; conditionReputation?: { factionId: string; min?: number; max?: number } }

const dialogueData = new Map<string, DialogueEntry>();
let bridgeInitialized = false;

export function initializeDialogueBridge(dialogues: readonly DialogueEntry[]): void {
  if (bridgeInitialized) return;
  for (const entry of dialogues) if (entry.id.trim()) dialogueData.set(entry.id, normalizeDialogueEntry(entry));
  for (const entry of dialogueData.values()) seedEntry(entry);
  seedDefaultDialects();
  bridgeInitialized = true;
}
export function isDialogueBridgeInitialized(): boolean { return bridgeInitialized; }
export function clearDialogueBridge(): void { dialogueData.clear(); bridgeInitialized = false; }

function normalizeDialogueEntry(entry: DialogueEntry): DialogueEntry {
  const nodes = entry.nodes ? Object.fromEntries(Object.entries(entry.nodes).map(([id, node]) => [id, normalizeNode(entry.id, id, node)])) : undefined;
  return Object.freeze({ ...entry, nodes });
}
function normalizeNode(dialogueId: string, nodeId: string, node: DialogueNode): DialogueNode {
  const choices = node.choices?.map((choice, index) => Object.freeze({ ...choice, id: choice.id ?? `${dialogueId}_${nodeId}_choice_${index}` }));
  return Object.freeze({ ...node, choices: choices ? Object.freeze(choices) : undefined });
}
function seedEntry(entry: DialogueEntry): void {
  if (entry.greeting) registerPhraseGenome(createGenome(`${entry.id}_greet`, 'greet', entry.greeting));
  const sources: ReadonlyArray<[Record<string, string> | undefined, SpeechIntent]> = [[entry.questStartLines, 'request'], [entry.questProgressLines, 'teach'], [entry.questCompleteLines, 'thank'], [entry.questPrerequisiteLines, 'warn']];
  for (const [source, intent] of sources) if (source) for (const [id, text] of Object.entries(source)) registerPhraseGenome(createGenome(`${entry.id}_${id}_${intent}`, intent, text));
  if (entry.nodes) for (const [id, node] of Object.entries(entry.nodes)) registerPhraseGenome(createGenome(`${entry.id}_${id}`, mapTextToIntent(node.text), node.text));
  seedLexeme(entry.id, entry.greeting ?? entry.fallback ?? entry.id);
}
function createGenome(id: string, intent: SpeechIntent, text: string): PhraseGenome {
  const concept = text.includes('?') ? 'question' : 'dialogue';
  return Object.freeze({
    id: id.toLowerCase(), intent, languageMode: detectLanguage(text), structure: STRUCTURE,
    slots: Object.freeze([
      Object.freeze({ role: 'subject' as const, required: true as const, semanticRequirements: [concept] }),
      Object.freeze({ role: 'verb' as const, required: true as const, semanticRequirements: [concept] }),
      Object.freeze({ role: 'object' as const, required: false as const, semanticRequirements: [concept] }),
    ]),
    constraints: Object.freeze({}),
    outcomeStats: Object.freeze({ uses: 0, successfulUses: 0, failedUses: 0, averageKappaScore: createKappaInt(1) }),
    mutation: Object.freeze({ parentGenomeIds: Object.freeze([]), generation: 0, stability: createKappaInt(1), novelty: createKappaInt(0) }),
    truthMode: intent === 'rumor_share' ? 'rumor' : 'known_fact',
  });
}
function seedLexeme(dialogueId: string, text: string): void {
  const lemma = text.split(' ').filter(Boolean)[0]?.toLowerCase() ?? dialogueId;
  const blueprint: LexemeBlueprint = { id: `${dialogueId}_seed_lexeme`, lemma, language: detectLanguage(text), concepts: [text.includes('?') ? 'question' : 'dialogue'], grammar: { partOfSpeech: inferPartOfSpeech(lemma), allowedPositions: ['subject', 'verb', 'object'] }, baseWeight: 1 };
  registerCanonicalLexeme(blueprint);
}
function mapTextToIntent(text: string): SpeechIntent { const lower = text.toLowerCase(); if (lower.includes('?')) return 'request'; if (lower.includes('thank')) return 'thank'; if (lower.includes('warn')) return 'warn'; return 'greet'; }
function detectLanguage(text: string): LanguageCode { const lower = text.toLowerCase(); return lower.includes('hallo') || lower.includes('danke') || lower.includes('hilfe') ? 'de' : 'en'; }
function inferPartOfSpeech(_lemma: string): PartOfSpeech { return 'noun'; }
export function getDialogueEntry(dialogueId: string): DialogueEntry | undefined { return dialogueData.get(dialogueId); }
export function getGreeting(dialogueId: string): string | undefined { return dialogueData.get(dialogueId)?.greeting; }
export function getQuestLine(dialogueId: string, questId: string, lineType: 'start' | 'progress' | 'complete' | 'prerequisite'): string | undefined { const dialogue = dialogueData.get(dialogueId); if (!dialogue) return undefined; const map: Record<typeof lineType, Record<string, string> | undefined> = { start: dialogue.questStartLines, progress: dialogue.questProgressLines, complete: dialogue.questCompleteLines, prerequisite: dialogue.questPrerequisiteLines }; return map[lineType]?.[questId]; }
export function getQuestIds(dialogueId: string): string[] { const dialogue = dialogueData.get(dialogueId); if (!dialogue) return []; const ids = new Set<string>(); for (const source of [dialogue.questStartLines, dialogue.questProgressLines, dialogue.questCompleteLines, dialogue.questPrerequisiteLines]) if (source) for (const id of Object.keys(source)) ids.add(id); return Array.from(ids).sort(); }
export function hasDialogueNodes(dialogueId: string): boolean { const dialogue = dialogueData.get(dialogueId); return Boolean(dialogue?.nodes && Object.keys(dialogue.nodes).length > 0); }
export function getFallbackText(dialogueId: string): string { return dialogueData.get(dialogueId)?.fallback ?? '...'; }
export function resolveDialogue(dialogueId: string, context: { questId?: string; questPhase?: 'start' | 'progress' | 'complete' | 'prerequisite'; nodeId?: string; flags?: Record<string, boolean>; reputation?: Record<string, number> }): { text: string; choices?: readonly DialogueChoice[] } | null { const dialogue = dialogueData.get(dialogueId); if (!dialogue) return null; if (context.questId && context.questPhase) { const line = getQuestLine(dialogueId, context.questId, context.questPhase); if (line) return { text: line }; } const node = dialogue.nodes?.[context.nodeId ?? resolveEntryNode(dialogue, context) ?? 'root']; if (node) return { text: node.text, choices: node.choices }; return { text: dialogue.greeting ?? getFallbackText(dialogueId) }; }
function resolveEntryNode(dialogue: DialogueEntry, context: { flags?: Record<string, boolean>; reputation?: Record<string, number> }): string | undefined { if (!dialogue.entryNodes) return undefined; for (const entry of dialogue.entryNodes) { if (entry.conditionFlag && context.flags?.[entry.conditionFlag]) return entry.nodeId; const condition = entry.conditionReputation; if (!condition) continue; const value = context.reputation?.[condition.factionId] ?? 0; if (condition.min !== undefined && value < condition.min) continue; if (condition.max !== undefined && value > condition.max) continue; return entry.nodeId; } return undefined; }
