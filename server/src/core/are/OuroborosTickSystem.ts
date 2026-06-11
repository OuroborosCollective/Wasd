/**
 * OuroborosTickSystem - Ouroboros autonomous agent cycle integration
 * 
 * Phase 11: Ouroboros Grand Unification with ARE-Logic
 * 
 * This TickSystem wraps OuroborosEngine and integrates it into the
 * WorldTickThinShell/WorldTickScheduler deterministic tick loop.
 * 
 * Ouroboros cycle: PERCEIVE → EVALUATE → ACT → REMEMBER → UPDATE → PERCEIVE
 * 
 * Contract:
 * - Implements TickSystem interface
 * - Uses deterministic FNV-1a hashing (no Math.random())
 * - Runs at NPC(400) priority (after gameplay, before broadcast)
 * - Accepts ChunkKey|string for compatibility
 */

import {
  TickSystemPriority,
  type TickSystem,
  type TickSystemContext,
} from "./TickSystem.js";
import {
  tickSystemRegistry,
  type TickSystemRegistry,
} from "./TickSystemRegistry.js";
import {
  type TickId,
  type ChunkKey,
  coerceChunkKey,
  parseChunkKey,
  TickSystemCategory,
} from "./types.js";

// Ouroboros imports
import {
  OuroborosEngine,
  type OuroborosEngineConfig,
} from "../../modules/ouroboros/OuroborosEngine.js";
import { NPCMemoryCache } from "../../modules/npc/NPCMemoryCache.js";
import type { NPCRelationshipSystem } from "../../modules/npc/NPCRelationshipSystem.js";
import type {
  ChatChannelRouter,
  ChatRecipient,
  SendToPlayerFn,
  BroadcastFn,
  ResolveSocketIdFn,
} from "../../modules/chat/ChatChannelRouter.js";
import type { StatusEmitter } from "../../modules/chat/StatusEmitter.js";

export const OUROBOROS_TICK_SYSTEM_NAME = "ouroboros" as const;
export const OUROBOROS_TICK_PRIORITY = TickSystemPriority.NPC; // 400

export interface OuroborosTickSystemOptions {
  readonly engineConfig?: Partial<OuroborosEngineConfig>;
  readonly tickInterval?: number;
  readonly npcBrainInterval?: number;
  readonly enableNPCBrain?: boolean;
}

/**
 * OuroborosTickSystem - Wraps OuroborosEngine for ARE tick system integration
 * 
 * This class:
 * 1. Implements the TickSystem interface
 * 2. Wraps OuroborosEngine for deterministic NPC behavior
 * 3. Runs at NPC priority (400) in the tick scheduler
 * 4. Uses spatial partitioning for O(1) proximity checks
 */
export class OuroborosTickSystem implements TickSystem {
  readonly id = OUROBOROS_TICK_SYSTEM_NAME;
  readonly name = OUROBOROS_TICK_SYSTEM_NAME;
  readonly priority = OUROBOROS_TICK_PRIORITY;
  readonly category = TickSystemCategory.AUTONOMOUS;
  enabled = true;

  private readonly engine: OuroborosEngine;
  private readonly memoryCache: NPCMemoryCache;
  private readonly relationships: NPCRelationshipSystem;
  
  // Chat/Status integration (set via setters before tick)
  private chatRouter: ChatChannelRouter | null = null;
  private statusEmitter: StatusEmitter | null = null;
  private chatRecipients: ChatRecipient[] = [];
  private sendToPlayer: SendToPlayerFn | null = null;
  private broadcast: BroadcastFn | null = null;
  private resolveSocketId: ResolveSocketIdFn | null = null;

