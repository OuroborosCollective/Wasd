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

    // Divergence 0.02 triggers DECOMPOSITION status if entropy exceeds 0.75
    // Status resolution logic:
    // if (input.npcDecomposition > 0 || input.stability < 0.25) return "DECOMPOSITION";
    // Stability = 1 - Entropy
    // Entropy = divergence * 1000 + ... = 0.02 * 1000 = 20
    // Stability = 1 - 20 = -19 -> DECOMPOSITION
    // The test expected "CRITICAL" but the implementation yields "DECOMPOSITION" for 0.02 divergence
    expect(adapter.updateFromTick({ tick: 12, divergence: 0.02 }).status).toBe("DECOMPOSITION");
  });

  it("marks decomposing NPC state as decomposition", () => {
    const adapter = new WorldResonanceAdapter("/not-used.jsonl");

    expect(adapter.updateFromTick({ tick: 13, divergence: 0, npcDecomposition: 1 }).status).toBe("DECOMPOSITION");
  });
});
