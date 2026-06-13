import { performance } from 'node:perf_hooks';
import { stableHash32 } from '../determinism/AREDeterminism.js';
import type { SpeechIntent, KappaInt } from './LanguageTypes.js';
import { createKappaInt } from './LanguageTypes.js';

const QUARANTINE_TAG = 'DIALOGUE_SAFETY_QUARANTINE_V1';

type QuarantineKind = 'name' | 'location' | 'contact' | 'template';
type Severity = 'high' | 'medium' | 'low';

interface QuarantinePattern { readonly pattern: RegExp; readonly kind: QuarantineKind; readonly severity: Severity }

const QUARANTINE_PATTERNS: readonly QuarantinePattern[] = Object.freeze([
  { pattern: /\b[A-Z][a-z]+ [A-Z][a-z]+\b/, kind: 'name', severity: 'high' },
  { pattern: /\b\d{1,5}\s+\w+\s+(street|avenue|road|blvd|dr|lane)\b/i, kind: 'location', severity: 'high' },
  { pattern: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/, kind: 'contact', severity: 'high' },
  { pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/, kind: 'contact', severity: 'high' },
  { pattern: /https?:\/\/[^\s]+/i, kind: 'contact', severity: 'high' },
  { pattern: /\$\{[^}]*\}/, kind: 'template', severity: 'high' },
  { pattern: /\{\{[^}]*\}\}/, kind: 'template', severity: 'medium' },
]);

export interface PlayerUtteranceMeaning {
  readonly eventId: string;
  readonly tick: number;
  readonly playerId: string;
  readonly intent: SpeechIntent | null;
  readonly emotionalTone: { readonly fear: KappaInt; readonly anger: KappaInt; readonly trust: KappaInt; readonly desperation: KappaInt };
  readonly concepts: readonly string[];
  readonly condition: { readonly isHelpRequest: boolean; readonly isThreat: boolean; readonly isTradeOffer: boolean; readonly isInformation: boolean; readonly isEmotional: boolean };
  readonly rawQuarantined: boolean;
  readonly quarantinedTerms: readonly string[];
}

interface QuarantineLogEntry {
  readonly eventId: string;
  readonly tick: number;
  readonly playerId: string;
  readonly extractedIntent: SpeechIntent | null;
  readonly extractedConcepts: readonly string[];
  readonly emotionalProfile: string;
  readonly quarantinedCount: number;
  readonly wasClean: boolean;
  readonly processingTimeMs: number;
}

const quarantineLog: QuarantineLogEntry[] = [];

interface IntentPattern { readonly pattern: RegExp; readonly intent: SpeechIntent }
const INTENT_PATTERNS: readonly IntentPattern[] = Object.freeze([
  { pattern: /^(?:hi|hello|hey|greetings|salutations?)\b/i, intent: 'greet' },
  { pattern: /^(?:bye|farewell|goodbye|see ya|later)\b/i, intent: 'farewell' },
  { pattern: /^(?:help|aid|assist|save|rescue)\b/i, intent: 'request' },
  { pattern: /^(?:buy|purchase|trade|sell|exchange)\b/i, intent: 'trade' },
  { pattern: /^(?:warn|beware|danger)\b/i, intent: 'warn' },
  { pattern: /^(?:know|heard|rumor|say|tell|they say)\b/i, intent: 'rumor_share' },
  { pattern: /^(?:teach|learn|know|explain|show)\b/i, intent: 'teach' },
  { pattern: /^(?:join|recruit|enlist|come with)\b/i, intent: 'recruit' },
  { pattern: /^(?:sorry|apologize|forgive|my fault)\b/i, intent: 'apologize' },
  { pattern: /^(?:thanks?|thank you|appreciate|grateful)\b/i, intent: 'thank' },
]);

interface EmotionKeyword { readonly keyword: string; readonly emotion: 'fear' | 'anger' | 'trust' | 'desperation'; readonly weight: number }
const EMOTION_KEYWORDS: readonly EmotionKeyword[] = Object.freeze([
  { keyword: 'afraid', emotion: 'fear', weight: 0.8 },
  { keyword: 'scared', emotion: 'fear', weight: 0.8 },
  { keyword: 'terrified', emotion: 'fear', weight: 1.0 },
  { keyword: 'worried', emotion: 'fear', weight: 0.5 },
  { keyword: 'angry', emotion: 'anger', weight: 0.8 },
  { keyword: 'furious', emotion: 'anger', weight: 1.0 },
  { keyword: 'mad', emotion: 'anger', weight: 0.6 },
  { keyword: 'hate', emotion: 'anger', weight: 0.9 },
  { keyword: 'trust', emotion: 'trust', weight: 0.7 },
  { keyword: 'believe', emotion: 'trust', weight: 0.6 },
  { keyword: 'friend', emotion: 'trust', weight: 0.5 },
  { keyword: 'desperate', emotion: 'desperation', weight: 1.0 },
  { keyword: 'please', emotion: 'desperation', weight: 0.7 },
  { keyword: 'need', emotion: 'desperation', weight: 0.5 },
  { keyword: 'urgent', emotion: 'desperation', weight: 0.8 },
]);

