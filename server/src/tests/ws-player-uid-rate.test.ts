import { describe, it, expect, afterEach } from "vitest";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import WebSocket from "ws";

async function listenOnRandomPort(httpServer: ReturnType<typeof createServer>): Promise<number> {
  await new Promise<void>((resolve) => httpServer.listen(0, resolve));
  return (httpServer.address() as AddressInfo).port;
}

async function openSocket(url: string, options?: ConstructorParameters<typeof WebSocket>[1]): Promise<WebSocket> {
  const ws = new WebSocket(url, options);
  await new Promise<void>((resolve, reject) => {
    ws.once("open", () => resolve());
    ws.once("error", reject);
  });
  return ws;
}

describe("GameWebSocketServer per-uid rate limit", () => {
  afterEach(() => {
    delete process.env.WS_MAX_MESSAGES_PER_PLAYER_UID_PER_SECOND;
    delete process.env.ALLOW_GUEST_LOGIN;
    delete process.env.ALLOW_DEV_LOGIN;
    delete process.env.ALLOW_DEV_PLAYER_ID;
    delete process.env.NODE_ENV;
  });

  it("drops messages after uid budget in a rolling second", async () => {
    process.env.WS_MAX_MESSAGES_PER_PLAYER_UID_PER_SECOND = "4";

    const { GameWebSocketServer } = await import("../networking/WebSocketServer.js");

    const httpServer = createServer();
    const gws = new GameWebSocketServer(httpServer);
    gws.start();
    let received = 0;
    gws.onPlayerMessage = () => {
      received += 1;
    };
    gws.resolveSocketToPlayerUid = () => "same_uid";
    const port = await listenOnRandomPort(httpServer);

    const ws = await openSocket(`ws://127.0.0.1:${port}/ws`);

    for (let i = 0; i < 12; i++) {
      ws.send(JSON.stringify({ type: "noop", i }));
    }

    await new Promise((r) => setTimeout(r, 50));

    expect(received).toBeLessThanOrEqual(4);

    ws.close();
    gws.stop();
    await new Promise<void>((resolve) => {
      httpServer.close(() => resolve());
    });
  });

  it("maps upgrade player identity through the shared HTTP resolver", async () => {
    process.env.NODE_ENV = "production";
    process.env.ALLOW_GUEST_LOGIN = "true";

    const { GameWebSocketServer } = await import("../networking/WebSocketServer.js");

    const httpServer = createServer();
    const gws = new GameWebSocketServer(httpServer);
    gws.start();
    const port = await listenOnRandomPort(httpServer);

    const ws = await openSocket(`ws://127.0.0.1:${port}/ws`, {
      headers: { "x-player-id": "ws_player" },
    });
    ws.send(JSON.stringify({ type: "noop", from: "identity-test" }));
    await new Promise((r) => setTimeout(r, 50));

    const stats = gws.getRuntimeStats();
    expect(stats.trackedPlayerUids).toBe(1);
    expect(stats.playerUidMessagesInWindow).toBe(1);

    ws.close();
    gws.stop();
    await new Promise<void>((resolve) => {
      httpServer.close(() => resolve());
    });
  });

  it("does not map request supplied player id in production without explicit allow flag", async () => {
    process.env.NODE_ENV = "production";

    const { GameWebSocketServer } = await import("../networking/WebSocketServer.js");

    const httpServer = createServer();
    const gws = new GameWebSocketServer(httpServer);
    gws.start();
    const port = await listenOnRandomPort(httpServer);

    const ws = await openSocket(`ws://127.0.0.1:${port}/ws`, {
      headers: { "x-player-id": "ws_player" },
    });
    ws.send(JSON.stringify({ type: "noop", from: "identity-test" }));
    await new Promise((r) => setTimeout(r, 50));

    const stats = gws.getRuntimeStats();
    expect(stats.trackedPlayerUids).toBe(0);
    expect(stats.playerUidMessagesInWindow).toBe(0);

    ws.close();
    gws.stop();
    await new Promise<void>((resolve) => {
      httpServer.close(() => resolve());
    });
  });
});
