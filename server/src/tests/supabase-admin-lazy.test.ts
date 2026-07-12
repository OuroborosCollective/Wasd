import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

describe("supabaseAdmin lazy client", () => {
  const orig = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
    process.env = { ...orig };
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    process.env = { ...orig };
  });

  it("throws a clear error when URL or key missing", async () => {
    process.env.SUPABASE_URL = "";
    process.env.SUPABASE_PUBLIC_URL = "";
    process.env.API_EXTERNAL_URL = "";
    process.env.VITE_SUPABASE_URL = "";
    process.env.VITE_SUPABASE_PUBLIC_URL = "";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "";
    process.env.SERVICE_ROLE_KEY = "";
    const { getSupabaseAdmin } = await import("../lib/supabaseAdmin.js");
    expect(() => getSupabaseAdmin()).toThrow(/SUPABASE_URL|API_EXTERNAL_URL/);
  });

  it("creates a lazy client without making a network request", async () => {
    process.env.API_EXTERNAL_URL = "http://example:8000";
    process.env.SERVICE_ROLE_KEY = "test-service-role-key";
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const { getSupabaseAdmin } = await import("../lib/supabaseAdmin.js");
    expect(getSupabaseAdmin()).toBeTruthy();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("uses the PostgREST endpoint and server-only authorization headers", async () => {
    process.env.SUPABASE_URL = "http://supabase-kong:8000";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-test";
    const fetchSpy = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([{ id: "one" }]), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchSpy);

    const { getSupabaseAdmin } = await import("../lib/supabaseAdmin.js");
    const result = await getSupabaseAdmin().from("player_snapshots").select("player_id");

    expect(result.error).toBeNull();
    expect(result.data).toEqual([{ id: "one" }]);
    const [url, init] = fetchSpy.mock.calls[0] as [URL, RequestInit];
    expect(url.toString()).toBe(
      "http://supabase-kong:8000/rest/v1/player_snapshots?select=player_id",
    );
    expect(init.headers).toMatchObject({
      apikey: "service-role-test",
      Authorization: "Bearer service-role-test",
    });
  });

  it("rejects unsafe table identifiers before a request is sent", async () => {
    process.env.SUPABASE_URL = "http://supabase-kong:8000";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-test";
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const { getSupabaseAdmin } = await import("../lib/supabaseAdmin.js");
    expect(() => getSupabaseAdmin().from("player_snapshots?select=*")).toThrow(
      /invalid table identifier/,
    );
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
