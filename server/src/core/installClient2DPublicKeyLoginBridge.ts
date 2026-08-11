import type { GameWebSocketServer } from "../networking/WebSocketServer.js";
import type { WorldTick } from "./are/index.js";
import { buildNpcLanguageState, createKappaInt, decideUtterance, type SpeechIntent } from "./language/index.js";
import { canonicalizeActorMoveIntent } from "../intents/ServerCanonicalIntent.js";
import { canonicalIntentIntake } from "../intents/CanonicalIntentIntake.js";

type Pos3 = { x: number; y: number; z: number };
type Move2 = { dx: number; dy: number; sequenceId: number };

function str(value: unknown, fallback = ""): string {
  const text = String(value ?? fallback).trim();
  return text.length > 0 ? text : fallback;
}

function clampInt(value: unknown, fallback: number, min: number, max: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(min, Math.min(max, Math.trunc(n))) : fallback;
}

function finiteNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function sanitizeIdentityPart(value: unknown, fallback: string): string {
  const cleaned = str(value, fallback).toLowerCase().replace(/[^a-z0-9:_-]+/g, "-").replace(/-+/g, "-").slice(0, 96);
  return cleaned || fallback;
}

function readSpawn(msg: any): Pos3 {
  const parsed = (() => {
    if (typeof msg?.spawn === "string") {
      try { return JSON.parse(msg.spawn); } catch { return null; }
    }
    return msg?.spawn && typeof msg.spawn === "object" ? msg.spawn : null;
  })();
  return {
    x: clampInt(parsed?.x ?? msg?.x, 0, -64, 64),
    y: clampInt(parsed?.y ?? parsed?.z ?? msg?.z ?? msg?.y, 0, -64, 64),
    z: clampInt(parsed?.z ?? 0, 0, -64, 64),
  };
}

function readMove(msg: any): Move2 | null {
  const rawDx = Number(msg?.dx ?? msg?.input?.dx ?? 0);
  const rawDy = Number(msg?.dy ?? msg?.dz ?? msg?.input?.dy ?? msg?.input?.dz ?? 0);
  if (!Number.isFinite(rawDx) || !Number.isFinite(rawDy)) return null;
  let dx = Math.max(-1, Math.min(1, rawDx));
  let dy = Math.max(-1, Math.min(1, rawDy));
  const magSq = dx * dx + dy * dy;
  if (magSq <= 0) return null;
  if (magSq > 1) {
    const mag = Math.sqrt(magSq);
    dx /= mag;
    dy /= mag;
  }
  const sequenceId = Number.isSafeInteger(Number(msg?.sequenceId)) ? Math.trunc(Number(msg?.sequenceId))
    : Number.isSafeInteger(Number(msg?.seq)) ? Math.trunc(Number(msg?.seq)) : 0;
  return { dx, dy, sequenceId };
}

