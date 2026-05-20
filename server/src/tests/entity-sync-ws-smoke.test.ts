import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import WebSocket from "ws";
import { GameWebSocketServer } from "../networking/WebSocketServer.js";

function parseWsJson(raw: WebSocket.RawData): any {
  const s = Buffer.isBuffer(raw)
    ? raw.toString("utf8")
    : typeof raw === "string"
      ? raw
      : new TextDecoder().decode(raw as ArrayBuffer);
  return JSON.parse(s);
}

function waitForMessage(
  ws: WebSocket,
  pred: (data: any) => boolean,
  timeoutMs = 5_000,
): Promise<any> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => {
      ws.removeListener("message", onMsg);
      reject(new Error("waitForMessage timeout"));
    }, timeoutMs);
    const onMsg = (raw: WebSocket.RawData) => {
      try {
        const data = parseWsJson(raw);
        if (pred(data)) {
          clearTimeout(t);
          ws.removeListener("message", onMsg);
          resolve(data);
        }
      } catch {
        /* ignore */
      }
    };
    ws.on("message", onMsg);
  });
}

describe("entity_sync over WebSocket", () => {
  let tmpDir: string;

  beforeAll(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "arelor-entsync-"));
    process.env.PLAYER_SAVE_FILE = path.join(tmpDir, "players.json");
    process.env.ALLOW_GUEST_LOGIN = "1";
  });

  afterAll(() => {
    delete process.env.PLAYER_SAVE_FILE;
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  });

  it("delivers entity_sync after guest login", async () => {
    const { WorldTick } = await import("../core/WorldTick.js");
    const httpServer = createServer();
    const gws = new GameWebSocketServer(httpServer);
    gws.start();
    const tick = new WorldTick(gws);
    await tick.init();
    tick.start();
    await new Promise<void>((resolve) => httpServer.listen(0, resolve));
    const port = (httpServer.address() as AddressInfo).port;

    const ws = new WebSocket(`ws://127.0.0.1:${port}/ws`);
    await new Promise<void>((resolve, reject) => {
      ws.once("open", () => resolve());
      ws.once("error", reject);
    });

    try {
      ws.send(
        JSON.stringify({
          type: "login",
          token: "test-token",
          guestId: "guest_entsync_smoke",
          guestName: "EntSync",
        }),
      );
      const msg = await waitForMessage(ws, (d) => d.type === "entity_sync", 4000);
      expect(Array.isArray(msg.entities)).toBe(true);
      const row = msg.entities.find((e: any) => e.id === "npc_dummy");
      expect(row?.role).toBe("Training");
      expect(row?.combatThreat).toBe(false);
    } finally {
      ws.close();
      tick.stop();
      await new Promise<void>((resolve) => httpServer.close(() => resolve()));
    }
  });
});
