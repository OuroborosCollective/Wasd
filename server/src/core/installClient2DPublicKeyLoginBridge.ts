import type { GameWebSocketServer } from "../networking/WebSocketServer.js";
import type { WorldTick } from "./are/index.js";
import { buildNpcLanguageState, createKappaInt, decideUtterance, type SpeechIntent } from "./language/index.js";

function sanitizeIdentityPart(value: unknown, fallback: string): string {
  const raw = String(value ?? fallback).trim().toLowerCase();
  const cleaned = raw.replace(/[^a-z0-9:_-]+/g, "-").replace(/-+/g, "-").slice(0, 96);
  return cleaned || fallback;
}

function numericSpawn(value: unknown, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(-64, Math.min(64, Math.trunc(n))) : fallback;
}

function readSpawn(msg: any): { x: number; y: number; z: number } {
  const parsed = (() => {
    if (typeof msg?.spawn === "string") {
      try { return JSON.parse(msg.spawn); } catch { return null; }
    }
    return msg?.spawn && typeof msg.spawn === "object" ? msg.spawn : null;
  })();

  return {
    x: numericSpawn(parsed?.x ?? msg?.x, 0),
    y: numericSpawn(parsed?.y ?? parsed?.z ?? msg?.z ?? msg?.y, 0),
    z: numericSpawn(parsed?.z ?? 0, 0),
  };
}

function readMove(msg: any): { dx: number; dy: number } | null {
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
  return { dx, dy };
}

function stableHash(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

function unitFromSeed(seed: string, salt: string): number {
  return (stableHash(`${seed}:${salt}`) % 1001) / 1000;
}

function safeText(value: unknown, fallback: string): string {
  const text = String(value ?? fallback).trim();
  return text.length > 0 ? text : fallback;
}

function readNpcTarget(msg: any): string | null {
  const payload = msg?.payload && typeof msg.payload === "object" ? msg.payload : msg;
  const raw = payload?.targetId ?? payload?.npcId ?? payload?.entityId ?? payload?.id;
  const targetId = String(raw ?? "").trim();
  return targetId.length > 0 ? targetId : null;
}

function actionToIntent(action: string): SpeechIntent {
  if (action === "npc_trade") return "trade";
  if (action === "npc_quests") return "request";
  if (action === "npc_faction") return "teach";
  if (action === "npc_goodbye") return "farewell";
  if (action === "npc_continue") return "greet";
  return "greet";
}

function isNpcDialogueAction(msg: any): boolean {
  const type = String(msg?.type ?? msg?.action ?? "");
  return type === "interact" || type === "npc_interact_request" || type.startsWith("npc_");
}

function tickNumber(tick: WorldTick): number {
  const direct = Number((tick as any).tickCount ?? (tick as any).liveHeal?.getStatus?.()?.tickCount ?? 0);
  return Number.isSafeInteger(direct) && direct >= 0 ? direct : 0;
}

function buildWorldLanguageState(tick: number) {
  return Object.freeze({
    threatLevel: createKappaInt(unitFromSeed(`world:${tick}`, "threat") * 0.45),
    villageSafety: createKappaInt(0.55 + unitFromSeed(`world:${tick}`, "safety") * 0.35),
    factionPressure: createKappaInt(unitFromSeed(`world:${tick}`, "pressure") * 0.55),
    politicalTension: createKappaInt(unitFromSeed(`world:${tick}`, "tension") * 0.5),
  });
}

function buildNpcRuntimeLanguageState(tick: WorldTick, targetId: string, tickId: number) {
  const npc = (tick as any).npcSystem?.getNPC?.(targetId) ?? (tick as any).npcSystem?.getAllNPCs?.()?.find?.((candidate: any) => String(candidate?.id) === targetId);
  const traits = npc?.traits ?? {};
  const seed = `${targetId}:${tickId}`;
  const role = safeText(npc?.role ?? npc?.fusionProfileTag ?? npc?.tags?.[0], targetId.includes("merchant") ? "merchant" : targetId.includes("guard") ? "guard" : "villager");
  const factionId = safeText(npc?.faction ?? npc?.worldBossMeta?.factionId, "forest_village");

  return {
    npc,
    state: buildNpcLanguageState(targetId, {
      factionId,
      role,
      hunger: 0.18 + unitFromSeed(seed, "hunger") * 0.28,
      trust: Number.isFinite(Number(traits.faith)) ? Number(traits.faith) : 0.35 + unitFromSeed(seed, "trust") * 0.45,
      fear: 0.08 + unitFromSeed(seed, "fear") * 0.32,
      duty: 0.25 + unitFromSeed(seed, "duty") * 0.55,
      pride: Number.isFinite(Number(traits.curiosity)) ? Number(traits.curiosity) : 0.2 + unitFromSeed(seed, "pride") * 0.5,
      revenge: Number.isFinite(Number(traits.aggression)) ? Number(traits.aggression) * 0.35 : unitFromSeed(seed, "revenge") * 0.25,
      lastConversationTick: tickId,
    }),
  };
}

function sendLivingLanguageDialogue(ws: GameWebSocketServer, tick: WorldTick, socketId: string, msg: any): boolean {
  const targetId = readNpcTarget(msg);
  if (!targetId) return false;

  const currentTick = tickNumber(tick);
  const action = String(msg?.type ?? msg?.action ?? "interact");
  const payload = msg?.payload && typeof msg.payload === "object" ? msg.payload : msg;
  const sequenceId = Number.isSafeInteger(Number(payload?.sequenceId ?? payload?.seq)) ? Number(payload.sequenceId ?? payload.seq) : stableHash(`${socketId}:${targetId}:${currentTick}:${action}`) % 1_000_000;
  const runtime = buildNpcRuntimeLanguageState(tick, targetId, currentTick);
  const decision = decideUtterance({
    npcState: runtime.state,
    worldState: buildWorldLanguageState(currentTick),
    tick: currentTick,
    sequenceId,
  }, { forceIntent: actionToIntent(action) });

  const npcName = safeText(runtime.npc?.name ?? payload?.npcName ?? payload?.label, targetId);
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
      openContext: action !== "interact",
      source: runtime.npc ? "runtime_npc_system" : "client_target_id",
    },
  });
  return true;
}

