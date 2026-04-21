import { describe, it, expect } from "vitest";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import WebSocket from "ws";
import { GameWebSocketServer } from "../networking/WebSocketServer.js";

describe("GameWebSocketServer entity_sync per-socket throttle", () => {
  it("skips sends when interval not elapsed for that socket", async () => {
    const httpServer = createServer();
    const gws = new GameWebSocketServer(httpServer);
    gws.start();
    await new Promise<void>((resolve) => httpServer.listen(0, resolve));
    const port = (httpServer.address() as AddressInfo).port;

    const socketIdPromise = new Promise<string>((resolve, reject) => {
      const t = setTimeout(() => reject(new Error("connection timeout")), 3000);
      gws.wss!.once("connection", (sock: WebSocket & { id?: string }) => {
        clearTimeout(t);
        resolve(sock.id ?? "");
      });
    });

    const ws = new WebSocket(`ws://127.0.0.1:${port}/ws`);
    await new Promise<void>((resolve, reject) => {
      ws.once("open", () => resolve());
      ws.once("error", reject);
    });

    const socketId = await socketIdPromise;
    expect(socketId.length).toBeGreaterThan(0);

    gws.setEntitySyncIntervalForSocket(socketId, 500);

    const payloads: string[] = [];
    ws.on("message", (raw) => payloads.push(String(raw)));

    const sync = { type: "entity_sync", entities: [], chunks: [] };
    gws.broadcast(sync);
    gws.broadcast(sync);
    gws.broadcast(sync);

    await new Promise((r) => setTimeout(r, 30));
    expect(payloads.length).toBe(1);

    await new Promise((r) => setTimeout(r, 520));
    gws.broadcast(sync);
    await new Promise((r) => setTimeout(r, 30));
    expect(payloads.length).toBe(2);

    ws.close();
    await new Promise<void>((resolve) => {
      httpServer.close(() => resolve());
    });
  });
});
