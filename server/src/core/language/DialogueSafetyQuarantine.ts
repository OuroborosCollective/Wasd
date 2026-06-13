/**
 * @file server/src/core/language/DialogueSafetyQuarantine.ts
 * @description DialogueSafetyQuarantine - Player communication safety layer.
 *
 * All player→NPC communication passes through quarantine.
 * Extracts: intent, emotionalTone, condition, concepts — NEVER raw text.
 *
 * HARD CONSTRAINTS:
 * - NO Date.now(), new Date(), Math.random(), crypto.randomUUID()
 * - All processing derives from stable hashes
 * - Wall-clock time only in explicitly marked side-channel telemetry
 */

import { stableHash32 } from '../determinism/AREDeterminism.js';
import type { SpeechIntent, KappaInt } from './LanguageTypes.js';
import { createKappaInt } from './LanguageTypes.js';

const QUARANTINE_TAG = 'DIALOGUE_SAFETY_QUARANTINE_V1';

// =============================================================================
// QUARANTINE PATTERNS
// =============================================================================

interface QuarantinePattern {
  pattern: RegExp;
  type: 'name' | 'location' | 'contact' | 'exploit' | 'slur';
  severity: 'high' | 'medium' | 'low';
}

const QUARANTINE_PATTERNS: readonly QuarantinePattern[] = Object.freeze([
  // Real names (potential doxxing)
  { pattern: /\b[A-Z][a-z]+ [A-Z][a-z]+\b/g, type: 'name', severity: 'high' },
  { pattern: /\b\d{1,5}\s+\w+\s+(street|avenue|road|blvd|dr|lane)\b/gi, type: 'location', severity: 'high' },
  { pattern: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, type: 'contact', severity: 'high' },
  { pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, type: 'contact', severity: 'high' },
  // IP addresses
  { pattern: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, type: 'contact', severity: 'high' },
  // URL patterns
  { pattern: /https?:\/\/[^\s]+/gi, type: 'contact', severity: 'high' },
  // Game exploit attempts
  { pattern: /(?:drop|give|spawn|admin|console|exec|eval)\s+(?:me|all)\b/gi, type: 'exploit', severity: 'high' },
  { pattern: /\$\{.*\}/g, type: 'exploit', severity: 'high' },
  { pattern: /\{\{.*\}\}/g, type: 'exploit', severity: 'medium' },
]);

// =============================================================================
// EXTRACTED MEANING (safe representation)
// =============================================================================

export interface PlayerUtteranceMeaning {
  readonly eventId: string;
  readonly tick: number;
  readonly playerId: string;
  readonly intent: SpeechIntent | null;
  readonly emotionalTone: {
    readonly fear: KappaInt;
    readonly anger: KappaInt;
    readonly trust: KappaInt;
    readonly desperation: KappaInt;
  };
  readonly concepts: readonly string[];
  readonly condition: {
    readonly isHelpRequest: boolean;
    readonly isThreat: boolean;
    readonly isTradeOffer: boolean;
    readonly isInformation: boolean;
    readonly isEmotional: boolean;
  };
  readonly rawQuarantined: boolean;
  readonly quarantinedTerms: readonly string[];
}

/** Quarantine log entry (semantic only, no raw text) */
interface QuarantineLogEntry {
  readonly eventId: string;
  readonly tick: number;
  readonly playerId: string;
  readonly extractedIntent: SpeechIntent | null;
  readonly extractedConcepts: readonly string[];
  readonly emotionalProfile: string; // hashed for privacy
  readonly quarantinedCount: number;
  readonly wasClean: boolean;
  readonly processingTimeMs: number; // side-channel telemetry
}

const quarantineLog: QuarantineLogEntry[] = [];

// =============================================================================
// INTENTS (for player communication)
// =============================================================================

interface IntentPattern {
  pattern: RegExp;
  intent: SpeechIntent;
}

const INTENT_PATTERNS: readonly IntentPattern[] = Object.freeze([
  { pattern: /^(?:hi|hello|hey|greetings|salutations?)\b/i, intent: 'greet' },
  { pattern: /^(?:bye|farewell|goodbye|see ya|later)\b/i, intent: 'farewell' },
  { pattern: /^(?:help|aid|assist|save|rescue)\b/i, intent: 'request' },
  { pattern: /^(?:buy|purchase|trade|sell|exchange)\b/i, intent: 'trade' },
  { pattern: /^(?:kill|attack|fight|destroy|eliminate)\b/i, intent: 'threaten' },
  { pattern: /^(?:know|heard|rumor|say|tell|they say)\b/i, intent: 'rumor_share' },
  { pattern: /^(?:teach|learn|know|explain|show)\b/i, intent: 'teach' },
  { pattern: /^(?:join|recruit|enlist|come with)\b/i, intent: 'recruit' },
  { pattern: /^(?:sorry|apologize|forgive|my fault)\b/i, intent: 'apologize' },
  { pattern: /^(?:thanks?|thank you|appreciate|grateful)\b/i, intent: 'thank' },
]);

