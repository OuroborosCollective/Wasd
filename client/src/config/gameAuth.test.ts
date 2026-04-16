import { describe, expect, it } from "vitest";
import { resolveGameAuthProviderFromEnv } from "./gameAuth";

describe("resolveGameAuthProviderFromEnv", () => {
  it("returns explicit firebase", () => {
    expect(resolveGameAuthProviderFromEnv({ VITE_AUTH_PROVIDER: "firebase" })).toBe("firebase");
  });

  it("returns explicit none even when Supabase vars are set", () => {
    expect(
      resolveGameAuthProviderFromEnv({
        VITE_AUTH_PROVIDER: "none",
        VITE_SUPABASE_URL: "https://x.supabase.co",
        VITE_SUPABASE_ANON_KEY: "k",
      })
    ).toBe("none");
  });

  it("prefers supabase when URL + anon key present and provider unset", () => {
    expect(
      resolveGameAuthProviderFromEnv({
        VITE_SUPABASE_URL: "https://x.supabase.co",
        VITE_SUPABASE_ANON_KEY: "anon",
      })
    ).toBe("supabase");
  });

  it("uses public URL variant for supabase detection", () => {
    expect(
      resolveGameAuthProviderFromEnv({
        VITE_SUPABASE_PUBLIC_URL: "https://x.supabase.co",
        VITE_SUPABASE_ANON_KEY: "anon",
      })
    ).toBe("supabase");
  });

  it("defaults to none when only Firebase web vars would exist (no duplicate toggle)", () => {
    expect(
      resolveGameAuthProviderFromEnv({
        VITE_FIREBASE_API_KEY: "x",
        VITE_FIREBASE_PROJECT_ID: "p",
      })
    ).toBe("none");
  });
});
