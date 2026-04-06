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

  it("rejects JWT-shaped Bearer when ADMIN_PANEL_TOKEN is set (use panel token, not Google login)", async () => {
    process.env.ADMIN_PANEL_TOKEN = "panel-secret-xyz";
    const app = express();
    app.get("/t", adminAuthMiddleware, (_req, res) => res.json({ ok: true }));
    const jwtLike = `eyJhbG.${"x".repeat(90)}.sig`;
    const r = await request(app).get("/t").set("Authorization", `Bearer ${jwtLike}`);
    expect(r.status).toBe(401);
    expect(r.body.errorDe).toMatch(/ADMIN_PANEL_TOKEN/);
  });
});
