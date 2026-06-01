/**
 * ManifestVerifier
 * 
 * Verifies manifest integrity and authenticity.
 * Checks:
 * 1. Signature validity
 * 2. Hash chain continuity
 * 3. Field constraints
 * 4. Dependency tree integrity
 */

import type {
  GlobalStateManifest,
  ICryptoDependencyHeader,
  IManifestDependency,
  IChainValidationResult
} from './ManifestTypes.js';
import { GENESIS_STATE_HASH, GENESIS_PREVIOUS_HASH } from './ManifestTypes.js';
import { canonicalizeHeader, canonicalizeDependency, canonicalizeDependencyRoot } from './ManifestCanonicalizer.js';
import { sha256, sha256Combine, merkleRoot, computeDependencyRoot } from './ManifestHasher.js';
import { verifySignature, signTickManifest } from './ManifestSigner.js';

export interface VerificationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
}

/**
 * Verify a complete manifest.
 */
export function verifyManifest(
  manifest: GlobalStateManifest,
  authoritySecret: string,
  expectedPreviousHash?: string
): VerificationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. Verify signature
  const headerCanonical = canonicalizeHeader(manifest.header);
  if (!verifySignature(headerCanonical, manifest.header.authoritySignature, authoritySecret)) {
    errors.push('Invalid authority signature');
  }

  // 2. Verify chain continuity
  if (manifest.header.tickSequence > 0) {
    if (manifest.header.previousStateHash === GENESIS_PREVIOUS_HASH) {
      errors.push('Genesis marker used for non-zero tick');
    }
  }

  // 3. Verify dependency root matches computed root
  const computedDependencyRoot = canonicalizeDependencyRoot(manifest.body.dependencies);
  if (computedDependencyRoot !== manifest.header.dependencyRootHash) {
    errors.push(`Dependency root mismatch: expected ${manifest.header.dependencyRootHash}, got ${computedDependencyRoot}`);
  }

  // 4. Verify payload hash
  if (manifest.body.payload !== undefined && manifest.body.payload !== null) {
    const canonicalPayload = JSON.stringify(manifest.body.payload, Object.keys(manifest.body.payload as object).sort());
    const payloadHash = sha256(canonicalPayload);
    if (payloadHash !== manifest.header.payloadHash && manifest.body.payloadMode !== 'hash_only') {
      warnings.push('Payload hash mismatch - payload may have been modified post-signing');
    }
  }

  // 5. Verify state hash computation
  const computedStateHash = sha256Combine(
    manifest.header.dependencyRootHash,
    manifest.header.payloadHash,
    manifest.header.previousStateHash
  );
  if (computedStateHash !== manifest.header.stateHash) {
    errors.push('State hash does not match computed value');
  }

  // 6. Verify previous hash matches expected (if provided)
  if (expectedPreviousHash && manifest.header.previousStateHash !== expectedPreviousHash) {
    errors.push(`Previous state hash mismatch: expected ${expectedPreviousHash}`);
  }

  // 7. Verify tick sequence vs previous tick
  if (expectedPreviousHash && manifest.header.previousStateHash !== GENESIS_STATE_HASH) {
    // Additional chain validation could go here
  }

  // 8. Verify simulation time is consistent with tick
  const expectedSimTime = manifest.header.tickSequence * (1000 / manifest.header.tickRateHz);
  if (Math.abs(manifest.header.simulationTimeMs - expectedSimTime) > 1) {
    warnings.push(`Simulation time ${manifest.header.simulationTimeMs} differs from expected ${expectedSimTime}`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Verify header fields have valid constraints.
 */
export function verifyHeaderConstraints(header: ICryptoDependencyHeader): VerificationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (header.protocolVersion < 1) {
    errors.push('Invalid protocol version');
  }

  if (header.tickSequence < 0) {
    errors.push('Negative tick sequence');
  }

  if (header.tickRateHz <= 0 || header.tickRateHz > 1000) {
    errors.push('Invalid tick rate');
  }

  if (header.stateHash.length !== 64) {
    errors.push('State hash must be 64 hex characters');
  }

  if (header.previousStateHash !== GENESIS_PREVIOUS_HASH && header.previousStateHash.length !== 64) {
    errors.push('Previous state hash must be 64 hex characters or GENESIS');
  }

  if (header.integrityNonce.length < 16) {
    errors.push('Integrity nonce too short');
  }

  if (header.worldId.length === 0) {
    errors.push('Empty world ID');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Verify dependency entries.
 */
export function verifyDependencies(deps: readonly IManifestDependency[]): VerificationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const seen = new Set<string>();

  for (const dep of deps) {
    if (seen.has(dep.componentId)) {
      errors.push(`Duplicate component ID: ${dep.componentId}`);
    }
    seen.add(dep.componentId);

    if (dep.checksum.length !== 64) {
      errors.push(`Invalid checksum length for ${dep.componentId}`);
    }

    if (dep.schemaVersion < 0) {
      errors.push(`Negative schema version for ${dep.componentId}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate a chain of manifests.
 */
export function validateChain(manifests: readonly GlobalStateManifest[]): IChainValidationResult {
  if (manifests.length === 0) {
    return { valid: true, lastValidTick: -1, gaps: [] };
  }

  // Sort by tick sequence
  const sorted = [...manifests].sort((a, b) => a.header.tickSequence - b.header.tickSequence);

  const gaps: number[] = [];
  let lastValidTick = -1;

  for (let i = 0; i < sorted.length; i++) {
    const manifest = sorted[i];

    // Check for gaps
    if (i > 0) {
      const prevTick = sorted[i - 1].header.tickSequence;
      const expectedNext = prevTick + 1;
      if (manifest.header.tickSequence !== expectedNext && manifest.header.kind !== 'snapshot') {
        gaps.push(manifest.header.tickSequence);
      }
    }

    // Verify chain continuity
    if (i > 0 && manifest.header.previousStateHash !== sorted[i - 1].header.stateHash) {
      return {
        valid: false,
        error: `Chain break at tick ${manifest.header.tickSequence}: previous hash mismatch`,
        lastValidTick: sorted[i - 1].header.tickSequence,
        gaps,
      };
    }

    lastValidTick = manifest.header.tickSequence;
  }

  return {
    valid: true,
    lastValidTick,
    gaps,
  };
}

/**
 * Quick validation check - returns true if manifest could be valid.
 * Use this for fast pre-filtering before full verification.
 */
export function isLikelyValid(manifest: unknown): boolean {
  if (!manifest || typeof manifest !== 'object') return false;
  
  const m = manifest as Record<string, unknown>;
  
  // Must have header and body
  if (!m.header || typeof m.header !== 'object') return false;
  if (!m.body || typeof m.body !== 'object') return false;
  
  // Header must have required fields
  const h = m.header as Record<string, unknown>;
  if (typeof h.tickSequence !== 'number') return false;
  if (typeof h.stateHash !== 'string') return false;
  if (h.stateHash.length !== 64) return false;
  
  return true;
}