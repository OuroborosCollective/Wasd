/**
 * OracleChatBridge - Chat integration for Oracle prophecies
 * 
 * Subscribes to WorldEventBus `oracle_critical` events and broadcasts
 * them to players via ChatChannelRouter.
 * 
 * Usage:
 * ```typescript
 * const bridge = new OracleChatBridge(eventBus, chatRouter, recipients, sendToPlayer, broadcast, resolveSocketId);
 * ```
 */

import type { WorldEventBus, WorldEvent } from "../ouroboros/WorldEventBus.js";
import type { ChatChannelRouter, ChatRecipient, SendToPlayerFn, BroadcastFn, ResolveSocketIdFn } from "./ChatChannelRouter.js";

export interface OracleChatBridgeConfig {
  /** Emit critical prophecies to global chat (default: true) */
  broadcastCritical?: boolean;
  /** Include low/medium severity prophecies in status channel (default: false) */
  emitStatusForAll?: boolean;
  /** Cooldown between broadcasts in ms (default: 30000 = 30 seconds) */
  broadcastCooldownMs?: number;
}

/**
 * OracleChatBridge connects Oracle prophecies to the Chat system
 * 
 * Listens to:
 * - oracle_critical → broadcasts to global chat as [ORACLE] messages
 * - oracle_prophecy → can emit to status channel if configured
 */
export class OracleChatBridge {
  private readonly eventBus: WorldEventBus;
  private readonly chatRouter: ChatChannelRouter;
  private readonly recipients: ChatRecipient[];
  private readonly sendToPlayer: SendToPlayerFn;
  private readonly broadcast: BroadcastFn;
  private readonly resolveSocketId: ResolveSocketIdFn;
  private readonly config: Required<OracleChatBridgeConfig>;
  
  // Cooldown tracking
  private lastBroadcastTime: number = 0;
  private readonly broadcastCooldownMs: number;
  
  // Event unsubscribe functions
  private unsubscribes: (() => void)[] = [];

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
      broadcastCooldownMs: config.broadcastCooldownMs ?? 30000,
    };
    this.broadcastCooldownMs = this.config.broadcastCooldownMs;
    
    this.subscribe();
  }

  /**
   * Subscribe to WorldEventBus events
   */
  private subscribe(): void {
    // Subscribe to critical prophecies - broadcast to global chat
    if (this.config.broadcastCritical) {
      const unsubCritical = this.eventBus.on("oracle_critical", (event: WorldEvent) => {
        this.handleCriticalEvent(event);
      });
      this.unsubscribes.push(unsubCritical);
    }
    
    // Subscribe to all prophecies - emit to status channel
    if (this.config.emitStatusForAll) {
      const unsubProphecy = this.eventBus.on("oracle_prophecy", (event: WorldEvent) => {
        this.handleProphecyEvent(event);
      });
      this.unsubscribes.push(unsubProphecy);
    }
    
    // Subscribe to recommendations - log for admin awareness
    const unsubRecommendation = this.eventBus.on("oracle_recommendation", (event: WorldEvent) => {
      this.handleRecommendationEvent(event);
    });
    this.unsubscribes.push(unsubRecommendation);
  }

  /**
   * Handle oracle_critical event - broadcast to global chat
   */
  private handleCriticalEvent(event: WorldEvent): void {
    const data = event.data as any;
    const message = data?.message;
    
    if (!message) return;
    
    // Check cooldown
    const now = Date.now();
    if (now - this.lastBroadcastTime < this.broadcastCooldownMs) {
      console.log(`[OracleChatBridge] Cooldown active, skipping broadcast: ${message}`);
      return;
    }
    this.lastBroadcastTime = now;
    
    // Broadcast to global chat
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
    
    console.log(`[OracleChatBridge] Broadcast critical prophecy: ${message}`);
  }

  /**
   * Handle oracle_prophecy event - emit to nearby players
   */
  private handleProphecyEvent(event: WorldEvent): void {
    const data = event.data as any;
    const statement = data?.statement;
    
    if (!statement) return;
    
    // Emit as status message to nearby players
    this.chatRouter.emitStatus(
      `[Prophecy] ${statement}`,
      event.position,
      this.recipients,
      this.sendToPlayer,
      this.resolveSocketId,
    );
  }

  /**
   * Handle oracle_recommendation event - log for admin
   */
  private handleRecommendationEvent(event: WorldEvent): void {
    const data = event.data as any;
    if (!data) return;
    
    // Log recommendation for admin awareness (could be sent to admin panel)
    console.log(
      `[OracleChatBridge] Oracle Recommendation: ${data.type} -> ${data.target} ` +
      `(priority: ${data.priority}, reason: ${data.reason})`
    );
  }

  /**
   * Unsubscribe from all events
   */
  destroy(): void {
    for (const unsub of this.unsubscribes) {
      unsub();
    }
    this.unsubscribes = [];
  }
}

// ============================================================================
// Factory function for quick setup
// ============================================================================

/**
 * Create OracleChatBridge with standard configuration
 */
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