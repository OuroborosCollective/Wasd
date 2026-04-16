import { describe, expect, it } from "vitest";
import type { Request } from "express";
import { resolveSupabaseProxyBaseUrlForRequest } from "../core/ServerBootstrap.js";

function base64Url(input: string): string {
  return Buffer.from(input, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function makeUnsignedJwt(payload: Record<string, unknown>): string {
  const header = base64Url(JSON.stringify({ alg: "none", typ: "JWT" }));
  const body = base64Url(JSON.stringify(payload));
  return `${header}.${body}.`;
}

function reqWithHeaders(headers: Record<string, string>): Request {
  return { headers } as unknown as Request;
}

describe("resolveSupabaseProxyBaseUrlForRequest", () => {
  it("prefers configured SUPABASE_URL when available", () => {
    const req = reqWithHeaders({});
    const resolved = resolveSupabaseProxyBaseUrlForRequest(req, "https://cfg-project.supabase.co");
    expect(resolved).toBe("https://cfg-project.supabase.co");
  });

  it("infers supabase origin from apikey ref claim", () => {
    const anon = makeUnsignedJwt({ ref: "abcdefghijklmnopqrst", role: "anon" });
    const req = reqWithHeaders({ apikey: anon });
    const resolved = resolveSupabaseProxyBaseUrlForRequest(req, null);
    expect(resolved).toBe("https://abcdefghijklmnopqrst.supabase.co");
  });

  it("falls back to issuer origin when ref claim is absent", () => {
    const anon = makeUnsignedJwt({ iss: "https://zzzzzzzzzzzzzzzzzzzz.supabase.co/auth/v1" });
    const req = reqWithHeaders({ apikey: anon });
    const resolved = resolveSupabaseProxyBaseUrlForRequest(req, null);
    expect(resolved).toBe("https://zzzzzzzzzzzzzzzzzzzz.supabase.co");
  });

  it("returns null without config and without usable token payload", () => {
    const req = reqWithHeaders({ apikey: "not-a-jwt" });
    const resolved = resolveSupabaseProxyBaseUrlForRequest(req, null);
    expect(resolved).toBeNull();
  });
});
