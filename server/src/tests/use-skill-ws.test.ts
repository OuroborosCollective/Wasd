import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import WebSocket from "ws";
import { GameWebSocketServer } from "../networking/WebSocketServer.js";
import { getSkillDefinition } from "../modules/skill/skillDefinitions.js";

function waitForMessage(
  ws: WebSocket,
  pred: (data: any) => boolean,
  timeoutMs = 12_000
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

/** Register listener before `send` so fast server replies are not dropped. */
function sendAndWait<T>(
  ws: WebSocket,
  payload: unknown,
  pred: (data: any) => boolean,
  timeoutMs?: number
): Promise<T> {
  const p = waitForMessage(ws, pred, timeoutMs);
  ws.send(JSON.stringify(payload));
  return p as Promise<T>;
}

describe("WS use_skill", () => {
  let tmpDir: string;

  beforeAll(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "arelor-useskill-"));
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
    "rejects unknown skill, mana gate, range, cooldown; offensive and self succeed",
    async () => {
      const { WorldTick } = await import("../core/WorldTick.js");
      const guestId = "guest_skillwstest001";

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

      const stop = async (
        httpServer: ReturnType<typeof createServer>,
        tick: InstanceType<typeof WorldTick>
      ) => {
        tick.stop();
        await new Promise<void>((resolve, reject) => {
          httpServer.close((err) => (err ? reject(err) : resolve()));
        });
      };

      const { httpServer, tick, port } = await runOneServer();
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
            guestId,
            guestName: "SkillTester",
            sceneId: "didis_hub",
            spawnKey: "sp_player_default",
          },
          (d) => d.type === "welcome"
        );
        const pid = welcome.playerId || welcome.id;
        expect(typeof pid).toBe("string");

        const st0 = welcome.stats;
        expect(st0).toBeTruthy();
        expect(typeof st0.skillCooldownUntil).toBe("object");

        const player = tick.playerSystem.getPlayer(pid);
        expect(player).toBeTruthy();
        const dummy = tick.npcSystem.getNPC("npc_dummy");
        expect(dummy).toBeTruthy();

        const toastUnknown = await sendAndWait<any>(
          ws,
          { type: "use_skill", skillId: "not_a_real_skill" },
          (d) => d.type === "toast" && String(d.text).includes("Unknown skill")
        );
        expect(toastUnknown.text).toContain("Unknown skill");

        player!.mana = 3;
        const toastMana = await sendAndWait<any>(
          ws,
          { type: "use_skill", skillId: "arc_spark" },
          (d) => d.type === "toast" && String(d.text).includes("Not enough mana")
        );
        expect(toastMana.text).toMatch(/Not enough mana/);

        const arc = getSkillDefinition("arc_spark")!;
        /** Level 1 caps from SkillSystem.checkPlayerLevel — do not raise maxMana in-test or it gets clamped back. */
        player!.mana = player!.maxMana ?? 25;
        player!.position.x = dummy!.position.x;
        player!.position.y = dummy!.position.y;

        const manaBefore = player!.mana;
        const toastP = waitForMessage(
          ws,
          (d) => d.type === "toast" && String(d.text).includes("Arc Spark")
        );
        const syncP = waitForMessage(ws, (d) => {
          if (d.type !== "stats_sync") return false;
          const cd = d.skillCooldownUntil?.arc_spark;
          return typeof cd === "number" && cd > Date.now();
        });
        ws.send(JSON.stringify({ type: "use_skill", skillId: "arc_spark" }));
        const [offensiveToast, syncAfterCast] = await Promise.all([toastP, syncP]);
        expect(offensiveToast.text).toMatch(/Arc Spark/);
        const manaAfter = Number(syncAfterCast.mana);
        expect(Number.isFinite(manaAfter)).toBe(true);
        expect(manaAfter).toBeLessThanOrEqual(manaBefore);
        expect(manaAfter).toBeGreaterThanOrEqual(manaBefore - arc.manaCost - 1);

        const toastCd = await sendAndWait<any>(
          ws,
          { type: "use_skill", skillId: "arc_spark" },
          (d) => d.type === "toast" && String(d.text).toLowerCase().includes("not ready")
        );
        expect(toastCd.text).toMatch(/not ready/i);

        player!.position.x = 5000;
        player!.position.y = 5000;
        player!.mana = player!.maxMana ?? 25;
        const cdMap = player!.skillCooldowns as Record<string, number>;
        delete cdMap.arc_spark;
        const toastRange = await sendAndWait<any>(
          ws,
          { type: "use_skill", skillId: "arc_spark" },
          (d) => d.type === "toast" && String(d.text).includes("No target in range")
        );
        expect(toastRange.text).toContain("No target in range");

        player!.position.x = dummy!.position.x;
        player!.position.y = dummy!.position.y;
        player!.health = 15;
        const mm = player!.maxMana ?? 25;
        player!.mana = mm;
        const tap = getSkillDefinition("vitality_tap")!;
        const cdTap = player!.skillCooldowns as Record<string, number>;
        delete cdTap.vitality_tap;
        const expectHealth = Math.min(player!.maxHealth ?? 100, 15 + (tap.healAmount ?? 0));
        const expectMana = mm - tap.manaCost;

        const selfToastP = waitForMessage(
          ws,
          (d) => d.type === "toast" && String(d.text).includes("Vitality Tap")
        );
        const selfSyncP = waitForMessage(
          ws,
          (d) =>
            d.type === "stats_sync" &&
            typeof d.health === "number" &&
            typeof d.mana === "number" &&
            d.health === expectHealth &&
            d.mana === expectMana
        );
        ws.send(JSON.stringify({ type: "use_skill", skillId: "vitality_tap" }));
        const [selfToast, syncSelf] = await Promise.all([selfToastP, selfSyncP]);
        expect(selfToast.text).toMatch(/Vitality Tap/);
        expect(syncSelf.skillCooldownUntil?.vitality_tap).toBeGreaterThan(Date.now());
      } finally {
        await new Promise<void>((resolve) => {
          ws.once("close", () => resolve());
          ws.close();
        });
        await stop(httpServer, tick);
      }
    },
    30_000
  );
});
