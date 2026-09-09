import assert from "node:assert/strict";
import test from "node:test";
import { readFile, mkdtemp, cp, writeFile, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { verifyNpcCapsule } from "../verify-aurion-npc-capsule.mjs";

const directory = process.env.WASD_NPC_CAPSULE_DIR;
if (!directory) throw Error("WASD_NPC_CAPSULE_DIR_REQUIRED");
const url = pathToFileURL(path.join(directory,"index.js")).href;
const npc = await import(url);
const manifest = JSON.parse(await readFile(path.join(directory,"manifest.json"),"utf8"));
const golden = JSON.parse(await readFile(new URL("../../server/src/tests/aurion-npc/legacy-golden.json",import.meta.url),"utf8"));

// Explicit isolated protocol fixtures, never production or external provider evidence.
function fixture(tick, { name = "lyra", safety = 1, wealth = 0, memory = [], hub = "observatory_threshold" } = {}) {
  const request = npc.normalizeNpcRequest({ npcId:name, regionId:hub, resolutionIndex:tick, needEvents:[], observationIds:[`test-event:${tick}`], memory, roleId:"merchant",
    economy:{ currentHubId:hub, wealthCopper:1200, hungerBps:2000, fatigueBps:1500, tradeProwessBps:10500, harvestYieldBps:10000 } });
  const snapshot = npc.createNpcLifeSnapshot({ ...request,
    needs:npc.resolveNpcNeeds({ current:{ safety, resources:1, belonging:1, status:1, wealth, power:1 }, events:[] }),
    memoryState:npc.advanceNpcMemory(npc.parseNpcMemory("[]",-1),memory,tick),
  });
  const raw = npc.encodeNpcLifeReceipt(npc.npcRequestHash(request,npc.NPC_LIFE_RECEIPT_VERSION),snapshot);
  const expected = { receiptId:`npc_${npc.npcHash([npc.NPC_LIFE_RECEIPT_VERSION,name,tick]).slice(0,56)}`, npcId:name, regionId:hub, resolutionIndex:tick, goal:snapshot.decision.goal, decisionHash:snapshot.decision.decisionHash };
  return { raw, expected, confirmed:npc.verifyConfirmedNpcDecision(raw,expected) };
}

test("compiled runtime binds its real WASD source manifest", () => {
  assert.deepEqual(npc.npcAuthority(),{ rulesetVersion:npc.WASD_NPC_MEMORY_RULESET,sourceRevision:manifest.sourceRevision,sourceSha256:manifest.sourceSha256 });
  assert.equal(Object.isFrozen(npc.npcAuthority()),true);
});

test("original v2/v3 golden receipts retain their exact bytes after source migration", () => {
  const v2=npc.createNpcSnapshot({npcId:"lyra",regionId:"observatory_threshold",resolutionIndex:2,needs:npc.resolveNpcNeeds({events:[]}),observationIds:["receipt:1"],memoryState:npc.advanceNpcMemory(npc.parseNpcMemory("[]",-1),["remember"],2)});
  assert.equal(npc.encodeNpcReceipt(npc.npcHash({request:1}),v2),golden.v2.raw);
  const input=npc.normalizeNpcRequest(golden.input);
  const v3=npc.createNpcLifeSnapshot({...input,needs:npc.resolveNpcNeeds({events:[]}),memoryState:npc.advanceNpcMemory(npc.parseNpcMemory("[]",-1),input.memory,7)});
  assert.equal(npc.encodeNpcLifeReceipt(npc.npcRequestHash(input,npc.NPC_LIFE_RECEIPT_VERSION),v3),golden.v3.raw);
  assert.equal(npc.npcHash(v2),golden.v2.snapshotHash);
  assert.equal(npc.npcHash(v3),golden.v3.snapshotHash);
});

test("80 original merchant decisions across all four hubs preserve requests, economy, polity and snapshot hashes", async () => {
  const baseline=JSON.parse(await readFile(new URL("../../server/src/tests/aurion-npc/merchant-golden.json",import.meta.url),"utf8"));
  const previous=new Map();
  for(const expected of baseline.rows){
    const prior=previous.get(expected.regionId)??null;
    const prepared=npc.prepareMerchantNpcDecision({worldSeed:baseline.worldSeed,regionId:expected.regionId,resolutionIndex:expected.resolutionIndex,prior});
    assert.equal(npc.npcHash(prepared.resolution),expected.resolutionHash);
    assert.equal(npc.npcHash(prepared.npcRequest),expected.npcRequestHash);
    assert.equal(npc.npcHash(prepared.worldRequest),expected.worldRequestHash);
    assert.equal(npc.npcHash(prepared.polityRequest),expected.polityRequestHash);
    const input=npc.normalizeNpcRequest(prepared.npcRequest);
    const snapshot=npc.createNpcLifeSnapshot({...input,needs:npc.resolveNpcNeeds({current:prior?.needs,events:input.needEvents}),
      memoryState:npc.advanceNpcMemory(prior?.memoryState??npc.parseNpcMemory("[]",-1),input.memory,input.resolutionIndex),...(prior&&"lifeState"in prior?{previousLifeState:prior.lifeState}:{})});
    assert.equal(npc.npcHash(snapshot),expected.snapshotHash);
    previous.set(expected.regionId,snapshot);
  }
});

test("a real verified decision populates four distinct bounded memory classes", () => {
  const source=fixture(4370,{memory:["unconfirmed claim: the NPC owns the kingdom"]});
  const result=npc.commitNpcMemoryV4(npc.createNpcMemoryV4("lyra"),source.confirmed);
  assert.equal(result.status,"committed");
  const memory=result.memory;
  assert.equal(memory.lastResolutionIndex,4370);
  assert.deepEqual(memory.working.confirmedEventIds,[source.expected.receiptId]);
  assert.deepEqual(memory.working.reservations,[]);
  assert.equal(memory.episodic[0].outcome,"goal_selected");
  assert.deepEqual(memory.episodic[0].participants,["lyra"]);
  assert.deepEqual(memory.semantic.map(f=>f.predicate).sort(),["current_hub","selected_goal"]);
  assert.equal(memory.procedural.length,2);
  assert.ok(memory.procedural.every(c=>c.mode==="configured" && c.authority.sourceRevision===manifest.sourceRevision));
  assert.ok(!JSON.stringify(memory).includes("owns the kingdom"));
  assert.throws(()=>{memory.episodic[0].outcome="action_executed";},TypeError);
});

test("duplicate delivery, input order and process recreation preserve exact memory hashes", async () => {
  const one=fixture(1),two=fixture(2,{safety:0,wealth:1});
  const first=npc.replayNpcMemoryV4("lyra",[one.confirmed,two.confirmed]);
  assert.deepEqual(first,npc.replayNpcMemoryV4("lyra",[two.confirmed,one.confirmed,two.confirmed,one.confirmed]));
  assert.equal(npc.commitNpcMemoryV4(first,one.confirmed).status,"duplicate");
  assert.deepEqual(npc.commitNpcMemoryV4(first,one.confirmed).memory,first);
  const fresh=await import(url+"?rehydration=1");
  const rehydrated=fresh.parseNpcMemoryV4(JSON.stringify(first));
  assert.deepEqual(rehydrated,first);
  const reverified=fresh.verifyConfirmedNpcDecision(two.raw,two.expected);
  assert.deepEqual(fresh.commitNpcMemoryV4(rehydrated,reverified).memory,first);
});

test("unverified objects, foreign NPCs, corrupted source receipts and conflicting delivery cannot mutate memory", () => {
  const one=fixture(1),current=npc.commitNpcMemoryV4(npc.createNpcMemoryV4("lyra"),one.confirmed).memory;
  assert.throws(()=>npc.commitNpcMemoryV4(current,{...one.confirmed}),/CONFIRMED_RECEIPT_REQUIRED/);
  assert.throws(()=>npc.commitNpcMemoryV4(current,fixture(2,{name:"orun"}).confirmed),/FOREIGN_NPC/);
  const tampered=JSON.parse(one.raw);tampered.snapshot.needs.safety=.5;
  assert.throws(()=>npc.verifyConfirmedNpcDecision(JSON.stringify(tampered),one.expected),/CORRUPT/);
  const conflict=fixture(1,{safety:0,wealth:1});
  assert.throws(()=>npc.commitNpcMemoryV4(current,conflict.confirmed),/RECEIPT_CONFLICT/);
  assert.deepEqual(npc.parseNpcMemoryV4(current),current);
});

test("contradictory facts retain full provenance, validity and deterministic conflict links", () => {
  const one=fixture(1),two=fixture(2,{safety:0,wealth:1,hub:"emberfall"});
  const memory=npc.replayNpcMemoryV4("lyra",[two.confirmed,one.confirmed]);
  const goals=memory.semantic.filter(f=>f.predicate==="selected_goal");
  assert.equal(new Set(goals.map(f=>f.value)).size,2);
  for(const fact of goals){
    assert.equal(fact.status,"conflicted");
    assert.equal(fact.provenance.length,1);
    assert.equal(fact.validUntilIndex-fact.validFromIndex,npc.NPC_MULTI_MEMORY_LIMITS.horizon);
    assert.deepEqual(fact.conflictsWith,goals.filter(f=>f.id!==fact.id).map(f=>f.id));
  }
  const changed=JSON.parse(JSON.stringify(memory));changed.semantic[0].status="active";
  const {memoryHash:_,...unsigned}=changed;changed.memoryHash=npc.npcHash(unsigned);
  assert.throws(()=>npc.parseNpcMemoryV4(changed),/CONFLICT_INVALID/);
});

test("logical expiry is exact and stale delivery neither refreshes nor rewinds memory", () => {
  const one=fixture(0),last=fixture(3500);
  const before=npc.replayNpcMemoryV4("lyra",[one.confirmed,fixture(3499).confirmed]);
  assert.equal(before.episodic.some(e=>e.logicalIndex===0),true);
  const after=npc.commitNpcMemoryV4(before,last.confirmed).memory;
  assert.equal(after.episodic.some(e=>e.logicalIndex===0),false);
  assert.ok(after.semantic.filter(f=>f.validFromIndex===0).every(f=>f.status==="expired" && f.provenance[0].receiptId===one.expected.receiptId));
  const stale=npc.commitNpcMemoryV4(after,fixture(2).confirmed);
  assert.equal(stale.status,"stale");assert.deepEqual(stale.memory,after);
  assert.deepEqual(npc.commitNpcMemoryV4(after,one.confirmed).memory,after);
});

test("long histories remain bounded and do not truncate retained provenance", () => {
  const receipts=Array.from({length:90},(_,i)=>fixture(i,{safety:i%2,wealth:1-i%2}).confirmed);
  const state=npc.replayNpcMemoryV4("lyra",receipts);
  assert.equal(state.episodic.length,npc.NPC_MULTI_MEMORY_LIMITS.episodes);
  assert.equal(state.semantic.length,npc.NPC_MULTI_MEMORY_LIMITS.facts);
  assert.equal(state.seenReceipts.length,npc.NPC_MULTI_MEMORY_LIMITS.seenReceipts);
  assert.equal(state.procedural.length,2);
  assert.ok(Buffer.byteLength(JSON.stringify(state))<npc.NPC_MULTI_MEMORY_LIMITS.bytes);
  assert.ok(state.semantic.every(f=>f.provenance.length===1));
  assert.deepEqual(npc.commitNpcMemoryV4(state,receipts[0]).memory,state);
  assert.throws(()=>npc.replayNpcMemoryV4("lyra",Array(4097).fill(receipts[0])),/REPLAY_LIMIT/);
});

test("AX1 projection contains only confirmed bounded readmodel fields", () => {
  const memory=npc.replayNpcMemoryV4("lyra",[fixture(7).confirmed]);
  const view=npc.projectNpcMemoryV4(memory);
  assert.equal(view.version,"wasd-npc-memory-public.v4");
  assert.equal(view.memoryHash,memory.memoryHash);
  assert.deepEqual(view.counts,{working:1,episodic:1,semantic:2,procedural:2});
  for(const field of ["semantic","episodic","provenance","raw","token","working"])assert.equal(field in view,false);
});

test("coordinated outer rehash cannot hide noncanonical order, false plan or inconsistent provenance", () => {
  const memory=npc.replayNpcMemoryV4("lyra",[fixture(1).confirmed,fixture(2).confirmed]);
  const rehash=value=>{const {memoryHash:_,...unsigned}=value;value.memoryHash=npc.npcHash(unsigned);return value;};
  const reorder=structuredClone(memory);reorder.episodic.reverse();
  assert.throws(()=>npc.parseNpcMemoryV4(rehash(reorder)),/ENTRY_ORDER/);
  const plan=structuredClone(memory);plan.working.plan.planHash="0".repeat(64);
  assert.throws(()=>npc.parseNpcMemoryV4(rehash(plan)),/PLAN_INVALID/);
  const source=structuredClone(memory);source.episodic[0].source.receiptSha256="0".repeat(64);
  assert.throws(()=>npc.parseNpcMemoryV4(rehash(source)),/PROVENANCE_INVALID/);
});

test("artifact verifier rejects tampered bytes, wrong revision, extra files, symlinks and uncommitted claims before import", async () => {
  const expected={sourceRevision:manifest.sourceRevision,manifestSha256:manifest.manifestSha256,...(manifest.sourceState==="UNCOMMITTED_LOCAL_CANDIDATE" ? {localCandidate:true}:{})};
  assert.equal((await verifyNpcCapsule(directory,expected)).status,"VERIFIED");
  await assert.rejects(verifyNpcCapsule(directory,{...expected,sourceRevision:"0".repeat(40)}),/SOURCE_IDENTITY/);
  if(expected.localCandidate)await assert.rejects(verifyNpcCapsule(directory,{...expected,localCandidate:false}),/SOURCE_IDENTITY/);
  for(const mode of ["bytes","extra","symlink","manifest"]){
    const temporary=await mkdtemp(path.join(tmpdir(),"wasd-npc-artifact-test-"));
    try{
      await cp(directory,temporary,{recursive:true});
      if(mode==="bytes")await writeFile(path.join(temporary,"index.js"),"throw new Error('MUST NEVER EXECUTE');");
      if(mode==="extra")await writeFile(path.join(temporary,"unreviewed.js"),"export const changed=true;");
      if(mode==="symlink"){await rm(path.join(temporary,"index.js"));await symlink(path.resolve(directory,"index.js"),path.join(temporary,"index.js"));}
      if(mode==="manifest"){const changed=structuredClone(manifest);changed.sourceState="COMMITTED";changed.toolchain.nodeTarget="node20";await writeFile(path.join(temporary,"manifest.json"),JSON.stringify(changed));}
      await assert.rejects(verifyNpcCapsule(temporary,expected),/NPC_CAPSULE_/);
    }finally{await rm(temporary,{recursive:true,force:true});}
  }
});
