import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import express from "express";
import request from "supertest";
import { financeRouter } from "../api/financeRoute.js";
import { createManifestResyncRouter } from "../api/manifestResyncRoute.js";
import { adminAuthMiddleware } from "../middleware/adminAuthMiddleware.js";
import { adminRateLimiter } from "../middleware/rateLimitMiddleware.js";

describe("Sentinel Status Endpoint Protection", () => {
  beforeEach(() => {
    process.env.ADMIN_PANEL_TOKEN = "test-token";
  });

  afterEach(() => {
    delete process.env.ADMIN_PANEL_TOKEN;
    vi.restoreAllMocks();
  });

  describe("/api/finance/status", () => {
    it("returns 401 when unauthenticated", async () => {
      const app = express();
      app.use("/api/finance", financeRouter());

      const response = await request(app).get("/api/finance/status");
      expect(response.status).toBe(401);
    });

    it("returns 200 when authenticated with X-Admin-Token", async () => {
      const app = express();
      app.use("/api/finance", financeRouter());

      const response = await request(app)
        .get("/api/finance/status")
        .set("X-Admin-Token", "test-token");
      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
      expect(response.body.paypal).toBeDefined();
    });
  });

  describe("/api/manifest/status", () => {
    const mockWorldTick = {
      getManifestManager: () => ({
        getLastStateHash: () => "abc",
        getLastSnapshotTick: () => 123,
        getReplayGuard: () => ({
          getHighestTick: () => 456,
          getNonceCount: () => 789,
        }),
      }),
    } as any;

    it("returns 401 when unauthenticated", async () => {
      const app = express();
      app.use("/api/manifest", createManifestResyncRouter(mockWorldTick));

      const response = await request(app).get("/api/manifest/status");
      expect(response.status).toBe(401);
    });

    it("returns 200 when authenticated with Bearer token", async () => {
      const app = express();
      app.use("/api/manifest", createManifestResyncRouter(mockWorldTick));

      const response = await request(app)
        .get("/api/manifest/status")
        .set("Authorization", "Bearer test-token");
      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
      expect(response.body.lastStateHash).toBe("abc");
    });
  });
});
