import { afterEach, describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";
import { AssetPoolResolver } from "../modules/world/AssetPoolResolver.js";

const TEST_POOLS_PATH = path.resolve(process.cwd(), "game-data/world/asset-pools.test.json");
const TEST_SNAPSHOT_DIR = path.resolve(process.cwd(), "game-data/world/asset-pool-snapshots-test");

afterEach(() => {
  if (fs.existsSync(TEST_POOLS_PATH)) {
    fs.unlinkSync(TEST_POOLS_PATH);
  }
  if (fs.existsSync(TEST_SNAPSHOT_DIR)) {
    fs.rmSync(TEST_SNAPSHOT_DIR, { recursive: true, force: true });
  }
});

describe("AssetPoolResolver snapshots", () => {
  it("creates, lists, and restores snapshots", () => {
    const resolver = new AssetPoolResolver(TEST_POOLS_PATH, TEST_SNAPSHOT_DIR);
    const setOk = resolver.setEntry("world_objects", "house", "/assets/models/buildings/house_01.glb");
    expect(setOk).toBe(true);

    const snapshot = resolver.createSnapshot("before_edit");
    expect(snapshot).not.toBeNull();
    expect(snapshot?.fileName.includes("before_edit")).toBe(true);

    const setChanged = resolver.setEntry("world_objects", "house", "/assets/models/buildings/house_02.gltf");
    expect(setChanged).toBe(true);
    expect(resolver.resolvePath("world_objects", "house", "seed_1")).toContain("house_02.gltf");

    const restored = resolver.restoreSnapshot(snapshot!.id);
    expect(restored.ok).toBe(true);
    expect(resolver.resolvePath("world_objects", "house", "seed_1")).toContain("house_01.glb");

    const listed = resolver.listSnapshots(10);
    expect(listed.length).toBeGreaterThanOrEqual(1);
    expect(listed.some((entry) => entry.id === snapshot!.id)).toBe(true);
  });

  it("rejects traversal-style snapshot ids", () => {
    const resolver = new AssetPoolResolver(TEST_POOLS_PATH, TEST_SNAPSHOT_DIR);
    resolver.setEntry("world_objects", "crate", "/assets/models/objects/crate.glb");
    resolver.createSnapshot("safe");

    const rejectedDotDot = resolver.restoreSnapshot("../evil.json");
    expect(rejectedDotDot.ok).toBe(false);

    const rejectedSlash = resolver.restoreSnapshot("asset-pools.2026-04-01.json/evil");
    expect(rejectedSlash.ok).toBe(false);
  });
});
