import { describe, expect, it, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { scanGlbGalleryTreeAt } from "../modules/content/adminGlbGallery.js";

describe("scanGlbGalleryTreeAt", () => {
  let tmp: string;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "glb-gallery-"));
  });

  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it("lists gltf as selectable and bin as visible non-selectable", () => {
    const sub = path.join(tmp, "props");
    fs.mkdirSync(sub, { recursive: true });
    fs.writeFileSync(path.join(sub, "house.gltf"), "{}");
    fs.writeFileSync(path.join(sub, "house.bin"), Buffer.from([1, 2, 3]));

    const items = scanGlbGalleryTreeAt(tmp, "/assets/models/world-assets/", "world");
    const gltf = items.find((i) => i.relativePath === "props/house.gltf");
    const bin = items.find((i) => i.relativePath === "props/house.bin");
    expect(gltf?.selectable).toBe(true);
    expect(gltf?.url).toBe("/assets/models/world-assets/props/house.gltf");
    expect(bin?.selectable).toBe(false);
    expect(bin?.url).toBe("");
  });
});
