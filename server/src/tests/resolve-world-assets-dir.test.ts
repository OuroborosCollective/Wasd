import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { resolveWorldAssetsDir } from "../core/resolveWorldAssetsDir.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe("resolveWorldAssetsDir", () => {
  it("returns null when optional world assets are not installed", () => {
    const previous = process.env.WORLD_ASSETS_DIR;
    delete process.env.WORLD_ASSETS_DIR;
    try {
      expect(resolveWorldAssetsDir()).toBeNull();
    } finally {
      if (previous === undefined) delete process.env.WORLD_ASSETS_DIR;
      else process.env.WORLD_ASSETS_DIR = previous;
    }
  });

  it("respects an existing WORLD_ASSETS_DIR override", () => {
    const previous = process.env.WORLD_ASSETS_DIR;
    const worldAssets = fs.mkdtempSync(path.join(os.tmpdir(), "wasd-world-assets-"));
    try {
      process.env.WORLD_ASSETS_DIR = worldAssets;
      expect(resolveWorldAssetsDir()).toBe(worldAssets);
    } finally {
      if (previous === undefined) delete process.env.WORLD_ASSETS_DIR;
      else process.env.WORLD_ASSETS_DIR = previous;
      fs.rmSync(worldAssets, { recursive: true, force: true });
    }
  });
});
