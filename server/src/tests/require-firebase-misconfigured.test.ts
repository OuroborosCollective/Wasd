import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("../config/firebase.js", () => ({
  isFirebaseAuthConfigured: vi.fn(() => false),
  verifyFirebaseToken: vi.fn(),
}));

import { resolveLoginIdentity } from "../modules/auth/resolveLoginIdentity.js";

describe("REQUIRE_FIREBASE_AUTH misconfigured", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv, NODE_ENV: "development", REQUIRE_FIREBASE_AUTH: "1" };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("returns clear error when Auth is not configured", async () => {
    const r = await resolveLoginIdentity("sock1", {});
    expect("error" in r).toBe(true);
    if ("error" in r) {
      expect(r.error).toContain("FIREBASE_SERVICE_ACCOUNT_KEY");
      expect(r.code).toBe("login_required");
    }
  });
});
