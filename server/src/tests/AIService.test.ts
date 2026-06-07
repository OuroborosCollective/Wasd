/**
 * AIService.test.ts
 * Basic functionality tests for the real AI core.
 */

import { describe, expect, it } from "vitest";
import { AIService } from "../ai/AIService.js";

describe("AIService real core", () => {
  it("keeps process API working", async () => {
    const ai = new AIService();
    const output = await ai.process("NPC greets player");

    expect(output).toContain("Deterministische Entscheidung");
    expect(output).toContain("confidence=");
  });

  it("keeps generateResponse API working", async () => {
    const ai = new AIService();
    const output = await ai.generateResponse("Swarm checks world status");

    expect(output).toContain("Swarm-Konsens");
  });

  it("returns real structured decision", async () => {
    const ai = new AIService();

    const result = await ai.processStructured("NPC starts quest dialogue", {
      mode: "npc",
      agentId: "npc_001",
      logicalIndex: 42,
      kappa: 1000,
      resonance: 0.75,
    });

    expect(result.ok).toBe(true);
    expect(result.payload.decision.action).toBe("command_proposal");
    expect(result.payload.decision.intent).toBe("quest_dialogue");
    expect(result.payload.decision.command?.type).toBe("AI_DIALOGUE_PROPOSAL");
  });

  it("produces deterministic output for same input", async () => {
    const ai = new AIService();

    const result1 = await ai.processStructured("Test NPC dialogue", {
      mode: "npc",
      agentId: "test_npc",
      logicalIndex: 1,
      kappa: 1000,
      resonance: 1,
      traceId: "fixed-trace-id",
    });

    const result2 = await ai.processStructured("Test NPC dialogue", {
      mode: "npc",
      agentId: "test_npc",
      logicalIndex: 1,
      kappa: 1000,
      resonance: 1,
      traceId: "fixed-trace-id",
    });

    expect(result1.inputHash).toBe(result2.inputHash);
    expect(result1.outputHash).toBe(result2.outputHash);
    expect(result1.payload.axiomHash).toBe(result2.payload.axiomHash);
  });

  it("returns AREEnvelope with all required fields", async () => {
    const ai = new AIService();

    const result = await ai.processStructured("System diagnostic check", {
      mode: "system",
      agentId: "system_001",
      logicalIndex: 5,
    });

    expect(result).toHaveProperty("ok");
    expect(result).toHaveProperty("mode");
    expect(result).toHaveProperty("agentId");
    expect(result).toHaveProperty("traceId");
    expect(result).toHaveProperty("createdAt");
    expect(result).toHaveProperty("logicalIndex");
    expect(result).toHaveProperty("kappa");
    expect(result).toHaveProperty("resonance");
    expect(result).toHaveProperty("inputHash");
    expect(result).toHaveProperty("outputHash");
    expect(result).toHaveProperty("durationMs");
    expect(result).toHaveProperty("payload");
    expect(result).toHaveProperty("warnings");
    expect(result).toHaveProperty("metadata");
  });

  it("handles empty input gracefully", async () => {
    const ai = new AIService();
    const output = await ai.process("");

    expect(output).toContain("degradierter Fallback");
  });

  it("supports swarm mode", async () => {
    const ai = new AIService();

    const result = await ai.processStructured("Swarm consensus for coordination", {
      mode: "swarm",
      agentId: "swarm_agent_01",
      logicalIndex: 10,
    });

    expect(result.ok).toBe(true);
    // Intent detection finds "swarm" in input -> swarm_consensus
    expect(result.payload.decision.command?.type).toBe("AI_SWARM_CONSENSUS");
  });

  it("supports diagnostic mode", async () => {
    const ai = new AIService();

    const result = await ai.processStructured("Watchdog error detection", {
      mode: "diagnostic",
      agentId: "watchdog",
      logicalIndex: 20,
    });

    expect(result.ok).toBe(true);
    expect(result.payload.decision.intent).toBe("diagnostic_check");
  });
});