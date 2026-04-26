import fs from "node:fs";
import { createServer } from "node:http";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WebSocket } from "ws";
import { PlaytesterConfig } from "../config/PlaytesterConfig.js";
import { PlaytesterDebugLog } from "../modules/playtester/PlaytesterDebugLog.js";
import { PlaytesterTelemetry } from "../modules/playtester/PlaytesterTelemetry.js";
import { PlaytesterActionPlanner } from "../modules/playtester/PlaytesterActionPlanner.js";
import { PlaytesterBrain } from "../modules/playtester/PlaytesterBrain.js";
import { PlaytesterMonitorStream } from "../modules/playtester/PlaytesterMonitorStream.js";
import { PlaytesterWebRTCSignaling } from "../modules/playtester/PlaytesterWebRTCSignaling.js";

describe("Playtester monitor primitives", () => {
  let tmpDir = "";

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "playtester-monitor-test-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("writes JSONL debug logs with expected fields", () => {
    const logPath = path.join(tmpDir, "playtester-debug.jsonl");
    const log = new PlaytesterDebugLog(logPath, true);
    log.write({
      ts: 1,
      tick: 10,
      playtesterId: "playtester_001",
      action: "interact_with_npc",
      result: "quest_started",
      goal: "start_new_quest",
      questId: "first_steps",
      step: 1,
      position: { x: 10, y: 0, z: 20 },
      targetId: "npc_1",
    });
    const raw = fs.readFileSync(logPath, "utf8").trim();
    expect(raw.length).toBeGreaterThan(0);
    const parsed = JSON.parse(raw);
    expect(parsed.playtesterId).toBe("playtester_001");
    expect(parsed.action).toBe("interact_with_npc");
    expect(parsed.result).toBe("quest_started");
    expect(parsed.position).toEqual({ x: 10, y: 0, z: 20 });
  });

  it("keeps telemetry bounded and exposes warnings/errors", () => {
    const telemetry = new PlaytesterTelemetry(3);
    telemetry.push(1, "ok-1", "info");
    telemetry.push(2, "warn-1", "warn");
    telemetry.push(3, "error-1", "error");
    telemetry.push(4, "ok-2", "info");
    const events = telemetry.getEvents(10);
    expect(events).toHaveLength(4);
    expect(events[0].text).toBe("ok-1");
    expect(events[3].text).toBe("ok-2");
    expect(telemetry.getWarnings()).toContain("warn-1");
    expect(telemetry.getErrors()).toContain("error-1");
  });

  it("planner and brain produce deterministic recover/respawn priorities", () => {
    const planner = new PlaytesterActionPlanner();
    const planDead = planner.plan({
      hasQuest: false,
      activeQuestObjectiveType: null,
      hasLootNearby: true,
      hasNpcNearby: true,
      hasEnemyNearby: true,
      hasEmptyWeaponSlot: true,
      hasInventoryWeapon: true,
      isDead: true,
      isStuck: false,
    });
    expect(planDead.action).toBe("respawn");

    const brain = new PlaytesterBrain();
    const decisionStuck = brain.decide({
      dead: false,
      questObjectiveType: "talk_to",
      questActive: true,
      hasLootNearby: false,
      hasNpcNearby: true,
      hasEnemyNearby: false,
      hasInventoryWeapon: false,
      hasWeaponEquipped: true,
      stuckScore: 6,
    });
    expect(decisionStuck.action).toBe("recover_from_stuck");
  });

  it("monitor stream sends playtester_monitor_update snapshots", async () => {
    const previousToken = (PlaytesterConfig as any).monitorToken;
    try {
      (PlaytesterConfig as any).monitorToken = "";
      const httpServer = createServer();
      const payload = {
        type: "playtester_monitor_update" as const,
        ts: Date.now(),
        tick: 7,
        playtester: {
          id: "playtester_001",
          displayName: "Playtester Bot",
          socketId: "playtester_socket_001",
          playerId: "playtester_001",
          tick: 7,
          connected: true,
          action: "explore_nearby_chunk" as const,
          lastAction: "find_nearest_npc" as const,
          goal: "discover_content_nodes",
          sceneId: "didis_hub",
          chunkId: "0:0",
          position: { x: 0, y: 0, z: 0 },
          activeQuestId: null,
          activeQuestStep: null,
          inventory: [],
          equipment: { weapon: null, armor: null, offHand: null },
          nearby: { npcs: [], enemies: [], loot: [], interactables: [] },
          warnings: [],
          errors: [],
          lastEvents: [],
        },
        camera: {
          mode: "third_person_follow" as const,
          offset: { x: 0, y: -18, z: 12 },
          lookAt: { x: 0, y: 0, z: 0 },
        },
        scene: { chunks: [], entities: [] },
        overlay: {
          currentChunk: "0:0",
          action: "explore_nearby_chunk" as const,
          goal: "discover_content_nodes",
          questStep: null,
          nearbyInteractables: [],
          warnings: [],
          lastEvents: [],
        },
        renderHints: {
          performanceMode: true,
          placeholderMode: false,
          radiusChunks: 1,
          shadowsEnabled: false,
          particlesEnabled: false,
        },
      };
      const stream = new PlaytesterMonitorStream(httpServer, () => payload);
      stream.start();

      const address = await new Promise<{ port: number }>((resolve) => {
        httpServer.listen(0, "127.0.0.1", () => {
          resolve(httpServer.address() as { port: number });
        });
      });

      const received = await new Promise<any>((resolve, reject) => {
        const ws = new WebSocket(`ws://127.0.0.1:${address.port}/playtester-monitor`);
        const timer = setTimeout(() => {
          ws.close();
          reject(new Error("no monitor payload received"));
        }, 2000);
        ws.on("message", (raw) => {
          clearTimeout(timer);
          const parsed = JSON.parse(raw.toString());
          ws.close();
          resolve(parsed);
        });
        ws.on("error", (error) => {
          clearTimeout(timer);
          reject(error);
        });
      });

      expect(received.type).toBe("playtester_monitor_update");
      expect(received.playtester.id).toBe("playtester_001");
      expect(received.camera.mode).toBe("third_person_follow");

      stream.stop();
      await new Promise<void>((resolve) => httpServer.close(() => resolve()));
    } finally {
      (PlaytesterConfig as any).monitorToken = previousToken;
    }
  });

  it("monitor stream enforces token when configured", async () => {
    const previousToken = (PlaytesterConfig as any).monitorToken;
    try {
      (PlaytesterConfig as any).monitorToken = "secret_token";
      const httpServer = createServer();
      const stream = new PlaytesterMonitorStream(httpServer, () => null);
      stream.start();
      const address = await new Promise<{ port: number }>((resolve) => {
        httpServer.listen(0, "127.0.0.1", () => {
          resolve(httpServer.address() as { port: number });
        });
      });

      const rejected = await new Promise<boolean>((resolve) => {
        const ws = new WebSocket(`ws://127.0.0.1:${address.port}/playtester-monitor`);
        const timeout = setTimeout(() => {
          ws.close();
          resolve(false);
        }, 1200);
        ws.on("message", () => {
          clearTimeout(timeout);
          ws.close();
          resolve(false);
        });
        ws.on("close", (code) => {
          clearTimeout(timeout);
          resolve(code === 1006 || code === 1008);
        });
        ws.on("error", () => {
          clearTimeout(timeout);
          resolve(true);
        });
      });
      expect(rejected).toBe(true);

      stream.stop();
      await new Promise<void>((resolve) => httpServer.close(() => resolve()));
    } finally {
      (PlaytesterConfig as any).monitorToken = previousToken;
    }
  });

  it("webrtc signaling forwards viewer registration to publisher", async () => {
    const previousToken = (PlaytesterConfig as any).monitorToken;
    try {
      (PlaytesterConfig as any).monitorToken = "";
      const httpServer = createServer();
      const signaling = new PlaytesterWebRTCSignaling(httpServer);
      signaling.start();
      const address = await new Promise<{ port: number }>((resolve) => {
        httpServer.listen(0, "127.0.0.1", () => {
          resolve(httpServer.address() as { port: number });
        });
      });

      const publisherEvents: unknown[] = [];
      const publisher = new WebSocket(`ws://127.0.0.1:${address.port}/playtester-monitor-signal`);
      await new Promise<void>((resolve, reject) => {
        publisher.once("open", () => resolve());
        publisher.once("error", reject);
      });
      publisher.on("message", (raw) => {
        publisherEvents.push(JSON.parse(raw.toString()));
      });
      publisher.send(JSON.stringify({ type: "register_publisher" }));

      const viewer = new WebSocket(`ws://127.0.0.1:${address.port}/playtester-monitor-signal`);
      await new Promise<void>((resolve, reject) => {
        viewer.once("open", () => resolve());
        viewer.once("error", reject);
      });
      viewer.send(JSON.stringify({ type: "register_viewer", viewerId: "viewer_abc" }));

      await new Promise((resolve) => setTimeout(resolve, 80));
      expect(publisherEvents.some((ev: any) => ev.type === "render_publisher_ready")).toBe(true);
      expect(
        publisherEvents.some(
          (ev: any) => ev.type === "admin_viewer_connected" && ev.viewerId === "viewer_abc"
        )
      ).toBe(true);

      viewer.close();
      publisher.close();
      signaling.stop();
      await new Promise<void>((resolve) => httpServer.close(() => resolve()));
    } finally {
      (PlaytesterConfig as any).monitorToken = previousToken;
    }
  });
});
