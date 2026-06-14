import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import express from "express";
import request from "supertest";
import { client2dAssetUploadRouter } from "../api/client2dAssetUploadRoute.js";
import { sovereignDeployRouter } from "../api/sovereignDeployRoute.js";
import { adminAuthMiddleware } from "../middleware/adminAuthMiddleware.js";
import { adminRateLimiter, sensitiveWriteRateLimiter } from "../middleware/rateLimitMiddleware.js";

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
      app.use(adminRateLimiter);
      const mockTick = {} as any;
      app.use("/api/sovereign/deploy", adminAuthMiddleware, sovereignDeployRouter(mockTick));

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
      app.use(sensitiveWriteRateLimiter);
      const mockTick = {} as any;
      app.use("/api/sovereign/deploy", adminAuthMiddleware, sovereignDeployRouter(mockTick));

      const r = await request(app)
        .post("/api/sovereign/deploy/launch")
        .set("Authorization", "Bearer secret");
      expect(r.status).toBe(403);
      expect(r.body.error).toContain("read-only");
    });
  });
});
