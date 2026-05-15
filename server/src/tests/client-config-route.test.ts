import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { buildClientPublicConfigJson } from "../core/ServerBootstrap.js";

describe("buildClientPublicConfigJson", () => {
  const orig = { ...process.env };

  beforeEach(() => {
    process.env = { ...orig };
  });

  afterEach(() => {
    process.env = { ...orig };
  });

  it("returns JSON with anon url and key from env aliases", () => {
    delete process.env.VITE_SUPABASE_URL;
    delete process.env.VITE_SUPABASE_ANON_KEY;
    delete process.env.GAME_ORIGIN;
    delete process.env.SUPABASE_PUBLIC_URL;
    delete process.env.SUPABASE_PROXY_URL;
    process.env.API_EXTERNAL_URL = "http://127.0.0.1:48100";
    process.env.ANON_KEY = "z9f_test_anon_key_placeholder";
    const j = JSON.parse(buildClientPublicConfigJson()) as {
      supabaseUrl: string | null;
      supabaseAnonKey: string | null;
    };
    expect(j.supabaseUrl).toBe("http://127.0.0.1:48100");
    expect(j.supabaseAnonKey).toBe("z9f_test_anon_key_placeholder");
  });

  it("uses GAME_ORIGIN when SUPABASE_PROXY_URL is set", () => {
    delete process.env.VITE_SUPABASE_URL;
    delete process.env.VITE_SUPABASE_ANON_KEY;
    delete process.env.SUPABASE_ANON_KEY;
    process.env.SUPABASE_PROXY_URL = "http://proxy.internal:8000";
    process.env.GAME_ORIGIN = "https://mygame.test";
    process.env.SUPABASE_PUBLIC_URL = "https://api.external:8443";
    process.env.ANON_KEY = "anon-key";
    const j = JSON.parse(buildClientPublicConfigJson()) as {
      supabaseUrl: string | null;
      supabaseAnonKey: string | null;
    };
    expect(j.supabaseUrl).toBe("https://mygame.test");
    expect(j.supabaseAnonKey).toBe("anon-key");
  });

  it("falls back to SUPABASE_PUBLIC_URL when no GAME_ORIGIN", () => {
    delete process.env.VITE_SUPABASE_URL;
    delete process.env.GAME_ORIGIN;
    delete process.env.APP_ORIGIN;
    process.env.SUPABASE_PROXY_URL = "http://proxy.internal:8000";
    process.env.SUPABASE_PUBLIC_URL = "https://api.external:8443";
    process.env.ANON_KEY = "anon-key";
    const j = JSON.parse(buildClientPublicConfigJson()) as {
      supabaseUrl: string | null;
      supabaseAnonKey: string | null;
    };
    expect(j.supabaseUrl).toBe("https://api.external:8443");
  });
});
