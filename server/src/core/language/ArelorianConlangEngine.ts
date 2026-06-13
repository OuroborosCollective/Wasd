import { stableHash32 } from '../determinism/AREDeterminism.js';
import type { KappaInt } from './LanguageTypes.js';
import { createKappaInt } from './LanguageTypes.js';

const ONSETS = Object.freeze(['k', 'r', 't', 'v', 'm', 'n', 's', 'th', 'kr', 'vr', 'sh']);
const NUCLEI = Object.freeze(['a', 'e', 'i', 'o', 'u', 'ae', 'ia']);
const CODAS = Object.freeze(['n', 'r', 's', 'th', 'l', 'm', 'k', '']);

export interface GeneratedWord {
  readonly word: string;
  readonly seed: string;
  readonly syllables: readonly string[];
  readonly meaningHash: string;
}

export interface MixedSpeechResult {
  readonly fullText: string;
  readonly arelorianRatio: number;
  readonly switchedSegments: readonly { text: string; language: 'arel' | 'common'; startIndex: number; endIndex: number }[];
}

export interface GeneratedPhrase {
  readonly text: string;
  readonly words: readonly GeneratedWord[];
  readonly phraseHash: string;
}

interface TermPropagation { readonly term: string; readonly originFactionId: string; readonly originTick: number; readonly uses: number; readonly success: number }
const propagation = new Map<string, TermPropagation>();

function pick(values: readonly string[], seed: string): string { return values[stableHash32(seed) % values.length]; }

export function generateArelorianWord(meaningSeed: string | number, seed: string | number = meaningSeed): GeneratedWord {
  const meaning = String(meaningSeed);
  const baseSeed = String(seed);
  const syllableCount = 2 + (stableHash32(`${baseSeed}:count`) % 2);
  const syllables: string[] = [];
  for (let i = 0; i < syllableCount; i++) {
    syllables.push(`${pick(ONSETS, `${baseSeed}:o:${i}`)}${pick(NUCLEI, `${baseSeed}:n:${i}`)}${pick(CODAS, `${baseSeed}:c:${i}`)}`);
  }
  const word = syllables.join('');
  return Object.freeze({ word, seed: baseSeed, syllables: Object.freeze(syllables), meaningHash: stableHash32(meaning).toString(16) });
}

export function generateMixedSpeech(baseText: string, arelorianRatio: number, seed: string | number): MixedSpeechResult {
  const seedNum = typeof seed === 'string' ? stableHash32(seed) : seed;
  const switchedSegments: { text: string; language: 'arel' | 'common'; startIndex: number; endIndex: number }[] = [];
  const words = baseText.split(/\s+/).filter(Boolean);
  const resultWords: string[] = [];
  let currentIndex = 0;
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const wordSeed = stableHash32(`${seedNum}:${i}`);
    if (wordSeed % 1000 < arelorianRatio * 1000) {
      const arelorianWord = generateArelorianWord(word, wordSeed);
      resultWords.push(arelorianWord.word);
      switchedSegments.push({ text: arelorianWord.word, language: 'arel', startIndex: currentIndex, endIndex: currentIndex + arelorianWord.word.length });
      currentIndex += arelorianWord.word.length + 1;
    } else {
      resultWords.push(word);
      currentIndex += word.length + 1;
    }
  }
  return Object.freeze({ fullText: resultWords.join(' '), arelorianRatio, switchedSegments: Object.freeze(switchedSegments) });
}

export function recordTermUsage(term: string, factionId: string, tick: number, successful = true): void {
  const existing = propagation.get(term);
  propagation.set(term, Object.freeze({ term, originFactionId: existing?.originFactionId ?? factionId, originTick: existing?.originTick ?? tick, uses: (existing?.uses ?? 0) + 1, success: (existing?.success ?? 0) + (successful ? 1 : 0) }));
}

export function getTermsForCanonicalization(): readonly string[] {
  return Array.from(propagation.values()).filter((entry) => entry.uses >= 3 && entry.success / entry.uses >= 0.6).map((entry) => entry.term).sort();
}

export function canonicalizeTerm(term: string): boolean {
  const entry = propagation.get(term);
  return Boolean(entry && entry.uses >= 3 && entry.success / entry.uses >= 0.6);
}

export function generateArelorianPhrase(concepts: readonly string[], seed: string | number): GeneratedPhrase {
  const baseSeed = String(seed);
  const words = concepts.map((concept, index) => generateArelorianWord(concept, `${baseSeed}:${concept}:${index}`));
  const text = words.map((word) => word.word).join(' ');
  return Object.freeze({ text, words: Object.freeze(words), phraseHash: stableHash32(`${baseSeed}:${text}`).toString(16) });
}

export function getConlangStats(): { readonly trackedTerms: number; readonly canonicalCandidates: number; readonly averageSuccess: KappaInt } {
  const entries = Array.from(propagation.values());
  const totalUses = entries.reduce((sum, entry) => sum + entry.uses, 0);
  const totalSuccess = entries.reduce((sum, entry) => sum + entry.success, 0);
  return Object.freeze({ trackedTerms: entries.length, canonicalCandidates: getTermsForCanonicalization().length, averageSuccess: createKappaInt(totalUses === 0 ? 0 : totalSuccess / totalUses) });
}

export function clearPropagationTracking(): void { propagation.clear(); }
