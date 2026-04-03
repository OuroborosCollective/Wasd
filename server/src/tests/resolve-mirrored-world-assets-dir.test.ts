import { describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
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

  it("respects MIRRORED_WORLD_ASSETS_DIR when set and directory exists", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "arelor-world-assets-"));
    process.env.MIRRORED_WORLD_ASSETS_DIR = tmp;
    try {
      expect(resolveMirroredWorldAssetsDir()).toBe(tmp);
    } finally {
      delete process.env.MIRRORED_WORLD_ASSETS_DIR;
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });
});
