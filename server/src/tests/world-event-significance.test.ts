import { describe, expect, it } from "vitest";
import {
  loadSignificanceRules,
  scoreWorldEventSignificance,
  type LegendaryWorldEvent,
} from "../legends/WorldEventSignificance.js";

describe("world event significance", () => {
  const event: LegendaryWorldEvent = Object.freeze({
    eventId: "event_resource_collapse_001",
    type: "major_resource_collapse",
    tick: 500,
    chunkKey: "chunk:0:0",
    actorIds: Object.freeze(["settlement_1"]),
    targetIds: Object.freeze(["iron_vein_7"]),
    magnitudeKappa: 700,
    sourceHash: "world_event_hash_001",
  });

  it("loads significance rules from game-data", () => {
    const rules = loadSignificanceRules();

    expect(rules.schemaVersion).toBe(1);
    expect(rules.rules.length).toBeGreaterThan(0);
    expect(rules.rules.some((rule) => rule.eventType === "major_resource_collapse")).toBe(true);
  });

  it("calculates deterministic significance scores", () => {
    const rules = loadSignificanceRules();
    const first = scoreWorldEventSignificance(event, rules);
    const second = scoreWorldEventSignificance(event, rules);

    expect(first).toEqual(second);
    expect(first.scoreKappa).toBeGreaterThan(0);
    expect(first.scoreHash).toMatch(/^[0-9a-f]+$/);
  });

  it("returns zero score for event types without loaded rules", () => {
    const result = scoreWorldEventSignificance(event, Object.freeze({ schemaVersion: 1, rules: Object.freeze([]) }));

    expect(result.scoreKappa).toBe(0);
    expect(result.qualifies).toBe(false);
  });
});
