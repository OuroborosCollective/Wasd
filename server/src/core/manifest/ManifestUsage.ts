/**
 * Manifest System Usage Examples
 * 
 * This file demonstrates how to use the manifest system in practice.
 * Use these patterns when integrating with WorldTick or other systems.
 */

import {
  ManifestFactory,
  ManifestReplayGuard,
  verifyManifest,
  GENESIS_STATE_HASH,
  GENESIS_PREVIOUS_HASH,
  type GlobalStateManifest,
  type IManifestDependency,
  type ManifestKind,
  type PayloadMode,
} from './index.js';

/**
 * Example 1: Server Bootstrap with Manifest
 * 
 * Initialize the manifest system when the server starts.
 */
export function setupManifestSystem(worldId: string, authoritySecret: string) {
  const factory = new ManifestFactory({
    worldId,
    worldSeedHash: GENESIS_STATE_HASH,
    ruleSetHash: GENESIS_STATE_HASH,
    authoritySecret,
    tickRateHz: 10,
  });

  const replayGuard = new ManifestReplayGuard();

  // Create genesis manifest
  const genesis = factory.createGenesis();

  return { factory, replayGuard, genesis };
}

/**
 * Example 2: Create a Delta Tick Manifest
 * 
 * For regular 10Hz simulation ticks, create delta manifests.
 */
export function createDeltaTick(
  factory: ManifestFactory,
  tickSequence: number,
  deltaPayload: {
    players?: unknown[];
    npcs?: unknown[];
    events?: unknown[];
  },
  dependencies: readonly IManifestDependency[]
): GlobalStateManifest {
  return factory.create({
    kind: 'world_tick',
    tickSequence,
    payloadMode: 'delta',
    dependencies,
    payload: deltaPayload,
  });
}

/**
 * Example 3: Create a Snapshot Manifest
 * 
 * For periodic full state snapshots (e.g., every 600 ticks).
 */
export function createSnapshot(
  factory: ManifestFactory,
  tickSequence: number,
  fullState: {
    players: unknown[];
    npcs: unknown[];
    world: unknown;
    economy: unknown;
  },
  dependencies: readonly IManifestDependency[]
): GlobalStateManifest {
  return factory.createSnapshot(
    tickSequence,
    fullState,
    dependencies
  );
}

/**
 * Example 4: Handle Client Resync
 * 
 * When a client diverges, create a resync manifest.
 */
export function handleDivergence(
  factory: ManifestFactory,
  currentTick: number,
  clientTick: number,
  serverState: unknown
): GlobalStateManifest {
  return factory.createResync(currentTick, serverState, {
    expectedHash: GENESIS_STATE_HASH, // Would come from actual computation
    actualHash: GENESIS_STATE_HASH,   // Would come from client state
    divergenceTick: clientTick,
    divergedComponents: ['entity_group', 'physics'],
    snapshotId: `snapshot_${Math.floor(currentTick / 600) * 600}`,
  });
}

/**
 * Example 5: Verify Manifest in WebSocket Handler
 * 
 * When receiving a manifest from the server, verify it.
 */
export function verifyTickManifest(
  manifest: GlobalStateManifest,
  authoritySecret: string,
  previousHash?: string
): { valid: boolean; errors: string[] } {
  const result = verifyManifest(manifest, authoritySecret, previousHash);
  return {
    valid: result.valid,
    errors: [...result.errors],
  };
}

/**
 * Example 6: Replay Guard Integration
 * 
 * Before accepting a tick, check with replay guard.
 */
export function checkReplayGuard(
  guard: ManifestReplayGuard,
  manifest: GlobalStateManifest
): { accepted: boolean; reason?: string } {
  return guard.accept(manifest);
}

/**
 * Example 7: SelfHeal Manifest
 * 
 * When LiveHeal repairs something, create a self-heal manifest.
 */
export function createSelfHealManifest(
  factory: ManifestFactory,
  tickSequence: number,
  healMeta: {
    healState: 'healthy' | 'degraded' | 'healed' | 'quarantined';
    anomalyScore: number;
    patchedSubsystems: string[];
  },
  dependencies: readonly IManifestDependency[]
): GlobalStateManifest {
  return factory.createSelfHeal(tickSequence, healMeta, dependencies);
}

/**
 * Example 8: Dependency Tracking
 * 
 * Track what changed in each subsystem for granular divergence detection.
 */
export function createDependencies(
  systems: {
    entities: { checksum: string; entityCount: number };
    physics: { checksum: string };
    npc_ai: { checksum: string };
    economy: { checksum: string };
    quest: { checksum: string };
  }
): IManifestDependency[] {
  return [
    { componentId: 'entity_group', kind: 'entity_group', checksum: systems.entities.checksum, schemaVersion: 1, entityCount: systems.entities.entityCount },
    { componentId: 'physics', kind: 'physics', checksum: systems.physics.checksum, schemaVersion: 1 },
    { componentId: 'npc_ai', kind: 'npc_ai', checksum: systems.npc_ai.checksum, schemaVersion: 1 },
    { componentId: 'economy', kind: 'economy', checksum: systems.economy.checksum, schemaVersion: 1 },
    { componentId: 'quest', kind: 'quest', checksum: systems.quest.checksum, schemaVersion: 1 },
  ];
}

/**
 * Example 9: Audit Manifest for Admin Operations
 * 
 * Create an audit trail for admin actions.
 */
export function createAdminAudit(
  factory: ManifestFactory,
  tickSequence: number,
  adminAction: {
    adminId: string;
    action: string;
    targetId: string;
    details: unknown;
  }
): GlobalStateManifest {
  return factory.createAudit(
    tickSequence,
    adminAction,
    `Admin ${adminAction.adminId}: ${adminAction.action}`
  );
}

/**
 * Example 10: Chunk-Based Dependency
 * 
 * Track chunk-level dependencies for spatial updates.
 */
export function createChunkDependency(
  chunkX: number,
  chunkZ: number,
  checksum: string,
  entityCount: number,
  changedSinceTick: number
): IManifestDependency {
  return {
    componentId: `chunk_${chunkX}_${chunkZ}`,
    kind: 'chunk',
    checksum,
    schemaVersion: 1,
    entityCount,
    changedSinceTick,
  };
}

/**
 * Integration checklist for WorldTick:
 * 
 * 1. Import manifest system
 * 2. Initialize factory in constructor
 * 3. Create tick dependencies from systems
 * 4. Create manifest each tick (or periodically)
 * 5. Verify manifest before broadcast
 * 6. Track state hashes for divergence detection
 * 7. Use replay guard to prevent stale updates
 * 8. Include self-heal metadata when applicable
 */
export const INTEGRATION_CHECKLIST = [
  'Initialize ManifestFactory with worldId and secret',
  'Create dependency array from game systems each tick',
  'Call factory.createDeltaTick() or createSnapshot()',
  'Verify manifest with replay guard before broadcast',
  'Track previousStateHash for chain continuity',
  'Include SelfHeal metadata when system is degraded',
  'Handle divergence with createResync()',
] as const;