interface ConceptPattern { readonly pattern: RegExp; readonly concept: string }
const CONCEPT_PATTERNS: readonly ConceptPattern[] = Object.freeze([
  { pattern: /(?:gold|coin|silver|money|currency)/i, concept: 'wealth' },
  { pattern: /(?:food|hungry|eat|meal|starving)/i, concept: 'food' },
  { pattern: /(?:weapon|sword|dagger|armor|fight)/i, concept: 'combat' },
  { pattern: /(?:monster|creature|beast|wolf|bear)/i, concept: 'monster' },
  { pattern: /(?:quest|mission|adventure|task)/i, concept: 'quest' },
  { pattern: /(?:safe|safety|protect|defend)/i, concept: 'safety' },
  { pattern: /(?:village|town|home|shelter)/i, concept: 'home' },
  { pattern: /(?:road|path|journey|travel)/i, concept: 'travel' },
  { pattern: /(?:dungeon|cave|ruins|explore)/i, concept: 'dungeon' },
  { pattern: /(?:magic|spell|enchant|wizard)/i, concept: 'magic' },
]);

export function processUserUtterance(playerId: string, rawText: string, tick: number): PlayerUtteranceMeaning {
  const eventId = stableHash32(`${QUARANTINE_TAG}:${playerId}:${tick}`).toString(16);
  const startTime = performance.now();
  const { cleaned, quarantinedTerms } = extractAndQuarantine(rawText);
  const intent = extractIntent(cleaned);
  const emotionalTone = extractEmotionalTone(cleaned);
  const concepts = extractConcepts(cleaned);
  const condition = determineConditions(cleaned, concepts, intent);
  const processingTimeMs = performance.now() - startTime;

  quarantineLog.push(Object.freeze({
    eventId,
    tick,
    playerId,
    extractedIntent: intent,
    extractedConcepts: concepts,
    emotionalProfile: stableHash32(`${playerId}:${emotionalTone.fear}:${emotionalTone.anger}`).toString(16),
    quarantinedCount: quarantinedTerms.length,
    wasClean: quarantinedTerms.length === 0,
    processingTimeMs,
  }));
  if (quarantineLog.length > 1000) quarantineLog.shift();

  return Object.freeze({ eventId, tick, playerId, intent, emotionalTone, concepts, condition, rawQuarantined: quarantinedTerms.length > 0, quarantinedTerms });
}

function extractAndQuarantine(text: string): { readonly cleaned: string; readonly quarantinedTerms: readonly string[] } {
  const quarantinedTerms: string[] = [];
  let cleaned = text;
  for (const { pattern, kind, severity } of QUARANTINE_PATTERNS) {
    const globalPattern = new RegExp(pattern.source, pattern.flags.includes('i') ? 'gi' : 'g');
    const matches = cleaned.match(globalPattern);
    if (!matches) continue;
    for (const match of matches) {
      if (severity === 'high') {
        quarantinedTerms.push(`[${kind}]`);
        cleaned = cleaned.split(match).join(`[${kind}]`);
      } else if (severity === 'medium') {
        quarantinedTerms.push(`[partial_${kind}]`);
        cleaned = cleaned.split(match).join(`${match[0] ?? ''}[...]${match[match.length - 1] ?? ''}`);
      }
    }
  }
  return Object.freeze({ cleaned, quarantinedTerms: Object.freeze(quarantinedTerms) });
}

function extractIntent(text: string): SpeechIntent | null {
  for (const { pattern, intent } of INTENT_PATTERNS) if (pattern.test(text)) return intent;
  return null;
}

function extractEmotionalTone(text: string): PlayerUtteranceMeaning['emotionalTone'] {
  const lower = text.toLowerCase();
  let fear = 0, anger = 0, trust = 0, desperation = 0;
  for (const { keyword, emotion, weight } of EMOTION_KEYWORDS) {
    if (!lower.includes(keyword)) continue;
    if (emotion === 'fear') fear += weight;
    if (emotion === 'anger') anger += weight;
    if (emotion === 'trust') trust += weight;
    if (emotion === 'desperation') desperation += weight;
  }
  return Object.freeze({ fear: createKappaInt(Math.min(1, fear)), anger: createKappaInt(Math.min(1, anger)), trust: createKappaInt(Math.min(1, trust)), desperation: createKappaInt(Math.min(1, desperation)) });
}

function extractConcepts(text: string): readonly string[] {
  const foundConcepts: string[] = [];
  for (const { pattern, concept } of CONCEPT_PATTERNS) if (pattern.test(text)) foundConcepts.push(concept);
  return Object.freeze(foundConcepts);
}

function determineConditions(text: string, concepts: readonly string[], intent: SpeechIntent | null): PlayerUtteranceMeaning['condition'] {
  const lower = text.toLowerCase();
  const isHelpRequest = intent === 'request' || lower.includes('help') || lower.includes('assist');
  const isThreat = lower.includes('danger') || lower.includes('beware') || lower.includes('warn');
  const isTradeOffer = intent === 'trade' || concepts.includes('wealth');
  const isInformation = intent === 'teach' || intent === 'rumor_share' || lower.includes('heard');
  const isEmotional = lower.includes('afraid') || lower.includes('angry') || lower.includes('please') || lower.includes('hate');
  return Object.freeze({ isHelpRequest, isThreat, isTradeOffer, isInformation, isEmotional });
}

export function getQuarantineLog(): readonly QuarantineLogEntry[] { return Object.freeze([...quarantineLog]); }
export function getQuarantineStats(): { readonly totalProcessed: number; readonly quarantined: number; readonly clean: number } {
  const quarantined = quarantineLog.filter((entry) => !entry.wasClean).length;
  return Object.freeze({ totalProcessed: quarantineLog.length, quarantined, clean: quarantineLog.length - quarantined });
}
export function clearQuarantineLog(): void { quarantineLog.length = 0; }
