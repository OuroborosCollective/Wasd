import { GLBRegistry } from "../modules/asset-registry/GLBRegistry.js";
import { ChunkSystem } from "../modules/world/ChunkSystem.js";
import { ObserverEngine } from "../modules/observer/ObserverEngine.js";
import { PlayerSystem } from "../modules/player/PlayerSystem.js";
import { CombatSystem } from "../modules/combat/CombatSystem.js";
import { CombatService } from "../modules/combat/CombatService.js";
import { InventorySystem } from "../modules/inventory/InventorySystem.js";
import { inventoryDirector } from "../modules/inventory/index.js";
import { NPCSystem } from "../modules/npc/NPCSystem.js";
import { GuildSystem } from "../modules/guild/GuildSystem.js";
import { EconomySystem } from "../modules/economy/EconomySystem.js";
import { QuestEngine } from "../modules/quest/QuestEngine.js";
import { WorldSystem } from "../modules/world/WorldSystem.js";
import { PersistenceManager } from "./PersistenceManager.js";
import { verifyFirebaseToken } from "../config/firebase.js";
import { GameWebSocketServer } from "../networking/WebSocketServer.js";
import { WorldHistory } from "../modules/history/WorldHistory.js";
import { bootstrapWarfrontNpcs, runWarfrontCombatTick } from "../modules/warfront/WarfrontCombatOrchestrator.js";
import { WarfrontSystem } from "../modules/warfront/WarfrontSystem.js";
import { AREInvariantGuard, DeterminismViolation, type AREGuardPayload, type AREInvariantGuardStatus } from "../are/AREInvariantGuard.js";
import { areValidationState } from "../are/AREValidationState.js";
import { createWorldHashSnapshot, type WorldHashSnapshot } from "../are/WorldHashSnapshot.js";
import { deterministicTickRecorder, type DeterministicRecorderStats, type DeterministicReplaySnapshot, type DeterministicTickRecord } from "../are/DeterministicTickRecorder.js";
import { ouroborosOracleEngine, type OracleReport } from "../are/OuroborosOracle.js";
import { areAutoRepairService, type AutoRepairStatus } from "../are/AREAutoRepairService.js";
import { deterministicUsageTracker, type DeterministicUsageStats } from "../are/DeterministicUsageTracker.js";
import { AREDivergenceGuard } from "./are/AREDivergenceGuard.js";
import { AREReplayBuffer } from "./are/AREReplayBuffer.js";
import { AREShadowAdapter } from "./are/AREShadowAdapter.js";
import { AREEconomyAdapter } from "./are/AREEconomyAdapter.js";
import { AREElectroweakPruningManager, type AREEntity, type ElectroweakDecayEvent } from "./are/AREElectroweakPruning.js";
import { KappaPosGrid } from "@wasd/shared";
import { checkForestResource, isNearForestResource } from "../modules/resource/forestResourceCheck.js";
import { FOREST_ACTION_DISTANCE, FOREST_RESPAWN_TICKS } from "../modules/resource/forestResourceRules.js";
import { AIOrchestrator } from "./AIOrchestrator.js";
import { processRespawns } from "../modules/combat/deathRespawnSystem.js";
import { persistenceDirector } from "../modules/persistence/PersistenceDirector.js";
import { storageEntityManager, type StorageEntity } from "../modules/structure/StorageEntity.js";
import { resourcePopulator, type GeneratedResourceEntity } from "../modules/world/ResourcePopulator.js";
import { chunkModificationDirector } from "../modules/world/ChunkModificationDirector.js";
import { createWorldTickManifestManager, type WorldTickManifestManager } from "./manifest/WorldTickManifestManager.js";
import { sha256 } from "./manifest/ManifestHasher.js";
import { PlaytesterConfig } from "../config/PlaytesterConfig.js";
import { PersistentPlaytesterNPC, type PlaytesterWorldPort, type PlaytesterNpcSpawn } from "../modules/playtester/PersistentPlaytesterNPC.js";
import { PlaytesterJsonlLogger } from "../modules/playtester/PlaytesterJsonlLogger.js";
import { handleGameplayQuestEvent } from "../quests/QuestGameplayEventBridge.js";
import { gatheringService } from "../resources/GatheringService.js";

// Phase 5: Gameplay Contract imports
import { 
  SERVER_PROTOCOL_VERSION,
  safeJsonParse,
  isRecord,
  getRequestId,
  serverError,
  envelope
} from "../gameplay/protocol.js";

import {
  createGameplaySession,
  makeWelcome,
  makeWorldSnapshot,
  applyInputFrame,
  distanceToEntity,
  removeEntity,
  type GameplaySession
} from "../gameplay/gameplaySession.js";

import { getGameplayPersistence } from "../gameplay/persistence/gameplayPersistence.js";

// Phase 7: Identity imports
import { getIdentityService } from "../gameplay/identity/identityService.js";
import { createOwnershipService } from "../gameplay/identity/ownershipService.js";

// Environment variable for manifest authority secret
const MANIFEST_AUTHORITY_SECRET = process.env.MANIFEST_AUTHORITY_SECRET ?? 'dev-secret-change-in-production';
const WORLD_ID = process.env.WORLD_ID ?? 'areloria-main';

const ELECTROWEAK_LOOT_TTL_TICKS = 1200;

/**
 * CHUNK_SIZE: Each chunk is 64 tiles × 64 tiles.
 * Used for Spatial Plexity (Axiom 4) - spatial filtering for broadcasts.
 */
const SPATIAL_CHUNK_SIZE = 64;

/**
 * SPATIAL BROADCAST GRID
 * ═══════════════════════════════════════════════════════════════════════
 * 
 * ARCHITECTURE DECISION: O(1) entity lookup via Map-based spatial grid.
 * 
 * Instead of iterating N*M entities to find nearby ones (O(N*M) distance checks),
 * we maintain a Map<string, Set<string>> that maps chunk keys to entity IDs.
 * 
 * Chunk key format: "cx:cz" where:
 *   - cx = Math.floor(tileX / SPATIAL_CHUNK_SIZE)
 *   - cz = Math.floor(tileZ / SPATIAL_CHUNK_SIZE)
 * 
 * When a player moves, we:
 * 1. Calculate their current chunk key
 * 2. Get the 3x3 chunk grid (center + 8 neighbors) = 9 keys
 * 3. Collect all entity IDs from these 9 sets
 * 
 * This is O(1) for chunk key calculation + O(K) for entity collection
 * where K is the total entities in visible chunks (typically << N).
 * 
 * GC STRATEGY: When an entity moves out of all visible chunks for a client,
 * it will simply not appear in their next world_snapshot. The client-side
 * garbage collector will handle sprite cleanup (see client implementation).
 * 
 * ═══════════════════════════════════════════════════════════════════════
 */
type ChunkKey = string; // Format: "cx:cz"
type EntityId = string;

interface SpatialEntity {
  id: EntityId;
  tileX: number;
  tileZ: number;
  kind: "player" | "npc" | "loot";
  /** Stripped data for broadcast */
  data: Record<string, unknown>;
}

/**
 * Compute chunk key from tile coordinates.
 * Uses integer division for deterministic behavior.
 */
function computeChunkKey(tileX: number, tileZ: number): ChunkKey {
  const cx = Math.floor(tileX / SPATIAL_CHUNK_SIZE);
  const cz = Math.floor(tileZ / SPATIAL_CHUNK_SIZE);
  return `${cx}:${cz}`;
}

/**
 * Get all 9 chunk keys for a 3x3 grid centered on the given chunk.
 * Returns keys in order: [NW, N, NE, W, C, E, SW, S, SE]
 */
function get3x3ChunkKeys(centerChunkKey: ChunkKey): ChunkKey[] {
  const [cxStr, czStr] = centerChunkKey.split(":");
  const cx = parseInt(cxStr, 10);
  const cz = parseInt(czStr, 10);
  
  const keys: ChunkKey[] = [];
  for (let dx = -1; dx <= 1; dx++) {
    for (let dz = -1; dz <= 1; dz++) {
      keys.push(`${cx + dx}:${cz + dz}`);
    }
  }
  return keys;
}

class SpatialBroadcastGrid {
  /** Map<ChunkKey, Set<EntityId>> - O(1) lookup by chunk */
  private chunkToEntities = new Map<ChunkKey, Set<EntityId>>();
  
  /** Map<EntityId, SpatialEntity> - Entity data cache */
  private entities = new Map<EntityId, SpatialEntity>();
  
  /**
   * Register or update an entity's position in the spatial grid.
   * Automatically handles chunk migration when entity moves between chunks.
   */
  upsert(id: EntityId, tileX: number, tileZ: number, kind: SpatialEntity["kind"], data: Record<string, unknown>): void {
    const newChunkKey = computeChunkKey(tileX, tileZ);
    const existing = this.entities.get(id);
    
    if (existing) {
      const oldChunkKey = computeChunkKey(existing.tileX, existing.tileZ);
      
      // Same chunk - just update data
      if (oldChunkKey === newChunkKey) {
        existing.tileX = tileX;
        existing.tileZ = tileZ;
        existing.data = data;
        return;
      }
      
      // Different chunk - migrate entity
      this.chunkToEntities.get(oldChunkKey)?.delete(id);
    }
    
    // Insert into new chunk
    if (!this.chunkToEntities.has(newChunkKey)) {
      this.chunkToEntities.set(newChunkKey, new Set());
    }
    this.chunkToEntities.get(newChunkKey)!.add(id);
    
    // Update entity cache
    this.entities.set(id, { id, tileX, tileZ, kind, data });
  }
  
  /**
   * Remove an entity from the spatial grid.
   * Called when entity despawns or leaves the world.
   */
  remove(id: EntityId): void {
    const entity = this.entities.get(id);
    if (!entity) return;
    
    const chunkKey = computeChunkKey(entity.tileX, entity.tileZ);
    this.chunkToEntities.get(chunkKey)?.delete(id);
    this.entities.delete(id);
  }
  
  /**
   * Get all entities visible in the 3x3 chunk grid around the given tile position.
   * Returns stripped entity data for network broadcast.
   */
  getVisibleEntities(centerTileX: number, centerTileZ: number): Record<string, unknown>[] {
    const centerChunkKey = computeChunkKey(centerTileX, centerTileZ);
    const chunkKeys = get3x3ChunkKeys(centerChunkKey);
    
    const visibleEntities: Record<string, unknown>[] = [];
    
    for (const chunkKey of chunkKeys) {
      const entityIds = this.chunkToEntities.get(chunkKey);
      if (!entityIds) continue;
      
      for (const id of entityIds) {
        const entity = this.entities.get(id);
        if (entity) {
          visibleEntities.push(entity.data);
        }
      }
    }
    
    return visibleEntities;
  }
  
  /**
   * Get entity IDs that are no longer in the visible 3x3 grid.
   * Used for client-side garbage collection hints (optional).
   */
  getGoneEntities(centerTileX: number, centerTileZ: number, previousIds: Set<EntityId>): Set<EntityId> {
    const visibleIds = new Set(
      this.getVisibleEntities(centerTileX, centerTileZ).map(e => e.id as string)
    );
    
    const gone = new Set<EntityId>();
    for (const id of previousIds) {
      if (!visibleIds.has(id)) {
        gone.add(id);
      }
    }
    return gone;
  }
  
  /** Clear all entities (on world unload) */
  clear(): void {
    this.chunkToEntities.clear();
    this.entities.clear();
  }
  
  /** Debug: get grid statistics */
  getStats(): { chunkCount: number; entityCount: number } {
    return {
      chunkCount: this.chunkToEntities.size,
      entityCount: this.entities.size,
    };
  }
}

function sectorOf(entity: any): number {
  const x = Number(entity?.position?.x ?? 0);
  const y = Number(entity?.position?.y ?? entity?.position?.z ?? 0);
  return Math.abs((Math.floor(x / 64) * 31 + Math.floor(y / 64) * 17) % 64);
}

function safeInt(value: unknown, fallback = 0): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.trunc(n);
}

export class WorldTick {
  private timer: NodeJS.Timeout | null = null;
  private tickCount = 0;
  private readonly areGuard = new AREInvariantGuard({ throwOnViolation: true });
  private readonly areShadowReplay = new AREReplayBuffer(1000);
  private readonly areDivergenceGuard = new AREDivergenceGuard();
  private readonly economyAdapter: AREEconomyAdapter;
  private readonly electroweakPruning = new AREElectroweakPruningManager();
  private readonly lootSpawnTicks: Map<string, number> = new Map();
  private latestElectroweakDecayEvents: readonly ElectroweakDecayEvent[] = Object.freeze([]);
  private readonly guardReportInterval = 100; // Log guard report every 100 ticks
  private latestEmergenceEvents: readonly any[] = Object.freeze([]);
  private latestPropheticResonanceEvents: readonly any[] = Object.freeze([]);
  private lastAREGuardStatus: AREInvariantGuardStatus | null = null;
  private lastWorldHashSnapshot: WorldHashSnapshot | null = null;
  private lastOracleReport: OracleReport | null = null;
  
  // ─────────────────────────────────────────────────────────────────
  // MANIFEST SYSTEM INTEGRATION
  // ═════════════════════════════════════════════════════════════════
  // Server-authoritative manifest for deterministic state management.
  // Each tick generates a manifest with hash chain for integrity.
  private readonly manifestManager: WorldTickManifestManager;

  // ─────────────────────────────────────────────────────────────────
  // PERSISTENT PLAYTESTER NPC
  // ═════════════════════════════════════════════════════════════════
  // Deterministic bot that lives permanently in the game world,
  // testing all systems and generating structured JSONL logs.
  private readonly persistentPlaytester: PersistentPlaytesterNPC | null;
  private readonly playtesterLogger: PlaytesterJsonlLogger;

