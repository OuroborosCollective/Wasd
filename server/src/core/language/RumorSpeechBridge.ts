/**
 * @file server/src/core/language/RumorSpeechBridge.ts
 * @description RumorSpeechBridge - Maps player communication patterns to NPC meaning.
 *
 * Converts player utterances into NPC-understandable meaning representations.
 * Spreads rumors with truth mode marking. Detects player lies through outcome divergence.
 *
 * HARD CONSTRAINTS:
 * - NO Date.now(), new Date(), Math.random(), crypto.randomUUID()
 * - All processing derives from stable hashes
 */

import { stableHash32 } from '../determinism/AREDeterminism.js';
import type {
  SpeechIntent,
  SpeechTruthMode,
  KappaInt,
} from './LanguageTypes.js';
import { createKappaInt } from './LanguageTypes.js';
import type { PlayerUtteranceMeaning } from './DialogueSafetyQuarantine.js';
import { processUserUtterance } from './DialogueSafetyQuarantine.js';

const BRIDGE_TAG = 'RUMOR_SPEECH_BRIDGE_V1';

// =============================================================================
// RUMOR CONTENT STORAGE (semantic only)
// =============================================================================

interface RumorContent {
  readonly rumorId: string;
  readonly tick: number;
  readonly originNpcId: string;
  readonly concepts: readonly string[];
  readonly emotionalTone: string; // hashed
  readonly truthMode: SpeechTruthMode;
  readonly spreadCount: number;
  readonly verificationCount: number;
  readonly believedCount: number;
}

const activeRumors: Map<string, RumorContent> = new Map();
const rumorSpreadHistory: Map<string, readonly string[]> = new Map(); // npcId -> rumorIds

// =============================================================================
// LIE DETECTION THRESHOLDS
// =============================================================================

interface LieDetectionThresholds {
  readonly minDivergenceForLie: number; // KAPPA scale
  readonly minOccurrencesForLie: number;
  readonly trustPenaltyPerLie: number;
}

const LIE_DETECTION: LieDetectionThresholds = Object.freeze({
  minDivergenceForLie: createKappaInt(0.3), // 30% outcome divergence
  minOccurrencesForLie: 3, // Need 3+ lies to penalize
  trustPenaltyPerLie: createKappaInt(0.1), // 10% trust penalty
});

// =============================================================================
// RUMOR BRIDGE OPERATIONS
// =============================================================================

export interface BridgeResult {
  readonly eventId: string;
  readonly playerMeaning: PlayerUtteranceMeaning;
  readonly mappedIntent: SpeechIntent;
  readonly truthMode: SpeechTruthMode;
  readonly npcUnderstanding: string; // hashed representation
  readonly createdRumorId?: string;
  readonly detectedLie?: boolean;
  readonly lieConfidence?: KappaInt;
}

/**
 * Process player utterance and bridge to NPC understanding.
 */
export function bridgePlayerSpeech(
  playerId: string,
  rawText: string,
  tick: number,
  npcId: string
): BridgeResult {
  // Step 1: Quarantine and extract meaning
  const playerMeaning = processUserUtterance(playerId, rawText, tick);

  // Step 2: Map to NPC intent
  const mappedIntent = mapToNpcIntent(playerMeaning);

  // Step 3: Determine truth mode
  const truthMode = determineTruthMode(playerMeaning, mappedIntent);

  // Step 4: Create NPC understanding representation (hashed)
  const npcUnderstanding = hashUnderstanding(playerMeaning, mappedIntent);

  // Step 5: Handle rumor creation/spreading
  let createdRumorId: string | undefined;
  if (mappedIntent === 'rumor_share' && playerMeaning.concepts.length > 0) {
    createdRumorId = createRumor(playerMeaning, npcId, tick);
  }

  // Step 6: Detect lies (if NPC has prior knowledge)
  const { detectedLie, lieConfidence } = detectLie(playerMeaning, npcId);

  const eventId = stableHash32(`${BRIDGE_TAG}:${playerId}:${npcId}:${tick}`).toString(16);

  return Object.freeze({
    eventId,
    playerMeaning,
    mappedIntent,
    truthMode,
    npcUnderstanding,
    createdRumorId,
    detectedLie,
    lieConfidence,
  });
}

/**
 * Map player utterance meaning to NPC intent.
 */
