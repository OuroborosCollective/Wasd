import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import express from "express";
import request from "supertest";
import { agoraRouter } from "../api/agoraRoute.js";

describe("Agora API Protection", () => {
  beforeEach(() => {
    process.env.ADMIN_PANEL_TOKEN = "test-token";
  });

  afterEach(() => {
    delete process.env.ADMIN_PANEL_TOKEN;
    vi.restoreAllMocks();
  });

  it("should block unauthenticated access to /agora/api/live", async () => {
    const app = express();
    app.use("/agora", agoraRouter());

    const response = await request(app).get("/agora/api/live");
    expect(response.status).toBe(401);
  });

  it("should allow authenticated access with ADMIN_PANEL_TOKEN", async () => {
    const app = express();
    app.use("/agora", agoraRouter());

    const response = await request(app)
      .get("/agora/api/live")
      .set("X-Admin-Token", "test-token");

    // It might return 200 or 503 if initializing, but it shouldn't be 401
    expect(response.status).not.toBe(401);
    expect(response.status).not.toBe(403);
  });

  it("should block access with invalid token", async () => {
    const app = express();
    app.use("/agora", agoraRouter());

    const response = await request(app)
      .get("/agora/api/live")
      .set("X-Admin-Token", "wrong-token");

    expect(response.status).toBe(401);
  });
});
