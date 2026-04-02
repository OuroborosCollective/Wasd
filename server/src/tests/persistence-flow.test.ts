import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import WebSocket from "ws";
import { GameWebSocketServer } from "../networking/WebSocketServer.js";
import { ItemRegistry } from "../modules/inventory/ItemRegistry.js";

function waitForMessage(
  ws: WebSocket,
  pred: (data: any) => boolean,
  timeoutMs = 8000
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

describe("WS persistence flow (file store)", () => {
  let tmpDir: string;
  let savePath: string;

  beforeAll(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "arelor-wsflow-"));
    savePath = path.join(tmpDir, "players.json");
    process.env.PLAYER_SAVE_FILE = savePath;
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

  it("guest login, use_item clears potion; reconnect restores combat target", async () => {
    const { WorldTick } = await import("../core/WorldTick.js");

    const guestId = "guest_wsflowtest01";

    const runOneServer = async () => {
      const httpServer = createServer();
      const gws = new GameWebSocketServer(httpServer);
      gws.start();
      const tick = new WorldTick(gws);
      await tick.init();
      await new Promise<void>((resolve) => httpServer.listen(0, resolve));
      const p = (httpServer.address() as AddressInfo).port;
      return { httpServer, tick, port: p };
    };

    const stop = async (httpServer: ReturnType<typeof createServer>, tick: InstanceType<typeof WorldTick>) => {
      tick.stop();
      await new Promise<void>((resolve, reject) => {
        httpServer.close((err) => (err ? reject(err) : resolve()));
      });
    };

    {
      const { httpServer, tick, port } = await runOneServer();
      const ws = new WebSocket(`ws://127.0.0.1:${port}/ws`);
      await new Promise<void>((resolve, reject) => {
        ws.once("open", () => resolve());
        ws.once("error", reject);
      });

      ws.send(
        JSON.stringify({
          type: "login",
          guestId,
          guestName: "FlowTester",
          sceneId: "didis_hub",
          spawnKey: "sp_player_default",
        })
      );
      const welcome = await waitForMessage(ws, (d) => d.type === "welcome");
      const pid = welcome.playerId || welcome.id;

      const player = tick.playerSystem.getPlayer(pid);
      expect(player).toBeTruthy();
      player!.mana = 5;
      const potion = ItemRegistry.createInstance("minor_mana_draught");
      expect(potion).toBeTruthy();
      tick.inventorySystem.addItem(player!, potion!);

      const dummy = tick.npcSystem.getNPC("npc_dummy");
      expect(dummy).toBeTruthy();
      player!.position.x = dummy!.position.x;
      player!.position.y = dummy!.position.y;

      ws.send(JSON.stringify({ type: "set_target", npcId: "npc_dummy" }));
      await new Promise((r) => setTimeout(r, 200));
      expect(player!.combatTargetNpcId).toBe("npc_dummy");

      ws.send(JSON.stringify({ type: "use_item", itemId: "minor_mana_draught" }));
      await waitForMessage(
        ws,
        (d) => d.type === "stats_sync" && typeof d.mana === "number" && d.mana >= 20
      );

      await new Promise<void>((resolve) => {
        ws.once("close", () => resolve());
        ws.close();
      });
      await tick.saveAll();
      await stop(httpServer, tick);
    }

    expect(fs.existsSync(savePath)).toBe(true);

    {
      const { httpServer, tick, port } = await runOneServer();
      const ws = new WebSocket(`ws://127.0.0.1:${port}/ws`);
      await new Promise<void>((resolve, reject) => {
        ws.once("open", () => resolve());
        ws.once("error", reject);
      });

      ws.send(
        JSON.stringify({
          type: "login",
          guestId,
          guestName: "FlowTester",
          sceneId: "didis_hub",
          spawnKey: "sp_player_default",
        })
      );
      await waitForMessage(ws, (d) => d.type === "welcome");
      const pid2 =
        tick.playerSystem.getAllPlayers().find((p) => p.id === guestId)?.id ||
        tick.playerSystem.getAllPlayers().find((p) => !p.isOffline)?.id;
      expect(pid2).toBe(guestId);
      const p2 = tick.playerSystem.getPlayer(guestId);
      expect(p2?.combatTargetNpcId).toBe("npc_dummy");
      const hasPotion = (p2?.inventory || []).some((i: any) => i?.id === "minor_mana_draught");
      expect(hasPotion).toBe(false);

      ws.close();
      await stop(httpServer, tick);
    }
  }, 45_000);
});
