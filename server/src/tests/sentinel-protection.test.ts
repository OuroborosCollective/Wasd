import { describe, it, expect, vi } from "vitest";
import express from "express";
import request from "supertest";
import { scienceMascotRouter } from "../api/scienceMascotRoute.js";
import { createManifestResyncRouter } from "../api/manifestResyncRoute.js";
import { areReplayRouter } from "../api/areReplayRoute.js";

// Mock Supabase configuration to allow authMiddleware to run
vi.mock("../config/supabase.js", () => ({
  isSupabaseAuthConfigured: () => true,
  verifySupabaseToken: (token: string) => {
    if (token === "valid-token") return { sub: "test-user" };
    throw new Error("Invalid token");
  }
}));

describe("Sentinel Security Protection (AFTER FIXES)", () => {
  describe("/api/v1/science-mascot", () => {
    it("is protected by authMiddleware", async () => {
      const app = express();
      app.use("/api/v1", scienceMascotRouter());

      const r = await request(app)
        .post("/api/v1/science-mascot")
        .send({ userMessage: "Hello" });

      expect(r.status).toBe(401);

      const r2 = await request(app)
        .post("/api/v1/science-mascot")
        .set("Authorization", "Bearer valid-token")
        .send({ userMessage: "Hello" });

      // Should not be 401 anymore. It might be 503 if GEMINI_API_KEY is missing, but that means auth passed.
      expect(r2.status).not.toBe(401);
    });
  });

  describe("/api/manifest/resync", () => {
    it("is protected by authMiddleware", async () => {
      const app = express();
      app.use(express.json());
      const mockTick = {
        getManifestManager: () => ({})
      } as any;
      app.use("/api/manifest", createManifestResyncRouter(mockTick));

      const r = await request(app)
        .post("/api/manifest/resync")
        .send({ playerId: "test", clientTick: 0 });

      expect(r.status).toBe(401);
    });
  });

  describe("/api/are/replay/snapshot/:tick", () => {
    it("is protected by authMiddleware", async () => {
      const app = express();
      const mockTick = {} as any;
      app.use("/api/are/replay", areReplayRouter(mockTick));

      const r = await request(app).get("/api/are/replay/snapshot/0");
      expect(r.status).toBe(401);
    });
  });
});
