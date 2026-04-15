import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import WebSocket from "ws";
import { GameWebSocketServer } from "../networking/WebSocketServer.js";

function waitForMessage(
  ws: WebSocket,
  predicate: (data: any) => boolean,
  timeoutMs = 15_000
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
        // ignore non-json
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

describe("WS gameplay flow", () => {
  let tmpDir: string;

  beforeAll(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "arelor-gameplayflow-"));
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
      // ignore cleanup errors
    }
  });

  it(
    "supports quest accept/complete, combat rewards and loot pickup",
    async () => {
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
        const welcome = await sendAndWait<any>(
          ws,
          {
            type: "login",
            guestId: "guest_gameplay_flow_01",
            guestName: "FlowTester",
            sceneId: "didis_hub",
            spawnKey: "sp_player_default",
          },
          (d) => d.type === "welcome"
        );
        const playerId = String(welcome.playerId || welcome.id || "");
        expect(playerId).toBe("guest_gameplay_flow_01");
        const player = tick.playerSystem.getPlayer(playerId);
        expect(player).toBeTruthy();

        const guide = tick.npcSystem.getNPC("npc_guide");
        expect(guide).toBeTruthy();
        player!.position.x = guide.position.x;
        player!.position.y = guide.position.y;

        const guideDialogue = await sendAndWait<any>(
          ws,
          { type: "interact", npcId: "npc_guide" },
          (d) => d.type === "dialogue" && d.npcId === "npc_guide" && d.questId === "starter_welcome"
        );
        expect(Array.isArray(guideDialogue.choices)).toBe(true);
        expect(guideDialogue.choices.some((c: any) => c.id === "sys_quest_accept")).toBe(true);

        const startedSync = await sendAndWait<any>(
          ws,
          { type: "quest_accept", npcId: "npc_guide" },
          (d) =>
            d.type === "stats_sync" &&
            Array.isArray(d.quests) &&
            d.quests.some((q: any) => q.id === "starter_welcome" && q.completed === false)
        );
        expect(startedSync.quests.some((q: any) => q.id === "starter_welcome")).toBe(true);

        const quartermaster = tick.npcSystem.getNPC("npc_1");
        expect(quartermaster).toBeTruthy();
        player!.position.x = quartermaster.position.x;
        player!.position.y = quartermaster.position.y;

        const completedSync = await sendAndWait<any>(
          ws,
          { type: "interact", npcId: "npc_1" },
          (d) =>
            d.type === "stats_sync" &&
            Array.isArray(d.quests) &&
            d.quests.some((q: any) => q.id === "starter_welcome" && q.completed === true)
        );
        expect(completedSync.gold).toBeGreaterThanOrEqual(25);
        expect(completedSync.xp).toBeGreaterThanOrEqual(40);

        const dummy = tick.npcSystem.getNPC("npc_dummy");
        expect(dummy).toBeTruthy();
        dummy.dropTable = [{ itemId: "iron_scrap", chance: 1 }];
        dummy.health = 1;
        player!.position.x = dummy.position.x;
        player!.position.y = dummy.position.y;
        player!.mana = Math.max(player!.maxMana ?? 25, 25);
        player!.combatTargetNpcId = "npc_dummy";

        const xpBefore = Number(player!.xp || 0);
        player!.mana = Math.max(Number(player!.mana || 0), 100);
        for (let i = 0; i < 12 && Number(player!.xp || 0) <= xpBefore; i++) {
          await sendAndWait<any>(
            ws,
            { type: "attack" },
            (d) => d.type === "stats_sync",
            6_000
          );
        }
        expect(Number(player!.xp || 0)).toBeGreaterThan(xpBefore);

        const lootMap = (tick as any).lootEntities as Map<string, any>;
        expect(lootMap.size).toBeGreaterThan(0);
        const lootEntity = Array.from(lootMap.values())[0];
        expect(lootEntity?.id).toBeTruthy();

        const afterPickupSync = await sendAndWait<any>(
          ws,
          { type: "pickup_loot", lootId: lootEntity.id },
          (d) => d.type === "stats_sync" && Array.isArray(d.inventory) && d.inventory.some((i: any) => i.id === "iron_scrap"),
          12_000
        );
        expect(afterPickupSync.inventory.some((i: any) => i.id === "iron_scrap")).toBe(true);
      } finally {
        await new Promise<void>((resolve) => {
          ws.once("close", () => resolve());
          ws.close();
        });
        tick.stop();
        await new Promise<void>((resolve) => httpServer.close(() => resolve()));
      }
    },
    60_000
  );

  it(
    "applies slower entity_sync cadence for low-bandwidth mobile login hints",
    async () => {
      const { WorldTick } = await import("../core/WorldTick.js");

      const httpServer = createServer();
      const gws = new GameWebSocketServer(httpServer);
      gws.start();
      const tick = new WorldTick(gws);
      await tick.init();
      tick.start();
      await new Promise<void>((resolve) => httpServer.listen(0, resolve));
      const port = (httpServer.address() as AddressInfo).port;

      const desktop = new WebSocket(`ws://127.0.0.1:${port}/ws`);
      const mobile = new WebSocket(`ws://127.0.0.1:${port}/ws`);
      const open = (ws: WebSocket) =>
        new Promise<void>((resolve, reject) => {
          ws.once("open", () => resolve());
          ws.once("error", reject);
        });
      await Promise.all([open(desktop), open(mobile)]);

      try {
        await sendAndWait(
          desktop,
          {
            type: "login",
            guestId: "guest_sync_desktop_01",
            guestName: "DesktopSync",
            sceneId: "didis_hub",
            spawnKey: "sp_player_default",
          },
          (d) => d.type === "welcome"
        );
        await sendAndWait(
          mobile,
          {
            type: "login",
            guestId: "guest_sync_mobile_01",
            guestName: "MobileSync",
            sceneId: "didis_hub",
            spawnKey: "sp_player_default",
            clientHints: { lowBandwidth: true },
          },
          (d) => d.type === "welcome"
        );

        let desktopSyncCount = 0;
        let mobileSyncCount = 0;
        desktop.on("message", (raw) => {
          try {
            const data = JSON.parse(String(raw));
            if (data.type === "entity_sync") desktopSyncCount += 1;
          } catch {
            // ignore non-json
          }
        });
        mobile.on("message", (raw) => {
          try {
            const data = JSON.parse(String(raw));
            if (data.type === "entity_sync") mobileSyncCount += 1;
          } catch {
            // ignore non-json
          }
        });

        await new Promise((resolve) => setTimeout(resolve, 1400));
        expect(desktopSyncCount).toBeGreaterThan(0);
        expect(mobileSyncCount).toBeGreaterThan(0);
        expect(mobileSyncCount).toBeLessThan(desktopSyncCount);
      } finally {
        await Promise.all(
          [desktop, mobile].map(
            (ws) =>
              new Promise<void>((resolve) => {
                ws.once("close", () => resolve());
                ws.close();
              })
          )
        );
        tick.stop();
        await new Promise<void>((resolve) => httpServer.close(() => resolve()));
      }
    },
    45_000
  );
});
