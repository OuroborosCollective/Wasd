import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

describe("getFirebaseAdminSummary", () => {
  const orig = { ...process.env };

  beforeEach(() => {
    process.env = { ...orig };
    delete process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
    delete process.env.FIREBASE_ADMIN_USE_APPLICATION_DEFAULT;
    delete process.env.FIREBASE_PROJECT_ID;
  });

  afterEach(() => {
    process.env = { ...orig };
  });

  it("reports none when no firebase env", async () => {
    vi.resetModules();
    const { getFirebaseAdminSummary } = await import("../config/firebase.js");
    const s = getFirebaseAdminSummary();
    expect(s.initMode).toBe("none");
    expect(s.configured).toBe(false);
    expect(s.hasServiceAccountKeyEnv).toBe(false);
  });

  it("reports cert intent when FIREBASE_SERVICE_ACCOUNT_KEY is set (even if unparsable)", async () => {
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY = "not-parseable-json-at-all-!!!";
    vi.resetModules();
    const { getFirebaseAdminSummary } = await import("../config/firebase.js");
    const s = getFirebaseAdminSummary();
    expect(s.initMode).toBe("cert");
    expect(s.hasServiceAccountKeyEnv).toBe(true);
    expect(s.configured).toBe(false);
  });

  it("reports application_default intent when only GOOGLE_APPLICATION_CREDENTIALS (init info only)", async () => {
    process.env.GOOGLE_APPLICATION_CREDENTIALS = "/tmp/fake-adc.json";
    process.env.FIREBASE_PROJECT_ID = "adc-proj";
    vi.resetModules();
    const { getFirebaseAdminInitInfo } = await import("../config/firebase.js");
    const s = getFirebaseAdminInitInfo();
    expect(s.initMode).toBe("application_default");
    expect(s.projectId).toBe("adc-proj");
    expect(s.hasGoogleApplicationCredentials).toBe(true);
  });
});
