import express from "express";
import type { WorldTick } from "../core/WorldTick.js";

function parseTick(raw: string): number | null {
  const tick = Number(raw);
  if (!Number.isInteger(tick) || tick < 0) return null;
  return tick;
}

export function areReplayRouter(tick: WorldTick) {
  const router = express.Router();

  router.get("/stats", (_req, res) => {
    res.json({ ok: true, stats: tick.getReplayRecorderStats?.() ?? null });
  });

  router.get("/snapshot/:tick", (req, res) => {
    const requestedTick = parseTick(req.params.tick);
    if (requestedTick === null) {
      res.status(400).json({ ok: false, error: "invalid_tick", message: "Tick must be a positive integer." });
      return;
    }

    const replay = tick.getReplaySnapshot?.(requestedTick);
    if (!replay) {
      res.status(404).json({
        ok: false,
        error: "replay_tick_not_found",
        message: "Requested tick is outside the in-memory replay ring buffer.",
        stats: tick.getReplayRecorderStats?.() ?? null,
      });
      return;
    }

    res.json(replay);
  });

  return router;
}