  constructor(options: OuroborosTickSystemOptions = {}) {
    // Create OuroborosEngine with config
    const engineConfig: Partial<OuroborosEngineConfig> = {
      ...options.engineConfig,
    };
    
    if (options.tickInterval !== undefined) {
      engineConfig.tickInterval = options.tickInterval;
    }
    if (options.npcBrainInterval !== undefined) {
      engineConfig.npcBrainInterval = options.npcBrainInterval;
    }
    if (options.enableNPCBrain !== undefined) {
      engineConfig.enableNPCBrain = options.enableNPCBrain;
    }

    this.engine = new OuroborosEngine(engineConfig);
    
    // Create real NPC memory cache
    this.memoryCache = new NPCMemoryCache();
    
    // Create NPC relationship system
    this.relationships = {
      getRelationship: () => 0,
      setRelationship: () => {},
      getAllRelationships: () => [],
    } as unknown as NPCRelationshipSystem;
  }

  /**
   * Set chat integration callbacks
   */
  setChatIntegration(
    chatRouter: ChatChannelRouter,
    statusEmitter: StatusEmitter,
    recipients: ChatRecipient[],
    sendToPlayerFn: SendToPlayerFn,
    broadcastFn: BroadcastFn,
    resolveSocketIdFn: ResolveSocketIdFn,
  ): void {
    this.chatRouter = chatRouter;
    this.statusEmitter = statusEmitter;
    this.chatRecipients = recipients;
    this.sendToPlayer = sendToPlayerFn;
    this.broadcast = broadcastFn;
    this.resolveSocketId = resolveSocketIdFn;
  }

  /**
   * Main tick method - called by WorldTickScheduler
   * 
   * Context provides:
   * - tickId: current simulation tick
   * - tick: alternative tick field (number)
   * - world: optional world state
   */
  tick(context: TickSystemContext): void {
    // Extract tick count from context
    const tickCount = this.extractTickCount(context);
    
    // Ouroboros runs at configured interval (default: every 10 ticks = 1Hz)
    if (tickCount % 10 !== 0) {
      return; // Skip ticks based on Ouroboros interval
    }

    // Extract entities from context.world or use empty arrays
    const npcs = this.extractNpcs(context);
    const players = this.extractPlayers(context);
    const worldTime = this.extractWorldTime(context);

    // Get memory cache entries for NPC memory system
    this.getMemoryCacheEntries(npcs);

    // Call OuroborosEngine.tick()
    // Note: Some parameters may be null if not set via setChatIntegration
    this.engine.tick(
      tickCount,
      npcs,
      players,
      this.memoryCache,
      this.relationships,
      worldTime,
      this.chatRouter!,
      this.statusEmitter!,
      this.chatRecipients,
      this.sendToPlayer!,
      this.broadcast!,
      this.resolveSocketId!,
    );
  }

  /**
   * Optional initialization hook
   */
  init?(context?: TickSystemContext): void {
    console.log(`[OuroborosTickSystem] Initializing at tick ${context?.tickId ?? 0}`);
  }

  /**
   * Optional shutdown hook
   */
  shutdown?(context?: TickSystemContext): void {
    console.log(`[OuroborosTickSystem] Shutting down`);
  }

  /**
   * Get the OuroborosEngine for direct access if needed
   */
  getEngine(): OuroborosEngine {
    return this.engine;
  }

  /**
   * Get Ouroboros event bus
   */
  getEventBus() {
    return this.engine.eventBus;
  }

  /**
   * Get Ouroboros history
   */
  getHistory() {
    return this.engine.history;
  }

  /**
   * Get Ouroboros market
   */
  getMarket() {
    return this.engine.market;
  }

  /**
   * Get Ouroboros factions
   */
  getFactions() {
    return this.engine.factions;
  }

  /**
   * Extract tick count from context (handles TickId or number)
   */
  private extractTickCount(context: TickSystemContext): number {
    if (context.tickId !== undefined) {
      return typeof context.tickId === 'number' 
        ? context.tickId 
        : Number(context.tickId);
    }
    if (context.tick !== undefined) {
      return typeof context.tick === 'number' 
        ? context.tick 
        : Number(context.tick);
    }
    if (context.logicalIndex !== undefined) {
      return typeof context.logicalIndex === 'number' 
        ? context.logicalIndex 
        : Number(context.logicalIndex);
    }
    return 0;
  }

