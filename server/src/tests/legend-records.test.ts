import { describe, expect, it } from "vitest";
import {
  createLegendCandidateFromWorldEvent,
  createLegendRecord,
  sortLegendRecords,
} from "../legends/LegendRecordTypes.js";
import type { LegendaryWorldEvent, SignificanceRulesContent } from "../legends/WorldEventSignificance.js";

const rules: SignificanceRulesContent = Object.freeze({
  schemaVersion: 1,
  rules: Object.freeze([
    Object.freeze({
      eventType: "territory_capture",
      baseKappa: 500,
      magnitudeWeightKappa: 500,
      participantWeightKappa: 20,
      thresholdKappa: 650,
    }),
    Object.freeze({
      eventType: "combat_result",
      baseKappa: 100,
      magnitudeWeightKappa: 100,
      participantWeightKappa: 10,
      thresholdKappa: 700,
    }),
  ]),
});

function territoryEvent(overrides: Partial<LegendaryWorldEvent> = {}): LegendaryWorldEvent {
  return Object.freeze({
    eventId: "event_territory_capture_001",
    type: "territory_capture",
    tick: 700,
    chunkKey: "chunk:4:9",
    actorIds: Object.freeze(["guild_1"]),
    targetIds: Object.freeze(["settlement_1"]),
    magnitudeKappa: 800,
    sourceHash: "world_event_hash_capture_001",
    ...overrides,
  });
}

describe("legend records", () => {
  it("creates identical LegendCandidate values for identical WorldEvents", () => {
    const first = createLegendCandidateFromWorldEvent(territoryEvent(), rules);
    const second = createLegendCandidateFromWorldEvent(territoryEvent(), rules);

    expect(first).not.toBeNull();
    expect(first).toEqual(second);
    expect(first?.origin).toBe("world_event");
    expect(first?.textSideChannelOnly).toBe(true);
  });

  it("does not create a LegendCandidate for low significance events", () => {
    const candidate = createLegendCandidateFromWorldEvent(
      Object.freeze({
        eventId: "event_minor_combat_001",
        type: "combat_result",
        tick: 701,
        magnitudeKappa: 50,
        actorIds: Object.freeze(["npc_1"]),
        targetIds: Object.freeze(["rat_1"]),
        sourceHash: "minor_combat_hash",
      }),
      rules,
    );

    expect(candidate).toBeNull();
  });

  it("sorts LegendRecords by significance, tick, and eventId", () => {
    const high = createLegendRecord(createLegendCandidateFromWorldEvent(territoryEvent({ eventId: "event_b", tick: 900, magnitudeKappa: 900 }), rules)!);
    const tieEarly = createLegendRecord(createLegendCandidateFromWorldEvent(territoryEvent({ eventId: "event_a", tick: 800, magnitudeKappa: 800 }), rules)!);
    const tieLate = createLegendRecord(createLegendCandidateFromWorldEvent(territoryEvent({ eventId: "event_c", tick: 900, magnitudeKappa: 800 }), rules)!);

    expect(sortLegendRecords([tieLate, high, tieEarly]).map((record) => record.eventId)).toEqual([
      "event_b",
      "event_a",
      "event_c",
    ]);
  });
});
