/**
 * RESOURCE GATHER API ROUTE
 *
 * Controlled API for resource gathering interactions.
 * Server-authoritative: playerId, position, skill level, XP, items.
 *
 * Rules:
 * - No Math.random()
 * - No Date.now() for gameplay state
 * - Server resolves playerId from auth/session
 * - Auth guard applies in production unless guest/dev fallback is explicitly enabled
 * - Strict input validation
 */

import express from "express";
import { resolveHttpPlayerIdentity } from "../auth/PlayerIdentityResolver.js";
import { gatheringService } from "../resources/GatheringService.js";

const router = express.Router();

// Parse JSON bodies
router.use(express.json());

// Maximum allowed player position values (prevent overflow)
const MAX_POSITION = 100_000;
const MIN_POSITION = -100_000;

function envFlagEnabled(value: string | undefined): boolean {
  return !["0", "false", "no"].includes(value?.trim().toLowerCase() || "");
}

function isGuestHttpAllowed(): boolean {
  return (
    envFlagEnabled(process.env.ALLOW_GUEST_LOGIN) ||
    envFlagEnabled(process.env.ALLOW_DEV_LOGIN) ||
    process.env.ALLOW_DEV_PLAYER_ID === "true"
  );
}

/**
 * Validate and parse nodeId from request.
 * Node IDs must be safe identifiers (no injection risk).
 */
function parseNodeId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  // Safe identifier: alphanumeric with underscore and hyphen, 1-96 chars
  if (!/^[a-zA-Z0-9_-]{1,96}$/.test(trimmed)) return null;
  return trimmed;
}

/**
 * Validate and parse player position from request.
 * Returns null if invalid or out of bounds.
 */
function parsePosition(value: unknown): { x: number; y: number } | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const x = Number(raw.x);
  const y = Number(raw.y);

  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  if (x < MIN_POSITION || x > MAX_POSITION) return null;
  if (y < MIN_POSITION || y > MAX_POSITION) return null;

  // Round to 3 decimal places for stability
  return {
    x: Math.round(x * 1000) / 1000,
    y: Math.round(y * 1000) / 1000,
  };
}

/**
 * POST /api/resource/gather
 *
 * Attempt to gather from a resource node.
 * Server-authoritative: resolves skill level, applies XP, returns result.
 */
router.post("/gather", async (req, res) => {
  const identity = resolveHttpPlayerIdentity(req);

  // Production requires authenticated player unless configured guest/dev fallback is active.
  if (process.env.NODE_ENV === "production" && !identity.authenticated && !isGuestHttpAllowed()) {
    res.status(401).json({
      ok: false,
      error: "authenticated_player_required",
    });
    return;
  }

  // Parse and validate nodeId
  const nodeId = parseNodeId(req.body?.nodeId);
  if (!nodeId) {
    res.status(400).json({
      ok: false,
      error: "invalid_node_id",
      detail: "nodeId must be a safe identifier (alphanumeric, underscore, hyphen)",
    });
    return;
  }

  // Parse player position (may be omitted for WebSocket path)
  const playerPosition = parsePosition(req.body?.playerPosition) ?? { x: 0, y: 0 };

  // Parse and validate currentTick (defaults to 0)
  const rawTick = Number(req.body?.currentTick ?? 0);
  const currentTick = Number.isFinite(rawTick)
    ? Math.max(0, Math.floor(rawTick))
    : 0;

  // Attempt gather
  const result = await gatheringService.gather({
    playerId: identity.playerId,
    nodeId,
    playerPosition,
    currentTick,
  });

  // Return 200 for success, 409 for failure (conflict with world state)
  res.status(result.ok ? 200 : 409).json({
    ok: result.ok,
    result,
  });
});

/**
 * GET /api/resource/nodes
 *
 * List all resource node snapshots.
 * Used for client panel and debugging.
 */
router.get("/nodes", async (req, res) => {
  const rawTick = Number(req.query.tick ?? 0);
  const currentTick = Number.isFinite(rawTick)
    ? Math.max(0, Math.floor(rawTick))
    : 0;

  const nodes = gatheringService.listResourceSnapshots(currentTick);

  res.json({
    ok: true,
    nodes,
    count: nodes.length,
  });
});

export default router;
