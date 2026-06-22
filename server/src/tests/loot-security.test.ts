import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";
import { createLootRouter } from "../routes/lootRoutes.js";
import { adminAuthMiddleware } from "../middleware/adminAuthMiddleware.js";

// Mock Supabase configuration to allow authMiddleware to run
vi.mock("../config/supabase.js", () => ({
  isSupabaseAuthConfigured: () => true,
  verifySupabaseToken: (token: string) => {
    if (token === "valid-token") return { sub: "test-user" };
    throw new Error("Invalid token");
  }
}));

// Mock bootLootSystem to return a fake loot director
vi.mock("../bootLootSystem.js", () => ({
  getLootDirector: () => ({
    getStatus: () => ({ started: true })
  })
}));

// Mock ProceduralLootMachine to throw an error for testing stack trace leak
vi.mock("../loot/ProceduralLootMachine.js", () => ({
  ProceduralLootMachine: class {
    generate() {
      throw new Error("Simulated loot error");
    }
  }
}));

describe("Loot System Security Fix Verification", () => {
  it("FIXED: /api/admin/loot/status is protected by adminAuthMiddleware", async () => {
    process.env.ADMIN_PANEL_TOKEN = "secret";
    const app = express();
    // Mount it like in ServerBootstrap
    app.use("/api/admin/loot", adminAuthMiddleware, createLootRouter());

    const r = await request(app).get("/api/admin/loot/status");
    expect(r.status).toBe(401);

    const r2 = await request(app)
      .get("/api/admin/loot/status")
      .set("X-Admin-Token", "secret");
    expect(r2.status).toBe(200);
    expect(r2.body.ok).toBe(true);
  });

  it("FIXED: /api/admin/loot/generate does NOT leak stack trace on error", async () => {
    process.env.ADMIN_PANEL_TOKEN = "secret";
    const app = express();
    app.use("/api/admin/loot", adminAuthMiddleware, createLootRouter());

    const r = await request(app)
      .post("/api/admin/loot/generate")
      .set("X-Admin-Token", "secret")
      .send({ playerId: "test" });

    expect(r.status).toBe(500);
    expect(r.body.ok).toBe(false);
    expect(r.body.error).toBe("Simulated loot error");
    expect(r.body.stack).toBeUndefined(); // Stack trace should be removed
  });
});
