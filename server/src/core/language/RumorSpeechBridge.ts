import { stableHash32 } from '../determinism/AREDeterminism.js';
import type { SpeechIntent, SpeechTruthMode, KappaInt } from './LanguageTypes.js';
import { createKappaInt } from './LanguageTypes.js';
import type { PlayerUtteranceMeaning } from './DialogueSafetyQuarantine.js';
import { processUserUtterance } from './DialogueSafetyQuarantine.js';

const BRIDGE_TAG = 'RUMOR_SPEECH_BRIDGE_V1';

interface RumorContent { readonly rumorId: string; readonly tick: number; readonly originNpcId: string; readonly concepts: readonly string[]; readonly emotionalTone: string; readonly truthMode: SpeechTruthMode; readonly spreadCount: number; readonly verificationCount: number; readonly believedCount: number }
const activeRumors: Map<string, RumorContent> = new Map();
const rumorSpreadHistory: Map<string, readonly string[]> = new Map();

interface LieDetectionThresholds { readonly minDivergenceForLie: number; readonly minOccurrencesForLie: number; readonly trustPenaltyPerLie: number }
const LIE_DETECTION: LieDetectionThresholds = Object.freeze({ minDivergenceForLie: createKappaInt(0.3), minOccurrencesForLie: 3, trustPenaltyPerLie: createKappaInt(0.1) });

export interface BridgeResult { readonly eventId: string; readonly playerMeaning: PlayerUtteranceMeaning; readonly mappedIntent: SpeechIntent; readonly truthMode: SpeechTruthMode; readonly npcUnderstanding: string; readonly createdRumorId?: string; readonly detectedLie?: boolean; readonly lieConfidence?: KappaInt }

export function bridgePlayerSpeech(playerId: string, rawText: string, tick: number, npcId: string): BridgeResult {
  const playerMeaning = processUserUtterance(playerId, rawText, tick);
  const mappedIntent = mapToNpcIntent(playerMeaning);
  const truthMode = determineTruthMode(playerMeaning, mappedIntent);
  const npcUnderstanding = hashUnderstanding(playerMeaning, mappedIntent);
  let createdRumorId: string | undefined;
  if (mappedIntent === 'rumor_share' && playerMeaning.concepts.length > 0) createdRumorId = createRumor(playerMeaning, npcId, tick);
  const { detectedLie, lieConfidence } = detectLie(playerMeaning, npcId);
  const eventId = stableHash32(`${BRIDGE_TAG}:${playerId}:${npcId}:${tick}`).toString(16);
  return Object.freeze({ eventId, playerMeaning, mappedIntent, truthMode, npcUnderstanding, createdRumorId, detectedLie, lieConfidence });
}

function mapToNpcIntent(meaning: PlayerUtteranceMeaning): SpeechIntent {
  if (meaning.intent) return meaning.intent;
  const concepts = meaning.concepts;
  if (concepts.includes('quest')) return 'request';
  if (concepts.includes('combat')) return meaning.emotionalTone.anger > createKappaInt(0.5) ? 'threaten' : 'teach';
  if (concepts.includes('wealth')) return 'trade';
  if (concepts.includes('food')) return 'request';
  if (concepts.includes('safety')) return meaning.emotionalTone.fear > createKappaInt(0.5) ? 'warn' : 'comfort';
  return 'greet';
}

function determineTruthMode(meaning: PlayerUtteranceMeaning, intent: SpeechIntent): SpeechTruthMode {
  if (intent === 'teach' || intent === 'rumor_share') return 'rumor';
  if (meaning.condition.isEmotional) {
    if (meaning.emotionalTone.anger > createKappaInt(0.7)) return 'belief';
    if (meaning.emotionalTone.fear > createKappaInt(0.7)) return 'belief';
  }
  if (intent === 'request' && meaning.condition.isHelpRequest) return 'personal_memory';
  if (intent === 'trade' && meaning.condition.isTradeOffer) return 'known_fact';
  return 'rumor';
}

