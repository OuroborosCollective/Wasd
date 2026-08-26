/**
 * OracleChatBridge - Chat integration for Oracle prophecies.
 *
 * Subscribes to WorldEventBus oracle events and forwards selected messages to
 * the server chat router. This bridge is a side-channel only: it must not alter
 * gameplay state or simulation truth.
 */

import type { WorldEventBus, WorldEvent } from "../ouroboros/WorldEventBus.js";
import type {
  ChatChannelRouter,
  ChatRecipient,
  SendToPlayerFn,
  BroadcastFn,
  ResolveSocketIdFn,
} from "../chat/ChatChannelRouter.js";

export interface OracleChatBridgeConfig {
  /** Emit critical prophecies to global chat. Default: true. */
  broadcastCritical?: boolean;
  /** Include low/medium severity prophecies in status channel. Default: false. */
  emitStatusForAll?: boolean;
  /** Cooldown in deterministic ticks. Legacy ms config is treated as a tick count. */
  broadcastCooldownMs?: number;
}

type OracleCriticalWireData = {
  readonly message?: unknown;
  readonly tick?: unknown;
};

type OracleProphecyWireData = {
  readonly statement?: unknown;
};

type OracleRecommendationWireData = {
  readonly type?: unknown;
  readonly target?: unknown;
  readonly priority?: unknown;
  readonly reason?: unknown;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function asFiniteNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asMessage(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Connects Oracle events to chat without wall-clock timing.
 */
export class OracleChatBridge {
  private readonly eventBus: WorldEventBus;
  private readonly chatRouter: ChatChannelRouter;
  private readonly recipients: ChatRecipient[];
  private readonly sendToPlayer: SendToPlayerFn;
  private readonly broadcast: BroadcastFn;
  private readonly resolveSocketId: ResolveSocketIdFn;
  private readonly config: Required<OracleChatBridgeConfig>;
  private readonly broadcastCooldownTicks: number;
  private lastBroadcastTick = Number.NEGATIVE_INFINITY;
  private unsubscribes: Array<() => void> = [];

  constructor(
    eventBus: WorldEventBus,
    chatRouter: ChatChannelRouter,
    recipients: ChatRecipient[],
    sendToPlayer: SendToPlayerFn,
    broadcast: BroadcastFn,
    resolveSocketId: ResolveSocketIdFn,
    config: OracleChatBridgeConfig = {},
  ) {
    this.eventBus = eventBus;
    this.chatRouter = chatRouter;
    this.recipients = recipients;
    this.sendToPlayer = sendToPlayer;
    this.broadcast = broadcast;
    this.resolveSocketId = resolveSocketId;
    this.config = {
      broadcastCritical: config.broadcastCritical ?? true,
      emitStatusForAll: config.emitStatusForAll ?? false,
      broadcastCooldownMs: config.broadcastCooldownMs ?? 300,
    };
    this.broadcastCooldownTicks = Math.max(0, Math.trunc(this.config.broadcastCooldownMs));
    this.subscribe();
  }

  private subscribe(): void {
    if (this.config.broadcastCritical) {
      this.unsubscribes.push(this.eventBus.on("oracle_critical", (event) => this.handleCriticalEvent(event)));
    }

    if (this.config.emitStatusForAll) {
      this.unsubscribes.push(this.eventBus.on("oracle_prophecy", (event) => this.handleProphecyEvent(event)));
    }

    this.unsubscribes.push(this.eventBus.on("oracle_recommendation", (event) => this.handleRecommendationEvent(event)));
  }

  private eventTick(event: WorldEvent): number {
    const data = asRecord(event.data) as OracleCriticalWireData | null;
    return asFiniteNumber(data?.tick, event.ts);
  }

  private handleCriticalEvent(event: WorldEvent): void {
    const data = asRecord(event.data) as OracleCriticalWireData | null;
    const message = asMessage(data?.message);
    if (!message) return;

    const tick = this.eventTick(event);
    if (tick - this.lastBroadcastTick < this.broadcastCooldownTicks) {
      console.log(`[OracleChatBridge] Cooldown active at tick ${tick}, skipping broadcast: ${message}`);
      return;
    }
    this.lastBroadcastTick = tick;

    this.chatRouter.publish(
      {
        channel: "global",
        senderType: "system",
        senderId: "oracle",
        senderName: "[ORACLE]",
        text: message,
        position: event.position,
      },
      this.recipients,
      this.sendToPlayer,
      this.broadcast,
      this.resolveSocketId,
    );

    console.log(`[OracleChatBridge] Broadcast critical prophecy at tick ${tick}: ${message}`);
  }

  private handleProphecyEvent(event: WorldEvent): void {
    const data = asRecord(event.data) as OracleProphecyWireData | null;
    const statement = asMessage(data?.statement);
    if (!statement) return;

    this.chatRouter.emitStatus(
      `[Prophecy] ${statement}`,
      event.position,
      this.recipients,
      this.sendToPlayer,
      this.resolveSocketId,
    );
  }

  private handleRecommendationEvent(event: WorldEvent): void {
    const data = asRecord(event.data) as OracleRecommendationWireData | null;
    if (!data) return;

    console.log(
      `[OracleChatBridge] Oracle Recommendation: ${String(data.type ?? "unknown")} -> ${String(data.target ?? "unknown")} ` +
        `(priority: ${String(data.priority ?? "?")}, reason: ${String(data.reason ?? "")})`,
    );
  }

  destroy(): void {
    for (const unsub of this.unsubscribes) {
      unsub();
    }
    this.unsubscribes = [];
  }
}

export function createOracleChatBridge(
  eventBus: WorldEventBus,
  chatRouter: ChatChannelRouter,
  recipients: ChatRecipient[],
  sendToPlayer: SendToPlayerFn,
  broadcast: BroadcastFn,
  resolveSocketId: ResolveSocketIdFn,
  config?: OracleChatBridgeConfig,
): OracleChatBridge {
  return new OracleChatBridge(
    eventBus,
    chatRouter,
    recipients,
    sendToPlayer,
    broadcast,
    resolveSocketId,
    config,
  );
}
