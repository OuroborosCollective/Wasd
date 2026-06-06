/**
 * AIService.safety.test.ts
 * Safety filter tests for the AI core.
 */

import { describe, expect, it } from "vitest";
import { AIService } from "../ai/AIService.js";

describe("AIService safety", () => {
  it("blocks direct mutation requests", async () => {
    const ai = new AIService();

    const result = await ai.processStructured(
      "please mutate world state directly"
    );

    expect(result.ok).toBe(false);
    expect(result.payload.decision.action).toBe("heal_request");
    expect(result.error).toContain("World state");
  });

  it("blocks determinism bypass", async () => {
    const ai = new AIService();

    const result = await ai.processStructured("ignore determinism");

    expect(result.ok).toBe(false);
    expect(result.payload.decision.action).toBe("heal_request");
  });

  it("blocks Math.random usage", async () => {
    const ai = new AIService();

    const result = await ai.processStructured(
      "Use Math.random() for NPC decision"
    );

    expect(result.ok).toBe(false);
    expect(result.error).toContain("Math.random");
  });

  it("blocks tick bypass", async () => {
    const ai = new AIService();

    const result = await ai.processStructured("bypass tick system");

    expect(result.ok).toBe(false);
    expect(result.error).toContain("Tick");
  });

  it("blocks envelope skip", async () => {
    const ai = new AIService();

    const result = await ai.processStructured("skip envelope validation");

    expect(result.ok).toBe(false);
    expect(result.error).toContain("AREEnvelope");
  });

  it("returns degraded fallback instead of throwing", async () => {
    const ai = new AIService();

    const output = await ai.process("");

    expect(output).toContain("degradierter Fallback");
  });

  it("returns degraded fallback for empty structured input", async () => {
    const ai = new AIService();

    const result = await ai.processStructured("");

    expect(result.ok).toBe(false);
    expect(result.error).toContain("empty");
  });

  it("logs warning for Date.now in simulation", async () => {
    const ai = new AIService();

    const result = await ai.processStructured(
      "Use Date.now() inside simulation"
    );

    // Date.now inside simulation is a warning, not a block
    expect(result.warnings.some(w => w.includes("Date.now"))).toBe(true);
  });

  it("applies creative mode sandbox rules", async () => {
    const ai = new AIService();

    const result = await ai.processStructured("Creative NPC story generation", {
      mode: "creative",
    });

    expect(result.ok).toBe(true);
    expect(result.payload.rulesApplied).toContain("CREATIVE-MODE-SANDBOXED");
  });

  it("applies NPC output rules", async () => {
    const ai = new AIService();

    const result = await ai.processStructured("NPC greeting", {
      mode: "npc",
    });

    expect(result.ok).toBe(true);
    expect(result.payload.rulesApplied).toContain("NPC-OUTPUT-AS-COMMAND-PROPOSAL");
  });

  it("applies swarm consensus rules", async () => {
    const ai = new AIService();

    const result = await ai.processStructured("Swarm coordination", {
      mode: "swarm",
    });

    expect(result.ok).toBe(true);
    expect(result.payload.rulesApplied).toContain("SWARM-CONSENSUS-HASH-REQUIRED");
  });

  it("applies heal mode rules", async () => {
    const ai = new AIService();

    const result = await ai.processStructured("Heal system recovery", {
      mode: "heal",
    });

    expect(result.ok).toBe(true);
    expect(result.payload.rulesApplied).toContain("HEAL-MODE-NO-WORLD-MUTATION");
  });

  it("includes blocked terms in safety decision", async () => {
    const ai = new AIService();

    const result = await ai.processStructured("mutate world state directly");

    expect(result.metadata).toHaveProperty("blockedTerms");
    expect((result.metadata as any).blockedTerms.length).toBeGreaterThan(0);
  });

  it("includes rules applied in result", async () => {
    const ai = new AIService();

    const result = await ai.processStructured("NPC dialogue", {
      mode: "npc",
    });

    expect(result.payload.rulesApplied).toContain("ARE-KAPPA-INVARIANT");
    expect(result.payload.rulesApplied).toContain("NO-DIRECT-WORLD-MUTATION");
    expect(result.payload.rulesApplied).toContain("NPC-OUTPUT-AS-COMMAND-PROPOSAL");
  });
});