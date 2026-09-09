import { describe, expect, it } from "vitest";
import { deriveNpcPersonality, parseNpcLifeState, resolveNpcLife, type NpcLifeOpportunity, type NpcRelationshipEvent } from "../../aurion/npc/npcLifeProtocol.js";
import type { NpcNeedState } from "../../aurion/npc/npcNeeds.js";

const needs = (overrides: Partial<NpcNeedState> = {}): NpcNeedState => ({ safety: .8, resources: .8, belonging: .8, status: .8, wealth: .8, power: .8, ...overrides });
const opportunity = (id: string, kind: NpcLifeOpportunity["kind"], resolutionIndex: number, benefitBps = 8_000): NpcLifeOpportunity => ({ id, kind, regionId: "observatory_threshold", targetId: kind === "social" ? "orun" : undefined, benefitBps, riskBps: 500, distanceBps: 500, sourceReceiptId: `receipt:${resolutionIndex}`, resolutionIndex });
const base = (resolutionIndex: number) => ({ npcId: "lyra", regionId: "observatory_threshold", roleId: "seer", resolutionIndex, needs: needs(), memoryEntries: [] as readonly { text: string; lastSeenIndex: number }[], observationIds: [`receipt:${resolutionIndex}`], relationshipEvents: [] as readonly NpcRelationshipEvent[], opportunities: [] as readonly NpcLifeOpportunity[] });

