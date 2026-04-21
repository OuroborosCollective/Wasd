/**
 * NPCChatAgent — drives proactive NPC chat messages.
 *
 * Each tick, NPCs may write to local/global channels based on heuristic
 * weights, observations, and situational triggers.
 */

import { type NPCMemoryCache } from "./NPCMemoryCache.js";
import { type ChatChannelRouter } from "../chat/ChatChannelRouter.js";
import { type ChatRecipient, type SendToPlayerFn, type BroadcastFn, type ResolveSocketIdFn } from "../chat/ChatChannelRouter.js";
import { shouldChat, shouldSeekParty, shouldTrade } from "./NPCHeuristics.js";

interface NPCRef {
  id: string;
  name: string;
  position: { x: number; y: number; z?: number };
  class?: string;
  level?: number;
  state?: string;
}

const IDLE_LINES = [
  "Schönes Wetter heute...",
  "Habt ihr die Gerüchte über den Dungeon gehört?",
  "Ich brauche dringend bessere Ausrüstung.",
  "Pass auf dich auf, Abenteurer.",
  "Die Monster werden in letzter Zeit stärker.",
  "Ich habe gestern etwas Seltsames im Wald gesehen.",
  "Hat jemand Tränke übrig?",
  "Diese Gegend ist nicht sicher nach Einbruch der Dunkelheit.",
];

const PARTY_LINES = [
  "Suche Gruppe! Wer kommt mit?",
  "Alleine ist es gefährlich — jemand Lust auf eine Party?",
  "LFG — bin bereit für den nächsten Dungeon!",
];

const TRADE_LINES = [
  "Ich habe Waren zum Tauschen — Interesse?",
  "Gute Preise heute! Kommt und schaut euch um.",
  "Verkaufe seltene Materialien — wer braucht was?",
];

const PK_WARNING_TEMPLATE = "Achtung: %name% greift Spieler an! Seid vorsichtig!";

/**
 * Run one NPC chat decision cycle.
 * Called from the world tick for each active NPC near players.
 */
export function tickNpcChat(
  npc: NPCRef,
  memoryCache: NPCMemoryCache,
  chatRouter: ChatChannelRouter,
  recipients: ChatRecipient[],
  sendToPlayer: SendToPlayerFn,
  broadcast: BroadcastFn,
  resolveSocketId: ResolveSocketIdFn,
): void {
  const npcId = npc.id;
  const mem = memoryCache.get(npcId);

  if (!memoryCache.checkCooldown(npcId, "chat", 8_000)) return;

  if (shouldSeekParty(memoryCache, npcId)) {
    const line = PARTY_LINES[Math.floor(Math.random() * PARTY_LINES.length)];
    chatRouter.publish(
      {
        channel: "local",
        senderType: "npc",
        senderId: npcId,
        senderName: npc.name,
        npcId,
        text: line,
        position: npc.position,
      },
      recipients, sendToPlayer, broadcast, resolveSocketId,
    );
    memoryCache.logEvent(npcId, "chat:party_seek");
    return;
  }

  if (shouldTrade(memoryCache, npcId)) {
    const line = TRADE_LINES[Math.floor(Math.random() * TRADE_LINES.length)];
    chatRouter.publish(
      {
        channel: "local",
        senderType: "npc",
        senderId: npcId,
        senderName: npc.name,
        npcId,
        text: line,
        position: npc.position,
      },
      recipients, sendToPlayer, broadcast, resolveSocketId,
    );
    memoryCache.logEvent(npcId, "chat:trade_offer");
    return;
  }

  if (shouldChat(memoryCache, npcId)) {
    const line = IDLE_LINES[Math.floor(Math.random() * IDLE_LINES.length)];
    chatRouter.publish(
      {
        channel: "local",
        senderType: "npc",
        senderId: npcId,
        senderName: npc.name,
        npcId,
        text: line,
        position: npc.position,
      },
      recipients, sendToPlayer, broadcast, resolveSocketId,
    );
    return;
  }

  // React to recent status messages the NPC has seen
  const recentChat = mem.recentChatSeen;
  if (recentChat.length > 0) {
    const lastStatus = [...recentChat].reverse().find((c) => c.channel === "status");
    if (lastStatus && Date.now() - lastStatus.ts < 5_000) {
      if (lastStatus.text.includes("Monster") || lastStatus.text.includes("Angriff")) {
        if (memoryCache.checkCooldown(npcId, "react_status", 15_000)) {
          chatRouter.publish(
            {
              channel: "local",
              senderType: "npc",
              senderId: npcId,
              senderName: npc.name,
              npcId,
              text: "Vorsicht! Ich habe auch etwas gehört...",
              position: npc.position,
            },
            recipients, sendToPlayer, broadcast, resolveSocketId,
          );
        }
      }
    }
  }
}

/**
 * Emit a PK warning from an NPC that witnessed a player kill.
 */
export function emitPkWarning(
  npc: NPCRef,
  killerName: string,
  chatRouter: ChatChannelRouter,
  recipients: ChatRecipient[],
  sendToPlayer: SendToPlayerFn,
  broadcast: BroadcastFn,
  resolveSocketId: ResolveSocketIdFn,
): void {
  const text = PK_WARNING_TEMPLATE.replace("%name%", killerName);
  chatRouter.publish(
    {
      channel: "local",
      senderType: "npc",
      senderId: npc.id,
      senderName: npc.name,
      npcId: npc.id,
      text,
      position: npc.position,
    },
    recipients, sendToPlayer, broadcast, resolveSocketId,
  );
  chatRouter.publish(
    {
      channel: "global",
      senderType: "npc",
      senderId: npc.id,
      senderName: npc.name,
      npcId: npc.id,
      text,
      position: npc.position,
    },
    recipients, sendToPlayer, broadcast, resolveSocketId,
  );
}
