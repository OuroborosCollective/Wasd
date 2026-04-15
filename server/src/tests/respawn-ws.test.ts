import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import WebSocket from "ws";
import { GameWebSocketServer } from "../networking/WebSocketServer.js";
import { GameConfig } from "../config/GameConfig.js";

function waitForMessage(
  ws: WebSocket,
  predicate: (data: any) => boolean,
  timeoutMs = 12_000
): Promise<any> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      ws.removeListener("message", onMessage);
      reject(new Error("waitForMessage timeout"));
    }, timeoutMs);

    const onMessage = (raw: WebSocket.RawData) => {
      try {
        const data = JSON.parse(String(raw));
        if (predicate(data)) {
          clearTimeout(timeout);
          ws.removeListener("message", onMessage);
          resolve(data);
        }
      } catch {
        // ignore
      }
    };

    ws.on("message", onMessage);
  });
}

function sendAndWait<T>(
  ws: WebSocket,
  payload: unknown,
  predicate: (data: any) => boolean,
  timeoutMs?: number
): Promise<T> {
  const p = waitForMessage(ws, predicate, timeoutMs);
  ws.send(JSON.stringify(payload));
  return p as Promise<T>;
}

describe("WS respawn flow", () => {
  let tmpDir: string;

  beforeAll(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "arelor-respawnws-"));
    process.env.PLAYER_SAVE_FILE = path.join(tmpDir, "players.json");
    process.env.ALLOW_GUEST_LOGIN = "1";
    process.env.NODE_ENV = "test";
  });

  afterAll(() => {
    delete process.env.PLAYER_SAVE_FILE;
    delete process.env.ALLOW_GUEST_LOGIN;
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // ignore cleanup failures
    }
  });

  it(
    "hostile NPC can defeat player and respawn gate works",
    async () => {
      const { WorldTick } = await import("../core/WorldTick.js");
      const guestId = "guest_respawnws_01";

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
        await sendAndWait(
          ws,
          {
            type: "login",
            guestId,
            guestName: "RespawnTester",
            sceneId: "didis_hub",
            spawnKey: "sp_player_default",
          },
          (d) => d.type === "welcome"
        );

        const player = tick.playerSystem.getPlayer(guestId);
        const wolf = tick.npcSystem.getNPC("npc_wolf");
        expect(player).toBeTruthy();
        expect(wolf).toBeTruthy();

        // Make defeat deterministic for the test while still going through hostile attack logic.
        player!.health = 1;
        player!.position.x = wolf.position.x;
        player!.position.y = wolf.position.y;

        const deadSync = await waitForMessage(
          ws,
          (d) => d.type === "stats_sync" && d.dead === true && typeof d.respawnAvailableAt === "number",
          15_000
        );
        expect(deadSync.health).toBe(0);

        const tooEarly = await sendAndWait<any>(
          ws,
          { type: "respawn" },
          (d) => d.type === "toast" && String(d.text).includes("Respawn is not ready"),
          8_000
        );
        expect(String(tooEarly.text)).toMatch(/Respawn is not ready yet/i);

        await new Promise((resolve) => setTimeout(resolve, GameConfig.playerRespawnDelayMs + 150));
        const sceneChangedP = waitForMessage(
          ws,
          (d) => d.type === "scene_changed" && d.via === "respawn",
          8_000
        );
        const aliveSyncP = waitForMessage(
          ws,
          (d) => d.type === "stats_sync" && d.dead === false && typeof d.health === "number" && d.health > 0,
          8_000
        );
        ws.send(JSON.stringify({ type: "respawn" }));
        const [sceneChanged, aliveSync] = await Promise.all([sceneChangedP, aliveSyncP]);
        expect(sceneChanged.sceneId).toBeTruthy();
        expect(aliveSync.dead).toBe(false);
      } finally {
        await new Promise<void>((resolve) => {
          ws.once("close", () => resolve());
          ws.close();
        });
        tick.stop();
        await new Promise<void>((resolve) => httpServer.close(() => resolve()));
      }
    },
    50_000
  );
});