describe("AIM-263 autonomous deterministic NPC life", () => {
  it("derives a stable bounded personality without ambient randomness", () => {
    const lyra = deriveNpcPersonality("lyra");
    expect(lyra).toEqual(deriveNpcPersonality("lyra"));
    expect(lyra).not.toEqual(deriveNpcPersonality("orun"));
    expect(Object.values(lyra).every(value => Number.isInteger(value) && value >= 2_000 && value <= 8_000)).toBe(true);
    expect(Object.isFrozen(lyra)).toBe(true);
  });

  it("selects an urgent safety goal, binds a real opportunity, and is byte-for-byte deterministic", () => {
    const input = { ...base(10), needs: needs({ safety: 0, resources: 1, belonging: 1, status: 1, wealth: 1, power: 1 }), opportunities: [opportunity("safe:observatory", "safe_hub", 10)] };
    const first = resolveNpcLife(input);
    const second = resolveNpcLife({ ...input, opportunities: [...input.opportunities].reverse() });
    expect(first).toEqual(second);
    expect(first.decision.goal).toBe("seek_safety");
    expect(first.decision.plan).toMatchObject({ status: "planned", opportunityId: "safe:observatory" });
    expect(first.decision.plan.steps.map(step => step.action)).toEqual(["travel_to_safety", "recover_safety"]);
    expect(first.decision.decisionHash).toMatch(/^[a-f0-9]{64}$/);
    expect(first.state.stateHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("fails closed instead of inventing a plan when no confirmed opportunity exists", () => {
    const result = resolveNpcLife({ ...base(11), needs: needs({ wealth: 0, safety: 1, resources: 1, belonging: 1, status: 1, power: 1 }) });
    expect(result.decision.goal).toBe("trade");
    expect(result.decision.plan).toMatchObject({ status: "blocked", opportunityId: null, steps: [] });
  });

  it("uses receipt-bound relationship events canonically and rejects duplicate or self evidence", () => {
    const event = (id: string, targetId: string): NpcRelationshipEvent => ({ id, targetId, trustDeltaBps: 500, affectionDeltaBps: 900, fearDeltaBps: 0, rivalryDeltaBps: 0, debtDeltaCopper: 25, sourceReceiptId: "quest:receipt:1", resolutionIndex: 20 });
    const a = resolveNpcLife({ ...base(20), relationshipEvents: [event("rel:b", "orun"), event("rel:a", "torin")] });
    const b = resolveNpcLife({ ...base(20), relationshipEvents: [event("rel:a", "torin"), event("rel:b", "orun")] });
    expect(a).toEqual(b);
    expect(a.state.relationships.map(row => row.targetId)).toEqual(["orun", "torin"]);
    expect(a.state.relationships[0]).toMatchObject({ trustBps: 5_500, affectionBps: 900, debtCopper: 25 });
    expect(() => resolveNpcLife({ ...base(20), relationshipEvents: [event("same", "orun"), event("same", "torin")] })).toThrow("DUPLICATE_RELATIONSHIP_EVIDENCE");
    expect(() => resolveNpcLife({ ...base(20), relationshipEvents: [event("self", "lyra")] })).toThrow("RELATIONSHIP_EVENT_INVALID");
  });

  it("decays relationship emotion by logical resolution delta and never reads wall time", () => {
    const first = resolveNpcLife({ ...base(1), relationshipEvents: [{ id: "fear:event", targetId: "orun", trustDeltaBps: -1_000, affectionDeltaBps: 1_000, fearDeltaBps: 2_000, rivalryDeltaBps: 1_500, debtDeltaCopper: 0, sourceReceiptId: "combat:receipt", resolutionIndex: 1 }] });
    const later = resolveNpcLife({ ...base(101), previous: first.state, observationIds: ["receipt:101"] });
    expect(later.state.relationships[0]).toMatchObject({ trustBps: 4_100, affectionBps: 900, fearBps: 1_800, rivalryBps: 1_400, lastResolutionIndex: 101 });
  });

  it("gives recent memories bounded influence and lets that influence decay with logical age", () => {
    const recent = resolveNpcLife({ ...base(100), memoryEntries: [{ text: "danger:road:ambush", lastSeenIndex: 100 }] });
    const old = resolveNpcLife({ ...base(3_599), memoryEntries: [{ text: "danger:road:ambush", lastSeenIndex: 100 }] });
    expect(recent.decision.utilityBps.seek_safety).toBeGreaterThan(old.decision.utilityBps.seek_safety);
  });

  it("applies goal inertia for small score changes but a safety crisis overrides it", () => {
    const first = resolveNpcLife({ ...base(0), needs: needs({ wealth: .1 }), opportunities: [opportunity("market:1", "market", 0)] });
    expect(first.decision.goal).toBe("trade");
    const almostSame = resolveNpcLife({ ...base(1), previous: first.state, needs: needs({ wealth: .8, resources: .76 }), opportunities: [opportunity("market:2", "market", 1), opportunity("resource:2", "resource", 1)] });
    expect(almostSame.decision.goal).toBe("trade");
    const crisis = resolveNpcLife({ ...base(2), previous: almostSame.state, needs: needs({ safety: 0, wealth: 1 }), opportunities: [opportunity("safe:2", "safe_hub", 2)] });
    expect(crisis.decision.goal).toBe("seek_safety");
  });

  it("changes a long-term goal only after sustained logical time and a decisive score gap", () => {
    const first = resolveNpcLife({ ...base(0), needs: needs({ wealth: 0, safety: 1, resources: 1, belonging: 1, status: 1, power: 1 }), opportunities: [opportunity("market:0", "market", 0)] });
    expect(first.state.longTermGoal).toBe("trade");
    const early = resolveNpcLife({ ...base(999), previous: first.state, needs: needs({ resources: 0, wealth: 1, safety: 1, belonging: 1, status: 1, power: 1 }), opportunities: [opportunity("resource:999", "resource", 999)] });
    expect(early.state.longTermGoal).toBe("trade");
    const mature = resolveNpcLife({ ...base(1_000), previous: early.state, needs: needs({ resources: 0, wealth: 1, safety: 1, belonging: 1, status: 1, power: 1 }), opportunities: [opportunity("resource:1000", "resource", 1_000)] });
    expect(mature.state.longTermGoal).toBe("gather_resources");
  });

  it("persists an economy substate as immutable receipt-owned life state and detects tamper", () => {
    const result = resolveNpcLife({ ...base(3), economy: { currentHubId: "observatory_threshold", wealthCopper: 2_000, hungerBps: 4_000, fatigueBps: 3_000, tradeProwessBps: 10_500, harvestYieldBps: 10_000 } });
    expect(result.state.economy?.wealthCopper).toBe(2_000);
    expect(Object.isFrozen(result.state.economy)).toBe(true);
    const tampered = { ...result.state, decisionCount: result.state.decisionCount + 1 };
    expect(() => parseNpcLifeState(tampered)).toThrow("STATE_HASH_INVALID");
  });
});
