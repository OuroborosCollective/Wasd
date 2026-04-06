import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

describe("contentDataRoot", () => {
  const orig = { ...process.env };

  beforeEach(() => {
    process.env = { ...orig };
    delete process.env.USE_PUBLISHED_CONTENT;
    delete process.env.CONTENT_PACK_DIR;
  });

  afterEach(() => {
    process.env = { ...orig };
  });

  it("uses CONTENT_PACK_DIR when manifest exists", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "arel-pack-"));
    fs.writeFileSync(
      path.join(dir, "content-pack-manifest.json"),
      JSON.stringify({ schemaVersion: 1 })
    );
    fs.mkdirSync(path.join(dir, "npc"), { recursive: true });
    fs.writeFileSync(path.join(dir, "npc", "npcs.json"), "[]");

    process.env.CONTENT_PACK_DIR = dir;
    const { getContentDataRoot, resolveContentFile } = await import("../modules/content/contentDataRoot.js");
    expect(getContentDataRoot()).toBe(dir);
    expect(resolveContentFile("npc/npcs.json")).toBe(path.join(dir, "npc", "npcs.json"));

    fs.rmSync(dir, { recursive: true, force: true });
  });
});