// =============================================================================
// EMOTION KEYWORDS
// =============================================================================

interface EmotionKeyword {
  keyword: string;
  emotion: 'fear' | 'anger' | 'trust' | 'desperation';
  weight: number;
}

const EMOTION_KEYWORDS: readonly EmotionKeyword[] = Object.freeze([
  // Fear
  { keyword: 'afraid', emotion: 'fear', weight: 0.8 },
  { keyword: 'scared', emotion: 'fear', weight: 0.8 },
  { keyword: 'terrified', emotion: 'fear', weight: 1.0 },
  { keyword: 'worried', emotion: 'fear', weight: 0.5 },
  { keyword: 'nervous', emotion: 'fear', weight: 0.4 },
  { keyword: 'frightened', emotion: 'fear', weight: 0.9 },
  // Anger
  { keyword: 'angry', emotion: 'anger', weight: 0.8 },
  { keyword: 'furious', emotion: 'anger', weight: 1.0 },
  { keyword: 'mad', emotion: 'anger', weight: 0.6 },
  { keyword: 'hate', emotion: 'anger', weight: 0.9 },
  { keyword: 'rage', emotion: 'anger', weight: 1.0 },
  // Trust
  { keyword: 'trust', emotion: 'trust', weight: 0.7 },
  { keyword: 'believe', emotion: 'trust', weight: 0.6 },
  { keyword: 'faith', emotion: 'trust', weight: 0.7 },
  { keyword: 'friend', emotion: 'trust', weight: 0.5 },
  // Desperation
  { keyword: 'desperate', emotion: 'desperation', weight: 1.0 },
  { keyword: 'please', emotion: 'desperation', weight: 0.7 },
  { keyword: 'need', emotion: 'desperation', weight: 0.5 },
  { keyword: 'urgent', emotion: 'desperation', weight: 0.8 },
]);

// =============================================================================
// CONCEPT EXTRACTION
// =============================================================================

interface ConceptPattern {
  pattern: RegExp;
  concept: string;
}

const CONCEPT_PATTERNS: readonly ConceptPattern[] = Object.freeze([
  { pattern: /(?:gold|coin|silver|money|currency)/gi, concept: 'wealth' },
  { pattern: /(?:food|hungry|eat|meal|starving)/gi, concept: 'food' },
  { pattern: /(?:weapon|sword|dagger|armor|fight)/gi, concept: 'combat' },
  { pattern: /(?:monster|creature|beast|wolf|bear)/gi, concept: 'monster' },
  { pattern: /(?:quest|mission|adventure|task)/gi, concept: 'quest' },
  { pattern: /(?:safe|safety|protect|defend)/gi, concept: 'safety' },
  { pattern: /(?:village|town|home|shelter)/gi, concept: 'home' },
  { pattern: /(?:road|path|journey|travel)/gi, concept: 'travel' },
  { pattern: /(?:dungeon|cave|ruins|explore)/gi, concept: 'dungeon' },
  { pattern: /(?:magic|spell|enchant|wizard)/gi, concept: 'magic' },
]);

// =============================================================================
// QUARANTINE PROCESSING
// =============================================================================

/**
 * Process player utterance through quarantine.
 * Returns extracted meaning only — never raw text.
 */
export function processUserUtterance(
  playerId: string,
  rawText: string,
  tick: number
): PlayerUtteranceMeaning {
  const eventId = stableHash32(`${QUARANTINE_TAG}:${playerId}:${tick}`).toString(16);
  const startTime = performance.now(); // Side-channel only

  // Step 1: Extract and quarantine sensitive content
  const { cleaned, quarantinedTerms } = extractAndQuarantine(rawText);

  // Step 2: Extract intent
  const intent = extractIntent(cleaned);

  // Step 3: Extract emotional tone
  const emotionalTone = extractEmotionalTone(cleaned);

  // Step 4: Extract concepts
  const concepts = extractConcepts(cleaned);

  // Step 5: Determine conditions
  const condition = determineConditions(cleaned, concepts, intent);

  const processingTimeMs = performance.now() - startTime; // Side-channel telemetry

  // Log to quarantine log
  const logEntry: QuarantineLogEntry = Object.freeze({
    eventId,
    tick,
    playerId,
    extractedIntent: intent,
    extractedConcepts: concepts,
    emotionalProfile: stableHash32(`${playerId}:${emotionalTone.fear}:${emotionalTone.anger}`).toString(16),
    quarantinedCount: quarantinedTerms.length,
    wasClean: quarantinedTerms.length === 0,
    processingTimeMs,
  });
  quarantineLog.push(logEntry);

  // Keep log bounded
  if (quarantineLog.length > 1000) {
    quarantineLog.shift();
  }

  return Object.freeze({
    eventId,
    tick,
    playerId,
    intent,
    emotionalTone,
    concepts,
    condition,
    rawQuarantined: quarantinedTerms.length > 0,
    quarantinedTerms: Object.freeze(quarantinedTerms),
  });
}

