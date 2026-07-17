import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import express from "express";
import request from "supertest";
import { financeRouter } from "../api/financeRoute.js";
import { createManifestResyncRouter } from "../api/manifestResyncRoute.js";
import { areValidationRouter } from "../api/areValidationRoute.js";
import { areReplayRouter } from "../api/areReplayRoute.js";
import { adminAuthMiddleware } from "../middleware/adminAuthMiddleware.js";
import { adminRateLimiter } from "../middleware/rateLimitMiddleware.js";

describe("Sentinel Status Leak Protection", () => {
  beforeEach(() => {
    process.env.ADMIN_PANEL_TOKEN = "secret_token";
  });

  afterEach(() => {
    delete process.env.ADMIN_PANEL_TOKEN;
    vi.restoreAllMocks();
  });

  describe("Finance Status Endpoint", () => {
    it("requires admin authentication for GET /api/finance/status", async () => {
      const app = express();
      app.use("/api/finance", financeRouter());

      const r = await request(app).get("/api/finance/status");
      expect(r.status).toBe(401);

      const r2 = await request(app)
        .get("/api/finance/status")
        .set("X-Admin-Token", "secret_token");
      expect(r2.status).toBe(200);
    });
  });

  describe("Manifest Status Endpoint", () => {
    it("requires admin authentication for GET /api/manifest/status", async () => {
      const app = express();
      const mockTick = {
        getManifestManager: () => ({
          getLastStateHash: () => "hash",
          getLastSnapshotTick: () => 10,
          getReplayGuard: () => ({
            getHighestTick: () => 15,
            getNonceCount: () => 2,
          }),
        }),
      } as any;

      app.use("/api/manifest", createManifestResyncRouter(mockTick));

      const r = await request(app).get("/api/manifest/status");
      expect(r.status).toBe(401);

      const r2 = await request(app)
        .get("/api/manifest/status")
        .set("X-Admin-Token", "secret_token");
      expect(r2.status).toBe(200);
    });
  });

  describe("ARE Validation Router", () => {
    it("requires admin authentication for all endpoints", async () => {
      const app = express();
      const mockTick = {
        getWorldHashSnapshot: () => ({ worldHash: "h" }),
        comparePortalWorldHash: () => ({ ok: true }),
        getAREGuardStatus: () => ({ ok: true }),
      } as any;

      app.use("/api/are/validation", areValidationRouter(mockTick));

      // Test /status
      let r = await request(app).get("/api/are/validation/status");
      expect(r.status).toBe(401);

      let r2 = await request(app)
        .get("/api/are/validation/status")
        .set("X-Admin-Token", "secret_token");
      expect(r2.status).toBe(200);

      // Test /world-hash
      r = await request(app).get("/api/are/validation/world-hash");
      expect(r.status).toBe(401);

      r2 = await request(app)
        .get("/api/are/validation/world-hash")
        .set("X-Admin-Token", "secret_token");
      expect(r2.status).toBe(200);

      // Test /compare
      r = await request(app).post("/api/are/validation/compare").send({});
      expect(r.status).toBe(401);

      r2 = await request(app)
        .post("/api/are/validation/compare")
        .set("X-Admin-Token", "secret_token")
        .send({});
      expect(r2.status).toBe(200);
    });
  });

  describe("ARE Replay Router Status/Diagnostic Endpoints", () => {
    it("requires admin authentication for diagnostic endpoints", async () => {
      const app = express();
      const mockTick = {
        getReplayRecorderStats: () => ({}),
        getAutoRepairStatus: () => ({}),
        getDeterministicUsageStats: () => ({}),
        getSdkBillingStatus: () => ({}),
        getOracleReport: () => ({}),
      } as any;

      app.use("/api/are/replay", areReplayRouter(mockTick));

      const endpoints = [
        { path: "/stats", method: "get" },
        { path: "/repair/status", method: "get" },
        { path: "/billing/status", method: "get" },
        { path: "/governance/status", method: "get" },
        { path: "/oracle/prophecy", method: "get" },
        { path: "/oracle/status", method: "get" },
      ];

      for (const endpoint of endpoints) {
        const reqFn = (request(app) as any)[endpoint.method];
        let r = await reqFn(`/api/are/replay${endpoint.path}`);
        expect(r.status).toBe(401);

        let r2 = await reqFn(`/api/are/replay${endpoint.path}`)
          .set("X-Admin-Token", "secret_token");
        expect(r2.status).not.toBe(401);
      }
    });
  });
});
