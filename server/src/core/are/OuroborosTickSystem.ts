/**
 * OuroborosTickSystem - Ouroboros autonomous agent cycle integration
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
import { TickSystemCategory } from "./types.js";
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

function toTickNumber(value: unknown, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

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
  private readonly statusEmitter: StatusEmitter;
  private readonly tickInterval: number;
  private tickCounter = 0;

  constructor(options: OuroborosTickSystemOptions = {}) {
    this.engine = new OuroborosEngine({
      ...(options.engineConfig ?? {}),
      tickInterval: options.tickInterval ?? options.engineConfig?.tickInterval ?? 10,
      npcBrainInterval: options.npcBrainInterval ?? options.engineConfig?.npcBrainInterval ?? 10,
      enableNPCBrain: options.enableNPCBrain ?? options.engineConfig?.enableNPCBrain ?? true,
    });
    this.memoryCache = new NPCMemoryCache();
    this.relationships = {
      getRelationship: () => 0,
      adjustAffinity: () => {},
    } as unknown as NPCRelationshipSystem;
    this.chatRouter = {} as ChatChannelRouter;
    this.recipients = [];
    this.sendToPlayer = () => {};
    this.broadcast = () => {};
    this.resolveSocketId = () => undefined;
    this.statusEmitter = {
      emitNpcThinking: () => {},
    } as unknown as StatusEmitter;
    this.tickInterval = options.tickInterval ?? 10;
  }

  tick(context: TickSystemContext): void {
    this.tickCounter += 1;
    if (this.tickCounter % this.tickInterval !== 0) return;

    const tick = toTickNumber(context.tickCount, this.tickCounter);
    this.engine.tick(
      tick,
      [],
      [],
      this.memoryCache,
      this.relationships,
      tick,
      this.chatRouter,
      this.statusEmitter,
      this.recipients,
      this.sendToPlayer,
      this.broadcast,
      this.resolveSocketId,
    );
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