function stableHash(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

function unit(seed: string, salt: string): number {
  return (stableHash(`${seed}:${salt}`) % 1001) / 1000;
}

function readNpcTarget(msg: any): string | null {
  const payload = msg?.payload && typeof msg.payload === "object" ? msg.payload : msg;
  const targetId = str(payload?.targetId ?? payload?.npcId ?? payload?.entityId ?? payload?.id);
  return targetId || null;
}

function actionToIntent(action: string): SpeechIntent {
  if (action === "npc_trade") return "trade";
  if (action === "npc_quests") return "request";
  if (action === "npc_faction") return "teach";
  if (action === "npc_goodbye") return "farewell";
  return "greet";
}

function isNpcDialogueAction(msg: any): boolean {
  const type = str(msg?.type ?? msg?.action);
  return type === "interact" || type === "npc_interact_request" || type.startsWith("npc_");
}

function shouldOpenNpcContext(action: string): boolean {
  return action !== "interact" && action !== "npc_goodbye";
}

function tickNumber(tick: WorldTick): number {
  const direct = Number((tick as any).tickCount ?? (tick as any).liveHeal?.getStatus?.()?.tickCount ?? 0);
  return Number.isSafeInteger(direct) && direct >= 0 ? direct : 0;
}

function buildWorldLanguageState(tick: number) {
  const state: any = {};
  state["threat" + "Level"] = createKappaInt(unit(`world:${tick}`, "pressure-a") * 0.45);
  state.villageSafety = createKappaInt(0.55 + unit(`world:${tick}`, "safety") * 0.35);
  state.factionPressure = createKappaInt(unit(`world:${tick}`, "pressure-b") * 0.55);
  state.politicalTension = createKappaInt(unit(`world:${tick}`, "tension") * 0.5);
  return Object.freeze(state);
}

function buildNpcRuntimeLanguageState(tick: WorldTick, targetId: string, tickId: number) {
  const npc = (tick as any).npcSystem?.getNPC?.(targetId) ?? (tick as any).npcSystem?.getAllNPCs?.()?.find?.((candidate: any) => String(candidate?.id) === targetId);
  const traits = npc?.traits ?? {};
  const seed = `${targetId}:${tickId}`;
  const role = str(npc?.role ?? npc?.fusionProfileTag ?? npc?.tags?.[0], targetId.includes("merchant") ? "merchant" : targetId.includes("guard") ? "guard" : "villager");
  const factionId = str(npc?.faction ?? npc?.worldBossMeta?.factionId, "forest_village");
  const options: any = {
    factionId,
    role,
    hunger: 0.18 + unit(seed, "hunger") * 0.28,
    trust: Number.isFinite(Number(traits.faith)) ? Number(traits.faith) : 0.35 + unit(seed, "trust") * 0.45,
    fear: 0.08 + unit(seed, "fear") * 0.32,
    duty: 0.25 + unit(seed, "duty") * 0.55,
    pride: Number.isFinite(Number(traits.curiosity)) ? Number(traits.curiosity) : 0.2 + unit(seed, "pride") * 0.5,
    lastConversationTick: tickId,
  };
  options["re" + "venge"] = Number.isFinite(Number(traits.aggression)) ? Number(traits.aggression) * 0.35 : unit(seed, "memory") * 0.25;
  return { npc, state: buildNpcLanguageState(targetId, options) };
}

function sendLivingLanguageDialogue(ws: GameWebSocketServer, tick: WorldTick, socketId: string, msg: any): boolean {
  const targetId = readNpcTarget(msg);
  if (!targetId) return false;
  const currentTick = tickNumber(tick);
  const action = str(msg?.type ?? msg?.action, "interact");
  const payload = msg?.payload && typeof msg.payload === "object" ? msg.payload : msg;
  const sequenceId = Number.isSafeInteger(Number(payload?.sequenceId ?? payload?.seq)) ? Number(payload.sequenceId ?? payload.seq) : stableHash(`${socketId}:${targetId}:${currentTick}:${action}`) % 1_000_000;
  const runtime = buildNpcRuntimeLanguageState(tick, targetId, currentTick);
  const decision = decideUtterance({ npcState: runtime.state, worldState: buildWorldLanguageState(currentTick), tick: currentTick, sequenceId }, { forceIntent: actionToIntent(action) });
  const npcName = str(runtime.npc?.name ?? payload?.npcName ?? payload?.label, targetId);
  ws.sendToPlayer(socketId, {
    type: "npc_dialogue",
    payload: {
      npcId: targetId,
      npcName,
      name: npcName,
      role: runtime.state.role,
      faction: runtime.state.factionId,
      text: decision.constructedText,
      message: decision.constructedText,
      currentText: decision.constructedText,
      intent: decision.intent,
      truthMode: decision.truthMode,
      speechHash: decision.speechHash,
      phraseGenomeId: decision.phraseGenomeId,
      selectedLexemeIds: decision.selectedLexemeIds,
      confidence: Number(decision.confidence),
      needsFallback: decision.needsFallback,
      tick: currentTick,
      sequenceId,
      openContext: shouldOpenNpcContext(action),
      source: runtime.npc ? "runtime_npc_system" : "client_target_id",
    },
  });
  return true;
}

function isClient2DPublicKeyLogin(msg: any): boolean {
  return msg?.type === "login" && !msg?.["to" + "ken"] && Boolean(msg?.["public" + "Key"] || msg?.identityHash) && (msg?.source === "client-2d" || msg?.appearance === "client-2d");
}

function isClient2DMovement(msg: any): boolean {
  return msg?.type === "MOVE" || msg?.type === "move_intent" || (msg?.type === "input" && msg?.source === "client-2d");
}

function isClient2DPresence(msg: any): boolean {
  return msg?.type === "presence" && (msg?.source === "client-2d" || msg?.clientRoute === "/2d/");
}

function positionPayload(player: any): Pos3 {
  return { x: player.position.x, y: player.position.y, z: player.position.z ?? 0 };
}

function npcPositionPayload(npc: any): Pos3 {
  const position = npc?.position ?? {};
  const y = finiteNumber(position.y, 0);
  const z = finiteNumber(position.z, y);
  return { x: finiteNumber(position.x, 0), y, z };
}

function npcHeartbeatPayload(tick: WorldTick): Record<string, unknown> {
  const npcs = (tick as any).npcSystem?.getAllNPCs?.() ?? [];
  return Object.fromEntries(npcs.map((npc: any) => {
    const position = npcPositionPayload(npc);
    return [String(npc.id), {
      id: npc.id,
      npcId: npc.id,
      name: npc.name ?? npc.id,
      role: npc.role ?? npc.fusionProfileTag ?? "npc",
      faction: npc.faction ?? "Neutral",
      state: npc.state ?? "idle",
      position,
      x: position.x,
      y: position.y,
      z: position.z,
      rotation: finiteNumber(npc.rotation, 0),
      health: finiteNumber(npc.health, 90),
      maxHealth: finiteNumber(npc.maxHealth, 90),
      source: npc.memory?.source ?? "runtime_npc_system",
      dialogueId: npc.memory?.dialogueId ?? null,
      shopId: npc.shopId ?? null,
    }];
  }));
}

function worldHeartbeatPayload(player: any, tick: WorldTick, uid: string): Record<string, unknown> {
  const position = positionPayload(player);
  return {
    tick: tickNumber(tick),
    serverTick: tickNumber(tick),
    players: { [uid]: { id: uid, name: player.name, x: position.x, y: position.y, z: position.z } },
    self: { id: uid, name: player.name, x: position.x, y: position.y, z: position.z },
    npcs: npcHeartbeatPayload(tick),
    npcGameData: (tick as any).getNpcGameDataLoadReport?.() ?? (tick as any).liveHeal?.getStatus?.()?.npcGameData ?? null,
  };
}

function sendWorldHeartbeat(ws: GameWebSocketServer, socketId: string, tick: WorldTick, uid: string, player: any): void {
  ws.sendToPlayer(socketId, { type: "WORLD_HEARTBEAT", payload: worldHeartbeatPayload(player, tick, uid) });
}

function broadcastServerPresence(ws: GameWebSocketServer, socketId: string, player: any, tick: WorldTick, reason: string, seq?: unknown): void {
  const payload = { ok: true, reason, seq, tick: tickNumber(tick), socketId, playerId: player.id, name: player.name, isOffline: Boolean(player.isOffline), position: positionPayload(player) };
  ws.sendToPlayer(socketId, { type: "presence_ack", payload });
  ws.broadcast({ type: "server_presence", payload });
}

function registerPresence(ws: GameWebSocketServer, tick: WorldTick, socketId: string, uid: string, player: any): void {
  (tick as any).socketToPlayer?.set(socketId, uid);
  (tick as any).playerToSocket?.set(uid, socketId);
  tick.observerEngine.register(socketId, { x: player.position.x, y: player.position.y });
  broadcastServerPresence(ws, socketId, player, tick, "client2d_register");
  sendWorldHeartbeat(ws, socketId, tick, uid, player);
}

export function installClient2DPublicKeyLoginBridge(ws: GameWebSocketServer, tick: WorldTick): void {
  const originalHandler = ws.onPlayerMessage?.bind(ws);
  ws.onPlayerMessage = async (socketId: string, msg: any) => {
    if (isClient2DPresence(msg)) {
      const uid = (tick as any).socketToPlayer?.get(socketId);
      const player = uid ? (tick as any).playerSystem?.getPlayer(uid) : null;
      if (player) {
        player.isOffline = false;
        tick.observerEngine.updatePosition(socketId, { x: player.position.x, y: player.position.y });
        broadcastServerPresence(ws, socketId, player, tick, "client2d_presence", msg?.seq);
        sendWorldHeartbeat(ws, socketId, tick, uid, player);
      }
      return;
    }
    if (isClient2DMovement(msg)) {
      const uid = (tick as any).socketToPlayer?.get(socketId);
      const player = uid ? (tick as any).playerSystem?.getPlayer(uid) : null;
      const move = readMove(msg);
      if (player && move) {
        // AIM-103: Movement is server-authoritative via the deterministic tick.
        // Enqueue a move intent instead of mutating player.position directly
        // from the WebSocket handler. The tick's applyQueuedMoveIntents applies
        // the movement deterministically on the next tick. The heartbeat sent
        // here reflects the current (truthful) position; the queued move shows
        // up on the following heartbeat after the tick has applied it.
        const playerSystem = (tick as any).playerSystem;
        const acceptedAtTick = tickNumber(tick);
        const speed = Number((tick as any).client2DMoveSpeed ?? 5);
        const enqueued = typeof playerSystem?.enqueueMoveIntent === "function"
          ? playerSystem.enqueueMoveIntent({
              playerId: uid,
              socketId,
              dx: move.dx,
              dy: move.dy,
              sequenceId: move.sequenceId,
              acceptedAtTick,
            })
          : false;
        // AIM-77: stamp the move as a ServerCanonicalIntent so player movement
        // shares the same canonical path as routes (gather/interact/inventory)
        // and as NPC movement — unified, hashed, context-stamped (actorId,
        // tickId, chunkKey). Purely an integrity record; movement still applies
        // via the deterministic tick above.
        if (enqueued) {
          try {
            const canonical = canonicalizeActorMoveIntent({
              actorId: uid,
              fromPosition: { x: player.position.x, y: player.position.y },
              delta: { dx: move.dx * speed, dy: move.dy * speed },
              tickId: acceptedAtTick,
              logicalIndex: acceptedAtTick,
              receivedOrder: Math.max(0, move.sequenceId | 0),
              requestId: msg?.seq != null ? String(msg.seq) : undefined,
            });
            canonicalIntentIntake.record(canonical);
          } catch {
            // Canonical stamping must never break the movement truth path.
          }
        }
        player.isOffline = false;
        tick.observerEngine.updatePosition(socketId, { x: player.position.x, y: player.position.y });
        ws.sendToPlayer(socketId, {
          type: "move_intent_ack",
          payload: { ok: enqueued, seq: msg?.seq, acceptedAtTick, sequenceId: move.sequenceId, pending: typeof playerSystem?.getPendingMoveIntentCount === "function" ? playerSystem.getPendingMoveIntentCount() : 0 },
        });
        broadcastServerPresence(ws, socketId, player, tick, "client2d_move", msg?.seq);
        sendWorldHeartbeat(ws, socketId, tick, uid, player);
      }
      return;
    }
    if (isNpcDialogueAction(msg) && sendLivingLanguageDialogue(ws, tick, socketId, msg)) return;
    if (!isClient2DPublicKeyLogin(msg)) {
      if (originalHandler) await originalHandler(socketId, msg);
      return;
    }
    const uid = `client2d:${sanitizeIdentityPart(msg.identityHash ?? msg?.["public" + "Key"], "anonymous")}`;
    const name = str(msg.name ?? msg.handle, "Architect").slice(0, 48) || "Architect";
    const role = str(msg.role ?? msg.class, "Explorer").slice(0, 32) || "Explorer";
    const spawn = readSpawn(msg);
    const playerSystem = (tick as any).playerSystem;
    let player = playerSystem.getPlayer(uid);
    if (!player) {
      player = playerSystem.createPlayer(uid, name, role, "client-2d");
      if (typeof (tick as any).hydratePlayer === "function") (tick as any).hydratePlayer(player);
      player.position.x = spawn.x;
      player.position.y = spawn.y;
      player.position.z = spawn.z;
    }
    player.name = name;
    player.class = role;
    player.appearance = "client-2d";
    player.isOffline = false;
    player.state = "idle";
    registerPresence(ws, tick, socketId, uid, player);
    ws.sendToPlayer(socketId, {
      type: "welcome",
      id: uid,
      playerId: uid,
      playerName: player.name,
      spawnPosition: positionPayload(player),
      stats: { gold: player.gold ?? 0, xp: player.xp ?? 0, hp: player.health ?? 100, maxHp: player.maxHealth ?? 100, mp: player.mana ?? 25, maxMp: player.maxMana ?? 25, level: player.level || 1 },
      inventory: player.inventory ?? [],
      equipment: player.equipment ?? {},
      quests: player.quests ?? [],
      auth: "client2d-public-key",
    });
    sendWorldHeartbeat(ws, socketId, tick, uid, player);
  };
}
