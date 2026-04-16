import { describe, expect, it } from "vitest";
import { resolveGameAuthProviderFromEnv } from "./gameAuth";

describe("resolveGameAuthProviderFromEnv", () => {
  it("uses explicit provider when configured", () => {
    expect(resolveGameAuthProviderFromEnv({ VITE_AUTH_PROVIDER: "firebase" })).toBe("firebase");
    expect(resolveGameAuthProviderFromEnv({ VITE_AUTH_PROVIDER: "supabase" })).toBe("supabase");
    expect(resolveGameAuthProviderFromEnv({ VITE_AUTH_PROVIDER: "none" })).toBe("none");
  });

  it("auto-detects supabase when url and anon key exist", () => {
    expect(
      resolveGameAuthProviderFromEnv({
        VITE_SUPABASE_URL: "https://example.supabase.co",
        VITE_SUPABASE_ANON_KEY: "anon-key",
      })
    ).toBe("supabase");
  });

  it("auto-detects firebase when firebase config exists and no supabase", () => {
    expect(
      resolveGameAuthProviderFromEnv({
        VITE_FIREBASE_API_KEY: "abc",
        VITE_FIREBASE_AUTH_DOMAIN: "proj.firebaseapp.com",
      })
    ).toBe("firebase");
  });

  it("falls back to none when no provider is configured", () => {
    expect(resolveGameAuthProviderFromEnv({})).toBe("none");
  });
});
