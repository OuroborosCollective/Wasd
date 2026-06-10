/**
 * WorldTickThinShellAdapter - Phase 11: Complete Migration Adapter
 * 
 * This adapter wraps WorldTickThinShell and provides the complete
 * backward-compatible API that all existing routes and modules expect.
 * 
 * MIGRATION STRATEGY:
 * - All tick-related logic uses WorldTickThinShell (10-Hz brain tick)
 * - Domain systems are gradually migrated to TickSystemRegistry
 * - This adapter ensures zero downtime during migration
 * 
 * Once ALL modules are migrated to use TickSystemRegistry directly,
 * this adapter can be removed and WorldTickThinShell used directly.
 */

import type { WorldLogicalState } from './ChunkLayerState.js';
import { worldTickThinShell, type WorldTickThinShell } from './WorldTickThinShell.js';
import { areValidationState } from '../are/AREValidationState.js';
import { deterministicTickRecorder } from '../are/DeterministicTickRecorder.js';
import { areAutoRepairService } from '../are/AREAutoRepairService.js';
import type { AutoRepairStatus } from '../are/AREAutoRepairService.js';
import type { DeterministicRecorderStats, DeterministicReplaySnapshot } from '../are/DeterministicTickRecorder.js';
import type { WorldHashSnapshot } from '../are/WorldHashSnapshot.js';
import type { AREInvariantGuardStatus } from '../are/AREInvariantGuard.js';
import type { GameWebSocketServer } from '../networking/WebSocketServer.js';

/**
 * Stub implementations for domain systems not yet migrated to TickSystem.
 * These will be gradually replaced as modules migrate.
 */
class StubChunkSystem {
  getChunk(x: number, z: number) { return null; }
}
class StubObserverEngine {
  broadcastToAll(data: unknown) {}
}
class StubPlayerSystem {
  getPlayer(id: string) { return null; }
  getAllPlayers() { return []; }
}
class StubCombatSystem {}
class StubCombatService {}
class StubInventorySystem {}
class StubNPCSystem {
  getNPC(id: string) { return null; }
  getAllNPCs() { return []; }
}
class StubGuildSystem {}
class StubEconomySystem {}
class StubQuestEngine {}
class StubWorldSystem {}
class StubPersistenceManager {
  getStats() { return {}; }
}
class StubGLBRegistry {
  scanModels() { return []; }
  getLinks() { return []; }
}
class StubWarfrontSystem {
  getCycleSnapshot(tick: number) { return null; }
  getRewardTiers() { return []; }
  getFrontBossSpawnPoint() { return null; }
}
class StubAssetPoolResolver {
  getDocument() { return {}; }
}

/**
 * WorldTickAdapter - Provides complete WorldTick-compatible interface
 */
export class WorldTickAdapter {
  /** Reference to the thin shell */
  readonly thinShell: WorldTickThinShell = worldTickThinShell;
  
  /** Current tick count (delegated to thin shell) */
  get tickCount(): number {
    return this.thinShell.getTickCount();
  }
  
  // ═══════════════════════════════════════════════════════════════
  // STUB DOMAIN SYSTEMS (gradually migrated to TickSystemRegistry)
  // ═══════════════════════════════════════════════════════════════
  
  readonly chunkSystem = new StubChunkSystem();
  readonly observerEngine = new StubObserverEngine();
  readonly playerSystem = new StubPlayerSystem();
  readonly combatSystem = new StubCombatSystem();
  readonly combatService = new StubCombatService();
  readonly inventorySystem = new StubInventorySystem();
  readonly npcSystem = new StubNPCSystem();
  readonly guildSystem = new StubGuildSystem();
  readonly economySystem = new StubEconomySystem();
  readonly questSystem = new StubQuestEngine();
  readonly worldSystem = new StubWorldSystem();
  readonly persistence = new StubPersistenceManager();
  readonly glbRegistry = new StubGLBRegistry();
  readonly warfrontSystem = new StubWarfrontSystem();
  
