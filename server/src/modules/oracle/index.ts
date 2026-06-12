/**
 * Oracle Module - Living World System with WorldEventBus Integration.
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

export interface OracleChatBridgeInstallTarget {
  readonly eventBus?: WorldEventBus;
  readonly ouroborosEngine?: { readonly eventBus?: WorldEventBus };
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
 */
export function installOracleChatBridge(tick: OracleChatBridgeInstallTarget): OracleChatBridge | null {
  const eventBus = tick.ouroborosEngine?.eventBus ?? tick.eventBus;
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

  const bridge = createOracleChatBridge(
    eventBus,
    chatRouter,
    recipients,
    sendToPlayer,
    broadcast,
    resolveSocketId,
    { broadcastCritical: true, broadcastCooldownMs: 300 },
  );

  console.log("[OracleChatBridge] Installed successfully");
  return bridge;
}
