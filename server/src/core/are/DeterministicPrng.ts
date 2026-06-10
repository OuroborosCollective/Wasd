/**
 * DeterministicPRNG - Seedable Pseudo-Random Number Generator
 * 
 * CRITICAL: This PRNG is for SIMULATION logic only.
 * All random values in the authoritative core MUST use this PRNG
 * with a seed derived from the deterministic tick state.
 * 
 * Uses a simple LCG (Linear Congruential Generator) that is:
 * - Fast and deterministic
 * - Reproducible given the same seed
 * - Suitable for game simulation where determinism is required
 * 
 * LCG Formula: next = (a * current + c) mod m
 * Parameters from "Numerical Recipes" for good statistical properties.
 */

export interface DeterministicPrng {
  /** Generate next random integer in range [0, 2^32) */
  nextInt(): number;
  
  /** Generate random float in range [0, 1) */
  nextFloat(): number;
  
  /** Generate random integer in range [min, max] (inclusive) */
  nextIntRange(min: number, max: number): number;
  
  /** Get current state (for replay) */
  getState(): bigint;
  
  /** Clone the PRNG with current state */
  clone(): DeterministicPrng;
}

// LCG parameters from "Numerical Recipes"
const LCG_A = 1664525n;
const LCG_C = 1013904223n;
const LCG_M = 4294967296n; // 2^32

/**
 * LcgPrng: Linear Congruential Generator implementation.
 * 
 * Fast, deterministic, and suitable for game simulation.
 */
export class LcgPrng implements DeterministicPrng {
  private state: bigint;

  /**
   * Create a new PRNG with the given seed.
   * 
   * @param seed - Initial seed value. Must be a non-negative integer.
   */
  constructor(seed: number | bigint) {
    if (typeof seed === 'number') {
      if (!Number.isInteger(seed) || seed < 0) {
        throw new Error(`[LcgPrng] Invalid seed: ${seed} (must be non-negative integer)`);
      }
      this.state = BigInt(seed);
    } else {
      if (seed < 0n) {
        throw new Error(`[LcgPrng] Invalid seed: ${seed} (must be non-negative)`);
      }
      this.state = seed;
    }
  }

  /**
   * Generate next random 32-bit unsigned integer.
   */
  nextInt(): number {
    this.state = (LCG_A * this.state + LCG_C) % LCG_M;
    return Number(this.state);
  }

  /**
   * Generate random float in range [0, 1).
   */
  nextFloat(): number {
    return this.nextInt() / 4294967296;
  }

  /**
   * Generate random integer in range [min, max] (inclusive).
   */
  nextIntRange(min: number, max: number): number {
    if (min > max) {
      throw new Error(`[DeterministicPrng] min (${min}) > max (${max})`);
    }
    if (min === max) return min;
    
    const range = max - min + 1;
    if (range <= 0) {
      throw new Error(`[DeterministicPrng] Invalid range: ${min} to ${max}`);
    }
    
    // For small ranges, use modulo
    if (range <= 0x1000000) { // 2^24
      return min + (this.nextInt() % range);
    }
    
    // For larger ranges, use rejection sampling for better distribution
    let result: number;
    do {
      result = min + (this.nextInt() % range);
    } while (result > max);
    return result;
  }

  /**
   * Get current state for serialization/replay.
   */
  getState(): bigint {
    return this.state;
  }

  /**
   * Clone the PRNG with current state.
   * The clone will produce the same sequence of random values.
   */
  clone(): DeterministicPrng {
    const clone = new LcgPrng(0);
    clone.state = this.state;
    return clone;
  }

  /**
   * Serialize state to a string for storage.
   */
  serialize(): string {
    return this.state.toString(16);
  }

  /**
   * Restore state from a serialized string.
   */
  static deserialize(serialized: string): LcgPrng {
    const prng = new LcgPrng(0);
    prng.state = BigInt('0x' + serialized);
    return prng;
  }
}

/**
 * Create a PRNG with a deterministic seed.
 * 
 * The seed should be derived from tick state (tickId, entity positions, etc.)
 * to ensure the random sequence is itself deterministic.
 * 
 * @param seed - Seed value (should be derived from deterministic state)
 */
export function createDeterministicPrng(seed: number): DeterministicPrng {
  return new LcgPrng(seed);
}

/**
 * Derive a seed from multiple integer values.
 * Combines values using XOR for better distribution.
 * 
 * @param values - Integer values to combine into a seed
 */
export function deriveSeed(...values: number[]): number {
  let seed = 0;
  for (const v of values) {
    seed ^= v + 0x9e3779b9 + (seed << 6) + (seed >>> 2);
  }
  return seed >>> 0; // Ensure positive
}

/**
 * Derive a seed from a string.
 * 
 * @param str - String to hash into a seed
 */
export function deriveSeedFromString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Mulberry32: Another PRNG with good statistical properties.
 * Slightly faster than LCG but still deterministic.
 */
export class Mulberry32 implements DeterministicPrng {
  private state: number;

  constructor(seed: number) {
    if (!Number.isInteger(seed) || seed < 0) {
      throw new Error(`[Mulberry32] Invalid seed: ${seed}`);
    }
    this.state = seed >>> 0;
  }

  nextInt(): number {
    let t = this.state += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0);
  }

  nextFloat(): number {
    return this.nextInt() / 4294967296;
  }

  nextIntRange(min: number, max: number): number {
    if (min > max) {
      throw new Error(`[Mulberry32] min (${min}) > max (${max})`);
    }
    if (min === max) return min;
    const range = max - min + 1;
    return min + (this.nextInt() % range);
  }

  getState(): bigint {
    return BigInt(this.state);
  }

  clone(): DeterministicPrng {
    const clone = new Mulberry32(0);
    clone.state = this.state;
    return clone;
  }
}