import { createHmac } from "node:crypto";
import express from "express";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

function base64Url(input: string): string {
  return Buffer.from(input, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function makeJwt(payload: Record<string, unknown>, secret: string): string {
  const header = base64Url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = base64Url(JSON.stringify(payload));
  const signature = createHmac("sha256", secret)
    .update(`${header}.${body}`)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
  return `${header}.${body}.${signature}`;
}

describe("Supabase auth integration", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    delete process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
    delete process.env.FIREBASE_ADMIN_USE_APPLICATION_DEFAULT;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("verifies Supabase JWT signed with SUPABASE_JWT_SECRET", async () => {
    process.env.SUPABASE_JWT_SECRET = "test-supabase-secret";
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const token = makeJwt(
      {
        sub: "user_supabase_1",
        email: "user@example.com",
        role: "authenticated",
        exp,
      },
      process.env.SUPABASE_JWT_SECRET
    );
    const { verifySupabaseToken } = await import("../config/supabase.js");
    const claims = verifySupabaseToken(token);
    expect(claims.sub).toBe("user_supabase_1");
    expect(claims.email).toBe("user@example.com");
  });

  it("resolveLoginIdentity accepts Supabase token when USE_SUPABASE_WS_LOGIN=1", async () => {
    process.env.SUPABASE_JWT_SECRET = "test-supabase-secret";
    process.env.USE_SUPABASE_WS_LOGIN = "1";
    process.env.NODE_ENV = "production";
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const token = makeJwt(
      {
        sub: "user_supabase_2",
        email: "mage@example.com",
        role: "authenticated",
        exp,
      },
      process.env.SUPABASE_JWT_SECRET
    );
    const { resolveLoginIdentity } = await import("../modules/auth/resolveLoginIdentity.js");
    const result = await resolveLoginIdentity("sock-1", { token });
    expect("error" in result).toBe(false);
    if (!("error" in result)) {
      expect(result.uid).toBe("user_supabase_2");
      expect(result.charName).toBe("mage@example.com");
    }
  });

  it("adminAuthMiddleware accepts Supabase Bearer token", async () => {
    process.env.SUPABASE_JWT_SECRET = "test-supabase-secret";
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const token = makeJwt(
      {
        sub: "admin_uid_1",
        email: "admin@example.com",
        role: "authenticated",
        exp,
      },
      process.env.SUPABASE_JWT_SECRET
    );

    const { adminAuthMiddleware } = await import("../middleware/adminAuthMiddleware.js");
    const app = express();
    app.get("/admin-auth-test", adminAuthMiddleware, (req, res) => {
      const adminReq = req as import("../middleware/adminAuthMiddleware.js").AdminRequest;
      res.json({
        mode: adminReq.adminAuth?.mode,
        uid: adminReq.adminAuth && "uid" in adminReq.adminAuth ? adminReq.adminAuth.uid : null,
      });
    });

    const response = await request(app)
      .get("/admin-auth-test")
      .set("Authorization", `Bearer ${token}`);
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ mode: "supabase", uid: "admin_uid_1" });
  });
});
