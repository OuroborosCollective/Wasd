import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { resolveWorldAssetsDir } from "../core/resolveWorldAssetsDir.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe("resolveWorldAssetsDir", () => {
  it("finds world-assets relative to repo when cwd is workspace root", () => {
    const prev = process.env.WORLD_ASSETS_DIR;
    delete process.env.WORLD_ASSETS_DIR;
    const d = resolveWorldAssetsDir();
    if (prev) process.env.WORLD_ASSETS_DIR = prev;
    expect(d).toBeTruthy();
    expect(fs.existsSync(path.join(d!, "props")) || fs.existsSync(path.join(d!, "characters"))).toBe(true);
  });

  it("respects WORLD_ASSETS_DIR when set", () => {
    const repo = path.resolve(__dirname, "../../../");
    const w = path.join(repo, "world-assets");
    process.env.WORLD_ASSETS_DIR = w;
    expect(resolveWorldAssetsDir()).toBe(w);
    delete process.env.WORLD_ASSETS_DIR;
  });
});
