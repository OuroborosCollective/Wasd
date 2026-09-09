import { describe, expect, it } from "vitest";
import { NPC_LIFE_RECEIPT_VERSION, advanceNpcMemory, createNpcLifeSnapshot, createNpcSnapshot, decodeNpcReceipt, encodeNpcLifeReceipt, encodeNpcReceipt, normalizeNpcRequest, npcHash, npcRequestHash, parseNpcMemory } from "../../aurion/npc/npcPersistenceProtocol.js";
import { resolveNpcNeeds } from "../../aurion/npc/npcNeeds.js";

const empty = () => parseNpcMemory("[]", -1);
describe("AIM-263 deterministic immutable NPC persistence", () => {
  it("bounds memory and chooses the same tie order independently of observation order", () => {
    const prior = advanceNpcMemory(empty(), Array.from({ length: 24 }, (_,i) => `prior-${i}`), 1);
    const texts = Array.from({ length: 24 }, (_,i) => `next-${i}`);
    const first = advanceNpcMemory(prior, texts, 2);
    expect(first).toEqual(advanceNpcMemory(prior, [...texts].reverse(), 2));
    expect(first.entries).toHaveLength(24);
    expect(first.entries.every(e => e.lastSeenIndex === 2)).toBe(true);
    expect(() => (first.entries as unknown as unknown[]).push({})).toThrow();
    expect(() => { (first.entries[0] as { text: string }).text = "changed"; }).toThrow();
    expect(prior.entries.every(e => e.text.startsWith("prior-"))).toBe(true);
  });
  it("expires exactly at the logical age boundary and rehydrates legacy valid arrays", () => {
    const memory = parseNpcMemory('["danger:route"]', 10);
    expect(advanceNpcMemory(memory, [], 3509).entries).toHaveLength(1);
    expect(advanceNpcMemory(memory, [], 3510).entries).toHaveLength(0);
    expect(advanceNpcMemory(memory, ["danger:route"], 3510).entries[0].lastSeenIndex).toBe(3510);
    expect(() => parseNpcMemory('{"unrecognized":true}', 10)).toThrow();
    expect(() => parseNpcMemory('[null]', 10)).toThrow();
  });
  it("validates event indices and canonicalizes repeated requests without ambient clocks or entropy", () => {
    const input = { npcId: "lyra", regionId: "observatory_threshold", resolutionIndex: 3, needEvents: [], observationIds: ["b", "a"], memory: ["z", "a"] };
    expect(npcHash(normalizeNpcRequest(input))).toBe(npcHash(normalizeNpcRequest({ ...input, observationIds: ["a", "b"], memory: ["a", "z"] })));
    expect(() => normalizeNpcRequest({ ...input, observationIds: ["a", "a"] })).toThrow("DUPLICATE");
    expect(() => normalizeNpcRequest({ ...input, resolutionIndex: 2147483648 })).toThrow();
    expect(() => normalizeNpcRequest({ ...input, needEvents: [{ id: "evt", need: "safety", delta: .1, sourceReceiptId: "receipt", resolutionIndex: 2 }] })).toThrow("RESOLUTION_MISMATCH");
  });
  it("returns only the exact legacy v2 receipt snapshot and rejects tamper, identity and retry conflicts", () => {
    const snapshot = createNpcSnapshot({ npcId: "lyra", regionId: "observatory_threshold", resolutionIndex: 2, needs: resolveNpcNeeds({ events: [] }), observationIds: ["receipt:1"], memoryState: advanceNpcMemory(empty(), ["remember"], 2) });
    const requestHash = npcHash({ request: 1 });
    const raw = encodeNpcReceipt(requestHash, snapshot);
    const expected = { npcId: snapshot.npcId, regionId: snapshot.regionId, resolutionIndex: 2, goal: snapshot.decision.goal, decisionHash: snapshot.decision.decisionHash, requestHash };
    expect(decodeNpcReceipt(raw, expected)).toEqual(snapshot);
    expect(() => decodeNpcReceipt(raw, { ...expected, requestHash: npcHash({ request: 2 }) })).toThrow("INPUT_CONFLICT");
    expect(() => decodeNpcReceipt(raw, { ...expected, npcId: "orun" })).toThrow("CORRUPT");
    const tampered = JSON.parse(raw); tampered.snapshot.needs.safety = .999;
    expect(() => decodeNpcReceipt(JSON.stringify(tampered), expected)).toThrow("CORRUPT");
    expect(() => decodeNpcReceipt('["old"]', expected)).toThrow("RECONCILIATION");
    expect(() => decodeNpcReceipt(" ".repeat(65536), expected)).toThrow("CORRUPT");
  });
  it("stores the full autonomous life state in v3 and rejects coordinated snapshot tamper", () => {
    const input = normalizeNpcRequest({ npcId: "lyra", regionId: "observatory_threshold", resolutionIndex: 7, roleId: "seer", needEvents: [], observationIds: ["world:7"], memory: ["danger:road"], opportunities: [{ id: "safe:7", kind: "safe_hub", regionId: "observatory_threshold", targetId: "hub:observatory_threshold", benefitBps: 8000, riskBps: 500, distanceBps: 0, sourceReceiptId: "world:7", resolutionIndex: 7 }], economy: { currentHubId: "observatory_threshold", wealthCopper: 1200, hungerBps: 2000, fatigueBps: 1500, tradeProwessBps: 10500, harvestYieldBps: 10000 } });
    const memoryState = advanceNpcMemory(empty(),input.memory,input.resolutionIndex);
    const snapshot = createNpcLifeSnapshot({ ...input, needs: resolveNpcNeeds({ events: [] }), memoryState });
    const requestHash = npcRequestHash(input,NPC_LIFE_RECEIPT_VERSION);
    const raw = encodeNpcLifeReceipt(requestHash,snapshot);
    const expected = { npcId: snapshot.npcId, regionId: snapshot.regionId, resolutionIndex: 7, goal: snapshot.decision.goal, decisionHash: snapshot.decision.decisionHash, requestHash };
    expect(decodeNpcReceipt(raw,expected)).toEqual(snapshot);
    expect("lifeState" in decodeNpcReceipt(raw,expected)).toBe(true);
    const tampered = JSON.parse(raw); tampered.snapshot.lifeState.personality.ambitionBps += 1; tampered.snapshotHash = npcHash(tampered.snapshot);
    expect(() => decodeNpcReceipt(JSON.stringify(tampered),expected)).toThrow("STATE_HASH_INVALID");
    const wrongRequest = { ...input, opportunities: [{ ...input.opportunities[0]!, benefitBps: 7999 }] };
    expect(() => decodeNpcReceipt(raw,{ ...expected, requestHash: npcRequestHash(wrongRequest,NPC_LIFE_RECEIPT_VERSION) })).toThrow("INPUT_CONFLICT");
  });
});
