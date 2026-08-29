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
import { voteRouter } from "../api/voteRoute.js";
import { leaderboardRouter } from "../api/leaderboardRoute.js";
import { areReplayRouter } from "../api/areReplayRoute.js";
import { sdkBillingRouter } from "../api/sdkBillingRoute.js";
import { adminRoute } from "../api/adminRoute.js";
import { chatRoute } from "../api/chatRoute.js";

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

    it("POST /launch timing-safely validates sovereign launch key", async () => {
      process.env.ADMIN_PANEL_TOKEN = "secret";
      process.env.SOVEREIGN_LAUNCH_KEY = "launch-key-12345";
      const app = express();
      const mockTick = {} as any;
      const mockRunWorkflow = vi.fn().mockResolvedValue({ status: 202, body: { ok: true } });

      app.use(
        "/api/sovereign/deploy",
        adminRateLimiter,
        adminAuthMiddleware,
        sovereignDeployRouter(mockTick, { runWorkflow: mockRunWorkflow })
      );

      // 1. Missing key
      const r1 = await request(app)
        .post("/api/sovereign/deploy/launch")
        .set("Authorization", "Bearer secret");
      expect(r1.status).toBe(403);
      expect(r1.body.error).toBe("launch_key_required");

      // 2. Wrong key
      const r2 = await request(app)
        .post("/api/sovereign/deploy/launch")
        .set("Authorization", "Bearer secret")
        .set("X-Sovereign-Launch-Key", "wrong-key");
      expect(r2.status).toBe(403);

      // 3. Right key in header
      const r3 = await request(app)
        .post("/api/sovereign/deploy/launch")
        .set("Authorization", "Bearer secret")
        .set("X-Sovereign-Launch-Key", "launch-key-12345");
      expect(r3.status).toBe(202);
      expect(mockRunWorkflow).toHaveBeenCalled();

      // 4. Right key in body
      const r4 = await request(app)
        .post("/api/sovereign/deploy/launch")
        .set("Authorization", "Bearer secret")
        .send({ launchKey: "launch-key-12345" });
      expect(r4.status).toBe(202);

      delete process.env.SOVEREIGN_LAUNCH_KEY;
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

    it("verifies launch key via constant-time comparison in header and body", async () => {
      process.env.ADMIN_PANEL_TOKEN = "secret";
      process.env.SOVEREIGN_LAUNCH_KEY = "sovereign-secret-key-999";
      const mockWorkflow = vi.fn().mockResolvedValue({ status: 202, body: { ok: true } });
      const app = express();
      const mockTick = {} as any;
      app.use("/api/sovereign/deploy", adminRateLimiter, adminAuthMiddleware, sovereignDeployRouter(mockTick, { runWorkflow: mockWorkflow }));

      // Invalid launch key -> 403
      const r1 = await request(app)
        .post("/api/sovereign/deploy/launch")
        .set("Authorization", "Bearer secret")
        .set("x-sovereign-launch-key", "wrong-key");
      expect(r1.status).toBe(403);
      expect(r1.body.error).toBe("launch_key_required");

      // Valid launch key in header -> 202
      const r2 = await request(app)
        .post("/api/sovereign/deploy/launch")
        .set("Authorization", "Bearer secret")
        .set("x-sovereign-launch-key", "sovereign-secret-key-999");
      expect(r2.status).toBe(202);
      expect(mockWorkflow).toHaveBeenCalled();

      // Valid launch key in body -> 202
      mockWorkflow.mockClear();
      const r3 = await request(app)
        .post("/api/sovereign/deploy/launch")
        .set("Authorization", "Bearer secret")
        .send({ launchKey: "sovereign-secret-key-999" });
      expect(r3.status).toBe(202);
      expect(mockWorkflow).toHaveBeenCalled();
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

  describe("/api/vote admin routes", () => {
    it("admin/banners and admin/diagnostics are protected by adminAuthMiddleware", async () => {
      process.env.ADMIN_PANEL_TOKEN = "secret";
      const app = express();
      const mockTick = {
        getAdminVoteBanners: () => [],
        getVoteAdminDiagnostics: () => ({ status: "good" }),
      } as any;
      app.use("/api/vote", voteRouter(mockTick));

      // 1. Get banners without token -> 401
      const r1 = await request(app).get("/api/vote/admin/banners");
      expect(r1.status).toBe(401);

      // 2. Get banners with correct token -> 200
      const r2 = await request(app)
        .get("/api/vote/admin/banners")
        .set("X-Admin-Token", "secret");
      expect(r2.status).toBe(200);

      // 3. Get diagnostics without token -> 401
      const r3 = await request(app).get("/api/vote/admin/diagnostics");
      expect(r3.status).toBe(401);

      // 4. Get diagnostics with correct token -> 200
      const r4 = await request(app)
        .get("/api/vote/admin/diagnostics")
        .set("X-Admin-Token", "secret");
      expect(r4.status).toBe(200);
    });
  });

  describe("/api/leaderboard/refresh", () => {
    it("allows refresh without token if no ADMIN_PANEL_TOKEN is configured", async () => {
      delete process.env.ADMIN_PANEL_TOKEN;
      delete process.env.AUTH_FALLBACK_PANEL_TOKEN;
      const app = express();
      app.use("/api/leaderboard", leaderboardRouter());

      const r = await request(app).post("/api/leaderboard/refresh");
      expect(r.status).toBe(200);
      expect(r.body.ok).toBe(true);
    });

    it("denies refresh without token if ADMIN_PANEL_TOKEN is configured", async () => {
      process.env.ADMIN_PANEL_TOKEN = "secret-token-123";
      const app = express();
      app.use("/api/leaderboard", leaderboardRouter());

      const r = await request(app).post("/api/leaderboard/refresh");
      expect(r.status).toBe(403);
      expect(r.body.error).toBe("forbidden");
    });

    it("allows refresh with correct token in X-Admin-Token header", async () => {
      process.env.ADMIN_PANEL_TOKEN = "secret-token-123";
      const app = express();
      app.use("/api/leaderboard", leaderboardRouter());

      const r = await request(app)
        .post("/api/leaderboard/refresh")
        .set("X-Admin-Token", "secret-token-123");
      expect(r.status).toBe(200);
      expect(r.body.ok).toBe(true);
    });

    it("allows refresh with correct token in Authorization Bearer header", async () => {
      process.env.ADMIN_PANEL_TOKEN = "secret-token-123";
      const app = express();
      app.use("/api/leaderboard", leaderboardRouter());

      const r = await request(app)
        .post("/api/leaderboard/refresh")
        .set("Authorization", "Bearer secret-token-123");
      expect(r.status).toBe(200);
      expect(r.body.ok).toBe(true);
    });

    it("denies refresh with incorrect token", async () => {
      process.env.ADMIN_PANEL_TOKEN = "secret-token-123";
      const app = express();
      app.use("/api/leaderboard", leaderboardRouter());

      const r = await request(app)
        .post("/api/leaderboard/refresh")
        .set("X-Admin-Token", "wrong-token");
      expect(r.status).toBe(403);
      expect(r.body.error).toBe("forbidden");
    });
  });

  describe("/api/admin/command", () => {
    it("allows command execution without token if no ADMIN_PANEL_TOKEN is set", async () => {
      delete process.env.ADMIN_PANEL_TOKEN;
      delete process.env.GM_PANEL_TOKEN;
      const def = adminRoute();
      const app = express();
      app.use(express.json());
      app.post(def.path, adminRateLimiter, def.handler);

      const r = await request(app)
        .post("/api/admin/command")
        .send({ command: "ping" });
      expect(r.status).toBe(200);
      expect(r.body.data.command).toBe("ping");
    });

    it("rejects command with 403 when ADMIN_PANEL_TOKEN is set and invalid/missing token is sent", async () => {
      process.env.ADMIN_PANEL_TOKEN = "secret-admin-token";
      const def = adminRoute();
      const app = express();
      app.use(express.json());
      app.post(def.path, adminRateLimiter, def.handler);

      // Missing token
      const r1 = await request(app)
        .post("/api/admin/command")
        .send({ command: "ping" });
      expect(r1.status).toBe(403);
      expect(r1.body.error.code).toBe("admin_forbidden");

      // Wrong token
      const r2 = await request(app)
        .post("/api/admin/command")
        .set("Authorization", "Bearer wrong-token")
        .send({ command: "ping" });
      expect(r2.status).toBe(403);
      expect(r2.body.error.code).toBe("admin_forbidden");
    });

    it("accepts command with 200 when valid token is provided in Bearer or X-Admin-Token header", async () => {
      process.env.ADMIN_PANEL_TOKEN = "secret-admin-token";
      const def = adminRoute();
      const app = express();
      app.use(express.json());
      app.post(def.path, adminRateLimiter, def.handler);

      // Bearer auth
      const r1 = await request(app)
        .post("/api/admin/command")
        .set("Authorization", "Bearer secret-admin-token")
        .send({ command: "ping" });
      expect(r1.status).toBe(200);
      expect(r1.body.data.command).toBe("ping");

      // X-Admin-Token header
      const r2 = await request(app)
        .post("/api/admin/command")
        .set("X-Admin-Token", "secret-admin-token")
        .send({ command: "ping" });
      expect(r2.status).toBe(200);
      expect(r2.body.data.command).toBe("ping");
    });
  });

  describe("/api/chat/send security", () => {
    it("resolves authenticated player identity over client body author", async () => {
      const mockSendMessage = vi.fn().mockReturnValue({ accepted: true });
      const def = chatRoute({ sendMessage: mockSendMessage });
      const app = express();
      app.use(express.json());
      app.post(def.path, def.handler);

      const r = await request(app)
        .post("/api/chat/send")
        .set("X-Player-Id", "player_validated_123")
        .send({ channel: "global", text: "Hello world!", author: "spoofed_author" });

      expect(r.status).toBe(200);
      expect(mockSendMessage).toHaveBeenCalledWith({
        channel: "global",
        text: "Hello world!",
        author: "player_validated_123",
      });
    });

    it("falls back to body author or system if no player identity is present", async () => {
      const mockSendMessage = vi.fn().mockReturnValue({ accepted: true });
      const def = chatRoute({ sendMessage: mockSendMessage });
      const app = express();
      app.use(express.json());
      app.post(def.path, def.handler);

      const r = await request(app)
        .post("/api/chat/send")
        .send({ channel: "global", text: "Hello world!", author: "guest_user" });

      expect(r.status).toBe(200);
      expect(mockSendMessage).toHaveBeenCalledWith({
        channel: "global",
        text: "Hello world!",
        author: "guest_user",
      });
    });
  });

  describe("ARE Replay & SDK Billing routes timing-safe credential verification", () => {
    it("verifies admin key via constant-time comparison in /billing/credit and /governance/directives/:id/enact", async () => {
      process.env.SOVEREIGN_LAUNCH_KEY = "sovereign-launch-secret-777";
      const mockTick = {} as any;
      const app = express();
      app.use("/api/are-replay", areReplayRouter(mockTick));

      // 1. /billing/credit with wrong key
      const r1 = await request(app)
        .post("/api/are-replay/billing/credit")
        .set("X-Sovereign-Key", "wrong-key")
        .send({ credits: 100 });
      expect(r1.status).toBe(403);
      expect(r1.body.error).toBe("forbidden");

      // 2. /billing/credit with correct key
      const r2 = await request(app)
        .post("/api/are-replay/billing/credit")
        .set("X-Sovereign-Key", "sovereign-launch-secret-777")
        .send({ credits: 100 });
      expect(r2.status).toBe(200);
      expect(r2.body.ok).toBe(true);

      // 3. /governance/directives/:id/enact with wrong key
      const r3 = await request(app)
        .post("/api/are-replay/governance/directives/dir1/enact")
        .set("X-Sovereign-Key", "wrong-key");
      expect(r3.status).toBe(403);
      expect(r3.body.error).toBe("forbidden");

      delete process.env.SOVEREIGN_LAUNCH_KEY;
    });

    it("verifies admin key via constant-time comparison in /api/sdk-billing/credit", async () => {
      process.env.SOVEREIGN_LAUNCH_KEY = "sdk-billing-secret-888";
      const app = express();
      app.use(express.json());
      app.use("/api/sdk-billing", sdkBillingRouter());

      // 1. Wrong key
      const r1 = await request(app)
        .post("/api/sdk-billing/credit")
        .set("X-Sovereign-Key", "wrong-key")
        .send({ credits: 50 });
      expect(r1.status).toBe(403);
      expect(r1.body.error).toBe("forbidden");

      // 2. Correct key
      const r2 = await request(app)
        .post("/api/sdk-billing/credit")
        .set("X-Sovereign-Key", "sdk-billing-secret-888")
        .send({ credits: 50 });
      expect(r2.status).toBe(200);
      expect(r2.body.ok).toBe(true);

      delete process.env.SOVEREIGN_LAUNCH_KEY;
    });
  });
});
