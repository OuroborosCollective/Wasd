import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";

const {
  isSupabaseAuthConfigured,
  verifySupabaseToken,
  isFirebaseAuthConfigured,
  verifyFirebaseToken,
} = vi.hoisted(() => ({
  isSupabaseAuthConfigured: vi.fn(() => true),
  verifySupabaseToken: vi.fn(),
  isFirebaseAuthConfigured: vi.fn(() => true),
  verifyFirebaseToken: vi.fn(),
}));

vi.mock("../config/supabase.js", () => ({
  isSupabaseAuthConfigured,
  verifySupabaseToken,
}));

vi.mock("../config/firebase.js", () => ({
  isFirebaseAuthConfigured,
  verifyFirebaseToken,
}));

import { authMiddleware } from "../middleware/authMiddleware.js";
import { adminAuthMiddleware } from "../middleware/adminAuthMiddleware.js";

describe("provider fallback middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isSupabaseAuthConfigured.mockReturnValue(true);
    isFirebaseAuthConfigured.mockReturnValue(true);
    delete process.env.ADMIN_PANEL_TOKEN;
    delete process.env.ADMIN_UID_ALLOWLIST;
    delete process.env.SUPABASE_JWT_SECRET;
    delete process.env.JWT_SECRET;
  });

  afterEach(() => {
    delete process.env.ADMIN_PANEL_TOKEN;
    delete process.env.ADMIN_UID_ALLOWLIST;
    delete process.env.SUPABASE_JWT_SECRET;
    delete process.env.JWT_SECRET;
  });

  it("authMiddleware falls back to Firebase when Supabase verification throws", async () => {
    verifySupabaseToken.mockImplementation(() => {
      throw new Error("invalid supabase token");
    });
    verifyFirebaseToken.mockResolvedValue({ uid: "firebase-user-1" });

    const app = express();
    app.get("/auth-check", authMiddleware, (req, res) => {
      res.json({ playerId: (req as any).playerId });
    });

    const response = await request(app)
      .get("/auth-check")
      .set("Authorization", "Bearer test-token");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ playerId: "firebase-user-1" });
    expect(verifySupabaseToken).toHaveBeenCalledWith("test-token");
    expect(verifyFirebaseToken).toHaveBeenCalledWith("test-token");
  });

  it("adminAuthMiddleware falls back to Firebase when Supabase verification throws", async () => {
    verifySupabaseToken.mockImplementation(() => {
      throw new Error("invalid supabase token");
    });
    verifyFirebaseToken.mockResolvedValue({ uid: "admin-firebase-uid" });

    const app = express();
    app.get("/admin-check", adminAuthMiddleware, (req, res) => {
      const adminReq = req as import("../middleware/adminAuthMiddleware.js").AdminRequest;
      let uid: string | null = null;
      if (adminReq.adminAuth && "uid" in adminReq.adminAuth) {
        uid = adminReq.adminAuth.uid;
      }
      res.json({ mode: adminReq.adminAuth?.mode, uid });
    });

    const response = await request(app)
      .get("/admin-check")
      .set("Authorization", "Bearer test-token");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ mode: "firebase", uid: "admin-firebase-uid" });
    expect(verifySupabaseToken).toHaveBeenCalledWith("test-token");
    expect(verifyFirebaseToken).toHaveBeenCalledWith("test-token");
  });
});
