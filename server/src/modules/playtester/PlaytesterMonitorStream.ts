import type { Server as HttpServer } from "node:http";
import { createHash, timingSafeEqual } from "node:crypto";
import { URL } from "node:url";
import { WebSocketServer, WebSocket } from "ws";
import { PlaytesterConfig } from "../../config/PlaytesterConfig.js";
import type { PlaytesterMonitorUpdatePayload } from "./playtesterTypes.js";

function safeEqualText(a: string, b: string): boolean {
  const left = createHash("sha256").update(a, "utf8").digest();
  const right = createHash("sha256").update(b, "utf8").digest();
  return left.length === right.length && timingSafeEqual(left, right);
}

type ClientOptions = {
  performanceMode: boolean;
  placeholderMode: boolean;
  radiusChunks: number;
};

type TrackedMonitorSocket = WebSocket & {
  options?: ClientOptions;
};

type PayloadFactory = (options: ClientOptions) => PlaytesterMonitorUpdatePayload | null;

function parseBool(value: string | null): boolean {
  if (!value) return false;
  const v = value.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "on";
}

function isLoopback(remoteAddress: string): boolean {
  return (
    remoteAddress === "127.0.0.1" ||
    remoteAddress === "::1" ||
    remoteAddress === "::ffff:127.0.0.1"
  );
}

function parseClientOptions(reqUrl: string): ClientOptions {
  const url = new URL(reqUrl, "ws://localhost");
  const radius = Number(url.searchParams.get("radius"));
  const fallbackRadius = PlaytesterConfig.monitorDefaultRadiusChunks;
  return {
    performanceMode: parseBool(url.searchParams.get("performance")),
    placeholderMode: parseBool(url.searchParams.get("placeholder")),
    radiusChunks: Number.isFinite(radius) ? Math.max(1, Math.floor(radius)) : fallbackRadius,
  };
}

export class PlaytesterMonitorStream {
  private wss: WebSocketServer | null = null;
  private readonly payloadFactory: PayloadFactory;
  private upgradeHandler:
    | ((req: import("http").IncomingMessage, socket: any, head: Buffer) => void)
    | null = null;

  constructor(private readonly httpServer: HttpServer, payloadFactory: PayloadFactory) {
    this.payloadFactory = payloadFactory;
  }

  start(): void {
    this.wss = new WebSocketServer({ noServer: true });
    this.wss.on("connection", (socket: TrackedMonitorSocket) => {
      const options = socket.options ?? {
        performanceMode: false,
        placeholderMode: false,
        radiusChunks: PlaytesterConfig.monitorDefaultRadiusChunks,
      };
      const firstPayload = this.payloadFactory(options);
      if (firstPayload) {
        socket.send(JSON.stringify(firstPayload));
      }
    });
    this.upgradeHandler = (req, socket, head) => {
      const url = new URL(req.url || "/", "ws://localhost");
      if (url.pathname !== PlaytesterConfig.monitorPath || !this.wss) {
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
      const options = parseClientOptions(req.url || PlaytesterConfig.monitorPath);
      this.wss.handleUpgrade(req, socket, head, (ws) => {
        const tracked = ws as TrackedMonitorSocket;
        tracked.options = options;
        this.wss?.emit("connection", tracked, req);
      });
    };
    this.httpServer.on("upgrade", this.upgradeHandler);
  }

  broadcastCurrent(): void {
    if (!PlaytesterConfig.streamEnabled || !this.wss) return;
    for (const socket of this.wss.clients as Set<TrackedMonitorSocket>) {
      if (socket.readyState !== WebSocket.OPEN) continue;
      const options = socket.options ?? {
        performanceMode: false,
        placeholderMode: false,
        radiusChunks: PlaytesterConfig.monitorDefaultRadiusChunks,
      };
      const payload = this.payloadFactory(options);
      if (!payload) continue;
      socket.send(JSON.stringify(payload));
    }
  }

  stop(): void {
    if (this.upgradeHandler) {
      this.httpServer.off("upgrade", this.upgradeHandler);
      this.upgradeHandler = null;
    }
    if (!this.wss) return;
    this.wss.close();
    this.wss = null;
  }

  private isAuthorized(req: import("http").IncomingMessage): boolean {
    const token = PlaytesterConfig.monitorToken;
    const reqUrl = req.url || PlaytesterConfig.monitorPath;
    const url = new URL(reqUrl, "ws://localhost");
    const queryToken = (url.searchParams.get("token") || "").trim();
    const headerToken =
      (typeof req.headers["x-playtester-token"] === "string" ? req.headers["x-playtester-token"] : "") ||
      (typeof req.headers["authorization"] === "string"
        ? req.headers["authorization"].replace(/^Bearer\s+/i, "")
        : "");

    if (token.length > 0) {
      const matchQuery = queryToken.length > 0 && safeEqualText(queryToken, token);
      const matchHeader = headerToken.trim().length > 0 && safeEqualText(headerToken.trim(), token);
      return matchQuery || matchHeader;
    }

    if (process.env.NODE_ENV !== "production") {
      return true;
    }
    const remote = String(req.socket.remoteAddress || "");
    return isLoopback(remote);
  }
}
