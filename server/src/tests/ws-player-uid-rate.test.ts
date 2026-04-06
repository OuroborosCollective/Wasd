import { describe, it, expect, afterEach } from "vitest";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import WebSocket from "ws";

describe("GameWebSocketServer per-uid rate limit", () => {
  afterEach(() => {
    delete process.env.WS_MAX_MESSAGES_PER_PLAYER_UID_PER_SECOND;
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

    await new Promise<void>((resolve) => httpServer.listen(0, resolve));
    const port = (httpServer.address() as AddressInfo).port;

    const ws = new WebSocket(`ws://127.0.0.1:${port}/ws`);
    await new Promise<void>((resolve, reject) => {
      ws.once("open", () => resolve());
      ws.once("error", reject);
    });

    for (let i = 0; i < 12; i++) {
      ws.send(JSON.stringify({ type: "noop", i }));
    }

    await new Promise((r) => setTimeout(r, 50));

    expect(received).toBeLessThanOrEqual(4);

    ws.close();
    await new Promise<void>((resolve) => {
      httpServer.close(() => resolve());
    });
  });
});
