import type { GameWebSocketServer } from "../networking/WebSocketServer.js";
import type { WorldTick } from "./WorldTick.js";

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

function isClient2DPublicKeyLogin(msg: any): boolean {
  return msg?.type === "login" && !msg?.token && Boolean(msg?.publicKey || msg?.identityHash) && (msg?.source === "client-2d" || msg?.appearance === "client-2d");
}

function isClient2DMovement(msg: any): boolean {
  return msg?.type === "MOVE" || msg?.type === "move_intent" || (msg?.type === "input" && msg?.source === "client-2d");
}

function isClient2DPresence(msg: any): boolean {
  return msg?.type === "presence" && (msg?.source === "client-2d" || msg?.clientRoute === "/2d/");
}

function sendServerPresence(ws: GameWebSocketServer, socketId: string, player: any, tick: WorldTick, seq?: unknown): void {
  ws.sendToPlayer(socketId, {
    type: "presence_ack",
    payload: {
      ok: true,
      seq,
      tick: Number((tick as any).tickCount ?? 0),
      playerId: player.id,
      position: {
        x: player.position.x,
        y: player.position.y,
        z: player.position.z ?? 0,
      },
    },
  });
}

function registerPresence(tick: WorldTick, socketId: string, uid: string, player: any): void {
  (tick as any).socketToPlayer?.set(socketId, uid);
  (tick as any).playerToSocket?.set(uid, socketId);
  tick.observerEngine.register(socketId, { x: player.position.x, y: player.position.y });
  if (typeof (tick as any).publishPlayerPresence === "function") {
    (tick as any).publishPlayerPresence(socketId, player, "client2d_bridge");
  }
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
        sendServerPresence(ws, socketId, player, tick, msg?.seq);
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
        if (typeof (tick as any).publishPlayerPresence === "function") {
          (tick as any).publishPlayerPresence(socketId, player, "client2d_move");
        }
        sendServerPresence(ws, socketId, player, tick, msg?.seq);
      }
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

    registerPresence(tick, socketId, uid, player);

    ws.sendToPlayer(socketId, {
      type: "welcome",
      id: uid,
      playerId: uid,
      playerName: player.name,
      spawnPosition: {
        x: player.position.x,
        y: player.position.y,
        z: player.position.z ?? 0,
      },
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
