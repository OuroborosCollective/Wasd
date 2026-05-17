import { describe, it, expect } from "vitest";
import { createServer } from "node:http";
import { GameWebSocketServer } from "../networking/WebSocketServer.js";
import { WorldTick } from "../core/WorldTick.js";

describe("WorldTick.init persistence bootstrap", () => {
  it("resolves without throwing (persistence bootstrap is owned by server startup, not WorldTick.init)", async () => {
    const httpServer = createServer();
    const gws = new GameWebSocketServer(httpServer);
    const tick = new WorldTick(gws);
    await expect(tick.init()).resolves.toBeUndefined();
  });
});
