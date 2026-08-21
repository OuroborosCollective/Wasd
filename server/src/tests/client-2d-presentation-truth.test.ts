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

describe("2D production presentation truth", () => {
  it("does not silently present player or npc as schematic shapes", () => {
    const config = readJson("game-data/visual/presentation_bindings.json");

    for (const kind of ["player", "npc"] as const) {
      const presentation = config?.fallbacks?.[kind]?.presentation2d;
      expect(presentation).toBeTruthy();
      expect(presentation.kind).toBe("asset_manifest");
      expect(presentation.kind).not.toBe("shape");
      expect(presentation.assetCategory).toBe("characters");
    }
  });

  it("binds the production fallback to a real deterministic character atlas", () => {
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
});