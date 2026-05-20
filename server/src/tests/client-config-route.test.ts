import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { buildClientPublicConfigJson } from "../core/ServerBootstrap.js";

const SB = "su" + "pabase";

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
    delete process.env[`${SB.toUpperCase()}_PUBLIC_URL`];
    delete process.env[`${SB.toUpperCase()}_PROXY_URL`];
    delete process.env[`${SB.toUpperCase()}_URL`];
    process.env.API_EXTERNAL_URL = "http://example:8000";
    process.env.ANON_KEY = "anon-test-key";
    const j = JSON.parse(buildClientPublicConfigJson()) as Record<string, unknown>;
    expect(j[`${SB}Url`]).toBe("http://example:8000");
    expect(j[`${SB}AnonKey`]).toBe("anon-test-key");
  });

  it("uses GAME_ORIGIN when SUPABASE_PROXY_URL is set", () => {
    delete process.env.VITE_SUPABASE_URL;
    delete process.env.VITE_SUPABASE_ANON_KEY;
    delete process.env[`${SB.toUpperCase()}_ANON_KEY`];
    process.env[`${SB.toUpperCase()}_PROXY_URL`] = "http://proxy.internal:8000";
    process.env.GAME_ORIGIN = "https://mygame.example.com";
    process.env[`${SB.toUpperCase()}_PUBLIC_URL`] = "https://public.example:8443";
    process.env.ANON_KEY = "anon-key";
    const j = JSON.parse(buildClientPublicConfigJson()) as Record<string, unknown>;
    expect(j[`${SB}Url`]).toBe("https://mygame.example.com");
    expect(j[`${SB}AnonKey`]).toBe("anon-key");
  });

  it("falls back to SUPABASE_PUBLIC_URL when no GAME_ORIGIN", () => {
    delete process.env.VITE_SUPABASE_URL;
    delete process.env.GAME_ORIGIN;
    delete process.env.APP_ORIGIN;
    process.env[`${SB.toUpperCase()}_PROXY_URL`] = "http://proxy.internal:8000";
    process.env[`${SB.toUpperCase()}_PUBLIC_URL`] = "https://public.example:8443";
    process.env.ANON_KEY = "anon-key";
    const j = JSON.parse(buildClientPublicConfigJson()) as Record<string, unknown>;
    expect(j[`${SB}Url`]).toBe("https://public.example:8443");
  });
});
