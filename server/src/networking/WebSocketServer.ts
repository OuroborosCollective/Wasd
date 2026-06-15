import type { IncomingMessage, Server as HttpServer } from "node:http";
import { URL } from "node:url";
import { WebSocketServer, WebSocket } from "ws";
import { randomUUID } from "node:crypto";
import { GameConfig } from "../config/GameConfig.js";
import { collectiveIngressRuntime } from "../collective/CollectiveIngressRuntime.js";
import { resolveHttpPlayerIdentity, type PlayerIdentityRequestLike } from "../auth/PlayerIdentityResolver.js";

const WS_RL_WINDOW_MS = 1000;

let activeGameWebSocketServer: GameWebSocketServer | null = null;

export function getActiveGameWebSocketServer(): GameWebSocketServer | null {
  return activeGameWebSocketServer;
}

export interface GameWebSocketRuntimeStats {
  readonly activeClients: number;
  readonly trackedPlayerUids: number;
  readonly playerUidMessagesInWindow: number;
  readonly totalConnections: number;
  readonly totalDisconnects: number;
  readonly totalMessages: number;
  readonly droppedOversizeMessages: number;
  readonly droppedRateLimitedMessages: number;
  readonly invalidMessages: number;
}

type TrackedSocket = WebSocket & {
  id?: string;
  _entitySyncIntervalMs?: number;
  _lastEntitySyncSentAt?: number;
};

function playerUidMessageCap(): number {
  const raw = process.env.WS_MAX_MESSAGES_PER_PLAYER_UID_PER_SECOND?.trim();
  if (!raw) return GameConfig.wsMaxMessagesPerPlayerUidPerSecond;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : GameConfig.wsMaxMessagesPerPlayerUidPerSecond;
}

function queryFromRequestUrl(req: IncomingMessage): Record<string, unknown> {
  const parsed = new URL(String(req.url || "/ws"), "http://127.0.0.1");
  const query: Record<string, unknown> = {};
  for (const [key, value] of parsed.searchParams.entries()) {
    query[key] = value;
  }
  return query;
}

function resolveUpgradePlayerUid(req: IncomingMessage): string | null {
  const identity = resolveHttpPlayerIdentity({
    headers: req.headers as PlayerIdentityRequestLike["headers"],
    query: queryFromRequestUrl(req),
    user: (req as IncomingMessage & { user?: PlayerIdentityRequestLike["user"] }).user,
    session: (req as IncomingMessage & { session?: PlayerIdentityRequestLike["session"] }).session,
  });
  return identity.source === "anonymous" ? null : identity.playerId;
}

export class GameWebSocketServer {
  public wss: WebSocketServer | null = null;
  public onPlayerConnect?: (id: string) => void;
  public onPlayerDisconnect?: (id: string) => void;
  public onPlayerMessage?: (id: string, msg: any) => void;
  public resolveSocketToPlayerUid?: (socketId: string) => string | null | undefined;

  private readonly socketToPlayerUid = new Map<string, string>();
  private readonly playerUidRateAt = new Map<string, number[]>();
  private totalConnections = 0;
  private totalDisconnects = 0;
  private totalMessages = 0;
  private droppedOversizeMessages = 0;
  private droppedRateLimitedMessages = 0;
  private invalidMessages = 0;
  private upgradeHandler:
    | ((req: import("http").IncomingMessage, socket: any, head: Buffer) => void)
    | null = null;

  constructor(private readonly httpServer: HttpServer) {}