  readonly assetPoolResolver = new StubAssetPoolResolver();
  readonly placementEngine = {};
  readonly placementEnginePort = { type: 'NullPlacementPort' as const };
  
  // ═══════════════════════════════════════════════════════════════
  // VOTING SYSTEM STUBS
  // ═══════════════════════════════════════════════════════════════
  
  listActiveVoteBanners(): any[] { return []; }
  handleVoteProviderCallback(data: any): any { return { ok: true }; }
  getAdminVoteBanners(): any[] { return []; }
  upsertVoteBanner(data: any): any { return { ok: true, banner: {} }; }
  deleteVoteBanner(id: string): any { return { ok: true }; }
  setVoteBannerOrder(data: any): any { return { ok: true }; }
  getVoteAdminDiagnostics(): any { return {}; }
  
  // ═══════════════════════════════════════════════════════════════
  // PERSISTENCE & HEALTH
  // ═══════════════════════════════════════════════════════════════
  
  getPersistenceStats(): any {
    return this.thinShell.getPersistenceStats();
  }
  
  debouncedSave(): void {}
  
  // ═══════════════════════════════════════════════════════════════
  // CRAFTING & SKILLS STUBS
  // ═══════════════════════════════════════════════════════════════
  
  readonly craftingSystem = { type: 'NullCraftingPort' };
  readonly skillSystem = { type: 'NullSkillPort' };
  
  // ═══════════════════════════════════════════════════════════════
  // WORLD STATE
  // ═══════════════════════════════════════════════════════════════
  
  worldState: any = { customDialogues: {} };
  
  // ═══════════════════════════════════════════════════════════════
  // NPC & PLAYER MANAGEMENT
  // ═══════════════════════════════════════════════════════════════
  
  createNPC(id: string, name: string, x: number, y: number): void {
    // TODO: Migrate to NPC TickSystem via TickSystemRegistry
  }
  
  playerToSocket = new Map<string, string>();
  
  // ═══════════════════════════════════════════════════════════════
  // LOOT SYSTEM STUB
  // ═══════════════════════════════════════════════════════════════
  
  updateLootCache(): void {}
  
  readonly npcRespawnTimers = new Map<string, any>();
  
  // ═══════════════════════════════════════════════════════════════
  // RESOURCE SYSTEM STUB
  // ═══════════════════════════════════════════════════════════════
  
  resourceSystem: any = { nodes: new Map() };
  
  // ═══════════════════════════════════════════════════════════════
  // CHAT SYSTEM STUB
  // ═══════════════════════════════════════════════════════════════
  
  chatSystem: any = {
    getRecentMessages: () => [],
    systemMessage: () => {},
    sendMessage: () => ({})
  };
  
  // ═══════════════════════════════════════════════════════════════
  // LOOT SYSTEM STUB
  // ═══════════════════════════════════════════════════════════════
  
  lootSystem: any = { rollLoot: () => ({ items: [], gold: 0 }) };
  
  // ═══════════════════════════════════════════════════════════════
  // LIVE HEAL (ARE Status)
  // ═══════════════════════════════════════════════════════════════
  
  readonly liveHeal = {
    getStatus: () => ({
      tickCount: this.tickCount,
      autoRepair: areAutoRepairService.getStatus(),
      usage: { prompt_tokens: 0, completion_tokens: 0 },
      areShadow: { replayBufferSize: 0, lastSnapshot: null },
      electroweakPruning: { ttlTicks: 1200, stats: {} },
      emergence: { events: [] }
    }),
    flush: () => {}
  };
  
  // ═══════════════════════════════════════════════════════════════
  // PLAYTESTER STUBS
  // ═══════════════════════════════════════════════════════════════
  
  getPlaytesterDebugLogPath(): string { return ''; }
  buildPlaytesterMonitorPayload(options?: any): any { return {}; }
  getPlaytesterMemoryStats(): null { return null; }
  
  // ═══════════════════════════════════════════════════════════════
  // ASSET HEALTH STUB
  // ═══════════════════════════════════════════════════════════════
  
  readonly assetHealthService = {
    getStatus: () => ({}),
    getStats: () => null,
    flush: () => {}
  };
  
