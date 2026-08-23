import { describe, expect, it } from "vitest";
import { AIService } from "../ai/AIService.js";
import type { IAutoHealBridge } from "../selfheal/AutoHeal.types.js";

const silentHeal: IAutoHealBridge = {
  async report() {},
};

describe("AI logical-time truth", () => {
  it("keeps causal identity stable across repeated calls at the same tick", async () => {
    const service = new AIService(undefined, silentHeal);
    const options = {
      mode: "deterministic" as const,
      agentId: "test-agent",
      tickId: 4242,
      logicalIndex: 7,
      resonance: 0.5,
      allowLearning: false,
    };

    const first = await service.processStructured("status world health", options);
    const second = await service.processStructured("status world health", options);

    expect(first.traceId).toBe(second.traceId);
    expect(first.createdAt).toBe(4242);
    expect(second.createdAt).toBe(4242);
    expect(first.inputHash).toBe(second.inputHash);
    expect(first.outputHash).toBe(second.outputHash);
    expect(first.payload.axiomHash).toBe(second.payload.axiomHash);
    expect(first.metadata.timeAuthority).toBe("tick");
    expect(first.metadata.durationAuthority).toBe("monotonic_side_channel");
    expect(first.durationMs).toBeGreaterThanOrEqual(0);
  });

  it("changes deterministic identity when the authoritative tick changes", async () => {
    const service = new AIService(undefined, silentHeal);
    const first = await service.processStructured("status world health", {
      tickId: 10,
      logicalIndex: 1,
    });
    const second = await service.processStructured("status world health", {
      tickId: 11,
      logicalIndex: 1,
    });

    expect(first.traceId).not.toBe(second.traceId);
    expect(first.payload.axiomHash).not.toBe(second.payload.axiomHash);
    expect(first.createdAt).toBe(10);
    expect(second.createdAt).toBe(11);
  });
});