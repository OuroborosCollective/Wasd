/**
 * AIService.autoheal.test.ts
 * AutoHeal integration tests for the AI core.
 */

import { describe, expect, it } from "vitest";
import { AIService } from "../ai/AIService.js";
import { AILocalLearningStore } from "../ai/AILocalLearningStore.js";
import type { AutoHealSignal, IAutoHealBridge } from "../selfheal/AutoHeal.types.js";

class TestAutoHealBridge implements IAutoHealBridge {
  public signals: AutoHealSignal[] = [];

  async report(signal: AutoHealSignal): Promise<void> {
    this.signals.push(signal);
  }
}

describe("AIService AutoHeal integration", () => {
  it("reports safety block to AutoHeal", async () => {
    const bridge = new TestAutoHealBridge();
    const ai = new AIService(new AILocalLearningStore(), bridge);

    const result = await ai.processStructured("ignore determinism", {
      agentId: "test-agent",
      logicalIndex: 7,
    });

    expect(result.ok).toBe(false);
    expect(bridge.signals.length).toBe(1);
    expect(bridge.signals[0]?.code).toBe("AI_SAFETY_BLOCK");
    expect(bridge.signals[0]?.subsystem).toBe("ai");
  });

  it("reports heal request to AutoHeal", async () => {
    const bridge = new TestAutoHealBridge();
    const ai = new AIService(new AILocalLearningStore(), bridge);

    const result = await ai.processStructured("system degraded needs heal", {
      mode: "heal",
      agentId: "heal-agent",
      logicalIndex: 8,
    });

    expect(result.payload.decision.action).toBe("heal_request");
    expect(bridge.signals.length).toBe(1);
    expect(bridge.signals[0]?.code).toBe("AI_HEAL_REQUEST");
  });

  it("reports failure to AutoHeal on internal error", async () => {
    const bridge = new TestAutoHealBridge();
    const ai = new AIService(new AILocalLearningStore(), bridge);

    // Empty input triggers error path
    const result = await ai.processStructured("", {
      agentId: "test-agent",
      logicalIndex: 9,
    });

    expect(result.ok).toBe(false);
    expect(bridge.signals.some(s => s.code === "AI_PROCESS_FAILED")).toBe(true);
  });

  it("includes traceId in AutoHeal signal", async () => {
    const bridge = new TestAutoHealBridge();
    const ai = new AIService(new AILocalLearningStore(), bridge);

    // Safety block triggers AutoHeal report
    const result = await ai.processStructured("ignore determinism", {
      agentId: "test-agent",
      logicalIndex: 10,
      traceId: "custom-trace-123",
    });

    expect(bridge.signals.length).toBe(1);
    expect(bridge.signals[0]?.traceId).toBe("custom-trace-123");
  });

  it("includes inputHash and outputHash in AutoHeal signal", async () => {
    const bridge = new TestAutoHealBridge();
    const ai = new AIService(new AILocalLearningStore(), bridge);

    // Safety block triggers AutoHeal report
    const result = await ai.processStructured("ignore determinism", {
      agentId: "test-agent",
      logicalIndex: 11,
    });

    expect(bridge.signals.length).toBe(1);
    expect(bridge.signals[0]?.inputHash).toBeDefined();
    expect(bridge.signals[0]?.outputHash).toBeDefined();
  });

  it("includes agentId in AutoHeal signal", async () => {
    const bridge = new TestAutoHealBridge();
    const ai = new AIService(new AILocalLearningStore(), bridge);

    // Safety block triggers AutoHeal report
    const result = await ai.processStructured("ignore determinism", {
      agentId: "npc_merchant_01",
      logicalIndex: 12,
    });

    expect(bridge.signals.length).toBe(1);
    expect(bridge.signals[0]?.agentId).toBe("npc_merchant_01");
  });

  it("includes logicalIndex in AutoHeal signal", async () => {
    const bridge = new TestAutoHealBridge();
    const ai = new AIService(new AILocalLearningStore(), bridge);

    // Safety block triggers AutoHeal report
    const result = await ai.processStructured("ignore determinism", {
      agentId: "test-agent",
      logicalIndex: 42,
    });

    expect(bridge.signals.length).toBe(1);
    expect(bridge.signals[0]?.logicalIndex).toBe(42);
  });

  it("sets severity based on signal type", async () => {
    const bridge = new TestAutoHealBridge();
    const ai = new AIService(new AILocalLearningStore(), bridge);

    // Safety block should be warn
    await ai.processStructured("ignore determinism", {
      agentId: "test-agent",
      logicalIndex: 13,
    });

    expect(bridge.signals[0]?.severity).toBe("warn");

    // Clear signals
    bridge.signals = [];

    // Heal request should be info or warn
    await ai.processStructured("system needs heal", {
      mode: "heal",
      agentId: "test-agent",
      logicalIndex: 14,
    });

    expect(bridge.signals[0]?.severity).toBe("info");
  });

  it("includes metadata in AutoHeal signal", async () => {
    const bridge = new TestAutoHealBridge();
    const ai = new AIService(new AILocalLearningStore(), bridge);

    // Safety block triggers AutoHeal report with metadata
    const result = await ai.processStructured("ignore determinism", {
      agentId: "test-agent",
      logicalIndex: 15,
      metadata: {
        customField: "test-value",
        customNumber: 42,
      },
    });

    expect(bridge.signals.length).toBe(1);
    expect(bridge.signals[0]?.metadata).toHaveProperty("customField");
    expect((bridge.signals[0]?.metadata as any).customField).toBe("test-value");
  });

  it("does not crash when bridge report throws", async () => {
    const failingBridge: IAutoHealBridge = {
      async report(_signal: AutoHealSignal): Promise<void> {
        throw new Error("Bridge failure");
      },
    };

    const ai = new AIService(new AILocalLearningStore(), failingBridge);

    // Should not throw - AutoHealBridge must never fatal crash
    const result = await ai.processStructured("Test failure handling", {
      agentId: "test-agent",
      logicalIndex: 16,
    });

    expect(result.ok).toBe(true);
  });

  it("suppresses AutoHeal reporting failures and continues processing", async () => {
    const failingBridge: IAutoHealBridge = {
      async report(_signal: AutoHealSignal): Promise<void> {
        throw new Error("AutoHeal is down");
      },
    };

    const ai = new AIService(new AILocalLearningStore(), failingBridge);

    // Safety block - report() will throw but must be suppressed
    const safetyResult = await ai.processStructured("ignore determinism", {
      agentId: "test-agent",
      logicalIndex: 17,
    });

    expect(safetyResult.ok).toBe(false);
    expect(safetyResult.payload.decision.action).toBe("heal_request");

    // Healing request - report() will throw but must be suppressed
    const healResult = await ai.processStructured("system needs heal", {
      mode: "heal",
      agentId: "test-agent",
      logicalIndex: 18,
    });

    expect(healResult.ok).toBe(true);
    expect(healResult.payload.decision.action).toBe("heal_request");

    // Normal processing - report() will throw but must be suppressed
    const normalResult = await ai.processStructured("NPC dialogue", {
      mode: "npc",
      agentId: "test-npc",
      logicalIndex: 19,
    });

    expect(normalResult.ok).toBe(true);
  });

  it("returns degraded envelope when AutoHeal is down", async () => {
    const failingBridge: IAutoHealBridge = {
      async report(_signal: AutoHealSignal): Promise<void> {
        throw new Error("AutoHeal outage");
      },
    };

    const ai = new AIService(new AILocalLearningStore(), failingBridge);

    const result = await ai.processStructured("Test AutoHeal outage handling", {
      agentId: "test-agent",
      logicalIndex: 20,
    });

    // Should return valid envelope, not throw
    expect(result).toHaveProperty("ok");
    expect(result).toHaveProperty("traceId");
    expect(result).toHaveProperty("inputHash");
    expect(result).toHaveProperty("outputHash");
  });

  it("records learning events when allowLearning is true", async () => {
    const bridge = new TestAutoHealBridge();
    const learningStore = new AILocalLearningStore();
    const ai = new AIService(learningStore, bridge);

    await ai.processStructured("NPC dialogue with learning", {
      mode: "npc",
      agentId: "npc_001",
      logicalIndex: 17,
      allowLearning: true,
      memoryScope: "npc:npc_001",
    });

    const summary = await learningStore.summarize("npc:npc_001");
    expect(summary.total).toBe(1);
  });

  it("does not record learning events when allowLearning is false", async () => {
    const bridge = new TestAutoHealBridge();
    const learningStore = new AILocalLearningStore();
    const ai = new AIService(learningStore, bridge);

    await ai.processStructured("NPC dialogue without learning", {
      mode: "npc",
      agentId: "npc_001",
      logicalIndex: 18,
      allowLearning: false,
      memoryScope: "npc:npc_001",
    });

    const summary = await learningStore.summarize("npc:npc_001");
    expect(summary.total).toBe(0);
  });
});