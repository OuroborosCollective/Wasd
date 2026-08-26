import { Router, json } from "express";
import { resolveHttpPlayerIdentity } from "../auth/PlayerIdentityResolver.js";
import { aurionTransitionRuntime } from "../aurion/AurionTransitionRuntime.js";
import { tickContextProvider } from "../core/are/TickSystemContextProvider.js";
import { worldTickAdapter } from "../core/are/WorldTickThinShellAdapter.js";

const FORBIDDEN_CLIENT_AUTHORITY_KEYS = new Set([
  "actorId",
  "authority",
  "entryPointId",
  "playerId",
  "position",
  "returnPointId",
  "sessionId",
  "tick",
  "tickId",
  "zoneId",
]);

function isGuestHttpAllowed(): boolean {
  const allowGuest = !["0", "false", "no"].includes(process.env.ALLOW_GUEST_LOGIN?.trim().toLowerCase() || "");
  const allowDev = !["0", "false", "no"].includes(process.env.ALLOW_DEV_LOGIN?.trim().toLowerCase() || "");
  return allowGuest || allowDev || process.env.ALLOW_DEV_PLAYER_ID === "true";
}

function rejectUnauthenticatedInLockedProduction(identity: { authenticated: boolean }): boolean {
  return process.env.NODE_ENV === "production" && !identity.authenticated && !isGuestHttpAllowed();
}

function readTransitionRequest(value: unknown): { requestId: string; sequenceId: number } | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const body = value as Record<string, unknown>;
  if (Object.keys(body).some((key) => FORBIDDEN_CLIENT_AUTHORITY_KEYS.has(key))) return null;
  const requestId = typeof body.requestId === "string" ? body.requestId.trim() : "";
  const sequenceId = Number(body.sequenceId);
  if (!/^[a-zA-Z0-9:_-]{1,96}$/.test(requestId)) return null;
  if (!Number.isSafeInteger(sequenceId) || sequenceId < 0) return null;
  return { requestId, sequenceId };
}

function currentTick(): number | null {
  const tick = Number(tickContextProvider.getTickCounter());
  return Number.isSafeInteger(tick) && tick >= 0 ? tick : null;
}

export const aurionTransitionRouter = Router();
aurionTransitionRouter.use(json({ limit: "16kb" }));

aurionTransitionRouter.get("/transition", (req, res) => {
  const identity = resolveHttpPlayerIdentity(req as Parameters<typeof resolveHttpPlayerIdentity>[0]);
  if (rejectUnauthenticatedInLockedProduction(identity)) {
    res.status(401).json({ ok: false, error: "authenticated_player_required" });
    return;
  }

  res.json({
    ok: true,
    playerId: identity.playerId,
    playerIdentitySource: identity.source,
    authenticated: identity.authenticated,
    transition: aurionTransitionRuntime.getSnapshot(identity.playerId),
  });
});

aurionTransitionRouter.post("/transition", (req, res) => {
  const identity = resolveHttpPlayerIdentity(req as Parameters<typeof resolveHttpPlayerIdentity>[0]);
  if (rejectUnauthenticatedInLockedProduction(identity)) {
    res.status(401).json({ ok: false, error: "authenticated_player_required" });
    return;
  }

  const request = readTransitionRequest(req.body);
  if (!request) {
    res.status(400).json({ ok: false, error: "invalid_aurion_transition_request" });
    return;
  }

  const tick = currentTick();
  if (tick === null) {
    res.status(503).json({ ok: false, error: "runtime_tick_unavailable" });
    return;
  }

  const player = worldTickAdapter.playerSystem.getPlayer(identity.playerId);
  const x = Number(player?.position?.x);
  const y = Number(player?.position?.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    res.status(409).json({
      ok: false,
      error: "runtime_player_unavailable",
      playerId: identity.playerId,
      serverTick: tick,
    });
    return;
  }

  const result = aurionTransitionRuntime.requestTransition({
    playerId: identity.playerId,
    requestId: request.requestId,
    sequenceId: request.sequenceId,
    acceptedAtTick: tick,
    playerPosition: { x, y },
  });
  const status = result.ok ? 202 : result.code === "stale_sequence" ? 409 : 400;
  res.status(status).json({
    ...result,
    playerId: identity.playerId,
    playerIdentitySource: identity.source,
    authenticated: identity.authenticated,
    serverTick: tick,
  });
});
