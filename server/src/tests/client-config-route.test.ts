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
    process.env.API_EXTERNAL_URL = "http://example:8000";
    process.env.ANON_KEY = "anon-test-key";
    const j = JSON.parse(buildClientPublicConfigJson()) as {
      supabaseUrl: string | null;
      supabaseAnonKey: string | null;
    };
    expect(j.supabaseUrl).toBe("http://example:8000");
    expect(j.supabaseAnonKey).toBe("anon-test-key");
  });
});
