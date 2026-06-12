/**
 * Oracle Module - Living World System with WorldEventBus Integration.
 *
 * ARE Determinism: Uses deterministic createEvent() when available,
 * falls back to legacy emit() for backward compatibility.
 */

import type { WorldEventBus } from "../ouroboros/WorldEventBus.js";
import type {
  BroadcastFn,
  ChatChannelRouter,
  ChatRecipient,
  ResolveSocketIdFn,
  SendToPlayerFn,
} from "../chat/ChatChannelRouter.js";
import { createOracleChatBridge, type OracleChatBridge } from "./OracleChatBridge.js";

export {
  OracleModule,
  getOracleModule,
  setOracleModuleEventBus,
  resetOracleModule,
  type OracleModuleConfig,
  type OracleProphecyEventData,
  type OracleCriticalEventData,
  type OracleRecommendationEventData,
} from "./OracleModule.js";

export {
  OracleChatBridge,
  createOracleChatBridge,
  type OracleChatBridgeConfig,
} from "./OracleChatBridge.js";

/**
 * Extended event bus interface that supports deterministic createEvent().
 * Used by OracleChatBridge to determine which method to use.
 */
export interface DeterministicEventBus extends WorldEventBus {
  createEvent<TData = Record<string, unknown>>(
    input: { type: string; actorId?: string; data: TData },
    context: { tick: number; localIndex: number; stateHash?: string },
    position: { x: number; y: number },
    actorName: string,
    intensity?: number,
  ): WorldEvent;
}

/**
 * Target for Oracle Chat Bridge installation.
 * The bridge connects oracle events from the eventBus to chat broadcasts.
 */
export interface OracleChatBridgeInstallTarget {
  readonly eventBus?: WorldEventBus | DeterministicEventBus;
  readonly ouroborosEngine?: { readonly eventBus?: WorldEventBus | DeterministicEventBus };
  readonly chatRouter?: ChatChannelRouter;
  readonly chatSystem?: { readonly chatRouter?: ChatChannelRouter };
  readonly players?: ChatRecipient[];
  readonly sendToPlayer?: SendToPlayerFn;
  readonly broadcast?: BroadcastFn;
  readonly resolveSocketId?: ResolveSocketIdFn;
  readonly playerToSocket?: Map<string, string>;
  readonly ws?: {
    readonly sendToPlayer?: SendToPlayerFn;
    readonly broadcast?: BroadcastFn;
  };
}

/**
 * Install the Oracle Chat Bridge into the server shell/adapter.
 * This enables Oracle prophecies to be broadcast to players via chat.
 */
export function installOracleChatBridge(tick: OracleChatBridgeInstallTarget): OracleChatBridge | null {
  // Try to get deterministic event bus first, fall back to regular
  const deterministicBus = tick.eventBus as DeterministicEventBus | undefined
    ?? tick.ouroborosEngine?.eventBus as DeterministicEventBus | undefined;
  const eventBus = deterministicBus ?? tick.eventBus ?? tick.ouroborosEngine?.eventBus;

  const chatRouter = tick.chatSystem?.chatRouter ?? tick.chatRouter;

  if (!eventBus || !chatRouter) {
    console.log("[OracleChatBridge] Cannot install - eventBus or chatRouter not available");
    return null;
  }

  const recipients = tick.players ?? [];
  const sendToPlayer: SendToPlayerFn = tick.sendToPlayer ?? ((socketId, payload) => {
    tick.ws?.sendToPlayer?.(socketId, payload);
  });
  const broadcast: BroadcastFn = tick.broadcast ?? ((payload) => {
    tick.ws?.broadcast?.(payload);
  });
  const resolveSocketId: ResolveSocketIdFn = tick.resolveSocketId ?? ((playerId) => tick.playerToSocket?.get(playerId));

  // Create bridge with the event bus (deterministic or legacy)
  const bridge = createOracleChatBridge(
    eventBus,
    chatRouter,
    recipients,
    sendToPlayer,
    broadcast,
    resolveSocketId,
    { broadcastCritical: true, broadcastCooldownMs: 300 },
  );

  console.log(`[OracleChatBridge] Installed successfully (deterministic: ${deterministicBus ? 'yes' : 'legacy fallback'})`);
  return bridge;
}
