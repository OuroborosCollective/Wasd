/**
 * Deterministic Asset RNG Module
 * 
 * Provides deterministic random number generation using seeded hashing.
 * NEVER uses Math.random(), Date.now(), or any time-based seeds.
 * All randomness is derived from deterministic string hashes.
 */

// FNV-1a 32-bit hash - fast and well-distributed
export function hash32(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

// MurmurHash3-style 32-bit hash - alternative for better distribution
export function murmurHash32(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h) >>> 0;
}

// Alias for backwards compatibility
export const deterministicIndex = hash32;

/**
 * Returns a deterministic float between 0 (inclusive) and 1 (exclusive).
 */
export function deterministicFloat(seed: string): number {
  return hash32(seed) / 0xffffffff;
}

/**
 * Returns a deterministic integer in range [0, length).
 */
export function deterministicInt(seed: string, length: number): number {
  if (length <= 0) return 0;
  return hash32(seed) % length;
}

/**
 * Returns a deterministic integer in range [min, max] (inclusive).
 */
export function deterministicIntRange(seed: string, min: number, max: number): number {
  return min + deterministicInt(seed, max - min + 1);
}

/**
 * Returns a deterministic boolean based on probability (0-1).
 */
export function deterministicBool(seed: string, probability: number = 0.5): boolean {
  return deterministicFloat(seed) < probability;
}

/**
 * Normalizes a seed string to ensure consistent hashing.
 */
export function normalizeSeed(seed: string | number | null | undefined): string {
  if (seed === null || seed === undefined) return '';
  return String(seed);
}

/**
 * Combines multiple seed components into a single deterministic seed.
 */
export function combineSeed(...parts: (string | number | null | undefined)[]): string {
  return parts.filter(p => p !== null && p !== undefined).map(normalizeSeed).join(':');
}

// Weighted entry type for deterministic selection
export interface WeightedEntry<T> {
  readonly item: T;
  readonly weight: number;
}

/**
 * Selects a weighted item deterministically based on seed.
 * Uses cumulative weight distribution for exact deterministic behavior.
 */
export function pickWeightedDeterministic<T>(
  seed: string,
  entries: readonly WeightedEntry<T>[],
): T | null {
  const valid = entries.filter((entry) => entry.weight > 0);
  
  if (valid.length === 0) return null;
  
  const total = valid.reduce((sum, entry) => sum + entry.weight, 0);
  if (total <= 0) return null;
  
  let roll = deterministicFloat(seed) * total;
  
  for (const entry of valid) {
    roll -= entry.weight;
    if (roll <= 0) return entry.item;
  }
  
  return valid[valid.length - 1]?.item ?? null;
}

/**
 * Selects multiple weighted items without replacement deterministically.
 */
export function pickMultipleWeightedDeterministic<T>(
  seed: string,
  entries: readonly WeightedEntry<T>[],
  count: number,
): T[] {
  const result: T[] = [];
  let remaining = [...entries.filter(e => e.weight > 0)];
  let currentSeed = seed;
  
  for (let i = 0; i < count && remaining.length > 0; i++) {
    const total = remaining.reduce((sum, e) => sum + e.weight, 0);
    if (total <= 0) break;
    
    let roll = deterministicFloat(currentSeed) * total;
    for (const entry of remaining) {
      roll -= entry.weight;
      if (roll <= 0) {
        result.push(entry.item);
        remaining = remaining.filter(e => e.item !== entry.item);
        currentSeed = combineSeed(currentSeed, String(i));
        break;
      }
    }
  }
  
  return result;
}

/**
 * Shuffles an array deterministically based on seed.
 */
export function deterministicShuffle<T>(seed: string, array: readonly T[]): T[] {
  const result = [...array];
  let currentSeed = seed;
  
  for (let i = result.length - 1; i > 0; i--) {
    currentSeed = combineSeed(currentSeed, String(i));
    const j = deterministicInt(currentSeed, i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  
  return result;
}

/**
 * Selects a deterministic key from a map-like object based on seed.
 */
export function selectDeterministicKey<T>(
  seed: string,
  entries: Record<string, T>,
): string | null {
  const keys = Object.keys(entries);
  if (keys.length === 0) return null;
  return keys[deterministicInt(seed, keys.length)];
}