import { createHmac, timingSafeEqual } from "node:crypto";
import jwt from "jsonwebtoken";

export type SupabaseJwtClaims = {
  sub?: string;
  email?: string;
  role?: string;
  exp?: number;
  iat?: number;
  iss?: string;
  ref?: string;
  [key: string]: unknown;
};

export type SupabaseAuthVerifyMode = "jwt_secret" | "none";

function envTrim(key: string): string {
  const value = process.env[key];
  return typeof value === "string" ? value.trim() : "";
}

/** Strip BOM / zero-width chars — editors sometimes save secrets with invisible prefixes. */
function normalizeJwtSecretMaterial(raw: string): string {
  return raw
    .replace(/^\uFEFF/, "")
    .trim()
    .replace(/[\u200B-\u200D\uFEFF]/g, "");
}

function decodeBase64UrlToString(value: string): string {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  return Buffer.from(padded, "base64").toString("utf8");
}

function encodeBase64Url(buffer: Buffer): string {
  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

/**
 * Secret used to verify Supabase-issued JWTs (must match GoTrue / Auth).
 * Self-hosted stacks often expose GOTRUE_JWT_SECRET or reuse SECRET_KEY_BASE.
 */
const JWT_SECRET_KEYS = [
  "SUPABASE_JWT_SECRET",
  "JWT_SECRET",
  "GOTRUE_JWT_SECRET",
  "AUTH_JWT_SECRET",
  "SECRET_KEY_BASE",
] as const;

function getSecretMaterial(): string {
  for (const k of JWT_SECRET_KEYS) {
    const v = normalizeJwtSecretMaterial(envTrim(k));
    if (v) return v;
  }
  return "";
}

/** Which env key supplied the JWT verification secret (no value). */
export function getSupabaseJwtSecretSourceKey(): (typeof JWT_SECRET_KEYS)[number] | null {
  for (const k of JWT_SECRET_KEYS) {
    const v = normalizeJwtSecretMaterial(envTrim(k));
    if (v) return k;
  }
  return null;
}

function parseTokenClaims(token: string): SupabaseJwtClaims {
  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new Error("Invalid token format");
  }
  const [, payload] = parts;
  if (!payload) {
    throw new Error("Missing token payload");
  }
  try {
    const parsed = JSON.parse(decodeBase64UrlToString(payload)) as SupabaseJwtClaims;
    if (!parsed || typeof parsed !== "object") {
      throw new Error("Invalid token payload");
    }
    return parsed;
  } catch {
    throw new Error("Invalid token payload");
  }
}

export function verifySupabaseToken(bearerBlob: string): SupabaseJwtClaims {
  const cleanBlob = bearerBlob.trim();
  if (!cleanBlob) {
    throw new Error("Token is empty");
  }

  const secretMaterial = getSecretMaterial();
  if (!secretMaterial) {
    throw new Error("SUPABASE_JWT_SECRET or JWT_SECRET is required to verify Supabase tokens");
  }

  try {
    const decoded = jwt.verify(cleanBlob, secretMaterial, {
      algorithms: ["HS256"],
    }) as SupabaseJwtClaims;
    return decoded;
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      throw new Error("Token expired");
    }
    if (err instanceof jwt.JsonWebTokenError) {
      throw new Error(`Invalid token: ${err.message}`);
    }
    throw err;
  }
}

export function isSupabaseAuthConfigured(): boolean {
  return getSupabaseAuthInitInfo().verifyMode !== "none";
}

export function getSupabaseAuthInitInfo(): {
  verifyMode: SupabaseAuthVerifyMode;
  hasUrl: boolean;
  hasAnonKey: boolean;
  hasServiceRoleKey: boolean;
  hasJwtSecret: boolean;
  jwtSecretSourceKey: (typeof JWT_SECRET_KEYS)[number] | null;
} {
  const secretMaterial = getSecretMaterial();
  const jwtSecretSourceKey = getSupabaseJwtSecretSourceKey();
  const hasUrl = Boolean(
    envTrim("SUPABASE_URL") ||
      envTrim("SUPABASE_PUBLIC_URL") ||
      envTrim("API_EXTERNAL_URL") ||
      envTrim("VITE_SUPABASE_URL") ||
      envTrim("VITE_SUPABASE_PUBLIC_URL")
  );
  const hasAnonKey = Boolean(envTrim("SUPABASE_ANON_KEY") || envTrim("ANON_KEY"));
  const hasServiceRoleKey = Boolean(envTrim("SUPABASE_SERVICE_ROLE_KEY") || envTrim("SERVICE_ROLE_KEY"));
  return {
    verifyMode: secretMaterial ? "jwt_secret" : "none",
    hasUrl,
    hasAnonKey,
    hasServiceRoleKey,
    hasJwtSecret: Boolean(secretMaterial),
    jwtSecretSourceKey,
  };
}

export function getSupabaseSummary(): ReturnType<typeof getSupabaseAuthInitInfo> & {
  configured: boolean;
} {
  const info = getSupabaseAuthInitInfo();
  return {
    ...info,
    configured: info.verifyMode !== "none",
  };
}
