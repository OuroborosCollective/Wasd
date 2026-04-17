import { describe, it, expect, afterEach } from "vitest";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import WebSocket from "ws";
import { GameConfig } from "../config/GameConfig.js";

describe("GameWebSocketServer max message bytes", () => {
  afterEach(() => {
    delete process.env.WS_MAX_MESSAGE_BYTES;
  });

  it("ignores payloads larger than WS_MAX_MESSAGE_BYTES", async () => {
    process.env.WS_MAX_MESSAGE_BYTES = "64";

    const { GameWebSocketServer } = await import("../networking/WebSocketServer.js");

    const httpServer = createServer();
    const gws = new GameWebSocketServer(httpServer);
    gws.start();
    let received = 0;
    gws.onPlayerMessage = () => {
      received += 1;
    };

    await new Promise<void>((resolve) => httpServer.listen(0, resolve));
    const port = (httpServer.address() as AddressInfo).port;

    const ws = new WebSocket(`ws://127.0.0.1:${port}/ws`);
    await new Promise<void>((resolve, reject) => {
      ws.once("open", () => resolve());
      ws.once("error", reject);
    });

    const big = JSON.stringify({ type: "noop", pad: "x".repeat(200) });
    expect(Buffer.byteLength(big)).toBeGreaterThan(64);
    ws.send(big);
    ws.send(JSON.stringify({ type: "ping" }));

    await new Promise((r) => setTimeout(r, 50));

    expect(received).toBe(1);

    ws.close();
    await new Promise<void>((resolve) => {
      httpServer.close(() => resolve());
    });
  });

  it("uses GameConfig default when WS_MAX_MESSAGE_BYTES is unset", async () => {
    const { GameWebSocketServer } = await import("../networking/WebSocketServer.js");

    const httpServer = createServer();
    const gws = new GameWebSocketServer(httpServer);
    gws.start();
    let received = 0;
    gws.onPlayerMessage = () => {
      received += 1;
    };

    await new Promise<void>((resolve) => httpServer.listen(0, resolve));
    const port = (httpServer.address() as AddressInfo).port;

    const ws = new WebSocket(`ws://127.0.0.1:${port}/ws`);
    await new Promise<void>((resolve, reject) => {
      ws.once("open", () => resolve());
      ws.once("error", reject);
    });

    const atLimit = JSON.stringify({ type: "noop", pad: "y".repeat(GameConfig.wsMaxMessageBytes - 40) });
    expect(Buffer.byteLength(atLimit)).toBeLessThanOrEqual(GameConfig.wsMaxMessageBytes);
    ws.send(atLimit);

    await new Promise((r) => setTimeout(r, 50));

    expect(received).toBe(1);

    ws.close();
    await new Promise<void>((resolve) => {
      httpServer.close(() => resolve());
    });
  });
});
