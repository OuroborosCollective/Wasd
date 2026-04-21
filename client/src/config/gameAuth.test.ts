import { describe, expect, it } from "vitest";
import { resolveGameAuthProviderFromEnv } from "./gameAuth";

describe("resolveGameAuthProviderFromEnv", () => {
  it("uses explicit provider when configured", () => {
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

  it("falls back to none when no provider is configured", () => {
    expect(resolveGameAuthProviderFromEnv({})).toBe("none");
  });
});
