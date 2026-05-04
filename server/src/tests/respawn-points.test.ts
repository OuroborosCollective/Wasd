// @ts-nocheck
import { describe, it, expect } from "vitest";
import { loadRespawnPointsFromScenes } from "../modules/combat/respawnPoints.js";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("Respawn Points Loader", () => {
  it("loads respawn points from game-data/scenes", () => {
    const scenesDir = path.resolve(__dirname, "../../../game-data/scenes");
    const points = loadRespawnPointsFromScenes(scenesDir);

    expect(points.length).toBeGreaterThan(0);
    expect(points[0]).toHaveProperty("id");
    expect(points[0]).toHaveProperty("zoneId");
    expect(points[0]).toHaveProperty("x");
    expect(points[0]).toHaveProperty("z");
  });

  it("returns empty array for nonexistent directory", () => {
    const points = loadRespawnPointsFromScenes("/nonexistent/path");
    expect(points).toEqual([]);
  });

  it("loads the didis_hub respawn points", () => {
    const scenesDir = path.resolve(__dirname, "../../../game-data/scenes");
    const points = loadRespawnPointsFromScenes(scenesDir);
    const hubPoints = points.filter((p) => p.zoneId === "didis_hub");

    expect(hubPoints.length).toBeGreaterThanOrEqual(1);
    const center = hubPoints.find((p) => p.id === "rp_hub_center");
    expect(center).toBeDefined();
    expect(center?.x).toBe(0);
    expect(center?.z).toBe(0);
  });
});
