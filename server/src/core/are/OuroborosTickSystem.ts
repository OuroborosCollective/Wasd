/**
 * OuroborosTickSystem - Ouroboros autonomous agent cycle integration
 *
 * Phase 11: Ouroboros Grand Unification with ARE-Logic
 *
 * This TickSystem wraps OuroborosEngine and integrates it into the
 * WorldTickThinShell/WorldTickScheduler deterministic tick loop.
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

type EngineNpc = { id: string; name: string; position: { x: number; y: number }; faction?: string };
type EnginePlayer = { id: string; name: string; position: { x: number; y: number } };

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function asName(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function readPosition(value: unknown): { x: number; y: number } | null {
  const record = asRecord(value);
  if (!record) return null;
  const x = Number(record.x ?? record.tileX ?? record.kappaX);
  const y = Number(record.y ?? record.tileY ?? record.tileZ ?? record.z ?? record.kappaY ?? record.kappaZ);
  return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null;
}

function readEntityPosition(record: Record<string, unknown>): { x: number; y: number } | null {
  return readPosition(record.position) ?? readPosition(record);
}

function toNpc(value: unknown): EngineNpc | null {
  const record = asRecord(value);
  if (!record) return null;
  const id = asName(record.id) ?? asName(record.npcId) ?? asName(record.entityId);
  const position = readEntityPosition(record);
  if (!id || !position) return null;
  return {
    id,
    name: asName(record.name) ?? asName(record.displayName) ?? id,
    position,
    faction: asName(record.faction) ?? asName(record.factionId) ?? undefined,
  };
}

function toPlayer(value: unknown): EnginePlayer | null {
  const record = asRecord(value);
  if (!record) return null;
  const id = asName(record.id) ?? asName(record.playerId) ?? asName(record.entityId);
  const position = readEntityPosition(record);
  if (!id || !position) return null;
  return {
    id,
    name: asName(record.name) ?? asName(record.displayName) ?? id,
    position,
  };
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
  private chatRouter: ChatChannelRouter | null = null;
  private statusEmitter: StatusEmitter | null = null;
  private chatRecipients: ChatRecipient[] = [];
  private sendToPlayer: SendToPlayerFn | null = null;
  private broadcast: BroadcastFn | null = null;
  private resolveSocketId: ResolveSocketIdFn | null = null;
  private readonly tickInterval: number;

  constructor(options: OuroborosTickSystemOptions = {}) {
    const engineConfig: Partial<OuroborosEngineConfig> = {
      ...options.engineConfig,
    };
    if (options.tickInterval !== undefined) engineConfig.tickInterval = options.tickInterval;
    if (options.npcBrainInterval !== undefined) engineConfig.npcBrainInterval = options.npcBrainInterval;
    if (options.enableNPCBrain !== undefined) engineConfig.enableNPCBrain = options.enableNPCBrain;

    this.engine = new OuroborosEngine(engineConfig);
    this.memoryCache = new NPCMemoryCache();
    this.relationships = {
      getRelationship: () => 0,
      setRelationship: () => {},
      getAllRelationships: () => [],
    } as unknown as NPCRelationshipSystem;
    this.tickInterval = options.tickInterval ?? options.engineConfig?.tickInterval ?? 10;
  }

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

  tick(context: TickSystemContext): void {
    const tickCount = this.extractTickCount(context);
    if (tickCount % this.tickInterval !== 0) return;

    const npcs = this.extractNpcs(context);
    const players = this.extractPlayers(context);
    const worldTime = this.extractWorldTime(context);

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

  init?(context?: TickSystemContext): void {
    console.log(`[OuroborosTickSystem] Initializing at tick ${context?.tickId ?? 0}`);
  }

  shutdown?(_context?: TickSystemContext): void {
    console.log("[OuroborosTickSystem] Shutting down");
  }

  getEngine(): OuroborosEngine { return this.engine; }
  getEventBus() { return this.engine.eventBus; }
  getHistory() { return this.engine.history; }
  getMarket() { return this.engine.market; }
  getFactions() { return this.engine.factions; }

  private extractTickCount(context: TickSystemContext): number {
    if (context.tickId !== undefined) return Number(context.tickId);
    if (context.tick !== undefined) return Number(context.tick);
    if (context.logicalIndex !== undefined) return Number(context.logicalIndex);
    if (context.tickCount !== undefined) return Number(context.tickCount);
    return 0;
  }

  private extractWorldTime(context: TickSystemContext): number {
    const tickCount = this.extractTickCount(context);
    return ((tickCount % 1000) / 1000) * 24;
  }

  private extractNpcs(context: TickSystemContext): EngineNpc[] {
    const world = asRecord(context.world);
    const source = Array.isArray(world?.npcs) ? world.npcs : [];
    return source.map(toNpc).filter((entity): entity is EngineNpc => entity !== null);
  }

  private extractPlayers(context: TickSystemContext): EnginePlayer[] {
    const world = asRecord(context.world);
    const source = Array.isArray(world?.players) ? world.players : [];
    return source.map(toPlayer).filter((entity): entity is EnginePlayer => entity !== null);
  }
}

export const DEFAULT_OUROBOROS_TICK_OPTIONS: OuroborosTickSystemOptions = {
  engineConfig: {
    tickInterval: 10,
    conflictCheckInterval: 100,
    enableNPCBrain: true,
    npcBrainInterval: 10,
  },
};

export function createOuroborosTickSystem(options: OuroborosTickSystemOptions = {}): OuroborosTickSystem {
  return new OuroborosTickSystem({
    ...DEFAULT_OUROBOROS_TICK_OPTIONS,
    ...options,
  });
}

export function registerOuroborosTickSystem(
  options: OuroborosTickSystemOptions = {},
  registry: TickSystemRegistry = tickSystemRegistry,
): OuroborosTickSystem {
  const system = getOuroborosTickSystem(options);
  registry.register({
    system,
    dependencies: ["npc-system", "player-system"],
    tags: ["autonomous", "ouroboros", "npc-brain", "faction", "market"],
  });
  console.log(`[OuroborosTickSystem] Registered with priority ${system.priority}`);
  return system;
}

let ouroborosTickSystemInstance: OuroborosTickSystem | null = null;

export function getOuroborosTickSystem(options: OuroborosTickSystemOptions = {}): OuroborosTickSystem {
  if (!ouroborosTickSystemInstance) {
    ouroborosTickSystemInstance = createOuroborosTickSystem(options);
  }
  return ouroborosTickSystemInstance;
}
