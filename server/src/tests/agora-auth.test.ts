import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import express from "express";
import request from "supertest";
import { agoraRouter } from "../api/agoraRoute.js";

describe("Agora Monitor API Security", () => {
  beforeEach(() => {
    delete process.env.ADMIN_PANEL_TOKEN;
  });

  afterEach(() => {
    delete process.env.ADMIN_PANEL_TOKEN;
    vi.restoreAllMocks();
  });

  it("GET /agora/api/live is protected by adminAuthMiddleware", async () => {
    process.env.ADMIN_PANEL_TOKEN = "secret";
    const app = express();
    app.use("/agora", agoraRouter({}));

    const r = await request(app).get("/agora/api/live");
    // This is expected to FAIL (return 200) before the fix
    expect(r.status).toBe(401);
  });

  it("GET /agora/api/live allows access with valid token", async () => {
    process.env.ADMIN_PANEL_TOKEN = "secret";
    const app = express();
    app.use("/agora", agoraRouter({}));

    const r = await request(app)
      .get("/agora/api/live")
      .set("X-Admin-Token", "secret");

    // Status might be 200 (OK) or 503 (Initializing) but not 401
    expect(r.status).not.toBe(401);
    expect(r.status).not.toBe(403);
  });

  it("GET /agora/ (root) remains public", async () => {
    const app = express();
    app.use("/agora", agoraRouter({}));

    const r = await request(app).get("/agora/");
    expect(r.status).toBe(200);
    expect(r.body.monitor).toBeDefined();
  });
});