/**
 * Extract and quarantine sensitive content.
 */
function extractAndQuarantine(text: string): {
  cleaned: string;
  quarantinedTerms: readonly string[];
} {
  const quarantinedTerms: string[] = [];
  let cleaned = text;

  for (const { pattern, type, severity } of QUARANTINE_PATTERNS) {
    const matches = text.match(pattern);
    if (matches) {
      for (const match of matches) {
        // High severity items are always quarantined
        if (severity === 'high') {
          quarantinedTerms.push(`[${type}]`);
          cleaned = cleaned.replace(match, `[${type}]`);
        } else if (severity === 'medium') {
          // Medium severity - partial quarantine
          const firstChar = match[0];
          const lastChar = match[match.length - 1];
          quarantinedTerms.push(`[partial_${type}]`);
          cleaned = cleaned.replace(match, `${firstChar}[...]${lastChar}`);
        }
        // Low severity just gets logged, not quarantined
      }
    }
  }

  return {
    cleaned,
    quarantinedTerms: Object.freeze(quarantinedTerms),
  };
}

/**
 * Extract speech intent from cleaned text.
 */
function extractIntent(text: string): SpeechIntent | null {
  for (const { pattern, intent } of INTENT_PATTERNS) {
    if (pattern.test(text)) {
      return intent;
    }
  }
  return null;
}

/**
 * Extract emotional tone from cleaned text.
 */
function extractEmotionalTone(text: string): {
  fear: KappaInt;
  anger: KappaInt;
  trust: KappaInt;
  desperation: KappaInt;
} {
  let fear = 0, anger = 0, trust = 0, desperation = 0;

  for (const { keyword, emotion, weight } of EMOTION_KEYWORDS) {
    if (text.toLowerCase().includes(keyword)) {
      switch (emotion) {
        case 'fear':
          fear += weight;
          break;
        case 'anger':
          anger += weight;
          break;
        case 'trust':
          trust += weight;
          break;
        case 'desperation':
          desperation += weight;
          break;
      }
    }
  }

  // Normalize to 0-1 range
  return Object.freeze({
    fear: createKappaInt(Math.min(1.0, fear)),
    anger: createKappaInt(Math.min(1.0, anger)),
    trust: createKappaInt(Math.min(1.0, trust)),
    desperation: createKappaInt(Math.min(1.0, desperation)),
  });
}

/**
 * Extract concepts from cleaned text.
 */
function extractConcepts(text: string): readonly string[] {
  const foundConcepts: string[] = [];

  for (const { pattern, concept } of CONCEPT_PATTERNS) {
    if (pattern.test(text)) {
      foundConcepts.push(concept);
    }
  }

  return Object.freeze(foundConcepts);
}

/**
 * Determine utterance conditions.
 */
function determineConditions(
  text: string,
  concepts: readonly string[],
  intent: SpeechIntent | null
): {
  isHelpRequest: boolean;
  isThreat: boolean;
  isTradeOffer: boolean;
  isInformation: boolean;
  isEmotional: boolean;
} {
  const lowerText = text.toLowerCase();

  return Object.freeze({
    isHelpRequest: intent === 'request' || concepts.includes('food') || lowerText.includes('please'),
    isThreat: intent === 'threaten' || concepts.includes('combat'),
    isTradeOffer: intent === 'trade' || concepts.includes('wealth'),
    isInformation: intent === 'teach' || intent === 'rumor_share' || concepts.includes('quest'),
    isEmotional: lowerText.includes('!') || concepts.includes('combat'),
  });
}

// =============================================================================
// QUARANTINE LOG ACCESS
// =============================================================================

/**
 * Get recent quarantine log entries.
 */
export function getQuarantineLog(limit = 100): readonly QuarantineLogEntry[] {
  return quarantineLog.slice(-limit);
}

/**
 * Get quarantine statistics.
 */
export function getQuarantineStats(): {
  totalProcessed: number;
  quarantinedCount: number;
  cleanCount: number;
  quarantineRate: number;
} {
  const total = quarantineLog.length;
  const quarantined = quarantineLog.filter((e) => !e.wasClean).length;
  const clean = total - quarantined;

  return Object.freeze({
    totalProcessed: total,
    quarantinedCount: quarantined,
    cleanCount: clean,
    quarantineRate: total > 0 ? quarantined / total : 0,
  });
}

/**
 * Clear quarantine log (for testing).
 */
export function clearQuarantineLog(): void {
  quarantineLog.length = 0;
}