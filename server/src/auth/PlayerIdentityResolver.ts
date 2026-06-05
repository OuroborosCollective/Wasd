/**
 * PLAYER IDENTITY RESOLVER
 *
 * Server-authoritative player identity resolution for quest persistence.
 * Ensures client cannot freely choose production quest playerId.
 *
 * Rules:
 * - Auth identity wins over query/body playerId
 * - No Math.random() for identity selection
 * - No secrets logged
 * - Production mode rejects unauthenticated playerId fallback
 *
 * Priority:
 * 1. Auth middleware (user.id/sub/playerId)
 * 2. Session middleware (session.playerId/userId)
 * 3. Dev/test fallback (query.playerId) - only if NODE_ENV != production
 * 4. Anonymous (no authenticated identity)
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

const DEV_FALLBACK_ENABLED =
  process.env.NODE_ENV !== "production" ||
  process.env.ALLOW_DEV_PLAYER_ID === "true";

function normalizePlayerId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  // Stable, boring, safe ID format - alphanumeric with safe punctuation
  if (!/^[a-zA-Z0-9._:-]{1,96}$/.test(trimmed)) return null;

  return trimmed;
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

  // 3. Dev/test fallback only
  if (DEV_FALLBACK_ENABLED) {
    const queryId = normalizePlayerId(req.query?.playerId);
    if (queryId) {
      return {
        playerId: queryId,
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
  if (process.env.NODE_ENV === "production" && !identity.authenticated) {
    throw new Error("authenticated_player_required");
  }
}