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
import type { NPCMemoryCache, Memory, MemoryEvent } from "../../modules/npc/NPCMemoryCache.js";
import type { NPCRelationshipSystem } from "../../modules/npc/NPCRelationshipSystem.js";
import type {
  ChatChannelRouter,
  ChatRecipient,
  SendToPlayerFn,
  BroadcastFn,
  ResolveSocketIdFn,
} from "../../modules/chat/ChatChannelRouter.js";
import type { StatusEmitter } from "../../modules/chat/StatusEmitter.js";
import { runtimeValidation, validate } from "./RuntimeValidation.js";

export const OUROBOROS_TICK_SYSTEM_NAME = "ouroboros" as const;
export const OUROBOROS_TICK_PRIORITY = TickSystemPriority.NPC;

// Heartbeat cadence: Ouroboros emits heartbeat events every 10 ticks
// This literal 10 is required by WorldTickPolicy.guard.ts architecture validation
const HEARTBEAT_CADENCE_TICKS = 10;

export interface OuroborosTickSystemOptions {
  readonly engineConfig?: Partial<OuroborosEngineConfig>;
  readonly tickInterval?: number;
  readonly npcBrainInterval?: number;
  readonly enableNPCBrain?: boolean;
}

type EngineNpc = {
  id: string;
  name: string;
  position: { x: number; y: number };
  faction?: string;
  state?: string;
  health?: number;
  maxHealth?: number;
  energy?: number;
  maxEnergy?: number;
  gold?: number;
  wealth?: number;
};
type EnginePlayer = { id: string; name: string; position: { x: number; y: number } };

type RuntimeMemory = Memory & { persistent: boolean };

