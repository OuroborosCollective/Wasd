/**
 * AIService.determinism.test.ts
 * Determinism verification tests for the AI core.
 */

import { describe, expect, it } from "vitest";
import { AIService } from "../ai/AIService.js";

describe("AIService determinism", () => {
  it("produces stable hashes for same input and options", async () => {
    const ai = new AIService();

    const a = await ai.processStructured("Trade with merchant", {
      mode: "npc",
      agentId: "npc_merchant",
      logicalIndex: 10,
      kappa: 1000,
      resonance: 1,
      traceId: "fixed-trace",
    });

    const b = await ai.processStructured("Trade with merchant", {
      mode: "npc",
      agentId: "npc_merchant",
      logicalIndex: 10,
      kappa: 1000,
      resonance: 1,
      traceId: "fixed-trace",
    });

    expect(a.inputHash).toBe(b.inputHash);
    expect(a.outputHash).toBe(b.outputHash);
    expect(a.payload.axiomHash).toBe(b.payload.axiomHash);
    expect(a.payload.decision.intent).toBe(b.payload.decision.intent);
  });

  it("forces kappa invariant to 1000", async () => {
    const ai = new AIService();

    const result = await ai.processStructured("Kappa check", {
      kappa: 123,
    });

    expect(result.kappa).toBe(1000);
  });

  it("forces kappa invariant to 1000 even with invalid values", async () => {
    const ai = new AIService();

    const result = await ai.processStructured("Kappa check", {
      kappa: -500,
    });

    expect(result.kappa).toBe(1000);
  });

  it("produces different hashes for different inputs", async () => {
    const ai = new AIService();

    const result1 = await ai.processStructured("Input A", {
      mode: "deterministic",
      agentId: "test",
      logicalIndex: 1,
      kappa: 1000,
      resonance: 1,
    });

    const result2 = await ai.processStructured("Input B", {
      mode: "deterministic",
      agentId: "test",
      logicalIndex: 1,
      kappa: 1000,
      resonance: 1,
    });

    expect(result1.inputHash).not.toBe(result2.inputHash);
    expect(result1.payload.axiomHash).not.toBe(result2.payload.axiomHash);
  });

  it("produces different hashes for different modes", async () => {
    const ai = new AIService();

    const result1 = await ai.processStructured("Same input", {
      mode: "npc",
      agentId: "test",
      logicalIndex: 1,
      kappa: 1000,
      resonance: 1,
    });

    const result2 = await ai.processStructured("Same input", {
      mode: "swarm",
      agentId: "test",
      logicalIndex: 1,
      kappa: 1000,
      resonance: 1,
    });

    expect(result1.payload.axiomHash).not.toBe(result2.payload.axiomHash);
  });

  it("produces different hashes for different logical indexes", async () => {
    const ai = new AIService();

    const result1 = await ai.processStructured("Same input", {
      mode: "deterministic",
      agentId: "test",
      logicalIndex: 1,
      kappa: 1000,
      resonance: 1,
    });

    const result2 = await ai.processStructured("Same input", {
      mode: "deterministic",
      agentId: "test",
      logicalIndex: 2,
      kappa: 1000,
      resonance: 1,
    });

    expect(result1.payload.axiomHash).not.toBe(result2.payload.axiomHash);
  });

  it("normalizes resonance to 6 decimal places", async () => {
    const ai = new AIService();

    const result = await ai.processStructured("Resonance check", {
      resonance: 0.123456789,
    });

    // Resonance should be truncated to 6 decimal places
    expect(result.resonance).toBe(0.123456);
  });

  it("clamps resonance to valid range", async () => {
    const ai = new AIService();

    const result1 = await ai.processStructured("Resonance check", {
      resonance: -100,
    });

    const result2 = await ai.processStructured("Resonance check", {
      resonance: 2000000,
    });

    expect(result1.resonance).toBe(0);
    expect(result2.resonance).toBe(1_000_000);
  });

  it("returns consistent decision for same input across multiple calls", async () => {
    const ai = new AIService();

    const results = await Promise.all([
      ai.processStructured("Consistent input test", {
        mode: "npc",
        agentId: "test_npc",
        logicalIndex: 5,
        kappa: 1000,
        resonance: 1,
        traceId: "consistency-check",
      }),
      ai.processStructured("Consistent input test", {
        mode: "npc",
        agentId: "test_npc",
        logicalIndex: 5,
        kappa: 1000,
        resonance: 1,
        traceId: "consistency-check",
      }),
      ai.processStructured("Consistent input test", {
        mode: "npc",
        agentId: "test_npc",
        logicalIndex: 5,
        kappa: 1000,
        resonance: 1,
        traceId: "consistency-check",
      }),
    ]);

    for (let i = 1; i < results.length; i++) {
      expect(results[i].inputHash).toBe(results[0].inputHash);
      expect(results[i].payload.decision.intent).toBe(results[0].payload.decision.intent);
    }
  });
});