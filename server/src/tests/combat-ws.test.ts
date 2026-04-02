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
  pred: (data: any) => boolean,
  timeoutMs = 15_000
): Promise<any> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => {
      ws.removeListener("message", onMsg);
      reject(new Error("waitForMessage timeout"));
    }, timeoutMs);
    const onMsg = (raw: WebSocket.RawData) => {
      try {
        const data = JSON.parse(String(raw));
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

function sendAndWait<T>(ws: WebSocket, payload: unknown, pred: (data: any) => boolean): Promise<T> {
  const p = waitForMessage(ws, pred);
  ws.send(JSON.stringify(payload));
  return p as Promise<T>;
}

describe("WS combat + entity_sync", () => {
  let tmpDir: string;

  beforeAll(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "arelor-combatws-"));
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
      /* ignore */
    }
  });

  it(
    "attack respects weapon mana; set_target; dead blocks attack with toast; entity_sync npc fields",
    async () => {
      const { WorldTick } = await import("../core/WorldTick.js");
      const guestId = "guest_combatwstest01";

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
          { type: "login", guestId, guestName: "CombatWS", sceneId: "didis_hub", spawnKey: "sp_player_default" },
          (d) => d.type === "welcome"
        );
        const player = tick.playerSystem.getPlayer(guestId);
        expect(player).toBeTruthy();
        const dummy = tick.npcSystem.getNPC("npc_dummy");
        expect(dummy).toBeTruthy();

        player!.mana = 0;
        const toastMana = await sendAndWait<any>(
          ws,
          { type: "attack" },
          (d) => d.type === "toast" && String(d.text).includes("Not enough mana")
        );
        expect(toastMana.text).toMatch(/mana/i);

        player!.mana = player!.maxMana ?? 25;
        player!.position.x = dummy!.position.x;
        player!.position.y = dummy!.position.y;

        await sendAndWait(ws, { type: "set_target", npcId: "npc_dummy" }, (d) => d.type === "stats_sync");
        expect(player!.combatTargetNpcId).toBe("npc_dummy");

        const syncP = waitForMessage(ws, (d) => {
          if (d.type !== "entity_sync" || !Array.isArray(d.entities)) return false;
          return d.entities.some(
            (e: any) =>
              e.id === "npc_dummy" &&
              e.type === "npc" &&
              e.role === "Training" &&
              e.combatNpcId === "npc_dummy" &&
              e.combatThreat === false &&
              typeof e.health === "number" &&
              typeof e.maxHealth === "number"
          );
        });
        ws.send(JSON.stringify({ type: "attack" }));
        await syncP;

        player!.dead = true;
        player!.deathAt = Date.now() - 10_000;
        const deadToast = await sendAndWait<any>(
          ws,
          { type: "attack" },
          (d) => d.type === "toast" && String(d.text).includes("defeated")
        );
        expect(deadToast.text).toMatch(/defeated/i);
      } finally {
        ws.close();
        tick.stop();
        await new Promise<void>((resolve) => httpServer.close(() => resolve()));
      }
    },
    45_000
  );
});
