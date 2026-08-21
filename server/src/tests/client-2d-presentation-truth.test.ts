import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { findRepoRootWithGameData } from "../modules/content/repoRoot.js";

function repoRoot(): string {
  const root = findRepoRootWithGameData();
  if (!root) throw new Error("TEST_REPOSITORY_ROOT_NOT_FOUND");
  return root;
}

function readJson(relativePath: string): any {
  return JSON.parse(fs.readFileSync(path.join(repoRoot(), relativePath), "utf8"));
}

function readText(relativePath: string): string {
  return fs.readFileSync(path.join(repoRoot(), relativePath), "utf8");
}

describe("2D production presentation truth", () => {
  it("does not silently present player, npc or loot as schematic shapes", () => {
    const config = readJson("game-data/visual/presentation_bindings.json");

    for (const kind of ["player", "npc", "loot"] as const) {
      const presentation = config?.fallbacks?.[kind]?.presentation2d;
      expect(presentation).toBeTruthy();
      expect(presentation.kind).toBe("asset_manifest");
      expect(presentation.kind).not.toBe("shape");
    }

    expect(config.fallbacks.player.presentation2d.assetCategory).toBe("characters");
    expect(config.fallbacks.npc.presentation2d.assetCategory).toBe("characters");
    expect(config.fallbacks.loot.presentation2d.assetCategory).toBe("props");
    expect(config.fallbacks.loot.presentation2d.propType).toBe("crate");
  });

  it("binds the production actor fallback to a real deterministic character atlas", () => {
    const atlasPath = path.join(
      repoRoot(),
      "apps/client-2d/public/2d-assets/characters/pipoya/pipoya-character-atlas.json",
    );
    const imagePath = path.join(
      repoRoot(),
      "apps/client-2d/public/2d-assets/characters/pipoya/pipoya-character-atlas.png",
    );

    expect(fs.existsSync(atlasPath)).toBe(true);
    expect(fs.existsSync(imagePath)).toBe(true);

    const atlas = JSON.parse(fs.readFileSync(atlasPath, "utf8"));
    expect(atlas.selection?.mode).toBe("deterministic");
    expect(atlas.selection?.random).toBe(false);
    expect(Object.keys(atlas.entries ?? {}).length).toBeGreaterThan(0);
  });

  it("ships real terrain, building and prop assets in the merged 2D manifest source", () => {
    const manifest = readJson("apps/client-2d/public/2d-assets/manifest.json");
    expect(Object.keys(manifest.tilesets ?? {}).length).toBeGreaterThan(0);
    expect(Object.keys(manifest.buildings ?? {}).length).toBeGreaterThan(0);
    expect(Object.keys(manifest.props ?? {}).length).toBeGreaterThan(0);

    const allEntries = [
      ...Object.values(manifest.tilesets ?? {}),
      ...Object.values(manifest.buildings ?? {}),
      ...Object.values(manifest.props ?? {}),
    ] as Array<{ src?: unknown }>;
    expect(allEntries.some((entry) => typeof entry.src === "string" && entry.src.length > 0)).toBe(true);
  });

  it("keeps the active /2d entrypoint on live authority and uses the real world asset surface", () => {
    const entry = readText("apps/client-2d/src/DeterministicWorldIsoApp.tsx");
    const liveRenderer = readText("apps/client-2d/src/LiveAuthoritativeWorld2D.tsx");
    const surface = readText("apps/client-2d/src/world/LiveAssetWorldSurface.ts");

    expect(entry).toContain("DeterministicWorldIsoAppHudBridge");
    expect(entry).not.toContain("DeterministicWorldIsoAppFuture");
    expect(liveRenderer).toContain("LiveAssetWorldSurface");
    expect(liveRenderer).toContain("loadServerWorldProjection");
    expect(liveRenderer).not.toContain("generateChunkScenePlan(");

    expect(surface).toContain("generateChunkScenePlan");
    expect(surface).toContain("bindTerrainWithContext");
    expect(surface).toContain("bindRoadWithContext");
    expect(surface).toContain("bindBuildingWithContext");
    expect(surface).toContain("bindPropWithContext");
    expect(surface).not.toContain("new Graphics");
    expect(surface).toContain("Intentionally DO NOT render plan.npcs");
  });

  it("requires server-seeded projection provenance instead of a client-local demo seed", () => {
    const healthRoutes = readText("server/src/api/healthRoutes.ts");
    const surface = readText("apps/client-2d/src/world/LiveAssetWorldSurface.ts");

    expect(healthRoutes).toContain("/world-projection");
    expect(healthRoutes).toContain("resolveCanonicalWorldSeed()");
    expect(healthRoutes).toContain("OuroborosWorldDirectorV1");
    expect(surface).toContain("SERVER_SEEDED_STATIC_PRESENTATION");
    expect(surface).not.toContain('const DEFAULT_WORLD_SEED =');
  });
});
