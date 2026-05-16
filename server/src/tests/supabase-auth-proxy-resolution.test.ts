import { createHmac } from "node:crypto";
import { describe, expect, it, afterEach, beforeEach } from "vitest";
import type { Request } from "express";
import {
  resolveSupabaseProxyBaseUrl,
  resolveSupabaseProxyBaseUrlForRequest,
} from "../core/ServerBootstrap.js";

const JWT_SECRET = "test-proxy-resolution-secret";

function base64Url(input: string): string {
  return Buffer.from(input, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function encodeBase64Url(buffer: Buffer): string {
  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

/** HS256 JWT valid for verifySupabaseToken (same algorithm as production anon keys). */
function makeSignedJwt(payload: Record<string, unknown>): string {
  const header = base64Url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = base64Url(JSON.stringify(payload));
  const signedData = `${header}.${body}`;
  const sig = encodeBase64Url(createHmac("sha256", JWT_SECRET).update(signedData).digest());
  return `${signedData}.${sig}`;
}

function reqWithHeaders(headers: Record<string, string>): Request {
  return { headers } as unknown as Request;
}

describe("resolveSupabaseProxyBaseUrlForRequest", () => {
  const origEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...origEnv };
    process.env.JWT_SECRET = JWT_SECRET;
  });

  afterEach(() => {
    process.env = { ...origEnv };
  });

  it("uses API_EXTERNAL_URL when SUPABASE_* unset", () => {
    delete process.env.SUPABASE_PROXY_URL; // pragma: allowlist secret
    delete process.env.SUPABASE_URL; // pragma: allowlist secret
    delete process.env.SUPABASE_PUBLIC_URL; // pragma: allowlist secret
    process.env.API_EXTERNAL_URL = "http://api.arelogic.space:8000";
    expect(resolveSupabaseProxyBaseUrl()).toBe("http://api.arelogic.space:8000"); // pragma: allowlist secret
  });

  it("prefers configured SUPABASE_URL when available", () => {
    const req = reqWithHeaders({});
    const resolved = resolveSupabaseProxyBaseUrlForRequest(req, "https://cfg-project.supabase.co");
    expect(resolved).toBe("https://cfg-project.supabase.co");
  });

  it("infers supabase origin from verified apikey ref claim", () => {
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const anon = makeSignedJwt({ ref: "abcdefghijklmnopqrst", role: "anon", exp });
    const req = reqWithHeaders({ apikey: anon });
    const resolved = resolveSupabaseProxyBaseUrlForRequest(req, null);
    expect(resolved).toBe("https://abcdefghijklmnopqrst.supabase.co");
  });

  it("falls back to verified issuer origin when ref claim is absent", () => {
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const anon = makeSignedJwt({
      iss: "https://zzzzzzzzzzzzzzzzzzzz.supabase.co/auth/v1",
      role: "anon",
      exp,
    });
    const req = reqWithHeaders({ apikey: anon });
    const resolved = resolveSupabaseProxyBaseUrlForRequest(req, null);
    expect(resolved).toBe("https://zzzzzzzzzzzzzzzzzzzz.supabase.co");
  });

  it("infers self-hosted base from verified iss …/auth/v1 (non supabase.co)", () => {
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const anon = makeSignedJwt({
      iss: "http://api.arelogic.space:8000/auth/v1",
      role: "anon",
      exp,
    });
    const req = reqWithHeaders({ apikey: anon });
    const resolved = resolveSupabaseProxyBaseUrlForRequest(req, null);
    expect(resolved).toBe("http://api.arelogic.space:8000");
  });

  it("does not infer from forged JWT payload when signature is invalid", () => {
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const header = base64Url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
    const body = base64Url(
      JSON.stringify({
        iss: "http://evil.example:8000/auth/v1",
        role: "anon",
        exp,
      })
    );
    const forged = `${header}.${body}.not-a-valid-signature`;
    const req = reqWithHeaders({ apikey: forged });
    expect(resolveSupabaseProxyBaseUrlForRequest(req, null)).toBeNull();
  });

  it("returns null without config when JWT cannot be verified (no secret)", () => {
    delete process.env.JWT_SECRET;
    delete process.env.SUPABASE_JWT_SECRET;
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const anon = makeSignedJwt({ ref: "abcdefghijklmnopqrst", role: "anon", exp });
    const req = reqWithHeaders({ apikey: anon });
    expect(resolveSupabaseProxyBaseUrlForRequest(req, null)).toBeNull();
  });

  it("returns null without config and without usable token payload", () => {
    const req = reqWithHeaders({ apikey: "not-a-jwt" });
    const resolved = resolveSupabaseProxyBaseUrlForRequest(req, null);
    expect(resolved).toBeNull();
  });

  it("prefers SUPABASE_PROXY_URL over SUPABASE_URL", () => {
    process.env.SUPABASE_PROXY_URL = "http://kong.internal:8000"; // pragma: allowlist secret
    process.env.SUPABASE_URL = "https://proxy.example:8443"; // pragma: allowlist secret
    expect(resolveSupabaseProxyBaseUrl()).toBe("http://kong.internal:8000"); // pragma: allowlist secret
  });
});
