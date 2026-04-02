import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

describe("PersistenceManager driver selection", () => {
  let tmpDir: string;
  let savePath: string;
  const orig = { ...process.env };

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "arelor-persist-drv-"));
    savePath = path.join(tmpDir, "players.json");
    process.env.PLAYER_SAVE_FILE = savePath;
  });

  afterEach(() => {
    process.env = { ...orig };
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  });

  it("PERSISTENCE_DRIVER=file uses file backend", async () => {
    vi.resetModules();
    process.env.PERSISTENCE_DRIVER = "file";
    vi.doMock("../config/firebase.js", () => ({ getDb: () => ({}) }));
    const { PersistenceManager } = await import("../core/PersistenceManager.js");
    const pm = new PersistenceManager();
    await pm.init();
    await pm.save({
      u1: {
        id: "u1",
        name: "A",
        gold: 1,
        inventory: [],
        equipment: { weapon: null, armor: null },
        position: { x: 0, y: 0, z: 0 },
      },
    });
    const loaded = await pm.load();
    expect(loaded.u1?.gold).toBe(1);
  });

  it("PERSISTENCE_DRIVER=spacetime persists players via file fallback by default", async () => {
    vi.resetModules();
    process.env.PERSISTENCE_DRIVER = "spacetime";
    delete process.env.SPACETIME_PERSIST_FILE_FALLBACK;
    vi.doMock("../config/firebase.js", () => ({ getDb: () => null }));
    const { PersistenceManager } = await import("../core/PersistenceManager.js");
    const pm = new PersistenceManager();
    await pm.init();
    await pm.save({
      u2: {
        id: "u2",
        name: "B",
        gold: 2,
        inventory: [],
        equipment: { weapon: null, armor: null },
        position: { x: 0, y: 0, z: 0 },
      },
    });
    const loaded = await pm.load();
    expect(loaded.u2?.gold).toBe(2);
  });
});
