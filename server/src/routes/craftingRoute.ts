import express, { Router, type Response } from "express";
import { resolveHttpPlayerIdentity } from "../auth/PlayerIdentityResolver.js";
import { tickContextProvider } from "../core/are/TickSystemContextProvider.js";
import { worldTickAdapter } from "../core/are/WorldTickThinShellAdapter.js";
import { craftingService } from "../crafting/CraftingService.js";
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
  if (!recipeId) return void res.status(400).json({ ok: false, error: "invalid_recipe_id" });
  if (req.body?.stationId !== undefined && !stationId) {
    return void res.status(400).json({ ok: false, error: "invalid_station_id" });
  }
  const tick = runtimeTick();
  if (!tick) return void res.status(503).json({ ok: false, error: "runtime_tick_unavailable" });
  const position = runtimePosition(identity.playerId);
  if (!position) return void res.status(409).json({ ok: false, error: "runtime_player_position_unavailable" });

  const canonicalIntent = canonicalizeClientIntent<"interact">(
    {
      action: "interact",
      requestId: parseRequestId(req.body?.requestId ?? req.body?.intentId),
      payload: {
        targetId: stationId ?? recipeId,
        interaction: "craft_recipe",
        recipeId,
        ...(stationId ? { stationId } : {}),
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

    let questProgressCommitted: boolean | null = null;
    let questProgressError: string | undefined;
    if (result.ok && !result.replayed) {
      const questProgress = await npcQuestRuntime.updateQuestProgress(
        canonicalIntent.actorId,
        "craft",
        canonicalIntent.payload.recipeId,
        1,
      );
      questProgressCommitted = questProgress.ok;
      if (!questProgress.ok) questProgressError = questProgress.reason;
    }

    res.status(result.ok ? 200 : 409).json({
      ok: result.ok,
      result,
      canonicalIntent,
      questProgressCommitted,
      ...(questProgressError ? { questProgressError } : {}),
    });
  } catch (error) {
    console.error("[crafting-craft] Failed to craft:", error);
    res.status(500).json({ ok: false, error: "internal_error", canonicalIntent });
  }
});

export default router;
