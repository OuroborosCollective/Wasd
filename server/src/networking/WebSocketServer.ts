import type { Server as HttpServer } from "node:http";
import { WebSocketServer, WebSocket } from "ws";
import { randomUUID } from "node:crypto";
import { GameConfig } from "../config/GameConfig.js";

const WS_RL_WINDOW_MS = 1000;

export class GameWebSocketServer {
  public wss: WebSocketServer | null = null;
  public onPlayerConnect?: (id: string) => void;
  public onPlayerDisconnect?: (id: string) => void;
  public onPlayerMessage?: (id: string, msg: any) => void;

  constructor(private readonly httpServer: HttpServer) {}

  start() {
    this.wss = new WebSocketServer({ server: this.httpServer, path: "/ws" });

    this.wss.on("connection", (socket: WebSocket & { id?: string }) => {
      const id = randomUUID();
      socket.id = id;

      if (this.onPlayerConnect) {
        this.onPlayerConnect(id);
      }

      socket.on("message", (data) => {
        try {
          const raw =
            typeof data === "string" ? data : Buffer.isBuffer(data) ? data : Buffer.from(data as ArrayBuffer);
          const byteLen = Buffer.byteLength(raw);
          if (byteLen > GameConfig.wsMaxMessageBytes) {
            console.warn(`WS message too large (${byteLen} bytes), ignoring`);
            return;
          }
          const sock = socket as WebSocket & { id?: string; _rlAt?: number[] };
          const now = Date.now();
          if (!sock._rlAt) sock._rlAt = [];
          sock._rlAt = sock._rlAt.filter((t) => now - t < WS_RL_WINDOW_MS);
          if (sock._rlAt.length >= GameConfig.wsMaxMessagesPerSecond) {
            return;
          }
          sock._rlAt.push(now);

          const msg = JSON.parse(raw.toString());
          if (this.onPlayerMessage) {
            this.onPlayerMessage(id, msg);
          }
        } catch (e) {
          console.error("Invalid WS message:", String(data).slice(0, 200));
        }
      });

      socket.on("close", () => {
        if (this.onPlayerDisconnect) {
          this.onPlayerDisconnect(id);
        }
      });
    });
  }

  broadcast(data: any) {
    if (!this.wss) return;
    const message = JSON.stringify(data);
    for (const client of this.wss.clients) {
      if (client.readyState === 1) { // OPEN
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
}
