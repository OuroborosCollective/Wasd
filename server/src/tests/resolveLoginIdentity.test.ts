import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("resolveLoginIdentity", () => {
  const originalEnv = { ...process.env };
  const setNodeEnv = (value: "development" | "production" | "test") => {
    process.env = { ...process.env, NODE_ENV: value };
  };

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("production without token or guest returns error", async () => {
    setNodeEnv("production");
    process.env.ALLOW_GUEST_LOGIN = "0";
    const { resolveLoginIdentity } =
      await import("../modules/auth/resolveLoginIdentity.js");
    const r = await resolveLoginIdentity("sock1", {});
    expect(r).toEqual({ error: "Sign-in required", code: "login_required" });
  });

  it("guest mode returns stable guest id when client sends valid guestId", async () => {
    setNodeEnv("production");
    process.env.ALLOW_GUEST_LOGIN = "1";
    const { resolveLoginIdentity } =
      await import("../modules/auth/resolveLoginIdentity.js");
    const r = await resolveLoginIdentity("sock1", {
      guestId: "guest_abcdefghij",
      guestName: "Tester",
    });
    expect("error" in r).toBe(false);
    if (!("error" in r)) {
      expect(r.uid).toBe("guest_abcdefghij");
      expect(r.charName).toBe("Tester");
    }
  });

  it("development allows dev login when ALLOW_DEV_LOGIN unset", async () => {
    setNodeEnv("development");
    process.env.ALLOW_GUEST_LOGIN = "0";
    const { resolveLoginIdentity } =
      await import("../modules/auth/resolveLoginIdentity.js");
    const r = await resolveLoginIdentity("abc-uuid-long", {});
    expect("error" in r).toBe(false);
    if (!("error" in r)) {
      expect(r.uid).toBe("dev_abc-uuid-long");
    }
  });

  it("development blocks dev login when ALLOW_DEV_LOGIN=0", async () => {
    setNodeEnv("development");
    process.env.ALLOW_DEV_LOGIN = "0";
    process.env.ALLOW_GUEST_LOGIN = "0";
    const { resolveLoginIdentity } =
      await import("../modules/auth/resolveLoginIdentity.js");
    const r = await resolveLoginIdentity("sock1", {});
    expect(r).toEqual({
      error: "Dev login disabled (set ALLOW_DEV_LOGIN=1 or use a token)",
      code: "login_required",
    });
  });

  it("ignores JWT when USE_SUPABASE_WS_LOGIN is unset (dev login)", async () => {
    setNodeEnv("development");
    process.env.ALLOW_GUEST_LOGIN = "0";
    const { resolveLoginIdentity } =
      await import("../modules/auth/resolveLoginIdentity.js");
    const r = await resolveLoginIdentity("sock-z", { token: "not-a-real-jwt" });
    expect("error" in r).toBe(false);
    if (!("error" in r)) {
      expect(r.uid).toBe("dev_sock-z");
    }
  });

  it("returns invalid_token when Supabase verify fails in production", async () => {
    setNodeEnv("production");
    process.env.USE_SUPABASE_WS_LOGIN = "1";
    process.env.ALLOW_GUEST_LOGIN = "0";
    vi.doMock("../config/supabase.js", () => ({
      isSupabaseAuthConfigured: vi.fn(() => true),
      verifySupabaseToken: vi.fn(() => {
        throw new Error("bad supabase token");
      }),
    }));
    const { resolveLoginIdentity } =
      await import("../modules/auth/resolveLoginIdentity.js");
    const r = await resolveLoginIdentity("sock-bad-supabase", { token: "bad" });
    expect(r).toEqual({
      error: "Invalid or expired token",
      code: "invalid_token",
    });
  });

  it("returns invalid_token not login_required when Supabase required and bad token given", async () => {
    setNodeEnv("production");
    process.env.USE_SUPABASE_WS_LOGIN = "1";
    process.env.REQUIRE_SUPABASE_AUTH = "1";
    process.env.ALLOW_GUEST_LOGIN = "0";
    vi.doMock("../config/supabase.js", () => ({
      isSupabaseAuthConfigured: vi.fn(() => true),
      verifySupabaseToken: vi.fn(() => {
        throw new Error("expired");
      }),
    }));
    const { resolveLoginIdentity } =
      await import("../modules/auth/resolveLoginIdentity.js");
    const result = await resolveLoginIdentity("sock-bad-token", {
      token: "expired-token",
    });
    expect(result).toEqual({
      error: "Invalid or expired token",
      code: "invalid_token",
    });
  });

  it("guest login overrides requireSupabaseAuth when ALLOW_GUEST_LOGIN=1", async () => {
    setNodeEnv("production");
    process.env.REQUIRE_SUPABASE_AUTH = "1";
    process.env.ALLOW_GUEST_LOGIN = "1";
    const { resolveLoginIdentity } =
      await import("../modules/auth/resolveLoginIdentity.js");
    const result = await resolveLoginIdentity("sock-guest", {});
    expect("error" in result).toBe(false);
    if (!("error" in result)) {
      expect(result.uid).toMatch(/^guest_/);
      expect(result.charName).toBe("Guest");
    }
  });
});
