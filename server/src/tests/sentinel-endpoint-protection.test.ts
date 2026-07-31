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
import { voteRouter } from "../api/voteRoute.js";

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

  describe("/api/are/replay diagnostic endpoints", () => {
    it("protects stats, repair/status, billing/status, governance/status, oracle/prophecy, oracle/status, and snapshot", async () => {
      process.env.ADMIN_PANEL_TOKEN = "secret";
      const app = express();
      const mockTick = {
        getReplayRecorderStats: () => ({ tick: 100 }),
        getAutoRepairStatus: () => ({ enabled: true }),
        getDeterministicUsageStats: () => ({ hashesInWindow: 5 }),
        getOracleReport: () => ({ prophecies: [] }),
        getReplaySnapshot: (t: number) => ({ tick: t }),
      } as any;
      app.use("/api/are/replay", areReplayRouter(mockTick));

      // 1. Stats
      let r = await request(app).get("/api/are/replay/stats");
      expect(r.status).toBe(401);
      let r2 = await request(app).get("/api/are/replay/stats").set("X-Admin-Token", "secret");
      expect(r2.status).toBe(200);

      // 2. Repair status
      r = await request(app).get("/api/are/replay/repair/status");
      expect(r.status).toBe(401);
      r2 = await request(app).get("/api/are/replay/repair/status").set("X-Admin-Token", "secret");
      expect(r2.status).toBe(200);

      // 3. Billing status
      r = await request(app).get("/api/are/replay/billing/status");
      expect(r.status).toBe(401);
      r2 = await request(app).get("/api/are/replay/billing/status").set("X-Admin-Token", "secret");
      expect(r2.status).toBe(200);

      // 4. Governance status
      r = await request(app).get("/api/are/replay/governance/status");
      expect(r.status).toBe(401);
      r2 = await request(app).get("/api/are/replay/governance/status").set("X-Admin-Token", "secret");
      expect(r2.status).toBe(200);

      // 5. Oracle prophecy
      r = await request(app).get("/api/are/replay/oracle/prophecy");
      expect(r.status).toBe(401);
      r2 = await request(app).get("/api/are/replay/oracle/prophecy").set("X-Admin-Token", "secret");
      expect(r2.status).toBe(200);

      // 6. Oracle status
      r = await request(app).get("/api/are/replay/oracle/status");
      expect(r.status).toBe(401);
      r2 = await request(app).get("/api/are/replay/oracle/status").set("X-Admin-Token", "secret");
      expect(r2.status).toBe(200);

      // 7. Snapshot
      r = await request(app).get("/api/are/replay/snapshot/100");
      expect(r.status).toBe(401);
      r2 = await request(app).get("/api/are/replay/snapshot/100").set("X-Admin-Token", "secret");
      expect(r2.status).toBe(200);
    });
  });

  describe("/api/are/validation", () => {
    it("protects status, world-hash, and compare", async () => {
      process.env.ADMIN_PANEL_TOKEN = "secret";
      const app = express();
      const mockTick = {
        getWorldHashSnapshot: () => ({ worldHash: "abc" }),
        comparePortalWorldHash: () => ({ ok: true }),
      } as any;
      app.use("/api/are/validation", areValidationRouter(mockTick));

      // 1. Status
      let r = await request(app).get("/api/are/validation/status");
      expect(r.status).toBe(401);
      let r2 = await request(app).get("/api/are/validation/status").set("X-Admin-Token", "secret");
      expect(r2.status).toBe(200);

      // 2. World hash
      r = await request(app).get("/api/are/validation/world-hash");
      expect(r.status).toBe(401);
      r2 = await request(app).get("/api/are/validation/world-hash").set("X-Admin-Token", "secret");
      expect(r2.status).toBe(200);

      // 3. Compare
      r = await request(app).post("/api/are/validation/compare").send({});
      expect(r.status).toBe(401);
      r2 = await request(app).post("/api/are/validation/compare").set("X-Admin-Token", "secret").send({});
      expect(r2.status).toBe(200);
    });
  });

  describe("/api/vote/admin sub-routes", () => {
    it("is protected by adminAuthRequestHandler and adminRateLimiter", async () => {
      process.env.ADMIN_PANEL_TOKEN = "secret";
      const app = express();
      const mockTick = {
        getAdminVoteBanners: () => [],
        getVoteAdminDiagnostics: () => ({}),
      } as any;
      app.use("/api/vote", voteRouter(mockTick));

      // 1. Diagnostics endpoint
      let r = await request(app).get("/api/vote/admin/diagnostics");
      expect(r.status).toBe(401);

      let r2 = await request(app)
        .get("/api/vote/admin/diagnostics")
        .set("X-Admin-Token", "secret");
      expect(r2.status).toBe(200);

      // 2. Banners endpoint
      r = await request(app).get("/api/vote/admin/banners");
      expect(r.status).toBe(401);

      r2 = await request(app)
        .get("/api/vote/admin/banners")
        .set("X-Admin-Token", "secret");
      expect(r2.status).toBe(200);
    });
  });
});
