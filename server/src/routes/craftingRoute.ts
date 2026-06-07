/**
 * CRAFTING API ROUTE
 *
 * Server-authoritative crafting API.
 * No Date.now(), no Math.random(), stable recipe ordering.
 * Requires station proximity for recipes with stationType.
 */

import express, { Router } from "express";
import { resolveHttpPlayerIdentity } from "../auth/PlayerIdentityResolver.js";
import { craftingService } from "../crafting/CraftingService.js";

const router = Router();

router.use(express.json());

function parseRecipeId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!/^[a-zA-Z0-9_-]{1,96}$/.test(trimmed)) return null;
  return trimmed;
}

function parsePlayerPosition(value: unknown): { x: number; y: number } | undefined {
  if (!value || typeof value !== "object") return undefined;
  const pos = value as { x?: unknown; y?: unknown };
  if (typeof pos.x !== "number" || typeof pos.y !== "number") return undefined;
  if (!Number.isFinite(pos.x) || !Number.isFinite(pos.y)) return undefined;
  return { x: pos.x, y: pos.y };
}

function parseStationId(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed;
}

/**
 * GET /api/crafting/recipes
 *
 * List all crafting recipes with craftability status for the player.
 */
router.get("/recipes", async (req, res) => {
  const identity = resolveHttpPlayerIdentity(req);

  if (process.env.NODE_ENV === "production" && !identity.authenticated) {
    res.status(401).json({
      ok: false,
      error: "authenticated_player_required",
    });
    return;
  }

  try {
    const recipes = await craftingService.listRecipeSnapshots(identity.playerId);

    res.json({
      ok: true,
      playerId: identity.playerId,
      recipes,
    });
  } catch (error) {
    console.error("[crafting-recipes] Failed to list recipes:", error);
    res.status(500).json({
      ok: false,
      error: "internal_error",
    });
  }
});

/**
 * POST /api/crafting/craft
 *
 * Attempt to craft a recipe.
 * Consumes ingredients, adds outputs, grants crafting XP.
 * Requires playerPosition and stationId for station-bound recipes.
 */
router.post("/craft", async (req, res) => {
  const identity = resolveHttpPlayerIdentity(req);

  if (process.env.NODE_ENV === "production" && !identity.authenticated) {
    res.status(401).json({
      ok: false,
      error: "authenticated_player_required",
    });
    return;
  }

  const recipeId = parseRecipeId(req.body?.recipeId);

  if (!recipeId) {
    res.status(400).json({
      ok: false,
      error: "invalid_recipe_id",
    });
    return;
  }

  const playerPosition = parsePlayerPosition(req.body?.playerPosition);
  const stationId = parseStationId(req.body?.stationId);

  try {
    const result = await craftingService.craft({
      playerId: identity.playerId,
      recipeId,
      playerPosition,
      stationId,
    });

    res.status(result.ok ? 200 : 409).json({
      ok: result.ok,
      result,
    });
  } catch (error) {
    console.error("[crafting-craft] Failed to craft:", error);
    res.status(500).json({
      ok: false,
      error: "internal_error",
    });
  }
});

export default router;