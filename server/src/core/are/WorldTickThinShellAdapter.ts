import type { WorldLogicalState } from './ChunkLayerState.js';
import { worldTickThinShell, type WorldTickThinShell } from './WorldTickThinShell.js';
import { RuntimePlayerSystem, RuntimeWarfrontPort, createRuntimeWarfrontSystem } from './RuntimeDomainPorts.js';
import { registerWarfrontSystem, type WarfrontTickSystem } from './WarfrontTickSystem.js';
import { registerNPCSystem } from './NPCTickSystem.js';
import { sharedWorldEventBus } from '../../modules/ouroboros/sharedWorldEventBus.js';
import { ChatChannelRouter, type ChatRecipient } from '../../modules/chat/ChatChannelRouter.js';
import { getActiveGameWebSocketServer } from '../../networking/WebSocketServer.js';
import type { NPCSystem } from '../../modules/npc/NPCSystem.js';
import { NPCSystem as RealNPCSystem } from '../../modules/npc/NPCSystem.js';
import { loadGameDataNpcsIntoSystem, type NpcGameDataLoadReport } from '../../modules/npc/NPCGameDataStore.js';
import type { LootEntity } from '../../modules/world/LootDirector.js';
import { lootDirector as deterministicLootDirector } from '../../modules/world/LootDirector.js';
import { canonicalIntentIntake } from '../../intents/CanonicalIntentIntake.js';

type AutoRepairStatus = { ok: boolean; status: string; reason?: string };
type DeterministicRecorderStats = { available: boolean; recordedTicks: number; replayBufferSize: number; reason?: string };
type DeterministicReplaySnapshot = { tick: number; snapshot: unknown };
type AREInvariantGuardStatus = { ok: boolean; invariant: string; available?: boolean; reason?: string };
type NetworkBridge = { broadcast(data: unknown): void; sendToPlayer(id: string, data: unknown): void };
type WorldHashSnapshot = {
  tick: number;
  worldHash: string;
  chunkCount: number;
  entityCount: number;
  timestamp: number;
};
type WorldHashComparison = {
  ok: boolean;
  portalHash: string | null;
  worldHash: string | null;
  matches: boolean;
  reason?: string;
};

type RuntimePortStatus = {
  id: string;
  available: boolean;
  reason?: string;
  authority: 'runtime' | 'transport_side_channel' | 'unavailable';
};

const ZERO_WORLD_HASH = '0'.repeat(64);
const REPLAY_UNAVAILABLE_REASON = 'No canonical replay recorder is registered on WorldTickThinShell.';
const AUTO_REPAIR_UNAVAILABLE_REASON = 'No canonical auto-repair runtime is registered on WorldTickThinShell.';

function isCanonicalStateHash(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{64}$/i.test(value);
}

function normalizePortalHash(value: unknown): string | null {
  if (isCanonicalStateHash(value)) return value.toLowerCase();
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  const nested = record.worldHash ?? record.world_hash ?? record.hash;
  return isCanonicalStateHash(nested) ? nested.toLowerCase() : null;
}

class UnavailableRuntimePort {
  constructor(readonly id: string, readonly reason: string) {}

  getStatus(): RuntimePortStatus { return { id: this.id, available: false, reason: this.reason, authority: 'unavailable' }; }
  getDiagnostics(): RuntimePortStatus { return this.getStatus(); }
  assertAvailable(): never { throw new Error(`${this.id} unavailable: ${this.reason}`); }
  getChunk(): never { return this.assertAvailable(); }
  scanModels(): never { return this.assertAvailable(); }
  getLinks(): never { return this.assertAvailable(); }
  getDocument(): never { return this.assertAvailable(); }
  getStats(): RuntimePortStatus { return this.getStatus(); }
}

class TransportObserverEngine {
  private readonly positions = new Map<string, unknown>();

  broadcastToAll(_data: unknown): void {
    // Transport-only compatibility hook. Simulation truth is emitted by tick providers.
  }

  register(id: string, value: unknown = {}): void { this.positions.set(id, value); }
  updatePosition(id: string, position: unknown): void { this.positions.set(id, position); }
  getStatus(): RuntimePortStatus & { trackedSockets: number } {
    return { id: 'TransportObserverEngine', available: true, authority: 'transport_side_channel', trackedSockets: this.positions.size };
  }
}

function unavailablePort(id: string, reason: string): UnavailableRuntimePort {
  return new UnavailableRuntimePort(id, reason);
}

