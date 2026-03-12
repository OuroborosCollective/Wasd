import type { Server as HttpServer } from "node:http";
import { WebSocketServer, WebSocket } from "ws";

/**
 * GameWebSocketServer — WebSocket server for real-time game communication.
 *
 * Wraps the `ws` library's `WebSocketServer` and attaches it to an existing
 * HTTP server at the `/ws` path.  Each connecting client is assigned a
 * random short ID that is used throughout the server to identify the
 * underlying socket connection (distinct from the player / character name,
 * which is established after login).
 *
 * Consumers interact with the server through three optional callback hooks:
 * - {@link onPlayerConnect}    — fired when a socket opens.
 * - {@link onPlayerDisconnect} — fired when a socket closes.
 * - {@link onPlayerMessage}    — fired for every valid JSON message received.
 *
 * Outbound messages are sent either to all connected clients via
 * {@link broadcast} or to a specific socket via {@link sendToPlayer}.
 *
 * @example
 * const ws = new GameWebSocketServer(httpServer);
 * ws.onPlayerMessage = (id, msg) => {
 *   if (msg.type === "ping") ws.sendToPlayer(id, { type: "pong" });
 * };
 * ws.start();
 */
export class GameWebSocketServer {
  private wss: WebSocketServer | null = null;

  /** Called when a new WebSocket connection is established. */
  public onPlayerConnect?: (id: string) => void;

  /** Called when a WebSocket connection is closed. */
  public onPlayerDisconnect?: (id: string) => void;

  /**
   * Called for every successfully parsed JSON message received from a client.
   * Malformed (non-JSON) messages are silently discarded.
   */
  public onPlayerMessage?: (id: string, msg: any) => void;

  /**
   * @param httpServer - The Node.js HTTP server to attach the WebSocket
   *                     server to.  The WebSocket upgrade will be handled
   *                     at the `/ws` path.
   */
  constructor(private readonly httpServer: HttpServer) {}

  /**
   * Initialises the underlying `WebSocketServer` and begins accepting
   * connections.  Must be called once before any messages can be sent or
   * received.
   *
   * On each new connection the server:
   * 1. Assigns a random alphanumeric `id` to the socket.
   * 2. Fires {@link onPlayerConnect}.
   * 3. Sends an initial `"welcome"` message containing the assigned `id`.
   * 4. Wires up message and close event handlers.
   */
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

  /**
   * Serialises `data` to JSON and sends it to every client whose socket is
   * currently in the OPEN state (`readyState === 1`).
   *
   * @param data - Any JSON-serialisable value to broadcast.
   */
  broadcast(data: any) {
    if (!this.wss) return;
    const message = JSON.stringify(data);
    for (const client of this.wss.clients) {
      if (client.readyState === 1) { // OPEN
        client.send(message);
      }
    }
  }

  /**
   * Serialises `data` to JSON and sends it to the single client identified
   * by `id`.  Iterates over all connected clients and stops at the first
   * match; does nothing if no matching OPEN socket is found.
   *
   * @param id   - The socket ID assigned at connection time.
   * @param data - Any JSON-serialisable value to send.
   */
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
