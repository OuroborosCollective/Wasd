import type { WorldLogicalState } from './ChunkLayerState.js';
import { worldTickThinShell, type ThinShellWorldState, type WorldTickThinShell, type WorldStateProvider } from './WorldTickThinShell.js';
import { RuntimePlayerSystem, RuntimeWarfrontPort, createRuntimeWarfrontSystem } from './RuntimeDomainPorts.js';
import { registerWarfrontSystem, type WarfrontTickSystem } from './WarfrontTickSystem.js';
import { sharedWorldEventBus } from '../../modules/ouroboros/sharedWorldEventBus.js';
import { ChatChannelRouter, type ChatRecipient } from '../../modules/chat/ChatChannelRouter.js';
import { getActiveGameWebSocketServer } from '../../networking/WebSocketServer.js';
import type { TickSystemContext } from './TickSystem.js';
import type { NPC } from '../../modules/npc/NPCSystem.js';
import type { LootEntity } from '../../modules/world/LootDirector.js';

type AutoRepairStatus = { ok: boolean; status: string };
type DeterministicRecorderStats = { recordedTicks: number; replayBufferSize: number };
type DeterministicReplaySnapshot = { tick: number; snapshot: unknown };
type WorldHashSnapshot = { tick: number; worldHash: string; chunkCount: number; entityCount: number; timestamp: number };
type AREInvariantGuardStatus = { ok: boolean; invariant: string };
type NetworkBridge = { broadcast(data: unknown): void; sendToPlayer(id: string, data: unknown): void };

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
class StubCombatSystem {}
class StubCombatService {}
class StubInventorySystem {}

/**
 * Stub NPC System - returns empty arrays by default.
 * Replace via setRealNPCSystem() for actual NPC data.
 */
class StubNPCSystem {
  private realSystem: { getAllNPCs(): NPC[] } | null = null;

  setRealSystem(system: { getAllNPCs(): NPC[] }): void {
    this.realSystem = system;
  }

  getNPC(_id: string): NPC | null {
    return this.realSystem?.getAllNPCs().find(npc => npc.id === _id) ?? null;
  }

  getAllNPCs(): NPC[] {
    return this.realSystem?.getAllNPCs() ?? [];
  }
}

class StubGuildSystem {}
class StubEconomySystem {}
class StubQuestEngine {}
class StubWorldSystem {}
class StubPersistenceManager { getStats() { return {}; } }
class StubGLBRegistry { scanModels() { return []; } getLinks() { return []; } }
class StubAssetPoolResolver { getDocument() { return {}; } }

/**
 * Stub Loot System - returns empty arrays by default.
 * Replace via setRealLootDirector() for actual loot data.
 */
class StubLootSystem {
  private realDirector: { getAllLoot(): LootEntity[] } | null = null;

  setRealDirector(director: { getAllLoot(): LootEntity[] }): void {
    this.realDirector = director;
  }

  rollLoot(): { items: unknown[]; gold: number } {
    return { items: [], gold: 0 };
  }

  getAllLoot(): LootEntity[] {
    return this.realDirector?.getAllLoot() ?? [];
  }
}

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

  readonly eventBus = sharedWorldEventBus;
  readonly chatRouter = new ChatChannelRouter();
  readonly players: ChatRecipient[] = [];
  private networkBridge: NetworkBridge | null = null;

  private readonly warfrontDomain = createRuntimeWarfrontSystem();
  readonly warfrontTickSystem: WarfrontTickSystem;

  readonly chunkSystem = new StubChunkSystem();
  readonly observerEngine = new StubObserverEngine();
  readonly playerSystem = new RuntimePlayerSystem();
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
  readonly warfrontSystem = new RuntimeWarfrontPort(this.warfrontDomain, () => this.tickCount * 100);
  readonly assetPoolResolver = new StubAssetPoolResolver();
  readonly placementEngine = {};
  readonly placementEnginePort = { type: 'NullPlacementPort' as const };
  readonly craftingSystem = { type: 'NullCraftingPort' };
  readonly skillSystem = { type: 'NullSkillPort' };
  worldState: any = { customDialogues: {} };
  playerToSocket = new Map<string, string>();
  readonly npcRespawnTimers = new Map<string, any>();
  resourceSystem: any = { nodes: new Map() };
  readonly chatSystem = {
    chatRouter: this.chatRouter,
    getRecentMessages: () => this.chatRouter.getRecentAll(),
    systemMessage: (text: string) => this.broadcast({ type: 'chat_message', channel: 'global', senderType: 'system', senderName: '[SYSTEM]', text, ts: this.tickCount }),
    sendMessage: (text: string) => this.chatRouter.publish(
      { channel: 'global', senderType: 'system', senderId: 'system', senderName: '[SYSTEM]', text },
      this.players,
      this.sendToPlayer,
      this.broadcast,
      this.resolveSocketId,
    ),
  };
  readonly lootSystem = new StubLootSystem();
  readonly ws = {
    broadcast: (payload: unknown) => this.broadcast(payload),
    sendToPlayer: (socketId: string, payload: unknown) => this.sendToPlayer(socketId, payload),
  };

  readonly liveHeal = {
    getStatus: () => ({ tickCount: this.tickCount, autoRepair: autoRepairService.getStatus(), usage: { prompt_tokens: 0, completion_tokens: 0 }, areShadow: { replayBufferSize: 0, lastSnapshot: null }, electroweakPruning: { ttlTicks: 1200, stats: {} }, emergence: { events: [] } }),
    flush: () => {},
  };
  readonly assetHealthService = { getStatus: () => ({}), getStats: () => null, flush: () => {} };

  constructor() {
    this.warfrontTickSystem = registerWarfrontSystem(this.warfrontDomain);

    // Register adapter's own systems as WorldStateProvider for ARE truth path
    // This provides npcs, players, and loot from the adapter's systems
    // Use a stable provider ID that sorts first
    this.thinShell.registerWorldStateProvider({
      id: 'adapter-internal',
      getWorldState: (_context) => ({
        npcs: this.npcSystem.getAllNPCs(),
        players: this.playerSystem.getAllPlayers(),
        loot: this.lootSystem.getAllLoot(),
      }),
    });
  }

  attachNetworkBridge(networkBridge: NetworkBridge): void {
    this.networkBridge = networkBridge;
  }

  private resolveNetworkBridge(): NetworkBridge | null {
    return this.networkBridge ?? getActiveGameWebSocketServer();
  }

  sendToPlayer = (socketId: string, payload: unknown): void => {
    this.resolveNetworkBridge()?.sendToPlayer(socketId, payload);
  };

  broadcast = (payload: unknown): void => {
    this.resolveNetworkBridge()?.broadcast(payload);
  };

  resolveSocketId = (playerId: string): string | undefined => this.playerToSocket.get(playerId);

  /**
   * Register real NPC system for ARE truth path.
   * Call this during server bootstrap to enable real NPC data.
   */
  setRealNPCSystem(system: { getAllNPCs(): NPC[] }): void {
    (this.npcSystem as StubNPCSystem).setRealSystem(system);
    console.log('[WorldTickAdapter] Real NPC system registered for ARE truth path');
  }

  /**
   * Register real loot director for ARE truth path.
   * Call this during server bootstrap to enable real loot data.
   */
  setRealLootDirector(director: { getAllLoot(): LootEntity[] }): void {
    (this.lootSystem as StubLootSystem).setRealDirector(director);
    console.log('[WorldTickAdapter] Real loot director registered for ARE truth path');
  }

  async init(): Promise<void> {
    this.warfrontDomain.initialize(this.tickCount * 100);
  }
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
