import express from "express";
import request from "supertest";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { healthRoutes } from "../api/healthRoutes.js";

function makeClientRoot(): string {
  const root = mkdtempSync(path.join(tmpdir(), "areloria-health-"));
  for (const route of ["2d", "3d", "portal"]) {
    const dir = path.join(root, "dist", route);
    mkdirSync(dir, { recursive: true });
    writeFileSync(path.join(dir, "index.html"), "<!doctype html>\n", "utf8");
  }
  return root;
}

function makeTick() {
  const stateHash = "a".repeat(64);
  return {
    tickCount: 44,
    getSpatialBroadcastStats: () => ({ chunkCount: 3, entityCount: 7 }),
    getWorldHashSnapshot: () => ({ tick: 44, worldHash: stateHash, chunkCount: 3, entityCount: 7, timestamp: 44 }),
    getReplayRecorderStats: () => ({ recordedTicks: 44, replayBufferSize: 4 }),
    getManifestManager: () => ({
      getLastStateHash: () => stateHash,
      getLastSnapshotTick: () => 44,
      getReplayGuard: () => ({ getHighestTick: () => 44, getNonceCount: () => 0 }),
    }),
    handleClientDivergence: () => null,
  };
}

describe("health observability route", () => {
  it("exposes runtime dashboard evidence", async () => {
    const dataRoot = mkdtempSync(path.join(tmpdir(), "areloria-persistence-"));
    process.env.CLIENT_ROOT_DIR = makeClientRoot();
    process.env.QUEST_STATE_FILE = path.join(dataRoot, "quest.json");
    process.env.SKILL_STATE_FILE = path.join(dataRoot, "skill.json");
    process.env.INVENTORY_STATE_FILE = path.join(dataRoot, "inventory.json");

    const app = express();
    app.use("/health", healthRoutes({ getTick: () => makeTick() as any, isInitializing: () => false, getPort: () => 3000 }));

    const res = await request(app).get("/health/observability").expect(200);

    expect(res.body.ok).toBe(true);
    expect(res.body.tick.current).toBe(44);
    expect(res.body.websocket.activeClients).toBe(0);
    expect(res.body.manifest.status).toBe("available");
    expect(res.body.persistence.failures).toEqual([]);
    expect(res.body.assets.failures).toEqual([]);
    expect(res.body.playtester).toHaveProperty("enabled");
  });
});
