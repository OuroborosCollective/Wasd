import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import express from "express";
import request from "supertest";
import { createLootRouter } from "../routes/lootRoutes.js";
import { adminAuthMiddleware } from "../middleware/adminAuthMiddleware.js";
import { adminRateLimiter } from "../middleware/rateLimitMiddleware.js";

// Mock loot director
vi.mock("../bootLootSystem.js", () => ({
  getLootDirector: () => ({
    getStatus: () => ({ status: "mocked" })
  })
}));

describe("Loot Auth Protection Verification", () => {
  beforeEach(() => {
    process.env.ADMIN_PANEL_TOKEN = "secret-token";
  });

  afterEach(() => {
    delete process.env.ADMIN_PANEL_TOKEN;
  });

  it("GET /api/admin/loot/status requires authentication", async () => {
    const app = express();
    app.use("/api/admin/loot", adminRateLimiter, adminAuthMiddleware, createLootRouter());

    const r = await request(app).get("/api/admin/loot/status");
    expect(r.status).toBe(401);

    const r2 = await request(app)
      .get("/api/admin/loot/status")
      .set("X-Admin-Token", "secret-token");
    expect(r2.status).toBe(200);
    expect(r2.body.ok).toBe(true);
  });

  it("POST /api/admin/loot/generate requires authentication", async () => {
    const app = express();
    app.use("/api/admin/loot", adminRateLimiter, adminAuthMiddleware, createLootRouter());

    const r = await request(app)
      .post("/api/admin/loot/generate")
      .send({ playerId: "test" });
    expect(r.status).toBe(401);

    const r2 = await request(app)
      .post("/api/admin/loot/generate")
      .set("X-Admin-Token", "secret-token")
      .send({ playerId: "test" });

    // Auth should pass, it might fail elsewhere (503 if loot system not fully mocked, or 500)
    // but definitely NOT 401
    expect(r2.status).not.toBe(401);
  });
});
