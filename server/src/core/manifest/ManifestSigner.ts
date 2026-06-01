/**
 * ManifestSigner
 * 
 * Creates cryptographic signatures for manifests.
 * The signature proves the manifest came from the server authority.
 * 
 * Uses HMAC-SHA256 for simplicity and speed.
 * Ed25519 and RSA-PSS can be added as future options.
 */

import * as crypto from 'crypto';
import type { SignatureAlgorithm } from './ManifestTypes.js';
import { sha256, sha256Combine } from './ManifestHasher.js';
import { canonicalizeHeader } from './ManifestCanonicalizer.js';

export interface SigningOptions {
  algorithm: SignatureAlgorithm;
  secret: string;
}

/**
 * Sign a manifest header using HMAC-SHA256.
 * The signature covers the deterministic header canonicalization.
 */
export function signHeader(headerCanonical: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(headerCanonical).digest('hex');
}

/**
 * Create a signature for a state hash.
 * The signature proves the server authored this hash.
 */
export function signStateHash(
  stateHash: string,
  tickSequence: number,
  secret: string
): string {
  const payload = sha256Combine(stateHash, String(tickSequence), 'AUTHORITY');
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

/**
 * Verify a header signature.
 */
export function verifySignature(
  headerCanonical: string,
  signature: string,
  secret: string
): boolean {
  const expected = signHeader(headerCanonical, secret);
  return timingSafeEqual(expected, signature);
}

/**
 * Timing-safe string comparison to prevent timing attacks.
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Create a signing key from secret with salt.
 */
export function deriveSigningKey(secret: string, salt: string): Buffer {
  return crypto.pbkdf2Sync(secret, salt, 100000, 32, 'sha256');
}

/**
 * Sign any data with a derived key.
 */
export function signWithKey(data: string, key: Buffer): string {
  return crypto.createHmac('sha256', key).update(data).digest('hex');
}

/**
 * Verify with a derived key.
 */
export function verifyWithKey(data: string, signature: string, key: Buffer): boolean {
  const expected = signWithKey(data, key);
  return timingSafeEqual(expected, signature);
}

/**
 * Create a manifest-specific signature chain.
 * This signs: stateHash + dependencyRoot + payloadHash
 */
export function signManifestChain(
  stateHash: string,
  dependencyRootHash: string,
  payloadHash: string,
  secret: string
): string {
  const chainData = sha256Combine(stateHash, dependencyRootHash, payloadHash);
  return signStateHash(chainData, 0, secret);
}

/**
 * Generate authority signature for tick manifest.
 */
export function signTickManifest(
  tickSequence: number,
  stateHash: string,
  previousStateHash: string,
  secret: string
): string {
  const payload = sha256Combine(
    String(tickSequence),
    stateHash,
    previousStateHash,
    'TICK_SIGNATURE'
  );
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}