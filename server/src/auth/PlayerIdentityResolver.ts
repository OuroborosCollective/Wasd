/**
 * PLAYER IDENTITY RESOLVER
 *
 * Server-authoritative player identity resolution for quest persistence.
 * Ensures client cannot freely choose production quest playerId unless the
 * explicit guest/dev playtest fallback is enabled.
 *
 * Rules:
 * - Auth identity wins over query/header/body playerId
 * - Trusted MCP/Genkit operator identity is accepted only from loopback and
 *   only with the configured MCP admin token
 * - No Math.random() for identity selection
 * - No secrets logged
 * - Production fallback is only allowed for configured guest/dev playtest mode
 *
 * Priority:
 * 1. Auth middleware (user.id/sub/playerId)
 * 2. Session middleware (session.playerId/userId)
 * 3. Trusted loopback MCP/Genkit operator identity
 * 4. Dev/playtest fallback (header/query/body playerId when enabled)
 * 5. Anonymous (no usable identity)
 */

import { createHash, timingSafeEqual } from "node:crypto";

export interface PlayerIdentity {
  playerId: string;
  source: "auth" | "session" | "operator-loopback" | "dev-fallback" | "anonymous";
  authenticated: boolean;
}

export interface PlayerIdentityRequestLike {
  headers?: Record<string, string | string[] | undefined>;
  query?: Record<string, unknown>;
  body?: unknown;
  user?: { id?: string; sub?: string; playerId?: string };
  session?: { playerId?: string; userId?: string };
  ip?: string;
  socket?: { remoteAddress?: string | null };
}

const TRUTHY_ENV = new Set(["1", "true", "yes", "on"]);
const LOOPBACK_ADDRESSES = new Set(["127.0.0.1", "::1", "::ffff:127.0.0.1"]);

function envTruthy(key: string): boolean {
  const value = process.env[key]?.trim().toLowerCase();
  return value ? TRUTHY_ENV.has(value) : false;
}

export function isDevPlayerIdentityFallbackEnabled(): boolean {
  if (process.env.NODE_ENV !== "production") return true;
  return envTruthy("ALLOW_DEV_PLAYER_ID") || envTruthy("ALLOW_GUEST_LOGIN") || envTruthy("ALLOW_DEV_LOGIN");
}

function firstHeaderValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function normalizePlayerId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  // Stable, boring, safe ID format - alphanumeric with safe punctuation
  if (!/^[a-zA-Z0-9._:-]{1,96}$/.test(trimmed)) return null;

  return trimmed;
}

function bodyPlayerId(body: unknown): unknown {
  if (!body || typeof body !== "object") return null;
  return (body as Record<string, unknown>).playerId;
}

function safeEqualSecret(candidate: string, expected: string): boolean {
  const left = createHash("sha256").update(candidate, "utf8").digest();
  const right = createHash("sha256").update(expected, "utf8").digest();
  return timingSafeEqual(left, right);
}

function isLoopbackRequest(req: PlayerIdentityRequestLike): boolean {
  const remote = req.socket?.remoteAddress?.trim() || req.ip?.trim() || "";
  return LOOPBACK_ADDRESSES.has(remote);
}

function resolveTrustedOperatorIdentity(req: PlayerIdentityRequestLike): PlayerIdentity | null {
  const expectedToken = process.env.MCP_ADMIN_TOKEN?.trim();
  const suppliedToken = firstHeaderValue(req.headers?.["x-areloria-operator-token"])?.trim();
  const playerId = normalizePlayerId(firstHeaderValue(req.headers?.["x-areloria-operator-player-id"]));

  if (!expectedToken || !suppliedToken || !playerId || !isLoopbackRequest(req)) return null;
  if (!safeEqualSecret(suppliedToken, expectedToken)) return null;

  return {
    playerId,
    source: "operator-loopback",
    authenticated: true,
  };
}

export function resolveHttpPlayerIdentity(req: PlayerIdentityRequestLike): PlayerIdentity {
  // 1. Prefer real auth middleware if it exists
  const authUser = req as Record<string, unknown>;
  const authId = normalizePlayerId(
    (authUser.user as Record<string, unknown>)?.id ??
    (authUser.user as Record<string, unknown>)?.sub ??
    (authUser.user as Record<string, unknown>)?.playerId,
  );

  if (authId) {
    return {
      playerId: authId,
      source: "auth",
      authenticated: true,
    };
  }

  // 2. Optional session middleware
  const session = req as Record<string, unknown>;
  const sessionId = normalizePlayerId(
    (session.session as Record<string, unknown>)?.playerId ??
    (session.session as Record<string, unknown>)?.userId,
  );

  if (sessionId) {
    return {
      playerId: sessionId,
      source: "session",
      authenticated: true,
    };
  }

  // 3. Trusted loopback operator. This is not a client identity fallback: the
  // caller must already hold MCP_ADMIN_TOKEN and the request must originate
  // from the same server process/host via loopback.
  const operatorIdentity = resolveTrustedOperatorIdentity(req);
  if (operatorIdentity) return operatorIdentity;

  // 4. Dev/playtest fallback only. This preserves per-guest HTTP state
  // for the current 2D guest-login flow instead of collapsing everyone
  // into the shared "anonymous" profile.
  if (isDevPlayerIdentityFallbackEnabled()) {
    const headerId = normalizePlayerId(
      firstHeaderValue(req.headers?.["x-player-id"]) ??
      firstHeaderValue(req.headers?.["x-areloria-player-id"]),
    );
    const queryId = normalizePlayerId(req.query?.playerId);
    const bodyId = normalizePlayerId(bodyPlayerId(req.body));
    const fallbackId = headerId ?? queryId ?? bodyId;

    if (fallbackId) {
      return {
        playerId: fallbackId,
        source: "dev-fallback",
        authenticated: false,
      };
    }
  }

  return {
    playerId: "anonymous",
    source: "anonymous",
    authenticated: false,
  };
}

export function assertPlayerIdentityAllowed(identity: PlayerIdentity): void {
  if (process.env.NODE_ENV === "production" && !identity.authenticated && !isDevPlayerIdentityFallbackEnabled()) {
    throw new Error("authenticated_player_required");
  }
}
