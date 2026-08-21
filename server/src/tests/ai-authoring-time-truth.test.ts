import { describe, expect, it } from "vitest";
import { AIService } from "../ai/AIService.js";
import type { IAutoHealBridge } from "../selfheal/AutoHeal.types.js";
import {
  canonicalAuthoringJson,
  compileAuthoringProposal,
  validateAuthoringProposal,
} from "../ai/genkit/AreloriaAuthoringCompiler.js";
import { GenkitAuthoringRuntime } from "../ai/genkit/GenkitAuthoringRuntime.js";

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
  });
});

describe("Genkit authoring truth boundary", () => {
  const proposal = {
    kind: "quest" as const,
    id: "quest.test.echoes",
    title: "Echoes in the Mill",
    summary: "A grounded test quest.",
    giverNpcRef: "npc.miller",
    factionRef: null,
    locationRef: "poi.old_mill",
    minLevel: 1,
    steps: [
      {
        id: "step.talk",
        title: "Speak to the miller",
        description: "Ask what happened at the mill.",
        objectiveType: "talk" as const,
        targetRef: "npc.miller",
        amount: 1,
        dependsOn: [],
      },
      {
        id: "step.explore",
        title: "Inspect the mill",
        description: "Explore the damaged mill floor.",
        objectiveType: "explore" as const,
        targetRef: "poi.old_mill",
        amount: 1,
        dependsOn: ["step.talk"],
      },
    ],
    rewards: [
      { kind: "xp" as const, targetRef: "skill.adventure", amount: 100 },
    ],
    worldConsequences: ["Unlock a follow-up conversation with npc.miller."],
    resonanceKappa: 500,
    provenance: {
      schemaVersion: "areloria-authoring-v1" as const,
      requestId: "request.test.echoes",
      authorId: "chatgpt",
      sourceRefs: ["poi.old_mill", "npc.miller"],
      canonicalTickContext: 900,
    },
  };

  it("compiles the same proposal to byte-identical canonical JSON and SHA-256", () => {
    const reordered = {
      ...proposal,
      provenance: {
        canonicalTickContext: 900,
        sourceRefs: ["poi.old_mill", "npc.miller"],
        authorId: "chatgpt",
        requestId: "request.test.echoes",
        schemaVersion: "areloria-authoring-v1" as const,
      },
    };

    const first = compileAuthoringProposal(proposal);
    const second = compileAuthoringProposal(reordered);

    expect(first.canonicalJson).toBe(second.canonicalJson);
    expect(first.proposalHash).toBe(second.proposalHash);
    expect(first.proposalHash).toMatch(/^[0-9a-f]{64}$/);
    expect(first.targetPath).toBe("game-data/quests/generated/quest.test.echoes.json");
  });

  it("rejects a cyclic quest graph", () => {
    const invalid = structuredClone(proposal);
    invalid.steps[0]!.dependsOn = ["step.explore"];

    const validation = validateAuthoringProposal(invalid);
    expect(validation.ok).toBe(false);
    expect(validation.errors.some((error) => error.startsWith("cyclic_step_dependency:"))).toBe(true);
  });

  it("does not fabricate authoring availability without credentials", () => {
    const runtime = new GenkitAuthoringRuntime({ apiKey: "" });
    const status = runtime.getStatus();

    expect(status.available).toBe(false);
    expect(status.authority).toBe("authoring_side_channel");
  });

  it("canonical serialization is independent of object key insertion order", () => {
    expect(canonicalAuthoringJson({ b: 2, a: { z: 3, y: 4 } })).toBe(
      canonicalAuthoringJson({ a: { y: 4, z: 3 }, b: 2 }),
    );
  });
});