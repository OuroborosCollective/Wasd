// @ts-nocheck
import { describe, it, expect, vi } from "vitest";
import { createServer } from "node:http";
import { GameWebSocketServer } from "../networking/WebSocketServer.js";
import { WorldTick } from "../core/WorldTick.js";

describe("WorldTick.init persistence bootstrap", () => {
  it("initializes persistence backend before testing/loading", async () => {
    const httpServer = createServer();
    const gws = new GameWebSocketServer(httpServer);
    const tick = new WorldTick(gws);

    const callOrder: string[] = [];
    const initSpy = vi.spyOn(tick.persistence, "init").mockImplementation(async () => {
      callOrder.push("init");
    });
    const testSpy = vi.spyOn(tick.persistence, "testConnection").mockImplementation(async () => {
      callOrder.push("testConnection");
      return true;
    });
    const loadSpy = vi.spyOn(tick.persistence, "load").mockImplementation(async () => {
      callOrder.push("load");
      return {};
    });

    await tick.init();

    expect(initSpy).toHaveBeenCalledTimes(1);
    expect(testSpy).toHaveBeenCalledTimes(1);
    expect(loadSpy).toHaveBeenCalledTimes(1);
    expect(callOrder).toEqual(["init", "testConnection", "load"]);
  });
});
