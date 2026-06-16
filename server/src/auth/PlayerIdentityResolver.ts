/**
 * PLAYER IDENTITY RESOLVER
 *
 * Server-authoritative player identity resolution for gameplay persistence.
 * Auth/session identity wins. Public 2D guest identity remains available unless
 * production explicitly disables guest login through environment configuration.
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

const TRUTHY_ENV = new Set(["1", "true", "yes", "on"]);
const FALSY_ENV = new Set(["0", "false", "no", "off"]);

function envTruthy(key: string): boolean {
  const value = process.env[key]?.trim().toLowerCase();
  return value ? TRUTHY_ENV.has(value) : false;
}

function envDefaultTrue(key: string): boolean {
  const value = process.env[key]?.trim().toLowerCase();
  if (!value) return true;
  return !FALSY_ENV.has(value);
}

export function isDevPlayerIdentityFallbackEnabled(): boolean {
  if (process.env.NODE_ENV !== "production") return true;
  return envDefaultTrue("ALLOW_GUEST_LOGIN") || envTruthy("ALLOW_DEV_LOGIN") || envTruthy("ALLOW_DEV_PLAYER_ID");
}

function firstHeaderValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function normalizePlayerId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (!/^[a-zA-Z0-9._:-]{1,96}$/.test(trimmed)) return null;

  return trimmed;
}

function bodyPlayerId(body: unknown): unknown {
  if (!body || typeof body !== "object") return null;
  return (body as Record<string, unknown>).playerId;
}

export function resolveHttpPlayerIdentity(req: PlayerIdentityRequestLike): PlayerIdentity {
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
