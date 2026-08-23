import { describe, expect, it } from "vitest";
import { assertSideChannelPayload } from "../contracts.js";
import {
  QuestContentCandidateSchema,
  WorldObjectCandidateSchema,
  candidateSha256,
  validateQuestContentCandidate,
  validateWorldObjectCandidate,
} from "../contentAuthoring.js";

describe("Areloria Genkit schema-bound content authoring", () => {
  const quest = QuestContentCandidateSchema.parse({
    id: "millbrook_echoes",
    title: "Echoes at the Old Mill",
    giverNpcId: "npc_guide",
    targetNpcId: "npc_1",
    objectiveType: "talk_to",
    prerequisiteQuestIds: ["starter_welcome"],
    reward: { gold: 25, xp: 50 },
  });

  it("produces stable candidate receipts independent of object key insertion order", () => {
    const reordered = {
      reward: { xp: 50, gold: 25 },
      prerequisiteQuestIds: ["starter_welcome"],
      objectiveType: "talk_to",
      targetNpcId: "npc_1",
      giverNpcId: "npc_guide",
      title: "Echoes at the Old Mill",
      id: "millbrook_echoes",
    };

    expect(candidateSha256(quest)).toBe(candidateSha256(reordered));
    expect(candidateSha256(quest)).toMatch(/^[a-f0-9]{64}$/);
  });

  it("validates quest ids and prerequisites against real authored-shape inputs", () => {
    const checks = validateQuestContentCandidate(quest, [
      { id: "starter_welcome" },
      { id: "village_tour" },
    ]);

    expect(checks).toContain("quest_id_unique_against_authored_content");
    expect(checks).toContain("prerequisite_ids_exist_in_authored_content");
    expect(checks).toContain("objective_shape_matches_authored_contract");
    expect(() => validateQuestContentCandidate(quest, [{ id: "millbrook_echoes" }])).toThrow(
      /GENKIT_QUEST_ID_ALREADY_EXISTS/,
    );
  });

  it("rejects missing authored prerequisites and invalid objective shapes", () => {
    expect(() =>
      validateQuestContentCandidate(
        { ...quest, prerequisiteQuestIds: ["quest_that_does_not_exist"] },
        [{ id: "starter_welcome" }],
      ),
    ).toThrow(/GENKIT_QUEST_PREREQUISITE_NOT_FOUND/);

    expect(() =>
      validateQuestContentCandidate(
        QuestContentCandidateSchema.parse({
          id: "broken_collect",
          title: "Broken Collect",
          giverNpcId: "npc_guide",
          objectiveType: "collect",
          reward: { gold: 0, xp: 1 },
        }),
        [],
      ),
    ).toThrow(/GENKIT_QUEST_COLLECT_ITEM_REQUIRED/);
  });

  it("validates world-object candidates against the authored objects contract", () => {
    const object = WorldObjectCandidateSchema.parse({
      id: "obj_old_mill_marker",
      type: "landmark",
      name: "Old Mill Marker",
      position: { x: 12, y: -3 },
      rotation: 0,
      scale: 1,
      glbPath: "/assets/models/props/old_mill.glb",
      interaction: { type: "inspect", targetId: "old_mill" },
    });

    expect(validateWorldObjectCandidate(object, [{ id: "obj_worldboss_portal_obsidian" }])).toContain(
      "world_object_id_unique_against_authored_content",
    );
    expect(() => validateWorldObjectCandidate(object, [{ id: "obj_old_mill_marker" }])).toThrow(
      /GENKIT_WORLD_OBJECT_ID_ALREADY_EXISTS/,
    );
    expect(() => WorldObjectCandidateSchema.parse({ ...object, glbPath: "https://example.com/fake.glb" })).toThrow();
  });

  it("keeps implementation-ready candidates inside the Genkit side-channel contract", () => {
    expect(() => assertSideChannelPayload(quest)).not.toThrow();
    expect(() =>
      assertSideChannelPayload({
        targetContentPath: "game-data/quests/quests.json",
        operation: "append_candidate",
        candidate: quest,
      }),
    ).not.toThrow();
  });
});