function mapToNpcIntent(meaning: PlayerUtteranceMeaning): SpeechIntent {
  // Direct intent mapping
  if (meaning.intent) {
    return meaning.intent;
  }

  // Fallback based on concepts
  const concepts = meaning.concepts;

  if (concepts.includes('quest')) {
    return 'request';
  }

  if (concepts.includes('combat')) {
    return meaning.emotionalTone.anger > createKappaInt(0.5) ? 'threaten' : 'teach';
  }

  if (concepts.includes('wealth')) {
    return 'trade';
  }

  if (concepts.includes('food')) {
    return 'request';
  }

  if (concepts.includes('safety')) {
    return meaning.emotionalTone.fear > createKappaInt(0.5) ? 'warn' : 'comfort';
  }

  // Default fallback
  return 'greet';
}

/**
 * Determine truth mode for utterance.
 */
function determineTruthMode(
  meaning: PlayerUtteranceMeaning,
  intent: SpeechIntent
): SpeechTruthMode {
  // Explicit information sharing
  if (intent === 'teach' || intent === 'rumor_share') {
    // Player sharing information - mark as rumor until verified
    return 'rumor';
  }

  // Emotional expressions
  if (meaning.condition.isEmotional) {
    if (meaning.emotionalTone.anger > createKappaInt(0.7)) {
      return 'belief'; // Angry statements are beliefs
    }
    if (meaning.emotionalTone.fear > createKappaInt(0.7)) {
      return 'belief'; // Fear statements are beliefs
    }
  }

  // Help requests are personal needs
  if (intent === 'request' && meaning.condition.isHelpRequest) {
    return 'personal_memory'; // Player expressing their own need
  }

  // Trade offers are factual
  if (intent === 'trade' && meaning.condition.isTradeOffer) {
    return 'known_fact'; // Trade intent is verifiable
  }

  // Default to rumor for unclassified
  return 'rumor';
}

/**
 * Hash player meaning for NPC understanding (privacy).
 */
function hashUnderstanding(meaning: PlayerUtteranceMeaning, intent: SpeechIntent): string {
  const parts = [
    intent,
    meaning.concepts.sort().join('|'),
    Number(meaning.emotionalTone.fear),
    Number(meaning.emotionalTone.anger),
    meaning.condition.isHelpRequest ? 1 : 0,
    meaning.condition.isThreat ? 1 : 0,
  ];

  return stableHash32(parts.join(':')).toString(16);
}

// =============================================================================
// RUMOR OPERATIONS
// =============================================================================

/**
 * Create a new rumor from player speech.
 */
function createRumor(
  meaning: PlayerUtteranceMeaning,
  originNpcId: string,
  tick: number
): string {
  const rumorId = stableHash32(`${BRIDGE_TAG}:rumor:${originNpcId}:${tick}:${meaning.eventId}`).toString(16);

  const rumor: RumorContent = Object.freeze({
    rumorId,
    tick,
    originNpcId,
    concepts: meaning.concepts,
    emotionalTone: stableHash32(`${meaning.emotionalTone.fear}:${meaning.emotionalTone.anger}`).toString(16),
    truthMode: 'rumor',
    spreadCount: 0,
    verificationCount: 0,
    believedCount: 0,
  });

  activeRumors.set(rumorId, rumor);

  // Update spread history
  const history = rumorSpreadHistory.get(originNpcId) ?? [];
  rumorSpreadHistory.set(originNpcId, [...history, rumorId].slice(-50));

  return rumorId;
}

/**
 * Get active rumor by ID.
 */
export function getRumor(rumorId: string): RumorContent | undefined {
  return activeRumors.get(rumorId);
}

/**
 * Get rumors for NPC.
 */
export function getRumorsForNpc(npcId: string): readonly RumorContent[] {
  const rumorIds = rumorSpreadHistory.get(npcId) ?? [];
  return rumorIds.map((id) => activeRumors.get(id)).filter(Boolean) as RumorContent[];
}

/**
 * Spread rumor to another NPC.
 */
export function spreadRumor(
  rumorId: string,
  fromNpcId: string,
  toNpcId: string,
  tick: number
): boolean {
  const rumor = activeRumors.get(rumorId);
  if (!rumor) return false;

  // Update spread count
  const updatedRumor: RumorContent = Object.freeze({
    ...rumor,
    spreadCount: rumor.spreadCount + 1,
  });
  activeRumors.set(rumorId, updatedRumor);

  // Update spread history for target NPC
  const history = rumorSpreadHistory.get(toNpcId) ?? [];
  rumorSpreadHistory.set(toNpcId, [...history, rumorId].slice(-50));

  return true;
}

/**
 * Verify rumor (increase verification count).
 */
