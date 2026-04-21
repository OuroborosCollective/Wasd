import { describe, it, expect } from "vitest";
import {
  buildFeatureTriggerSchedule,
  featureCoverageReport,
  satisfyFeature,
  getTriggersForStep,
  FEATURE_DEFINITIONS,
} from "../modules/questline/featureTrigger.js";
import {
  getCrossroads,
  resolveCrossroadsChoice,
  buildChoiceUI,
  checkCrossroadsEligibility,
} from "../modules/questline/crossroadsResolver.js";

describe("FeatureTrigger schedule", () => {
  it("buildFeatureTriggerSchedule covers all ALL_GAME_FEATURES", () => {
    const steps = ["s1", "s2"];
    const strand = ["combat", "trading"];
    const sched = buildFeatureTriggerSchedule(steps, strand);
    expect(sched.length).toBeGreaterThan(20);
    const report = featureCoverageReport(sched);
    expect(report.totalCount).toBe(report.missing.length + report.coveredCount);
    for (const f of sched.slice(0, 3)) {
      expect(steps).toContain(f.questStepId);
    }
  });

  it("satisfyFeature and getTriggersForStep", () => {
    const sched = buildFeatureTriggerSchedule(["a"], ["combat"]);
    const forStep = getTriggersForStep(sched, "a");
    expect(forStep.length).toBeGreaterThan(0);
    satisfyFeature(sched, "combat");
    expect(getTriggersForStep(sched, "a").every((t) => t.featureId !== "combat" || t.satisfied)).toBe(true);
  });

  it("soulbinding uses requiredLevel 11", () => {
    expect(FEATURE_DEFINITIONS.soulbinding?.requiredLevel).toBe(11);
  });
});

describe("CrossroadsResolver", () => {
  it("resolveCrossroadsChoice returns worldEffect", () => {
    const r = resolveCrossroadsChoice("crossroads_main", "A", { playerId: "p1" });
    expect(r.choice.factionId).toBe("kaiserreich_aelion");
    expect(r.worldEffect.activateStrand).toBe("A");
    expect(r.worldEffect.requiredFeatures).toContain("combat");
  });

  it("buildChoiceUI returns entries", () => {
    const ui = buildChoiceUI("crossroads_main");
    expect(ui.length).toBe(3);
    expect(ui[0].kingdom).toBeTruthy();
  });

  it("checkCrossroadsEligibility requires quest", () => {
    const no = checkCrossroadsEligibility("crossroads_main", { completedQuests: [] });
    expect(no.eligible).toBe(false);
    const yes = checkCrossroadsEligibility("crossroads_main", { completedQuests: ["quest_tutorial_final"] });
    expect(yes.eligible).toBe(true);
  });

  it("getCrossroads clones template", () => {
    const a = getCrossroads("crossroads_main");
    const b = getCrossroads("crossroads_main");
    expect(a).not.toBe(b);
    expect(a?.id).toBe("crossroads_main");
  });
});
