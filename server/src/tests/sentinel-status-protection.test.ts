import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import express from "express";
import request from "supertest";
import { createManifestResyncRouter } from "../api/manifestResyncRoute.js";
import { financeRouter } from "../api/financeRoute.js";
import { areReplayRouter } from "../api/areReplayRoute.js";
import { areValidationRouter } from "../api/areValidationRoute.js";
import { adminAuthMiddleware } from "../middleware/adminAuthMiddleware.js";
import { adminRateLimiter } from "../middleware/rateLimitMiddleware.js";

describe("Sentinel Status Protection", () => {
  const mockTick = {
    getManifestManager: () => ({
      getLastStateHash: () => "hash",
      getLastSnapshotTick: () => 0,
      getReplayGuard: () => ({
        getHighestTick: () => 0,
        getNonceCount: () => 0,
      }),
    }),
    getReplayRecorderStats: () => ({}),
    getAutoRepairStatus: () => ({}),
    getDeterministicUsageStats: () => ({}),
    getSdkBillingStatus: () => ({}),
    getOracleReport: () => ({ prophecies: [] }),
    init: vi.fn(),
    start: vi.fn(),
  } as any;

  beforeEach(() => {
    process.env.ADMIN_PANEL_TOKEN = "secret";
  });

  afterEach(() => {
    delete process.env.ADMIN_PANEL_TOKEN;
    vi.restoreAllMocks();
  });

  describe("/api/manifest/status", () => {
    it("should require admin authentication", async () => {
      const app = express();
      app.use("/api/manifest", createManifestResyncRouter(mockTick));

      const r = await request(app).get("/api/manifest/status");
      // Current behavior: returns 200 (VULNERABLE)
      // Targeted behavior: returns 401
      expect([401, 403]).toContain(r.status);
    });
  });

  describe("/api/finance/status", () => {
    it("should require admin authentication", async () => {
      const app = express();
      app.use("/api/finance", financeRouter());

      const r = await request(app).get("/api/finance/status");
      expect([401, 403]).toContain(r.status);
    });
  });

  describe("/api/are/replay diagnostic routes", () => {
    it("should require admin authentication for /stats", async () => {
      const app = express();
      app.use("/api/are/replay", areReplayRouter(mockTick));

      const r = await request(app).get("/api/are/replay/stats");
      expect([401, 403]).toContain(r.status);
    });

    it("should require admin authentication for /repair/status", async () => {
      const app = express();
      app.use("/api/are/replay", areReplayRouter(mockTick));

      const r = await request(app).get("/api/are/replay/repair/status");
      expect([401, 403]).toContain(r.status);
    });

    it("should require admin authentication for /billing/status", async () => {
      const app = express();
      app.use("/api/are/replay", areReplayRouter(mockTick));

      const r = await request(app).get("/api/are/replay/billing/status");
      expect([401, 403]).toContain(r.status);
    });

    it("should require admin authentication for /governance/status", async () => {
      const app = express();
      app.use("/api/are/replay", areReplayRouter(mockTick));

      const r = await request(app).get("/api/are/replay/governance/status");
      expect([401, 403]).toContain(r.status);
    });

    it("should require admin authentication for /oracle/status", async () => {
      const app = express();
      app.use("/api/are/replay", areReplayRouter(mockTick));

      const r = await request(app).get("/api/are/replay/oracle/status");
      expect([401, 403]).toContain(r.status);
    });
  });

  describe("/api/are/validation mount point", () => {
    it("should require admin authentication at mount point", async () => {
      const app = express();
      // Simulating ServerBootstrap mount point
      app.use("/api/are/validation", adminRateLimiter, adminAuthMiddleware, areValidationRouter(mockTick));

      const r = await request(app).get("/api/are/validation/status");
      expect([401, 403]).toContain(r.status);

      const r2 = await request(app)
        .get("/api/are/validation/status")
        .set("X-Admin-Token", "secret");
      expect(r2.status).toBe(200);
    });
  });
});
