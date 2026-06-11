import type { WorldLogicalState } from './ChunkLayerState.js';
import { worldTickThinShell, type WorldTickThinShell } from './WorldTickThinShell.js';

type AutoRepairStatus = { ok: boolean; status: string };
type DeterministicRecorderStats = { recordedTicks: number; replayBufferSize: number };
type DeterministicReplaySnapshot = { tick: number; snapshot: unknown };
type WorldHashSnapshot = { tick: number; worldHash: string; chunkCount: number; entityCount: number; timestamp: number };
type AREInvariantGuardStatus = { ok: boolean; invariant: string };

const validationState = { getSnapshot: () => ({ guard: { ok: true, invariant: 'WorldThinShell' } as AREInvariantGuardStatus }) };
const tickRecorder = {
  stats: (): DeterministicRecorderStats => ({ recordedTicks: 0, replayBufferSize: 0 }),
  replay: (tick: number): DeterministicReplaySnapshot | null => ({ tick, snapshot: null }),
};
const autoRepairService = { getStatus: (): AutoRepairStatus => ({ ok: true, status: 'available' }) };

class StubChunkSystem { getChunk(_x: number, _z: number) { return null; } }
class StubObserverEngine {
  private readonly positions = new Map<string, unknown>();
  broadcastToAll(_data: unknown) {}
  register(id: string, value: unknown = {}): void { this.positions.set(id, value); }
  updatePosition(id: string, position: unknown): void { this.positions.set(id, position); }
}
class StubPlayerSystem { getPlayer(_id: string) { return null; } getAllPlayers() { return []; } }
class StubCombatSystem {}
class StubCombatService {}
class StubInventorySystem {}
class StubNPCSystem { getNPC(_id: string) { return null; } getAllNPCs() { return []; } }
class StubGuildSystem {}
class StubEconomySystem {}
class StubQuestEngine {}
class StubWorldSystem {}
class StubPersistenceManager { getStats() { return {}; } }
class StubGLBRegistry { scanModels() { return []; } getLinks() { return []; } }
class StubWarfrontSystem {
  getCycleSnapshot(_tick?: number) { return null; }
  getRewardTiers() { return []; }
  getFrontBossSpawnPoint() { return null; }
  getStatusForPlayer(playerId: string) { return { ok: true, playerId, contribution: 0, rewardsClaimed: false, cycle: this.getCycleSnapshot() }; }
  registerContribution(playerId: string, amount = 0, reason = 'api') { return { ok: true, playerId, amount, reason, totalContribution: amount }; }
  claimSeasonRewards(playerId: string) { return { ok: true, playerId, rewards: [], claimed: true }; }
}
class StubAssetPoolResolver { getDocument() { return {}; } }

function createManifestManager(adapter: WorldTickAdapter) {
  const replayGuard = { getHighestTick: () => adapter.tickCount, getNonceCount: () => 0 };
  return {
    getLastStateHash: () => adapter.getWorldHashSnapshot()?.worldHash ?? '0'.repeat(64),
    getLastSnapshotTick: () => adapter.tickCount,
    getReplayGuard: () => replayGuard,
  };
}

export class WorldTickAdapter {
  readonly thinShell: WorldTickThinShell = worldTickThinShell;
  get tickCount(): number { return this.thinShell.getTickCount(); }

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
  readonly craftingSystem = { type: 'NullCraftingPort' };
  readonly skillSystem = { type: 'NullSkillPort' };
  worldState: any = { customDialogues: {} };
  playerToSocket = new Map<string, string>();
  readonly npcRespawnTimers = new Map<string, any>();
  resourceSystem: any = { nodes: new Map() };
  chatSystem: any = { getRecentMessages: () => [], systemMessage: () => {}, sendMessage: () => ({}) };
  lootSystem: any = { rollLoot: () => ({ items: [], gold: 0 }) };
  ws: any = { broadcast: () => undefined };

  readonly liveHeal = {
    getStatus: () => ({ tickCount: this.tickCount, autoRepair: autoRepairService.getStatus(), usage: { prompt_tokens: 0, completion_tokens: 0 }, areShadow: { replayBufferSize: 0, lastSnapshot: null }, electroweakPruning: { ttlTicks: 1200, stats: {} }, emergence: { events: [] } }),
    flush: () => {},
  };
  readonly assetHealthService = { getStatus: () => ({}), getStats: () => null, flush: () => {} };

