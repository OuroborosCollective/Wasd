import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import express from "express";
import request from "supertest";
import { createAssetBrainRouter } from "../api/assetBrainRoute.js";

// Mock Supabase config so auth middleware works
vi.mock("../config/supabase.js", () => ({
  isSupabaseAuthConfigured: () => true,
  verifySupabaseToken: (token: string) => {
    if (token === "owner-token") return { sub: "owner-uid" };
    if (token === "other-token") return { sub: "other-uid" };
    throw new Error("Invalid token");
  }
}));

const mockDb = {
  query: vi.fn(),
};

describe("Asset Brain Security Protection", () => {
  let app: express.Express;

  beforeEach(() => {
    vi.clearAllMocks();
    app = express();
    app.use("/api/asset-brain", createAssetBrainRouter(mockDb));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("GET /api/asset-brain/specs/:id", () => {
    it("allows access to public specifications even without authentication", async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [
          {
            id: "spec-1",
            user_id: "owner-uid",
            asset_name: "Iron Sword",
            asset_class: "weapon",
            style: "fantasy",
            usage: "test",
            description: "A cool sword",
            tags: "[]",
            specification: "{}",
            is_public: true,
            version: 1,
            created_at: new Date(),
            updated_at: new Date(),
          },
        ],
      });

      const r = await request(app).get("/api/asset-brain/specs/spec-1");
      expect(r.status).toBe(200);
      expect(r.body.specification.isPublic).toBe(true);
      expect(r.body.specification.assetName).toBe("Iron Sword");
    });

    it("denies unauthenticated access to private specifications", async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [
          {
            id: "spec-2",
            user_id: "owner-uid",
            asset_name: "Private Sword",
            asset_class: "weapon",
            style: "fantasy",
            usage: "test",
            description: "A super secret sword",
            tags: "[]",
            specification: "{}",
            is_public: false,
            version: 1,
            created_at: new Date(),
            updated_at: new Date(),
          },
        ],
      });

      const r = await request(app).get("/api/asset-brain/specs/spec-2");
      expect(r.status).toBe(403);
      expect(r.body.error).toBe("Access denied");
    });

    it("allows authenticated owner access to private specifications", async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [
          {
            id: "spec-2",
            user_id: "owner-uid",
            asset_name: "Private Sword",
            asset_class: "weapon",
            style: "fantasy",
            usage: "test",
            description: "A super secret sword",
            tags: "[]",
            specification: "{}",
            is_public: false,
            version: 1,
            created_at: new Date(),
            updated_at: new Date(),
          },
        ],
      });

      const r = await request(app)
        .get("/api/asset-brain/specs/spec-2")
        .set("Authorization", "Bearer owner-token");
      expect(r.status).toBe(200);
      expect(r.body.specification.assetName).toBe("Private Sword");
    });

    it("denies authenticated non-owner access to private specifications", async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [
          {
            id: "spec-2",
            user_id: "owner-uid",
            asset_name: "Private Sword",
            asset_class: "weapon",
            style: "fantasy",
            usage: "test",
            description: "A super secret sword",
            tags: "[]",
            specification: "{}",
            is_public: false,
            version: 1,
            created_at: new Date(),
            updated_at: new Date(),
          },
        ],
      });

      const r = await request(app)
        .get("/api/asset-brain/specs/spec-2")
        .set("Authorization", "Bearer other-token");
      expect(r.status).toBe(403);
      expect(r.body.error).toBe("Access denied");
    });

    it("sanitizes and secures raw internal error messages", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      mockDb.query.mockRejectedValueOnce(new Error("FATAL: database is on fire"));

      const r = await request(app).get("/api/asset-brain/specs/spec-err");
      expect(r.status).toBe(500);
      expect(r.body.error).toBe("Failed to retrieve specification");
      expect(r.body.error).not.toContain("database is on fire");
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });
});
