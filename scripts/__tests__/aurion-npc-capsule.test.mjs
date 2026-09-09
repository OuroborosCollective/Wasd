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
function fixture(tick, { name = "lyra", safety = 1, wealth = 0, memory = [], hub = "observatory_threshold", opportunities = [] } = {}) {
  const request = npc.normalizeNpcRequest({ npcId:name, regionId:hub, resolutionIndex:tick, needEvents:[], observationIds:[`test-event:${tick}`], memory, roleId:"merchant",
    economy:{ currentHubId:hub, wealthCopper:1200, hungerBps:2000, fatigueBps:1500, tradeProwessBps:10500, harvestYieldBps:10000 },opportunities });
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

test("retained facts require their actual source receipts even after coordinated state rehashing", () => {
  const receipt=fixture(1).confirmed;
  const memory=npc.replayNpcMemoryV4("lyra",[receipt]);
  assert.deepEqual(npc.verifyNpcMemoryEvidence(memory,[receipt]),memory);
  assert.deepEqual(npc.npcMemoryReceiptIds(memory),[receipt.receiptId]);
  assert.throws(()=>npc.verifyNpcMemoryEvidence(memory,[]),/EVIDENCE_REQUIRED/);
  assert.throws(()=>npc.verifyNpcMemoryEvidence(memory,[{...receipt}]),/EVIDENCE_INVALID/);
  const changed=structuredClone(memory),fact=changed.semantic.find(f=>f.predicate==="current_hub");
  fact.value="unproven_hub";
  const {id:_,status:__,conflictsWith:___,...factPayload}=fact;fact.id=npc.npcHash(factPayload);
  changed.semantic.sort((a,b)=>b.validFromIndex-a.validFromIndex||(a.id<b.id?-1:a.id>b.id?1:0));
  const {memoryHash:____,...unsigned}=changed;changed.memoryHash=npc.npcHash(unsigned);
  assert.ok(npc.parseNpcMemoryV4(changed)); // A consistent self-hash is not external evidence.
  assert.throws(()=>npc.verifyNpcMemoryEvidence(changed,[receipt]),/EVIDENCE_MISMATCH/);
  const history=Array.from({length:70},(_,i)=>fixture(i).confirmed),long=npc.replayNpcMemoryV4("lyra",history);
  const ids=npc.npcMemoryReceiptIds(long),needed=history.filter(r=>ids.includes(r.receiptId));
  assert.ok(ids.includes(history[0].receiptId)); // Configured competency retains full old provenance.
  assert.ok(ids.length<=npc.NPC_MULTI_MEMORY_LIMITS.evidenceReceipts);
  assert.deepEqual(npc.verifyNpcMemoryEvidence(long,needed),long);
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

function merchantOpportunities(tick, hub) {
  return [
    ["safe_hub","safe"],["resource","resource"],["social","social"],
    ["reputation","reputation"],["market","market"],["influence","influence"],
  ].map(([kind,suffix])=>({id:`op:${tick}:${suffix}`,kind,regionId:hub,targetId:`target:${suffix}`,benefitBps:8_000,riskBps:0,distanceBps:0,sourceReceiptId:`evidence:${tick}`,resolutionIndex:tick}));
}
function inventoryFor(market, capacity=1_000_000) {
  const ownerId=`market:${market.hubId}`;
  const entries=Object.entries(market.stock).map(([itemId,quantity])=>({itemId,quantity,capacity}));
  return {ownerId,entries,stateHash:npc.merchantInventoryStateHash({ownerId,market,entries})};
}
function polityFor(market, version=3, stability=72) {
  const polityId=`polity:${market.hubId}`;
  return {polityId,version,stability,stateHash:npc.merchantPolityStateHash({polityId,version,stability})};
}
function merchantGatewayFixture(tick=0) {
  const homeHubId="observatory_threshold";
  const source=fixture(tick,{name:npc.npcIdentity(homeHubId),hub:homeHubId,safety:1,wealth:0,opportunities:merchantOpportunities(tick,homeHubId)});
  const merchant=npc.confirmedNpcEconomy(homeHubId,source.confirmed.snapshot);
  const market=npc.merchantBootstrapMarkets[merchant.currentHubId];
  const marketEvidence={version:7,stateHash:npc.merchantMarketStateHash(market)};
  const targets=Object.values(npc.merchantBootstrapMarkets).map(value=>({id:`market:${value.hubId}`,kind:"market",market:value,version:marketEvidence.version,active:true}));
  return { source, context:{worldSeed:"aim293-confirmed-world",homeHubId,logicalIndex:tick+1,confirmedDecision:source.confirmed,
    epoch:{npcResolutionIndex:tick,marketVersion:marketEvidence.version,polityVersion:3},npc:merchant,market,marketEvidence,polity:polityFor(market),inventory:inventoryFor(market),targets} };
}
function withMarket(context, market) {
  const marketEvidence={...context.marketEvidence,stateHash:npc.merchantMarketStateHash(market)};
  return {...context,market,marketEvidence,polity:polityFor(market,context.polity.version,context.polity.stability),inventory:inventoryFor(market),
    targets:context.targets.map(target=>target.market.hubId===market.hubId?{...target,market}:target)};
}

test("WASD action gateway uses confirmed evidence and emits an immutable receipt-bound effect", async () => {
  assert.equal("prepareMerchantNpcDecision" in npc,false);
  assert.equal((await readFile(path.join(directory,"index.js"),"utf8")).includes("prepareMerchantNpcDecision"),false);
  const {context}=merchantGatewayFixture();
  const first=npc.planMerchantAction(context);
  assert.equal(first.status,"ready");
  assert.equal(first.resolution.action,"caravan");
  const reordered=npc.planMerchantAction({...context,targets:[...context.targets].reverse(),inventory:{...context.inventory,entries:[...context.inventory.entries].reverse()}});
  assert.deepEqual(reordered,first);
  const accepted=npc.validateMerchantAction({context,intent:first.intent,lease:first.proposedLease});
  assert.equal(accepted.status,"validated");
  assert.equal(accepted.receipt.sourceDecision.receiptId,context.confirmedDecision.receiptId);
  assert.equal(accepted.receipt.authority.sourceRevision,manifest.sourceRevision);
  assert.equal(accepted.requests.receiptId,accepted.receipt.id);
  assert.equal(accepted.requests.npcRequest.resolutionIndex,context.logicalIndex);
  assert.ok(accepted.requests.npcRequest.needEvents.every(event=>event.sourceReceiptId===accepted.receipt.id));
  assert.ok(accepted.requests.worldRequest.signals.every(signal=>signal.sourceReceiptId===accepted.receipt.id));
  assert.equal(accepted.receipt.effectsHash,npc.merchantActionEffectsHash(accepted.requests));
  const {receiptHash,...unsigned}=accepted.receipt;
  assert.equal(receiptHash,npc.merchantActionReceiptHash(unsigned));
  assert.throws(()=>{accepted.requests.npcRequest.economy.wealthCopper=0;},TypeError);
  assert.throws(()=>{accepted.requests.npcRequest.needEvents[0].delta=1;},TypeError);
  assert.throws(()=>{accepted.requests.worldRequest.signals[0].magnitude=1;},TypeError);
  assert.deepEqual(npc.validateMerchantAction({context,intent:first.intent,lease:first.proposedLease}),accepted);
});

test("WASD action gateway blocks source, epoch, target, inventory, polity and lease drift before requests exist", () => {
  const {source,context}=merchantGatewayFixture();
  const ready=npc.planMerchantAction(context); assert.equal(ready.status,"ready");
  const validate=(input={})=>npc.validateMerchantAction({context,intent:ready.intent,lease:ready.proposedLease,...input});
  const block=result=>{assert.equal(result.status,"blocked");assert.equal("requests" in result,false);return result;};
  assert.throws(()=>npc.planMerchantAction({...context,confirmedDecision:{...context.confirmedDecision}}),/CONFIRMED_SOURCE_REQUIRED/);
  const unplanned=fixture(0,{name:npc.npcIdentity(context.homeHubId),hub:context.homeHubId,safety:1,wealth:0});
  assert.equal(block(npc.planMerchantAction({...context,confirmedDecision:unplanned.confirmed})).code,"SOURCE_PLAN_BLOCKED");
  const stale=block(validate({intent:{...ready.intent,expectedEpoch:{...ready.intent.expectedEpoch,npcResolutionIndex:ready.intent.expectedEpoch.npcResolutionIndex+1}}}));
  assert.equal(stale.code,"EPOCH_MISMATCH");
  const drift=block(validate({intent:{...ready.intent,authority:{...ready.intent.authority,sourceRevision:"0".repeat(40)}}}));
  assert.equal(drift.code,"REVISION_MISMATCH");
  const missing=block(npc.planMerchantAction({...context,targets:context.targets.filter(target=>target.id!==ready.intent.target.id)}));
  assert.equal(missing.code,"TARGET_MISSING");
  const substituted=block(npc.planMerchantAction({...context,targets:context.targets.map(target=>target.id===ready.intent.target.id?{...target,id:"market:emberfall"}:target)}));
  assert.equal(substituted.code,"TARGET_STATE_MISMATCH");
  const badMarket=block(npc.planMerchantAction({...context,marketEvidence:{...context.marketEvidence,version:0}}));
  assert.equal(badMarket.code,"MARKET_STATE_MISMATCH");
  const badPolity=block(npc.planMerchantAction({...context,polity:{...context.polity,stability:71}}));
  assert.equal(badPolity.code,"POLITY_STATE_MISMATCH");
  const badCapacity=block(npc.planMerchantAction({...context,inventory:{...context.inventory,entries:context.inventory.entries.map(entry=>({...entry,capacity:entry.capacity-1}))}}));
  assert.equal(badCapacity.code,"INVENTORY_STATE_MISMATCH");
  const zeroMarket={...context.market,stock:{grain:0,sandstone:0,bronze:0,aether:0,salve:0,rune_core:0}};
  const unavailable=block(npc.planMerchantAction(withMarket(context,zeroMarket)));
  assert.equal(unavailable.code,"INVENTORY_UNAVAILABLE");
  assert.equal(block(validate({lease:{...ready.proposedLease,state:"revoked"}})).code,"LEASE_REVOKED");
  assert.equal(block(validate({lease:{...ready.proposedLease,issuedAtLogicalIndex:0,expiresAtLogicalIndex:0}})).code,"LEASE_EXPIRED");
  assert.equal(block(validate({lease:{...ready.proposedLease,id:"npl_forged",issuedAtLogicalIndex:0,expiresAtLogicalIndex:2_147_483_647}})).code,"LEASE_CONFLICT");
  assert.equal(block(validate({lease:{...ready.proposedLease,state:"consumed"}})).code,"LEASE_CONFLICT");
  assert.equal(source.confirmed.snapshot.lifeState.plan.status,"planned");
});

test("moved WASD world and polity rules preserve deterministic signal and diplomacy ordering", () => {
  const signals=[
    {id:"world:b",kind:"economy",regionId:"emberfall",magnitude:.3,sourceReceiptId:"receipt:b",resolutionIndex:9},
    {id:"world:a",kind:"war",regionId:"emberfall",magnitude:.2,sourceReceiptId:"receipt:a",resolutionIndex:9},
  ];
  const ordered=npc.resolveWorldReaction({worldSeed:"aim293-world",regionId:"emberfall",resolutionIndex:9,signals});
  assert.deepEqual(ordered,npc.resolveWorldReaction({worldSeed:"aim293-world",regionId:"emberfall",resolutionIndex:9,signals:[...signals].reverse()}));
  assert.equal(ordered.deterministicHash,"28533b0a193b91b93bc72c8a53e7e1f2b4a30d48d913eb9bab8a81cb1d3cd12f");
  const polity=npc.resolvePolityState({polityId:"polity:emberfall",governmentType:"trade_republic",territoryIds:["windhollow","emberfall"],stability:72,activeDiplomacy:["trade","alliance"],warSignals:signals});
  assert.equal(polity.reactionHash,"69ffa961ac718922b7b54e93713dd5b3925775ad061e3944446a7a1aee9115bc");
});
