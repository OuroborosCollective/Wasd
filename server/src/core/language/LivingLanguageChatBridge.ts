import { getActiveGameWebSocketServer } from "../networking/WebSocketServer.js";

let pendingUtterances: PendingUtterance[] = [];

interface PendingUtterance {
  readonly npcId: string;
  readonly npcName: string;
  readonly text: string;
  readonly intent: string;
  readonly tick: number;
}

export function emitNpcDialogueEvents(
  utterances: readonly { readonly npcId: string; readonly constructedText: string; readonly intent: string }[],
  npcIdToName: Map<string, string>,
  currentTick: number
): void {
  if (utterances.length === 0) return;

  const events = utterances.map((utterance) => ({
    npcId: utterance.npcId,
    npcName: npcIdToName.get(utterance.npcId) ?? "NPC",
    text: utterance.constructedText,
    intent: utterance.intent,
    tick: currentTick,
  }));

  const ws = getActiveGameWebSocketServer();
  if (!ws) {
    queueUtterances(events);
    return;
  }

  flushPendingUtterances();
  for (const event of events) broadcastNpcDialogue(ws, event);
}

function queueUtterances(events: readonly PendingUtterance[]): void {
  pendingUtterances.push(...events);
  if (pendingUtterances.length > 100) pendingUtterances = pendingUtterances.slice(-50);
}

export function flushPendingUtterances(): void {
  if (pendingUtterances.length === 0) return;
  const ws = getActiveGameWebSocketServer();
  if (!ws) return;

  for (const event of pendingUtterances) broadcastNpcDialogue(ws, event);
  pendingUtterances = [];
}

function broadcastNpcDialogue(ws: { broadcast: (payload: unknown) => void }, utterance: PendingUtterance): void {
  ws.broadcast({
    type: "npc_dialogue",
    npcId: utterance.npcId,
    npcName: utterance.npcName,
    text: utterance.text,
    intent: utterance.intent,
    tick: utterance.tick,
  });
}

export function getPendingUtteranceCount(): number {
  return pendingUtterances.length;
}

export function clearPendingUtterances(): void {
  pendingUtterances = [];
}
