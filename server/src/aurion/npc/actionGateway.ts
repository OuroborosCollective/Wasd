/**
 * WASD-owned merchant action authority. A plan remains an intention until this
 * module validates real, re-read evidence. It has no clock, RNG or storage I/O.
 */
import { createHash } from "node:crypto";
import { z } from "zod/v3";
import { npcAuthority } from "./authority.js";
import { hasLivingWorldRoute, resolveLivingWorldTick, type CommodityId, type HubId, type LivingWorldResolution, type MarketState, type NpcEconomyState } from "./ax1LivingWorldProtocol.js";
import { stableCatalogStringify } from "./canonical.js";
import { npcIdentity, type MerchantDecisionRequests } from "./merchantRules.js";
import { isConfirmedNpcDecision, type ConfirmedNpcDecision } from "./multiMemory.js";
import type { NpcLifeOpportunity } from "./npcLifeProtocol.js";
import type { NpcGoal, NpcNeedEvent } from "./npcNeeds.js";
import type { NpcRequest } from "./npcPersistenceProtocol.js";
import type { PolityGovernmentType, WorldSignal } from "./worldPolityRules.js";

export const NPC_ACTION_GATEWAY_VERSION = "wasd-npc-action-gateway.v1" as const;
export const NPC_ACTION_LEASE_VERSION = "wasd-npc-action-lease.v1" as const;
export const NPC_ACTION_RECEIPT_VERSION = "wasd-npc-action-receipt.v1" as const;
export const NPC_ACTION_GATEWAY_MAX_TARGETS = 16;
export const NPC_ACTION_GATEWAY_MAX_CANDIDATES = 8;

const hubValues = ["observatory_threshold", "windhollow", "emberfall", "cinder_vault"] as const;
const commodityValues = ["grain", "sandstone", "bronze", "aether", "salve", "rune_core"] as const;
const actionValues = ["consume", "produce", "trade", "caravan", "patrol", "rest", "socialize"] as const;
const id = z.string().min(1).max(128).regex(/^[A-Za-z0-9][A-Za-z0-9._:-]*$/);
const hash64 = z.string().regex(/^[a-f0-9]{64}$/);
const index = z.number().int().min(0).max(2147483647);
const priorIndex = z.number().int().min(-1).max(2147483647);
const hubSchema = z.enum(hubValues);
const commoditySchema = z.enum(commodityValues);
const authoritySchema = z.object({ rulesetVersion: z.string().min(1).max(96), sourceRevision: z.string().regex(/^[a-f0-9]{40}$/), sourceSha256: hash64 }).strict();
const sourceDecisionSchema = z.object({ receiptId:id, receiptSha256:hash64, npcId:id, resolutionIndex:index, decisionHash:hash64, planHash:hash64, goal:z.enum(["seek_safety", "gather_resources", "socialize", "gain_reputation", "trade", "expand_influence"]) }).strict();
const epochSchema = z.object({ npcResolutionIndex:priorIndex, marketVersion:index, polityVersion:index }).strict();
const marketEvidenceSchema = z.object({ version:index, stateHash:hash64 }).strict();
const targetEvidenceSchema = z.object({ id, kind:z.literal("market"), market:z.unknown(), version:index, active:z.boolean() }).strict();
const targetSchema = z.object({ id, kind:z.literal("market"), hubId:hubSchema, version:index, stateHash:hash64, active:z.boolean() }).strict();
const inventoryEntrySchema = z.object({ itemId:commoditySchema, quantity:index, capacity:index }).strict();
const inventorySchema = z.object({ ownerId:id, stateHash:hash64, entries:z.array(inventoryEntrySchema).length(commodityValues.length) }).strict();
const politySchema = z.object({ polityId:id, version:index, stability:index.max(100), stateHash:hash64 }).strict();

export type MerchantActionSourceDecision = Readonly<{ receiptId:string; receiptSha256:string; npcId:string; resolutionIndex:number; decisionHash:string; planHash:string; goal:NpcGoal }>;
export type MerchantActionEpoch = Readonly<{ npcResolutionIndex:number; marketVersion:number; polityVersion:number }>;
export type MerchantMarketEvidence = Readonly<{ version:number; stateHash:string }>;
/** Full target evidence is supplied; the gateway derives a canonical target hash. */
export type MerchantActionTargetEvidence = Readonly<{ id:string; kind:"market"; market:MarketState; version:number; active:boolean }>;
export type MerchantActionTarget = Readonly<{ id:string; kind:"market"; hubId:HubId; version:number; stateHash:string; active:boolean }>;
export type MerchantInventoryEntry = Readonly<{ itemId:CommodityId; quantity:number; capacity:number }>;
export type MerchantInventoryEvidence = Readonly<{ ownerId:string; stateHash:string; entries:readonly MerchantInventoryEntry[] }>;
export type MerchantPolityEvidence = Readonly<{ polityId:string; version:number; stability:number; stateHash:string }>;
export type MerchantGatewayContext = Readonly<{
  worldSeed:string;
  homeHubId:HubId;
  /** The next persisted NPC resolution index; this is the lease's only time source. */
  logicalIndex:number;
  confirmedDecision:ConfirmedNpcDecision;
  epoch:MerchantActionEpoch;
  npc:NpcEconomyState;
  market:MarketState;
  marketEvidence:MerchantMarketEvidence;
  polity:MerchantPolityEvidence;
  inventory:MerchantInventoryEvidence;
  targets:readonly MerchantActionTargetEvidence[];
}>;

