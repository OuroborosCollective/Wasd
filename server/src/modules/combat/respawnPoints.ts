// @ts-nocheck
/**
 * Load respawn points from scene JSON files under game-data/scenes/.
 * Each scene can optionally include a `respawnPoints` array.
 */

import fs from "node:fs";
import path from "node:path";
import type { RespawnPoint } from "./deathRespawnSystem.js";

export function loadRespawnPointsFromScenes(scenesDir: string): RespawnPoint[] {
  const points: RespawnPoint[] = [];

  if (!fs.existsSync(scenesDir)) return points;

  const files = fs
    .readdirSync(scenesDir)
    .filter((f) => f.toLowerCase().endsWith(".json"))
    .sort();

  for (const fileName of files) {
    try {
      const raw = JSON.parse(
        fs.readFileSync(path.join(scenesDir, fileName), "utf-8"),
      );
      const sceneId =
        typeof raw?.sceneId === "string" ? raw.sceneId.trim() : "";
      if (!sceneId) continue;

      const arr = raw?.respawnPoints;
      if (!Array.isArray(arr)) continue;

      for (const rp of arr) {
        if (
          typeof rp?.id !== "string" ||
          typeof rp?.x !== "number" ||
          typeof rp?.z !== "number"
        )
          continue;

        points.push({
          id: rp.id,
          zoneId: rp.zoneId ?? sceneId,
          x: rp.x,
          z: rp.z,
          label: typeof rp.label === "string" ? rp.label : undefined,
        });
      }
    } catch {
      /* skip malformed scene files */
    }
  }

  return points;
}
