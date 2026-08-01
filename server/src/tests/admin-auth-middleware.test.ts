import { describe, it, expect, beforeEach, afterEach } from "vitest";
import express from "express";
import request from "supertest";
import { adminAuthMiddleware } from "../middleware/adminAuthMiddleware.js";

describe("adminAuthMiddleware", () => {
  beforeEach(() => {
    delete process.env.ADMIN_PANEL_TOKEN;
    delete process.env.ADMIN_UID_ALLOWLIST;
  });
  afterEach(() => {
    delete process.env.ADMIN_PANEL_TOKEN;
    delete process.env.ADMIN_UID_ALLOWLIST;
  });

  it("accepts ADMIN_PANEL_TOKEN as Bearer", async () => {
    process.env.ADMIN_PANEL_TOKEN = "panel-secret-xyz";
    const app = express();
    app.get("/t", adminAuthMiddleware, (_req, res) => res.json({ ok: true }));
    const r = await request(app).get("/t").set("Authorization", "Bearer panel-secret-xyz");
    expect(r.status).toBe(200);
    expect(r.body.ok).toBe(true);
  });

  it("accepts ADMIN_PANEL_TOKEN as X-Admin-Token", async () => {
    process.env.ADMIN_PANEL_TOKEN = "panel-secret-xyz";
    const app = express();
    app.get("/t", adminAuthMiddleware, (_req, res) => res.json({ ok: true }));
    const r = await request(app).get("/t").set("X-Admin-Token", "panel-secret-xyz");
    expect(r.status).toBe(200);
  });

  it("allows JWT-shaped Bearer even when ADMIN_PANEL_TOKEN is set", async () => {
    process.env.ADMIN_PANEL_TOKEN = "panel-secret-xyz";
    process.env.SUPABASE_JWT_SECRET = "test-secret";
    const app = express();
    app.get("/t", adminAuthMiddleware, (_req, res) => res.json({ ok: true }));

    // This test now expects it to proceed to JWT verification
    // Since we don't have a valid JWT here, it should fail with "Invalid token" (or similar)
    // rather than the "ADMIN_PANEL_TOKEN is set" reminder.
    const jwtLike = `eyJhbG.${"x".repeat(90)}.sig`;
    const r = await request(app).get("/t").set("Authorization", `Bearer ${jwtLike}`);
    expect(r.status).toBe(401);
    expect(r.body.error).toBe("Invalid token");

    delete process.env.SUPABASE_JWT_SECRET;
  });

  it("timing-safely validates sovereign launch credentials", async () => {
    process.env.SOVEREIGN_LAUNCH_KEY = "sovereign-launch-token-123";
    const app = express();
    // Simulate mount point and path matching sovereign deploy
    app.use("/api/sovereign/deploy", adminAuthMiddleware, (_req, res) => res.json({ ok: true }));

    // Valid credential
    let r = await request(app)
      .post("/api/sovereign/deploy/launch")
      .set("x-sovereign-launch-key", "sovereign-launch-token-123");
    expect(r.status).toBe(200);

    // Invalid credential
    r = await request(app)
      .post("/api/sovereign/deploy/launch")
      .set("x-sovereign-launch-key", "wrong-token-abc");
    expect(r.status).toBe(401);

    delete process.env.SOVEREIGN_LAUNCH_KEY;
  });
});