type NormalizedMerchantGatewayContext = Readonly<{
  worldSeed:string;
  homeHubId:HubId;
  logicalIndex:number;
  confirmedDecision:ConfirmedNpcDecision;
  sourceDecision:MerchantActionSourceDecision;
  sourcePlanIsPlanned:boolean;
  epoch:MerchantActionEpoch;
  npc:NpcEconomyState;
  market:MarketState;
  marketEvidence:MerchantMarketEvidence;
  marketValid:boolean;
  polity:MerchantPolityEvidence;
  polityValid:boolean;
  inventory:MerchantInventoryEvidence;
  inventoryStateValid:boolean;
  targets:readonly MerchantActionTarget[];
  targetsValid:boolean;
}>;

export type MerchantActionIntent = Readonly<{
  version:typeof NPC_ACTION_GATEWAY_VERSION;
  authority:ReturnType<typeof npcAuthority>;
  id:string;
  intentHash:string;
  npcId:string;
  sourceDecision:MerchantActionSourceDecision;
  resolutionIndex:number;
  worldSeedSha256:string;
  expectedEpoch:MerchantActionEpoch;
  expectedNpcHash:string;
  expectedMarketHash:string;
  expectedPolityHash:string;
  expectedInventoryHash:string;
  action:LivingWorldResolution["action"];
  originHubId:HubId;
  target:MerchantActionTarget;
  commodity:CommodityId;
  quantity:number;
  unitPriceCopper:number;
  resolutionHash:string;
}>;

export type MerchantActionLease = Readonly<{
  version:typeof NPC_ACTION_LEASE_VERSION;
  id:string;
  npcId:string;
  intentId:string;
  targetId:string;
  sourceRevision:string;
  lockedStateHash:string;
  issuedAtLogicalIndex:number;
  expiresAtLogicalIndex:number;
  state:"active"|"revoked"|"consumed";
}>;

export type MerchantActionReceipt = Readonly<{
  version:typeof NPC_ACTION_RECEIPT_VERSION;
  id:string;
  receiptHash:string;
  effectsHash:string;
  npcId:string;
  sourceDecision:MerchantActionSourceDecision;
  resolutionIndex:number;
  intentId:string;
  leaseId:string;
  authority:ReturnType<typeof npcAuthority>;
  action:LivingWorldResolution["action"];
  originHubId:HubId;
  target:MerchantActionTarget;
  worldSeedSha256:string;
  resolutionHash:string;
  expectedEpoch:MerchantActionEpoch;
  npcStateHash:string;
  marketStateHash:string;
  polityStateHash:string;
  inventoryStateHash:string;
}>;

export type MerchantActionBlocked = Readonly<{
  status:"blocked";
  code:"SOURCE_PLAN_BLOCKED"|"SOURCE_DECISION_MISMATCH"|"EPOCH_MISMATCH"|"MARKET_STATE_MISMATCH"|"POLITY_STATE_MISMATCH"|"REVISION_MISMATCH"|"INTENT_TAMPERED"|"TARGET_MISSING"|"TARGET_RANGE"|"TARGET_STATE_MISMATCH"|"INVENTORY_UNAVAILABLE"|"INVENTORY_STATE_MISMATCH"|"LEASE_MISSING"|"LEASE_REVOKED"|"LEASE_EXPIRED"|"LEASE_CONFLICT";
  npcId:string;
  resolutionIndex:number;
  action:LivingWorldResolution["action"];
  replanHash:string;
}>;

export type MerchantActionReady = Readonly<{ status:"ready"; intent:MerchantActionIntent; proposedLease:MerchantActionLease; resolution:LivingWorldResolution }>;
export type MerchantActionValidated = Readonly<{ status:"validated"; intent:MerchantActionIntent; lease:MerchantActionLease; receipt:MerchantActionReceipt; resolution:LivingWorldResolution; requests:MerchantDecisionRequests }>;

