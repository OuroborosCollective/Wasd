import { describe, it, expect, beforeEach, afterEach } from "vitest";
import express from "express";
import request from "supertest";
import { questlineRouter } from "../api/questlineRoute.js";

describe("questlineRouter identity resolution", () => {
  const origEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = origEnv;
  });

  it("returns 401 when no player identity is present", async () => {
    const app = express();
    app.use("/api/questline", questlineRouter());

    const resMe = await request(app).get("/api/questline/player/me");
    expect(resMe.status).toBe(401);
    expect(resMe.body.error).toBe("player_id_required");

    const resStart = await request(app).post("/api/questline/main_quest/start");
    expect(resStart.status).toBe(401);
    expect(resStart.body.error).toBe("player_id_required");
  });

  it("resolves player identity from x-player-id header", async () => {
    const app = express();
    app.use("/api/questline", questlineRouter());

    const resMe = await request(app)
      .get("/api/questline/player/me")
      .set("x-player-id", "test_player_123");

    expect(resMe.status).toBe(200);
    expect(resMe.body.playerId).toBe("test_player_123");
  });

  it("resolves player identity from authenticated req.user object", async () => {
    const app = express();
    app.use((req, _res, next) => {
      (req as any).user = { id: "authenticated_user_999" };
      next();
    });
    app.use("/api/questline", questlineRouter());

    const resMe = await request(app).get("/api/questline/player/me");

    expect(resMe.status).toBe(200);
    expect(resMe.body.playerId).toBe("authenticated_user_999");
  });
});
