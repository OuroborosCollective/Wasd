import express, { Router, type Response } from "express";
import { resolveHttpPlayerIdentity } from "../auth/PlayerIdentityResolver.js";
import { tickContextProvider } from "../core/are/TickSystemContextProvider.js";
import { worldTickAdapter } from "../core/are/WorldTickThinShellAdapter.js";
import { craftingService } from "../crafting/CraftingService.js";
import {
  findNearestProcessingStation,
  getProcessingStationById,
  isWithinProcessingStationRadius,
  type ProcessingStation,
} from "../crafting/ProcessingStations.js";
import {
  canonicalizeClientIntent,
  chunkKeyFromWorldPosition,
  type ServerCanonicalIntent,
} from "../intents/ServerCanonicalIntent.js";
import { npcQuestRuntime } from "../quests/NpcQuestRuntime.js";

const router = Router();
router.use(express.json());

interface RuntimeTickContext {
  readonly tick: number;
  readonly tickId: number | string;
}

interface CraftInteractPayload {
  readonly targetId: string;
  readonly interaction: "craft_recipe";
  readonly recipeId: string;
  readonly stationId?: string;
  readonly playerPosition: { readonly x: number; readonly y: number };
}

type CanonicalCraftIntent = ServerCanonicalIntent<"interact"> & {
  readonly payload: CraftInteractPayload;
};

function parseId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return /^[a-zA-Z0-9:_-]{1,96}$/.test(trimmed) ? trimmed : null;
}

function parseRequestId(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return /^[a-zA-Z0-9:_./-]{1,160}$/.test(trimmed) ? trimmed : undefined;
}

function requireProductionAuth(identity: { authenticated: boolean }, res: Response): boolean {
  if (process.env.NODE_ENV === "production" && !identity.authenticated) {
    res.status(401).json({ ok: false, error: "authenticated_player_required" });
    return false;
  }
  return true;
}

function runtimeTick(): RuntimeTickContext | null {
  const context = tickContextProvider.getContext();
  const tick = Number(context.tickIndex);
  const tickId = context.tickId;
  const validTickId =
    (typeof tickId === "number" && Number.isSafeInteger(tickId) && tickId >= 0) ||
    (typeof tickId === "string" && /^[a-zA-Z0-9:_./-]{1,160}$/.test(tickId));
  return Number.isSafeInteger(tick) && tick >= 0 && validTickId ? { tick, tickId } : null;
}

