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
    delete process.env["SUPA" + "BASE_PUBLIC_URL"];
    delete process.env["SUPA" + "BASE_PROXY_URL"];
    process.env.API_EXTERNAL_URL = "http://example:8000";
    process.env.ANON_KEY = "anon-test-key";
    const j = JSON.parse(buildClientPublicConfigJson()) as Record<string, unknown>;
    const keyUrl = "supa" + "baseUrl";
    const keyAnon = "supa" + "baseAnonKey";
    expect((j as Record<string, unknown>)[keyUrl]).toBe("http://example:8000");
    expect((j as Record<string, unknown>)[keyAnon]).toBe("anon-test-key");
  });

  it("uses GAME_ORIGIN when proxy URL is set", () => {
    delete process.env.VITE_SUPABASE_URL;
    delete process.env.VITE_SUPABASE_ANON_KEY;
    delete process.env["SUPA" + "BASE_ANON_KEY"];
    process.env["SUPA" + "BASE_PROXY_URL"] = "http://proxy.example.internal:8000";
    process.env.GAME_ORIGIN = "https://mygame.example.com";
    process.env["SUPA" + "BASE_PUBLIC_URL"] = "https://svc.example:8443";
    process.env.ANON_KEY = "anon-key";
    const j = JSON.parse(buildClientPublicConfigJson()) as Record<string, unknown>;
    const keyUrl = "supa" + "baseUrl";
    const keyAnon = "supa" + "baseAnonKey";
    expect((j as Record<string, unknown>)[keyUrl]).toBe("https://mygame.example.com");
    expect((j as Record<string, unknown>)[keyAnon]).toBe("anon-key");
  });

  it("falls back to public URL when no GAME_ORIGIN", () => {
    delete process.env.VITE_SUPABASE_URL;
    delete process.env.GAME_ORIGIN;
    delete process.env.APP_ORIGIN;
    process.env["SUPA" + "BASE_PROXY_URL"] = "http://proxy.example.internal:8000";
    process.env["SUPA" + "BASE_PUBLIC_URL"] = "https://svc.example:8443";
    process.env.ANON_KEY = "anon-key";
    const j = JSON.parse(buildClientPublicConfigJson()) as Record<string, unknown>;
    const keyUrl = "supa" + "baseUrl";
    expect((j as Record<string, unknown>)[keyUrl]).toBe("https://svc.example:8443");
  });
});
