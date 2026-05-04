// @ts-nocheck
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

describe("getSupabaseAuthInitInfo self-hosted env aliases", () => {
  const orig = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...orig };
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_PUBLIC_URL;
    delete process.env.API_EXTERNAL_URL;
    delete process.env.SUPABASE_ANON_KEY;
    delete process.env.ANON_KEY;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.SERVICE_ROLE_KEY;
    delete process.env.SUPABASE_JWT_SECRET;
    delete process.env.JWT_SECRET;
    delete process.env.GOTRUE_JWT_SECRET;
    delete process.env.AUTH_JWT_SECRET;
    delete process.env.SECRET_KEY_BASE;
  });

  afterEach(() => {
    process.env = { ...orig };
  });

  it("detects URL from API_EXTERNAL_URL and keys from ANON_KEY / SERVICE_ROLE_KEY", async () => {
    process.env.API_EXTERNAL_URL = "http://kong:8000";
    process.env.ANON_KEY = "anon-test";
    process.env.SERVICE_ROLE_KEY = "service-test";
    process.env.JWT_SECRET = "jwt-test";
    const { getSupabaseAuthInitInfo } = await import("../config/supabase.js");
    const info = getSupabaseAuthInitInfo();
    expect(info.hasUrl).toBe(true);
    expect(info.hasAnonKey).toBe(true);
    expect(info.hasServiceRoleKey).toBe(true);
    expect(info.hasJwtSecret).toBe(true);
  });

  it("accepts GOTRUE_JWT_SECRET when JWT_SECRET unset", async () => {
    process.env.GOTRUE_JWT_SECRET = "gotrue-secret";
    const { getSupabaseAuthInitInfo } = await import("../config/supabase.js");
    expect(getSupabaseAuthInitInfo().hasJwtSecret).toBe(true);
  });

  it("accepts SECRET_KEY_BASE as last-resort self-hosted alias", async () => {
    process.env.SECRET_KEY_BASE = "rails-style-secret";
    const { getSupabaseAuthInitInfo } = await import("../config/supabase.js");
    expect(getSupabaseAuthInitInfo().hasJwtSecret).toBe(true);
  });

  it("strips BOM from JWT_SECRET", async () => {
    process.env.JWT_SECRET = "\uFEFFmy-secret";
    const { getSupabaseAuthInitInfo } = await import("../config/supabase.js");
    const info = getSupabaseAuthInitInfo();
    expect(info.hasJwtSecret).toBe(true);
    expect(info.jwtSecretSourceKey).toBe("JWT_SECRET");
  });
});
