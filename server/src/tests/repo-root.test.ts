import { describe, it, expect, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

describe("findRepoRootWithGameData", () => {
  const prevCwd = process.cwd();

  afterEach(() => {
    process.chdir(prevCwd);
  });

  it("returns monorepo root when cwd is server/ with game-data symlink", async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "arel-repo-root-"));
    const root = path.join(tmp, "monorepo");
    fs.mkdirSync(path.join(root, "game-data", "npc"), { recursive: true });
    fs.writeFileSync(path.join(root, "game-data", "npc", "npcs.json"), "[]");
    fs.mkdirSync(path.join(root, "client"), { recursive: true });
    fs.writeFileSync(path.join(root, "client", "package.json"), "{}");
    fs.mkdirSync(path.join(root, "server"), { recursive: true });
    fs.symlinkSync(path.join(root, "game-data"), path.join(root, "server", "game-data"), "dir");

    process.chdir(path.join(root, "server"));
    const { findRepoRootWithGameData } = await import("../modules/content/repoRoot.js");
    expect(findRepoRootWithGameData()).toBe(root);

    fs.rmSync(tmp, { recursive: true, force: true });
  });
});
