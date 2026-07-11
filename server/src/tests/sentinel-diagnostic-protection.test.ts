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
    delete process.env.SUPABASE_JWT_SECRET;
  });

  afterEach(() => {
    delete process.env.ADMIN_PANEL_TOKEN;
    delete process.env.SUPABASE_JWT_SECRET;
    vi.restoreAllMocks();
  });

  describe("/api/manifest", () => {
    it("/status is protected by adminAuthMiddleware", async () => {
      process.env.ADMIN_PANEL_TOKEN = "secret_manifest";
      const app = express();
      const mockTick = {
        getManifestManager: () => ({
          getLastStateHash: () => "hash123",
          getLastSnapshotTick: () => 100,
          getReplayGuard: () => ({
            getHighestTick: () => 100,
            getNonceCount: () => 5,
          }),
        }),
      } as any;

      app.use("/api/manifest", adminRateLimiter, createManifestResyncRouter(mockTick));

      const r = await request(app).get("/api/manifest/status");
      expect(r.status).toBe(401);

      const r2 = await request(app)
        .get("/api/manifest/status")
        .set("X-Admin-Token", "secret_manifest");
      expect(r2.status).toBe(200);
      expect(r2.body.lastStateHash).toBe("hash123");
    });
  });

  describe("/api/finance", () => {
    it("/status is protected by adminAuthMiddleware", async () => {
      process.env.ADMIN_PANEL_TOKEN = "secret_finance";
      const app = express();
      app.use("/api/finance", adminRateLimiter, financeRouter());

      const r = await request(app).get("/api/finance/status");
      expect(r.status).toBe(401);

      const r2 = await request(app)
        .get("/api/finance/status")
        .set("X-Admin-Token", "secret_finance");
      expect(r2.status).toBe(200);
      expect(r2.body.ok).toBe(true);
      expect(r2.body.paypal).toBeDefined();
    });
  });
});
