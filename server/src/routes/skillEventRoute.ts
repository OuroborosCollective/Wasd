/**
 * SKILL EVENT API ROUTE
 *
 * Controlled API for skill XP gains.
 * Only allows controlled events - no free level/xp setting.
 *
 * Rules:
 * - No Date.now() for gameplay state
 * - No Math.random()
 * - Server-authoritative playerId resolution
 * - Strict input validation
 * - Amount cap for safety
 */

import { Router } from "express";
import { resolveHttpPlayerIdentity } from "../auth/PlayerIdentityResolver.js";
import { getSkillProgressionService } from "../skills/skillRuntime.js";
import type { SkillId } from "../skills/SkillTypes.js";

const router = Router();

const ALLOWED_SKILLS = new Set<SkillId>([
  "woodcutting",
  "mining",
  "fishing",
  "combat",
  "crafting",
]);

const MAX_XP_AMOUNT = 5000;

function parseSkillId(value: unknown): SkillId | null {
  if (typeof value !== "string") return null;
  if (!ALLOWED_SKILLS.has(value as SkillId)) return null;
  return value as SkillId;
}

function parseXpAmount(value: unknown): number | null {
  const amount = Math.floor(Number(value));
  if (!Number.isFinite(amount)) return null;
  if (amount <= 0) return null;
  if (amount > MAX_XP_AMOUNT) return null;
  return amount;
}

/**
 * POST /api/skill/event
 *
 * Apply a skill XP gain event.
 * Requires authenticated player in production.
 */
router.post("/api/skill/event", async (req, res) => {
  const identity = resolveHttpPlayerIdentity(req);

  if (process.env.NODE_ENV === "production" && !identity.authenticated) {
    res.status(401).json({
      ok: false,
      error: "authenticated_player_required",
    });
    return;
  }

  const skillId = parseSkillId(req.body?.skillId);
  const amount = parseXpAmount(req.body?.amount);

  if (!skillId || amount === null) {
    res.status(400).json({
      ok: false,
      error: "invalid_skill_event",
    });
    return;
  }

  try {
    const service = await getSkillProgressionService();
    const state = await service.applyEvent({
      type: "skill_xp_gain",
      playerId: identity.playerId,
      skillId,
      amount,
      source: "admin_test",
    });

    res.json({
      ok: true,
      playerId: identity.playerId,
      authenticated: identity.authenticated,
      skills: state.skills,
    });
  } catch (error) {
    console.error("[skill-event] Failed to apply skill event:", error);
    res.status(500).json({
      ok: false,
      error: "internal_error",
    });
  }
});

/**
 * GET /api/skill/state
 *
 * Get current player skill state.
 */
router.get("/api/skill/state", async (req, res) => {
  const identity = resolveHttpPlayerIdentity(req);

  if (process.env.NODE_ENV === "production" && !identity.authenticated) {
    res.status(401).json({
      ok: false,
      error: "authenticated_player_required",
    });
    return;
  }

  try {
    const service = await getSkillProgressionService();
    const state = await service.getPlayerSkillState(identity.playerId);

    res.json({
      ok: true,
      playerId: identity.playerId,
      authenticated: identity.authenticated,
      skills: state.skills,
    });
  } catch (error) {
    console.error("[skill-state] Failed to get skill state:", error);
    res.status(500).json({
      ok: false,
      error: "internal_error",
    });
  }
});

export default router;