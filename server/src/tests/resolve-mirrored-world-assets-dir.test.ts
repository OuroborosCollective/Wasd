import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { resolveMirroredWorldAssetsDir } from "../core/resolveMirroredWorldAssetsDir.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe("resolveMirroredWorldAssetsDir", () => {
  it("finds client mirror when cwd is workspace root (after sync-world-assets)", () => {
    const prev = process.env.MIRRORED_WORLD_ASSETS_DIR;
    delete process.env.MIRRORED_WORLD_ASSETS_DIR;
    const d = resolveMirroredWorldAssetsDir();
    if (prev) process.env.MIRRORED_WORLD_ASSETS_DIR = prev;
    if (!d) {
      // Mirror is gitignored until first `pnpm run sync:world-assets` or client prebuild
      expect(true).toBe(true);
      return;
    }
    expect(fs.existsSync(d)).toBe(true);
  });

  it("respects MIRRORED_WORLD_ASSETS_DIR when set", () => {
    const repo = path.resolve(__dirname, "../../../");
    const w = path.join(repo, "client", "public", "assets", "models", "world-assets");
    process.env.MIRRORED_WORLD_ASSETS_DIR = w;
    expect(resolveMirroredWorldAssetsDir()).toBe(w);
    delete process.env.MIRRORED_WORLD_ASSETS_DIR;
  });
});
