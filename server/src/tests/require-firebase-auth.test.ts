import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("../config/firebase.js", () => ({
  isFirebaseAuthConfigured: vi.fn(() => true),
  verifyFirebaseToken: vi.fn(),
}));

import { resolveLoginIdentity } from "../modules/auth/resolveLoginIdentity.js";

describe("REQUIRE_FIREBASE_AUTH", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      NODE_ENV: "development",
      REQUIRE_FIREBASE_AUTH: "1",
      ALLOW_GUEST_LOGIN: "1",
    };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("rejects login without token even if guest mode is on", async () => {
    const r = await resolveLoginIdentity("sock1", { guestId: "guest_abcdefghij" });
    expect(r).toEqual({ error: "Firebase sign-in required", code: "login_required" });
  });
});
