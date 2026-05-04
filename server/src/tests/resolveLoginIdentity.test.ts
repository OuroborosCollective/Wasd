// @ts-nocheck
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("resolveLoginIdentity", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("returns error without token (enforced auth)", async () => {
    const { resolveLoginIdentity } =
      await import("../modules/auth/resolveLoginIdentity.js");
    const r = await resolveLoginIdentity("sock1", {});
    expect(r).toEqual({ error: "Supabase sign-in required", code: "login_required" });
  });

  it("returns valid identity with valid token", async () => {
    vi.doMock("../config/supabase.js", () => ({
      isSupabaseAuthConfigured: vi.fn(() => true),
      verifySupabaseToken: vi.fn(() => ({
        sub: "user-123",
        email: "test@example.com"
      })),
    }));
    
    const { resolveLoginIdentity } =
      await import("../modules/auth/resolveLoginIdentity.js");
    const r = await resolveLoginIdentity("sock1", { token: "valid-jwt", charName: "Eldrin" });
    
    expect("error" in r).toBe(false);
    if (!("error" in r)) {
      expect(r.uid).toBe("user-123");
      expect(r.charName).toBe("Eldrin");
    }
  });

  it("returns invalid_token when Supabase verify fails", async () => {
    vi.doMock("../config/supabase.js", () => ({
      isSupabaseAuthConfigured: vi.fn(() => true),
      verifySupabaseToken: vi.fn(() => {
        throw new Error("bad token");
      }),
    }));
    const { resolveLoginIdentity } =
      await import("../modules/auth/resolveLoginIdentity.js");
    const r = await resolveLoginIdentity("sock-bad", { token: "bad" });
    expect(r).toEqual({
      error: "Invalid or expired token",
      code: "invalid_token",
    });
  });
});
