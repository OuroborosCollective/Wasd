import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { vi } from "vitest";

vi.mock("../config/firebase.js", () => ({
  getDb: () => null,
}));

import { PersistenceManager } from "../core/PersistenceManager.js";

describe("PersistenceManager file fallback", () => {
  let tmpDir: string;
  let savePath: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "arelor-persist-"));
    savePath = path.join(tmpDir, "players.json");
    process.env.PLAYER_SAVE_FILE = savePath;
  });

  afterEach(() => {
    delete process.env.PLAYER_SAVE_FILE;
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  });

  it("save and load round-trip", async () => {
    const pm = new PersistenceManager();
    await pm.init();
    await pm.save({
      p1: {
        id: "p1",
        name: "One",
        gold: 5,
        inventory: [{ id: "x" }],
        equipment: { weapon: null, armor: null },
        isOffline: true,
        state: "run",
        position: { x: 1, y: 2, z: 0 },
      },
    });
    const loaded = await pm.load();
    expect(loaded.p1).toBeDefined();
    expect(loaded.p1.gold).toBe(5);
    expect(loaded.p1.inventory).toEqual([{ id: "x" }]);
    expect(loaded.p1.isOffline).toBeUndefined();
    expect(loaded.p1.state).toBeUndefined();
    expect(loaded.p1.lastUpdated).toBeDefined();
  });
});
