import { describe, it, expect, afterEach } from "vitest";
import express from "express";
import request from "supertest";
import { adminAuthMiddleware } from "../middleware/adminAuthMiddleware.js";
import { adminRateLimiter } from "../middleware/rateLimitMiddleware.js";
import { createLootRouter } from "../routes/lootRoutes.js";

function buildLootAdminApp(): express.Express {
  const app = express();
  app.use(
    "/api/admin/loot",
    express.json(),
    adminRateLimiter,
    adminAuthMiddleware,
    createLootRouter()
  );
  return app;
}

describe("Loot admin route security", () => {
  afterEach(() => {
    delete process.env.ADMIN_PANEL_TOKEN;
    delete process.env.GM_PANEL_TOKEN;
  });

  it("denies status access without an admin token", async () => {
    process.env.ADMIN_PANEL_TOKEN = "secret-token";

    const response = await request(buildLootAdminApp()).get("/api/admin/loot/status");

    expect(response.status).toBe(401);
    expect(response.body.error).toMatch(/Admin token|Bearer/i);
  });

  it("denies generation access without an admin token", async () => {
    process.env.ADMIN_PANEL_TOKEN = "secret-token";

    const response = await request(buildLootAdminApp())
      .post("/api/admin/loot/generate")
      .send({ playerId: "admin_test" });

    expect(response.status).toBe(401);
    expect(response.body.error).toMatch(/Admin token|Bearer/i);
  });

  it("denies generation access with an invalid admin token", async () => {
    process.env.ADMIN_PANEL_TOKEN = "secret-token";

    const response = await request(buildLootAdminApp())
      .post("/api/admin/loot/generate")
      .set("X-Admin-Token", "wrong-token")
      .send({ playerId: "admin_test" });

    expect(response.status).toBe(401);
    expect(response.body.error).toMatch(/Invalid token/i);
  });

  it("allows a valid admin token through to the real loot router", async () => {
    process.env.ADMIN_PANEL_TOKEN = "secret-token";

    const response = await request(buildLootAdminApp())
      .get("/api/admin/loot/status")
      .set("X-Admin-Token", "secret-token");

    expect(response.status).toBe(503);
    expect(response.body).toEqual({
      ok: false,
      error: "Loot system not initialized",
      system: "ARE_INFINITE_LOOT_MACHINE",
    });
  });

  it("does not expose stack traces from the real uninitialized loot path", async () => {
    process.env.ADMIN_PANEL_TOKEN = "secret-token";

    const response = await request(buildLootAdminApp())
      .post("/api/admin/loot/generate")
      .set("X-Admin-Token", "secret-token")
      .send({ playerId: "admin_test" });

    expect(response.status).toBe(503);
    expect(response.body).toEqual({
      ok: false,
      error: "Loot system not initialized",
    });
    expect(response.body.stack).toBeUndefined();
  });
});
