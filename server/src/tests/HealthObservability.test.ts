import express from "express";
import request from "supertest";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { healthRoutes } from "../api/healthRoutes.js";
import type { DatabaseRuntimeEvidence } from "../config/databaseRuntimeContract.js";

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
  return {
    tickCount: 44,
    getSpatialBroadcastStats: () => ({ chunkCount: 3, entityCount: 7 }),
    getWorldHashSnapshot: () => ({ tick: 44, worldHash: "hash_44", chunkCount: 3, entityCount: 7, timestamp: 44 }),
    getReplayRecorderStats: () => ({ recordedTicks: 44, replayBufferSize: 4 }),
    getManifestManager: () => ({
      getLastStateHash: () => "hash_44",
      getLastSnapshotTick: () => 44,
      getReplayGuard: () => ({ getHighestTick: () => 44, getNonceCount: () => 0 }),
    }),
    handleClientDivergence: () => null,
  };
}

function databaseEvidence(overrides: Partial<DatabaseRuntimeEvidence> = {}): DatabaseRuntimeEvidence {
  return {
    ok: true,
    required: true,
    configured: true,
    status: "ok",
    canary: { selectOne: true, database: "areloria_test", serverVersionNum: "160004" },
    schema: { missingColumns: [], conflictingColumns: [] },
    extensions: { required: ["pgcrypto"], present: ["pgcrypto"], missing: [] },
    rls: {
      required: true,
      enabled: true,
      presentPolicies: ["players_insert_own", "players_read_own", "players_update_own"],
      missingPolicies: [],
    },
    ...overrides,
  };
}

describe("health observability route", () => {
  it("exposes runtime dashboard and database evidence", async () => {
    const dataRoot = mkdtempSync(path.join(tmpdir(), "areloria-persistence-"));
    process.env.CLIENT_ROOT_DIR = makeClientRoot();
    process.env.QUEST_STATE_FILE = path.join(dataRoot, "quest.json");
    process.env.SKILL_STATE_FILE = path.join(dataRoot, "skill.json");
    process.env.INVENTORY_STATE_FILE = path.join(dataRoot, "inventory.json");

    const app = express();
    app.use(
      "/health",
      healthRoutes({
        getTick: () => makeTick() as any,
        isInitializing: () => false,
        getPort: () => 3000,
        checkDatabaseRuntime: async () => databaseEvidence(),
      }),
    );

    const res = await request(app).get("/health/observability").expect(200);

    expect(res.body.ok).toBe(true);
    expect(res.body.tick.current).toBe(44);
    expect(res.body.database.ok).toBe(true);
    expect(res.body.websocket.activeClients).toBe(0);
    expect(res.body.manifest.status).toBe("available");
    expect(res.body.persistence.failures).toEqual([]);
    expect(res.body.assets.failures).toEqual([]);
    expect(res.body.playtester).toHaveProperty("enabled");
  });

  it("keeps readiness red when required database evidence fails", async () => {
    const app = express();
    app.use(
      "/health",
      healthRoutes({
        getTick: () => makeTick() as any,
        isInitializing: () => false,
        getPort: () => 3000,
        checkDatabaseRuntime: async () =>
          databaseEvidence({
            ok: false,
            status: "schema_mismatch",
            schema: {
              missingColumns: ["runtime_player_snapshots.snapshot"],
              conflictingColumns: [],
            },
          }),
      }),
    );

    const res = await request(app).get("/health/ready").expect(503);
    expect(res.body.ok).toBe(false);
    expect(res.body.status).toBe("database_degraded");
    expect(res.body.database.schema.missingColumns).toEqual([
      "runtime_player_snapshots.snapshot",
    ]);
  });
});