export function verifyRumor(rumorId: string): boolean {
  const rumor = activeRumors.get(rumorId);
  if (!rumor) return false;

  const updatedRumor: RumorContent = Object.freeze({
    ...rumor,
    verificationCount: rumor.verificationCount + 1,
  });
  activeRumors.set(rumorId, updatedRumor);

  return true;
}

/**
 * Believe rumor (increase believed count).
 */
export function believeRumor(rumorId: string): boolean {
  const rumor = activeRumors.get(rumorId);
  if (!rumor) return false;

  const updatedRumor: RumorContent = Object.freeze({
    ...rumor,
    believedCount: rumor.believedCount + 1,
  });
  activeRumors.set(rumorId, updatedRumor);

  return true;
}

/**
 * Get rumor statistics.
 */
export function getRumorStats(): {
  totalRumors: number;
  averageSpread: number;
  averageBeliefRate: number;
} {
  if (activeRumors.size === 0) {
    return Object.freeze({
      totalRumors: 0,
      averageSpread: 0,
      averageBeliefRate: 0,
    });
  }

  let totalSpread = 0;
  let totalBeliefRate = 0;

  for (const rumor of activeRumors.values()) {
    totalSpread += rumor.spreadCount;
    const beliefRate = rumor.verificationCount > 0
      ? rumor.believedCount / rumor.verificationCount
      : 0;
    totalBeliefRate += beliefRate;
  }

  const count = activeRumors.size;

  return Object.freeze({
    totalRumors: count,
    averageSpread: totalSpread / count,
    averageBeliefRate: totalBeliefRate / count,
  });
}

// =============================================================================
// LIE DETECTION
// =============================================================================

interface PlayerLieRecord {
  readonly playerId: string;
  readonly totalUtterances: number;
  readonly lieCount: number;
  readonly lastUtteranceTick: number;
}

const playerLieRecords: Map<string, PlayerLieRecord> = new Map();

/**
 * Detect if player might be lying.
 * Uses outcome divergence tracking.
 */
function detectLie(
  meaning: PlayerUtteranceMeaning,
  npcId: string
): { detectedLie: boolean; lieConfidence: KappaInt } {
  const recordKey = `${meaning.playerId}:${npcId}`;
  const existing = playerLieRecords.get(recordKey);

  // Count suspicious patterns
  let suspiciousCount = 0;

  // High desperation + positive statements = suspicious
  if (
    meaning.emotionalTone.desperation > createKappaInt(0.7) &&
    meaning.emotionalTone.trust < createKappaInt(0.3)
  ) {
    suspiciousCount++;
  }

  // Quarantined terms + trust signals = suspicious
  if (meaning.rawQuarantined && Number(meaning.emotionalTone.trust) > 0.5) {
    suspiciousCount++;
  }

  // Update record
  const updatedRecord: PlayerLieRecord = Object.freeze({
    playerId: meaning.playerId,
    totalUtterances: (existing?.totalUtterances ?? 0) + 1,
    lieCount: (existing?.lieCount ?? 0) + (suspiciousCount > 0 ? 1 : 0),
    lastUtteranceTick: meaning.tick,
  });

  playerLieRecords.set(recordKey, updatedRecord);

  // Determine if lie detected
  const lieCount = updatedRecord.lieCount;
  const totalUtterances = updatedRecord.totalUtterances;

  // Need minimum occurrences for confidence
  if (totalUtterances < LIE_DETECTION.minOccurrencesForLie) {
    return { detectedLie: false, lieConfidence: createKappaInt(0) };
  }

  // Calculate lie ratio
  const lieRatio = lieCount / totalUtterances;

  // Detect lie if ratio exceeds threshold
  if (lieRatio >= 0.5 && lieCount >= 3) {
    return {
      detectedLie: true,
      lieConfidence: createKappaInt(Math.min(1.0, lieRatio)),
    };
  }

  return { detectedLie: false, lieConfidence: createKappaInt(lieRatio) };
}

/**
 * Get player's lie record for NPC.
 */
export function getPlayerLieRecord(
  playerId: string,
  npcId: string
): PlayerLieRecord | undefined {
  return playerLieRecords.get(`${playerId}:${npcId}`);
}

/**
 * Clear lie records (for testing).
 */
export function clearLieRecords(): void {
  playerLieRecords.clear();
}

/**
 * Clear all rumors (for testing).
 */
export function clearAllRumors(): void {
  activeRumors.clear();
  rumorSpreadHistory.clear();
}