/**
 * ManifestFactory
 * 
 * Creates manifests with automatic hash computation and signing.
 * This is the main entry point for the manifest system.
 * 
 * Design principle: Factory creates, others verify.
 * The factory handles the complex orchestration of hashing and signing.
 */

import * as crypto from 'crypto';
import type {
  GlobalStateManifest,
  ICryptoDependencyHeader,
  IManifestBody,
  IManifestDependency,
  ManifestKind,
  PayloadMode,
  ISelfHealManifestMeta,
  IDivergenceReport,
  ManifestFactoryOptions
} from './ManifestTypes.js';
import { GENESIS_STATE_HASH, GENESIS_PREVIOUS_HASH } from './ManifestTypes.js';
import { canonicalizeHeader, canonicalizeBody, toCanonicalString, canonicalizeDependencyRoot } from './ManifestCanonicalizer.js';
import { sha256, sha256Combine, generateNonce } from './ManifestHasher.js';
import { signTickManifest } from './ManifestSigner.js';

export interface CreateManifestOptions {
  readonly kind?: ManifestKind;
  readonly tickSequence: number;
  readonly payloadMode?: PayloadMode;
  readonly dependencies?: readonly IManifestDependency[];
  readonly payload?: unknown;
  readonly selfHeal?: ISelfHealManifestMeta;
  readonly divergence?: IDivergenceReport;
}

/**
 * Create a new manifest with automatic hashing and signing.
 */
export class ManifestFactory {
  private readonly options: Required<ManifestFactoryOptions>;
  private previousStateHash: string;
  private lastManifest?: GlobalStateManifest;

  constructor(options: ManifestFactoryOptions) {
    this.options = {
      protocolVersion: options.protocolVersion ?? 1,
      worldId: options.worldId,
      worldSeedHash: options.worldSeedHash,
      ruleSetHash: options.ruleSetHash,
      authoritySecret: options.authoritySecret,
      tickRateHz: options.tickRateHz ?? 10,
    };
    this.previousStateHash = GENESIS_STATE_HASH;
  }

  /**
   * Set the previous state hash (for recovery from snapshots).
   */
  public setPreviousStateHash(hash: string): void {
    this.previousStateHash = hash;
  }

  /**
   * Get the last created manifest (for chain operations).
   */
  public getLastManifest(): GlobalStateManifest | undefined {
    return this.lastManifest;
  }

  /**
   * Create a new manifest.
   */
  public create(options: CreateManifestOptions): GlobalStateManifest {
    const {
      kind = 'world_tick',
      tickSequence,
      payloadMode = 'delta',
      dependencies = [],
      payload,
      selfHeal,
      divergence,
    } = options;

    // Compute simulation time (deterministic)
    const simulationTimeMs = tickSequence * (1000 / this.options.tickRateHz);

    // Compute dependency root hash
    const dependencyRootHash = this.computeDependencyRoot(dependencies);

    // Compute payload hash
    const payloadHash = this.computePayloadHash(payload, payloadMode);

    // Compute state hash (combines all hash chains)
    const stateHash = sha256Combine(
      dependencyRootHash,
      payloadHash,
      this.previousStateHash
    );

    // Generate integrity nonce
    const integrityNonce = generateNonce();

    // Create signature
    const authoritySignature = signTickManifest(
      tickSequence,
      stateHash,
      this.previousStateHash,
      this.options.authoritySecret
    );

    // Build header
    const header: ICryptoDependencyHeader = {
      protocolVersion: this.options.protocolVersion,
      kind,
      tickSequence,
      tickRateHz: this.options.tickRateHz,
      simulationTimeMs,
      serverTimestamp: Date.now(), // Wall-clock for ops, not simulation
      worldId: this.options.worldId,
      worldSeedHash: this.options.worldSeedHash,
      ruleSetHash: this.options.ruleSetHash,
      stateHash,
      previousStateHash: this.previousStateHash,
      dependencyRootHash,
      payloadHash,
      authoritySignature,
      signatureAlgorithm: 'HMAC-SHA256',
      integrityNonce,
    };

    // Build body
    const body: IManifestBody = {
      dependencies: [...dependencies],
      payloadMode,
      payload,
      selfHeal,
    };

    const manifest: GlobalStateManifest = {
      header,
      body,
      divergence,
    };

    // Update chain state
    this.previousStateHash = stateHash;
    this.lastManifest = manifest;

    return manifest;
  }

  /**
   * Create a genesis manifest (tick 0).
   */
  public createGenesis(): GlobalStateManifest {
    return this.create({
      kind: 'snapshot',
      tickSequence: 0,
      payloadMode: 'full_snapshot',
      dependencies: [],
      payload: { type: 'GENESIS', worldId: this.options.worldId },
    });
  }

