import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";

const { verifyFirebaseToken, isFirebaseAuthConfigured } = vi.hoisted(() => ({
  verifyFirebaseToken: vi.fn(),
  isFirebaseAuthConfigured: vi.fn(() => true),
}));

vi.mock("../config/firebase.js", () => ({
  isFirebaseAuthConfigured,
  verifyFirebaseToken,
}));

import { authMiddleware } from "../middleware/authMiddleware.js";

describe("authMiddleware provider fallback", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.SUPABASE_JWT_SECRET;
    process.env.JWT_SECRET = "legacy-app-secret";
    verifyFirebaseToken.mockReset();
    isFirebaseAuthConfigured.mockReturnValue(true);
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("accepts Firebase bearer even when JWT_SECRET enables Supabase verification", async () => {
    verifyFirebaseToken.mockResolvedValue({ uid: "firebase-user-1" });
    const app = express();
    app.get("/secure", authMiddleware, (req, res) => {
      res.json({ playerId: (req as any).playerId ?? null });
    });

    const response = await request(app)
      .get("/secure")
      .set("Authorization", "Bearer firebase-id-token");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ playerId: "firebase-user-1" });
    expect(verifyFirebaseToken).toHaveBeenCalledWith("firebase-id-token");
  });
});
