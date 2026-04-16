import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getSupabaseAuthInitInfo } from "../config/supabase.js";

describe("getSupabaseAuthInitInfo self-hosted env aliases", () => {
  const orig = { ...process.env };

  beforeEach(() => {
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
  });

  afterEach(() => {
    process.env = { ...orig };
  });

  it("detects URL from API_EXTERNAL_URL and keys from ANON_KEY / SERVICE_ROLE_KEY", () => {
    process.env.API_EXTERNAL_URL = "http://kong:8000";
    process.env.ANON_KEY = "anon-test";
    process.env.SERVICE_ROLE_KEY = "service-test";
    process.env.JWT_SECRET = "jwt-test";
    const info = getSupabaseAuthInitInfo();
    expect(info.hasUrl).toBe(true);
    expect(info.hasAnonKey).toBe(true);
    expect(info.hasServiceRoleKey).toBe(true);
    expect(info.hasJwtSecret).toBe(true);
  });
});
