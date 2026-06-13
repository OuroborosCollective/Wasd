import { KAPPA } from '../are/Kappa.js';
import { stableHash32 } from '../determinism/AREDeterminism.js';
import type { NpcLanguageState, PhraseGenome, UtteranceDecision } from './LanguageTypes.js';
import { getAllFactionDialects, getFactionDialect } from './DialectStores.js';
import { exportArchiveState, getAllLexemes, getLexeme } from './LivingDudenArchive.js';
import { getLexemeSuccessRate, getOutcomeHistorySize } from './LanguageOutcomeLearner.js';

const HISTORY_LIMIT = 250;

export interface NpcSpeechTelemetryEvent {
  readonly eventHash: string;
  readonly tick: number;
  readonly sequenceId: number;
  readonly npcId: string;
  readonly factionId: string;
  readonly role: string;
  readonly intent: string;
  readonly truthMode: string;
  readonly speechHash: string;
  readonly constructedText: string;
  readonly phraseGenomeId: string;
  readonly sentenceStructure: readonly string[];
  readonly selectedLexemeIds: readonly string[];
  readonly selectedWords: readonly string[];
  readonly thoughtVector: Readonly<Record<string, number>>;
  readonly reactionLane: string;
  readonly confidence: number;
  readonly needsFallback: boolean;
  readonly termAlerts: readonly string[];
}

const speechHistory: NpcSpeechTelemetryEvent[] = [];

function ratio(value: number): number { return Number.isFinite(value) ? Math.round((value / KAPPA) * 1000) / 1000 : 0; }
function rankLexeme(id: string): number { const lexeme = getLexeme(id); if (!lexeme) return 0; const u = lexeme.usage; const w = lexeme.weighting; return Number(w.baseWeight) + Number(w.contextWeight) + Number(w.successWeight) - Number(w.riskPenalty) + u.totalUses * 10 + u.playerReactionSuccess * 25 - u.playerReactionFailure * 25; }
function reactionLane(npcState: NpcLanguageState, decision: UtteranceDecision): string { if (decision.needsFallback) return 'fallback_recovery'; if (Number(npcState.currentFear) >= 600) return 'fear_response'; if (Number(npcState.currentHunger) >= 600) return 'need_response'; if (Number(npcState.currentTrust) >= 650) return 'trust_response'; if (Number(npcState.currentDuty) >= 650) return 'duty_response'; if (Number(npcState.currentPride) >= 650) return 'pride_response'; return 'neutral_response'; }
function termAlerts(factionId: string, text: string): readonly string[] { const dialect = getFactionDialect(factionId); if (!dialect) return Object.freeze([]); const lower = text.toLowerCase(); return Object.freeze([...new Set(dialect.tabooWords.map((word) => word.toLowerCase()).filter((word) => word.length > 0 && lower.includes(word)))]); }

export function recordNpcSpeechTelemetry(input: { readonly tick: number; readonly sequenceId: number; readonly npcState: NpcLanguageState; readonly decision: UtteranceDecision; readonly phraseGenome: PhraseGenome }): void {
  const selectedWords = input.decision.selectedLexemeIds.map((id) => getLexeme(id)?.lemma ?? id);
  const eventHash = stableHash32(['LANG_SHADOW_V1', input.tick, input.sequenceId, input.decision.speechHash, input.npcState.npcId].join('|')).toString(16);
  speechHistory.push(Object.freeze({ eventHash, tick: input.tick, sequenceId: input.sequenceId, npcId: input.npcState.npcId, factionId: input.npcState.factionId, role: input.npcState.role, intent: input.decision.intent, truthMode: input.decision.truthMode, speechHash: input.decision.speechHash, constructedText: input.decision.constructedText, phraseGenomeId: input.decision.phraseGenomeId, sentenceStructure: Object.freeze([...input.phraseGenome.structure]), selectedLexemeIds: Object.freeze([...input.decision.selectedLexemeIds]), selectedWords: Object.freeze(selectedWords), thoughtVector: Object.freeze({ hunger: ratio(Number(input.npcState.currentHunger)), trust: ratio(Number(input.npcState.currentTrust)), fear: ratio(Number(input.npcState.currentFear)), duty: ratio(Number(input.npcState.currentDuty)), pride: ratio(Number(input.npcState.currentPride)) }), reactionLane: reactionLane(input.npcState, input.decision), confidence: ratio(Number(input.decision.confidence)), needsFallback: input.decision.needsFallback, termAlerts: termAlerts(input.npcState.factionId, input.decision.constructedText) }));
  if (speechHistory.length > HISTORY_LIMIT) speechHistory.shift();
}

export function getLanguageShadowTelemetry(limit = 80) {
  const safeLimit = Math.max(1, Math.min(250, Math.trunc(limit)));
  const wordFactorRankings = getAllLexemes().map((lexeme) => Object.freeze({ id: lexeme.id, lemma: lexeme.lemma, language: lexeme.language, partOfSpeech: lexeme.grammar.partOfSpeech, factor: rankLexeme(lexeme.id), successRate: getLexemeSuccessRate(lexeme.id), totalUses: lexeme.usage.totalUses, npcUses: lexeme.usage.npcUses, failures: lexeme.usage.playerReactionFailure, concepts: lexeme.semantics.concepts, quarantined: lexeme.mutation.quarantined })).sort((a, b) => b.factor - a.factor || a.lemma.localeCompare(b.lemma)).slice(0, 50);
  const termWatch = getAllFactionDialects().map((dialect) => Object.freeze({ factionId: dialect.factionId, tabooTerms: dialect.tabooWords, honorifics: dialect.honorifics }));
  const structureMap = new Map<string, number>();
  for (const event of speechHistory) { const key = event.sentenceStructure.join(' -> '); structureMap.set(key, (structureMap.get(key) ?? 0) + 1); }
  const structureRankings = Array.from(structureMap.entries()).map(([structure, count]) => Object.freeze({ structure, count })).sort((a, b) => b.count - a.count);
  return Object.freeze({ ok: true, archive: exportArchiveState(), speech: Object.freeze(speechHistory.slice(-safeLimit)), wordFactorRankings: Object.freeze(wordFactorRankings), termWatch: Object.freeze(termWatch), structureRankings: Object.freeze(structureRankings), outcomeHistorySize: getOutcomeHistorySize() });
}

export function clearLanguageShadowTelemetry(): void { speechHistory.length = 0; }
