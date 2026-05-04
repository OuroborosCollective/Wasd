// @ts-nocheck
import { describe, it, expect } from "vitest";
import { QuestEngine } from "../modules/quest/QuestEngine.js";
import { generateStrandQuestPack } from "../modules/questline/questlineGenerator.js";
import {
  applyQuestCompletionToQuestline,
  registerProceduralQuestPack,
  registeredProceduralQuestIdsByQuestline,
} from "../modules/questline/questlineBridge.js";
import { QuestlineEngine } from "../modules/questline/questlineEngine.js";

describe("questline bridge + quest completion hook", () => {
  it("registerProceduralQuestPack registers chain and procedural ids map", () => {
    const engine = new QuestEngine();
    const pack = generateStrandQuestPack({ questlineId: "t1", strandKey: "A", cityCount: 2 });
    expect(pack).not.toBeNull();
    const ids = registerProceduralQuestPack(engine, pack!, "t1");
    expect(ids).toContain("ql_t1_step_0");
    expect(registeredProceduralQuestIdsByQuestline.get("t1")).toEqual(ids);
    const def0 = engine.getQuestDefinitions().get("ql_t1_step_0");
    expect((def0 as any)?.questlineNextQuestId).toBe("ql_t1_step_1");
  });

  it("completeQuest runs hook and satisfies feature schedule", () => {
    const qe = new QuestEngine();
    const qid = "mainline_awakening";
    const pack = generateStrandQuestPack({ questlineId: qid, strandKey: "A", cityCount: 2 });
    registerProceduralQuestPack(qe, pack!, qid);
    const ql = new QuestlineEngine();
    const state = ql.startQuestline(qid);
    expect(state).not.toBeNull();
    state!.proceduralQuestIds = registeredProceduralQuestIdsByQuestline.get(qid) ?? [];

    const player: any = {
      id: "p1",
      quests: [],
      questlineRuntime: {
        ...state!,
        activeQuestlineId: qid,
        featureSchedule: pack!.featureSchedule.map((x) => ({ ...x })),
      },
    };
    qe.startQuest(player, `ql_${qid}_step_0`);
    const row = player.quests.find((q: any) => q.id === `ql_${qid}_step_0`);
    const def = qe.getQuestDefinitions().get(`ql_${qid}_step_0`);
    qe.setOnQuestCompleted((p, r, d) => {
      applyQuestCompletionToQuestline(p, r, d, qe);
    });
    qe.completeQuest(player, `ql_${qid}_step_0`);
    expect(row?.completed).toBe(true);
    const feat = def?.questlineFeatureId;
    if (feat) {
      expect(player.questlineRuntime.unlockedFeatures).toContain(feat);
    }
    const next = player.quests.find((q: any) => q.id === `ql_${qid}_step_1`);
    expect(next).toBeTruthy();
  });
});
