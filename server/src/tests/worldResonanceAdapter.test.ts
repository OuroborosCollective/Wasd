import { describe, expect, it } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { WorldResonanceAdapter } from "../core/WorldResonanceAdapter.js";

describe("WorldResonanceAdapter", () => {
  it("returns a stable default snapshot when the shadow log is missing", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "world-heart-"));
    const adapter = new WorldResonanceAdapter(path.join(dir, "missing.jsonl"));

    expect(adapter.loadLatestShadowEntry()).toMatchObject({
      divergence: 0,
      entropy: 0,
      stability: 1,
      npcCritical: 0,
      npcDecomposition: 0,
      status: "STABLE",
    });
  });

  it("marks high divergence as critical", () => {
    const adapter = new WorldResonanceAdapter("/not-used.jsonl");

    expect(adapter.updateFromTick({ tick: 12, divergence: 0.02, entropy: 0.1 }).status).toBe("CRITICAL");
  });

  it("marks decomposing NPC state as decomposition", () => {
    const adapter = new WorldResonanceAdapter("/not-used.jsonl");

    expect(adapter.updateFromTick({ tick: 13, divergence: 0, npcDecomposition: 1 }).status).toBe("DECOMPOSITION");
  });
});
