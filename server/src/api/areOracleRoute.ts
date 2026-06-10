import express from "express";
import type { WorldTick } from "../core/are/index.js";

export function areOracleRouter(tick: WorldTick) {
  const router = express.Router();

  router.get("/prophecy", (_req, res) => {
    const report = tick.getOracleReport?.();
    res.json({ ok: true, oracle: report });
  });

  router.get("/status", (_req, res) => {
    const report = tick.getOracleReport?.();
    const active = report?.prophecies?.some((prophecy: any) => prophecy.active) ?? false;
    res.json({
      ok: true,
      active,
      generatedAtTick: report?.generatedAtTick ?? null,
      prophecyCount: report?.prophecies?.length ?? 0,
      activeProphecies: report?.prophecies?.filter((prophecy: any) => prophecy.active) ?? [],
    });
  });

  return router;
}
