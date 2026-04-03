import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
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

import { adminAuthMiddleware } from "../middleware/adminAuthMiddleware.js";

describe("adminAuthMiddleware with Firebase Admin", () => {
  beforeEach(() => {
    delete process.env.ADMIN_PANEL_TOKEN;
    delete process.env.ADMIN_UID_ALLOWLIST;
    verifyFirebaseToken.mockReset();
    isFirebaseAuthConfigured.mockReturnValue(true);
  });

  afterEach(() => {
    delete process.env.ADMIN_PANEL_TOKEN;
    delete process.env.ADMIN_UID_ALLOWLIST;
  });

  it("accepts valid Firebase Bearer and attaches uid", async () => {
    verifyFirebaseToken.mockResolvedValue({ uid: "admin-uid-1", name: "Admin" });
    const app = express();
    app.get("/t", adminAuthMiddleware, (req, res) => {
      const r = req as import("../middleware/adminAuthMiddleware.js").AdminRequest;
      res.json({ mode: r.adminAuth?.mode, uid: r.adminAuth && "uid" in r.adminAuth ? r.adminAuth.uid : null });
    });
    const r = await request(app).get("/t").set("Authorization", "Bearer fake-jwt");
    expect(r.status).toBe(200);
    expect(r.body).toEqual({ mode: "firebase", uid: "admin-uid-1" });
    expect(verifyFirebaseToken).toHaveBeenCalledWith("fake-jwt");
  });

  it("returns 403 when uid is not in ADMIN_UID_ALLOWLIST", async () => {
    process.env.ADMIN_UID_ALLOWLIST = "other_uid, another";
    verifyFirebaseToken.mockResolvedValue({ uid: "not-listed" });
    const app = express();
    app.get("/t", adminAuthMiddleware, (_req, res) => res.json({ ok: true }));
    const r = await request(app).get("/t").set("Authorization", "Bearer jwt");
    expect(r.status).toBe(403);
    expect(r.body.error).toMatch(/ADMIN_UID_ALLOWLIST/);
  });

  it("returns 401 with errorDe when verify throws and panel token is set", async () => {
    process.env.ADMIN_PANEL_TOKEN = "panel-secret";
    verifyFirebaseToken.mockRejectedValue(new Error("bad token"));
    const app = express();
    app.get("/t", adminAuthMiddleware, (_req, res) => res.json({ ok: true }));
    const r = await request(app).get("/t").set("Authorization", "Bearer some-jwt");
    expect(r.status).toBe(401);
    expect(r.body.error).toBe("Invalid Firebase token");
    expect(String(r.body.errorDe)).toMatch(/ADMIN_PANEL_TOKEN/);
  });
});
