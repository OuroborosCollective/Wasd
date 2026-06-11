import express, { type NextFunction, type Request, type Response } from "express";

type ShieldDecision = {
  allow: boolean;
  statusCode: number;
  reason: string;
  publicReason: string;
  severity: "low" | "medium" | "high";
};

type CounterEntry = {
  bucket: bigint;
  count: number;
};

const PATCHED = Symbol.for("areloria.areInvariantHttpShield.patched");
const INSTALLED = Symbol.for("areloria.areInvariantHttpShield.installed");

const counters = new Map<string, CounterEntry>();
let lastCleanupBucket = 0n;

const HARD_BLOCK_PREFIXES = [
  "/postgres",
  "/postgresql",
  "/pg",
  "/db",
  "/database",
  "/mysql",
  "/mariadb",
  "/redis",
  "/adminer",
  "/phpmyadmin",
  "/pma",
  "/wp-admin",
  "/wp-login",
  "/xmlrpc.php",
  "/.env",
  "/.git",
  "/.svn",
  "/actuator",
  "/server-status",
  "/solr",
  "/_profiler",
  "/debug",
  "/shell",
  "/boaform",
  "/cgi-bin"
] as const;

const AUTH_LIMIT_PER_WINDOW = positiveIntFromEnv("ARE_HTTP_SHIELD_AUTH_LIMIT", 120);
const SCANNER_LIMIT_PER_WINDOW = positiveIntFromEnv("ARE_HTTP_SHIELD_SCANNER_LIMIT", 24);
const WINDOW_SECONDS = positiveIntFromEnv("ARE_HTTP_SHIELD_WINDOW_SECONDS", 60);

function positiveIntFromEnv(key: string, fallback: number): number {
  const raw = process.env[key]?.trim();
  if (!raw) return fallback;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function stableHash32(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function currentBucket(): bigint {
  const seconds = process.hrtime.bigint() / 1_000_000_000n;
  return seconds / BigInt(WINDOW_SECONDS);
}

function cleanupCounters(bucket: bigint): void {
  if (bucket === lastCleanupBucket) return;
  lastCleanupBucket = bucket;

  for (const [key, entry] of counters.entries()) {
    if (entry.bucket + 2n < bucket) {
      counters.delete(key);
    }
  }
}

function incrementCounter(kind: string, fingerprint: string): number {
  const bucket = currentBucket();
  cleanupCounters(bucket);

  const key = `${kind}:${fingerprint}:${bucket.toString()}`;
  const entry = counters.get(key);
  if (!entry) {
    counters.set(key, { bucket, count: 1 });
    return 1;
  }

  entry.count += 1;
  return entry.count;
}

function getClientFingerprint(req: Request): string {
  const forwarded = String(req.headers["x-forwarded-for"] || "").split(",")[0]?.trim();
  const cf = String(req.headers["cf-connecting-ip"] || "").trim();
  const socket = req.socket.remoteAddress || "unknown";
  return stableHash32(cf || forwarded || socket);
}

function normalizePath(req: Request): string {
  const raw = (req.originalUrl || req.url || "/").split("?")[0] || "/";
  let decoded = raw;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    decoded = raw;
  }
  return decoded.replace(/\/+/g, "/").toLowerCase();
}

function isLikelyCrawler(req: Request): boolean {
  const ua = String(req.headers["user-agent"] || "").toLowerCase();
  return /bot|crawler|spider|scraper|scan|curl|wget|python-requests|go-http-client|httpclient/.test(ua);
}

function hasHardBlockedPrefix(pathname: string): boolean {
  return HARD_BLOCK_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function decideRequest(req: Request): ShieldDecision {
  const pathname = normalizePath(req);
  const fingerprint = getClientFingerprint(req);
  const crawler = isLikelyCrawler(req);

  if (pathname === "/auth" || (pathname.startsWith("/auth/") && !pathname.startsWith("/auth/v1"))) {
    const count = incrementCounter("auth-probe", fingerprint);
    return {
      allow: false,
      statusCode: count > SCANNER_LIMIT_PER_WINDOW ? 429 : 404,
      reason: "blocked_non_supabase_auth_probe",
      publicReason: "not_found",
      severity: crawler ? "high" : "medium"
    };
  }

  if (hasHardBlockedPrefix(pathname)) {
    const count = incrementCounter("hard-block", fingerprint);
    return {
      allow: false,
      statusCode: count > SCANNER_LIMIT_PER_WINDOW ? 429 : 404,
      reason: "blocked_sensitive_probe_path",
      publicReason: "not_found",
      severity: "high"
    };
  }

  if (pathname.startsWith("/auth/v1")) {
    const count = incrementCounter("auth-v1", fingerprint);
    if (count > AUTH_LIMIT_PER_WINDOW) {
      return {
        allow: false,
        statusCode: 429,
        reason: "auth_rate_limited",
        publicReason: "rate_limited",
        severity: "medium"
      };
    }
  }

  return {
    allow: true,
    statusCode: 200,
    reason: "allowed",
    publicReason: "ok",
    severity: "low"
  };
}

export function createAREInvariantHttpShield() {
  return function areInvariantHttpShield(req: Request, res: Response, next: NextFunction) {
    const decision = decideRequest(req);
    if (decision.allow) return next();

    const pathHash = stableHash32(normalizePath(req));
    const fingerprint = getClientFingerprint(req);
    res.setHeader("X-ARE-Invariant-Shield", decision.reason);
    res.setHeader("Cache-Control", "no-store");

    console.warn(
      `[AREInvariantHttpShield] ${decision.reason} severity=${decision.severity} ipHash=${fingerprint} pathHash=${pathHash} method=${req.method}`
    );

    return res.status(decision.statusCode).json({
      ok: false,
      error: decision.publicReason,
      invariant: "ARE_HTTP_SHIELD"
    });
  };
}

/**
 * Installs the shield before the first app.use(...) call without touching every bootstrap route.
 * This keeps legacy bootstraps protected and avoids exposing scanner paths before route setup.
 */
export function installAREInvariantHttpShieldRuntime(): void {
  const appProto = express.application as unknown as Record<PropertyKey, unknown> & {
    use: (...args: unknown[]) => unknown;
  };

  if (appProto[PATCHED]) return;
  appProto[PATCHED] = true;

  const originalUse = appProto.use;

  appProto.use = function patchedUse(this: Record<PropertyKey, unknown>, ...args: unknown[]) {
    if (!this[INSTALLED]) {
      this[INSTALLED] = true;
      originalUse.call(this, createAREInvariantHttpShield());
    }
    return originalUse.apply(this, args);
  };
}

export function getAREInvariantHttpShieldSnapshot() {
  return {
    active: true,
    windowSeconds: WINDOW_SECONDS,
    authLimitPerWindow: AUTH_LIMIT_PER_WINDOW,
    scannerLimitPerWindow: SCANNER_LIMIT_PER_WINDOW,
    counterBuckets: counters.size
  };
}
