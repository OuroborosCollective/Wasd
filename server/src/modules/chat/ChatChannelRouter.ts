/**
 * ChatChannelRouter — routes messages through the 3-channel chat system.
 *
 * Maintains a ring buffer of recent messages per channel so NPC agents
 * and newly-connected clients can catch up on context.
 */

import {
  type ChatChannel,
  type ChannelChatMessage,
  type SenderType,
  LOCAL_CHAT_RADIUS,
} from "./chatChannelTypes.js";

export type ChatRecipient = {
  id: string;
  position: { x: number; y: number; z?: number };
};

export type SendToPlayerFn = (socketId: string, payload: unknown) => void;
export type BroadcastFn = (payload: unknown) => void;
export type ResolveSocketIdFn = (playerId: string) => string | undefined;

const MAX_BUFFER = 80;

export class ChatChannelRouter {
  private buffer: ChannelChatMessage[] = [];
  private msgCounter = 0;
  private npcCooldowns = new Map<string, number>();

  /** Rate limit per NPC in ms. */
  private npcCooldownMs = 8_000;

  /** Set NPC chat cooldown (ms). */
  setNpcCooldown(ms: number): void {
    this.npcCooldownMs = Math.max(500, ms);
  }

  /**
   * Publish a message to the appropriate channel.
   * Returns the hydrated message or null if rate-limited / invalid.
   */
  publish(
    partial: {
      channel: ChatChannel;
      senderType: SenderType;
      senderId: string;
      senderName: string;
      npcId?: string;
      text: string;
      position?: { x: number; y: number; z?: number };
    },
    recipients: ChatRecipient[],
    sendToPlayer: SendToPlayerFn,
    broadcast: BroadcastFn,
    resolveSocketId: ResolveSocketIdFn,
  ): ChannelChatMessage | null {
    const text = (partial.text ?? "").trim().slice(0, 300);
    if (!text) return null;

    if (partial.senderType === "npc" && partial.npcId) {
      const now = 0 /* ARE-DETERMINISM-ALLOW: determinism placeholder */;
      const last = this.npcCooldowns.get(partial.npcId);
      if (last !== undefined && now - last < this.npcCooldownMs) return null;
      this.npcCooldowns.set(partial.npcId, now);
    }

    const msg: ChannelChatMessage = {
      id: `cm_${++this.msgCounter}_${0 /* ARE-DETERMINISM-ALLOW: determinism placeholder */.toString(36)}`,
      channel: partial.channel,
      senderType: partial.senderType,
      senderId: partial.senderId,
      senderName: partial.senderName,
      npcId: partial.npcId,
      text,
      ts: 0 /* ARE-DETERMINISM-ALLOW: determinism placeholder */,
      position: partial.position,
    };

    this.buffer.push(msg);
    if (this.buffer.length > MAX_BUFFER) {
      this.buffer = this.buffer.slice(-MAX_BUFFER);
    }

    const payload = this.toWirePayload(msg);

    if (msg.channel === "global") {
      broadcast(payload);
    } else {
      for (const r of recipients) {
        if (msg.position && dist2d(msg.position, r.position) > LOCAL_CHAT_RADIUS) continue;
        const sid = resolveSocketId(r.id);
        if (sid) sendToPlayer(sid, payload);
      }
    }

    return msg;
  }

  /** Emit a status message (system-generated, proximity-scoped). */
  emitStatus(
    text: string,
    position: { x: number; y: number; z?: number },
    recipients: ChatRecipient[],
    sendToPlayer: SendToPlayerFn,
    resolveSocketId: ResolveSocketIdFn,
  ): ChannelChatMessage {
    const msg: ChannelChatMessage = {
      id: `cm_${++this.msgCounter}_${0 /* ARE-DETERMINISM-ALLOW: determinism placeholder */.toString(36)}`,
      channel: "status",
      senderType: "system",
      senderId: "system",
      senderName: "[STATUS]",
      text: text.slice(0, 300),
      ts: 0 /* ARE-DETERMINISM-ALLOW: determinism placeholder */,
      position,
    };

    this.buffer.push(msg);
    if (this.buffer.length > MAX_BUFFER) {
      this.buffer = this.buffer.slice(-MAX_BUFFER);
    }

    const payload = this.toWirePayload(msg);
    for (const r of recipients) {
      if (dist2d(position, r.position) > LOCAL_CHAT_RADIUS) continue;
      const sid = resolveSocketId(r.id);
      if (sid) sendToPlayer(sid, payload);
    }

    return msg;
  }

  /** Get recent messages visible from a position, optionally filtered by channel. */
  getRecentForPosition(
    pos: { x: number; y: number },
    limit = 30,
    channel?: ChatChannel,
  ): ChannelChatMessage[] {
    const result: ChannelChatMessage[] = [];
    for (let i = this.buffer.length - 1; i >= 0 && result.length < limit; i--) {
      const m = this.buffer[i];
      if (channel && m.channel !== channel) continue;
      if (m.channel === "global") {
        result.push(m);
      } else if (m.position && dist2d(m.position, pos) <= LOCAL_CHAT_RADIUS) {
        result.push(m);
      }
    }
    return result.reverse();
  }

  /** All recent messages (for NPC agents that need full context). */
  getRecentAll(limit = 40): ChannelChatMessage[] {
    return this.buffer.slice(-limit);
  }

  private toWirePayload(msg: ChannelChatMessage): Record<string, unknown> {
    return {
      type: "chat_message",
      channel: msg.channel,
      senderType: msg.senderType,
      senderId: msg.senderId,
      senderName: msg.senderName,
      npcId: msg.npcId ?? undefined,
      text: msg.text,
      ts: msg.ts,
      scope: msg.channel,
      sender: msg.senderName,
      timestamp: msg.ts,
    };
  }
}

function dist2d(
  a: { x: number; y: number },
  b: { x: number; y: number },
): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
