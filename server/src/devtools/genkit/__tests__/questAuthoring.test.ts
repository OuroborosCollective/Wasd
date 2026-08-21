import { describe, expect, it } from "vitest";
import {
  validateQuestContentDefinitionAgainstContext,
  type QuestContentReferenceContext,
} from "../../../modules/content/questContentContract.js";
import { loadAreloriaAuthoringContext } from "../worldContext.js";

describe("Areloria canonical quest authoring", () => {
  it("loads validated real content and produces a stable content receipt", () => {
    const first = loadAreloriaAuthoringContext();
    const second = loadAreloriaAuthoringContext();

    expect(first.validation).toEqual({ ok: true, errorCount: 0 });
    expect(first.sourceContentHash).toMatch(/^[a-f0-9]{64}$/);
    expect(first.sourceContentHash).toBe(second.sourceContentHash);
    expect(first.npcs.length).toBeGreaterThan(0);
    expect(first.items.length).toBeGreaterThan(0);
    expect(first.quests.length).toBeGreaterThan(0);
  });

  it("accepts only new quests whose references exist in the selected content", () => {
    const context = loadAreloriaAuthoringContext();
    const refs: QuestContentReferenceContext = {
      npcIds: new Set(context.npcs.map((npc) => npc.id)),
      itemIds: new Set(context.items.map((item) => item.id)),
      questIds: new Set(context.quests.map((quest) => quest.id)),
    };

    const valid = {
      id: "authoring_contract_probe",
      title: "Authoring Contract Probe",
      giverNpcId: context.npcs[0]!.id,
      targetNpcId: context.npcs[0]!.id,
      objectiveType: "talk_to",
      prerequisiteQuestIds: [context.quests[0]!.id],
      reward: { gold: 0, xp: 1 },
    };

    expect(
      validateQuestContentDefinitionAgainstContext(valid, refs, { allowExistingId: false })
    ).toEqual([]);

    const invalid = {
      ...valid,
      id: context.quests[0]!.id,
      giverNpcId: "npc_missing_from_real_content",
      reward: { gold: 0, xp: 1, itemId: "item_missing_from_real_content" },
      worldHash: "not-allowed-in-authored-content",
    };

    const errors = validateQuestContentDefinitionAgainstContext(invalid, refs, {
      allowExistingId: false,
    });
    expect(errors.join("\n")).toMatch(/forbidden authoritative field worldHash/);
    expect(errors.join("\n")).toMatch(/id already exists/);
    expect(errors.join("\n")).toMatch(/missing NPC/);
    expect(errors.join("\n")).toMatch(/missing item/);
  });
});