  public chunkSystem: ChunkSystem;
  public observerEngine: ObserverEngine;
  public playerSystem: PlayerSystem;
  public combatSystem: CombatSystem;
  public combatService: CombatService;
  public inventorySystem: InventorySystem;
  public npcSystem: NPCSystem;
  public guildSystem: GuildSystem;
  public economySystem: EconomySystem;
  public questSystem: QuestEngine;
  public worldSystem: WorldSystem;
  public persistence: PersistenceManager;
  public glbRegistry: GLBRegistry;
  public warfrontSystem: WarfrontSystem;
  private lootEntities: Map<string, any> = new Map();
  private socketToPlayer: Map<string, string> = new Map();
  private lastActionTimes: Map<string, any> = new Map();
  private pendingForestResourceActions: Array<{ socketId: string; playerId: string; input: any }> = [];
  private pendingStarterResourceActions: Array<{ socketId: string; playerId: string; input: any }> = [];
  private depletedResources: Map<string, number> = new Map();

  public assetPoolResolver: any = { getDocument: () => ({}), setEntry: () => true, removeEntry: () => true, setDefault: () => true, removeDefault: () => true, reload: () => true };
  public getPersistenceStats(): any { 
    return persistenceDirector.getStats(); 
  }
  public placementEngine: any = {};
  public listActiveVoteBanners(): any { return []; }
  public handleVoteProviderCallback(data: any): any { return { ok: true }; }
  public getAdminVoteBanners(): any { return []; }
  public upsertVoteBanner(data: any): any { return { ok: true, banner: {} }; }
  public deleteVoteBanner(id: any): any { return { ok: true }; }
  public setVoteBannerOrder(data: any): any { return { ok: true }; }
  public getVoteAdminDiagnostics(): any { return {}; }
  public debouncedSave(): void {}
  public craftingSystem: any = {};
  public skillSystem: any = {};
  public worldState: any = { customDialogues: {} };
  public createNPC(id: any, name: any, x: any, y: any): void {}
  public playerToSocket: Map<string, string> = new Map();
  public updateLootCache(): void {}
  public npcRespawnTimers: Map<string, any> = new Map();
  public resourceSystem: any = { nodes: new Map() };
  public chatSystem: any = { getRecentMessages: () => [], systemMessage: () => {}, sendMessage: () => ({}) };
  public lootSystem: any = { rollLoot: () => ({ items: [], gold: 0 }) };
  public liveHeal: any = { getStatus: () => ({ tickCount: this.tickCount, autoRepair: areAutoRepairService.getStatus(), usage: deterministicUsageTracker.getStats(this.tickCount), areShadow: this.getAREShadowReplayStats(), electroweakPruning: this.electroweakPruning.getStats(), emergence: { events: this.latestEmergenceEvents } }), flush: () => {} };
  public getPlaytesterDebugLogPath(): string { return ""; }
  public buildPlaytesterMonitorPayload(options?: any): any { return {}; }
  public assetHealthService: any = { getStatus: () => ({}), getStats: () => null, flush: () => {} };
  public async init(): Promise<void> {}
  private keysDown: Map<string, Set<string>> = new Map();
  
  /**
   * Initialize the Persistent Playtester NPC
   */
  private initPersistentPlaytester(): PersistentPlaytesterNPC {
    const worldPort: PlaytesterWorldPort = {
      getTick: () => this.tickCount,
      ensureNpcExists: (npc: PlaytesterNpcSpawn) => {
        const existing = this.npcSystem.getNPC(npc.id);
        if (!existing) {
          // Create synthetic playtester NPC
          this.npcSystem.createNPC(npc.id, npc.name, npc.position.x, npc.position.y);
          const npcEntity = this.npcSystem.getNPC(npc.id);
          if (npcEntity) {
            // Mark as persistent synthetic entity
            (npcEntity as any).tags = npc.tags;
            (npcEntity as any).persistent = npc.persistent;
            (npcEntity as any).syntheticSocketId = npc.syntheticSocketId;
          }
        }
      },
      moveNpc: (npcId: string, target: { x: number; y: number }) => {
        const npc = this.npcSystem.getNPC(npcId);
        if (npc) {
          npc.position.x = target.x;
          npc.position.y = target.y;
        }
      },
      getNearbyNpcs: (npcId: string, radius: number): readonly string[] => {
        const npc = this.npcSystem.getNPC(npcId);
        if (!npc) return [];
        
        const nearby: string[] = [];
        const allNpcs = this.npcSystem.getAllNPCs();
        
        for (const other of allNpcs) {
          if (other.id === npcId) continue;
          if (other.tags?.includes("playtester")) continue; // Skip other playtesters
          
          const dx = (other.position.x ?? 0) - (npc.position.x ?? 0);
          const dy = (other.position.y ?? 0) - (npc.position.y ?? 0);
          const dist = Math.sqrt(dx * dx + dy * dy);
          
          if (dist <= radius) {
            nearby.push(other.id);
          }
        }
        
        return nearby;
      },
      getNearbyHostiles: (npcId: string, radius: number): readonly string[] => {
        const npc = this.npcSystem.getNPC(npcId);
        if (!npc) return [];
        
        const hostiles: string[] = [];
        const allNpcs = this.npcSystem.getAllNPCs();
        
        for (const other of allNpcs) {
          if (other.id === npcId) continue;
          if (other.faction === "Hostile" || other.role === "Enemy") {
            const dx = (other.position.x ?? 0) - (npc.position.x ?? 0);
            const dy = (other.position.y ?? 0) - (npc.position.y ?? 0);
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist <= radius) {
              hostiles.push(other.id);
            }
          }
        }
        
        return hostiles;
      },
      interactWithNpc: (npcId: string, targetNpcId: string): unknown => {
        // Stub: NPC interaction - would trigger dialogue/quest checks
        return { ok: true, npcId: targetNpcId };
      },
      attackTarget: (npcId: string, targetId: string): unknown => {
        // Stub: Combat action
        return { ok: true, targetId };
      },
      pickupNearbyLoot: (npcId: string): unknown => {
        // Stub: Loot pickup
        return { ok: true };
      },
      useSkill: (npcId: string, skillId: string): unknown => {
        // Stub: Skill usage
        return { ok: true, skillId };
      },
      getStateHash: (): string => {
        return this.manifestManager.getLastStateHash() ?? this.lastWorldHashSnapshot?.worldHash ?? "";
      },
    };

    console.log(`[WorldTick] Persistent Playtester NPC initialized: ${PlaytesterConfig.id} (${PlaytesterConfig.displayName})`);
    