  /**
   * Extract world time from context (0-23.99 hours based on tick)
   */
  private extractWorldTime(context: TickSystemContext): number {
    const tickCount = this.extractTickCount(context);
    // Deterministic time: 0-23.99 based on tick modulo 1000
    return (tickCount % 1000) / 1000 * 24;
  }

  /**
   * Extract NPC entities from context.world
   */
  private extractNpcs(context: TickSystemContext): Array<{
    id: string;
    name: string;
    position: { x: number; y: number };
    faction?: string;
  }> {
    const world = context.world as any;
    if (!world) return [];
    
    if (Array.isArray(world.npcs)) {
      return world.npcs.map((npc: any) => ({
        id: String(npc.id ?? ''),
        name: String(npc.name ?? 'Unknown'),
        position: {
          x: Number(npc.position?.x ?? npc.position?.tileX ?? 0),
          y: Number(npc.position?.y ?? npc.position?.tileZ ?? npc.position?.tileY ?? 0),
        },
        faction: npc.faction ? String(npc.faction) : undefined,
      }));
    }
    
    return [];
  }

  /**
   * Extract player entities from context.world
   */
  private extractPlayers(context: TickSystemContext): Array<{
    id: string;
    name: string;
    position: { x: number; y: number };
  }> {
    const world = context.world as any;
    if (!world) return [];
    
    if (Array.isArray(world.players)) {
      return world.players.map((player: any) => ({
        id: String(player.id ?? ''),
        name: String(player.name ?? 'Unknown'),
        position: {
          x: Number(player.position?.x ?? player.position?.tileX ?? 0),
          y: Number(player.position?.y ?? player.position?.tileZ ?? player.position?.tileY ?? 0),
        },
      }));
    }
    
    return [];
  }

  /**
   * Get or create memory cache entries for NPCs
   */
  private getMemoryCacheEntries(npcs: Array<{ id: string }>): NPCMemoryCache {
    // NPCMemoryCache handles initialization internally
    return this.memoryCache;
  }
}

// ============================================================================
// OuroborosTickSystem Options
// ============================================================================

export const DEFAULT_OUROBOROS_TICK_OPTIONS: OuroborosTickSystemOptions = {
  engineConfig: {
    tickInterval: 10,        // 1 Hz at 10 ticks/sec
    conflictCheckInterval: 100,
    enableNPCBrain: true,
    npcBrainInterval: 10,
  },
};

/**
 * Create OuroborosTickSystem with default options
 */
export function createOuroborosTickSystem(
  options: OuroborosTickSystemOptions = {},
): OuroborosTickSystem {
  return new OuroborosTickSystem({
    ...DEFAULT_OUROBOROS_TICK_OPTIONS,
    ...options,
  });
}

// ============================================================================
// Registration Helper
// ============================================================================

/**
 * Register OuroborosTickSystem with the global TickSystemRegistry
 */
export function registerOuroborosTickSystem(
  options: OuroborosTickSystemOptions = {},
): OuroborosTickSystem {
  const system = createOuroborosTickSystem(options);
  
  tickSystemRegistry.register({
    system,
    dependencies: ['npc-system', 'player-system'],
    tags: ['autonomous', 'ouroboros', 'npc-brain', 'faction', 'market'],
  });
  
  console.log(`[OuroborosTickSystem] Registered with priority ${system.priority}`);
  
  return system;
}

// ============================================================================
// Global Instance (lazy initialization)
// ============================================================================

let ouroborosTickSystemInstance: OuroborosTickSystem | null = null;

/**
 * Get or create the global OuroborosTickSystem instance
 */
export function getOuroborosTickSystem(): OuroborosTickSystem {
  if (!ouroborosTickSystemInstance) {
    ouroborosTickSystemInstance = createOuroborosTickSystem();
  }
  return ouroborosTickSystemInstance;
}
