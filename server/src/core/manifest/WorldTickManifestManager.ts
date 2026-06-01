/**
 * WorldTick Manifest Integration
 * 
 * Integrates the manifest system into WorldTick for deterministic
 * server-authoritative state management.
 * 
 * Design: Separation of concerns - WorldTick stays focused on simulation,
 * this module handles manifest creation and management.
 */

import { createManifestFactory, type ManifestFactory, type GlobalStateManifest, type IManifestDependency, GENESIS_STATE_HASH } from './index.js';
import { sha256 } from './ManifestHasher.js';
import { globalReplayGuard, type ManifestReplayGuard } from './ManifestReplayGuard.js';

export interface WorldTickManifestConfig {
  worldId: string;
  authoritySecret: string;
  tickRateHz?: number;
}

export interface WorldTickDependencySources {
  playerCount: number;
  npcCount: number;
  lootCount: number;
  resourceCount: number;
  questActiveCount: number;
  chunkHashes: Map<string, string>;
  economyChecksum: string;
}

const SNAPSHOT_INTERVAL = 600; // Every 60 seconds at 10Hz

/**
 * Manages manifest creation for WorldTick.
 * Tracks state for chain continuity and creates appropriate manifests.
 */
export class WorldTickManifestManager {
  private factory: ManifestFactory;
  private replayGuard: ManifestReplayGuard;
  private lastSnapshotTick = 0;
  private lastStateHash = GENESIS_STATE_HASH;
  private dependencyCache = new Map<string, string>();

  constructor(config: WorldTickManifestConfig) {
    this.factory = createManifestFactory({
      worldId: config.worldId,
      worldSeedHash: GENESIS_STATE_HASH,
      ruleSetHash: GENESIS_STATE_HASH,
      authoritySecret: config.authoritySecret,
      tickRateHz: config.tickRateHz ?? 10,
    });
    this.replayGuard = globalReplayGuard;
  }

  /**
   * Get the replay guard for tick verification.
   */
  public getReplayGuard(): ManifestReplayGuard {
    return this.replayGuard;
  }

  /**
   * Get the factory for direct manifest creation.
   */
  public getFactory(): ManifestFactory {
    return this.factory;
  }

  /**
   * Check if we should create a snapshot this tick.
   */
  public shouldSnapshot(currentTick: number): boolean {
    return currentTick - this.lastSnapshotTick >= SNAPSHOT_INTERVAL;
  }

  /**
   * Build dependency entries from current game state.
   */
  public buildDependencies(sources: WorldTickDependencySources): IManifestDependency[] {
    const deps: IManifestDependency[] = [];

    // Entity group - all live entities
    const entityChecksum = sha256(JSON.stringify({
      players: sources.playerCount,
      npcs: sources.npcCount,
      loot: sources.lootCount,
      resources: sources.resourceCount,
    }));
    deps.push({
      componentId: 'entity_group',
      kind: 'entity_group',
      checksum: entityChecksum,
      schemaVersion: 1,
      entityCount: sources.playerCount + sources.npcCount,
    });

    // Quest system
    deps.push({
      componentId: 'quest',
      kind: 'quest',
      checksum: sha256(JSON.stringify({ active: sources.questActiveCount })),
      schemaVersion: 1,
    });

    // Economy system
    deps.push({
      componentId: 'economy',
      kind: 'economy',
      checksum: sources.economyChecksum,
      schemaVersion: 1,
    });

    // Chunk dependencies (top N visible chunks)
    let chunkIndex = 0;
    for (const [chunkKey, chunkHash] of sources.chunkHashes) {
      if (chunkIndex >= 9) break; // Limit to 9 chunks
      deps.push({
        componentId: `chunk_${chunkKey}`,
        kind: 'chunk',
        checksum: chunkHash,
        schemaVersion: 1,
      });
      chunkIndex++;
    }

    // Ruleset
    deps.push({
      componentId: 'ruleset',
      kind: 'ruleset',
      checksum: this.dependencyCache.get('ruleset') ?? GENESIS_STATE_HASH,
      schemaVersion: 1,
    });

    return deps;
  }

  /**
   * Create a delta tick manifest.
   */
  public createDeltaTick(
    tickSequence: number,
    delta: {
      players?: unknown[];
      npcs?: unknown[];
      events?: unknown[];
      loot?: unknown[];
    },
    dependencies: readonly IManifestDependency[]
  ): GlobalStateManifest {
    const manifest = this.factory.create({
      kind: 'world_tick',
      tickSequence,
      payloadMode: 'delta',
      dependencies,
      payload: delta,
    });

    this.lastStateHash = manifest.header.stateHash;
    return manifest;
  }

  /**
   * Create a snapshot manifest (full state).
   */
  public createSnapshot(
    tickSequence: number,
    fullState: {
      players: unknown[];
      npcs: unknown[];
      world: unknown;
      economy: unknown;
    },
    dependencies: readonly IManifestDependency[],
    selfHeal?: { healState: string; anomalyScore: number; patchedSubsystems: string[] }
  ): GlobalStateManifest {
    const manifest = this.factory.createSnapshot(
      tickSequence,
      fullState,
      dependencies,
      selfHeal ? {
        healState: selfHeal.healState as 'healthy' | 'degraded' | 'healed' | 'quarantined',
        anomalyScore: selfHeal.anomalyScore,
        patchedSubsystems: selfHeal.patchedSubsystems,
      } : undefined
    );

    this.lastSnapshotTick = tickSequence;
    this.lastStateHash = manifest.header.stateHash;
    return manifest;
  }

  /**
   * Create a resync manifest for diverged clients.
   */
  public createResync(
    tickSequence: number,
    serverState: unknown,
    divergence: {
      expectedHash: string;
      actualHash: string;
      divergenceTick: number;
      divergedComponents: string[];
    }
  ): GlobalStateManifest {
    const manifest = this.factory.createResync(tickSequence, serverState, {
      ...divergence,
      snapshotId: `snapshot_${Math.floor(tickSequence / SNAPSHOT_INTERVAL) * SNAPSHOT_INTERVAL}`,
    });

    this.lastStateHash = manifest.header.stateHash;
    return manifest;
  }

  /**
   * Create a self-heal manifest.
   */
  public createSelfHeal(
    tickSequence: number,
    healMeta: {
      healState: 'healthy' | 'degraded' | 'healed' | 'quarantined';
      anomalyScore: number;
      patchedSubsystems: string[];
    },
    dependencies: readonly IManifestDependency[]
  ): GlobalStateManifest {
    const manifest = this.factory.createSelfHeal(tickSequence, healMeta, dependencies);
    this.lastStateHash = manifest.header.stateHash;
    return manifest;
  }

  /**
   * Verify and accept a manifest (for replay guard).
   */
  public acceptManifest(manifest: GlobalStateManifest): { accepted: boolean; reason?: string } {
    return this.replayGuard.accept(manifest);
  }

  /**
   * Get last state hash for chain operations.
   */
  public getLastStateHash(): string {
    return this.lastStateHash;
  }

  /**
   * Get current snapshot tick.
   */
  public getLastSnapshotTick(): number {
    return this.lastSnapshotTick;
  }
}

/**
 * Quick helper to create manifest manager for WorldTick.
 */
export function createWorldTickManifestManager(
  worldId: string,
  authoritySecret: string
): WorldTickManifestManager {
  return new WorldTickManifestManager({
    worldId,
    authoritySecret,
    tickRateHz: 10,
  });
}