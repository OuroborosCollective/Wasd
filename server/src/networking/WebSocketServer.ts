import type { Server as HttpServer } from "node:http";
import { WebSocketServer, WebSocket } from "ws";

export class GameWebSocketServer {
  private wss: WebSocketServer | null = null;
  public onPlayerConnect?: (id: string) => void;
  public onPlayerDisconnect?: (id: string) => void;
  public onPlayerMessage?: (id: string, msg: any) => void;

  constructor(private readonly httpServer: HttpServer) {}

  start() {
    this.wss = new WebSocketServer({ server: this.httpServer, path: "/ws" });

    this.wss.on("connection", (socket: WebSocket & { id?: string }) => {
      const id = Math.random().toString(36).substring(2, 9);
      socket.id = id;

      if (this.onPlayerConnect) {
        this.onPlayerConnect(id);
      }

      socket.send(JSON.stringify({
        type: "welcome",
        message: "Arelorian connection established",
        id
      }));

      socket.on("message", (data) => {
        try {
          const msg = JSON.parse(data.toString());
          if (this.onPlayerMessage) {
            this.onPlayerMessage(id, msg);
          }
        } catch (e) {
          console.error("Invalid WS message:", data.toString());
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