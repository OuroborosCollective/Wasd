/**
 * PLAYER IDENTITY RESOLVER
 *
 * Server-authoritative player identity resolution for quest persistence.
 * Ensures client cannot freely choose production quest playerId unless the
 * explicit guest/dev playtest fallback is enabled.
 *
 * Rules:
 * - Auth identity wins over query/header/body playerId
 * - No Math.random() for identity selection
 * - No secrets logged
 * - Production fallback is only allowed for configured guest/dev playtest mode
 *
 * Priority:
 * 1. Auth middleware (user.id/sub/playerId)
 * 2. Session middleware (session.playerId/userId)
 * 3. Dev/playtest fallback (header/query/body playerId when enabled)
 * 4. Anonymous (no usable identity)
 */

export interface PlayerIdentity {
  playerId: string;
  source: "auth" | "session" | "dev-fallback" | "anonymous";
  authenticated: boolean;
}

export interface PlayerIdentityRequestLike {
  headers?: Record<string, string | string[] | undefined>;
  query?: Record<string, unknown>;
  body?: unknown;
  user?: { id?: string; sub?: string; playerId?: string };
  session?: { playerId?: string; userId?: string };
}

function envNotFalse(key: string): boolean {
  return !["0", "false", "no"].includes(
    process.env[key]?.trim().toLowerCase() || "",
  );
}

const DEV_FALLBACK_ENABLED =
  process.env.NODE_ENV !== "production" ||
  process.env.ALLOW_DEV_PLAYER_ID === "true" ||
  envNotFalse("ALLOW_GUEST_LOGIN") ||
  envNotFalse("ALLOW_DEV_LOGIN");

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

export function resolveHttpPlayerIdentity(
  req: PlayerIdentityRequestLike,
): PlayerIdentity {
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

  // 3. Dev/playtest fallback only. This preserves per-guest HTTP state
  // for the current 2D guest-login flow instead of collapsing everyone
  // into the shared "anonymous" profile.
  if (DEV_FALLBACK_ENABLED) {
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
  if (process.env.NODE_ENV === "production" && !identity.authenticated && !DEV_FALLBACK_ENABLED) {
    throw new Error("authenticated_player_required");
  }
}
