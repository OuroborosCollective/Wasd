import type { Server as HttpServer } from "node:http";
import { WebSocketServer, WebSocket } from "ws";

export class GameWebSocketServer {
  private wss: WebSocketServer | null = null;
  public onPlayerConnect?: (id: string, msg?: any) => void;
  public onPlayerDisconnect?: (id: string) => void;
  public onPlayerMessage?: (id: string, msg: any) => void;
  // Session recovery callback
  public onPlayerRecover?: (oldId: string, playerId: string) => void;

  constructor(private readonly httpServer: HttpServer) {}

  start() {
    this.wss = new WebSocketServer({ server: this.httpServer, path: "/ws" });

    this.wss.on("connection", (socket: WebSocket & { id?: string; playerId?: string; isReconnect?: boolean }) => {
      const id = Math.random().toString(36).substring(2, 9);
      socket.id = id;

      socket.on("message", (data) => {
        try {
          const msg = JSON.parse(data.toString());
          
          // Handle login with session recovery support
          if (msg.type === "login") {
            if (this.onPlayerConnect) {
              this.onPlayerConnect(id, msg);
            }
            
            // If client is requesting session recovery
            if (msg.recovery && msg.playerId && this.onPlayerRecover) {
              // Attempt to recover session - WorldTick will handle this
              this.onPlayerRecover(id, msg.playerId);
            }
            
            // Send welcome with the assigned ID
            socket.send(JSON.stringify({
              type: "welcome",
              message: "Arelorian connection established",
              id,
              recovered: msg.recovery || false
            }));
            return;
          }
          
          // Pass other messages to handler
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