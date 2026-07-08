import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import express from "express";
import request from "supertest";
import { createManifestResyncRouter } from "../api/manifestResyncRoute.js";
import { financeRouter } from "../api/financeRoute.js";
import { adminAuthMiddleware } from "../middleware/adminAuthMiddleware.js";
import { adminRateLimiter } from "../middleware/rateLimitMiddleware.js";

describe("Sentinel Diagnostic Protection", () => {
  beforeEach(() => {
    delete process.env.ADMIN_PANEL_TOKEN;
  });

  afterEach(() => {
    delete process.env.ADMIN_PANEL_TOKEN;
    vi.restoreAllMocks();
  });

  const mockTick = {
    getManifestManager: () => ({
      getLastStateHash: () => "hash",
      getLastSnapshotTick: () => 0,
      getReplayGuard: () => ({
        getHighestTick: () => 0,
        getNonceCount: () => 0,
      }),
    }),
  } as any;

  describe("/api/manifest/status", () => {
    it("is protected by adminAuthMiddleware", async () => {
      process.env.ADMIN_PANEL_TOKEN = "secret";
      const app = express();
      app.use("/api/manifest", createManifestResyncRouter(mockTick));

      const r = await request(app).get("/api/manifest/status");
      expect(r.status).toBe(401);

      const r2 = await request(app)
        .get("/api/manifest/status")
        .set("X-Admin-Token", "secret");
      expect(r2.status).toBe(200);
      expect(r2.body.ok).toBe(true);
    });
  });

  describe("/api/finance/status", () => {
    it("is protected by adminAuthMiddleware", async () => {
      process.env.ADMIN_PANEL_TOKEN = "secret";
      const app = express();
      app.use("/api/finance", financeRouter());

      const r = await request(app).get("/api/finance/status");
      expect(r.status).toBe(401);

      const r2 = await request(app)
        .get("/api/finance/status")
        .set("Authorization", "Bearer secret");
      expect(r2.status).toBe(200);
      expect(r2.body.ok).toBe(true);
    });
  });
});