  /**
   * Create a snapshot manifest (periodic full state).
   */
  public createSnapshot(
    tickSequence: number,
    payload: unknown,
    dependencies: readonly IManifestDependency[],
    selfHeal?: ISelfHealManifestMeta
  ): GlobalStateManifest {
    return this.create({
      kind: 'snapshot',
      tickSequence,
      payloadMode: 'full_snapshot',
      dependencies,
      payload,
      selfHeal,
    });
  }

  /**
   * Create a rollback checkpoint.
   */
  public createRollback(
    tickSequence: number,
    payload: unknown,
    dependencies: readonly IManifestDependency[]
  ): GlobalStateManifest {
    return this.create({
      kind: 'rollback',
      tickSequence,
      payloadMode: 'full_snapshot',
      dependencies,
      payload,
    });
  }

  /**
   * Create a resync manifest (for divergence recovery).
   */
  public createResync(
    tickSequence: number,
    payload: unknown,
    divergence: IDivergenceReport
  ): GlobalStateManifest {
    return this.create({
      kind: 'resync',
      tickSequence,
      payloadMode: 'full_snapshot',
      dependencies: [],
      payload,
      divergence,
    });
  }

  /**
   * Create a self-heal manifest.
   */
  public createSelfHeal(
    tickSequence: number,
    selfHeal: ISelfHealManifestMeta,
    dependencies: readonly IManifestDependency[]
  ): GlobalStateManifest {
    return this.create({
      kind: 'self_heal',
      tickSequence,
      payloadMode: 'hash_only',
      dependencies,
      payload: undefined,
      selfHeal,
    });
  }

  /**
   * Create an audit manifest (admin/compliance).
   */
  public createAudit(
    tickSequence: number,
    payload: unknown,
    description: string
  ): GlobalStateManifest {
    return this.create({
      kind: 'audit',
      tickSequence,
      payloadMode: 'event_log',
      dependencies: [],
      payload: { description, ...payload as object },
    });
  }

  /**
   * Create a delta tick manifest.
   */
  public createDeltaTick(
    tickSequence: number,
    delta: unknown,
    dependencies: readonly IManifestDependency[]
  ): GlobalStateManifest {
    return this.create({
      kind: 'world_tick',
      tickSequence,
      payloadMode: 'delta',
      dependencies,
      payload: delta,
    });
  }

  /**
   * Compute dependency root hash.
   */
  private computeDependencyRoot(deps: readonly IManifestDependency[]): string {
    if (deps.length === 0) return sha256('');

    // Sort and hash each dependency
    const sorted = [...deps].sort((a, b) => a.componentId.localeCompare(b.componentId));
    const hashes = sorted.map(dep => {
      const canonical = JSON.stringify({
        componentId: dep.componentId,
        kind: dep.kind,
        checksum: dep.checksum,
        schemaVersion: dep.schemaVersion,
        entityCount: dep.entityCount,
        changedSinceTick: dep.changedSinceTick,
      });
      return sha256(canonical);
    });

    // Build merkle tree
    return this.merkleRoot(hashes);
  }

  /**
   * Compute payload hash based on mode.
   */
  private computePayloadHash(payload: unknown, mode: PayloadMode): string {
    switch (mode) {
      case 'hash_only':
        return sha256('');
      case 'event_log':
        return sha256(JSON.stringify(payload ?? []));
      case 'full_snapshot':
      case 'delta':
        return payload !== undefined ? sha256(toCanonicalString(payload)) : sha256('');
    }
  }

  /**
   * Build merkle root from hashes.
   */
  private merkleRoot(hashes: string[]): string {
    if (hashes.length === 0) return sha256('');
    if (hashes.length === 1) return hashes[0];

    const pairs: string[] = [];
    for (let i = 0; i < hashes.length; i += 2) {
      const left = hashes[i];
      const right = hashes[i + 1] ?? left;
      pairs.push(sha256Combine(left, right));
    }

    return this.merkleRoot(pairs);
  }
}

/**
 * Create a default factory for the server.
 */
export function createManifestFactory(options: ManifestFactoryOptions): ManifestFactory {
  return new ManifestFactory(options);
}

/**
 * Quick helper to create a manifest from current game state.
 */
export function createTickManifest(
  tickSequence: number,
  payload: unknown,
  worldId: string,
  secret: string
): GlobalStateManifest {
  const factory = new ManifestFactory({
    worldId,
    worldSeedHash: GENESIS_STATE_HASH,
    ruleSetHash: GENESIS_STATE_HASH,
    authoritySecret: secret,
    tickRateHz: 10,
  });
  return factory.create({
    kind: 'world_tick',
    tickSequence,
    payloadMode: payload ? 'delta' : 'hash_only',
    payload,
  });
}