  async init(): Promise<void> {}
  start(): void { this.thinShell.start(); }
  async stop(): Promise<void> { await this.thinShell.stop(); }

  listActiveVoteBanners(): any[] { return []; }
  handleVoteProviderCallback(_data: any): any { return { ok: true }; }
  getAdminVoteBanners(): any[] { return []; }
  upsertVoteBanner(_data: any): any { return { ok: true, banner: {} }; }
  deleteVoteBanner(_id: string): any { return { ok: true }; }
  setVoteBannerOrder(_data: any): any { return { ok: true }; }
  getVoteAdminDiagnostics(): any { return {}; }
  getPersistenceStats(): any { return this.thinShell.getPersistenceStats(); }
  debouncedSave(): void {}
  createNPC(_id: string, _name: string, _x: number, _y: number): void {}
  updateLootCache(): void {}
  getPlaytesterDebugLogPath(): string { return ''; }
  buildPlaytesterMonitorPayload(_options?: any): any { return {}; }
  getPlaytesterMemoryStats(): null { return null; }

  getSpatialBroadcastStats(): { chunkCount: number; entityCount: number } {
    const snapshot = this.thinShell.getWorldBrainSnapshot();
    return { chunkCount: snapshot?.active_chunks?.length ?? 0, entityCount: 0 };
  }

  getAREGuardStatus(): AREInvariantGuardStatus | null { return validationState.getSnapshot().guard; }
  getWorldHashSnapshot(): WorldHashSnapshot | null {
    const snapshot = this.thinShell.getWorldBrainSnapshot();
    if (!snapshot) return null;
    return { tick: this.tickCount, worldHash: snapshot.world_hash ?? '0'.repeat(64), chunkCount: snapshot.active_chunks?.length ?? 0, entityCount: 0, timestamp: this.tickCount };
  }
  getReplayRecorderStats(): DeterministicRecorderStats { return tickRecorder.stats(); }
  getReplaySnapshot(tick: number): DeterministicReplaySnapshot | null { return tickRecorder.replay(tick); }
  getAutoRepairStatus(): AutoRepairStatus { return autoRepairService.getStatus(); }
  getOracleReport(): any { return this.thinShell.getWorldBrainSnapshot() ?? null; }
  getSnapshotStats(): { chunkCount: number } { return this.thinShell.getSnapshotStats(); }
  getDeterministicUsageStats(): { hashesInWindow: number } { return { hashesInWindow: this.getReplayRecorderStats().recordedTicks }; }
  comparePortalWorldHash(portalHash: string): { ok: boolean; portalHash: string; worldHash: string; matches: boolean } {
    const worldHash = this.getWorldHashSnapshot()?.worldHash ?? '0'.repeat(64);
    return { ok: true, portalHash, worldHash, matches: portalHash === worldHash };
  }
  getManifestManager(): ReturnType<typeof createManifestManager> { return createManifestManager(this); }
  handleClientDivergence(clientTick: number, clientStateHash: string) {
    const serverHash = this.getManifestManager().getLastStateHash();
    if (clientStateHash === serverHash) return null;
    return { divergence: { clientTick, serverTick: this.tickCount, clientStateHash, serverStateHash: serverHash, divergedComponents: ['world_hash'] } };
  }
  buildFullState(): unknown { return this.thinShell.getWorldBrainSnapshot() ?? {}; }

  getWorldLogicalState(_entityId: string, entityType: 'player' | 'npc' | 'loot'): WorldLogicalState {
    const seasonIndex = Math.floor((this.tickCount % 4000) / 1000);
    const season = (['spring', 'summer', 'autumn', 'winter'] as const)[seasonIndex] ?? 'spring';
    const baseState: WorldLogicalState = { baseType: entityType, season, decayLevel: 'none', culture: 'universal', biome: 'plains', environment: 'outdoor' };
    if (entityType === 'npc') baseState.culture = 'arcane';
    if (entityType === 'loot') baseState.decayLevel = 'low';
    return baseState;
  }
}

export const worldTickAdapter = new WorldTickAdapter();
export type WorldTick = WorldTickAdapter;
