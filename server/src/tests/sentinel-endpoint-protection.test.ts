import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import express from "express";
import request from "supertest";
import { client2dAssetUploadRouter } from "../api/client2dAssetUploadRoute.js";
import { sovereignDeployRouter } from "../api/sovereignDeployRoute.js";
import { areShadowLogRouter } from "../api/areShadowLogRoute.js";
import { createSelfHealWorkshopRouter } from "../routes/selfHealWorkshopRoute.js";
import { adminAuthMiddleware } from "../middleware/adminAuthMiddleware.js";
import { adminRateLimiter } from "../middleware/rateLimitMiddleware.js";
import { financeRouter } from "../api/financeRoute.js";
import { createManifestResyncRouter } from "../api/manifestResyncRoute.js";
import { areReplayRouter } from "../api/areReplayRoute.js";
import { areValidationRouter } from "../api/areValidationRoute.js";

describe("Sentinel Endpoint Protection", () => {
  beforeEach(() => {
    delete process.env.ADMIN_PANEL_TOKEN;
    delete process.env.CONTENT_ADMIN_READONLY;
  });

  afterEach(() => {
    delete process.env.ADMIN_PANEL_TOKEN;
    delete process.env.CONTENT_ADMIN_READONLY;
    vi.restoreAllMocks();
  });

  describe("/api/client2d-assets", () => {
    it("is protected by adminAuthMiddleware", async () => {
      process.env.ADMIN_PANEL_TOKEN = "secret";
      const app = express();
      app.use("/api/client2d-assets", adminRateLimiter, adminAuthMiddleware, client2dAssetUploadRouter());

      const r = await request(app).get("/api/client2d-assets/status");
      expect(r.status).toBe(401);

      const r2 = await request(app)
        .get("/api/client2d-assets/status")
        .set("X-Admin-Token", "secret");
      expect(r2.status).toBe(200);
    });

    it("POST /upload is protected by adminWriteBlocked", async () => {
      process.env.ADMIN_PANEL_TOKEN = "secret";
      process.env.CONTENT_ADMIN_READONLY = "true";
      const app = express();
      app.use("/api/client2d-assets", adminRateLimiter, adminAuthMiddleware, client2dAssetUploadRouter());

      const r = await request(app)
        .post("/api/client2d-assets/upload")
        .set("X-Admin-Token", "secret");
      expect(r.status).toBe(403);
      expect(r.body.error).toContain("read-only");
    });
  });

  describe("/api/sovereign/deploy", () => {
    it("is protected by adminAuthMiddleware", async () => {
      process.env.ADMIN_PANEL_TOKEN = "secret";
      const app = express();
      const mockTick = {} as any;
      app.use("/api/sovereign/deploy", adminRateLimiter, adminAuthMiddleware, sovereignDeployRouter(mockTick));

      const r = await request(app).get("/api/sovereign/deploy/truth");
      expect(r.status).toBe(401);

      // We don't care if it fails later due to missing mock methods, we just want to see it pass auth
      const r2 = await request(app)
        .get("/api/sovereign/deploy/truth")
        .set("Authorization", "Bearer secret");
      expect(r2.status).not.toBe(401);
    });

    it("POST /launch is protected by adminWriteBlocked", async () => {
      process.env.ADMIN_PANEL_TOKEN = "secret";
      process.env.CONTENT_ADMIN_READONLY = "true";
      const app = express();
      const mockTick = {} as any;
      app.use("/api/sovereign/deploy", adminRateLimiter, adminAuthMiddleware, sovereignDeployRouter(mockTick));

      const r = await request(app)
        .post("/api/sovereign/deploy/launch")
        .set("Authorization", "Bearer secret");
      expect(r.status).toBe(403);
      expect(r.body.error).toContain("read-only");
    });
  });

  describe("/api/are-shadow", () => {
    it("is protected by adminAuthMiddleware", async () => {
      process.env.ADMIN_PANEL_TOKEN = "secret";
      const app = express();
      app.use("/api/are-shadow", adminRateLimiter, adminAuthMiddleware, areShadowLogRouter());

      const r = await request(app).get("/api/are-shadow/log");
      expect(r.status).toBe(401);

      const r2 = await request(app)
        .get("/api/are-shadow/log")
        .set("X-Admin-Token", "secret");
      expect(r2.status).toBe(200);
    });
  });

  describe("/api/self-healing", () => {
    it("is protected by adminAuthMiddleware", async () => {
      process.env.ADMIN_PANEL_TOKEN = "secret";
      const app = express();
      app.use("/api/self-healing", adminRateLimiter, adminAuthMiddleware, createSelfHealWorkshopRouter());

      const r = await request(app).get("/api/self-healing");
      expect(r.status).toBe(401);

      const r2 = await request(app)
        .get("/api/self-healing")
        .set("X-Admin-Token", "secret");
      expect(r2.status).toBe(200);
    });
  });

  describe("/api/finance/status", () => {
    it("is protected by adminAuthMiddleware", async () => {
      process.env.ADMIN_PANEL_TOKEN = "secret";
      const app = express();
      app.use("/api/finance", adminRateLimiter, financeRouter());

      const r = await request(app).get("/api/finance/status");
      expect(r.status).toBe(401);

      const r2 = await request(app)
        .get("/api/finance/status")
        .set("X-Admin-Token", "secret");
      expect(r2.status).toBe(200);
    });
  });

  describe("/api/manifest/status", () => {
    it("is protected by adminAuthMiddleware", async () => {
      process.env.ADMIN_PANEL_TOKEN = "secret";
      const app = express();
      const mockTick = {
        getManifestManager: () => ({
          getLastStateHash: () => "hash123",
          getLastSnapshotTick: () => 42,
          getReplayGuard: () => ({
            getHighestTick: () => 100,
            getNonceCount: () => 10,
          }),
        }),
      } as any;
      app.use("/api/manifest", adminRateLimiter, createManifestResyncRouter(mockTick));

      const r = await request(app).get("/api/manifest/status");
      expect(r.status).toBe(401);

      const r2 = await request(app)
        .get("/api/manifest/status")
        .set("X-Admin-Token", "secret");
      expect(r2.status).toBe(200);
      expect(r2.body.lastStateHash).toBe("hash123");
    });
  });

  describe("/api/are/replay", () => {
    it("stats is protected by adminAuthMiddleware", async () => {
      process.env.ADMIN_PANEL_TOKEN = "secret";
      const app = express();
      const mockTick = {
        getReplayRecorderStats: () => ({ size: 5 }),
      } as any;
      app.use("/api/are/replay", areReplayRouter(mockTick));

      const r = await request(app).get("/api/are/replay/stats");
      expect(r.status).toBe(401);

      const r2 = await request(app)
        .get("/api/are/replay/stats")
        .set("X-Admin-Token", "secret");
      expect(r2.status).toBe(200);
      expect(r2.body.stats.size).toBe(5);
    });

    it("snapshot is protected by adminAuthMiddleware (NOT standard auth)", async () => {
      process.env.ADMIN_PANEL_TOKEN = "secret";
      const app = express();
      const mockTick = {
        getReplaySnapshot: () => ({ tick: 42 }),
      } as any;
      app.use("/api/are/replay", areReplayRouter(mockTick));

      const r = await request(app).get("/api/are/replay/snapshot/42");
      expect(r.status).toBe(401);

      const r2 = await request(app)
        .get("/api/are/replay/snapshot/42")
        .set("X-Admin-Token", "secret");
      expect(r2.status).toBe(200);
      expect(r2.body.tick).toBe(42);
    });
  });

  describe("/api/are/validation", () => {
    it("status is protected by adminAuthMiddleware", async () => {
      process.env.ADMIN_PANEL_TOKEN = "secret";
      const app = express();
      const mockTick = {} as any;
      app.use("/api/are/validation", areValidationRouter(mockTick));

      const r = await request(app).get("/api/are/validation/status");
      expect(r.status).toBe(401);

      const r2 = await request(app)
        .get("/api/are/validation/status")
        .set("X-Admin-Token", "secret");
      expect(r2.status).toBe(200);
    });
  });
});
