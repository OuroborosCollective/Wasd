/**
 * NPC MEMORY & RUMOR API ROUTES
 *
 * Server-authoritative NPC memory and rumor management endpoints.
 * Deterministic: No Math.random(), no Date.now() for gameplay state.
 * Client sends intent only, server validates and mutates.
 */

import express, { Router } from "express";
import { resolveHttpPlayerIdentity } from "../auth/PlayerIdentityResolver.js";
import { npcMemoryService } from "./NpcMemoryService.js";
import { npcRumorService } from "./NpcRumorService.js";

const router = Router();
router.use(express.json());

// Parse helpers
function parsePlayerId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed.length < 1 || trimmed.length > 64) return null;
  return trimmed;
}

function parseNpcId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!/^[a-zA-Z0-9_]{1,64}$/.test(trimmed)) return null;
  return trimmed;
}

function parseRumorId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed.length < 1 || trimmed.length > 128) return null;
  return trimmed;
}

function parsePosition(value: unknown): { x: number; y: number } | null {
  if (!value || typeof value !== "object") return null;
  const pos = value as { x?: unknown; y?: unknown };
  const x = Number(pos.x);
  const y = Number(pos.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  if (x < -100_000 || x > 100_000 || y < -100_000 || y > 100_000) return null;
  return { x, y };
}

/**
 * GET /api/npc/memory
 *
 * Get all memory snapshots for the authenticated player.
 */
router.get("/memory", async (req, res) => {
  const identity = resolveHttpPlayerIdentity(req);
  const playerId = (req.query?.playerId as string) ?? identity.playerId;

  if (!playerId) {
    res.status(400).json({
      ok: false,
      reason: "missing_player",
    });
    return;
  }

  const snapshots = await npcMemoryService.getAllMemorySnapshots(playerId);

  res.json({
    ok: true,
    result: {
      memories: snapshots,
    },
  });
});

/**
 * GET /api/npc/memory/:npcId
 *
 * Get memory snapshot for a specific NPC.
 */
router.get("/memory/:npcId", async (req, res) => {
  const identity = resolveHttpPlayerIdentity(req);
  const playerId = (req.query?.playerId as string) ?? identity.playerId;

  if (!playerId) {
    res.status(400).json({
      ok: false,
      reason: "missing_player",
    });
    return;
  }

  const npcId = parseNpcId(req.params?.npcId);
  if (!npcId) {
    res.status(400).json({
      ok: false,
      reason: "missing_npc",
    });
    return;
  }

  const snapshot = await npcMemoryService.getMemorySnapshot(playerId, npcId);

  if (!snapshot) {
    res.status(404).json({
      ok: false,
      reason: "missing_npc",
    });
    return;
  }

  res.json({
    ok: true,
    result: {
      memory: snapshot,
    },
  });
});

/**
 * GET /api/npc/reputation
 *
 * Get NPC reputation for player.
 * Required: playerId, npcId (query params)
 */
router.get("/reputation", async (req, res) => {
  const identity = resolveHttpPlayerIdentity(req);
  const playerId = (req.query?.playerId as string) ?? identity.playerId;

  if (!playerId) {
    res.status(400).json({
      ok: false,
      reason: "missing_player",
    });
    return;
  }

  const npcId = parseNpcId(req.query?.npcId);
  if (!npcId) {
    res.status(400).json({
      ok: false,
      reason: "missing_npc",
    });
    return;
  }

  const effectiveTrust = await npcMemoryService.getEffectiveTrust(playerId, npcId);

  if (!effectiveTrust) {
    res.status(404).json({
      ok: false,
      reason: "missing_npc",
    });
    return;
  }

  res.json({
    ok: true,
    result: {
      npcId,
      playerId,
      reputation: effectiveTrust.directReputation,
      rumorBonus: effectiveTrust.rumorBonus,
      effectiveReputation: effectiveTrust.effectiveReputation,
      trustTier: effectiveTrust.trustTier,
    },
  });
});

/**
 * GET /api/npc/rumors
 *
 * Get all rumors for the player.
 */
router.get("/rumors", async (req, res) => {
  const identity = resolveHttpPlayerIdentity(req);
  const playerId = (req.query?.playerId as string) ?? identity.playerId;

  if (!playerId) {
    res.status(400).json({
      ok: false,
      reason: "missing_player",
    });
    return;
  }

  const npcId = parseNpcId(req.query?.npcId);

  if (npcId) {
    // Get rumors for specific NPC
    const rumors = await npcRumorService.getRumorsForNpc(npcId, playerId);
    const influence = await npcRumorService.getNpcRumorInfluence(npcId, playerId);

    res.json({
      ok: true,
      result: {
        rumors,
        totalWeight: influence.totalWeight,
        count: rumors.length,
      },
    });
  } else {
    // Get all rumors for player
    const rumors = await npcRumorService.getRumorSnapshots(playerId);

    res.json({
      ok: true,
      result: {
        rumors,
        count: rumors.length,
      },
    });
  }
});

/**
 * POST /api/npc/rumors/propagate
 *
 * Trigger rumor propagation for a specific rumor.
 * Uses explicit server tick for deterministic propagation.
 */
router.post("/rumors/propagate", async (req, res) => {
  const identity = resolveHttpPlayerIdentity(req);
  const playerId = (req.body?.playerId as string) ?? identity.playerId;

  if (!playerId) {
    res.status(400).json({
      ok: false,
      reason: "missing_player",
    });
    return;
  }

  const rumorId = parseRumorId(req.body?.rumorId);
  if (!rumorId) {
    res.status(400).json({
      ok: false,
      reason: "missing_rumor",
    });
    return;
  }

  // Get current tick from request body or use 0 as default
  // The tick is used for tracking propagation time, not for determinism
  const currentTick = typeof req.body?.tick === "number" ? req.body.tick : 0;

  const result = await npcRumorService.propagateRumor(playerId, rumorId, currentTick);

  const statusCode = result.ok ? 200 : 400;
  res.status(statusCode).json({
    ok: result.ok,
    reason: result.ok ? undefined : (result as { ok: false; reason: string }).reason,
    result: result.ok ? (result as { ok: true; result: unknown }).result : undefined,
  });
});

/**
 * GET /api/npc/effective-trust/:npcId
 *
 * Get effective trust calculation for an NPC.
 */
router.get("/effective-trust/:npcId", async (req, res) => {
  const identity = resolveHttpPlayerIdentity(req);
  const playerId = (req.query?.playerId as string) ?? identity.playerId;

  if (!playerId) {
    res.status(400).json({
      ok: false,
      reason: "missing_player",
    });
    return;
  }

  const npcId = parseNpcId(req.params?.npcId);
  if (!npcId) {
    res.status(400).json({
      ok: false,
      reason: "missing_npc",
    });
    return;
  }

  const effectiveTrust = await npcMemoryService.getEffectiveTrust(playerId, npcId);

  if (!effectiveTrust) {
    res.status(404).json({
      ok: false,
      reason: "missing_npc",
    });
    return;
  }

  res.json({
    ok: true,
    result: {
      npcId,
      playerId,
      directReputation: effectiveTrust.directReputation,
      rumorBonus: effectiveTrust.rumorBonus,
      effectiveReputation: effectiveTrust.effectiveReputation,
      trustTier: effectiveTrust.trustTier,
    },
  });
});

/**
 * GET /api/npc/rumor-eligible/:sourceNpcId
 *
 * Get eligible rumor propagation targets for an NPC.
 */
router.get("/rumor-eligible/:sourceNpcId", async (req, res) => {
  const identity = resolveHttpPlayerIdentity(req);
  const playerId = (req.query?.playerId as string) ?? identity.playerId;

  if (!playerId) {
    res.status(400).json({
      ok: false,
      reason: "missing_player",
    });
    return;
  }

  const sourceNpcId = parseNpcId(req.params?.sourceNpcId);
  if (!sourceNpcId) {
    res.status(400).json({
      ok: false,
      reason: "missing_npc",
    });
    return;
  }

  const eligibleTargets = npcMemoryService.getEligibleRumorTargets(sourceNpcId);

  res.json({
    ok: true,
    result: {
      sourceNpcId,
      eligibleTargets,
      count: eligibleTargets.length,
    },
  });
});

export default router;