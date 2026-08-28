import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import express from "express";
import request from "supertest";
import { createLandRouter } from "../api/landRoute.js";
import { LandSystem } from "../modules/land/LandSystem.js";

describe("landRoute player identity security", () => {
  let app: express.Express;
  let landSystem: LandSystem;
  let mockDb: any;
  let mockUser: any = null;
  const originalEnv = process.env.NODE_ENV;
  const originalAllowDev = process.env.ALLOW_DEV_PLAYER_ID;
  const originalAllowGuest = process.env.ALLOW_GUEST_LOGIN;
  const originalAllowDevLogin = process.env.ALLOW_DEV_LOGIN;

  beforeEach(() => {
    mockUser = null;
    landSystem = new LandSystem();
    mockDb = {
      query: vi.fn().mockImplementation((_query: string, _values?: any[]) => {
        return Promise.resolve({
          rows: [{ name: "TestPlayer", matrix_energy: 100 }],
        });
      }),
    };
    app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
      if (mockUser) {
        (req as any).user = mockUser;
      }
      next();
    });
    app.use("/api/land", createLandRouter(landSystem, mockDb));
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    if (originalAllowDev !== undefined) process.env.ALLOW_DEV_PLAYER_ID = originalAllowDev; else delete process.env.ALLOW_DEV_PLAYER_ID;
    if (originalAllowGuest !== undefined) process.env.ALLOW_GUEST_LOGIN = originalAllowGuest; else delete process.env.ALLOW_GUEST_LOGIN;
    if (originalAllowDevLogin !== undefined) process.env.ALLOW_DEV_LOGIN = originalAllowDevLogin; else delete process.env.ALLOW_DEV_LOGIN;
    vi.restoreAllMocks();
  });

  it("returns land details for valid resolved player identity header", async () => {
    const res = await request(app)
      .get("/api/land/mine")
      .set("x-player-id", "player123");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ land: null });
  });

  it("rejects request with 401 when no player identity is provided", async () => {
    const res = await request(app).get("/api/land/mine");

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: "Player ID required" });
  });

  it("rejects unauthenticated header request in production mode when dev fallback is disabled", async () => {
    process.env.NODE_ENV = "production";
    delete process.env.ALLOW_DEV_PLAYER_ID;
    delete process.env.ALLOW_GUEST_LOGIN;
    delete process.env.ALLOW_DEV_LOGIN;

    const res = await request(app)
      .get("/api/land/mine")
      .set("x-player-id", "unauthenticated_user");

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: "Player ID required" });
  });

  it("allows authenticated request in production mode", async () => {
    process.env.NODE_ENV = "production";
    delete process.env.ALLOW_DEV_PLAYER_ID;
    delete process.env.ALLOW_GUEST_LOGIN;
    delete process.env.ALLOW_DEV_LOGIN;
    mockUser = { id: "authenticated_user" };

    const res = await request(app).get("/api/land/mine");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ land: null });
  });

  it("allows claim request with valid player identity in non-production", async () => {
    vi.spyOn(landSystem, "getLandClaimCost").mockReturnValue(10);
    vi.spyOn(landSystem, "claimLand").mockResolvedValue({
      success: true,
      land: { id: "land_1", ownerId: "player123", ownerName: "TestPlayer", name: "New Settlement", x: 100, y: 200, radius: 20, structures: [] },
    });

    const res = await request(app)
      .post("/api/land/claim")
      .set("x-player-id", "player123")
      .send({ x: 100, y: 200, name: "New Settlement" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
