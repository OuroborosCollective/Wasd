import { describe, it, expect } from "vitest";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import { GLBRegistry } from "../modules/asset-registry/GLBRegistry.js";
import { AssetPoolResolver } from "../modules/world/AssetPoolResolver.js";
import { generateLogicalVillage } from "../world/generation/index.js";

describe("generateLogicalVillage", () => {
  it("produces a street, paired houses, well, and trees with deterministic ids for the same seed", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "vlg-test-"));
    const glb = new GLBRegistry();
    const pools = new AssetPoolResolver(
      path.resolve(process.cwd(), "game-data/world/asset-pools.json"),
      path.join(tmp, "snapshots"),
    );
    const a = generateLogicalVillage(glb, pools, {
      centerX: 100,
      centerZ: 200,
      seed: "test-seed-alpha",
      housesPerSide: 3,
      layoutRevision: 2,
    });
    const b = generateLogicalVillage(glb, pools, {
      centerX: 100,
      centerZ: 200,
      seed: "test-seed-alpha",
      housesPerSide: 3,
      layoutRevision: 2,
    });
    expect(a.entities.length).toBe(b.entities.length);
    expect(a.entities.map((e) => e.id).join(",")).toBe(b.entities.map((e) => e.id).join(","));
    expect(a.entities.some((e) => e.role === "well")).toBe(true);
    expect(a.entities.filter((e) => e.role === "house").length).toBe(6);
    expect(a.entities.filter((e) => e.role === "road").length).toBeGreaterThanOrEqual(3);
    try {
      fs.rmSync(tmp, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  });
});
