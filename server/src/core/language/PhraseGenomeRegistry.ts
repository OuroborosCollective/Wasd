import type { PhraseGenome, SpeechIntent } from './LanguageTypes.js';

interface RegisteredGenome {
  readonly genome: PhraseGenome;
  readonly lastUsedTick: number;
  readonly useCount: number;
}

const SPEECH_INTENTS: readonly SpeechIntent[] = Object.freeze([
  'rumor_share',
  'apologize',
  'farewell',
  'threaten',
  'comfort',
  'recruit',
  'betray',
  'request',
  'accuse',
  'trade',
  'teach',
  'thank',
  'boast',
  'greet',
  'warn',
  'pray',
  'brag',
  'mock',
]);

const registry: Map<string, RegisteredGenome> = new Map();

function keyPart(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'unknown';
}

function inferIntentFromGenomeId(genomeId: string): SpeechIntent | undefined {
  const normalized = keyPart(genomeId);
  for (const intent of SPEECH_INTENTS) {
    if (
      normalized === intent
      || normalized === `default_${intent}`
      || normalized.startsWith(`${intent}_`)
      || normalized.endsWith(`_${intent}`)
      || normalized.includes(`_${intent}_`)
    ) {
      return intent;
    }
  }
  return undefined;
}

export function registerPhraseGenome(genome: PhraseGenome): void {
  registry.set(genome.id, Object.freeze({
    genome: Object.freeze(genome),
    lastUsedTick: 0,
    useCount: 0,
  }));
}

export function getRegisteredGenome(genomeId: string): PhraseGenome | undefined {
  return registry.get(genomeId)?.genome;
}

export function getPhraseGenomeOrDefault(genomeId: string): PhraseGenome | undefined {
  const direct = getRegisteredGenome(genomeId);
  if (direct) return direct;

  const intent = inferIntentFromGenomeId(genomeId);
  return intent ? getRegisteredGenome(`default_${intent}`) : undefined;
}

export function listRegisteredPhraseGenomeIds(): readonly string[] {
  return Object.freeze([...registry.keys()].sort());
}

export function clearPhraseGenomeRegistry(): void {
  registry.clear();
}