function isClient2DPublicKeyLogin(msg: any): boolean {
  return msg?.type === "login" && !msg?.token && Boolean(msg?.publicKey || msg?.identityHash) && (msg?.source === "client-2d" || msg?.appearance === "client-2d");
}

function isClient2DMovement(msg: any): boolean {
  return msg?.type === "MOVE" || msg?.type === "move_intent" || (msg?.type === "input" && msg?.source === "client-2d");
}

function isClient2DPresence(msg: any): boolean {
  return msg?.type === "presence" && (msg?.source === "client-2d" || msg?.clientRoute === "/2d/");
}

function positionPayload(player: any) {
  return {
    x: player.position.x,
    y: player.position.y,
    z: player.position.z ?? 0,
  };
}

function broadcastServerPresence(ws: GameWebSocketServer, socketId: string, player: any, tick: WorldTick, reason: string, seq?: unknown): void {
  const payload = {
    ok: true,
    reason,
    seq,
    tick: Number((tick as any).tickCount ?? 0),
    socketId,
    playerId: player.id,
    name: player.name,
    isOffline: Boolean(player.isOffline),
    position: positionPayload(player),
  };
  ws.sendToPlayer(socketId, { type: "presence_ack", payload });
  ws.broadcast({ type: "server_presence", payload });
}

function registerPresence(ws: GameWebSocketServer, tick: WorldTick, socketId: string, uid: string, player: any): void {
  (tick as any).socketToPlayer?.set(socketId, uid);
  (tick as any).playerToSocket?.set(uid, socketId);
  tick.observerEngine.register(socketId, { x: player.position.x, y: player.position.y });
  broadcastServerPresence(ws, socketId, player, tick, "client2d_register");
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
      }
      return;
    }

    if (isClient2DMovement(msg)) {
      const uid = (tick as any).socketToPlayer?.get(socketId);
      const player = uid ? (tick as any).playerSystem?.getPlayer(uid) : null;
      const move = readMove(msg);
      if (player && move) {
        const speed = Number((tick as any).client2DMoveSpeed ?? 5);
        player.position.x += move.dx * speed;
        player.position.y += move.dy * speed;
        player.position.z = Number(player.position.z ?? 0);
        player.isOffline = false;
        player.state = "walking";
        tick.observerEngine.updatePosition(socketId, { x: player.position.x, y: player.position.y });
        broadcastServerPresence(ws, socketId, player, tick, "client2d_move", msg?.seq);
      }
      return;
    }

    if (isNpcDialogueAction(msg) && sendLivingLanguageDialogue(ws, tick, socketId, msg)) {
      return;
    }

    if (!isClient2DPublicKeyLogin(msg)) {
      if (originalHandler) await originalHandler(socketId, msg);
      return;
    }

    const uid = `client2d:${sanitizeIdentityPart(msg.identityHash ?? msg.publicKey, "anonymous")}`;
    const name = String(msg.name ?? msg.handle ?? "Architect").trim().slice(0, 48) || "Architect";
    const role = String(msg.role ?? msg.class ?? "Explorer").trim().slice(0, 32) || "Explorer";
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
      stats: {
        gold: player.gold ?? 0,
        xp: player.xp ?? 0,
        hp: player.health ?? 100,
        maxHp: player.maxHealth ?? 100,
        mp: player.mana ?? 25,
        maxMp: player.maxMana ?? 25,
        level: player.level || 1,
      },
      inventory: player.inventory ?? [],
      equipment: player.equipment ?? {},
      quests: player.quests ?? [],
      auth: "client2d-public-key",
    });

    ws.sendToPlayer(socketId, {
      type: "WORLD_HEARTBEAT",
      payload: {
        players: {
          [uid]: {
            id: uid,
            name: player.name,
            x: player.position.x,
            y: player.position.y,
            z: player.position.z ?? 0,
          },
        },
        self: {
          id: uid,
          name: player.name,
          x: player.position.x,
          y: player.position.y,
          z: player.position.z ?? 0,
        },
      },
    });
  };
}
