import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { prepareMerchantNpcDecision } from "../../aurion/npc/merchantRules.js";
import { resolveNpcNeeds } from "../../aurion/npc/npcNeeds.js";
import { NPC_LIFE_RECEIPT_VERSION, advanceNpcMemory, createNpcLifeSnapshot, normalizeNpcRequest, npcHash, npcRequestHash, parseNpcMemory } from "../../aurion/npc/npcPersistenceProtocol.js";

describe("legacy merchant golden fixture", () => {
  it("preserves 80 isolated pre-gateway calculations without exporting their request builder", async () => {
    const baseline=JSON.parse(await readFile(new URL("./merchant-golden.json",import.meta.url),"utf8"));
    const previous=new Map<string, ReturnType<typeof createNpcLifeSnapshot>>();
    for (const expected of baseline.rows) {
      const prior=previous.get(expected.regionId) ?? null;
      const prepared=prepareMerchantNpcDecision({worldSeed:baseline.worldSeed,regionId:expected.regionId,resolutionIndex:expected.resolutionIndex,prior});
      expect(npcHash(prepared.resolution)).toBe(expected.resolutionHash);
      expect(npcHash(prepared.npcRequest)).toBe(expected.npcRequestHash);
      expect(npcHash(prepared.worldRequest)).toBe(expected.worldRequestHash);
      expect(npcHash(prepared.polityRequest)).toBe(expected.polityRequestHash);
      const input=normalizeNpcRequest(prepared.npcRequest);
      const snapshot=createNpcLifeSnapshot({...input,needs:resolveNpcNeeds({current:prior?.needs,events:input.needEvents}),
        memoryState:advanceNpcMemory(prior?.memoryState ?? parseNpcMemory("[]",-1),input.memory,input.resolutionIndex),...(prior && "lifeState" in prior ? {previousLifeState:prior.lifeState} : {})});
      expect(npcHash(snapshot)).toBe(expected.snapshotHash);
      expect(npcRequestHash(input,NPC_LIFE_RECEIPT_VERSION)).toMatch(/^[a-f0-9]{64}$/);
      previous.set(expected.regionId,snapshot);
    }
  });
});