function createManifestManager(adapter: WorldTickAdapter) {
  const replayGuard = { getHighestTick: () => adapter.tickCount, getNonceCount: () => 0 };
  return {
    getLastStateHash: () => adapter.getWorldHashSnapshot()?.worldHash ?? ZERO_WORLD_HASH,
    getLastSnapshotTick: () => adapter.tickCount,
    getReplayGuard: () => replayGuard,
  };
}

function emptyNpcLoadReport(): NpcGameDataLoadReport {
  return Object.freeze({
    npcDefinitionsRead: 0,
    spawnRowsRead: 0,
    npcsLoaded: 0,
    missingSpawnDefinitions: Object.freeze([]),
    duplicateSpawnNpcIds: Object.freeze([]),
  });
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

  // Real game systems - wired for ARE truth path
  private readonly realNPCSystem: NPCSystem;
  /** Backward-compatible public surface used by combat/persistence/skill integrations. */
  readonly npcSystem: NPCSystem;
  readonly deterministicLootDirector: { getAllLoot(): LootEntity[] };
  private npcGameDataReport: NpcGameDataLoadReport = emptyNpcLoadReport();
  private appliedMoveIntentTotal = 0;

  readonly chunkSystem = unavailablePort('ChunkRuntimePort', 'No canonical chunk runtime provider is registered on this adapter yet. Use WorldTickThinShell world-brain snapshots for chunk truth.');
  readonly observerEngine = new TransportObserverEngine();
  readonly playerSystem = new RuntimePlayerSystem();
  readonly combatSystem = unavailablePort('CombatRuntimePort', 'Combat runtime is not registered on this adapter. Do not infer combat truth from an empty object.');
  readonly combatService = unavailablePort('CombatServicePort', 'Combat service is not registered on this adapter.');
  readonly inventorySystem = unavailablePort('InventoryRuntimePort', 'Inventory runtime must be wired from the canonical inventory service before use.');
  readonly guildSystem = unavailablePort('GuildRuntimePort', 'Guild runtime must be wired from the canonical guild/governance service before use.');
  readonly economySystem = unavailablePort('EconomyRuntimePort', 'Economy runtime must be wired from the transaction ledger before use.');
  readonly questSystem = unavailablePort('QuestRuntimePort', 'Quest runtime must be wired from the quest progression store before use.');
  readonly worldSystem = unavailablePort('WorldRuntimePort', 'World runtime truth is currently exposed by WorldTickThinShell providers.');
  readonly persistence = unavailablePort('PersistenceRuntimePort', 'Persistence stats must come from WorldTickThinShell persistence diagnostics.');
  readonly glbRegistry = unavailablePort('GLBRegistryPort', 'GLB registry is not registered on this adapter.');
  readonly warfrontSystem = new RuntimeWarfrontPort(this.warfrontDomain, () => this.tickCount * 100);
  readonly assetPoolResolver = unavailablePort('AssetPoolResolverPort', 'Asset pool resolver is not registered on this adapter.');
  readonly placementEngine = unavailablePort('PlacementRuntimePort', 'Placement engine is not registered on this adapter.');
  readonly placementEnginePort = unavailablePort('PlacementRuntimePort', 'Placement engine port is not registered on this adapter.');
  readonly craftingSystem = unavailablePort('CraftingRuntimePort', 'Crafting runtime must be wired from the canonical crafting service before use.');
  readonly skillSystem = unavailablePort('SkillRuntimePort', 'Skill runtime must be wired from the canonical skill progression service before use.');
  worldState: any = { customDialogues: {} };
  playerToSocket = new Map<string, string>();
  socketToPlayer = new Map<string, string>();
  readonly npcRespawnTimers = new Map<string, any>();
  resourceSystem: any = { nodes: new Map(), getDiagnostics: () => ({ id: 'ResourceRuntimePort', available: false, reason: 'Resource runtime provider not registered', authority: 'unavailable' }) };
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
  readonly ws = {
    broadcast: (payload: unknown) => this.broadcast(payload),
    sendToPlayer: (socketId: string, payload: unknown) => this.sendToPlayer(socketId, payload),
  };

  readonly liveHeal = {
    getStatus: () => ({
      tickCount: this.tickCount,
      autoRepair: this.getAutoRepairStatus(),
      usage: { prompt_tokens: 0, completion_tokens: 0 },
      areShadow: {
        available: false,
        replayBufferSize: 0,
        lastSnapshot: null,
        reason: REPLAY_UNAVAILABLE_REASON,
      },
      electroweakPruning: { ttlTicks: 1200, stats: {} },
      emergence: { events: [] },
      npcGameData: this.npcGameDataReport,
      runtimePorts: this.getRuntimePortDiagnostics(),
      playerRuntime: this.playerSystem.getDiagnostics(),
      appliedMoveIntentTotal: this.appliedMoveIntentTotal,
      canonicalIntents: canonicalIntentIntake.getDiagnostics(),
    }),
    flush: () => {},
  };
  readonly assetHealthService = { getStatus: () => ({}), getStats: () => null, flush: () => {} };

  constructor() {
    // Create real NPC system for ARE truth path and preserve legacy adapter alias.
    this.realNPCSystem = new RealNPCSystem();
    this.npcSystem = this.realNPCSystem;
    this.npcGameDataReport = loadGameDataNpcsIntoSystem(this.npcSystem);

    const npcTickSystem = registerNPCSystem(this.npcSystem);
    npcTickSystem.setPlayersProvider(() => this.playerSystem.getAllPlayers());
    npcTickSystem.setWorldTimeProvider(() => this.tickCount);

    // Wire deterministic LootDirector for ARE truth path
    // This is the ARE-style loot system from modules/world/LootDirector
    this.deterministicLootDirector = deterministicLootDirector;

    this.warfrontTickSystem = registerWarfrontSystem(this.warfrontDomain);

    // Register adapter's systems as WorldStateProvider for ARE truth path
    // This ensures WorldTickThinShell.getWorldStateForTick() always has data
    this.thinShell.registerWorldStateProvider({
      id: 'adapter-internal',
      getWorldState: (_context) => {
        this.appliedMoveIntentTotal += this.playerSystem.applyQueuedMoveIntents(this.tickCount, Number((this as any).client2DMoveSpeed ?? 5));
        return {
          npcs: this.npcSystem.getAllNPCs(),
          players: this.playerSystem.getAllPlayers(),
          loot: this.deterministicLootDirector.getAllLoot(),
        };
      },
    });

    // AIM-104: fold authoritative actor (player) state into the canonical world
    // hash so it can detect actor-state divergence. Players are deterministically
    // mutated inside the tick (AIM-103 movement + hydration), so the provider
    // reads live RuntimePlayerSystem state that the tick has already advanced.
    this.thinShell.setActorStateProvider(() => this.playerSystem.getAllPlayers());

    console.log(`[WorldTickAdapter] Initialized with RealNPCSystem, game-data NPCs=${this.npcGameDataReport.npcsLoaded}, NPCTickSystem, deterministicLootDirector, and explicit unavailable runtime ports`);
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
   * Get the real NPC system for external access.
   */
  getRealNPCSystem(): NPCSystem {
    return this.realNPCSystem;
  }

  getNpcGameDataLoadReport(): NpcGameDataLoadReport {
    return this.npcGameDataReport;
  }

  getRuntimePortDiagnostics(): RuntimePortStatus[] {
    return [
      { id: 'NPCSystem', available: true, authority: 'runtime' },
      { id: 'DeterministicLootDirector', available: true, authority: 'runtime' },
      { id: 'RuntimePlayerSystem', available: true, authority: 'runtime' },
      { id: 'WarfrontRuntimePort', available: true, authority: 'runtime' },
      this.observerEngine.getStatus(),
      this.chunkSystem.getStatus(),
      this.combatSystem.getStatus(),
      this.combatService.getStatus(),
      this.inventorySystem.getStatus(),
      this.guildSystem.getStatus(),
      this.economySystem.getStatus(),
      this.questSystem.getStatus(),
      this.worldSystem.getStatus(),
      this.persistence.getStatus(),
      this.glbRegistry.getStatus(),
      this.assetPoolResolver.getStatus(),
      this.placementEngine.getStatus(),
      this.craftingSystem.getStatus(),
      this.skillSystem.getStatus(),
      this.resourceSystem.getDiagnostics(),
    ];
  }

  async init(): Promise<void> {
    this.warfrontDomain.initialize(this.tickCount * 100);
  }
  start(): void { this.thinShell.start(); }
  async stop(): Promise<void> { await this.thinShell.stop(); }

  listActiveVoteBanners(): any[] { return []; }
  handleVoteProviderCallback(_data: any): any { return { ok: false, error: 'vote_banner_runtime_unavailable' }; }
  getAdminVoteBanners(): any[] { return []; }
  upsertVoteBanner(_data: any): any { return { ok: false, error: 'vote_banner_runtime_unavailable' }; }
  deleteVoteBanner(_id: string): any { return { ok: false, error: 'vote_banner_runtime_unavailable' }; }
  setVoteBannerOrder(_data: any): any { return { ok: false, error: 'vote_banner_runtime_unavailable' }; }
  getVoteAdminDiagnostics(): any { return { available: false, reason: 'vote banner runtime not registered' }; }
  getPersistenceStats(): any { return this.thinShell.getPersistenceStats(); }
  setPersistenceAdapter(adapter: import('./LayerPersistencePort.js').LayerPersistenceAdapter): void {
    this.thinShell.setPersistenceAdapter(adapter);
  }
  async ensurePersistenceAdapter(): Promise<void> {
    const { createLayerPersistenceAdapter } = await import('./createLayerPersistenceAdapter.js');
    await this.thinShell.ensurePersistenceAdapter(createLayerPersistenceAdapter);
  }
  async rehydrateAllChunkStates(): Promise<number> {
    return this.thinShell.rehydrateAllChunkStates();
  }
  debouncedSave(): void {}
  createNPC(id: string, name: string, x: number, y: number): void { this.npcSystem.createNPC(id, name, x, y); }
  updateLootCache(): void {}
  getPlaytesterDebugLogPath(): string { return ''; }
  buildPlaytesterMonitorPayload(_options?: any): any { return { ok: false, error: 'playtester_runtime_unavailable' }; }
  getPlaytesterMemoryStats(): null { return null; }

  getSpatialBroadcastStats(): { chunkCount: number; entityCount: number } {
    const snapshot = this.thinShell.getWorldBrainSnapshot();
    return { chunkCount: snapshot?.active_chunks?.length ?? 0, entityCount: this.npcSystem.getAllNPCs().length + this.deterministicLootDirector.getAllLoot().length };
  }

  getAREGuardStatus(): AREInvariantGuardStatus | null {
    return null;
  }

  getWorldHashSnapshot(): WorldHashSnapshot | null {
    const snapshot = this.thinShell.getWorldBrainSnapshot();
    if (!snapshot) return null;

    const activeChunks = Array.isArray(snapshot.active_chunks) ? snapshot.active_chunks : [];
    const worldHash = isCanonicalStateHash(snapshot.world_hash) ? snapshot.world_hash.toLowerCase() : null;
    if (activeChunks.length === 0 || !worldHash || worldHash === ZERO_WORLD_HASH) return null;

    return {
      tick: this.tickCount,
      worldHash,
      chunkCount: activeChunks.length,
      entityCount: this.npcSystem.getAllNPCs().length + this.deterministicLootDirector.getAllLoot().length,
      timestamp: this.tickCount,
    };
  }

  getReplayRecorderStats(): DeterministicRecorderStats {
    return {
      available: false,
      recordedTicks: 0,
      replayBufferSize: 0,
      reason: REPLAY_UNAVAILABLE_REASON,
    };
  }

  getReplaySnapshot(_tick: number): DeterministicReplaySnapshot | null {
    return null;
  }

  getAutoRepairStatus(): AutoRepairStatus {
    return { ok: false, status: 'unavailable', reason: AUTO_REPAIR_UNAVAILABLE_REASON };
  }

  getOracleReport(): any { return this.thinShell.getWorldBrainSnapshot() ?? null; }
  getSnapshotStats(): { chunkCount: number } { return this.thinShell.getSnapshotStats(); }
  getDeterministicUsageStats(): { hashesInWindow: number } { return { hashesInWindow: 0 }; }

  comparePortalWorldHash(portalHashInput: unknown): WorldHashComparison {
    const portalHash = normalizePortalHash(portalHashInput);
    const world = this.getWorldHashSnapshot();

    if (!portalHash) {
      return {
        ok: false,
        portalHash: null,
        worldHash: world?.worldHash ?? null,
        matches: false,
        reason: 'invalid_portal_hash',
      };
    }

    if (!world) {
      return {
        ok: false,
        portalHash,
        worldHash: null,
        matches: false,
        reason: 'world_hash_unavailable',
      };
    }

    const matches = portalHash === world.worldHash;
    return {
      ok: matches,
      portalHash,
      worldHash: world.worldHash,
      matches,
      ...(matches ? {} : { reason: 'world_hash_mismatch' }),
    };
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