function canonicalHash(value:unknown):string { return createHash("sha256").update(stableCatalogStringify(value),"utf8").digest("hex"); }
function textOrder(left:string,right:string):number { return left<right?-1:left>right?1:0; }
function same(left:unknown,right:unknown):boolean { return stableCatalogStringify(left)===stableCatalogStringify(right); }
function deepFreeze<T>(value:T):T {
  if (value && typeof value==="object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value as Record<string,unknown>)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}
function authority(value:unknown):ReturnType<typeof npcAuthority> {
  const parsed=authoritySchema.parse(value);
  return Object.freeze({ rulesetVersion:parsed.rulesetVersion as ReturnType<typeof npcAuthority>["rulesetVersion"], sourceRevision:parsed.sourceRevision, sourceSha256:parsed.sourceSha256 });
}
function freezeSourceDecision(value:MerchantActionSourceDecision):MerchantActionSourceDecision {
  const p=sourceDecisionSchema.parse(value);
  return Object.freeze({ receiptId:p.receiptId, receiptSha256:p.receiptSha256, npcId:p.npcId, resolutionIndex:p.resolutionIndex, decisionHash:p.decisionHash, planHash:p.planHash, goal:p.goal });
}
function freezeEpoch(value:MerchantActionEpoch):MerchantActionEpoch {
  const p=epochSchema.parse(value);
  return Object.freeze({ npcResolutionIndex:p.npcResolutionIndex, marketVersion:p.marketVersion, polityVersion:p.polityVersion });
}
function freezeMarketEvidence(value:MerchantMarketEvidence):MerchantMarketEvidence {
  const p=marketEvidenceSchema.parse(value);
  return Object.freeze({ version:p.version, stateHash:p.stateHash });
}
function freezeMarket(value:MarketState):MarketState {
  if (!value || !hubSchema.safeParse(value.hubId).success || typeof value.controllingGuild!=="string" || !value.controllingGuild.trim() || value.controllingGuild.length>256 ||
    !Number.isSafeInteger(value.taxRateBasisPoints) || value.taxRateBasisPoints<0 || value.taxRateBasisPoints>10_000 ||
    !Number.isSafeInteger(value.treasuryCopper) || value.treasuryCopper<0 || value.treasuryCopper>1_000_000_000 || !value.stock) throw new Error("NPC_ACTION_MARKET_INVALID");
  const stock={} as Record<CommodityId,number>;
  for (const commodity of commodityValues) {
    const amount=value.stock[commodity];
    if (!Number.isSafeInteger(amount) || amount<0 || amount>1_000_000) throw new Error("NPC_ACTION_MARKET_INVALID");
    stock[commodity]=amount;
  }
  return deepFreeze({ hubId:value.hubId, controllingGuild:value.controllingGuild, taxRateBasisPoints:value.taxRateBasisPoints, treasuryCopper:value.treasuryCopper, stock } as MarketState);
}
function freezeNpc(value:NpcEconomyState):NpcEconomyState {
  if (!value || !id.safeParse(value.npcId).success || typeof value.name!=="string" || !value.name.trim() || value.name.length>128 || !hubSchema.safeParse(value.currentHubId).success ||
    !Number.isSafeInteger(value.wealthCopper) || value.wealthCopper<0 || value.wealthCopper>1_000_000_000 ||
    !Number.isSafeInteger(value.hungerBps) || value.hungerBps<0 || value.hungerBps>10_000 ||
    !Number.isSafeInteger(value.fatigueBps) || value.fatigueBps<0 || value.fatigueBps>10_000 ||
    !Number.isSafeInteger(value.tradeProwessBps) || value.tradeProwessBps<0 || value.tradeProwessBps>20_000 ||
    !Number.isSafeInteger(value.harvestYieldBps) || value.harvestYieldBps<0 || value.harvestYieldBps>20_000 ||
    !Array.isArray(value.memory) || value.memory.length>24 || value.memory.some(entry=>typeof entry!=="string" || entry.length>256)) throw new Error("NPC_ACTION_NPC_INVALID");
  return deepFreeze({ npcId:value.npcId, name:value.name, currentHubId:value.currentHubId, wealthCopper:value.wealthCopper, hungerBps:value.hungerBps, fatigueBps:value.fatigueBps, tradeProwessBps:value.tradeProwessBps, harvestYieldBps:value.harvestYieldBps, memory:[...value.memory] } as NpcEconomyState);
}
function freezeTargetEvidence(value:MerchantActionTargetEvidence):MerchantActionTarget {
  const parsed=targetEvidenceSchema.parse(value);
  const market=freezeMarket(parsed.market as MarketState);
  return Object.freeze({ id:parsed.id, kind:parsed.kind, hubId:market.hubId, version:parsed.version, stateHash:merchantMarketStateHash(market), active:parsed.active });
}
function freezeInventory(value:MerchantInventoryEvidence):MerchantInventoryEvidence {
  const p=inventorySchema.parse(value);
  const entries=p.entries.map(entry=>Object.freeze({ itemId:entry.itemId, quantity:entry.quantity, capacity:entry.capacity })).sort((a,b)=>textOrder(a.itemId,b.itemId));
  if (new Set(entries.map(entry=>entry.itemId)).size!==commodityValues.length || entries.some(entry=>entry.quantity>entry.capacity)) throw new Error("NPC_ACTION_INVENTORY_INVALID");
  return Object.freeze({ ownerId:p.ownerId, stateHash:p.stateHash, entries:Object.freeze(entries) });
}
function freezePolity(value:MerchantPolityEvidence):MerchantPolityEvidence {
  const p=politySchema.parse(value);
  return Object.freeze({ polityId:p.polityId, version:p.version, stability:p.stability, stateHash:p.stateHash });
}

export function merchantMarketStateHash(market:MarketState):string {
  return canonicalHash({ hubId:market.hubId, controllingGuild:market.controllingGuild, taxRateBasisPoints:market.taxRateBasisPoints, treasuryCopper:market.treasuryCopper, stock:market.stock });
}
/** Includes capacity, so production headroom cannot change under a retained hash. */
export function merchantInventoryStateHash(input:Readonly<{ ownerId:string; market:MarketState; entries:readonly MerchantInventoryEntry[] }>):string {
  return canonicalHash({ ownerId:input.ownerId, marketStateHash:merchantMarketStateHash(input.market), entries:[...input.entries].map(entry=>({itemId:entry.itemId,quantity:entry.quantity,capacity:entry.capacity})).sort((a,b)=>textOrder(a.itemId,b.itemId)) });
}
export function merchantPolityStateHash(input:Readonly<{ polityId:string; version:number; stability:number }>):string {
  return canonicalHash({ polityId:input.polityId, version:input.version, stability:input.stability });
}
export function merchantActionEffectsHash(requests:MerchantDecisionRequests):string { return canonicalHash(requests); }
export function merchantActionReceiptHash(receipt:Omit<MerchantActionReceipt,"receiptHash">):string { return canonicalHash(receipt); }
function npcStateHash(npc:NpcEconomyState):string { return canonicalHash({ npcId:npc.npcId, currentHubId:npc.currentHubId, wealthCopper:npc.wealthCopper, hungerBps:npc.hungerBps, fatigueBps:npc.fatigueBps, tradeProwessBps:npc.tradeProwessBps, harvestYieldBps:npc.harvestYieldBps, memory:[...npc.memory] }); }
function worldSeedHash(worldSeed:string):string { return createHash("sha256").update(worldSeed,"utf8").digest("hex"); }
function sourceDecisionFrom(confirmed:ConfirmedNpcDecision):Readonly<{ sourceDecision:MerchantActionSourceDecision; planIsPlanned:boolean }> {
  if (!isConfirmedNpcDecision(confirmed) || !same(confirmed.authority,npcAuthority()) || !("lifeState" in confirmed.snapshot)) throw new Error("NPC_ACTION_CONFIRMED_SOURCE_REQUIRED");
  const snapshot=confirmed.snapshot, plan=snapshot.lifeState.plan;
  if (plan.goal!==snapshot.decision.goal) throw new Error("NPC_ACTION_CONFIRMED_SOURCE_REQUIRED");
  return Object.freeze({ sourceDecision:freezeSourceDecision({ receiptId:confirmed.receiptId, receiptSha256:confirmed.receiptSha256, npcId:snapshot.npcId, resolutionIndex:snapshot.decision.resolutionIndex, decisionHash:snapshot.decision.decisionHash, planHash:plan.planHash, goal:snapshot.decision.goal }), planIsPlanned:plan.status==="planned" });
}

function normalizeContext(input:MerchantGatewayContext):NormalizedMerchantGatewayContext {
  if (!input || typeof input.worldSeed!=="string" || !input.worldSeed.trim() || input.worldSeed.length>256 || !Number.isSafeInteger(input.logicalIndex) || input.logicalIndex<0 || !hubSchema.safeParse(input.homeHubId).success) throw new Error("NPC_ACTION_CONTEXT_INVALID");
  const epoch=freezeEpoch(input.epoch);
  const source=sourceDecisionFrom(input.confirmedDecision);
  const npc=freezeNpc(input.npc), market=freezeMarket(input.market), marketEvidence=freezeMarketEvidence(input.marketEvidence), polity=freezePolity(input.polity), inventory=freezeInventory(input.inventory);
  if (source.sourceDecision.npcId!==npcIdentity(input.homeHubId) || npc.npcId!==source.sourceDecision.npcId || source.sourceDecision.resolutionIndex!==epoch.npcResolutionIndex || epoch.npcResolutionIndex>=2147483647 || input.logicalIndex!==epoch.npcResolutionIndex+1 || npc.currentHubId!==market.hubId) throw new Error("NPC_ACTION_CONTEXT_INVALID");
  if (input.confirmedDecision.snapshot.npcId!==npc.npcId || input.confirmedDecision.snapshot.decision.resolutionIndex!==epoch.npcResolutionIndex) throw new Error("NPC_ACTION_CONFIRMED_SOURCE_REQUIRED");
  const marketValid=marketEvidence.version===epoch.marketVersion && marketEvidence.stateHash===merchantMarketStateHash(market);
  const inventoryStateValid=inventory.ownerId===`market:${market.hubId}` && inventory.stateHash===merchantInventoryStateHash({ownerId:inventory.ownerId,market,entries:inventory.entries}) && inventory.entries.every(entry=>entry.quantity===market.stock[entry.itemId]);
  const targets=input.targets.map(freezeTargetEvidence).slice().sort((a,b)=>textOrder(a.id,b.id)||textOrder(a.stateHash,b.stateHash));
  const targetIds=new Set(targets.map(target=>target.id));
  const targetsValid=targets.length<=NPC_ACTION_GATEWAY_MAX_TARGETS && targetIds.size===targets.length &&
    targets.every(target=>target.id===`market:${target.hubId}` && target.version===epoch.marketVersion) &&
    targets.filter(target=>target.hubId===market.hubId).every(target=>target.stateHash===marketEvidence.stateHash);
  const polityValid=polity.polityId===`polity:${market.hubId}` && polity.version===epoch.polityVersion && polity.stateHash===merchantPolityStateHash(polity);
  return Object.freeze({ worldSeed:input.worldSeed, homeHubId:input.homeHubId, logicalIndex:input.logicalIndex, confirmedDecision:input.confirmedDecision, sourceDecision:source.sourceDecision, sourcePlanIsPlanned:source.planIsPlanned, epoch, npc, market, marketEvidence, marketValid, polity, polityValid, inventory, inventoryStateValid, targets:Object.freeze(targets), targetsValid });
}

function resolutionFor(context:NormalizedMerchantGatewayContext):LivingWorldResolution {
  return resolveLivingWorldTick({ worldSeed:context.worldSeed, resolutionIndex:context.logicalIndex, market:context.market, npc:context.npc, polityStability:context.polity.stability, preferredGoal:context.sourceDecision.goal });
}
function targetIdFor(resolution:LivingWorldResolution):string { return `market:${resolution.action==="caravan"&&resolution.caravan.destination?resolution.caravan.destination:resolution.market.hubId}`; }
function expectedTarget(context:NormalizedMerchantGatewayContext,resolution:LivingWorldResolution):MerchantActionTarget|null {
  if (!context.targetsValid) return null;
  const expectedHubId=resolution.action==="caravan"?resolution.caravan.destination:resolution.market.hubId;
  const target=context.targets.find(value=>value.id===targetIdFor(resolution))??null;
  if (!expectedHubId || !target || !target.active || target.hubId!==expectedHubId) return null;
  return target;
}
function inventoryAvailable(context:NormalizedMerchantGatewayContext,resolution:LivingWorldResolution):boolean {
  const entry=context.inventory.entries.find(item=>item.itemId===resolution.commodity);
  if (!entry) return false;
  if (resolution.action==="produce") return entry.quantity+resolution.quantity<=entry.capacity;
  if (resolution.action==="consume") return entry.quantity>=resolution.quantity&&context.npc.wealthCopper>=resolution.unitPriceCopper;
  if (resolution.action==="trade"||resolution.action==="caravan") return entry.quantity>=resolution.quantity;
  return true;
}
function blocked(context:NormalizedMerchantGatewayContext,resolution:LivingWorldResolution,code:MerchantActionBlocked["code"]):MerchantActionBlocked {
  return Object.freeze({ status:"blocked", code, npcId:context.npc.npcId, resolutionIndex:resolution.resolutionIndex, action:resolution.action, replanHash:canonicalHash({ version:NPC_ACTION_GATEWAY_VERSION, code, npcId:context.npc.npcId, sourceDecision:context.sourceDecision, resolutionIndex:resolution.resolutionIndex, action:resolution.action, epoch:context.epoch, marketHash:context.marketEvidence.stateHash, polityHash:context.polity.stateHash, inventoryHash:context.inventory.stateHash }) });
}
function intended(context:NormalizedMerchantGatewayContext,resolution:LivingWorldResolution,target:MerchantActionTarget):MerchantActionIntent {
  const boundAuthority=npcAuthority();
  const unsigned={ version:NPC_ACTION_GATEWAY_VERSION, authority:boundAuthority, npcId:context.npc.npcId, sourceDecision:context.sourceDecision, resolutionIndex:resolution.resolutionIndex, worldSeedSha256:worldSeedHash(context.worldSeed), expectedEpoch:context.epoch, expectedNpcHash:npcStateHash(context.npc), expectedMarketHash:context.marketEvidence.stateHash, expectedPolityHash:context.polity.stateHash, expectedInventoryHash:context.inventory.stateHash, action:resolution.action, originHubId:context.market.hubId, target, commodity:resolution.commodity, quantity:resolution.quantity, unitPriceCopper:resolution.unitPriceCopper, resolutionHash:resolution.deterministicHash };
  const intentHash=canonicalHash(unsigned);
  return Object.freeze({ ...unsigned, id:`npa_${intentHash.slice(0,56)}`, intentHash });
}
function parseIntent(value:MerchantActionIntent):MerchantActionIntent|null {
  try {
    if (value.version!==NPC_ACTION_GATEWAY_VERSION || !id.safeParse(value.id).success || !hash64.safeParse(value.intentHash).success || !id.safeParse(value.npcId).success || !index.safeParse(value.resolutionIndex).success || !hash64.safeParse(value.worldSeedSha256).success || !hash64.safeParse(value.expectedNpcHash).success || !hash64.safeParse(value.expectedMarketHash).success || !hash64.safeParse(value.expectedPolityHash).success || !hash64.safeParse(value.expectedInventoryHash).success || !actionValues.includes(value.action) || !hubSchema.safeParse(value.originHubId).success || !commoditySchema.safeParse(value.commodity).success || !Number.isSafeInteger(value.quantity) || value.quantity<1 || !Number.isSafeInteger(value.unitPriceCopper) || value.unitPriceCopper<1 || !hash64.safeParse(value.resolutionHash).success) return null;
    const target=targetSchema.parse(value.target) as MerchantActionTarget;
    if (target.id!==`market:${target.hubId}`) return null;
    return Object.freeze({ ...value, authority:authority(value.authority), sourceDecision:freezeSourceDecision(value.sourceDecision), expectedEpoch:freezeEpoch(value.expectedEpoch), target:Object.freeze({ id:target.id, kind:target.kind, hubId:target.hubId, version:target.version, stateHash:target.stateHash, active:target.active }) });
  } catch { return null; }
}
function parseLease(value:MerchantActionLease):MerchantActionLease|null {
  try {
    if (value.version!==NPC_ACTION_LEASE_VERSION || !id.safeParse(value.id).success || !id.safeParse(value.npcId).success || !id.safeParse(value.intentId).success || !id.safeParse(value.targetId).success || !/^[a-f0-9]{40}$/.test(value.sourceRevision) || !hash64.safeParse(value.lockedStateHash).success || !index.safeParse(value.issuedAtLogicalIndex).success || !index.safeParse(value.expiresAtLogicalIndex).success || value.expiresAtLogicalIndex<value.issuedAtLogicalIndex || !["active","revoked","consumed"].includes(value.state)) return null;
    return Object.freeze({ ...value });
  } catch { return null; }
}
function proposedLeaseFor(context:NormalizedMerchantGatewayContext,intent:MerchantActionIntent,target:MerchantActionTarget):MerchantActionLease {
  return Object.freeze({ version:NPC_ACTION_LEASE_VERSION, id:`npl_${canonicalHash({ version:NPC_ACTION_LEASE_VERSION, intentId:intent.id, index:context.logicalIndex }).slice(0,56)}`, npcId:intent.npcId, intentId:intent.id, targetId:target.id, sourceRevision:intent.authority.sourceRevision, lockedStateHash:target.stateHash, issuedAtLogicalIndex:context.logicalIndex, expiresAtLogicalIndex:context.logicalIndex, state:"active" });
}

/** The only proposal API. A returned lease still requires persistence and re-read validation. */
export function planMerchantAction(input:MerchantGatewayContext):MerchantActionReady|MerchantActionBlocked {
  const context=normalizeContext(input);
  const resolution=resolutionFor(context);
  if (!context.sourcePlanIsPlanned) return blocked(context,resolution,"SOURCE_PLAN_BLOCKED");
  if (!context.marketValid) return blocked(context,resolution,"MARKET_STATE_MISMATCH");
  if (!context.polityValid) return blocked(context,resolution,"POLITY_STATE_MISMATCH");
  if (!context.inventoryStateValid) return blocked(context,resolution,"INVENTORY_STATE_MISMATCH");
  if (!context.targetsValid) return blocked(context,resolution,"TARGET_STATE_MISMATCH");
  const target=expectedTarget(context,resolution);
  if (!target) return blocked(context,resolution,"TARGET_MISSING");
  if (resolution.action==="caravan" ? !resolution.caravan.destination||!hasLivingWorldRoute(context.market.hubId,target.hubId) : target.hubId!==context.npc.currentHubId) return blocked(context,resolution,"TARGET_RANGE");
  if (!inventoryAvailable(context,resolution)) return blocked(context,resolution,"INVENTORY_UNAVAILABLE");
  const intent=intended(context,resolution,target);
  return Object.freeze({ status:"ready", intent, proposedLease:proposedLeaseFor(context,intent,target), resolution });
}
function invalid(context:NormalizedMerchantGatewayContext,resolution:LivingWorldResolution,intent:MerchantActionIntent,code:MerchantActionBlocked["code"]):MerchantActionBlocked { return Object.freeze({ ...blocked(context,resolution,code), npcId:intent.npcId, resolutionIndex:intent.resolutionIndex, action:intent.action }); }

function lifeOpportunities(resolution:LivingWorldResolution,receiptId:string):readonly NpcLifeOpportunity[] {
  const riskBps=resolution.caravan.ambushed?9_000:Math.max(0,(100-resolution.caravan.securityIndex)*100);
  const stock=resolution.market.stock[resolution.commodity];
  const values:NpcLifeOpportunity[]=[
    { id:`${receiptId}:safe`,kind:"safe_hub",regionId:resolution.market.hubId,targetId:`hub:${resolution.market.hubId}`,benefitBps:Math.max(2_000,9_000-riskBps),riskBps,distanceBps:0,sourceReceiptId:receiptId,resolutionIndex:resolution.resolutionIndex },
    { id:`${receiptId}:resource`,kind:"resource",regionId:resolution.market.hubId,targetId:`commodity:${resolution.commodity}`,benefitBps:Math.max(2_000,Math.min(10_000,10_000-Math.min(8_000,stock*10))),riskBps:Math.floor(riskBps/3),distanceBps:500,sourceReceiptId:receiptId,resolutionIndex:resolution.resolutionIndex },
    { id:`${receiptId}:social`,kind:"social",regionId:resolution.market.hubId,benefitBps:6_000,riskBps:Math.floor(riskBps/4),distanceBps:250,sourceReceiptId:receiptId,resolutionIndex:resolution.resolutionIndex },
    { id:`${receiptId}:reputation`,kind:"reputation",regionId:resolution.market.hubId,targetId:`polity:${resolution.market.hubId}`,benefitBps:5_500+Math.max(0,resolution.stabilityDelta)*500,riskBps:Math.floor(riskBps/2),distanceBps:500,sourceReceiptId:receiptId,resolutionIndex:resolution.resolutionIndex },
    { id:`${receiptId}:market`,kind:"market",regionId:resolution.market.hubId,targetId:`market:${resolution.market.hubId}`,benefitBps:Math.min(10_000,2_500+resolution.unitPriceCopper*12),riskBps:Math.floor(riskBps/3),distanceBps:300,sourceReceiptId:receiptId,resolutionIndex:resolution.resolutionIndex },
    { id:`${receiptId}:influence`,kind:"influence",regionId:resolution.caravan.destination??resolution.market.hubId,targetId:`polity:${resolution.caravan.destination??resolution.market.hubId}`,benefitBps:resolution.caravan.destination?8_000:4_500,riskBps,distanceBps:resolution.caravan.destination?2_500:800,sourceReceiptId:receiptId,resolutionIndex:resolution.resolutionIndex },
  ];
  return deepFreeze(values);
}
/** Called only after the gateway has derived a real action-receipt identifier. */
function requestsFromValidatedAction(context:NormalizedMerchantGatewayContext,resolution:LivingWorldResolution,receiptId:string):MerchantDecisionRequests {
  const needEvents:NpcNeedEvent[]=[
    {id:`${receiptId}:wealth`,need:"wealth",delta:resolution.action==="trade"||resolution.action==="caravan"?0.08:resolution.action==="consume"?-0.04:0,sourceReceiptId:receiptId,resolutionIndex:resolution.resolutionIndex},
    {id:`${receiptId}:safety`,need:"safety",delta:resolution.caravan.ambushed?-0.18:resolution.action==="patrol"?0.05:0,sourceReceiptId:receiptId,resolutionIndex:resolution.resolutionIndex},
    {id:`${receiptId}:resources`,need:"resources",delta:resolution.action==="produce"?0.07:resolution.action==="consume"?-0.04:0,sourceReceiptId:receiptId,resolutionIndex:resolution.resolutionIndex},
    {id:`${receiptId}:belonging`,need:"belonging",delta:resolution.action==="socialize"?0.08:0,sourceReceiptId:receiptId,resolutionIndex:resolution.resolutionIndex},
    {id:`${receiptId}:status`,need:"status",delta:resolution.action==="patrol"?0.03:resolution.action==="caravan"&&!resolution.caravan.ambushed?0.02:0,sourceReceiptId:receiptId,resolutionIndex:resolution.resolutionIndex},
    {id:`${receiptId}:power`,need:"power",delta:resolution.action==="caravan"&&!resolution.caravan.ambushed?0.02:0,sourceReceiptId:receiptId,resolutionIndex:resolution.resolutionIndex},
  ];
  const economySignal:WorldSignal={ id:`${receiptId}:economy`,kind:"economy",regionId:resolution.market.hubId,magnitude:Math.max(-1,Math.min(1,(resolution.taxCopper-(resolution.caravan.ambushed?100:0))/500)),sourceReceiptId:receiptId,resolutionIndex:resolution.resolutionIndex };
  const politicsSignal:WorldSignal={ id:`${receiptId}:politics`,kind:resolution.caravan.ambushed?"war":"politics",regionId:resolution.market.hubId,magnitude:Math.max(-1,Math.min(1,resolution.stabilityDelta/10)),sourceReceiptId:receiptId,resolutionIndex:resolution.resolutionIndex };
  const governmentType:PolityGovernmentType=resolution.market.hubId==="emberfall"?"trade_republic":resolution.market.hubId==="cinder_vault"?"warband":"council";
  const npcRequest:NpcRequest={ npcId:resolution.npc.npcId,regionId:resolution.npc.currentHubId,resolutionIndex:resolution.resolutionIndex,roleId:"merchant",needEvents,observationIds:[receiptId,`market:${resolution.market.hubId}:${resolution.commodity}:${resolution.unitPriceCopper}`],memory:resolution.nextMemory.length?[resolution.nextMemory[resolution.nextMemory.length-1]!]:[],opportunities:lifeOpportunities(resolution,receiptId),economy:{currentHubId:resolution.npc.currentHubId,wealthCopper:resolution.npc.wealthCopper,hungerBps:resolution.npc.hungerBps,fatigueBps:resolution.npc.fatigueBps,tradeProwessBps:resolution.npc.tradeProwessBps,harvestYieldBps:resolution.npc.harvestYieldBps} };
  return deepFreeze({ resolution,npcRequest,worldRequest:{worldSeed:context.worldSeed,regionId:resolution.market.hubId,resolutionIndex:resolution.resolutionIndex,signals:[economySignal,politicsSignal]},polityRequest:{polityId:`polity:${resolution.market.hubId}`,governmentType,territoryIds:[resolution.market.hubId],stability:Math.max(0,Math.min(100,context.polity.stability+resolution.stabilityDelta)),activeDiplomacy:resolution.action==="caravan"?["trade"] as const:["non_aggression"] as const,warSignals:resolution.caravan.ambushed?[politicsSignal]:[]},receiptId });
}

/** Re-read context and persisted lease must pass this before any host mutation. */
export function validateMerchantAction(input:Readonly<{context:MerchantGatewayContext;intent:MerchantActionIntent;lease:MerchantActionLease}>):MerchantActionValidated|MerchantActionBlocked {
  const context=normalizeContext(input.context);
  const resolution=resolutionFor(context);
  const intent=parseIntent(input.intent);
  if (!intent) return blocked(context,resolution,"INTENT_TAMPERED");
  if (!context.sourcePlanIsPlanned) return invalid(context,resolution,intent,"SOURCE_PLAN_BLOCKED");
  if (!context.marketValid) return invalid(context,resolution,intent,"MARKET_STATE_MISMATCH");
  if (!context.polityValid) return invalid(context,resolution,intent,"POLITY_STATE_MISMATCH");
  if (!context.inventoryStateValid) return invalid(context,resolution,intent,"INVENTORY_STATE_MISMATCH");
  if (!context.targetsValid) return invalid(context,resolution,intent,"TARGET_STATE_MISMATCH");
  const boundAuthority=npcAuthority();
  if (!same(intent.authority,boundAuthority)) return invalid(context,resolution,intent,"REVISION_MISMATCH");
  if (!same(intent.sourceDecision,context.sourceDecision)) return invalid(context,resolution,intent,"SOURCE_DECISION_MISMATCH");
  if (intent.npcId!==context.npc.npcId||intent.resolutionIndex!==resolution.resolutionIndex||!same(intent.expectedEpoch,context.epoch)||intent.worldSeedSha256!==worldSeedHash(context.worldSeed)||intent.expectedNpcHash!==npcStateHash(context.npc)||intent.expectedMarketHash!==context.marketEvidence.stateHash) return invalid(context,resolution,intent,"EPOCH_MISMATCH");
  if (intent.expectedPolityHash!==context.polity.stateHash) return invalid(context,resolution,intent,"POLITY_STATE_MISMATCH");
  if (intent.expectedInventoryHash!==context.inventory.stateHash) return invalid(context,resolution,intent,"INVENTORY_STATE_MISMATCH");
  const target=expectedTarget(context,resolution);
  if (!target) return invalid(context,resolution,intent,"TARGET_MISSING");
  if (!same(intent.target,target)) return invalid(context,resolution,intent,"TARGET_STATE_MISMATCH");
  if (resolution.action==="caravan" ? !resolution.caravan.destination||!hasLivingWorldRoute(context.market.hubId,target.hubId) : target.hubId!==context.npc.currentHubId) return invalid(context,resolution,intent,"TARGET_RANGE");
  if (!inventoryAvailable(context,resolution)) return invalid(context,resolution,intent,"INVENTORY_UNAVAILABLE");
  if (!same(intent,intended(context,resolution,target))) return invalid(context,resolution,intent,"INTENT_TAMPERED");
  const lease=parseLease(input.lease);
  if (!lease) return invalid(context,resolution,intent,"LEASE_MISSING");
  if (lease.state==="revoked") return invalid(context,resolution,intent,"LEASE_REVOKED");
  if (lease.state!=="active") return invalid(context,resolution,intent,"LEASE_CONFLICT");
  if (context.logicalIndex<lease.issuedAtLogicalIndex||context.logicalIndex>lease.expiresAtLogicalIndex) return invalid(context,resolution,intent,"LEASE_EXPIRED");
  if (!same(lease,proposedLeaseFor(context,intent,target))) return invalid(context,resolution,intent,"LEASE_CONFLICT");
  const receiptCore={version:NPC_ACTION_RECEIPT_VERSION,npcId:intent.npcId,sourceDecision:intent.sourceDecision,resolutionIndex:intent.resolutionIndex,intentId:intent.id,leaseId:lease.id,authority:boundAuthority,action:resolution.action,originHubId:intent.originHubId,target:intent.target,worldSeedSha256:intent.worldSeedSha256,resolutionHash:resolution.deterministicHash,expectedEpoch:intent.expectedEpoch,npcStateHash:intent.expectedNpcHash,marketStateHash:intent.expectedMarketHash,polityStateHash:intent.expectedPolityHash,inventoryStateHash:context.inventory.stateHash};
  const receiptId=`nar_${canonicalHash(receiptCore).slice(0,56)}`;
  const requests=requestsFromValidatedAction(context,resolution,receiptId);
  const unsignedReceipt={...receiptCore,id:receiptId,effectsHash:merchantActionEffectsHash(requests)};
  const receipt=deepFreeze({...unsignedReceipt,receiptHash:merchantActionReceiptHash(unsignedReceipt)});
  return Object.freeze({status:"validated",intent,lease,receipt,resolution,requests});
}
