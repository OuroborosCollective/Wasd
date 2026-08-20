import { createHash, timingSafeEqual } from "node:crypto";
import type { Server as HttpServer, IncomingMessage } from "node:http";
import { URL } from "node:url";
import { WebSocketServer, WebSocket } from "ws";
import { PlaytesterConfig } from "../../config/PlaytesterConfig.js";

type SignalRole = "publisher" | "viewer";
type MonitorSignalType =
  | "register_publisher"
  | "register_viewer"
  | "render_publisher_ready"
  | "admin_viewer_connected"
  | "admin_viewer_disconnected"
  | "monitor_offer"
  | "monitor_answer"
  | "monitor_ice_candidate";

type MonitorSignalMessage = {
  type: MonitorSignalType;
  role?: SignalRole;
  viewerId?: string;
  payload?: unknown;
};

type TrackedSignalSocket = WebSocket & {
  role?: SignalRole;
  viewerId?: string;
};

function safeEqualText(a: string, b: string): boolean {
  const left = createHash("sha256").update(a, "utf8").digest();
  const right = createHash("sha256").update(b, "utf8").digest();
  return left.length === right.length && timingSafeEqual(left, right);
}

function isLoopback(remoteAddress: string): boolean {
  return (
    remoteAddress === "127.0.0.1" ||
    remoteAddress === "::1" ||
    remoteAddress === "::ffff:127.0.0.1"
  );
}

function tokenFromRequest(req: IncomingMessage): string {
  const reqUrl = req.url || "/";
  const url = new URL(reqUrl, "ws://localhost");
  const queryToken = (url.searchParams.get("token") || "").trim();
  if (queryToken) return queryToken;
  const headerToken =
    (typeof req.headers["x-playtester-token"] === "string" ? req.headers["x-playtester-token"] : "") ||
    (typeof req.headers["authorization"] === "string"
      ? req.headers["authorization"].replace(/^Bearer\s+/i, "")
      : "");
  return headerToken.trim();
}

export class PlaytesterWebRTCSignaling {
  private wss: WebSocketServer | null = null;
  private upgradeHandler:
    | ((req: IncomingMessage, socket: any, head: Buffer) => void)
    | null = null;
  private publisherSocket: TrackedSignalSocket | null = null;
  private viewerSockets = new Map<string, TrackedSignalSocket>();

  constructor(private readonly httpServer: HttpServer) {}

  start(): void {
    this.wss = new WebSocketServer({ noServer: true });
    this.wss.on("connection", (socket: TrackedSignalSocket) => {
      socket.on("message", (raw) => {
        this.handleMessage(socket, raw.toString());
      });
      socket.on("close", () => {
        this.handleSocketClose(socket);
      });
    });
    this.upgradeHandler = (req, socket, head) => {
      const url = new URL(req.url || "/", "ws://localhost");
      if (url.pathname !== PlaytesterConfig.monitorSignalPath || !this.wss) {
        return;
      }
      if (!this.isAuthorized(req)) {
        try {
          socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
        } catch {
          // ignore write failures
        }
        socket.destroy();
        return;
      }
      this.wss.handleUpgrade(req, socket, head, (ws) => {
        this.wss?.emit("connection", ws, req);
      });
    };
    this.httpServer.on("upgrade", this.upgradeHandler);
  }

  stop(): void {
    if (this.upgradeHandler) {
      this.httpServer.off("upgrade", this.upgradeHandler);
      this.upgradeHandler = null;
    }
    this.publisherSocket = null;
    this.viewerSockets.clear();
    if (!this.wss) return;
    this.wss.close();
    this.wss = null;
  }

  private handleMessage(socket: TrackedSignalSocket, raw: string): void {
    let msg: MonitorSignalMessage | null = null;
    try {
      msg = JSON.parse(raw) as MonitorSignalMessage;
    } catch {
      return;
    }
    if (!msg || typeof msg.type !== "string") return;

    if (msg.type === "register_publisher") {
      socket.role = "publisher";
      this.publisherSocket = socket;
      this.send(socket, { type: "render_publisher_ready" });
      return;
    }

    if (msg.type === "register_viewer") {
      const viewerId = typeof msg.viewerId === "string" && msg.viewerId.trim() ? msg.viewerId.trim() : "";
      if (!viewerId) return;
      socket.role = "viewer";
      socket.viewerId = viewerId;
      this.viewerSockets.set(viewerId, socket);
      this.send(this.publisherSocket, {
        type: "admin_viewer_connected",
        viewerId,
      });
      return;
    }

    if (msg.type === "monitor_offer") {
      const viewerId = typeof msg.viewerId === "string" ? msg.viewerId.trim() : "";
      if (!viewerId) return;
      const viewer = this.viewerSockets.get(viewerId);
      this.send(viewer, {
        type: "monitor_offer",
        viewerId,
        payload: msg.payload,
      });
      return;
    }

    if (msg.type === "monitor_answer" || msg.type === "monitor_ice_candidate") {
      const viewerId = typeof msg.viewerId === "string" ? msg.viewerId.trim() : socket.viewerId || "";
      if (!viewerId) return;
      this.send(this.publisherSocket, {
        type: msg.type,
        viewerId,
        payload: msg.payload,
      });
    }
  }

  private handleSocketClose(socket: TrackedSignalSocket): void {
    if (this.publisherSocket === socket) {
      this.publisherSocket = null;
      return;
    }
    if (socket.viewerId) {
      this.viewerSockets.delete(socket.viewerId);
      this.send(this.publisherSocket, {
        type: "admin_viewer_disconnected",
        viewerId: socket.viewerId,
      });
    }
  }

  private send(socket: TrackedSignalSocket | null | undefined, msg: MonitorSignalMessage): void {
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    socket.send(JSON.stringify(msg));
  }

  private isAuthorized(req: IncomingMessage): boolean {
    const configuredToken = PlaytesterConfig.monitorToken;
    const requestToken = tokenFromRequest(req);

    if (configuredToken.length > 0) {
      return requestToken.length > 0 && safeEqualText(requestToken, configuredToken);
    }

    if (process.env.NODE_ENV !== "production") {
      return true;
    }

    // In production, if no token is configured, we only allow loopback
    const remote = String(req.socket.remoteAddress || "");
    return isLoopback(remote);
  }
}
