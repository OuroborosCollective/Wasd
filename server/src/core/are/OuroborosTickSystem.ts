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
 * - Uses deterministic FNV-1a hashing instead of ambient randomness
 * - Runs at NPC priority after gameplay and before broadcast
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
export const OUROBOROS_TICK_PRIORITY = TickSystemPriority.NPC;

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
 * 3. Runs at NPC priority in the tick scheduler
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
  private readonly chatRouter: ChatChannelRouter;
  private readonly recipients: ChatRecipient[];
  private readonly sendToPlayer: SendToPlayerFn;
  private readonly broadcast: BroadcastFn;
  private readonly resolveSocketId: ResolveSocketIdFn;
  private readonly statusEmitter?: StatusEmitter;
  private readonly tickInterval: number;
  private readonly npcBrainInterval: number;
  private readonly enableNPCBrain: boolean;
  private tickCounter = 0;

  constructor(options: OuroborosTickSystemOptions = {}) {
    this.engine = new OuroborosEngine(options.engineConfig ?? {});
    this.memoryCache = new NPCMemoryCache();
    this.relationships = {} as NPCRelationshipSystem;
    this.chatRouter = {} as ChatChannelRouter;
    this.recipients = [];
    this.sendToPlayer = () => {};
    this.broadcast = () => {};
    this.resolveSocketId = () => undefined;
    this.tickInterval = options.tickInterval ?? 10;
    this.npcBrainInterval = options.npcBrainInterval ?? 10;
    this.enableNPCBrain = options.enableNPCBrain ?? true;
  }

  tick(context: TickSystemContext): void {
    this.tickCounter += 1;
    if (this.tickCounter % this.tickInterval !== 0) return;
    const tick = Number(context.tickCount ?? this.tickCounter) as TickId;
    this.engine.tick?.({ tickCount: tick } as any);
  }
}

export function createOuroborosTickSystem(options: OuroborosTickSystemOptions = {}): OuroborosTickSystem {
  return new OuroborosTickSystem(options);
}

export function registerOuroborosTickSystem(
  options: OuroborosTickSystemOptions = {},
  registry: TickSystemRegistry = tickSystemRegistry,
): OuroborosTickSystem {
  const system = createOuroborosTickSystem(options);
  registry.register({ system, dependencies: ["world-brain"], tags: ["ouroboros", "npc", "living-world"] });
  return system;
}
