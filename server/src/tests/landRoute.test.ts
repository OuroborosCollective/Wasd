import { describe, it, expect, beforeEach, afterEach } from "vitest";
import express from "express";
import request from "supertest";
import { createLandRouter } from "../api/landRoute.js";

describe("Land API Security and Functionality", () => {
  let app: express.Express;
  let mockLandSystem: any;
  let mockDb: any;
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    mockLandSystem = {
      getAllLands: () => [],
      getLandByOwner: (ownerId: string) => ownerId === "player_123" ? { id: "land_1", ownerId: "player_123", name: "Valoria", x: 10, y: 20, radius: 50, structures: [] } : null,
      getLandClaimCost: () => 100,
      claimLand: async (ownerId: string, ownerName: string, x: number, y: number, name?: string) => ({ success: true, land: { id: "land_2", ownerId, ownerName, x, y, radius: 50, structures: [] } }),
      abandonLand: async (ownerId: string) => ownerId === "player_123",
      addStructure: async (landId: string, ownerId: string, type: string, x: number, y: number, z: number, rotY: number, scale: number, glbPath?: string, name?: string) => ({
        success: true,
        structure: { id: "struct_1", landId, type, x, y, z, rotY, scale, glbPath, name }
      }),
      removeStructure: async (landId: string, ownerId: string, structId: string) => ownerId === "player_123",
    };

    mockDb = {
      query: async (sql: string, params: any[]) => {
        if (sql.includes("FROM players")) {
          return { rows: [{ name: "Hero", matrix_energy: 500, glb_enabled: true, glb_subscription_expires: new Date(Date.now() + 86400000).toISOString() }] };
        }
        return { rows: [] };
      }
    };

    app = express();
    app.use(express.json());
    app.use("/api/land", createLandRouter(mockLandSystem, mockDb));
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  it("GET /api/land/all returns land plots publicly", async () => {
    const res = await request(app).get("/api/land/all");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ lands: [] });
  });

  it("GET /api/land/mine resolves player identity via x-player-id in development", async () => {
    process.env.NODE_ENV = "development";
    const res = await request(app).get("/api/land/mine").set("x-player-id", "player_123");
    expect(res.status).toBe(200);
    expect(res.body.land).toBeDefined();
    expect(res.body.land.ownerId).toBe("player_123");
  });

  it("GET /api/land/mine rejects unauthenticated requests in production", async () => {
    process.env.NODE_ENV = "production";
    delete process.env.ALLOW_DEV_PLAYER_ID;
    delete process.env.ALLOW_GUEST_LOGIN;
    delete process.env.ALLOW_DEV_LOGIN;

    const res = await request(app).get("/api/land/mine").set("x-player-id", "player_123");
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("authenticated_player_required");
  });

  it("POST /api/land/claim allows claiming land with valid identity", async () => {
    process.env.NODE_ENV = "development";
    const res = await request(app)
      .post("/api/land/claim")
      .set("x-player-id", "player_123")
      .send({ x: 100, y: 200, name: "New Settlement" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.land.ownerId).toBe("player_123");
  });

  it("POST /api/land/abandon abandons land owned by resolved player", async () => {
    process.env.NODE_ENV = "development";
    const res = await request(app)
      .post("/api/land/abandon")
      .set("x-player-id", "player_123");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