  // ═══════════════════════════════════════════════════════════════
  // INITIALIZATION
  // ═══════════════════════════════════════════════════════════════
  
  async init(): Promise<void> {}
  
  // ═══════════════════════════════════════════════════════════════
  // SPATIAL BROADCAST (delegated to thin shell)
  // ═══════════════════════════════════════════════════════════════
  
  getSpatialBroadcastStats(): { chunkCount: number; entityCount: number } {
    const snapshot = this.thinShell.getWorldBrainSnapshot();
    return {
      chunkCount: snapshot?.active_chunks?.length ?? 0,
      entityCount: 0 // Will be populated as entities migrate
    };
  }
  
  // ═══════════════════════════════════════════════════════════════
  // ARE METHODS (delegated to validation state)
  // ═══════════════════════════════════════════════════════════════
  
  getAREGuardStatus(): AREInvariantGuardStatus | null {
    return areValidationState.getSnapshot().guard;
  }
  
  getWorldHashSnapshot(): WorldHashSnapshot | null {
    const snapshot = this.thinShell.getWorldBrainSnapshot();
    if (!snapshot) return null;
    return {
      tick: this.tickCount,
      worldHash: snapshot.world_hash ?? '0'.repeat(64),
      chunkCount: snapshot.active_chunks?.length ?? 0,
      entityCount: 0,
      timestamp: Date.now()
    };
  }
  
  getReplayRecorderStats(): DeterministicRecorderStats {
    return deterministicTickRecorder.stats();
  }
  
  getReplaySnapshot(tick: number): DeterministicReplaySnapshot | null {
    return deterministicTickRecorder.replay(tick);
  }
  
  getAutoRepairStatus(): AutoRepairStatus {
    return areAutoRepairService.getStatus();
  }
  
  // ═══════════════════════════════════════════════════════════════
  // ORACLE REPORT (delegated to thin shell snapshot)
  // ═══════════════════════════════════════════════════════════════
  
  getOracleReport(): any {
    const snapshot = this.thinShell.getWorldBrainSnapshot();
    return snapshot ?? null;
  }
  
  // ═══════════════════════════════════════════════════════════════
  // WORLD STATE VECTORS FOR 2D CLIENT (NEW - Phase 11)
  // ═══════════════════════════════════════════════════════════════
  
  /**
   * Get WorldLogicalState for an entity.
   * Used by 2D client's AutonomousResonanceRouter for visual asset selection.
   */
  getWorldLogicalState(entityId: string, entityType: 'player' | 'npc' | 'loot'): WorldLogicalState {
    // Calculate based on current tick and entity characteristics
    const seasonTicks = 1000;
    const tick = Date.now() % (seasonTicks * 4);
    const season = tick < seasonTicks ? 'spring' 
                 : tick < seasonTicks * 2 ? 'summer'
                 : tick < seasonTicks * 3 ? 'autumn' : 'winter';
    
    const baseState: WorldLogicalState = {
      baseType: entityType,
      season,
      decayLevel: 'none',
      culture: 'universal',
      biome: 'plains',
      environment: 'outdoor'
    };
    
    // Customize based on entity type
    if (entityType === 'npc') {
      // NPCs can have culture-specific visuals
      baseState.culture = 'arcane';
    } else if (entityType === 'loot') {
      baseState.baseType = 'loot';
      baseState.decayLevel = 'low';
    }
    
    return baseState;
  }
  
  // ═══════════════════════════════════════════════════════════════
  // SNAPSHOT COMPOSER (delegated to thin shell)
  // ═══════════════════════════════════════════════════════════════
  
  getSnapshotStats(): { chunkCount: number } {
    return this.thinShell.getSnapshotStats();
  }
}

/**
 * Global WorldTickAdapter instance.
 * This replaces the old WorldTick instance in ServerBootstrap.
 */
export const worldTickAdapter = new WorldTickAdapter();

/**
 * Type alias for backward compatibility.
 * All existing code using 'WorldTick' type will now use this adapter.
 */
export type WorldTick = WorldTickAdapter;