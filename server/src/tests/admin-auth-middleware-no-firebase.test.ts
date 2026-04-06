import { describe, it, expect, vi, afterEach } from "vitest";
import express from "express";
import request from "supertest";

vi.mock("../config/firebase.js", () => ({
  isFirebaseAuthConfigured: vi.fn(() => false),
  verifyFirebaseToken: vi.fn(),
}));

import { adminAuthMiddleware } from "../middleware/adminAuthMiddleware.js";

describe("adminAuthMiddleware without Firebase Admin", () => {
  afterEach(() => {
    delete process.env.ADMIN_PANEL_TOKEN;
  });

  it("returns 503 when Bearer is used but Firebase Admin is not configured and no panel token", async () => {
    const app = express();
    app.get("/t", adminAuthMiddleware, (_req, res) => res.json({ ok: true }));
    const r = await request(app).get("/t").set("Authorization", "Bearer any-token");
    expect(r.status).toBe(503);
    expect(r.body.error).toBe("Firebase Admin not configured");
    expect(String(r.body.errorDe)).toMatch(/FIREBASE_SERVICE_ACCOUNT_KEY|GOOGLE_APPLICATION_CREDENTIALS/);
  });
});