  start() {
    activeGameWebSocketServer = this;
    this.wss = new WebSocketServer({ noServer: true });
    this.upgradeHandler = (req, socket, head) => {
      const rawPath = String(req.url || "").split("?")[0];
      if (rawPath !== "/ws") {
        return;
      }
      this.wss?.handleUpgrade(req, socket, head, (ws) => {
        this.wss?.emit("connection", ws, req);
      });
    };
    this.httpServer.on("upgrade", this.upgradeHandler);

    this.wss.on("connection", (socket: WebSocket & { id?: string }, req: IncomingMessage) => {
      const id = randomUUID();
      socket.id = id;
      this.totalConnections += 1;
      const upgradePlayerUid = resolveUpgradePlayerUid(req);
      if (upgradePlayerUid) {
        this.socketToPlayerUid.set(id, upgradePlayerUid);
      }
      const tracked = socket as TrackedSocket;
      tracked._entitySyncIntervalMs = GameConfig.stateBroadcastIntervalMs;
      tracked._lastEntitySyncSentAt = 0;

      if (this.onPlayerConnect) {
        this.onPlayerConnect(id);
      }

      socket.on("message", (data) => {
        try {
          const raw =
            typeof data === "string" ? data : Buffer.isBuffer(data) ? data : Buffer.from(data as ArrayBuffer);
          const byteLen = Buffer.byteLength(raw);
          if (byteLen > GameConfig.wsMaxMessageBytes) {
            this.droppedOversizeMessages += 1;
            console.warn(`WS message too large (${byteLen} bytes), ignoring`);
            return;
          }
          const sock = socket as WebSocket & { id?: string; _rlAt?: number[] };
          const now = Date.now();
          if (!sock._rlAt) sock._rlAt = [];
          sock._rlAt = sock._rlAt.filter((t) => now - t < WS_RL_WINDOW_MS);
          if (sock._rlAt.length >= GameConfig.wsMaxMessagesPerSecond) {
            this.droppedRateLimitedMessages += 1;
            return;
          }
          sock._rlAt.push(now);

          const msg = JSON.parse(raw.toString());
          this.totalMessages += 1;
          const isSovereignLogin = (msg?.type === "sovereign_login" || msg?.type === "login") && (msg?.publicKey || msg?.wallet || msg?.hash || msg?.kappaPosHash);
          if (isSovereignLogin) {
            const result = collectiveIngressRuntime.register(id, msg);
            this.socketToPlayerUid.set(id, result.peer.id);
            socket.send(JSON.stringify({ type: "COLLECTIVE_WELCOME", identity: result.identity, peer: result.peer, welcome: result.welcome }));
            this.broadcast({ type: "COLLECTIVE_PEER_JOINED", payload: result.peer });
          } else if (msg?.type === "login") {
            this.socketToPlayerUid.delete(id);
          } else {
            collectiveIngressRuntime.updateFromInput(id, msg);
            let uid = this.socketToPlayerUid.get(id);
            if (!uid && this.resolveSocketToPlayerUid) {
              uid = this.resolveSocketToPlayerUid(id) ?? undefined;
              if (uid) this.socketToPlayerUid.set(id, uid);
            }
            if (uid) {
              let arr = this.playerUidRateAt.get(uid);
              if (!arr) {
                arr = [];
                this.playerUidRateAt.set(uid, arr);
              }
              arr = arr.filter((t) => now - t < WS_RL_WINDOW_MS);
              if (arr.length >= playerUidMessageCap()) {
                this.droppedRateLimitedMessages += 1;
                return;
              }
              arr.push(now);
              this.playerUidRateAt.set(uid, arr);
            }
          }

          if (this.onPlayerMessage) {
            this.onPlayerMessage(id, msg);
          }
        } catch (e) {
          this.invalidMessages += 1;
          console.error("Invalid WS message:", String(data).slice(0, 200));
        }
      });

      socket.on("close", () => {
        this.totalDisconnects += 1;
        this.socketToPlayerUid.delete(id);
        collectiveIngressRuntime.disconnect(id);
        if (this.onPlayerDisconnect) {
          this.onPlayerDisconnect(id);
        }
      });
    });
  }

  setEntitySyncIntervalForSocket(socketId: string, intervalMs: number): void {
    if (!this.wss || !Number.isFinite(intervalMs) || intervalMs < 50) return;
    for (const client of this.wss.clients as Set<TrackedSocket>) {
      if (client.id === socketId && client.readyState === 1) {
        client._entitySyncIntervalMs = Math.floor(intervalMs);
        return;
      }
    }
  }

  getRuntimeStats(): GameWebSocketRuntimeStats {
    let activeClients = 0;
    if (this.wss) {
      for (const client of this.wss.clients) {
        if (client.readyState === 1) activeClients += 1;
      }
    }
    let playerUidMessagesInWindow = 0;
    for (const entries of this.playerUidRateAt.values()) {
      playerUidMessagesInWindow += entries.length;
    }
    return Object.freeze({
      activeClients,
      trackedPlayerUids: this.socketToPlayerUid.size,
      playerUidMessagesInWindow,
      totalConnections: this.totalConnections,
      totalDisconnects: this.totalDisconnects,
      totalMessages: this.totalMessages,
      droppedOversizeMessages: this.droppedOversizeMessages,
      droppedRateLimitedMessages: this.droppedRateLimitedMessages,
      invalidMessages: this.invalidMessages,
    });
  }

  broadcast(data: any) {
    if (!this.wss) return;
    const message = JSON.stringify(data);
    if (data?.type === "entity_sync") {
      const now = Date.now();
      for (const client of this.wss.clients as Set<TrackedSocket>) {
        if (client.readyState !== 1) continue;
        const minEvery = client._entitySyncIntervalMs ?? GameConfig.stateBroadcastIntervalMs;
        const last = client._lastEntitySyncSentAt ?? 0;
        if (now - last < minEvery) continue;
        client._lastEntitySyncSentAt = now;
        client.send(message);
      }
      return;
    }
    for (const client of this.wss.clients) {
      if (client.readyState === 1) {
        client.send(message);
      }
    }
  }

  sendToPlayer(id: string, data: any) {
    if (!this.wss) return;
    const message = JSON.stringify(data);
    for (const client of this.wss.clients as Set<WebSocket & { id?: string }>) {
      if (client.id === id && client.readyState === 1) {
        client.send(message);
        break;
      }
    }
  }

  stop() {
    if (activeGameWebSocketServer === this) {
      activeGameWebSocketServer = null;
    }
    if (this.upgradeHandler) {
      this.httpServer.off("upgrade", this.upgradeHandler);
      this.upgradeHandler = null;
    }
    if (this.wss) {
      this.wss.close();
      this.wss = null;
    }
  }
}
