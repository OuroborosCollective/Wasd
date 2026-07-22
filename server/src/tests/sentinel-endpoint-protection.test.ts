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
import { areValidationRouter } from "../api/areValidationRoute.js";
import { areReplayRouter } from "../api/areReplayRoute.js";

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
          getLastStateHash: () => "hash",
          getLastSnapshotTick: () => 0,
          getReplayGuard: () => ({
            getHighestTick: () => 0,
            getNonceCount: () => 0,
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
    });
  });

  describe("/api/are/validation", () => {
    it("all diagnostic and compare endpoints are protected by adminAuthMiddleware", async () => {
      process.env.ADMIN_PANEL_TOKEN = "secret";
      const app = express();
      const mockTick = {
        getWorldHashSnapshot: () => ({}),
        comparePortalWorldHash: () => ({ ok: true }),
        getAREGuardStatus: () => ({}),
      } as any;
      app.use("/api/are/validation", areValidationRouter(mockTick));

      // 1. /status
      const rStatus = await request(app).get("/api/are/validation/status");
      expect(rStatus.status).toBe(401);

      const rStatusAuth = await request(app)
        .get("/api/are/validation/status")
        .set("X-Admin-Token", "secret");
      expect(rStatusAuth.status).toBe(200);

      // 2. /world-hash
      const rHash = await request(app).get("/api/are/validation/world-hash");
      expect(rHash.status).toBe(401);

      const rHashAuth = await request(app)
        .get("/api/are/validation/world-hash")
        .set("X-Admin-Token", "secret");
      expect(rHashAuth.status).toBe(200);

      // 3. /compare
      const rCompare = await request(app).post("/api/are/validation/compare").send({});
      expect(rCompare.status).toBe(401);

      const rCompareAuth = await request(app)
        .post("/api/are/validation/compare")
        .set("X-Admin-Token", "secret")
        .send({});
      expect(rCompareAuth.status).toBe(200);
    });
  });

  describe("/api/are/replay", () => {
    it("all stats, status, prophecy, and snapshot endpoints are protected by adminAuthMiddleware", async () => {
      process.env.ADMIN_PANEL_TOKEN = "secret";
      const app = express();
      const mockTick = {
        getReplayRecorderStats: () => ({}),
        getAutoRepairStatus: () => ({}),
        getDeterministicUsageStats: () => ({}),
        getSdkBillingStatus: () => ({}),
        getOracleReport: () => ({ prophecies: [] }),
        getReplaySnapshot: () => ({}),
      } as any;
      app.use("/api/are/replay", areReplayRouter(mockTick));

      const endpoints = [
        ["/stats", "GET"],
        ["/repair/status", "GET"],
        ["/billing/status", "GET"],
        ["/governance/status", "GET"],
        ["/oracle/prophecy", "GET"],
        ["/oracle/status", "GET"],
        ["/snapshot/0", "GET"],
      ];

      for (const [endpoint, method] of endpoints) {
        let r;
        if (method === "GET") {
          r = await request(app).get(`/api/are/replay${endpoint}`);
        } else {
          r = await request(app).post(`/api/are/replay${endpoint}`).send({});
        }
        expect(r.status).toBe(401);

        let rAuth;
        if (method === "GET") {
          rAuth = await request(app)
            .get(`/api/are/replay${endpoint}`)
            .set("X-Admin-Token", "secret");
        } else {
          rAuth = await request(app)
            .post(`/api/are/replay${endpoint}`)
            .set("X-Admin-Token", "secret")
            .send({});
        }
        expect(rAuth.status).not.toBe(401);
      }
    });
  });
});