function runtimePosition(playerId: string): { x: number; y: number } | null {
  const player = worldTickAdapter.playerSystem.getPlayer(playerId);
  const x = Number(player?.position?.x);
  const y = Number(player?.position?.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return { x: Math.round(x * 1000) / 1000, y: Math.round(y * 1000) / 1000 };
}

function resolveCraftStation(input: {
  readonly recipeId: string;
  readonly requestedStationId?: string;
  readonly position: { readonly x: number; readonly y: number };
}): { station?: ProcessingStation; error?: string } {
  const recipe = craftingService.listRecipes().find((candidate) => candidate.id === input.recipeId);
  if (!recipe) return { error: "recipe_not_found" };
  if (!recipe.stationType) {
    return input.requestedStationId ? { error: "unexpected_station_id" } : {};
  }

  const station = input.requestedStationId
    ? getProcessingStationById(input.requestedStationId)
    : findNearestProcessingStation(input.position, recipe.stationType);
  if (!station) return { error: "station_not_found" };
  if (station.type !== recipe.stationType) return { error: "station_type_mismatch" };
  if (!isWithinProcessingStationRadius(input.position, station).withinRange) {
    return { error: "station_too_far" };
  }
  return { station };
}

router.get("/recipes", async (req, res) => {
  const identity = resolveHttpPlayerIdentity(req);
  if (!requireProductionAuth(identity, res)) return;
  const tick = runtimeTick();
  if (!tick) return void res.status(503).json({ ok: false, error: "runtime_tick_unavailable" });

  try {
    const position = runtimePosition(identity.playerId) ?? undefined;
    const recipes = await craftingService.listRecipeSnapshots(identity.playerId, position);
    res.json({
      ok: true,
      playerId: identity.playerId,
      recipes,
      runtimeEvidence: {
        tick: tick.tick,
        tickId: tick.tickId,
        positionAvailable: Boolean(position),
      },
    });
  } catch (error) {
    console.error("[crafting-recipes] Failed to list recipes:", error);
    res.status(500).json({ ok: false, error: "internal_error" });
  }
});

router.post("/craft", async (req, res) => {
  const identity = resolveHttpPlayerIdentity(req);
  if (!requireProductionAuth(identity, res)) return;
  const recipeId = parseId(req.body?.recipeId);
  const stationId = req.body?.stationId === undefined ? undefined : parseId(req.body.stationId);
  const requestId = parseRequestId(req.body?.requestId ?? req.body?.intentId);
  if (!recipeId) return void res.status(400).json({ ok: false, error: "invalid_recipe_id" });
  if (!requestId) return void res.status(400).json({ ok: false, error: "request_id_required" });
  if (req.body?.stationId !== undefined && !stationId) {
    return void res.status(400).json({ ok: false, error: "invalid_station_id" });
  }
  const tick = runtimeTick();
  if (!tick) return void res.status(503).json({ ok: false, error: "runtime_tick_unavailable" });
  const position = runtimePosition(identity.playerId);
  if (!position) return void res.status(409).json({ ok: false, error: "runtime_player_position_unavailable" });
  const stationResolution = resolveCraftStation({ recipeId, requestedStationId: stationId, position });
  if (stationResolution.error) {
    const status = stationResolution.error === "recipe_not_found" ? 404 : 409;
    return void res.status(status).json({ ok: false, error: stationResolution.error });
  }
  const actualStationId = stationResolution.station?.id;

  const canonicalIntent = canonicalizeClientIntent<"interact">(
    {
      action: "interact",
      requestId,
      payload: {
        targetId: actualStationId ?? `recipe:${recipeId}`,
        interaction: "craft_recipe",
        recipeId,
        ...(actualStationId ? { stationId: actualStationId } : {}),
        playerPosition: position,
      },
    },
    {
      actorId: identity.playerId,
      tickId: tick.tickId,
      logicalIndex: tick.tick,
      receivedOrder: 0,
      chunkKey: chunkKeyFromWorldPosition(position),
    },
  ) as CanonicalCraftIntent;

  try {
    const result = await craftingService.craft({
      playerId: canonicalIntent.actorId,
      recipeId: canonicalIntent.payload.recipeId,
      playerPosition: canonicalIntent.payload.playerPosition,
      stationId: canonicalIntent.payload.stationId,
      currentTick: canonicalIntent.logicalIndex,
      operationId: canonicalIntent.intentHash,
    });

    if (!result.ok) {
      res.status(409).json({ ok: false, result, canonicalIntent, questProgressCommitted: null });
      return;
    }

    const questProgress = await npcQuestRuntime.updateQuestProgress(
      canonicalIntent.actorId,
      {
        intentHash: canonicalIntent.intentHash,
        tick: canonicalIntent.logicalIndex,
        chunkKey: canonicalIntent.chunkKey,
        eventType: "craft",
        targetId: canonicalIntent.payload.recipeId,
        quantity: 1,
      },
    );

    if (!questProgress.ok) {
      res.status(503).json({
        ok: false,
        error: "quest_progress_commit_failed",
        craftCommitted: true,
        result,
        canonicalIntent,
        questProgressCommitted: false,
        questProgressError: questProgress.reason,
      });
      return;
    }

    res.status(200).json({
      ok: true,
      craftCommitted: true,
      result,
      canonicalIntent,
      questProgressCommitted: true,
      questProgressHistoryHash: questProgress.result.historyHash,
    });
  } catch (error) {
    console.error("[crafting-craft] Failed to craft:", error);
    res.status(500).json({ ok: false, error: "internal_error", canonicalIntent });
  }
});

export default router;
