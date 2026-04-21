import { describe, it, expect } from "vitest";
import { generateStep, generateStrandQuestPack } from "../modules/questline/questlineGenerator.js";

describe("QuestlineGenerator", () => {
  it("generateStep maps feature to step type", () => {
    const s = generateStep({
      strandKey: "A",
      questId: "q1",
      stepIndex: 0,
      cityId: "city_a",
      factionId: "kaiserreich_aelion",
      featureToIntroduce: "combat",
      flavor: "heilig",
    });
    expect(s.type).toBe("kill");
    expect(s.featureTriggers).toEqual(["combat"]);
    expect(s.description.length).toBeGreaterThan(10);
  });

  it("generateStrandQuestPack produces main quest with many steps", () => {
    const pack = generateStrandQuestPack({ questlineId: "testline", strandKey: "A" });
    expect(pack).not.toBeNull();
    expect(pack!.mainQuest.steps.length).toBeGreaterThan(10);
    expect(pack!.sideQuests.length).toBeGreaterThan(0);
    expect(pack!.warQuest).toBeTruthy();
    expect(pack!.pvpQuest).toBeTruthy();
    expect(pack!.region.cities.length).toBeGreaterThan(0);
  });

});
