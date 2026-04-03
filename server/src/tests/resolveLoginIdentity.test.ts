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

  it("production without token or guest returns error", async () => {
    process.env.NODE_ENV = "production";
    delete process.env.ALLOW_GUEST_LOGIN;
    const { resolveLoginIdentity } = await import("../modules/auth/resolveLoginIdentity.js");
    const r = await resolveLoginIdentity("sock1", {});
    expect(r).toEqual({ error: "Sign-in required", code: "login_required" });
  });

  it("guest mode returns stable guest id when client sends valid guestId", async () => {
    process.env.NODE_ENV = "production";
    process.env.ALLOW_GUEST_LOGIN = "1";
    const { resolveLoginIdentity } = await import("../modules/auth/resolveLoginIdentity.js");
    const r = await resolveLoginIdentity("sock1", { guestId: "guest_abcdefghij", guestName: "Tester" });
    expect("error" in r).toBe(false);
    if (!("error" in r)) {
      expect(r.uid).toBe("guest_abcdefghij");
      expect(r.charName).toBe("Tester");
    }
  });

  it("development allows dev login when ALLOW_DEV_LOGIN unset", async () => {
    process.env.NODE_ENV = "development";
    delete process.env.ALLOW_GUEST_LOGIN;
    const { resolveLoginIdentity } = await import("../modules/auth/resolveLoginIdentity.js");
    const r = await resolveLoginIdentity("abc-uuid-long", {});
    expect("error" in r).toBe(false);
    if (!("error" in r)) {
      expect(r.uid).toBe("dev_abc-uuid-long");
    }
  });

  it("development blocks dev login when ALLOW_DEV_LOGIN=0", async () => {
    process.env.NODE_ENV = "development";
    process.env.ALLOW_DEV_LOGIN = "0";
    delete process.env.ALLOW_GUEST_LOGIN;
    const { resolveLoginIdentity } = await import("../modules/auth/resolveLoginIdentity.js");
    const r = await resolveLoginIdentity("sock1", {});
    expect(r).toEqual({
      error: "Dev login disabled (set ALLOW_DEV_LOGIN=1 or use a token)",
      code: "login_required",
    });
  });

  it("ignores JWT when USE_FIREBASE_WS_LOGIN is unset (dev login)", async () => {
    process.env.NODE_ENV = "development";
    delete process.env.USE_FIREBASE_WS_LOGIN;
    delete process.env.ALLOW_GUEST_LOGIN;
    const { resolveLoginIdentity } = await import("../modules/auth/resolveLoginIdentity.js");
    const r = await resolveLoginIdentity("sock-z", { token: "not-a-real-jwt" });
    expect("error" in r).toBe(false);
    if (!("error" in r)) {
      expect(r.uid).toBe("dev_sock-z");
    }
  });
});
