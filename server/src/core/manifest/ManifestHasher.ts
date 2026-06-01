/**
 * ManifestHasher
 * 
 * Cryptographic hashing for manifests.
 * Uses SHA-256 for deterministic, collision-resistant hashes.
 * 
 * Design: The hasher doesn't store state - all operations are stateless functions.
 * This makes it easy to test and reason about.
 */

import * as crypto from 'crypto';
import { toCanonicalString } from './ManifestCanonicalizer.js';

/**
 * Hash data using SHA-256.
 */
export function sha256(data: string): string {
  return crypto.createHash('sha256').update(data, 'utf8').digest('hex');
}

/**
 * Hash a binary buffer using SHA-256.
 */
export function sha256Buffer(data: Buffer): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Hash multiple values and combine them.
 */
export function sha256Combine(...values: string[]): string {
  const combined = values.join('|');
  return sha256(combined);
}

/**
 * Compute a Merkle-style root hash from an array of hashes.
 * Used for dependency tree validation.
 */
export function merkleRoot(hashes: readonly string[]): string {
  if (hashes.length === 0) return sha256('');
  if (hashes.length === 1) return hashes[0];
  
  const pairs: string[] = [];
  for (let i = 0; i < hashes.length; i += 2) {
    const left = hashes[i];
    const right = hashes[i + 1] ?? left; // Duplicate odd element
    pairs.push(sha256Combine(left, right));
  }
  
  return merkleRoot(pairs);
}

/**
 * Compute dependency tree root hash.
 * Each dependency contributes its hash in a deterministic order.
 */
export function computeDependencyRoot(deps: Array<{ componentId: string; checksum: string }>): string {
  // Sort by componentId for deterministic ordering
  const sorted = [...deps].sort((a, b) => a.componentId.localeCompare(b.componentId));
  const hashes = sorted.map(d => sha256Combine(d.componentId, d.checksum));
  return merkleRoot(hashes);
}

/**
 * Compute payload hash from any serializable value.
 */
export function hashPayload(payload: unknown): string {
  const canonical = toCanonicalString(payload);
  return sha256(canonical);
}

/**
 * Create a hash that combines header identity fields.
 */
export function hashIdentity(
  worldId: string,
  tickSequence: number,
  simulationTimeMs: number
): string {
  return sha256Combine(worldId, String(tickSequence), String(simulationTimeMs));
}

/**
 * Verify that a hash matches expected value.
 * Throws on mismatch for easy integration with guard clauses.
 */
export function verifyHash(expected: string, actual: string): void {
  if (expected !== actual) {
    throw new Error(
      `Hash mismatch: expected ${expected.slice(0, 16)}..., got ${actual.slice(0, 16)}...`
    );
  }
}

/**
 * Generate a random nonce for integrity protection.
 * Not for security - use crypto.randomBytes for that.
 */
export function generateNonce(): string {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Hash an entire manifest for chain validation.
 * Returns the state hash that should appear in the header.
 */
export function hashManifestBody(
  dependencyRootHash: string,
  payloadHash: string,
  previousStateHash: string
): string {
  return sha256Combine(dependencyRootHash, payloadHash, previousStateHash);
}