function hashUnderstanding(meaning: PlayerUtteranceMeaning, intent: SpeechIntent): string {
  const parts = [intent, [...meaning.concepts].sort().join('|'), Number(meaning.emotionalTone.fear), Number(meaning.emotionalTone.anger), meaning.condition.isHelpRequest ? 1 : 0, meaning.condition.isThreat ? 1 : 0];
  return stableHash32(parts.join(':')).toString(16);
}

function createRumor(meaning: PlayerUtteranceMeaning, originNpcId: string, tick: number): string {
  const rumorId = stableHash32(`${BRIDGE_TAG}:rumor:${originNpcId}:${tick}:${meaning.eventId}`).toString(16);
  const rumor: RumorContent = Object.freeze({ rumorId, tick, originNpcId, concepts: meaning.concepts, emotionalTone: stableHash32(`${meaning.emotionalTone.fear}:${meaning.emotionalTone.anger}`).toString(16), truthMode: 'rumor', spreadCount: 0, verificationCount: 0, believedCount: 0 });
  activeRumors.set(rumorId, rumor);
  const history = rumorSpreadHistory.get(originNpcId) ?? [];
  rumorSpreadHistory.set(originNpcId, [...history, rumorId].slice(-50));
  return rumorId;
}

export function getRumor(rumorId: string): RumorContent | undefined { return activeRumors.get(rumorId); }
export function getRumorsForNpc(npcId: string): readonly RumorContent[] { const rumorIds = rumorSpreadHistory.get(npcId) ?? []; return rumorIds.map((id) => activeRumors.get(id)).filter((rumor): rumor is RumorContent => Boolean(rumor)); }
export function spreadRumor(rumorId: string, _fromNpcId: string, toNpcId: string, _tick: number): boolean { const rumor = activeRumors.get(rumorId); if (!rumor) return false; activeRumors.set(rumorId, Object.freeze({ ...rumor, spreadCount: rumor.spreadCount + 1 })); const history = rumorSpreadHistory.get(toNpcId) ?? []; rumorSpreadHistory.set(toNpcId, [...history, rumorId].slice(-50)); return true; }
export function verifyRumor(rumorId: string): boolean { const rumor = activeRumors.get(rumorId); if (!rumor) return false; activeRumors.set(rumorId, Object.freeze({ ...rumor, verificationCount: rumor.verificationCount + 1 })); return true; }
export function believeRumor(rumorId: string): boolean { const rumor = activeRumors.get(rumorId); if (!rumor) return false; activeRumors.set(rumorId, Object.freeze({ ...rumor, believedCount: rumor.believedCount + 1 })); return true; }
export function getRumorStats(): { totalRumors: number; averageSpread: number; averageBeliefRate: number } { if (activeRumors.size === 0) return Object.freeze({ totalRumors: 0, averageSpread: 0, averageBeliefRate: 0 }); let totalSpread = 0; let totalBeliefRate = 0; for (const rumor of activeRumors.values()) { totalSpread += rumor.spreadCount; totalBeliefRate += rumor.verificationCount > 0 ? rumor.believedCount / rumor.verificationCount : 0; } return Object.freeze({ totalRumors: activeRumors.size, averageSpread: totalSpread / activeRumors.size, averageBeliefRate: totalBeliefRate / activeRumors.size }); }

interface LieRecord { readonly occurrences: number; readonly confidence: KappaInt }
const lieRecords: Map<string, LieRecord> = new Map();
function detectLie(_meaning: PlayerUtteranceMeaning, npcId: string): { readonly detectedLie: boolean; readonly lieConfidence: KappaInt } { const record = lieRecords.get(npcId); const confidence = record?.confidence ?? createKappaInt(0); return Object.freeze({ detectedLie: Boolean(record && record.occurrences >= LIE_DETECTION.minOccurrencesForLie), lieConfidence: confidence }); }
export function getPlayerLieRecord(playerId: string): LieRecord | undefined { return lieRecords.get(playerId); }
export function clearLieRecords(): void { lieRecords.clear(); }
export function clearAllRumors(): void { activeRumors.clear(); rumorSpreadHistory.clear(); }
