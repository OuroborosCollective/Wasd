/**
 * ManifestCanonicalizer
 * 
 * Produces deterministic string representations for hashing.
 * Critical: Two identical manifests MUST always produce the same canonical string.
 * 
 * Key rules:
 * 1. Object keys sorted alphabetically
 * 2. Arrays maintain order
 * 3. No trailing commas
 * 4. Strings quoted with double quotes
 * 5. Numbers no trailing decimals when integer
 */

import type {
  ICryptoDependencyHeader,
  IManifestDependency,
  IManifestBody,
  GlobalStateManifest,
  ISelfHealManifestMeta,
  IDivergenceReport
} from './ManifestTypes.js';

/**
 * Convert any value to a stable canonical string.
 * This is the foundation for deterministic hashing.
 */
export function toCanonicalString(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'boolean') return String(value);
  if (typeof value === 'number') return canonicalNumber(value);
  if (typeof value === 'string') return canonicalString(value);
  if (Array.isArray(value)) return canonicalArray(value);
  if (typeof value === 'object') return canonicalObject(value as Record<string, unknown>);
  return String(value);
}

function canonicalNumber(n: number): string {
  if (!Number.isFinite(n)) return String(n);
  if (Number.isInteger(n)) return String(n);
  // Avoid trailing zeros: 1.0 -> 1, 1.10 -> 1.1
  const str = n.toString();
  if (str.includes('.') && !str.includes('e')) {
    return str.replace(/\.?0+$/, '');
  }
  return str;
}

function canonicalString(s: string): string {
  // Escape special characters for JSON string output
  return JSON.stringify(s);
}

function canonicalArray(arr: unknown[]): string {
  if (arr.length === 0) return '[]';
  const items = arr.map(item => toCanonicalString(item));
  return `[${items.join(',')}]`;
}

function canonicalObject(obj: Record<string, unknown>): string {
  const keys = Object.keys(obj).sort();
  if (keys.length === 0) return '{}';
  
  const parts: string[] = [];
  for (const key of keys) {
    const value = obj[key];
    // Skip undefined values
    if (value === undefined) continue;
    parts.push(`${canonicalString(key)}:${toCanonicalString(value)}`);
  }
  return `{${parts.join(',')}}`;
}

/**
 * Canonicalize the header portion of a manifest.
 * The header contains all cryptographic identity information.
 */
export function canonicalizeHeader(header: ICryptoDependencyHeader): string {
  return canonicalObject({
    protocolVersion: header.protocolVersion,
    kind: header.kind,
    tickSequence: header.tickSequence,
    tickRateHz: header.tickRateHz,
    simulationTimeMs: header.simulationTimeMs,
    serverTimestamp: header.serverTimestamp,
    worldId: header.worldId,
    worldSeedHash: header.worldSeedHash,
    ruleSetHash: header.ruleSetHash,
    stateHash: header.stateHash,
    previousStateHash: header.previousStateHash,
    dependencyRootHash: header.dependencyRootHash,
    payloadHash: header.payloadHash,
    authoritySignature: header.authoritySignature,
    signatureAlgorithm: header.signatureAlgorithm,
    integrityNonce: header.integrityNonce,
  });
}

/**
 * Canonicalize a dependency entry.
 */
export function canonicalizeDependency(dep: IManifestDependency): string {
  const obj: Record<string, unknown> = {
    componentId: dep.componentId,
    kind: dep.kind,
    checksum: dep.checksum,
    schemaVersion: dep.schemaVersion,
  };
  if (dep.entityCount !== undefined) obj.entityCount = dep.entityCount;
  if (dep.changedSinceTick !== undefined) obj.changedSinceTick = dep.changedSinceTick;
  return canonicalObject(obj);
}

/**
 * Canonicalize the dependency array and compute root hash.
 */
export function canonicalizeDependencyRoot(deps: readonly IManifestDependency[]): string {
  const canonicalDeps = deps.map(d => canonicalizeDependency(d));
  return sha256(canonicalDeps.join('|'));
}

/**
 * Canonicalize the body portion of a manifest.
 */
export function canonicalizeBody(body: IManifestBody, dependencyRootHash: string): string {
  const parts: Record<string, unknown> = {
    dependencyRootHash,
    payloadMode: body.payloadMode,
  };
  
  // Only include payload hash for non-empty payloads
  if (body.payload !== undefined && body.payload !== null) {
    parts.payloadHash = sha256(toCanonicalString(body.payload));
  }
  
  // Include selfHeal metadata if present
  if (body.selfHeal) {
    parts.selfHeal = canonicalizeSelfHeal(body.selfHeal);
  }
  
  return canonicalObject(parts);
}

/**
 * Canonicalize self-heal metadata.
 */
export function canonicalizeSelfHeal(meta: ISelfHealManifestMeta): string {
  const obj: Record<string, unknown> = {
    healState: meta.healState,
    anomalyScore: meta.anomalyScore,
    patchedSubsystems: meta.patchedSubsystems,
  };
  if (meta.lastHealthSnapshot) {
    obj.lastHealthSnapshot = canonicalizeHealthSnapshot(meta.lastHealthSnapshot);
  }
  return canonicalObject(obj);
}

/**
 * Canonicalize a health snapshot (subset for manifest inclusion).
 */
function canonicalizeHealthSnapshot(snapshot: { ok: boolean; status: string; score: number }): string {
  return canonicalObject({
    ok: snapshot.ok,
    status: snapshot.status,
    score: snapshot.score,
  });
}

/**
 * Canonicalize divergence report.
 */
export function canonicalizeDivergence(div: IDivergenceReport): string {
  return canonicalObject({
    expectedHash: div.expectedHash,
    actualHash: div.actualHash,
    divergenceTick: div.divergenceTick,
    divergedComponents: div.divergedComponents,
    rollbackAnchorTick: div.rollbackAnchorTick,
    snapshotId: div.snapshotId,
  });
}

/**
 * Full manifest canonicalization for hashing.
 */
export function canonicalizeManifest(manifest: GlobalStateManifest): string {
  const header = canonicalizeHeader(manifest.header);
  const body = canonicalizeBody(manifest.body, manifest.header.dependencyRootHash);
  
  const parts: string[] = [header, body];
  
  if (manifest.divergence) {
    parts.push(canonicalizeDivergence(manifest.divergence));
  }
  
  return parts.join('::');
}

/**
 * SHA256 hash helper (uses Node crypto).
 * This is a simple wrapper - actual hashing logic lives in ManifestHasher.
 */
function sha256(data: string): string {
  // Lazy import to avoid circular dependency issues
  // This function is used internally by canonicalizers
  let hasher: import('crypto').Hash | null = null;
  try {
    const crypto = require('crypto');
    hasher = crypto.createHash('sha256');
    hasher.update(data, 'utf8');
    return hasher.digest('hex');
  } catch {
    // Fallback for environments without crypto
    return simpleHash(data);
  }
}

/**
 * Simple non-cryptographic hash fallback (for testing only).
 */
function simpleHash(data: string): string {
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16).padStart(64, '0').slice(0, 64);
}

/**
 * Compute hash for a payload without full canonicalization.
 */
export function hashPayload(payload: unknown): string {
  return sha256(toCanonicalString(payload));
}