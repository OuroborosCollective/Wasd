/**
 * StateHash - Deterministic State Fingerprinting
 * 
 * Generates reproducible hashes of canonical game state.
 * Used for:
 * - Replay verification
 * - Divergence detection
 * - State comparison
 * - Manifest system integration
 * 
 * Hash is computed over a canonical serialization of state,
 * ensuring same input always produces same output.
 */

import type { StateHash } from './types';

/**
 * GENESIS_STATE_HASH - Initial state before any ticks
 */
export const GENESIS_STATE_HASH: StateHash = '0'.repeat(64) as StateHash;

/**
 * GENESIS_PREVIOUS_HASH - Sentinel value for first tick
 */
export const GENESIS_PREVIOUS_HASH = 'GENESIS';

/**
 * Create a StateHash from a 64-character hex string.
 * Validates format before branding.
 */
export function createStateHash(hex: string): StateHash {
  if (!/^[0-9a-f]{64}$/i.test(hex)) {
    throw new Error(`[StateHash] Invalid hash format: ${hex.substring(0, 16)}... (expected 64 hex chars)`);
  }
  return hex as StateHash;
}

/**
 * Verify a value is a valid StateHash.
 */
export function isStateHash(value: unknown): value is StateHash {
  return typeof value === 'string' && /^[0-9a-f]{64}$/i.test(value);
}

/**
 * Compare two state hashes for equality.
 * Constant-time comparison to prevent timing attacks on hash values.
 */
export function stateHashEquals(a: StateHash, b: StateHash): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Create a zero hash (useful for genesis state).
 */
export function zeroStateHash(): StateHash {
  return GENESIS_STATE_HASH;
}

/**
 * Check if a state hash is the genesis hash.
 */
export function isGenesisHash(hash: StateHash): boolean {
  return hash === GENESIS_STATE_HASH;
}

/**
 * XOR two state hashes.
 * Useful for combining hash chains.
 */
export function xorStateHashes(a: StateHash, b: StateHash): StateHash {
  if (a.length !== b.length) {
    throw new Error('[StateHash] Cannot XOR hashes of different lengths');
  }
  
  let result = '';
  for (let i = 0; i < a.length; i += 2) {
    const byteA = parseInt(a.substring(i, i + 2), 16);
    const byteB = parseInt(b.substring(i, i + 2), 16);
    const xor = byteA ^ byteB;
    result += xor.toString(16).padStart(2, '0');
  }
  
  return createStateHash(result);
}

/**
 * Simple string-based hash for non-crypto purposes.
 * Used for quick state fingerprinting where crypto strength isn't needed.
 */
export function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * StateHashBuilder: Build state hashes incrementally.
 */
export class StateHashBuilder {
  private parts: string[] = [];

  /**
   * Add a string value to the hash.
   */
  addString(value: string): this {
    this.parts.push(`s:${value}`);
    return this;
  }

  /**
   * Add a number value to the hash.
   */
  addNumber(value: number): this {
    this.parts.push(`n:${value}`);
    return this;
  }

  /**
   * Add a boolean value to the hash.
   */
  addBoolean(value: boolean): this {
    this.parts.push(`b:${value ? 1 : 0}`);
    return this;
  }

  /**
   * Add an array to the hash.
   */
  addArray(arr: unknown[]): this {
    this.parts.push(`a:${JSON.stringify(arr)}`);
    return this;
  }

  /**
   * Add an object to the hash.
   */
  addObject(obj: Record<string, unknown>): this {
    // Sort keys for deterministic serialization
    const sorted = Object.keys(obj).sort().map(k => `${k}:${JSON.stringify(obj[k])}`);
    this.parts.push(`o:${sorted.join('|')}`);
    return this;
  }

  /**
   * Build the final state hash.
   */
  build(): StateHash {
    const combined = this.parts.join('\x00');
    const hash = simpleHash(combined);
    // Pad to 64 hex chars
    return hash.toString(16).padStart(64, '0') as StateHash;
  }

  /**
   * Reset the builder for reuse.
   */
  reset(): void {
    this.parts = [];
  }
}