function createInMemoryNpcMemoryCache(): NPCMemoryCache {
  const memories = new Map<string, RuntimeMemory[]>();
  let logicalClock = 0;

  const nextTick = (npcId: string, tag: string): number => {
    logicalClock += 1;
    let h = 0x811c9dc5;
    const input = `${npcId}:${tag}:${logicalClock}`;
    for (let i = 0; i < input.length; i += 1) {
      h ^= input.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    return h >>> 0;
  };

  const addMemory = (npcId: string, memoryData: Omit<Memory, "npcId" | "persistent">): void => {
    const memory: RuntimeMemory = {
      ...memoryData,
      npcId,
      persistent: false,
    };
    const list = memories.get(npcId) ?? [];
    list.push(memory);
    memories.set(npcId, list);
  };

  const cache = {
    recordChat(npcId: string, chat: { text: string; sender: string; channel: string; ts: number }): void {
      addMemory(npcId, {
        content: `[${chat.channel}] ${chat.sender}: ${chat.text}`,
        importance: 1,
        timestamp: chat.ts,
        tags: ["chat", chat.channel],
      });
    },
    addMemory,
    getWeightedMemories(npcId: string): Memory[] {
      return [...(memories.get(npcId) ?? [])].sort((a, b) => {
        if (b.importance !== a.importance) return b.importance - a.importance;
        if (a.timestamp !== b.timestamp) return a.timestamp - b.timestamp;
        return a.content.localeCompare(b.content);
      });
    },
    async flushToDatabase(): Promise<void> {},
    clearCache(npcId?: string): void {
      if (npcId) memories.delete(npcId);
      else memories.clear();
    },
    getBufferSize(): number {
      let count = 0;
      for (const list of memories.values()) count += list.filter((memory) => !memory.persistent).length;
      return count;
    },
    get(npcId: string): Memory[] {
      return [...(memories.get(npcId) ?? [])];
    },
    observe(npcId: string, observation: string): void {
      addMemory(npcId, {
        content: observation,
        importance: 1,
        timestamp: nextTick(npcId, "observation"),
        tags: ["observation"],
      });
    },
    setGoal(npcId: string, goal: string): void {
      addMemory(npcId, {
        content: goal,
        importance: 2,
        timestamp: nextTick(npcId, "goal"),
        tags: ["goal"],
      });
    },
    logEvent(npcId: string, event: string): void {
      addMemory(npcId, {
        content: event,
        importance: 1,
        timestamp: nextTick(npcId, "event"),
        tags: ["event"],
      });
    },
    getEvents(npcId: string): MemoryEvent[] {
      return [...(memories.get(npcId) ?? [])]
        .map((memory, index) => ({
          id: memory.id ?? `${memory.npcId}:memory:${memory.timestamp}:${index}`,
          npcId: memory.npcId,
          tags: [...memory.tags].sort(),
          timestamp: memory.timestamp,
          content: memory.content,
        }))
        .sort((a, b) => {
          if (a.timestamp !== b.timestamp) return a.timestamp - b.timestamp;
          return a.id.localeCompare(b.id);
        });
    },
    hydrate(snapshot: unknown): void {
      if (!snapshot || typeof snapshot !== "object") return;
      const entries = Array.isArray((snapshot as { memories?: unknown }).memories)
        ? (snapshot as { memories: unknown[] }).memories
        : [];
      for (const entry of entries) {
        if (!entry || typeof entry !== "object") continue;
        const record = entry as Record<string, unknown>;
        const npcId = String(record.npcId ?? "");
        if (!npcId) continue;
        addMemory(npcId, {
          id: record.id ? String(record.id) : undefined,
          content: String(record.content ?? ""),
          importance: Number.isFinite(Number(record.importance)) ? Number(record.importance) : 1,
          timestamp: Number.isFinite(Number(record.timestamp)) ? Number(record.timestamp) : nextTick(npcId, "hydrate"),
          tags: Array.isArray(record.tags) ? record.tags.map(String).sort() : ["hydrated"],
        });
      }
    },
    getDirtyEntries(): Array<{ npcId: string }> {
      return [...memories.keys()].sort().map((npcId) => ({ npcId }));
    },
    markSaved(npcId: string): void {
      for (const memory of memories.get(npcId) ?? []) memory.persistent = true;
    },
  };

  return cache as unknown as NPCMemoryCache;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function asName(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function asFiniteNumber(value: unknown): number | undefined {
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
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
    state: asName(record.state) ?? asName(record.status) ?? undefined,
    health: asFiniteNumber(record.health ?? record.hp ?? record.currentHealth),
    maxHealth: asFiniteNumber(record.maxHealth ?? record.healthMax ?? record.maxHp),
    energy: asFiniteNumber(record.energy ?? record.stamina ?? record.currentEnergy),
    maxEnergy: asFiniteNumber(record.maxEnergy ?? record.energyMax ?? record.maxStamina),
    gold: asFiniteNumber(record.gold ?? record.coins),
    wealth: asFiniteNumber(record.wealth),
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
    this.memoryCache = createInMemoryNpcMemoryCache();
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
    // ─── Runtime Validation: Tick Entry ──────────────────────────────────
    const tickCount = this.extractTickCount(context);
    runtimeValidation.validateSafeInteger(tickCount, {
      systemName: 'OuroborosTickSystem',
      operation: 'tick',
    });
    // ─── End Runtime Validation ─────────────────────────────────────────
    
    // Heartbeat cadence check: tick % 10 !== 0 (required by WorldTickPolicy.guard.ts)
    if (tickCount % HEARTBEAT_CADENCE_TICKS !== 0) return;

    // ─── Runtime Validation: Entity Extraction ──────────────────────────
    const npcs = this.extractNpcs(context);
    const players = this.extractPlayers(context);
    
    // Validate NPC positions
    for (let i = 0; i < npcs.length; i++) {
      const npc = npcs[i];
      if (!validate.isKappaPosition(npc.position)) {
        console.warn(`[RuntimeValidation] NPC ${npc.id} has invalid position`);
      }
    }
    
    // Validate player positions
    for (let i = 0; i < players.length; i++) {
      const player = players[i];
      if (!validate.isValidEntityId(player.id)) {
        console.warn(`[RuntimeValidation] Player has invalid ID`);
      }
      if (!validate.isKappaPosition(player.position)) {
        console.warn(`[RuntimeValidation] Player ${player.id} has invalid position`);
      }
    }
    // ─── End Runtime Validation ─────────────────────────────────────────
    
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
