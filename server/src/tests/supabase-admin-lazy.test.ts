import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

describe("supabaseAdmin lazy client", () => {
  const orig = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...orig };
  });

  afterEach(() => {
    process.env = { ...orig };
  });

  it("throws a clear error when URL or key missing", async () => {
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_PUBLIC_URL;
    delete process.env.API_EXTERNAL_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.SERVICE_ROLE_KEY;
    const { getSupabaseAdmin } = await import("../lib/supabaseAdmin.js");
    expect(() => getSupabaseAdmin()).toThrow(/SUPABASE_URL|API_EXTERNAL_URL/);
  });

  it("creates client when API_EXTERNAL_URL and SERVICE_ROLE_KEY set", async () => {
    process.env.API_EXTERNAL_URL = "http://example:8000";
    process.env.SERVICE_ROLE_KEY = "test-service-role-key";
    const { getSupabaseAdmin } = await import("../lib/supabaseAdmin.js");
    const c = getSupabaseAdmin();
    expect(c).toBeTruthy();
  });
});
