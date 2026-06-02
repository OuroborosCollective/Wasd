/**
 * GlobalStateManifest Core Types
 * 
 * Design principle: Manifest klein halten, Funktionen drumherum stark machen.
 * 
 * This module defines the minimal type surface. Actual logic (hashing, signing,
 * verification) lives in companion modules. The manifest is a data container only.
 */

import type { HealthSnapshot } from '../liveheal/LiveHealTypes.js';

// ─── Genesis Constants ─────────────────────────────────────────────────────────

/** Hash for Tick 0 - the chain starting point */
export const GENESIS_STATE_HASH = '0'.repeat(64);

/** Genesis previousStateHash marker */
export const GENESIS_PREVIOUS_HASH = 'GENESIS';

// ─── Manifest Kind ────────────────────────────────────────────────────────────

/**
 * The kind of manifest determines how it should be processed.
 * Different kinds have different trust requirements and replay rules.
 */
export type ManifestKind =
  | 'world_tick'    // Regular 10Hz simulation tick
  | 'snapshot'      // Full world state snapshot (periodic)
  | 'rollback'      // Authoritative rollback checkpoint
  | 'resync'        // Client divergence recovery
  | 'audit'         // Admin audit / compliance log
  | 'self_heal';    // Self-healing repair manifest

// ─── Payload Mode ─────────────────────────────────────────────────────────────

/**
 * How much payload data is included in the manifest.
 * Controls bandwidth and processing cost.
 */
export type PayloadMode =
  | 'full_snapshot' // Complete world state
  | 'delta'         // Only changes since last manifest
  | 'hash_only'     // State hash only, no payload
  | 'event_log';    // Only events, reconstructed state

// ─── Dependency Kind ───────────────────────────────────────────────────────────

/**
 * The subsystem a dependency belongs to.
 * Enables granular divergence debugging.
 */
export type DependencyKind =
  | 'entity_group'
  | 'physics'
  | 'npc_ai'
  | 'quest'
  | 'inventory'
  | 'economy'
  | 'chunk'
  | 'asset'
  | 'ruleset'
  | 'self_heal';

// ─── Signature Algorithm ───────────────────────────────────────────────────────

export type SignatureAlgorithm = 'HMAC-SHA256' | 'Ed25519' | 'RSA-PSS-SHA256';

// ─── Crypto Dependency Header ──────────────────────────────────────────────────

/**
 * The cryptographic header for every manifest.
 * Contains identity, sequencing, and integrity information.
 */
export interface ICryptoDependencyHeader {
  readonly protocolVersion: number;
  readonly kind: ManifestKind;

  readonly tickSequence: number;
  readonly tickRateHz: number;
  /** Deterministic simulation time in ms (tickSequence * 100 for 10Hz) */
  readonly simulationTimeMs: number;
  /** Wall-clock timestamp for ops/debugging (not for simulation) */
  readonly serverTimestamp: number;

  readonly worldId: string;
  readonly worldSeedHash: string;
  readonly ruleSetHash: string;

  readonly stateHash: string;
  readonly previousStateHash: string;
  readonly dependencyRootHash: string;
  readonly payloadHash: string;

  readonly authoritySignature: string;
  readonly signatureAlgorithm: SignatureAlgorithm;

  /** Unique nonce for this manifest - prevents replay attacks */
  readonly integrityNonce: string;

  /** Payload mode indicating the type of payload content */
  readonly payloadMode?: 'full_snapshot' | 'delta' | 'minimal';
}

// ─── Dependency Entry ──────────────────────────────────────────────────────────

export interface IManifestDependency {
  readonly componentId: string;
  readonly kind: DependencyKind;
  readonly checksum: string;
  readonly schemaVersion: number;
  readonly entityCount?: number;
  readonly changedSinceTick?: number;
}

// ─── SelfHeal Metadata ─────────────────────────────────────────────────────────

export interface ISelfHealManifestMeta {
  readonly healState: 'healthy' | 'degraded' | 'healed' | 'quarantined';
  readonly anomalyScore: number;
  readonly patchedSubsystems: readonly string[];
  readonly lastHealthSnapshot?: HealthSnapshot;
}

// ─── Client Input Manifest ────────────────────────────────────────────────────

/**
 * For client-side inputs that must be verified server-side.
 * Client NEVER sets world state directly - only intent.
 */
export interface IClientInputManifest {
  readonly playerId: string;
  readonly clientTick: number;
  readonly targetServerTick: number;
  readonly inputHash: string;
  readonly inputPayload: unknown;
  readonly clientNonce: string;
}

// ─── Divergence Detection ─────────────────────────────────────────────────────

export interface IDivergenceReport {
  readonly expectedHash: string;
  readonly actualHash: string;
  readonly divergenceTick: number;
  readonly divergedComponents: readonly string[];
  readonly rollbackAnchorTick?: number;
  readonly snapshotId?: string;
}

// ─── Manifest Body (Core Data) ─────────────────────────────────────────────────

export interface IManifestBody {
  readonly dependencies: readonly IManifestDependency[];
  readonly payloadMode: PayloadMode;
  /** Actual payload depends on payloadMode */
  readonly payload: unknown;
  readonly selfHeal?: ISelfHealManifestMeta;
}

// ─── Full Global State Manifest ────────────────────────────────────────────────

export interface GlobalStateManifest {
  readonly header: ICryptoDependencyHeader;
  readonly body: IManifestBody;
  readonly divergence?: IDivergenceReport;
}

// ─── Replay Guard State ────────────────────────────────────────────────────────

export interface IReplayGuardState {
  readonly highestAcceptedTick: number;
  readonly seenNonces: readonly string[];
  readonly quarantinedNonces: readonly string[];
}

// ─── Chain Validation ─────────────────────────────────────────────────────────

export interface IChainValidationResult {
  readonly valid: boolean;
  readonly error?: string;
  readonly lastValidTick: number;
  readonly gaps: readonly number[];
}

// ─── Factory Options ──────────────────────────────────────────────────────────

export interface ManifestFactoryOptions {
  readonly protocolVersion?: number;
  readonly worldId: string;
  readonly worldSeedHash: string;
  readonly ruleSetHash: string;
  readonly authoritySecret: string;
  readonly tickRateHz?: number;
}