/**
 * @file server/src/core/language/LivingLanguageChatBridge.ts
 * @description Bridge between Living Language System and WebSocket chat events.
 * 
 * Emits npc_dialogue events via WebSocket when NPCs generate speech through
 * the Living Language System. Integrates with the 2D client chat system.
 * 
 * HARD CONSTRAINTS:
 * - NO Date.now(), new Date(), Math.random(), crypto.randomUUID()
 * - All decisions derive from stable hashes
 */

import { getActiveGameWebSocketServer } from "../networking/WebSocketServer.js";

const CHAT_BRIDGE_TAG = "LINGUISTIC_CHAT_BRIDGE_V1";

// Queue for batching utterances to reduce WebSocket traffic
let pendingUtterances: PendingUtterance[] = [];
let flushScheduled = false;

interface PendingUtterance {
  npcId: string;
  npcName: string;
  text: string;
  intent: string;
  tick: number;
}

/**
 * Process NPC utterances and emit npc_dialogue events via WebSocket.
 * Call this after processLinguisticUpdate() in the tick loop.
 */
export function emitNpcDialogueEvents(
  utterances: readonly { npcId: string; constructedText: string; intent: string }[],
  npcIdToName: Map<string, string>,
  currentTick: number
): void {
  if (utterances.length === 0) return;

  const ws = getActiveGameWebSocketServer();
  if (!ws) {
    console.warn(`[${CHAT_BRIDGE_TAG}] No active WebSocket server, queuing utterances`);
    queueUtterances(utterances, npcIdToName, currentTick);
    return;
  }

  for (const utterance of utterances) {
    const npcName = npcIdToName.get(utterance.npcId) ?? "NPC";
    
    // Create the npc_dialogue event payload
    const dialogueEvent = {
      type: "npc_dialogue",
      npcId: utterance.npcId,
      npcName,
      text: utterance.constructedText,
      intent: utterance.intent,
      tick: currentTick,
    };

    // Send via WebSocket to all clients
    ws.broadcast(dialogueEvent);
  }

  console.log(`[${CHAT_BRIDGE_TAG}] Emitted ${utterances.length} npc_dialogue events at tick ${currentTick}`);
}

/**
 * Queue utterances for batch emission (when WebSocket not available).
 */
function queueUtterances(
  utterances: readonly { npcId: string; constructedText: string; intent: string }[],
  npcIdToName: Map<string, string>,
  tick: number
): void {
  for (const utterance of utterances) {
    pendingUtterances.push({
      npcId: utterance.npcId,
      npcName: npcIdToName.get(utterance.npcId) ?? "NPC",
      text: utterance.constructedText,
      intent: utterance.intent,
      tick,
    });
  }

  // Limit queue size to prevent memory issues
  if (pendingUtterances.length > 100) {
    pendingUtterances = pendingUtterances.slice(-50);
  }

  // Schedule flush when WebSocket becomes available
  if (!flushScheduled) {
    flushScheduled = true;
    setImmediate(flushPendingUtterances);
  }
}

/**
 * Flush queued utterances when WebSocket becomes available.
 */
function flushPendingUtterances(): void {
  flushScheduled = false;
  
  if (pendingUtterances.length === 0) return;

  const ws = getActiveGameWebSocketServer();
  if (!ws) {
    // Reschedule if WebSocket still not available
    flushScheduled = true;
    setImmediate(flushPendingUtterances);
    return;
  }

  for (const utterance of pendingUtterances) {
    ws.broadcast({
      type: "npc_dialogue",
      npcId: utterance.npcId,
      npcName: utterance.npcName,
      text: utterance.text,
      intent: utterance.intent,
      tick: utterance.tick,
    });
  }

  console.log(`[${CHAT_BRIDGE_TAG}] Flushed ${pendingUtterances.length} queued npc_dialogue events`);
  pendingUtterances = [];
}

/**
 * Get count of pending utterances in queue.
 */
export function getPendingUtteranceCount(): number {
  return pendingUtterances.length;
}

/**
 * Clear pending utterances (for testing).
 */
export function clearPendingUtterances(): void {
  pendingUtterances = [];
}