    return new PersistentPlaytesterNPC(
      {
        id: PlaytesterConfig.id,
        displayName: PlaytesterConfig.displayName,
        syntheticSocketId: PlaytesterConfig.syntheticSocketId,
        deterministicSeed: PlaytesterConfig.deterministicSeed,
        routineIntervalTicks: PlaytesterConfig.routineIntervalTicks,
        fullSweepEveryTicks: PlaytesterConfig.fullSweepEveryTicks,
      },
      worldPort,
      this.playtesterLogger,
    );
  }
  
  /**
   * Get playtester memory stats for monitoring
   */
  public getPlaytesterMemoryStats(): { visitedChunks: number; talkedToNpcs: number; attackedTargets: number; completedChecks: number; eventsSinceRepoCommit: number } | null {
    return this.persistentPlaytester?.getMemoryStats() ?? null;
  }
  
  /**
   * SPATIAL BROADCAST GRID
   * ═══════════════════════════════════════════════════════════════════════
   * 
   * Per-Axiom 4 (Spatial Plexity): Server NEVER broadcasts all entities
   * to all clients. Instead, each client receives only entities within
   * their 3x3 chunk grid based on their kappaPos.
   * 
   * This grid is updated every tick with current positions and is queried
   * per-client to build the world_snapshot payload.
   * 
   * ═══════════════════════════════════════════════════════════════════════
   */
  private readonly spatialBroadcastGrid = new SpatialBroadcastGrid();
  
  /**
   * Track which entities each client has seen for GC hints.
   * Map<socketId, Set<entityId>>
   */
  private clientVisibleEntities = new Map<string, Set<string>>();
  
  /**
   * Cache of generated resources per chunk.
   * Key: "cx:cz", Value: GeneratedResourceEntity[]
   */
  private chunkResourceCache = new Map<string, GeneratedResourceEntity[]>();
  
  /**
   * Get resources for a chunk, generating them if not cached.
   */
  private getChunkResources(chunkX: number, chunkZ: number): GeneratedResourceEntity[] {
    const key = `${chunkX}:${chunkZ}`;
    let resources = this.chunkResourceCache.get(key);
    
    if (!resources) {
      // Generate resources deterministically
      const biome = this.getChunkBiome(chunkX, chunkZ);
      const result = resourcePopulator.generateChunkResources(chunkX, chunkZ, biome);
      resources = result.entities;
      this.chunkResourceCache.set(key, resources);
      
      // Log slow generation
      if (result.generationMs > 10) {
        console.warn(`[ResourcePopulator] Slow chunk generation: ${chunkX}:${chunkZ} took ${result.generationMs.toFixed(2)}ms`);
      }
    }
    
    return resources;
  }
  
  /**
   * Determine biome for a chunk (simplified).
   */
  private getChunkBiome(chunkX: number, chunkZ: number): string {
    const seed = chunkX * 7 + chunkZ * 13;
    const biomeIndex = Math.abs(seed) % 4;
    const biomes = ['forest', 'forest', 'mountain', 'plains'];
    return biomes[biomeIndex];
  }
  
  /**
   * Broadcast spatial world_snapshot to a specific client.
   * Called every tick for each connected player.
   * 
   * @param socketId - Target client's socket ID
   * @param playerTileX - Player's current tile X position
   * @param playerTileZ - Player's current tile Z position
   * @param selfId - Player's own ID (excluded from other_players)
   */
  private broadcastSpatialSnapshot(socketId: string, playerTileX: number, playerTileZ: number, selfId: string): void {
    const visibleEntities = this.spatialBroadcastGrid.getVisibleEntities(playerTileX, playerTileZ);
    
    // Separate self from others
    const otherPlayers: Record<string, unknown>[] = [];
    const npcs: Record<string, unknown>[] = [];
    const loot: Record<string, unknown>[] = [];
    const resources: Record<string, unknown>[] = [];
    const visibleIds = new Set<string>();
    
    for (const entity of visibleEntities) {
      const id = entity.id as string;
      visibleIds.add(id);
      
      if (id === selfId) continue; // Skip self
      
      const kind = entity.kind as string;
      if (kind === "player") {
        otherPlayers.push(entity);
      } else if (kind === "npc") {
        npcs.push(entity);
      } else if (kind === "loot") {
        loot.push(entity);
      }
    }
    
    // ─── RESOURCE ENTITIES IN WORLD SNAPSHOT ───────────────────────────────
    // Include generated resource entities from the 3x3 chunk grid around player.
    // Deterministic based on worldSeed + chunk coords. Depleted resources
    // are included with depleted=true for client visual feedback.
    // ──────────────────────────────────────────────────────────────────────
    
    const playerChunkX = Math.floor(playerTileX / 64);
    const playerChunkZ = Math.floor(playerTileZ / 64);
    
    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        const cx = playerChunkX + dx;
        const cz = playerChunkZ + dz;
        const chunkResources = this.getChunkResources(cx, cz);
        
        for (const res of chunkResources) {
          resources.push({
            id: res.id,
            type: 'RESOURCE',
            resourceType: res.resourceType,
            x: res.kappaX / 1000,  // Convert KAPPA back to world space
            z: res.kappaZ / 1000,
            kappaX: res.kappaX,
            kappaZ: res.kappaZ,
            yield: res.remainingYield,
            maxYield: res.yield,
            depleted: res.depleted,
            regrowRate: res.regrowRate,
          });
          visibleIds.add(res.id);
        }
      }
    }
    
    // Update client's visible entities for future GC hints
    this.clientVisibleEntities.set(socketId, visibleIds);
    
    // Send the spatial snapshot
    this.ws.sendToPlayer(socketId, {
      type: "world_snapshot",
      tick: this.tickCount,
      self: selfId,
      other_players: otherPlayers,
      npcs,
      loot,
      resources,
    });
  }
  
  /**
   * Get spatial broadcast grid statistics.
   */
  public getSpatialBroadcastStats(): { chunkCount: number; entityCount: number } {
    return this.spatialBroadcastGrid.getStats();
  }

  constructor(private ws: GameWebSocketServer) {
    // Initialize Manifest System for server-authoritative state management
    this.manifestManager = createWorldTickManifestManager(WORLD_ID, MANIFEST_AUTHORITY_SECRET);
    console.log(`[WorldTick] Manifest system initialized for world: ${WORLD_ID}`);
    
    // Initialize Persistent Playtester NPC if enabled
    this.playtesterLogger = new PlaytesterJsonlLogger({
      enabled: PlaytesterConfig.enabled && PlaytesterConfig.repoLogEnabled,
      logPath: PlaytesterConfig.repoLogPath,
    });

    this.persistentPlaytester = PlaytesterConfig.enabled && PlaytesterConfig.persistentNpcEnabled
      ? this.initPersistentPlaytester()
      : null;
    
    this.chunkSystem = new ChunkSystem(64);
    this.observerEngine = new ObserverEngine();
    this.playerSystem = new PlayerSystem();
    this.combatSystem = new CombatSystem();
    this.combatService = new CombatService();
    this.inventorySystem = new InventorySystem();
    this.npcSystem = new NPCSystem();
    this.guildSystem = new GuildSystem();
    this.economySystem = new EconomySystem();
    this.economyAdapter = new AREEconomyAdapter(this.economySystem);
    this.questSystem = new QuestEngine();
    this.persistence = new PersistenceManager();
    this.worldSystem = new WorldSystem(this.persistence);
    this.glbRegistry = new GLBRegistry();
    this.warfrontSystem = new WarfrontSystem();
    
    // Initialize InventoryDirector with WebSocket for broadcasts
    inventoryDirector.initialize(ws);
    
    // Initialize PersistenceDirector for async player persistence
    persistenceDirector.init().catch((err: any) => console.error("[WorldTick] PersistenceDirector init failed:", err));
    
    const dummyPlayer = this.playerSystem.createPlayer("dummy_player", "Dummy Player");
    dummyPlayer.position.x = 500;
    dummyPlayer.position.y = 500;
    this.observerEngine.register("dummy_player", { x: 500, y: 500 });
    bootstrapWarfrontNpcs(this.npcSystem);
    this.ws.onPlayerConnect = (id) => console.log(`Socket ${id} connected. Waiting for login...`);
    this.ws.onPlayerDisconnect = async (id) => {
      const uid = this.socketToPlayer.get(id);
      if (uid) {
        const player = this.playerSystem.getPlayer(uid);
        if (player) { 
          player.isOffline = true; 
          player.state = "idle"; 
          player.stateTimer = this.tickCount + 50;
          
          // ATOMARE DISCONNECT-SICHERUNG: Priority flush before entity removal
          // This blocks the disconnect handler until persistence completes
          try {
            const snapshot = persistenceDirector.buildCompleteSnapshot(player);
            await persistenceDirector.flushPlayerSync(uid, snapshot);
          } catch (err) {
            console.error(`[WorldTick] Priority flush failed for ${player.name}:`, err);
          }
        }
        this.observerEngine.unregister(id);
        this.socketToPlayer.delete(id);
        this.playerToSocket.delete(uid);
        console.log(`Player ${player?.name} (Socket ${id}) disconnected.`);
      }
    };
    this.ws.onPlayerMessage = async (id, msg) => this.handlePlayerMessage(id, msg);
  }

  public getAREGuardStatus(): AREInvariantGuardStatus | null { return this.lastAREGuardStatus; }
  public getWorldHashSnapshot(): WorldHashSnapshot | null { return this.lastWorldHashSnapshot; }
  public getReplayRecorderStats(): DeterministicRecorderStats { return deterministicTickRecorder.stats(); }
  public getReplaySnapshot(tick: number): DeterministicReplaySnapshot | null { return deterministicTickRecorder.replay(tick); }
  public getAutoRepairStatus(): AutoRepairStatus { return areAutoRepairService.getStatus(); }
  public getDeterministicUsageStats(): DeterministicUsageStats { return deterministicUsageTracker.getStats(this.tickCount); }
  public getLatestEmergenceEvents(): readonly any[] { return this.latestEmergenceEvents; }
  public getOracleReport(): OracleReport { this.lastOracleReport = ouroborosOracleEngine.generate(deterministicTickRecorder.records()); this.emitPropheticResonanceFromOracle(this.lastOracleReport); return this.lastOracleReport; }
  public getAREShadowReplayStats(): any {
    const latest = this.areShadowReplay.latest();
    return {
      capacity: this.areShadowReplay.capacity,
      size: this.areShadowReplay.size,
      latestTick: latest?.tick ?? null,
      latestEntityId: latest?.entityId ?? null,
      latestStateHash: latest?.stateHash ?? null,
      divergence: this.areDivergenceGuard.summarize(),
      ecosystem: AREShadowAdapter.getEcosystemTelemetry(),
      economy: this.economyAdapter.snapshotARE(),
      electroweakPruning: this.electroweakPruning.getStats(),
      electroweak: { pruning: this.electroweakPruning.getStats(), prophecies: this.latestPropheticResonanceEvents },
      emergence: { events: this.latestEmergenceEvents },
    };
  }

  // ─────────────────────────────────────────────────────────────────
  // MANIFEST SYSTEM PUBLIC API
  // ═════════════════════════════════════════════════════════════════
  
  /**
   * Get the manifest manager for external access.
   */
  public getManifestManager(): WorldTickManifestManager {
    return this.manifestManager;
  }

  /**
   * Build dependencies from current game state.
   */
  public buildManifestDependencies(): import("./manifest/ManifestTypes.js").IManifestDependency[] {
    const allPlayers = this.playerSystem.getAllPlayers();
    const allNpcs = this.npcSystem.getAllNPCs();
    
    return this.manifestManager.buildDependencies({
      playerCount: allPlayers.length,
      npcCount: allNpcs.length,
      lootCount: this.lootEntities.size,
      resourceCount: 0, // Would come from resource system
      questActiveCount: 0, // Would come from quest system
      chunkHashes: new Map(), // Would come from chunk system
      economyChecksum: this.economyAdapter.snapshotARE().l.toString(),
    });
  }

  /**
   * Create and record a manifest for the current tick.
   * Called at end of tick() to maintain hash chain.
   */
  private recordTickManifest(): void {
    const allPlayers = this.playerSystem.getAllPlayers();
    const allNpcs = this.npcSystem.getAllNPCs();
    
    // Build delta payload
    const delta = {
      players: allPlayers.map(p => ({
        id: p.id,
        health: p.health,
        state: p.state,
      })),
      npcs: allNpcs.map(n => ({
        id: n.id,
        health: n.health,
        state: n.state,
      })),
      tickCount: this.tickCount,
    };
    
    // Build dependencies
    const deps = this.buildManifestDependencies();
    
    // Check if we need a snapshot
    if (this.manifestManager.shouldSnapshot(this.tickCount)) {
      // Create snapshot manifest
      const snapshot = this.manifestManager.createSnapshot(
        this.tickCount,
        {
          players: allPlayers,
          npcs: allNpcs,
          world: { tickCount: this.tickCount },
          economy: this.economyAdapter.snapshotARE(),
        },
        deps,
        this.getSelfHealMeta()
      );
      console.log(`[WorldTick] Snapshot manifest created at tick ${this.tickCount}`);
    } else {
      // Create delta tick manifest
      this.manifestManager.createDeltaTick(this.tickCount, delta, deps);
    }
  }

  /**
   * Get SelfHeal metadata from current system state.
   */
  private getSelfHealMeta(): { healState: 'healthy' | 'degraded' | 'healed' | 'quarantined'; anomalyScore: number; patchedSubsystems: string[] } {
    const autoRepair = areAutoRepairService.getStatus();
    const usage = deterministicUsageTracker.getStats(this.tickCount);
    
    // Determine health state
    let healState: 'healthy' | 'degraded' | 'healed' | 'quarantined' = 'healthy';
    const lastPlan = autoRepair.lastPlan;
    if (lastPlan && lastPlan.phase !== 'idle' && lastPlan.phase !== 'healed') healState = 'degraded';
    if (lastPlan && lastPlan.phase === 'healed') healState = 'healed';
    
    // Calculate anomaly score (0-1)
    const anomalyScore = Math.min(1, (
      (usage.hashesInWindow > 0 ? 0.3 : 0) +
      (lastPlan && lastPlan.phase === 'healed' ? 0.2 : 0) +
      (this.lastAREGuardStatus && !this.lastAREGuardStatus.ok ? 0.5 : 0)
    ));
    
    return {
      healState,
      anomalyScore,
      patchedSubsystems: lastPlan && lastPlan.phase === 'healed' ? ['determinism', 'guard'] : [],
    };
  }

  /**
   * Handle client divergence - create resync manifest.
   */
  public handleClientDivergence(
    clientTick: number,
    clientHash: string
  ): import("./manifest/ManifestTypes.js").GlobalStateManifest | null {
    const serverHash = this.manifestManager.getLastStateHash();
    
    if (clientHash === serverHash) {
      return null; // No divergence
    }
    
    // Create resync manifest
    return this.manifestManager.createResync(this.tickCount, this.buildFullState(), {
      expectedHash: serverHash,
      actualHash: clientHash,
      divergenceTick: clientTick,
      divergedComponents: this.detectDivergedComponents(),
    });
  }

  /**
   * Detect which components have diverged.
   */
  private detectDivergedComponents(): string[] {
    const diverged: string[] = [];
    
    // Check ARE guard status
    if (this.lastAREGuardStatus && !this.lastAREGuardStatus.ok) {
      diverged.push('are_guard');
    }
    
    // Check divergence guard
    const divSummary = this.areDivergenceGuard.summarize();
    if (divSummary.status !== 'ok' || divSummary.warn > 0 || divSummary.critical > 0) {
      diverged.push('entity_group');
    }
    
    return diverged;
  }

  /**
   * Build full state for resync.
   */
  private buildFullState(): unknown {
    const allPlayers = this.playerSystem.getAllPlayers();
    const allNpcs = this.npcSystem.getAllNPCs();
    
    return {
      tickCount: this.tickCount,
      players: allPlayers,
      npcs: allNpcs,
      loot: Array.from(this.lootEntities.values()),
      stateHash: this.manifestManager.getLastStateHash(),
    };
  }

  public comparePortalWorldHash(portalSnapshot: Partial<WorldHashSnapshot> | null | undefined): any {
    if (!this.lastWorldHashSnapshot) return { ok: false, error: "world_hash_snapshot_not_ready" };
    const server = this.lastWorldHashSnapshot;
    const portalWorldHash = portalSnapshot?.worldHash ?? null;
    const portalChunks = new Map((portalSnapshot?.chunks ?? []).map((chunk: any) => [`${chunk.chunkX}:${chunk.chunkY}`, chunk.hash]));
    const mismatches = server.chunks.filter((chunk) => portalChunks.has(`${chunk.chunkX}:${chunk.chunkY}`) && portalChunks.get(`${chunk.chunkX}:${chunk.chunkY}`) !== chunk.hash).map((chunk) => ({ chunkX: chunk.chunkX, chunkY: chunk.chunkY, serverHash: chunk.hash, portalHash: portalChunks.get(`${chunk.chunkX}:${chunk.chunkY}`) }));
    return { ok: Boolean(portalWorldHash && portalWorldHash === server.worldHash) && mismatches.length === 0, serverWorldHash: server.worldHash, portalWorldHash, mismatches, missingPortalChunks: server.chunks.filter((chunk) => !portalChunks.has(`${chunk.chunkX}:${chunk.chunkY}`)).map((chunk) => ({ chunkX: chunk.chunkX, chunkY: chunk.chunkY })) };
  }

  private restoreWorldStateFromRecord(record: DeterministicTickRecord, sector: number): void {
    const playerMap = this.playerSystem.getPlayersMap();
    for (const [id, player] of [...playerMap.entries()]) if (sectorOf(player) === sector) playerMap.delete(id);
    for (const player of record.worldState.players as any[]) if (sectorOf(player) === sector) this.playerSystem.setPlayer(String(player.id), { ...player });

    const npcMap = this.npcSystem.getNPCsMap();
    for (const [id, npc] of [...npcMap.entries()]) if (sectorOf(npc) === sector) npcMap.delete(id);
    for (const npc of record.worldState.npcs as any[]) if (sectorOf(npc) === sector) this.npcSystem.addNPC({ ...npc, visionRange: npc.visionRange ?? 10, visionAngle: npc.visionAngle ?? 90, targetId: npc.targetId ?? null, isProcessingAI: false, rotation: npc.rotation ?? 0 } as any);

    for (const [id, loot] of [...this.lootEntities.entries()]) if (sectorOf(loot) === sector) this.lootEntities.delete(id);
    for (const loot of record.worldState.loot as any[]) if (sectorOf(loot) === sector) this.lootEntities.set(String(loot.id), { ...loot });

    this.lastWorldHashSnapshot = record.worldSnapshot;
    if (record.guard) this.lastAREGuardStatus = record.guard;
    if (record.worldSnapshot) areValidationState.updateWorld(record.worldSnapshot);
    if (record.guard) areValidationState.updateGuard(record.guard);
  }

  private async handlePlayerMessage(id: string, msg: any) {
    if (msg.type === "login") {
      if (!msg.token) { this.ws.sendToPlayer(id, { type: "error", message: "Authentication failed: No token provided" }); setTimeout(() => { const client = Array.from((this.ws as any).wss.clients).find((c: any) => c.id === id); if (client) (client as any).close(); }, 500); return; }
      let charName = "Unknown";
      let uid = "";
      try { const decodedToken = await verifyFirebaseToken(msg.token) as any; if (decodedToken) { uid = decodedToken.uid; charName = decodedToken.name || decodedToken.email?.split('@')[0] || `Player_${uid.substring(0, 6)}`; } else { this.ws.sendToPlayer(id, { type: "error", message: "Authentication service unavailable" }); return; } } catch { this.ws.sendToPlayer(id, { type: "error", message: "Authentication failed: Invalid token" }); return; }
      let player = this.playerSystem.getPlayer(uid);
      if (!player) { 
        player = this.playerSystem.createPlayer(uid, charName, msg.class, msg.appearance); 
        this.hydratePlayer(player);
        
        // Load persisted snapshot for returning players
        const saved = await persistenceDirector.loadPlayerSnapshot(uid);
        if (saved) {
          persistenceDirector.applySnapshot(player, saved);
          console.log(`[WorldTick] Restored player ${charName} from persistence.`);
        }
      } else { 
        player.isOffline = false; 
      }
      if (player.name !== charName) player.name = charName;
      this.socketToPlayer.set(id, uid);
      this.playerToSocket.set(uid, id);
      this.observerEngine.register(id, { x: player.position.x, y: player.position.y });
      this.ws.sendToPlayer(id, { type: "welcome", id: uid, playerName: player.name, stats: { gold: player.gold, xp: player.xp, hp: player.health, maxHp: player.maxHealth, mp: player.mana, maxMp: player.maxMana, level: player.level || 1 }, inventory: player.inventory, equipment: player.equipment, quests: player.quests });
      return;
    }
    const playerId = this.socketToPlayer.get(id);
    if (!playerId) return;
    const player = this.playerSystem.getPlayer(playerId);
    if (!player) return;
    const charName = player.name;
    const nowTick = this.tickCount;
    const checkCooldown = (cooldownMs: number) => { const cooldownTicks = Math.max(1, Math.ceil(cooldownMs / 100)); const pTimes = this.lastActionTimes.get(charName) || {}; const last = pTimes["general"] || 0; if (nowTick - last < cooldownTicks) return false; pTimes["general"] = nowTick; this.lastActionTimes.set(charName, pTimes); return true; };
    const actionPayload = msg.payload && typeof msg.payload === "object" ? msg.payload : msg;
    if (msg.type === "move_intent" || msg.type === "MOVE") { const speed = 5; let dx = Number(msg.dx) || 0; let dy = Number(msg.dy ?? msg.dz) || 0; const magSq = dx * dx + dy * dy; if (magSq > 1) { const mag = Math.sqrt(magSq); dx /= mag; dy /= mag; } if (!Number.isNaN(dx) && !Number.isNaN(dy)) { const current = KappaPosGrid.create(player.position.x, player.position.y, player.position.z || 0); const moved = KappaPosGrid.move(current, dx * speed, dy * speed, 0, 1); player.position.x = KappaPosGrid.toExternal(moved.x); player.position.y = KappaPosGrid.toExternal(moved.y); player.position.z = KappaPosGrid.toExternal(moved.z ?? 0); this.observerEngine.updatePosition(id, { x: player.position.x, y: player.position.y }); } }
    else if (msg.type === "chat") { if (msg.text && typeof msg.text === "string" && msg.text.trim().length > 0) this.ws.broadcast({ type: "CHAT_MSG", payload: { channel: msg.channel || "local", sender: player.name, text: msg.text.trim() } }); }
    else if (msg.type === "USE_SKILL") { const skillId = msg.skillId; if (skillId === "atk" && !checkCooldown(800)) return; if (skillId === "def") player.mana = Math.min(player.maxMana, player.mana + 10); if (skillId === "mag" && !checkCooldown(3000)) return; if ((skillId === "mag" || skillId === "atk") && !checkCooldown(800)) return; }
    else if (msg.type === "attack") { if (!checkCooldown(800)) return; this.handleAttack(id, player, msg); }
    else if (msg.type === "interact") { if (!checkCooldown(500)) return; this.handleInteract(id, player, msg); }
    else if (actionPayload?.kappaCoordinate) { this.pendingForestResourceActions.push({ socketId: id, playerId, input: actionPayload }); }
    else if (actionPayload?.nodeId && ["starter_tree_001", "starter_ore_001", "starter_fish_001"].includes(actionPayload.nodeId)) {
      this.pendingStarterResourceActions.push({ socketId: id, playerId, input: actionPayload });
    }
    else if (msg.type === "dialogue_choice") this.handleDialogueChoice(id, player, msg);
    else if (msg.type === "equip") { this.inventorySystem.equipItem(player, msg.itemId); this.saveAll(); }
    else if (msg.type === "unequip") { this.inventorySystem.unequipItem(player, msg.slot); this.saveAll(); }
    else if (msg.type === "drop") { this.inventorySystem.removeItem(player, msg.itemId); this.saveAll(); }
    else if (msg.type === "inventory_intent") {
      // Route through InventoryDirector for atomic server-side handling
      const intent = (msg.payload as any);
      const playerData = {
        id,
        uid: playerId,
        inventory: player.inventory ?? [],
        equipment: player.equipment ?? {},
        level: player.level,
        class: player.class,
      } as any;
      const result = inventoryDirector.processIntent(playerData, intent);
      if (!result.ok) {
        const error = result as { ok: false; code: string; message: string };
        this.ws.sendToPlayer(id, { type: "inventory_error", code: error.code, message: error.message });
      }
      // Snapshot is broadcast by InventoryDirector on success
      player.inventory = playerData.inventory;
      player.equipment = playerData.equipment;
      this.saveAll();
    }
    // ─── STORAGE INTERACTION HANDLERS ────────────────────────────────────────
    else if (msg.type === "open_storage") {
      // Player requests to open a storage entity (e.g., chest)
      const storageId = msg.payload?.storageId as string | undefined;
      if (!storageId) {
        this.ws.sendToPlayer(id, { type: "storage_error", code: "MISSING_STORAGE_ID", message: "Storage ID required" });
        return;
      }
      
      const storageEntity = storageEntityManager.getStorageEntity(storageId);
      if (!storageEntity) {
        this.ws.sendToPlayer(id, { type: "storage_error", code: "STORAGE_NOT_FOUND", message: "Storage not found" });
        return;
      }
      
      // Check proximity - player must be near the storage
      const dist = Math.hypot(player.position.x - storageEntity.position.x, player.position.y - storageEntity.position.y);
      if (dist > 40) {
        this.ws.sendToPlayer(id, { type: "storage_error", code: "TOO_FAR", message: "Too far from storage" });
        return;
      }
      
      // Lock the storage entity
      storageEntityManager.setStorageLocked(storageId, true);
      storageEntityManager.openStorage(storageId, this.tickCount);
      
      // Build storage snapshot for client
      const storageSnapshot = {
        storageId: storageEntity.entityId,
        storageType: storageEntity.storageType,
        inventory: {
          slots: storageEntity.inventory.slots.map((slot, idx) => {
            if (!slot) return null;
            // Convert InventorySlot to ModularItem - simplified for now
            return {
              signature: slot.id,
              name: slot.id.split(':').pop() ?? slot.id,
              category: "material" as const,
              rarity: "common" as const,
              ilvl: 1,
              stats: {},
              visualId: slot.id,
              quantity: slot.quantity,
            };
          }),
          maxSlots: storageEntity.inventory.maxSlots,
          currentWeight: storageEntity.inventory.currentWeight,
          maxWeight: storageEntity.inventory.maxWeight,
        },
        tick: this.tickCount,
      };
      
      this.ws.sendToPlayer(id, { type: "storage_snapshot", event: "storage_snapshot", payload: storageSnapshot });
    }
    else if (msg.type === "close_storage") {
      // Player closes storage - release lock
      const storageId = msg.payload?.storageId as string | undefined;
      if (storageId) {
        storageEntityManager.setStorageLocked(storageId, false);
      }
      this.ws.sendToPlayer(id, { type: "storage_closed", event: "storage_closed", storageId });
    }
    else if (msg.type === "transfer_item") {
      // Handle item transfer between player inventory and storage
      const intentPayload = msg.payload as any;
      const { fromStorageId, toStorageId, fromSlotIndex, toSlotIndex } = intentPayload;
      
      // Validate source/target
      if (!fromStorageId || !toStorageId || fromSlotIndex === undefined) {
        this.ws.sendToPlayer(id, { type: "storage_error", code: "INVALID_TRANSFER", message: "Invalid transfer parameters" });
        return;
      }
      
      // Find source storage entity
      let sourceStorage: StorageEntity | null = null;
      let destStorage: StorageEntity | null = null;
      
      if (fromStorageId !== "player") {
        sourceStorage = storageEntityManager.getStorageEntity(fromStorageId);
      }
      if (toStorageId !== "player") {
        destStorage = storageEntityManager.getStorageEntity(toStorageId);
      }
      
      // Check if source storage is locked by another player
      if (sourceStorage && sourceStorage.locked && sourceStorage.ownerId !== playerId) {
        this.ws.sendToPlayer(id, { type: "storage_error", code: "STORAGE_LOCKED", message: "Storage is locked by another player" });
        return;
      }
      if (destStorage && destStorage.locked && destStorage.ownerId !== playerId) {
        this.ws.sendToPlayer(id, { type: "storage_error", code: "STORAGE_LOCKED", message: "Storage is locked by another player" });
        return;
      }
      
      // Perform transfer
      let success = false;
      let reason = "";
      
      // Case 1: Player -> Storage
      if (fromStorageId === "player" && destStorage) {
        const playerItems = player.inventory?.slots ?? [];
        const item = playerItems[fromSlotIndex];
        if (item) {
          const addResult = storageEntityManager.addItemToStorage(
            toStorageId,
            item.id ?? String(fromSlotIndex),
            item.quantity ?? 1,
            this.tickCount
          );
          if (addResult.success) {
            // Remove from player
            playerItems[fromSlotIndex] = null;
            player.inventory.slots = playerItems;
            storageEntityManager.openStorage(toStorageId, this.tickCount);
            success = true;
            
            // Send updated player inventory snapshot
            this.ws.sendToPlayer(id, { 
              type: "inventory_snapshot", 
              event: "inventory_snapshot", 
              payload: { inventory: player.inventory, equipment: player.equipment } 
            });
            
            // Send updated storage snapshot
            const updatedStorage = storageEntityManager.getStorageEntity(toStorageId)!;
            this.ws.sendToPlayer(id, { type: "item_transferred", event: "item_transferred", fromStorageId, toStorageId, slotIndex: toSlotIndex });
            
            // Send new storage snapshot
            const storageSnapshot = {
              storageId: updatedStorage.entityId,
              storageType: updatedStorage.storageType,
              inventory: {
                slots: updatedStorage.inventory.slots.map((slot, idx) => slot ? {
                  signature: slot.id,
                  name: slot.id.split(':').pop() ?? slot.id,
                  category: "material" as const,
                  rarity: "common" as const,
                  ilvl: 1,
                  stats: {},
                  visualId: slot.id,
                  quantity: slot.quantity,
                } : null),
                maxSlots: updatedStorage.inventory.maxSlots,
                currentWeight: updatedStorage.inventory.currentWeight,
                maxWeight: updatedStorage.inventory.maxWeight,
              },
              tick: this.tickCount,
            };
            this.ws.sendToPlayer(id, { type: "storage_snapshot", event: "storage_snapshot", payload: storageSnapshot });
          } else {
            reason = addResult.reason ?? "TRANSFER_FAILED";
          }
        }
      }
      // Case 2: Storage -> Player
      else if (fromStorageId !== "player" && destStorage === null) {
        const sourceEntity = storageEntityManager.getStorageEntity(fromStorageId);
        if (sourceEntity) {
          const slot = sourceEntity.inventory.slots[fromSlotIndex];
          if (slot) {
            // Try to add to player inventory
            const playerItems = player.inventory?.slots ?? [];
            const emptySlot = toSlotIndex >= 0 ? toSlotIndex : playerItems.findIndex((s, i) => !s && i < (player.inventory?.maxSlots ?? 24));
            
            if (emptySlot >= 0) {
              const removeResult = storageEntityManager.removeItemFromStorage(
                fromStorageId,
                slot.id,
                slot.quantity,
                this.tickCount
              );
              if (removeResult.success) {
                playerItems[emptySlot] = { ...slot };
                player.inventory.slots = playerItems;
                storageEntityManager.openStorage(fromStorageId, this.tickCount);
                success = true;
                
                // Send updated storage snapshot
                const updatedStorage = storageEntityManager.getStorageEntity(fromStorageId)!;
                this.ws.sendToPlayer(id, { type: "item_transferred", event: "item_transferred", fromStorageId, toStorageId, slotIndex: fromSlotIndex });
                
                const storageSnapshot = {
                  storageId: updatedStorage.entityId,
                  storageType: updatedStorage.storageType,
                  inventory: {
                    slots: updatedStorage.inventory.slots.map((s, idx) => s ? {
                      signature: s.id,
                      name: s.id.split(':').pop() ?? s.id,
                      category: "material" as const,
                      rarity: "common" as const,
                      ilvl: 1,
                      stats: {},
                      visualId: s.id,
                      quantity: s.quantity,
                    } : null),
                    maxSlots: updatedStorage.inventory.maxSlots,
                    currentWeight: updatedStorage.inventory.currentWeight,
                    maxWeight: updatedStorage.inventory.maxWeight,
                  },
                  tick: this.tickCount,
                };
                this.ws.sendToPlayer(id, { type: "storage_snapshot", event: "storage_snapshot", payload: storageSnapshot });
                this.ws.sendToPlayer(id, { 
                  type: "inventory_snapshot", 
                  event: "inventory_snapshot", 
                  payload: { inventory: player.inventory, equipment: player.equipment } 
                });
              } else {
                reason = removeResult.reason ?? "TRANSFER_FAILED";
              }
            } else {
              reason = "PLAYER_INVENTORY_FULL";
            }
          }
        }
      }
      
      if (!success && !reason) {
        reason = "TRANSFER_FAILED";
      }
      if (!success) {
        this.ws.sendToPlayer(id, { type: "storage_error", code: reason, message: reason });
      }
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    // PHASE 5: SERVER GAMEPLAY CONTRACT
    // Authoritative message handling for Protocol v5 client-2d
    // ═══════════════════════════════════════════════════════════════════════
    
    // ─── client_hello ────────────────────────────────────────────────────
    // Client initiates connection with protocol version and client info.
    // This handler runs BEFORE the socketToPlayer lookup (line 927) since
    // new v5 clients don't go through legacy login that populates that map.
    // Phase 7: Supports identity fields for stable guest IDs and session tokens.
    else if (msg.type === "client_hello") {
      const requestId = getRequestId(msg);
      const payload = (msg as any).payload;
      
      // Validate protocol version compatibility (v5 or higher)
      if (typeof payload?.protocolVersion !== "number" || payload.protocolVersion < 5) {
        this.ws.sendToPlayer(id, serverError("invalid_payload", "Protocol version 5 or higher required", requestId));
        return;
      }
      
      // Phase 7: Try to resolve identity from client payload
      const identityService = getIdentityService();
      const ownershipService = createOwnershipService();
      
      try {
        const resolution = await identityService.resolve({
          stableGuestId: payload?.stableGuestId,
          sessionToken: payload?.sessionToken,
          selectedCharacterId: payload?.selectedCharacterId,
          displayName: payload?.displayName || "Guest"
        });
        
        // Create session with resolved player
        const session = createGameplaySession(resolution.character.playerId);
        
        // Phase 7: Store identity info on session
        session.identityId = resolution.identity.identityId;
        session.characterId = resolution.character.id;
        session.sessionToken = resolution.sessionToken;
        
        const playerEntity = session.entities.get(resolution.character.playerId)!;
        playerEntity.name = resolution.character.name;
        playerEntity.x = resolution.character.x;
        playerEntity.y = resolution.character.y;
        
        // Register in socket mappings
        this.socketToPlayer.set(id, resolution.character.playerId);
        this.playerToSocket.set(resolution.character.playerId, id);
        
        // Send welcome with identity info
        const welcome = makeWelcome(session);
        (welcome.payload as any).resumed = resolution.resumed;
        (welcome.payload as any).sessionToken = resolution.sessionToken;
        (welcome.payload as any).identityId = resolution.identity.identityId;
        (welcome.payload as any).characterId = resolution.character.id;
        (welcome.payload as any).characterName = resolution.character.name;
        this.ws.sendToPlayer(id, welcome);
        
        // Phase 7: Send character list
        const characters = await identityService.listCharacters(resolution.identity.identityId);
        this.ws.sendToPlayer(id, envelope("character_list", {
          characters: characters.map(c => ({
            id: c.id,
            name: c.name,
            sceneId: c.sceneId,
            level: c.level,
            updatedAtMs: c.updatedAtMs
          })),
          selectedCharacterId: resolution.character.id
        }));
        
      } catch (err) {
        console.warn(`[WorldTick] Identity resolution failed, falling back to guest:`, err);
        
        // Fallback to simple guest login
        const session = createGameplaySession(null);
        const newPlayerId = session.playerId;
        
        this.socketToPlayer.set(id, newPlayerId);
        this.playerToSocket.set(newPlayerId, id);
        
        this.ws.sendToPlayer(id, {
          type: "welcome",
          protocolVersion: SERVER_PROTOCOL_VERSION,
          t: Date.now(), // ARE-DETERMINISM-ALLOW: server response timestamp fallback
          payload: {
            playerId: newPlayerId,
            sceneId: "main",
            serverTick: this.tickCount,
            message: "Willkommen in Areloria"
          }
        });
      }
      return;
    }
    
    // ─── guest_login ────────────────────────────────────────────────────
    // Guest login without authentication (for local testing).
    // Handled after client_hello since v5 clients need to complete hello first.
    // Phase 7: Supports identity fields for stable guest IDs and session tokens.
    else if (msg.type === "guest_login") {
      const requestId = getRequestId(msg);
      const payload = (msg as any).payload;
      const displayName = payload?.displayName || "Guest";
      
      // PlayerId should exist from client_hello registration
      const playerId = this.socketToPlayer.get(id);
      if (!playerId) {
        this.ws.sendToPlayer(id, serverError("not_authenticated", "Send client_hello first", requestId));
        return;
      }
      
      // Phase 7: Try to resolve identity from guest_login payload if not already resolved
      const identityService = getIdentityService();
      
      try {
        const resolution = await identityService.resolve({
          stableGuestId: payload?.stableGuestId,
          sessionToken: payload?.sessionToken,
          selectedCharacterId: payload?.selectedCharacterId,
          displayName
        });
        
        // Update session with resolved identity
        const session = createGameplaySession(resolution.character.playerId);
        session.identityId = resolution.identity.identityId;
        session.characterId = resolution.character.id;
        session.sessionToken = resolution.sessionToken;
        
        const playerEntity = session.entities.get(resolution.character.playerId)!;
        playerEntity.name = resolution.character.name;
        playerEntity.x = resolution.character.x;
        playerEntity.y = resolution.character.y;
        
        // Send welcome with identity info
        const welcome = makeWelcome(session);
        (welcome.payload as any).resumed = resolution.resumed;
        (welcome.payload as any).sessionToken = resolution.sessionToken;
        (welcome.payload as any).identityId = resolution.identity.identityId;
        (welcome.payload as any).characterId = resolution.character.id;
        (welcome.payload as any).characterName = resolution.character.name;
        this.ws.sendToPlayer(id, welcome);
        this.ws.sendToPlayer(id, makeWorldSnapshot(session));
        
        // Send character list
        const characters = await identityService.listCharacters(resolution.identity.identityId);
        this.ws.sendToPlayer(id, envelope("character_list", {
          characters: characters.map(c => ({
            id: c.id,
            name: c.name,
            sceneId: c.sceneId,
            level: c.level,
            updatedAtMs: c.updatedAtMs
          })),
          selectedCharacterId: resolution.character.id
        }));
        
      } catch (err) {
        console.warn(`[WorldTick] guest_login identity resolution failed, using fallback:`, err);
        
        // Fallback to simple guest
        const persistence = getGameplayPersistence();
        let player: Awaited<ReturnType<typeof persistence.loadOrCreatePlayer>>;
        try {
          player = await persistence.loadOrCreatePlayer(playerId, displayName);
        } catch (persistErr) {
          console.warn(`[WorldTick] Persistence failed:`, persistErr);
          player = null;
        }
        
        const session = createGameplaySession(playerId);
        const playerEntity = session.entities.get(playerId)!;
        playerEntity.name = displayName;
        
        if (player) {
          playerEntity.x = player.x;
          playerEntity.y = player.y;
          playerEntity.hp = player.hp;
          playerEntity.maxHp = player.maxHp;
        }
        
        this.ws.sendToPlayer(id, makeWelcome(session));
        this.ws.sendToPlayer(id, makeWorldSnapshot(session));
      }
    }
    
    // ─── identity_resume ────────────────────────────────────────────────
    // Phase 7: Resume a session with a valid session token
    else if (msg.type === "identity_resume") {
      const requestId = getRequestId(msg);
      const payload = (msg as any).payload;
      const sessionToken = payload?.sessionToken;
      
      if (!sessionToken) {
        this.ws.sendToPlayer(id, serverError("invalid_payload", "sessionToken required", requestId));
        return;
      }
      
      const identityService = getIdentityService();
      
      try {
        const resolution = await identityService.resolve({ sessionToken });
        
        const session = createGameplaySession(resolution.character.playerId);
        session.identityId = resolution.identity.identityId;
        session.characterId = resolution.character.id;
        session.sessionToken = resolution.sessionToken;
        
        const playerEntity = session.entities.get(resolution.character.playerId)!;
        playerEntity.name = resolution.character.name;
        playerEntity.x = resolution.character.x;
        playerEntity.y = resolution.character.y;
        
        // Update socket mappings
        this.socketToPlayer.set(id, resolution.character.playerId);
        this.playerToSocket.set(resolution.character.playerId, id);
        
        const welcome = makeWelcome(session);
        (welcome.payload as any).resumed = true;
        (welcome.payload as any).sessionToken = resolution.sessionToken;
        (welcome.payload as any).identityId = resolution.identity.identityId;
        (welcome.payload as any).characterId = resolution.character.id;
        (welcome.payload as any).characterName = resolution.character.name;
        this.ws.sendToPlayer(id, welcome);
        
        this.ws.sendToPlayer(id, envelope("identity_resume_result", {
          ok: true,
          resumed: true,
          identityId: resolution.identity.identityId,
          characterId: resolution.character.id,
          sessionToken: resolution.sessionToken
        }));
        
      } catch (err) {
        console.warn(`[WorldTick] identity_resume failed:`, err);
        this.ws.sendToPlayer(id, envelope("identity_resume_result", {
          ok: false,
          reason: "Invalid or expired session token"
        }));
      }
      return;
    }
    
    // ─── character_list_request ─────────────────────────────────────────
    // Phase 7: Request character list for current identity
    else if (msg.type === "character_list_request") {
      const requestId = getRequestId(msg);
      const playerId = this.socketToPlayer.get(id);
      
      if (!playerId) {
        this.ws.sendToPlayer(id, serverError("not_authenticated", "Send client_hello first", requestId));
        return;
      }
      
      // Get identity from existing session or create guest identity
      const identityService = getIdentityService();
      
      try {
        const identity = await identityService.resolve({});
        const characters = await identityService.listCharacters(identity.identity.identityId);
        
        this.ws.sendToPlayer(id, envelope("character_list", {
          characters: characters.map(c => ({
            id: c.id,
            name: c.name,
            sceneId: c.sceneId,
            level: c.level,
            updatedAtMs: c.updatedAtMs
          }))
        }));
      } catch (err) {
        console.warn(`[WorldTick] character_list_request failed:`, err);
        this.ws.sendToPlayer(id, envelope("character_list", {
          characters: []
        }));
      }
      return;
    }
    
    // ─── character_create ────────────────────────────────────────────────
    // Phase 7: Create a new character
    else if (msg.type === "character_create") {
      const requestId = getRequestId(msg);
      const payload = (msg as any).payload;
      const name = (payload?.name || "Adventurer").trim().slice(0, 24);
      const playerId = this.socketToPlayer.get(id);
      
      if (!playerId) {
        this.ws.sendToPlayer(id, serverError("not_authenticated", "Send client_hello first", requestId));
        return;
      }
      
      const identityService = getIdentityService();
      
      try {
        // Get identity from session token or create guest
        const identityId = payload?.identityId || `identity_${playerId}`;
        
        const character = await identityService.createCharacter(identityId, name);
        
        this.ws.sendToPlayer(id, envelope("character_create_result", {
          ok: true,
          character: {
            id: character.id,
            name: character.name,
            sceneId: character.sceneId,
            level: character.level,
            updatedAtMs: character.updatedAtMs
          }
        }));
        
      } catch (err) {
        console.warn(`[WorldTick] character_create failed:`, err);
        this.ws.sendToPlayer(id, envelope("character_create_result", {
          ok: false,
          reason: "Failed to create character"
        }));
      }
      return;
    }
    
    // ─── character_select ────────────────────────────────────────────────
    // Phase 7: Select an existing character
    else if (msg.type === "character_select") {
      const requestId = getRequestId(msg);
      const payload = (msg as any).payload;
      const characterId = payload?.characterId as string;
      
      if (!characterId) {
        this.ws.sendToPlayer(id, serverError("invalid_payload", "characterId required", requestId));
        return;
      }
      
      const playerId = this.socketToPlayer.get(id);
      if (!playerId) {
        this.ws.sendToPlayer(id, serverError("not_authenticated", "Send client_hello first", requestId));
        return;
      }
      
      const identityService = getIdentityService();
      
      try {
        const character = await identityService.listCharacters(playerId).then(list => 
          list.find(c => c.id === characterId)
        );
        
        if (!character) {
          this.ws.sendToPlayer(id, envelope("character_select_result", {
            ok: false,
            reason: "Character not found or not owned by you"
          }));
          return;
        }
        
        // Create new session for selected character
        const session = createGameplaySession(character.playerId);
        session.identityId = character.ownerIdentityId;
        session.characterId = character.id;
        
        const playerEntity = session.entities.get(character.playerId)!;
        playerEntity.name = character.name;
        playerEntity.x = character.x;
        playerEntity.y = character.y;
        
        // Update socket mappings
        this.socketToPlayer.set(id, character.playerId);
        this.playerToSocket.set(character.playerId, id);
        
        this.ws.sendToPlayer(id, makeWelcome(session));
        this.ws.sendToPlayer(id, makeWorldSnapshot(session));
        
        this.ws.sendToPlayer(id, envelope("character_select_result", {
          ok: true,
          character: {
            id: character.id,
            name: character.name,
            sceneId: character.sceneId,
            level: character.level,
            updatedAtMs: character.updatedAtMs
          }
        }));
        
      } catch (err) {
        console.warn(`[WorldTick] character_select failed:`, err);
        this.ws.sendToPlayer(id, envelope("character_select_result", {
          ok: false,
          reason: "Failed to select character"
        }));
      }
      return;
    }
    
    // ─── input_frame ────────────────────────────────────────────────────
    // Deterministic input frame with sequenceId for reconciliation.
    // Fields are nested under payload per Protocol v5 ClientEnvelope format:
    // { type, payload: { sequenceId, tickId, moveX, moveY, ... }, t, protocolVersion }
    else if (msg.type === "input_frame") {
      const requestId = getRequestId(msg);
      const envelope = msg as any;
      const payload = envelope.payload;
      
      // PlayerId should exist from client_hello registration
      const playerId = this.socketToPlayer.get(id);
      if (!playerId) {
        this.ws.sendToPlayer(id, serverError("not_authenticated", "Send client_hello first", requestId));
        return;
      }
      
      if (typeof payload?.sequenceId !== "number" || typeof payload?.tickId !== "number") {
        this.ws.sendToPlayer(id, serverError("invalid_payload", "input_frame requires sequenceId and tickId in payload", requestId));
        return;
      }
      
      const player = this.playerSystem.getPlayer(playerId);
      if (!player) return;
      
      // Update player position from input
      // Using KappaPosGrid for deterministic movement
      const moveX = Math.max(-1, Math.min(1, Number(payload.moveX) || 0));
      const moveY = Math.max(-1, Math.min(1, Number(payload.moveY) || 0));
      
      if (moveX !== 0 || moveY !== 0) {
        const speed = 5; //tiles per 100ms tick
        const current = KappaPosGrid.create(player.position.x, player.position.y, player.position.z || 0);
        const moved = KappaPosGrid.move(current, moveX * speed, moveY * speed, 0, 1);
        player.position.x = KappaPosGrid.toExternal(moved.x);
        player.position.y = KappaPosGrid.toExternal(moved.y);
        player.position.z = KappaPosGrid.toExternal(moved.z ?? 0);
        this.observerEngine.updatePosition(id, { x: player.position.x, y: player.position.y });
      }
      
      // Send world snapshot with acknowledged input seq
      const allPlayers = this.playerSystem.getAllPlayers();
      const allNpcs = this.npcSystem.getAllNPCs();
      const strippedLoot = this.snapshotLootEntities();
      
      const entities = [
        ...allPlayers.filter(p => !p.isOffline).map(p => ({
          id: p.id, kind: "player" as const, x: p.position.x, y: p.position.y, vx: 0, vy: 0,
          name: p.name, hp: p.health, maxHp: p.maxHealth
        })),
        ...allNpcs.map(n => ({
          id: n.id, kind: "npc" as const, x: n.position.x, y: n.position.y, vx: 0, vy: 0,
          name: n.name, hp: n.health, maxHp: n.maxHealth
        })),
        ...strippedLoot.map(l => ({
          id: l.id, kind: "loot" as const, x: l.position?.x ?? 0, y: l.position?.y ?? 0, vx: 0, vy: 0
        }))
      ];
      
      this.ws.sendToPlayer(id, {
        type: "world_snapshot",
        protocolVersion: SERVER_PROTOCOL_VERSION,
        t: Date.now(), // ARE-DETERMINISM-ALLOW: server response timestamp
        payload: {
          protocolVersion: SERVER_PROTOCOL_VERSION,
          serverTick: this.tickCount,
          acknowledgedInputSeq: payload.sequenceId,
          localPlayerId: playerId,
          receivedAtMs: Date.now(), // ARE-DETERMINISM-ALLOW: client timing info
          entities
        }
      });
    }
    
    // ─── loot_pickup_request ─────────────────────────────────────────────
    // Player attempts to pick up loot entity
    else if (msg.type === "loot_pickup_request") {
      const requestId = getRequestId(msg);
      const envelope = msg as any;
      const payload = envelope.payload;
      const entityId = payload?.entityId as string;
      
      // PlayerId should exist from client_hello registration  
      const playerId = this.socketToPlayer.get(id);
      if (!playerId) {
        this.ws.sendToPlayer(id, serverError("not_authenticated", "Send client_hello first", requestId));
        return;
      }
      
      const player = this.playerSystem.getPlayer(playerId);
      if (!player) return;
      
      if (!entityId) {
        this.ws.sendToPlayer(id, serverError("invalid_payload", "entityId required", requestId));
        return;
      }
      
      const lootEntity = this.lootEntities.get(entityId);
      if (!lootEntity) {
        this.ws.sendToPlayer(id, serverError("not_found", "Loot not found", requestId));
        return;
      }
      
      // Check proximity - player must be within 20 tiles
      const dist = Math.hypot(player.position.x - lootEntity.position.x, player.position.y - lootEntity.position.y);
      if (dist > 20) {
        this.ws.sendToPlayer(id, serverError("too_far", "Loot is too far away", requestId));
        return;
      }
      
      // Add item to player inventory
      this.inventorySystem.addItem(player, lootEntity.item);
      
      // Remove loot entity
      this.lootEntities.delete(entityId);
      this.lootSpawnTicks.delete(entityId);
      
      // Persist inventory update after confirmed server action
      try {
        const persistence = getGameplayPersistence();
        const inventorySlots = player.inventory?.slots ?? [];
        const slots = inventorySlots.map((slot: any, index: number) => ({
          index,
          stack: slot ? { itemId: slot.id ?? slot.signature ?? `item_${index}`, quantity: slot.quantity ?? 1 } : null
        }));
        await persistence.saveInventorySnapshot(playerId, slots);
      } catch (err) {
        console.warn(`[WorldTick] Failed to persist inventory after loot pickup:`, err);
      }
      
      // Send success result
      this.ws.sendToPlayer(id, {
        type: "loot_pickup_result",
        protocolVersion: SERVER_PROTOCOL_VERSION,
        t: Date.now(), // ARE-DETERMINISM-ALLOW: server response timestamp
        payload: {
          requestId,
          ok: true,
          code: "ok",
          entityId,
          itemId: lootEntity.item.id,
          quantity: lootEntity.item.quantity ?? 1
        }
      });
      
      // Send updated inventory snapshot
      this.ws.sendToPlayer(id, {
        type: "inventory_snapshot",
        protocolVersion: SERVER_PROTOCOL_VERSION,
        t: Date.now(), // ARE-DETERMINISM-ALLOW: server response timestamp
        payload: { slots: player.inventory?.slots ?? [] }
      });
    }
    
    // ─── npc_interact_request ────────────────────────────────────────────
    // Player interacts with NPC
    else if (msg.type === "npc_interact_request") {
      const requestId = getRequestId(msg);
      const envelope = msg as any;
      const payload = envelope.payload;
      const npcId = payload?.npcId as string;
      
      // PlayerId should exist from client_hello registration
      const playerId = this.socketToPlayer.get(id);
      if (!playerId) {
        this.ws.sendToPlayer(id, serverError("not_authenticated", "Send client_hello first", requestId));
        return;
      }
      
      const player = this.playerSystem.getPlayer(playerId);
      if (!player) return;
      
      if (!npcId) {
        this.ws.sendToPlayer(id, serverError("invalid_payload", "npcId required", requestId));
        return;
      }
      
      const npc = this.npcSystem.getNPC(npcId);
      if (!npc) {
        this.ws.sendToPlayer(id, serverError("not_found", "NPC not found", requestId));
        return;
      }
      
      // Check proximity - player must be within 20 tiles
      const dist = Math.hypot(player.position.x - npc.position.x, player.position.y - npc.position.y);
      if (dist > 20) {
        this.ws.sendToPlayer(id, serverError("too_far", "NPC is too far away", requestId));
        return;
      }
      
      // Get dialogue from NPC system
      const interaction = this.npcSystem.handleInteraction(npcId, player, this.questSystem.getQuestDefinitions(), { 
        tick: this.tickCount, 
        biomeId: "forest_village" 
      });
      
      if (interaction) {
        this.ws.sendToPlayer(id, {
          type: "npc_dialogue",
          protocolVersion: SERVER_PROTOCOL_VERSION,
          t: Date.now(), // ARE-DETERMINISM-ALLOW: server response timestamp
          payload: {
            requestId,
            npcId,
            npcName: npc.name ?? "Unknown",
            text: interaction.text ?? "",
            choices: interaction.choices ?? []
          }
        });
      }

      // Quest progression: NPC interaction triggers quest events
      const questResult = handleGameplayQuestEvent({
        type: "player_npc_interaction",
        playerId,
        npcId,
      });

      if (questResult.changed) {
        // Send quest progress update to player
        this.ws.sendToPlayer(id, {
          type: "QUEST_PROGRESS",
          payload: {
            playerId,
            questIds: questResult.questIds,
          },
        });
      }
    }
    
    // ─── chunk_observe ───────────────────────────────────────────────────
    // Player observes chunks for terrain data
    else if (msg.type === "chunk_observe") {
      const requestId = getRequestId(msg);
      const envelope = msg as any;
      const payload = envelope.payload;
      const centerChunkId = payload?.centerChunkId as string;
      
      // PlayerId should exist from client_hello registration
      const playerId = this.socketToPlayer.get(id);
      if (!playerId) {
        this.ws.sendToPlayer(id, serverError("not_authenticated", "Send client_hello first", requestId));
        return;
      }
      
      // Generate chunk tiles for the observed area
      const tiles = [];
      const chunkCoords = (centerChunkId || "0:0").split(":");
      const baseX = parseInt(chunkCoords[0] || "0", 10) * 64;
      const baseZ = parseInt(chunkCoords[1] || "0", 10) * 64;
      
      // Generate 3x3 grid of tiles around center
      for (let dx = 0; dx < 3; dx++) {
        for (let dz = 0; dz < 3; dz++) {
          tiles.push({
            x: baseX + dx,
            y: baseZ + dz,
            terrain: (dx === 1 && dz === 1) ? "town" : "grass"
          });
        }
      }
      
      this.ws.sendToPlayer(id, {
        type: "chunk_snapshot",
        protocolVersion: SERVER_PROTOCOL_VERSION,
        t: Date.now(), // ARE-DETERMINISM-ALLOW: server response timestamp
        payload: {
          requestId,
          chunkId: centerChunkId || "0:0",
          serverTick: this.tickCount,
          tiles
        }
      });
    }
    
    // ─── skill_cast ──────────────────────────────────────────────────────
    // Player casts a skill
    else if (msg.type === "skill_cast") {
      const requestId = getRequestId(msg);
      const envelope = msg as any;
      const payload = envelope.payload;
      const skillId = payload?.skillId as string;
      
      // PlayerId should exist from client_hello registration
      const playerId = this.socketToPlayer.get(id);
      if (!playerId) {
        this.ws.sendToPlayer(id, serverError("not_authenticated", "Send client_hello first", requestId));
        return;
      }
      
      const player = this.playerSystem.getPlayer(playerId);
      if (!player) return;
      const charName = player.name;
      const targetX = payload?.x ?? player.position.x;
      const targetY = payload?.y ?? player.position.y;
      
      if (!skillId) {
        this.ws.sendToPlayer(id, serverError("invalid_payload", "skillId required", requestId));
        return;
      }
      
      // Check cooldown
      const cooldownTicks = Math.max(1, Math.ceil(800 / 100)); // 800ms default
      const nowTick = this.tickCount;
      const lastCast = this.lastActionTimes.get(charName)?.["skill_" + skillId] ?? 0;
      
      if (nowTick - lastCast < cooldownTicks) {
        this.ws.sendToPlayer(id, {
          type: "skill_result",
          protocolVersion: SERVER_PROTOCOL_VERSION,
          t: Date.now(), // ARE-DETERMINISM-ALLOW: server response timestamp
          payload: {
            requestId,
            ok: false,
            skillId,
            reason: "Cooldown not ready",
            cooldownRemainingTicks: cooldownTicks - (nowTick - lastCast)
          }
        });
        return;
      }
      
      // Update cooldown
      const pTimes = this.lastActionTimes.get(charName) || {};
      pTimes["skill_" + skillId] = nowTick;
      this.lastActionTimes.set(charName, pTimes);
      
      // Handle specific skills
      if (skillId === "impact_buster" || skillId === "primary") {
        // Find target in range
        const range = 30;
        const allNpcs = this.npcSystem.getAllNPCs();
        let hitTarget: any = null;
        
        for (const npc of allNpcs) {
          const dist = Math.hypot(npc.position.x - player.position.x, npc.position.y - player.position.y);
          if (dist < range) {
            hitTarget = npc;
            break;
          }
        }
        
        if (hitTarget) {
          const damage = 10;
          hitTarget.health -= damage;
          
          // Broadcast combat result
          this.ws.broadcast({
            type: "combat_result",
            payload: {
              id: `combat_${this.tickCount}_${Date.now()}`, // ARE-DETERMINISM-ALLOW: unique combat event ID
              atTick: this.tickCount,
              sourceId: playerId,
              targetId: hitTarget.id,
              x: hitTarget.position.x,
              y: hitTarget.position.y,
              amount: damage,
              kind: "damage" as const
            }
          });
          
          // Send skill result to caster
          this.ws.sendToPlayer(id, {
            type: "skill_result",
            protocolVersion: SERVER_PROTOCOL_VERSION,
            t: Date.now(), // ARE-DETERMINISM-ALLOW: server response timestamp
            payload: { requestId, ok: true, skillId }
          });
        } else {
          this.ws.sendToPlayer(id, {
            type: "skill_result",
            protocolVersion: SERVER_PROTOCOL_VERSION,
            t: Date.now(), // ARE-DETERMINISM-ALLOW: server response timestamp
            payload: { requestId, ok: true, skillId, reason: "No target in range" }
          });
        }
      }
    }
  }

  private processForestResourceActions() {
    for (const [key, until] of [...this.depletedResources.entries()]) {
      if (until <= this.tickCount) this.depletedResources.delete(key);
    }
    const queue = this.pendingForestResourceActions.splice(0, this.pendingForestResourceActions.length);
    for (const request of queue) {
      const player = this.playerSystem.getPlayer(request.playerId);
      if (!player || player.isOffline) continue;
      
      // ─── NEW: Handle deterministic RESOURCE entities ────────────────────────
      // These have KAPPA coordinates and are tracked via ChunkModificationDirector
      if (request.input?.resourceNodeId && request.input.resourceNodeId.startsWith('res_')) {
        const entityId = request.input.resourceNodeId as string;
        
        // Parse chunk coords from entityId: res_{type}_{chunkX}_{chunkZ}_{index}
        const parts = entityId.split('_');
        if (parts.length >= 5) {
          const chunkX = parseInt(parts[2], 10);
          const chunkZ = parseInt(parts[3], 10);
          
          // Check if resource is already depleted via ChunkModificationDirector
          if (chunkModificationDirector.isResourceDepleted(entityId)) {
            this.ws.sendToPlayer(request.socketId, { 
              type: "FOREST_RESOURCE_REJECTED", 
              reason: "depleted",
              entityId 
            });
            continue;
          }
          
          // Proceed with gathering - mark as depleted in ChunkModificationDirector
          const itemId = request.input.itemId ?? request.input.resourceType;
          this.inventorySystem.addItem(player, { id: itemId, quantity: 1, source: "resource", resourceType: request.input.resourceType });
          
          // Mark as depleted permanently (until server restart or world reset)
          chunkModificationDirector.markResourceDepleted(entityId, chunkX, chunkZ, this.tickCount);
          
          this.ws.sendToPlayer(request.socketId, { 
            type: "FOREST_RESOURCE_ACCEPTED", 
            resourceKey: entityId, 
            itemId, 
            quantity: 1, 
            depleted: true,
            entityId 
          });
          continue;
        }
      }
      // ─── END NEW ───────────────────────────────────────────────────────────
      
      const checked = checkForestResource(request.input);
      if (!checked.ok) { this.ws.sendToPlayer(request.socketId, { type: "FOREST_RESOURCE_REJECTED", reason: (checked as any).reason }); continue; }
      if (!isNearForestResource(player, checked.coord, FOREST_ACTION_DISTANCE)) { this.ws.sendToPlayer(request.socketId, { type: "FOREST_RESOURCE_REJECTED", reason: "too_far" }); continue; }
      if ((this.depletedResources.get(checked.key) ?? 0) > this.tickCount) { this.ws.sendToPlayer(request.socketId, { type: "FOREST_RESOURCE_REJECTED", reason: "depleted" }); continue; }
      this.inventorySystem.addItem(player, { id: checked.itemId, quantity: 1, source: "forest_resource", resourceType: checked.resourceType });
      player.questLog ??= { collected: {} };
      player.questLog.collected ??= {};
      player.questLog.collected[checked.itemId] = safeInt(player.questLog.collected[checked.itemId], 0) + 1;
      this.depletedResources.set(checked.key, this.tickCount + FOREST_RESPAWN_TICKS);
      this.ws.sendToPlayer(request.socketId, { type: "FOREST_RESOURCE_ACCEPTED", resourceKey: checked.key, itemId: checked.itemId, quantity: 1, respawnTick: this.tickCount + FOREST_RESPAWN_TICKS });
    }

    // ─── Starter Resource Nodes (Deterministic Gathering) ─────────────────────
    // Handle starter_tree_001, starter_ore_001, starter_fish_001
    // Uses .then() to avoid blocking the synchronous tick() method
    const starterQueue = this.pendingStarterResourceActions.splice(0, this.pendingStarterResourceActions.length);
    for (const request of starterQueue) {
      const player = this.playerSystem.getPlayer(request.playerId);
      if (!player || player.isOffline) continue;

      const playerId = this.socketToPlayer.get(request.socketId) ?? player?.id ?? request.playerId;
      const nodeId = request.input?.nodeId as string;

      // Only handle our specific starter node IDs
      if (!nodeId || !["starter_tree_001", "starter_ore_001", "starter_fish_001"].includes(nodeId)) {
        continue;
      }

      // Non-blocking: process gather asynchronously
      gatheringService.gather({
        playerId,
        nodeId,
        playerPosition: player.position ?? { x: 0, y: 0 },
        currentTick: this.tickCount,
        onItemReward: (item) => {
          this.inventorySystem.addItem(player, {
            id: item.id,
            name: item.name,
            quantity: item.quantity,
            source: "resource_gather",
          });
        },
      }).then((result) => {
        // Send result to player
        this.ws.sendToPlayer(request.socketId, {
          type: "RESOURCE_GATHER_RESULT",
          payload: result,
        });

        // If successful, also send skill progress update
        if (result.ok && result.skillId && result.xpReward) {
          this.ws.sendToPlayer(request.socketId, {
            type: "SKILL_PROGRESS",
            payload: {
              playerId,
              skillId: result.skillId,
              xpReward: result.xpReward,
            },
          });
        }
      }).catch((err) => {
        console.error(`[GatheringService] Error processing gather for ${nodeId}:`, err);
        this.ws.sendToPlayer(request.socketId, {
          type: "RESOURCE_GATHER_RESULT",
          payload: { ok: false, playerId, nodeId, reason: "node_not_found" },
        });
      });
    }
  }

  private handleAttack(id: string, player: any, msg: any) { 
    const targetId = msg.targetId; 
    const npc = this.npcSystem.getNPC(targetId); 
    if (npc && npc.health !== undefined) { 
      const dist = Math.hypot(player.position.x - npc.position.x, player.position.y - npc.position.y); 
      if (dist < 30) { 
        const baseDamage = 10; 
        npc.health -= baseDamage; 
        
        // ─────────────────────────────────────────────────────────────────
        // COMBAT_RESULT BROADCAST
        // ═════════════════════════════════════════════════════════════════
        // Sends combat result to all players so the chat overlay can display it.
        // ═════════════════════════════════════════════════════════════════
        this.ws.broadcast({ 
          type: "combat_result", 
          payload: {
            action: "strike",
            attacker: player.name ?? "Player",
            target: npc.name ?? targetId,
            damage: baseDamage,
            success: true,
            targetHealth: npc.health,
            targetMaxHealth: npc.maxHealth
          }
        });
        
        this.ws.broadcast({ type: "combat_feedback", targetId, damage: baseDamage, health: npc.health, maxHealth: npc.maxHealth }); 
        if (npc.health <= 0) this.handleNPCDeath(id, player, npc, targetId); 
      } 
    } 
  }
  private handleInteract(id: string, player: any, msg: any) { const targetId = msg.targetId; const npc = this.npcSystem.getNPC(targetId); const loot = this.lootEntities.get(targetId); if (npc) { const dist = Math.hypot(player.position.x - npc.position.x, player.position.y - npc.position.y); if (dist < 20) { const interaction = this.npcSystem.handleInteraction(targetId, player, this.questSystem.getQuestDefinitions(), { tick: this.tickCount, biomeId: "forest_village" }); if (interaction) this.ws.sendToPlayer(id, { type: "dialogue", source: interaction.source, text: interaction.text, choices: interaction.choices, npcId: interaction.npcId }); } } else if (loot) { const dist = Math.hypot(player.position.x - loot.position.x, player.position.y - loot.position.y); if (dist < 20) { this.inventorySystem.addItem(player, loot.item); this.lootEntities.delete(targetId); this.lootSpawnTicks.delete(targetId); this.ws.sendToPlayer(id, { type: "dialogue", source: "System", text: `Picked up ${loot.item.name}!` }); } } }
  private handleDialogueChoice(id: string, player: any, msg: any) { const { npcId, nodeId, choiceId } = msg; const interaction = this.npcSystem.handleChoice(npcId, nodeId, choiceId, player); if (interaction) this.ws.sendToPlayer(id, { type: "dialogue", source: interaction.source, text: interaction.text, choices: interaction.choices, npcId: interaction.npcId }); }
  private handleNPCDeath(socketId: string, player: any, npc: any, npcInstanceId: string) {
    const playerId = this.socketToPlayer.get(socketId) ?? player?.id ?? "unknown";

    npc.health = npc.maxHealth || 100;
    this.ws.sendToPlayer(socketId, { type: "dialogue", source: "System", text: `${npc.name} respawns.` });

    // Quest progression: NPC kill triggers quest events
    const questResult = handleGameplayQuestEvent({
      type: "player_npc_kill",
      playerId,
      npcId: npc.id,
    });

    if (questResult.changed) {
      this.ws.sendToPlayer(socketId, {
        type: "QUEST_PROGRESS",
        payload: {
          playerId,
          questIds: questResult.questIds,
        },
      });
    }
  }
  private hydratePlayer(player: any) { if (!player.id) player.id = "unknown"; if (!player.name) player.name = player.id; if (!player.position) player.position = { x: 0, y: 0 }; if (!player.inventory) player.inventory = []; if (!player.quests) player.quests = []; if (!player.equipment) player.equipment = { weapon: null, armor: null }; }
  private async saveAll() { const allPlayers = this.playerSystem.getAllPlayers(); const data: any = {}; for (const p of allPlayers) if (p.id !== "dummy_player") data[p.id] = p; await this.persistence.save(data); }
  
  start() { this.timer = setInterval(() => this.tick(), 100); }
  
  stop() { if (this.timer) clearInterval(this.timer); this.timer = null; }
  
  private buildAREPayload(): AREGuardPayload { return { l: 13, k: 1000, r: Math.round((0.5 + Math.sin(this.tickCount / 10) * 0.5) * 1000) / 1000, tick: this.tickCount, deterministicSeed: `ARE|k1000|tick:${this.tickCount}|chunk:64` }; }

  private measureDivergence(entityId: string, position: any): void {
    try { this.areDivergenceGuard.measure(this.tickCount, entityId, position, this.areShadowReplay); } catch {}
  }

  private runAREShadowTick(strippedPlayers: any[], strippedNpcs: any[]) {
    for (const player of strippedPlayers) {
      const entityId = `player:${player.id}`;
      AREShadowAdapter.executeShadowTick({
        entityId,
        position: player.position,
        velocity: { x: 0, y: 0, z: 0 },
        tick: this.tickCount,
        buffer: this.areShadowReplay,
        additionalState: { level: safeInt(player.level, 1), health: safeInt(player.health), maxHealth: safeInt(player.maxHealth), offline: Boolean(player.isOffline) },
      });
      this.measureDivergence(entityId, player.position);
    }
    for (const npc of strippedNpcs) {
      const entityId = `npc:${npc.id}`;
      AREShadowAdapter.executeShadowTick({
        entityId,
        position: npc.position,
        velocity: { x: 0, y: 0, z: 0 },
        tick: this.tickCount,
        buffer: this.areShadowReplay,
        additionalState: { health: safeInt(npc.health), maxHealth: safeInt(npc.maxHealth), role: String(npc.role ?? "npc") },
      });
      this.measureDivergence(entityId, npc.position);
    }
  }

  private oracleSectorKey(sector: unknown): string {
    return `oracle:${safeInt(sector, 0)}`;
  }

  private prophecyIntensity(prophecy: any): number {
    if (prophecy?.severity === "high") return 1000;
    if (prophecy?.severity === "medium") return 750;
    return 500;
  }

  private emitPropheticResonanceFromOracle(report: OracleReport | null): readonly any[] {
    if (!report?.ok || report.generatedAtTick === null) {
      this.latestPropheticResonanceEvents = Object.freeze([]);
      return this.latestPropheticResonanceEvents;
    }
    const emitted: any[] = [];
    const generatedAtTick = safeInt(report.generatedAtTick, this.tickCount);
    for (const prophecy of report.prophecies ?? []) {
      if (!prophecy?.active || prophecy.kind === "quiet_cycle") continue;
      const ticksUntil = safeInt(prophecy.ticksUntil, 0);
      const predictedTick = generatedAtTick + ticksUntil;
      if (predictedTick <= this.tickCount) continue;
      const sectorKey = this.oracleSectorKey(prophecy.sector);
      const field = this.electroweakPruning.observeProphecy({
        sectorKey,
        predictedTick,
        intensity: this.prophecyIntensity(prophecy),
      }, this.tickCount);
      emitted.push(Object.freeze({
        id: String(prophecy.id ?? `${sectorKey}:${predictedTick}`),
        kind: String(prophecy.kind ?? "oracle"),
        sector: safeInt(prophecy.sector, 0),
        sectorKey,
        predictedTick,
        ticksUntil: predictedTick - this.tickCount,
        intensity: this.prophecyIntensity(prophecy),
        omegaP: field.omegaP,
      }));
    }
    this.latestPropheticResonanceEvents = Object.freeze(emitted);
    return this.latestPropheticResonanceEvents;
  }

  private toAREEntityFromLoot(loot: any, spawnedAtTick: number): AREEntity {
    return {
      id: `loot:${loot.id}`,
      kind: "loot",
      kappa: {
        x: safeInt(Number(loot?.position?.x ?? 0) * 1000),
        y: safeInt(Number(loot?.position?.y ?? 0) * 1000),
        z: safeInt(Number(loot?.position?.z ?? 0) * 1000),
      },
      sectorKey: this.oracleSectorKey(sectorOf(loot)),
      baseEntropy: 0,
      lastInteractionTick: spawnedAtTick,
      plexity: 1,
      active: true,
    };
  }

  private snapshotLootEntities(): any[] {
    const strippedLoot = [];
    for (const l of this.lootEntities.values()) strippedLoot.push({ id: l.id, position: { x: l.position.x, y: l.position.y, z: l.position.z || 0 }, item: l.item ? { id: l.item.id, name: l.item.name, type: l.item.type } : null, glbPath: l.glbPath });
    return strippedLoot;
  }

  private collectNpcEmergenceEvents(): readonly any[] {
    const events = this.npcSystem.drainEmergenceEvents();
    this.latestEmergenceEvents = Object.freeze(events);
    if (events.length > 0) this.ws.broadcast({ type: "WORLD_EVENT_EMERGENCE_COLLAPSE", payload: events });
    return this.latestEmergenceEvents;
  }

  private pruneExpiredLoot(strippedLoot: any[]): readonly ElectroweakDecayEvent[] {
    const decayEvents: ElectroweakDecayEvent[] = [];
    for (const loot of strippedLoot) {
      const id = String(loot.id);
      const spawnedAtTick = this.lootSpawnTicks.get(id) ?? this.tickCount;
      this.lootSpawnTicks.set(id, spawnedAtTick);
      if (this.tickCount - spawnedAtTick < ELECTROWEAK_LOOT_TTL_TICKS) continue;
      const result = this.electroweakPruning.updateEntity(this.toAREEntityFromLoot(loot, spawnedAtTick), this.tickCount);
      if (!result.decayEvent) continue;
      this.lootEntities.delete(id);
      this.lootSpawnTicks.delete(id);
      decayEvents.push(result.decayEvent);
    }
    this.latestElectroweakDecayEvents = Object.freeze(decayEvents);
    if (decayEvents.length > 0) this.ws.broadcast({ type: "ARE_ELECTROWEAK_DECAY", payload: decayEvents });
    return this.latestElectroweakDecayEvents;
  }

  private updateAREContract(payload: AREGuardPayload, strippedPlayers: any[], strippedNpcs: any[], strippedLoot: any[]) {
    let guardStatus: AREInvariantGuardStatus;
    try { guardStatus = this.areGuard.validateTick(payload, this.tickCount); } catch (error) { if (error instanceof DeterminismViolation || (error as Error)?.name === "DeterminismViolation") guardStatus = this.areGuard.getStatus(); else throw error; }
    this.lastAREGuardStatus = guardStatus;
    areValidationState.updateGuard(guardStatus);
    if (this.tickCount % 10 === 0 || !this.lastWorldHashSnapshot) {
      this.lastWorldHashSnapshot = createWorldHashSnapshot({ tick: this.tickCount, payload, players: strippedPlayers, npcs: strippedNpcs, loot: strippedLoot, chunkSize: 64 });
      areValidationState.updateWorld(this.lastWorldHashSnapshot);
    }
    const hashCount = this.lastWorldHashSnapshot ? 2 + this.lastWorldHashSnapshot.chunks.length : 1;
    const usage = deterministicUsageTracker.recordHashes(this.tickCount, hashCount, "world_hash_snapshot");
    deterministicTickRecorder.record({ tick: this.tickCount, payload, worldHash: this.lastWorldHashSnapshot?.worldHash ?? null, worldSnapshot: this.lastWorldHashSnapshot, guard: guardStatus, worldState: { players: strippedPlayers, npcs: strippedNpcs, loot: strippedLoot } });
    if (this.tickCount % 10 === 0) {
      this.lastOracleReport = ouroborosOracleEngine.generate(deterministicTickRecorder.records());
      this.emitPropheticResonanceFromOracle(this.lastOracleReport);
    }
    const repairPlan = areAutoRepairService.evaluate({ tick: this.tickCount, guard: guardStatus, oracle: this.lastOracleReport, records: deterministicTickRecorder.records(), players: strippedPlayers, npcs: strippedNpcs, loot: strippedLoot, restoreWorldState: (record, sector) => this.restoreWorldStateFromRecord(record, sector) });
    if (repairPlan) this.ws.broadcast({ type: "ARE_AUTO_REPAIR", payload: areAutoRepairService.getStatus() });
    if (!guardStatus.ok && this.tickCount % 10 === 0) this.ws.broadcast({ type: "ARE_DETERMINISM_VIOLATION", payload: areValidationState.getSnapshot() });
    if (this.tickCount % 10 === 0) this.ws.broadcast({ type: "ARE_USAGE", payload: usage });
  }

  tick() {
    // ─────────────────────────────────────────────────────────────────
    // ARE DETERMINISM GATE - Level 3 Runtime Validation
    // ═════════════════════════════════════════════════════════════════
    // Pre-tick validation ensures every tick meets ARE invariants before
    // any game logic executes. This prevents cascade failures from
    // corrupted tick sequences.
    // ─────────────────────────────────────────────────────────────────
    const preTickPayload: AREGuardPayload = {
      l: 13,
      k: 1000,
      r: 1,
      tick: this.tickCount + 1, // Validate next tick number
      deterministicSeed: `ARE|pre-validation|tick:${this.tickCount + 1}`,
    };
    
    const preGuardStatus = this.areGuard.validateTick(preTickPayload);
    if (!preGuardStatus.ok) {
      // Log guard failure with detailed report
      if (this.tickCount % this.guardReportInterval === 0) {
        console.error(`[ARE Guard] Pre-tick validation failed at tick ${this.tickCount + 1}:`);
        for (const violation of preGuardStatus.violations) {
          console.error(`  - [${violation.code}] ${violation.message}`);
        }
      }
      
      // Broadcast violation for monitoring
      if (this.tickCount % 10 === 0) {
        this.ws.broadcast({ 
          type: "ARE_PRE_TICK_VIOLATION", 
          payload: { 
            tick: this.tickCount + 1, 
            violations: preGuardStatus.violations 
          } 
        });
      }
    }
    
    // ─────────────────────────────────────────────────────────────────
    // TICK EXECUTION
    // ═════════════════════════════════════════════════════════════════
    this.tickCount += 1;
    // Sync tick to InventoryDirector for deterministic loot generation
    inventoryDirector.setTick(this.tickCount);
    const payload = this.buildAREPayload();
    const allPlayers = this.playerSystem.getAllPlayers();
    AIOrchestrator.update(this.tickCount);
    processRespawns(
      { players: allPlayers as any, respawnPoints: (this.worldSystem as any).respawnPoints },
      this.tickCount,
      (playerId, type, p) => {
        const socketId = this.playerToSocket.get(playerId);
        if (socketId) this.ws.sendToPlayer(socketId, { type, payload: p });
      },
    );
    this.warfrontSystem.tick(this.tickCount * 100);
    this.npcSystem.tick(allPlayers.filter((p) => !p.isOffline), this.worldSystem.worldTime);
    const emergenceEvents = this.collectNpcEmergenceEvents();
    
    // ─────────────────────────────────────────────────────────────────
    // NPC CHAT EVENTS BROADCAST
    // ═════════════════════════════════════════════════════════════════
    // 
    // Drains NPC chat events from the NPCSystem and broadcasts them
    // to all connected players. This routes NPC dialogue to the chat overlay.
    // 
    // Per-ARE-Logic: Events are server-authoritative. NPCs emit deterministic
    // chat lines that are broadcast to all players in range.
    // ═════════════════════════════════════════════════════════════════
    const npcChatEvents = this.npcSystem.drainWorldChatEvents();
    for (const chatEvent of npcChatEvents) {
      this.ws.broadcast({
        type: "CHAT_MESSAGE",
        payload: {
          senderId: chatEvent.senderId,
          senderName: chatEvent.senderName,
          text: chatEvent.text,
          channel: chatEvent.channel ?? "global",
        }
      });
    }
    
    runWarfrontCombatTick({ tickCount: this.tickCount, npcSystem: this.npcSystem, playerSystem: this.playerSystem, combatService: this.combatService, broadcast: (p) => this.ws.broadcast(p) });
    const npcsAgg = this.npcSystem.getAllNPCs();
    let aggSum = 0;
    let aggN = 0;
    for (const n of npcsAgg) { const a = n.traits?.aggression; if (typeof a === "number" && Number.isFinite(a)) { aggSum += a; aggN++; } }
    WorldHistory.getInstance().recordAggressionSample(aggN > 0 ? aggSum / aggN : 0.36, this.tickCount);
    this.worldSystem.tick();
    this.processForestResourceActions();
    const strippedPlayers = [];
    for (let i = 0; i < allPlayers.length; i++) { const p = allPlayers[i]; strippedPlayers.push({ id: p.id, name: p.name, class: p.class, appearance: p.appearance, position: { x: p.position.x, y: p.position.y, z: p.position.z || 0 }, rotation: p.rotation || 0, level: p.level, health: p.health, maxHealth: p.maxHealth, isOffline: !!p.isOffline, state: p.state }); }
    const allNpcs = this.npcSystem.getAllNPCs();
    const strippedNpcs = [];
    for (let i = 0; i < allNpcs.length; i++) { const n = allNpcs[i]; strippedNpcs.push({ id: n.id, name: n.name, position: { x: n.position.x, y: n.position.y, z: n.position.z || 0 }, rotation: n.rotation || 0, health: n.health, maxHealth: n.maxHealth, role: n.role, state: n.state, fusionAdaptiveGlbPath: n.fusionAdaptiveGlbPath }); }
    let strippedLoot = this.snapshotLootEntities();
    const electroweakDecayEvents = this.pruneExpiredLoot(strippedLoot);
    if (electroweakDecayEvents.length > 0) strippedLoot = this.snapshotLootEntities();
    this.runAREShadowTick(strippedPlayers, strippedNpcs);
    this.updateAREContract(payload, strippedPlayers, strippedNpcs, strippedLoot);
    const autoRepair = areAutoRepairService.getStatus();
    const usage = deterministicUsageTracker.getStats(this.tickCount);
    if (this.tickCount % 10 === 0) { const npcs = allNpcs.map(n => ({ id: n.id, name: n.name, x: n.position.x, y: n.position.y })); this.ws.broadcast({ type: "WORLD_HEARTBEAT", payload: { players: Object.fromEntries(allPlayers.filter(p => !p.isOffline).map(p => [p.id, { id: p.id, name: p.name, x: p.position.x, y: p.position.y }])), agents: npcs, emergence: { events: emergenceEvents }, are: areValidationState.getSnapshot(), replay: deterministicTickRecorder.stats(), areShadow: this.getAREShadowReplayStats(), electroweakPruning: { ttlTicks: ELECTROWEAK_LOOT_TTL_TICKS, stats: this.electroweakPruning.getStats(), decayEvents: this.latestElectroweakDecayEvents, prophecies: this.latestPropheticResonanceEvents }, oracle: this.lastOracleReport, autoRepair, usage, warfront: this.warfrontSystem.getCycleSnapshot(this.tickCount * 100) } }); }
    
    // ─────────────────────────────────────────────────────────────────
    // SPATIAL BROADCAST UPDATE (Axiom 4: Spatial Plexity)
    // ═══════════════════════════════════════════════════════════════════
    // 
    // Step 1: Rebuild the spatial grid with current entity positions.
    // This O(1) Map structure enables fast 3x3 chunk queries.
    // We rebuild every tick since entities move frequently.
    //
    // Step 2: For each connected player, query their visible 3x3 chunk
    // grid and send a targeted world_snapshot. This ensures players
    // only receive entities within ~192 tiles (3 chunks × 64 tiles).
    //
    // This replaces the legacy broadcast-all approach with per-client
    // spatial filtering, reducing bandwidth and preventing cheats.
    // ─────────────────────────────────────────────────────────────────
    
    // Rebuild spatial grid with current tick's entity data
    // Clear first to rebuild fresh (or we could use upsert semantics)
    this.spatialBroadcastGrid.clear();
    
    // Add all online players to spatial grid
    for (const player of allPlayers) {
      if (player.isOffline) continue;
      const tileX = Math.round(player.position.x);
      const tileZ = Math.round(player.position.y);
      this.spatialBroadcastGrid.upsert(player.id, tileX, tileZ, "player", {
        id: player.id,
        name: player.name,
        x: tileX,
        z: tileZ,
        kind: "player",
        health: player.health,
        maxHealth: player.maxHealth,
        level: player.level,
        state: player.state,
      });
    }
    
    // Add all NPCs to spatial grid
    for (const npc of allNpcs) {
      const tileX = Math.round(npc.position.x);
      const tileZ = Math.round(npc.position.y);
      this.spatialBroadcastGrid.upsert(npc.id, tileX, tileZ, "npc", {
        id: npc.id,
        name: npc.name,
        x: tileX,
        z: tileZ,
        kind: "npc",
        health: npc.health,
        maxHealth: npc.maxHealth,
        role: npc.role,
        state: npc.state,
      });
    }
    
    // Add all loot entities to spatial grid
    for (const loot of strippedLoot) {
      if (!loot.position) continue;
      const tileX = Math.round(loot.position.x);
      const tileZ = Math.round(loot.position.y);
      this.spatialBroadcastGrid.upsert(loot.id, tileX, tileZ, "loot", {
        id: loot.id,
        x: tileX,
        z: tileZ,
        kind: "loot",
        items: loot.items,
        gold: loot.gold,
      });
    }
    
    // Broadcast spatial snapshots to each connected player
    // Each player receives ONLY entities within their 3x3 chunk grid
    for (const [socketId, playerId] of this.playerToSocket) {
      const player = this.playerSystem.getPlayer(playerId);
      if (!player || player.isOffline) continue;
      
      const playerTileX = Math.round(player.position.x);
      const playerTileZ = Math.round(player.position.y);
      
      this.broadcastSpatialSnapshot(socketId, playerTileX, playerTileZ, playerId);
    }
    
    // Write-behind: throttle-flush every 300 ticks (30 seconds)
    // NON-BLOCKING: triggers async flush, does not affect tick timing
    if (this.tickCount % 300 === 0) {
      this.debouncedFlushQueue();
    }
    
    // Legacy periodic save (backup to existing persistence)
    if (this.tickCount % 600 === 0) this.saveAll().catch(e => console.error(e));
    
    // ─────────────────────────────────────────────────────────────────
    // PERSISTENT PLAYTESTER NPC - Run deterministic bot tests
    // ═════════════════════════════════════════════════════════════════
    // The playtester NPC acts at configured intervals, testing all
    // game systems and generating structured JSONL logs.
    if (this.persistentPlaytester) {
      this.persistentPlaytester.tick();
    }
    
    // ─────────────────────────────────────────────────────────────────
    // MANIFEST SYSTEM - Record tick manifest for hash chain integrity
    // ═════════════════════════════════════════════════════════════════
    // This maintains the server-authoritative hash chain.
    // Replay guard is checked before broadcast to prevent stale updates.
    this.recordTickManifest();
    
    // Broadcast world state with manifest integrity info
    this.ws.broadcast({ type: "world_tick", tick: this.tickCount, players: strippedPlayers, npcs: strippedNpcs, loot: strippedLoot, emergence: { events: emergenceEvents }, are: { guard: this.lastAREGuardStatus, worldHash: this.lastWorldHashSnapshot?.worldHash ?? null, shadow: this.getAREShadowReplayStats(), electroweakPruning: { ttlTicks: ELECTROWEAK_LOOT_TTL_TICKS, stats: this.electroweakPruning.getStats(), decayEvents: this.latestElectroweakDecayEvents, prophecies: this.latestPropheticResonanceEvents }, emergence: { events: emergenceEvents } }, replay: { latestTick: this.tickCount }, oracle: this.lastOracleReport, autoRepair, usage, warfront: this.warfrontSystem.getCycleSnapshot(this.tickCount * 100), manifest: { stateHash: this.manifestManager.getLastStateHash(), snapshotTick: this.manifestManager.getLastSnapshotTick() } });
  }
  
  /**
   * Mark player dirty (called when inventory/skills change).
   * NON-BLOCKING: Fire-and-forget call from game logic.
   */
  public markPlayerDirty(playerId: string): void {
    persistenceDirector.markDirty(playerId);
  }
  
  /**
   * NON-BLOCKING queue flush for periodic saves.
   */
  private debouncedFlushQueue(): void {
    persistenceDirector.flushQueue().catch((err: any) => {
      console.error("[WorldTick] Queue flush failed:", err);
    });
  }
}
